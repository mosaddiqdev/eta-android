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
// The words are pictures drawn with the app's fonts (EtaWidgetText), sized to the room the layout gives them.
final class VillagesRenderer {
    private VillagesRenderer() {}

    private static final int ROWS = 4;
    private static final int[] ROW = {R.id.eta_vl_row0, R.id.eta_vl_row1, R.id.eta_vl_row2, R.id.eta_vl_row3};
    private static final int[] DIV = {R.id.eta_vl_div0, R.id.eta_vl_div1, R.id.eta_vl_div2, R.id.eta_vl_div3};
    private static final int[] ART = {R.id.eta_vl_art0, R.id.eta_vl_art1, R.id.eta_vl_art2, R.id.eta_vl_art3};
    private static final int[] TITLE = {R.id.eta_vl_title0, R.id.eta_vl_title1, R.id.eta_vl_title2, R.id.eta_vl_title3};
    private static final int[] SUB = {R.id.eta_vl_sub0, R.id.eta_vl_sub1, R.id.eta_vl_sub2, R.id.eta_vl_sub3};
    private static final int[] IDLE = {R.id.eta_vl_idle0, R.id.eta_vl_idle1, R.id.eta_vl_idle2, R.id.eta_vl_idle3};
    private static final int[] WHEN = {R.id.eta_vl_when0, R.id.eta_vl_when1, R.id.eta_vl_when2, R.id.eta_vl_when3};
    private static final int[] DAY = {R.id.eta_vl_day0, R.id.eta_vl_day1, R.id.eta_vl_day2, R.id.eta_vl_day3};
    private static final int[] TIME = {R.id.eta_vl_time0, R.id.eta_vl_time1, R.id.eta_vl_time2, R.id.eta_vl_time3};

    // The layout's fixed sizes, in dp: the card's side padding, the picture, and the gaps around the text.
    private static final int SIDE = 14;
    private static final int ART_SIZE = 44;
    private static final int GAP = 10;
    private static final int WHEN_GAP = 8;
    private static final int IDLE_GAP = 8;

    /** How many rows the height gives: the header and padding take about 44dp, a row needs about 56. */
    private static int rowsFor(int heightDp) {
        return Math.max(1, Math.min(ROWS, (heightDp - 44) / 56));
    }

    /** What every row needs to draw itself, so the signatures stay short. */
    private static final class Ink {
        final Context context;
        final RemoteViews views;
        final EtaWidgetTheme theme;
        final EtaWidgetTheme light = EtaWidgetTheme.fixed(false);
        final EtaWidgetTheme dark = EtaWidgetTheme.fixed(true);
        final boolean forced;
        final String clock;
        final long now;
        /** The room for the words beside the picture, before the time column takes its share, in pixels. */
        final int widthPx;

        Ink(Context context, RemoteViews views, boolean forced, String clock, long now, int widthPx) {
            this.context = context;
            this.views = views;
            this.theme = EtaWidgetTheme.of(context);
            this.forced = forced;
            this.clock = clock;
            this.now = now;
            this.widthPx = widthPx;
        }

        void text(int id, String text, EtaWidgetText.Face face, float sp, int maxPx, int lightColor, int darkColor) {
            text(id, text, face, sp, maxPx, 0f, false, lightColor, darkColor);
        }

        Bitmap text(int id, String text, EtaWidgetText.Face face, float sp, int maxPx, float tracking, boolean upper,
                    int lightColor, int darkColor) {
            Bitmap bitmap = EtaWidgetText.draw(context, text, face, sp, maxPx, tracking, upper);
            EtaWidgetText.put(views, id, bitmap, theme, forced, lightColor, darkColor);
            return bitmap;
        }
    }

