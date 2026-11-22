package __PACKAGE__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import java.util.List;

// Draws the widget. With several villages each row is one village: its name, what finishes there next and when. With one
// village the rows are its next upgrades, so the space is never wasted. Nothing counts: times are a day and a clock time.
final class VillagesRenderer {
    private VillagesRenderer() {}

    private static final int ROWS = 4;
    private static final int[] ROW = {R.id.eta_vl_row0, R.id.eta_vl_row1, R.id.eta_vl_row2, R.id.eta_vl_row3};
    private static final int[] ART = {R.id.eta_vl_art0, R.id.eta_vl_art1, R.id.eta_vl_art2, R.id.eta_vl_art3};
    private static final int[] TITLE = {R.id.eta_vl_title0, R.id.eta_vl_title1, R.id.eta_vl_title2, R.id.eta_vl_title3};
    private static final int[] SUB = {R.id.eta_vl_sub0, R.id.eta_vl_sub1, R.id.eta_vl_sub2, R.id.eta_vl_sub3};
    private static final int[] IDLE = {R.id.eta_vl_idle0, R.id.eta_vl_idle1, R.id.eta_vl_idle2, R.id.eta_vl_idle3};
    private static final int[] WHEN = {R.id.eta_vl_when0, R.id.eta_vl_when1, R.id.eta_vl_when2, R.id.eta_vl_when3};
    private static final int[] DAY = {R.id.eta_vl_day0, R.id.eta_vl_day1, R.id.eta_vl_day2, R.id.eta_vl_day3};
    private static final int[] TIME = {R.id.eta_vl_time0, R.id.eta_vl_time1, R.id.eta_vl_time2, R.id.eta_vl_time3};

    /** How many rows the height gives: the header and padding take about 48dp, a row needs about 50. */
    private static int rowsFor(int heightDp) {
        return Math.max(1, Math.min(ROWS, (heightDp - 48) / 50));
    }

