package __PACKAGE__;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

// A widget never ticks. It is drawn again when the page sends new data, when the next thing it shows ends, and at midnight
// (so "Tomorrow" becomes "Today"). This sets that one alarm for a widget; each draw replaces it. `provider` is the widget's
// own class and `action` the broadcast it answers by drawing again.
final class EtaWidgetSchedule {
    private EtaWidgetSchedule() {}

    private static PendingIntent intent(Context context, Class<?> provider, String action) {
        Intent refresh = new Intent(context, provider).setAction(action);
        return PendingIntent.getBroadcast(context, 0, refresh, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** `finishAt` is when the next thing ends in Unix milliseconds, or 0 when nothing is running. */
    static void arm(Context context, Class<?> provider, String action, long finishAt, long now) {
        long at = EtaWidgetWhen.nextMidnight(now);
        // A second after, so what was running has really finished when the widget asks.
        if (finishAt > 0) at = Math.min(at, finishAt + 1_000);
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        PendingIntent pending = intent(context, provider, action);
        boolean exact = Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms();
        try {
            if (exact) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC, at, pending);
            else alarms.setAndAllowWhileIdle(AlarmManager.RTC, at, pending);
        } catch (SecurityException refused) {
            alarms.set(AlarmManager.RTC, at, pending);
        }
    }

    static void cancel(Context context, Class<?> provider, String action) {
        context.getSystemService(AlarmManager.class).cancel(intent(context, provider, action));
    }
}