    static RemoteViews render(Context context, Bundle options, VillagesData data, long now) {
        int widthDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        int heightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 180);
        int rows = rowsFor(heightDp);
        float density = EtaWidgetText.density(context);
        String chosen = context.getSharedPreferences("eta_native", Context.MODE_PRIVATE).getString("theme", "auto");
        boolean forced = !chosen.equals("auto");
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.eta_vl_widget);
        int room = Math.round((widthDp - 2 * SIDE - ART_SIZE - GAP) * density);
        Ink paint = new Ink(context, views, forced, data.clock, now, room);
        EtaWidgetTheme theme = paint.theme;

        views.setInt(R.id.eta_vl_root, "setBackgroundResource",
            !forced ? R.drawable.eta_vl_bg : theme.dark ? R.drawable.eta_vl_bg_dark : R.drawable.eta_vl_bg_light);

        boolean several = data.villages.size() > 1;
        String label = several ? "Villages" : "Next to finish";
        paint.text(R.id.eta_vl_label, label, EtaWidgetText.Face.TITLE, 11f, 0, 0.06f, true, paint.light.builder, paint.dark.builder);
        EtaWidgetViews.visible(views, false, R.id.eta_vl_head_idle);

        int used = 0;
        if (data.villages.isEmpty()) {
            message(paint, 0, "Open ClashETA", "Import your village");
            used = 1;
        } else if (several) {
            List<VillagesData.Village> villages = data.byNextFinish(now);
            for (int i = 0; i < villages.size() && i < rows; i++, used++) {
                VillagesData.Village village = villages.get(i);
                List<VillagesData.Upgrade> running = village.running(now);
                VillagesData.Upgrade next = running.isEmpty() ? null : running.get(0);
                row(paint, i, village.label(),
                    next == null ? "Nothing upgrading" : next.name + " · " + next.detail,
                    village.idle(now), next);
            }
        } else {
            VillagesData.Village village = data.villages.get(0);
            List<VillagesData.Upgrade> running = village.running(now);
            String idle = village.idle(now);
            if (idle != null) {
                // With one village there is no row to carry the note, so it sits in the header.
                paint.text(R.id.eta_vl_head_idle, idle, EtaWidgetText.Face.TITLE, 11f, 0, paint.light.warn, paint.dark.warn);
                EtaWidgetViews.visible(views, true, R.id.eta_vl_head_idle);
            }
            if (running.isEmpty()) {
                message(paint, 0, "Nothing upgrading", "Every worker is free");
                used = 1;
            }
            for (int i = 0; i < running.size() && i < rows; i++, used++) {
                VillagesData.Upgrade u = running.get(i);
                row(paint, i, u.name, u.detail, null, u);
            }
        }
        for (int i = 0; i < ROWS; i++) {
            if (i >= used) views.setViewVisibility(ROW[i], View.GONE);
            // A line between rows, none above the first.
            views.setViewVisibility(DIV[i], i > 0 && i < used ? View.VISIBLE : View.GONE);
        }
        views.setInt(R.id.eta_vl_root, "setBackgroundResource",
            !forced ? R.drawable.eta_vl_bg : theme.dark ? R.drawable.eta_vl_bg_dark : R.drawable.eta_vl_bg_light);
        for (int i = 0; i < ROWS; i++)
            views.setInt(DIV[i], "setBackgroundResource",
                !forced ? R.drawable.eta_vl_line : theme.dark ? R.drawable.eta_vl_line_dark : R.drawable.eta_vl_line_light);

        // The whole widget opens the app.
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open != null)
            views.setOnClickPendingIntent(R.id.eta_vl_root,
                PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        return views;
    }

    private static void tile(Ink p, int i) {
        p.views.setInt(ART[i], "setBackgroundResource",
            !p.forced ? R.drawable.eta_vl_tile : p.theme.dark ? R.drawable.eta_vl_tile_dark : R.drawable.eta_vl_tile_light);
        p.views.setViewVisibility(ROW[i], View.VISIBLE);
    }

    private static void message(Ink p, int i, String title, String sub) {
        tile(p, i);
        p.text(TITLE[i], title, EtaWidgetText.Face.TITLE, 15f, p.widthPx, p.light.text, p.dark.text);
        p.text(SUB[i], sub, EtaWidgetText.Face.BODY, 12f, p.widthPx, p.light.soft, p.dark.soft);
        p.views.setImageViewResource(ART[i], R.mipmap.ic_launcher);
        EtaWidgetViews.visible(p.views, false, IDLE[i], WHEN[i]);
    }

    private static void row(Ink p, int i, String title, String sub, String idle, VillagesData.Upgrade next) {
        Context context = p.context;
        float density = EtaWidgetText.density(context);
        tile(p, i);

        // The time column first: it is as wide as it needs to be, and the words take what is left.
        int whenPx = 0;
        if (next != null) {
            String day = EtaWidgetWhen.day(next.at, p.now);
            String time = EtaWidgetWhen.time(context, next.at, p.clock);
            Bitmap t = p.text(TIME[i], time, EtaWidgetText.Face.NUMBER, 15f, 0, 0f, false, p.light.text, p.dark.text);
            Bitmap d = p.text(DAY[i], day, EtaWidgetText.Face.BODY, 11f, 0, 0f, false, p.light.soft, p.dark.soft);
            whenPx = Math.max(t.getWidth(), d.getWidth()) + Math.round(WHEN_GAP * density);
            EtaWidgetViews.visible(p.views, true, WHEN[i]);
        } else {
            EtaWidgetViews.visible(p.views, false, WHEN[i]);
        }
        int room = Math.max(0, p.widthPx - whenPx);

        // The note beside the name, then the name in what is left of the line.
        int idlePx = 0;
        if (idle == null) {
            EtaWidgetViews.visible(p.views, false, IDLE[i]);
        } else {
            Bitmap n = p.text(IDLE[i], idle, EtaWidgetText.Face.TITLE, 11f, room / 2, 0f, false, p.light.warn, p.dark.warn);
            idlePx = n.getWidth() + Math.round(IDLE_GAP * density);
            EtaWidgetViews.visible(p.views, true, IDLE[i]);
        }
        p.text(TITLE[i], title, EtaWidgetText.Face.TITLE, 15f, Math.max(0, room - idlePx), p.light.text, p.dark.text);
        p.text(SUB[i], sub, EtaWidgetText.Face.BODY, 12f, room, p.light.soft, p.dark.soft);

        if (next == null) {
            p.views.setImageViewResource(ART[i], R.mipmap.ic_launcher);
            return;
        }
        Bitmap art = EtaWidgetArt.load(context, next.image, 132);
        if (art != null) p.views.setImageViewBitmap(ART[i], art);
        else p.views.setImageViewResource(ART[i], R.mipmap.ic_launcher);
        p.views.setContentDescription(ROW[i], title + ", " + sub + ", " + EtaWidgetWhen.day(next.at, p.now) + " "
            + EtaWidgetWhen.time(context, next.at, p.clock));
    }
}