    static RemoteViews render(Context context, Bundle options, VillagesData data, long now) {
        int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 180);
        int rows = rowsFor(height);
        EtaWidgetTheme theme = EtaWidgetTheme.of(context);
        String chosen = context.getSharedPreferences("eta_native", Context.MODE_PRIVATE).getString("theme", "auto");
        boolean forced = !chosen.equals("auto");
        EtaWidgetTheme light = EtaWidgetTheme.fixed(false);
        EtaWidgetTheme dark = EtaWidgetTheme.fixed(true);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.eta_vl_widget);

        views.setInt(R.id.eta_vl_root, "setBackgroundResource",
            !forced ? R.drawable.eta_vl_bg : theme.dark ? R.drawable.eta_vl_bg_dark : R.drawable.eta_vl_bg_light);
        EtaWidgetViews.tint(views, R.id.eta_vl_label, theme, forced, light.builder, dark.builder);
        EtaWidgetViews.tint(views, R.id.eta_vl_head_idle, theme, forced, light.warn, dark.warn);

        boolean several = data.villages.size() > 1;
        int used = 0;
        EtaWidgetViews.visible(views, false, R.id.eta_vl_head_idle);
        if (data.villages.isEmpty()) {
            views.setTextViewText(R.id.eta_vl_label, "Villages");
            message(context, views, 0, "Open ClashETA", "Import your village", theme, forced, light, dark);
            used = 1;
        } else if (several) {
            views.setTextViewText(R.id.eta_vl_label, "Villages · next to finish");
            List<VillagesData.Village> villages = data.byNextFinish(now);
            for (int i = 0; i < villages.size() && i < rows; i++, used++) {
                VillagesData.Village village = villages.get(i);
                List<VillagesData.Upgrade> running = village.running(now);
                VillagesData.Upgrade next = running.isEmpty() ? null : running.get(0);
                row(context, views, i, village.label(),
                    next == null ? "Nothing upgrading" : next.name + " · " + next.detail,
                    village.idle(now), next, data.clock, now, theme, forced, light, dark);
            }
        } else {
            VillagesData.Village village = data.villages.get(0);
            List<VillagesData.Upgrade> running = village.running(now);
            views.setTextViewText(R.id.eta_vl_label, "Next to finish");
            String idle = village.idle(now);
            if (idle != null) {
                views.setTextViewText(R.id.eta_vl_head_idle, idle);
                EtaWidgetViews.visible(views, true, R.id.eta_vl_head_idle);
            }
            if (running.isEmpty()) {
                message(context, views, 0, "Nothing upgrading", "Every worker is free", theme, forced, light, dark);
                used = 1;
            }
            for (int i = 0; i < running.size() && i < rows; i++, used++) {
                VillagesData.Upgrade u = running.get(i);
                row(context, views, i, u.name, u.detail, null, u, data.clock, now, theme, forced, light, dark);
            }
        }
        for (int i = used; i < ROWS; i++) views.setViewVisibility(ROW[i], View.GONE);

        // The whole widget opens the app.
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open != null)
            views.setOnClickPendingIntent(R.id.eta_vl_root,
                PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        return views;
    }

    private static void colors(RemoteViews views, int i, String lane, EtaWidgetTheme theme, boolean forced,
                               EtaWidgetTheme light, EtaWidgetTheme dark) {
        EtaWidgetViews.tint(views, TITLE[i], theme, forced, light.text, dark.text);
        EtaWidgetViews.tint(views, TIME[i], theme, forced, light.text, dark.text);
        EtaWidgetViews.tint(views, SUB[i], theme, forced, light.soft, dark.soft);
        EtaWidgetViews.tint(views, IDLE[i], theme, forced, light.warn, dark.warn);
        // The day takes the colour of the kind of worker, as in the Next finish widget.
        if (lane == null) EtaWidgetViews.tint(views, DAY[i], theme, forced, light.soft, dark.soft);
        else EtaWidgetViews.tint(views, DAY[i], theme, forced, light.lane(lane), dark.lane(lane));
        views.setInt(ART[i], "setBackgroundResource",
            !forced ? R.drawable.eta_vl_tile : theme.dark ? R.drawable.eta_vl_tile_dark : R.drawable.eta_vl_tile_light);
    }

    private static void message(Context context, RemoteViews views, int i, String title, String sub, EtaWidgetTheme theme,
                                boolean forced, EtaWidgetTheme light, EtaWidgetTheme dark) {
        colors(views, i, null, theme, forced, light, dark);
        views.setViewVisibility(ROW[i], View.VISIBLE);
        views.setTextViewText(TITLE[i], title);
        views.setTextViewText(SUB[i], sub);
        views.setImageViewResource(ART[i], R.mipmap.ic_launcher);
        EtaWidgetViews.visible(views, false, IDLE[i], WHEN[i]);
    }

    private static void row(Context context, RemoteViews views, int i, String title, String sub, String idle,
                            VillagesData.Upgrade next, String clock, long now, EtaWidgetTheme theme, boolean forced,
                            EtaWidgetTheme light, EtaWidgetTheme dark) {
        colors(views, i, next == null ? null : next.lane, theme, forced, light, dark);
        views.setViewVisibility(ROW[i], View.VISIBLE);
        views.setTextViewText(TITLE[i], title);
        views.setTextViewText(SUB[i], sub);
        if (idle == null) EtaWidgetViews.visible(views, false, IDLE[i]);
        else {
            views.setTextViewText(IDLE[i], idle);
            EtaWidgetViews.visible(views, true, IDLE[i]);
        }
        if (next == null) {
            views.setImageViewResource(ART[i], R.mipmap.ic_launcher);
            EtaWidgetViews.visible(views, false, WHEN[i]);
            return;
        }
        Bitmap art = EtaWidgetArt.load(context, next.image, 120);
        if (art != null) views.setImageViewBitmap(ART[i], art);
        else views.setImageViewResource(ART[i], R.mipmap.ic_launcher);
        EtaWidgetViews.visible(views, true, WHEN[i]);
        views.setTextViewText(DAY[i], EtaWidgetWhen.day(next.at, now));
        views.setTextViewText(TIME[i], EtaWidgetWhen.time(context, next.at, clock));
        views.setContentDescription(ROW[i], title + ", " + sub + ", " + EtaWidgetWhen.day(next.at, now) + " "
            + EtaWidgetWhen.time(context, next.at, clock));
    }
}
