package __PACKAGE__;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
import android.appwidget.AppWidgetManager;
import android.widget.RemoteViews;

// Draws the widget: the app's colours and words in one of three layouts, chosen by the size the home screen gives it.
// Nothing here counts: times are a day and a clock time, so the picture stays true until the next redraw.
final class NextFinishRenderer {
    private NextFinishRenderer() {}

    private static final String[] CHIP_LANES = {"builder", "lab", "pet"};
    private static final String[] CHIP_NAMES = {"Builders", "Lab", "Pets"};

    private enum Size { SMALL, WIDE, LARGE }

    private static Size sizeOf(Bundle options) {
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110);
        if (height < 90) return Size.WIDE;
        return width < 200 ? Size.SMALL : Size.LARGE;
    }

    /** Sets a colour that belongs to the theme. On Android 12 and newer the phone picks light or dark itself when the theme flips. */
    private static void tint(RemoteViews views, int id, String method, EtaWidgetTheme theme, boolean forced, int light, int dark) {
        if (!forced && Build.VERSION.SDK_INT >= 31) views.setColorInt(id, method, light, dark);
        else views.setInt(id, method, theme.dark ? dark : light);
    }

    static RemoteViews render(Context context, Bundle options, NextFinishData data, long now) {
        Size size = sizeOf(options);
        EtaWidgetTheme theme = EtaWidgetTheme.of(context);
        String chosen = context.getSharedPreferences("eta_native", Context.MODE_PRIVATE).getString("theme", "auto");
        boolean forced = !chosen.equals("auto");
        int layout = size == Size.LARGE ? R.layout.eta_nf_large : size == Size.WIDE ? R.layout.eta_nf_wide : R.layout.eta_nf_small;
        RemoteViews views = new RemoteViews(context.getPackageName(), layout);
        EtaWidgetTheme light = EtaWidgetTheme.fixed(false);
        EtaWidgetTheme dark = EtaWidgetTheme.fixed(true);

        // Surfaces. With the theme on Auto these are the plain drawables, which the phone resolves light or dark by itself.
        views.setInt(R.id.eta_nf_root, "setBackgroundResource",
            !forced ? R.drawable.eta_nf_bg : theme.dark ? R.drawable.eta_nf_bg_dark : R.drawable.eta_nf_bg_light);
        views.setInt(R.id.eta_nf_art, "setBackgroundResource",
            !forced ? R.drawable.eta_nf_tile : theme.dark ? R.drawable.eta_nf_tile_dark : R.drawable.eta_nf_tile_light);

        NextFinishData.Pick next = data.next(now);
        for (int id : new int[] {R.id.eta_nf_name, R.id.eta_nf_time})
            tint(views, id, "setTextColor", theme, forced, light.text, dark.text);
        for (int id : new int[] {R.id.eta_nf_level, R.id.eta_nf_day})
            tint(views, id, "setTextColor", theme, forced, light.soft, dark.soft);

        if (next == null) {
            // Nothing to show: say what to do, and keep the whole widget a way into the app.
            views.setTextViewText(R.id.eta_nf_name, data.villages.isEmpty() ? "Open ClashETA" : "Nothing upgrading");
            views.setTextViewText(R.id.eta_nf_level, data.villages.isEmpty() ? "Import your village" : "Every worker is free");
            views.setImageViewResource(R.id.eta_nf_art, R.mipmap.ic_launcher);
            views.setViewVisibility(R.id.eta_nf_when, android.view.View.GONE);
            if (size == Size.LARGE) {
                views.setViewVisibility(R.id.eta_nf_chips, android.view.View.GONE);
                views.setTextViewText(R.id.eta_nf_label, "Next to finish");
                tint(views, R.id.eta_nf_label, "setTextColor", theme, forced, light.builder, dark.builder);
            }
        } else {
            NextFinishData.Upgrade upgrade = next.upgrade;
            views.setTextViewText(R.id.eta_nf_name, upgrade.name);
            views.setTextViewText(R.id.eta_nf_level, upgrade.detail);
            views.setViewVisibility(R.id.eta_nf_when, android.view.View.VISIBLE);
            views.setTextViewText(R.id.eta_nf_day, NextFinishWhen.day(upgrade.at, now));
            views.setTextViewText(R.id.eta_nf_time, NextFinishWhen.time(context, upgrade.at, data.clock));
            Bitmap art = NextFinishArt.load(context, upgrade.image);
            if (art != null) views.setImageViewBitmap(R.id.eta_nf_art, art);
            else views.setImageViewResource(R.id.eta_nf_art, R.mipmap.ic_launcher);
            // The day takes the lane's colour on the small widget, where it is the only splash of colour.
            if (size == Size.SMALL)
                tint(views, R.id.eta_nf_day, "setTextColor", theme, forced, light.lane(upgrade.lane), dark.lane(upgrade.lane));
            if (size == Size.LARGE) {
                String where = data.villages.size() > 1 ? "Next to finish · " + next.village.tag : "Next to finish";
                views.setTextViewText(R.id.eta_nf_label, where);
                tint(views, R.id.eta_nf_label, "setTextColor", theme, forced, light.lane(upgrade.lane), dark.lane(upgrade.lane));
                chips(views, next.village, now, theme, forced, light, dark);
            }
        }

        // The whole widget opens the app.
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open != null)
            views.setOnClickPendingIntent(R.id.eta_nf_root,
                PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        return views;
    }

    // Builders, Lab and Pets, as on the village page: busy of how many, and only the kinds this village has.
    private static void chips(RemoteViews views, NextFinishData.Village village, long now,
                              EtaWidgetTheme theme, boolean forced, EtaWidgetTheme light, EtaWidgetTheme dark) {
        views.setViewVisibility(R.id.eta_nf_chips, android.view.View.VISIBLE);
        int[] chip = {R.id.eta_nf_chip1, R.id.eta_nf_chip2, R.id.eta_nf_chip3};
        int[] dot = {R.id.eta_nf_chip1_dot, R.id.eta_nf_chip2_dot, R.id.eta_nf_chip3_dot};
        int[] label = {R.id.eta_nf_chip1_label, R.id.eta_nf_chip2_label, R.id.eta_nf_chip3_label};
        int[] value = {R.id.eta_nf_chip1_value, R.id.eta_nf_chip2_value, R.id.eta_nf_chip3_value};
        for (int i = 0; i < CHIP_LANES.length; i++) {
            int[] load = village.load(CHIP_LANES[i], now);
            views.setViewVisibility(chip[i], load == null ? android.view.View.GONE : android.view.View.VISIBLE);
            if (load == null) continue;
            views.setInt(chip[i], "setBackgroundResource",
                !forced ? R.drawable.eta_nf_chip : theme.dark ? R.drawable.eta_nf_chip_dark : R.drawable.eta_nf_chip_light);
            views.setTextViewText(label[i], CHIP_NAMES[i]);
            views.setTextViewText(value[i], load[0] + "/" + load[1]);
            tint(views, label[i], "setTextColor", theme, forced, light.soft, dark.soft);
            tint(views, value[i], "setTextColor", theme, forced, light.text, dark.text);
            tint(views, dot[i], "setColorFilter", theme, forced, light.lane(CHIP_LANES[i]), dark.lane(CHIP_LANES[i]));
        }
    }
}
