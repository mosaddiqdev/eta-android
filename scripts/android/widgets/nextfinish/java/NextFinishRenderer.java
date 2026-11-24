package __PACKAGE__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// Draws the widget: the app's colours, words and lane icons in one of five layouts, chosen by the size the home screen
// gives it. Nothing here counts: times are a day and a clock time, so the picture stays true until the next redraw. The words
// are pictures drawn with the app's fonts (EtaWidgetText), each cut to the room its layout gives it.
final class NextFinishRenderer {
    private NextFinishRenderer() {}

    private enum Size { SMALL, WIDE, LARGE, TALL, SLIM }

    private static final int[] CHIP = {R.id.eta_nf_chip1, R.id.eta_nf_chip2, R.id.eta_nf_chip3, R.id.eta_nf_chip4, R.id.eta_nf_chip5};
    private static final int[] ICON = {R.id.eta_nf_chip1_icon, R.id.eta_nf_chip2_icon, R.id.eta_nf_chip3_icon, R.id.eta_nf_chip4_icon, R.id.eta_nf_chip5_icon};
    private static final int[] VALUE = {R.id.eta_nf_chip1_value, R.id.eta_nf_chip2_value, R.id.eta_nf_chip3_value, R.id.eta_nf_chip4_value, R.id.eta_nf_chip5_value};

    // The shape the home screen gives it, in dp: a column when it is one cell wide (at any height), a strip when it is short, a card
    // once it is tall (at any width, so a 4 x 4 is the same card, bigger), a square when it is narrow, and the wide tile in between.
    private static Size sizeOf(int width, int height) {
        if (width < SLIM_BELOW) return Size.SLIM;
        if (height < 90) return Size.WIDE;
        if (height >= 200) return Size.TALL;
        if (width < 200) return Size.SMALL;
        return Size.LARGE;
    }

    // One cell is 40dp wide in the home screen's own sums and about 57 to 73 on real launchers; two cells are 110 and up.
    private static final int SLIM_BELOW = 100;
    private static final int SLIM_MIN_WIDTH = 56;
    private static final int SLIM_PAD = 16;
    private static final int SLIM_CHIP = 30;

    // The tall card's heights in dp, besides the picture: padding, the name over two lines, the level and the day and time.
    private static final int TALL_BASE = 142;
    private static final int CHIP_ROW = 38;
    private static final int QUEUE_HEAD = 20;
    private static final int QUEUE_ROW = 36;
    private static final int[] Q = {R.id.eta_nf_q1, R.id.eta_nf_q2, R.id.eta_nf_q3};
    private static final int[] Q_ART = {R.id.eta_nf_q1_art, R.id.eta_nf_q2_art, R.id.eta_nf_q3_art};
    private static final int[] Q_NAME = {R.id.eta_nf_q1_name, R.id.eta_nf_q2_name, R.id.eta_nf_q3_name};
    private static final int[] Q_LEVEL = {R.id.eta_nf_q1_level, R.id.eta_nf_q2_level, R.id.eta_nf_q3_level};
    private static final int[] Q_DAY = {R.id.eta_nf_q1_day, R.id.eta_nf_q2_day, R.id.eta_nf_q3_day};
    private static final int[] Q_TIME = {R.id.eta_nf_q1_time, R.id.eta_nf_q2_time, R.id.eta_nf_q3_time};

    /** How many of the village's kinds of worker have a chip: the ones with something to say. */
    private static int chipCount(EtaWidgetVillages.Village village, long now) {
        int count = 0;
        for (EtaWidgetVillages.Lane lane : village.lanes) if (village.value(lane, now) != null && count < CHIP.length) count++;
        return count;
    }

    // Text sizes in sp, in the order SMALL, WIDE, LARGE, TALL, SLIM.
    private static float pick(Size size, float small, float wide, float large, float tall, float slim) {
        switch (size) {
            case SMALL: return small;
            case WIDE: return wide;
            case LARGE: return large;
            case TALL: return tall;
            default: return slim;
        }
    }

    /** The words' own state: the layout in use and how wide it is. */
    private static final class Ink extends EtaWidgetInk {
        final Size size;
        final int widthDp;

