package __PACKAGE__;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.io.IOException;
import java.io.InputStream;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

// Schedules and posts ClashETA's notifications. The page (src/notifications/compose.ts) works out what to say and when;
// this keeps the list, sets an alarm for each, and posts the notification with the picture of the building or helper
// when the alarm goes off. The list is kept so alarms can be set again after a restart or an update, which clear them.
final class EtaNotifier {
    static final String PREFS = "eta_native";
    private static final String QUEUE = "queue";
    // Android allows 500 alarms per app. The page sends fewer than this.
    private static final int MAX_ARMED = 200;
    // After a restart, something that came due while the phone was off is still shown if it is this fresh.
    private static final long LATE_MS = 2 * 60 * 60 * 1000L;
    private static final String IMAGE_ROOT = "public/game/";

    private EtaNotifier() {}

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static JSONArray queue(Context context) {
        try {
            return new JSONArray(prefs(context).getString(QUEUE, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    private static void save(Context context, JSONArray queue) {
        prefs(context).edit().putString(QUEUE, queue.toString()).apply();
    }

    static boolean canScheduleExact(Context context) {
        if (Build.VERSION.SDK_INT < 31) return true;
        return context.getSystemService(AlarmManager.class).canScheduleExactAlarms();
    }

    /** Throws away every alarm set before and sets one for each of `items`: the newest import always wins. */
    static void replace(Context context, JSONArray items) {
        JSONArray old = queue(context);
        for (int i = 0; i < old.length(); i++) cancel(context, old.optJSONObject(i));
        JSONArray kept = new JSONArray();
        long now = System.currentTimeMillis();
        for (int i = 0; i < items.length() && kept.length() < MAX_ARMED; i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null || item.optLong("at") <= now) continue;
            kept.put(item);
            arm(context, item);
        }
        save(context, kept);
    }

    /** After a restart or an update: sets the alarms again, and shows the ones that came due in the meantime. */
    static void rearm(Context context) {
        JSONArray old = queue(context);
        JSONArray kept = new JSONArray();
        long now = System.currentTimeMillis();
        for (int i = 0; i < old.length(); i++) {
            JSONObject item = old.optJSONObject(i);
            if (item == null) continue;
            long at = item.optLong("at");
            if (at > now) {
                kept.put(item);
                arm(context, item);
            } else if (now - at < LATE_MS) post(context, item);
        }
        save(context, kept);
    }

    /** An alarm went off: shows that notification and takes it off the list. */
    static void fire(Context context, int id) {
        JSONArray old = queue(context);
        JSONArray kept = new JSONArray();
        for (int i = 0; i < old.length(); i++) {
            JSONObject item = old.optJSONObject(i);
            if (item == null) continue;
            if (item.optInt("id") == id) post(context, item);
            else kept.put(item);
        }
        save(context, kept);
    }

    private static PendingIntent alarm(Context context, int id) {
        // The id in the address keeps one alarm from being mistaken for another.
        Intent intent = new Intent(context, EtaAlarmReceiver.class).setData(Uri.parse("eta://notification/" + id));
        return PendingIntent.getBroadcast(context, id, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static void cancel(Context context, JSONObject item) {
        if (item == null) return;
        context.getSystemService(AlarmManager.class).cancel(alarm(context, item.optInt("id")));
    }

    private static void arm(Context context, JSONObject item) {
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        PendingIntent pending = alarm(context, item.optInt("id"));
        long at = item.optLong("at");
        try {
            // Without the exact alarm permission Android may hold the alarm back by minutes; still better than none.
            if (canScheduleExact(context)) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
            else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
        } catch (SecurityException revoked) {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
        }
    }

    // Channels are per sound, not per kind. Android fixes a channel's sound when it is created, and recreating one throws
    // away what the person changed in the phone's settings, so the three sounds get a channel each, made once. Which
    // kinds are on and which sound each uses is the app's own setting (src/notifications/kinds.ts).
    static final String CLASH_SOUND = "clash_upgrade";

    static boolean hasClashSound(Context context) {
        return context.getResources().getIdentifier(CLASH_SOUND, "raw", context.getPackageName()) != 0;
    }

    static Uri clashSound(Context context) {
        return Uri.parse("android.resource://" + context.getPackageName() + "/raw/" + CLASH_SOUND);
    }

    static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        // The first build had one channel per kind. Nothing uses them now.
        for (String old : new String[] {"upgrades", "helpers", "tower", "quiet"}) manager.deleteNotificationChannel(old);

        NotificationChannel phone = new NotificationChannel(
            "sound_system", "Phone's notification sound", NotificationManager.IMPORTANCE_DEFAULT);
        phone.setDescription("ClashETA alerts that use your phone's own sound.");
        manager.createNotificationChannel(phone);

        NotificationChannel silent = new NotificationChannel(
            "sound_silent", "No sound", NotificationManager.IMPORTANCE_LOW);
        silent.setDescription("ClashETA alerts without a sound, and anything during your quiet hours.");
        manager.createNotificationChannel(silent);

        if (hasClashSound(context)) {
            NotificationChannel clash = new NotificationChannel(
                "sound_clash", "Clash upgrade sound", NotificationManager.IMPORTANCE_DEFAULT);
            clash.setDescription("ClashETA alerts that play the game's upgrade sound.");
            clash.setSound(
                clashSound(context),
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            manager.createNotificationChannel(clash);
        }
    }

    /** The sound to use: what the page asked for, or the phone's own when the game's file isn't in this build. */
    static String soundOf(Context context, JSONObject item) {
        String sound = item.optString("sound", "system");
        return sound.equals("clash") && !hasClashSound(context) ? "system" : sound;
    }

    // The pictures ship inside the app (public/game in the assets), a few KB each. The game's pictures are not square
    // and a large icon is cropped to one, so each is centred on a transparent square first.
    private static Bitmap picture(Context context, String path) {
        if (path == null || !path.startsWith(IMAGE_ROOT) || path.contains("..")) return null;
        try (InputStream in = context.getAssets().open(path)) {
            Bitmap source = BitmapFactory.decodeStream(in);
            if (source == null) return null;
            int side = Math.max(source.getWidth(), source.getHeight());
            Bitmap square = Bitmap.createBitmap(side, side, Bitmap.Config.ARGB_8888);
            new Canvas(square).drawBitmap(
                source, (side - source.getWidth()) / 2f, (side - source.getHeight()) / 2f, null);
            return square;
        } catch (IOException missing) {
            return null;
        }
    }

    static void post(Context context, JSONObject item) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) return;
        ensureChannels(context);
        String sound = soundOf(context, item);
        boolean silent = sound.equals("silent");
        String body = item.optString("body");

        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, "sound_" + sound)
            .setSmallIcon(R.drawable.ic_stat_eta)
            .setColor(0xFF0E7BAD)
            .setContentTitle(item.optString("title"))
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setWhen(item.optLong("at"))
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            // Before Android 8 the sound and importance are the notification's own, not the channel's.
            .setPriority(silent ? NotificationCompat.PRIORITY_LOW : NotificationCompat.PRIORITY_DEFAULT)
            .setSilent(silent);
        if (Build.VERSION.SDK_INT < 26 && !silent)
            if (sound.equals("clash")) builder.setSound(clashSound(context));
            else builder.setDefaults(NotificationCompat.DEFAULT_SOUND);
        if (open != null)
            builder.setContentIntent(PendingIntent.getActivity(
                context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        Bitmap icon = picture(context, item.optString("image", null));
        if (icon != null) builder.setLargeIcon(icon);
        try {
            manager.notify(item.optInt("id"), builder.build());
        } catch (SecurityException refused) {
            // The permission was taken away between the check and now. Nothing to show.
        }
    }
}