        Ink(Context context, RemoteViews views, Size size, int widthDp) {
            super(context, views);
            this.size = size;
            this.widthDp = widthDp;
        }

        /** The width the name, level and label can use beside the picture, before the time column, in pixels. */
        int room(int whenPx) {
            switch (size) {
                case LARGE: return px(widthDp - 28 - 64 - 12 - 8) - whenPx;
                case WIDE: return px(widthDp - 20 - 48 - 10 - 8) - whenPx;
                case SLIM: return px(widthDp - SLIM_PAD);
                default: return px(widthDp - 24);
            }
        }
    }

    static RemoteViews render(Context context, Bundle options, EtaWidgetVillages data, long now) {
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110);
        Size size = sizeOf(width, height);
        if (size == Size.SLIM) width = Math.max(width, SLIM_MIN_WIDTH);
        int layout = size == Size.LARGE ? R.layout.eta_nf_large
            : size == Size.WIDE ? R.layout.eta_nf_wide
            : size == Size.TALL ? R.layout.eta_nf_tall
            : size == Size.SLIM ? R.layout.eta_nf_slim
            : R.layout.eta_nf_small;
        RemoteViews views = new RemoteViews(context.getPackageName(), layout);
        Ink ink = new Ink(context, views, size, width);
        EtaWidgetTheme light = ink.light;
        EtaWidgetTheme dark = ink.dark;

        // Surfaces. With the theme on Auto these are the plain drawables, which the phone resolves light or dark by itself.
        views.setInt(R.id.eta_nf_root, "setBackgroundResource",
            ink.surface(R.drawable.eta_nf_bg, R.drawable.eta_nf_bg_dark, R.drawable.eta_nf_bg_light));
        views.setInt(R.id.eta_nf_art, "setBackgroundResource",
            ink.surface(R.drawable.eta_nf_tile, R.drawable.eta_nf_tile_dark, R.drawable.eta_nf_tile_light));

        EtaWidgetVillages.Pick next = data.next(now);
        int artSide = size == Size.LARGE || size == Size.TALL ? 200 : 144;
        // The tall card fits itself to its height: the chips come first, the picture takes what it can (up to 104dp), and
        // whatever is left over lists what finishes after this one.
        int chipRows = 99;
        int queueRows = 0;
        int artDp = 0;
        if (size == Size.TALL && next != null) {
            int needRows = (chipCount(next.village, now) + 1) / 2;
            int want = Math.min(104, Math.max(56, Math.round(width * 0.40f)));
            chipRows = needRows;
            artDp = Math.min(want, height - TALL_BASE - chipRows * CHIP_ROW);
            if (artDp < 48) {
                artDp = 48;
                chipRows = Math.max(0, Math.min(needRows, (height - TALL_BASE - artDp) / CHIP_ROW));
            }
            int spare = height - TALL_BASE - artDp - chipRows * CHIP_ROW;
            queueRows = spare >= QUEUE_HEAD + QUEUE_ROW ? Math.min(3, (spare - QUEUE_HEAD) / QUEUE_ROW) : 0;
            if (Build.VERSION.SDK_INT >= 31) views.setViewLayoutHeight(R.id.eta_nf_art, artDp, TypedValue.COMPLEX_UNIT_DIP);
        }
        // The column fits itself to its height too, from the top: the picture (if there is room), the day and time, the name on
        // one line or two, the level, and last the kinds of worker, one to a row, as many as are left room for.
        boolean levelShown = true;
        int nameLines = size == Size.TALL ? 2 : 1;
        if (size == Size.SLIM) {
            boolean resizable = Build.VERSION.SDK_INT >= 31;
            boolean artShown = height >= 112;
            int slimArt = !resizable || height >= 150 ? 54 : 44;
            boolean nameShown = height >= 66;
            nameLines = height >= 150 ? 2 : 1;
            int used = SLIM_PAD + (artShown ? slimArt + 6 : 0) + 28 + (nameShown ? 6 + nameLines * 15 : 0);
            levelShown = nameShown && height - used >= 14;
            if (levelShown) used += 14;
            chipRows = next == null ? 0 : Math.max(0, Math.min(chipCount(next.village, now), (height - used - 6) / SLIM_CHIP));
            if (resizable && artShown) views.setViewLayoutHeight(R.id.eta_nf_art, slimArt, TypedValue.COMPLEX_UNIT_DIP);
            EtaWidgetViews.visible(views, artShown, R.id.eta_nf_art);
            EtaWidgetViews.visible(views, nameShown, R.id.eta_nf_name);
            EtaWidgetViews.visible(views, levelShown, R.id.eta_nf_level);
        }
        float nameSp = pick(size, 15f, 15f, 18f, 17f, 12f);
        float levelSp = pick(size, 12f, 12f, 13f, 12f, 10f);
        if (next == null) {
            // Nothing to show: say what to do, and keep the whole widget a way into the app.
            boolean none = data.villages.isEmpty();
            int room = ink.room(0);
            ink.text(R.id.eta_nf_name, none ? "Open ClashETA" : "Nothing upgrading", EtaWidgetText.Face.TITLE, nameSp, room,
                nameLines, 0f, false, light.text, dark.text);
            ink.text(R.id.eta_nf_level, none ? "Import your village" : "Every worker is free", EtaWidgetText.Face.BODY, levelSp,
                room, light.soft, dark.soft);
            views.setImageViewResource(R.id.eta_nf_art, R.mipmap.ic_launcher);
            EtaWidgetViews.visible(views, false, R.id.eta_nf_when, R.id.eta_nf_day, R.id.eta_nf_time);
            if (size == Size.LARGE) {
                EtaWidgetViews.visible(views, false, R.id.eta_nf_chips);
                ink.text(R.id.eta_nf_label, "Next to finish", EtaWidgetText.Face.TITLE, 11f, room, 1, 0.06f, true,
                    light.builder, dark.builder);
            }
            if (size == Size.TALL) EtaWidgetViews.visible(views, false, R.id.eta_nf_chips, R.id.eta_nf_queue);
            if (size == Size.SLIM) EtaWidgetViews.visible(views, false, R.id.eta_nf_chips);
            views.setContentDescription(R.id.eta_nf_root, none ? "ClashETA. Import your village." : "Nothing upgrading.");
        } else {
            EtaWidgetVillages.Upgrade upgrade = next.upgrade;
            String day = EtaWidgetWhen.day(upgrade.at, now);
            String time = EtaWidgetWhen.time(context, upgrade.at, data.clock);
            int laneLight = light.lane(upgrade.lane);
            int laneDark = dark.lane(upgrade.lane);
            EtaWidgetViews.visible(views, true, R.id.eta_nf_when, R.id.eta_nf_day, R.id.eta_nf_time);

            // The day and time first: they are as wide as they need to be, and the words take what is left. The time is the
            // biggest thing in the widget, so it shrinks before it is ever cut off.
            float daySp = pick(size, 12f, 11f, 12f, 12f, 10f);
            int whenBox = size == Size.SLIM ? ink.px(width - SLIM_PAD) : size == Size.SMALL || size == Size.TALL ? ink.px(width - 24)
                : size == Size.WIDE ? ink.px((width - 20 - 48 - 10 - 8) * 0.45f) : ink.px((width - 28 - 64 - 12 - 8) * 0.5f);
            float timeSp = EtaWidgetText.fit(context, time, EtaWidgetText.Face.NUMBER, pick(size, 19f, 17f, 22f, 22f, 15f), size == Size.SLIM ? 9f : 12f, whenBox);
            Bitmap timePic = ink.text(R.id.eta_nf_time, time, EtaWidgetText.Face.NUMBER, timeSp, 0, light.text, dark.text);
            Bitmap dayPic = size == Size.WIDE
                ? ink.text(R.id.eta_nf_day, day, EtaWidgetText.Face.BODY, daySp, 0, light.soft, dark.soft)
                : size == Size.SMALL || size == Size.SLIM
                    ? ink.text(R.id.eta_nf_day, day, EtaWidgetText.Face.TITLE, daySp, 0, laneLight, laneDark)
                    : ink.text(R.id.eta_nf_day, day, EtaWidgetText.Face.BODY, daySp, 0, laneLight, laneDark);
            int whenPx = size == Size.LARGE || size == Size.WIDE ? Math.max(timePic.getWidth(), dayPic.getWidth()) : 0;

            int room = ink.room(whenPx);
            ink.text(R.id.eta_nf_name, upgrade.name, EtaWidgetText.Face.TITLE, nameSp, room, nameLines, 0f, false,
                light.text, dark.text);
            // On a short square the level line is what gives way, so the time is never cut off.
            boolean showLevel = size == Size.SMALL ? height >= 125 : levelShown;
            EtaWidgetViews.visible(views, showLevel, R.id.eta_nf_level);
            // The column is narrow: "Level 12 → 13" is "Lv 12 → 13" there.
            String level = size == Size.SLIM ? upgrade.detail.replace("Level ", "Lv ") : upgrade.detail;
            if (showLevel) ink.text(R.id.eta_nf_level, level, EtaWidgetText.Face.BODY, levelSp, room, light.soft, dark.soft);

            Bitmap art = EtaWidgetArt.load(context, upgrade.image, artSide);
            if (art != null) views.setImageViewBitmap(R.id.eta_nf_art, art);
            else views.setImageViewResource(R.id.eta_nf_art, R.mipmap.ic_launcher);
            if (size == Size.LARGE) {
                String where = data.villages.size() > 1
                    ? "Next to finish · " + (next.village.name.isEmpty() ? next.village.tag : next.village.name)
                    : "Next to finish";
                ink.text(R.id.eta_nf_label, where, EtaWidgetText.Face.TITLE, 11f, room, 1, 0.06f, true, laneLight, laneDark);
            }
            if (size == Size.LARGE || size == Size.TALL || size == Size.SLIM) chips(context, ink, next.village, now, chipRows);
            if (size == Size.TALL) queue(context, ink, next, queueRows, data.clock, now);
            views.setContentDescription(R.id.eta_nf_root,
                "Next to finish: " + upgrade.name + ", " + upgrade.detail + ", " + day + " " + time);
        }

        // The whole widget opens the app.
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open != null)
            views.setOnClickPendingIntent(R.id.eta_nf_root,
                PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        return views;
    }

    // The village page's summary tiles: each kind of worker with its own icon and how many are busy. Only the kinds this
    // village has, or has something running in, so a village without a Builder Base shows three.
    private static void chips(Context context, Ink ink, EtaWidgetVillages.Village village, long now, int maxRows) {
        RemoteViews views = ink.views;
        List<EtaWidgetVillages.Lane> lanes = new ArrayList<>();
        List<String> values = new ArrayList<>();
        for (EtaWidgetVillages.Lane lane : village.lanes) {
            String value = village.value(lane, now);
            if (value == null || lanes.size() == CHIP.length) continue;
            lanes.add(lane);
            values.add(value);
        }
        boolean tall = ink.size == Size.TALL;
        boolean slim = ink.size == Size.SLIM;
        EtaWidgetViews.visible(views, !lanes.isEmpty() && maxRows > 0, R.id.eta_nf_chips);
        // How much of a chip is left for its number, in pixels: the chip's share of the width, less its padding, icon and gap.
        int count = Math.max(1, lanes.size());
        int chipWidth = slim ? ink.widthDp - SLIM_PAD
            : tall ? (ink.widthDp - 24 - 4) / 2 : (ink.widthDp - 28 - 4 * (count - 1)) / count;
        int valueRoom = ink.px(slim ? chipWidth - 10 - 16 - 5 : chipWidth - 12 - (tall ? 18 : 20) - 5);
        for (int i = 0; i < CHIP.length; i++) {
            // In the card only the rows that fit are shown.
            boolean shown = i < lanes.size() && (slim ? i < maxRows : !tall || i / 2 < maxRows);
            // In the card the chips sit two to a row: an empty partner keeps its place so a lone chip isn't stretched.
            boolean partnerShown = i % 2 == 0 ? i + 1 < lanes.size() : true;
            views.setViewVisibility(CHIP[i], shown ? View.VISIBLE : tall && partnerShown && i % 2 == 1 ? View.INVISIBLE : View.GONE);
            if (!shown) continue;
            views.setInt(CHIP[i], "setBackgroundResource",
                ink.surface(R.drawable.eta_nf_chip, R.drawable.eta_nf_chip_dark, R.drawable.eta_nf_chip_light));
            Bitmap icon = EtaWidgetArt.load(context, lanes.get(i).icon, 72);
            if (icon != null) views.setImageViewBitmap(ICON[i], icon);
            else views.setImageViewResource(ICON[i], R.mipmap.ic_launcher);
            float sp = EtaWidgetText.fit(context, values.get(i), EtaWidgetText.Face.NUMBER, 12f, 9f, valueRoom);
            ink.text(VALUE[i], values.get(i), EtaWidgetText.Face.NUMBER, sp, valueRoom, ink.light.text, ink.dark.text);
            views.setContentDescription(CHIP[i], lanes.get(i).name + " " + values.get(i));
        }
        if (tall) {
            EtaWidgetViews.visible(views, lanes.size() > 0 && maxRows > 0, R.id.eta_nf_row1);
            EtaWidgetViews.visible(views, lanes.size() > 2 && maxRows > 1, R.id.eta_nf_row2);
            EtaWidgetViews.visible(views, lanes.size() > 4 && maxRows > 2, R.id.eta_nf_row3);
        }
    }

    // The card's "up next": the village's following finishes, soonest first, as many as the height leaves room for.
    private static void queue(Context context, Ink ink, EtaWidgetVillages.Pick next, int rows, String clock, long now) {
        RemoteViews views = ink.views;
        List<EtaWidgetVillages.Upgrade> later = new ArrayList<>();
        for (EtaWidgetVillages.Upgrade u : next.village.upgrades) if (u.at > now && u != next.upgrade) later.add(u);
        later.sort(Comparator.comparingLong(u -> u.at));
        int shown = Math.min(rows, later.size());
        EtaWidgetViews.visible(views, shown > 0, R.id.eta_nf_queue);
        if (shown == 0) return;
        ink.text(R.id.eta_nf_queue_label, "Up next", EtaWidgetText.Face.TITLE, 10f, 0, 1, 0.06f, true, ink.light.soft, ink.dark.soft);
        for (int i = 0; i < Q.length; i++) {
            views.setViewVisibility(Q[i], i < shown ? View.VISIBLE : View.GONE);
            if (i >= shown) continue;
            EtaWidgetVillages.Upgrade u = later.get(i);
            views.setInt(Q_ART[i], "setBackgroundResource",
                ink.surface(R.drawable.eta_nf_tile, R.drawable.eta_nf_tile_dark, R.drawable.eta_nf_tile_light));
            Bitmap art = EtaWidgetArt.load(context, u.image, 90);
            if (art != null) views.setImageViewBitmap(Q_ART[i], art);
            else views.setImageViewResource(Q_ART[i], R.mipmap.ic_launcher);
            String day = EtaWidgetWhen.day(u.at, now);
            String time = EtaWidgetWhen.time(context, u.at, clock);
            Bitmap t = ink.text(Q_TIME[i], time, EtaWidgetText.Face.NUMBER, 12f, 0, ink.light.text, ink.dark.text);
            Bitmap d = ink.text(Q_DAY[i], day, EtaWidgetText.Face.BODY, 10f, 0, ink.light.soft, ink.dark.soft);
            int room = Math.max(0, ink.px(ink.widthDp - 24 - 30 - 8 - 6) - Math.max(t.getWidth(), d.getWidth()));
            ink.text(Q_NAME[i], u.name, EtaWidgetText.Face.TITLE, 12f, room, ink.light.text, ink.dark.text);
            ink.text(Q_LEVEL[i], u.detail, EtaWidgetText.Face.BODY, 10f, room, ink.light.soft, ink.dark.soft);
        }
    }
}
