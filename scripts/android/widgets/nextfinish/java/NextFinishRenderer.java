package __PACKAGE__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import java.util.ArrayList;
import java.util.List;

// Draws the widget: the app's colours, words and lane icons in one of four layouts, chosen by the size the home screen
// gives it. Nothing here counts: times are a day and a clock time, so the picture stays true until the next redraw. The words
// are pictures drawn with the app's fonts (EtaWidgetText), each cut to the room its layout gives it.
final class NextFinishRenderer {
    private NextFinishRenderer() {}

    private enum Size { SMALL, WIDE, LARGE, TALL }

    private static final int[] CHIP = {R.id.eta_nf_chip1, R.id.eta_nf_chip2, R.id.eta_nf_chip3, R.id.eta_nf_chip4, R.id.eta_nf_chip5};
    private static final int[] ICON = {R.id.eta_nf_chip1_icon, R.id.eta_nf_chip2_icon, R.id.eta_nf_chip3_icon, R.id.eta_nf_chip4_icon, R.id.eta_nf_chip5_icon};
    private static final int[] VALUE = {R.id.eta_nf_chip1_value, R.id.eta_nf_chip2_value, R.id.eta_nf_chip3_value, R.id.eta_nf_chip4_value, R.id.eta_nf_chip5_value};

    // The size the home screen gives it, in dp. Wider than a cell and a half and short is a strip; narrow and tall is a card.
    private static Size sizeOf(int width, int height) {
        if (height < 90) return Size.WIDE;
        if (width < 200) return height >= 200 ? Size.TALL : Size.SMALL;
        return Size.LARGE;
    }

    // Text sizes in sp, in the order SMALL, WIDE, LARGE, TALL.
    private static float pick(Size size, float small, float wide, float large, float tall) {
        return size == Size.SMALL ? small : size == Size.WIDE ? wide : size == Size.LARGE ? large : tall;
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
                default: return px(widthDp - 24);
            }
        }
    }

    static RemoteViews render(Context context, Bundle options, EtaWidgetVillages data, long now) {
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110);
        Size size = sizeOf(width, height);
        int layout = size == Size.LARGE ? R.layout.eta_nf_large
            : size == Size.WIDE ? R.layout.eta_nf_wide
            : size == Size.TALL ? R.layout.eta_nf_tall
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
        float nameSp = pick(size, 15f, 15f, 18f, 17f);
        float levelSp = pick(size, 12f, 12f, 13f, 12f);
        if (next == null) {
            // Nothing to show: say what to do, and keep the whole widget a way into the app.
            boolean none = data.villages.isEmpty();
            int room = ink.room(0);
            ink.text(R.id.eta_nf_name, none ? "Open ClashETA" : "Nothing upgrading", EtaWidgetText.Face.TITLE, nameSp, room,
                size == Size.TALL ? 2 : 1, 0f, false, light.text, dark.text);
            ink.text(R.id.eta_nf_level, none ? "Import your village" : "Every worker is free", EtaWidgetText.Face.BODY, levelSp,
                room, light.soft, dark.soft);
            views.setImageViewResource(R.id.eta_nf_art, R.mipmap.ic_launcher);
            EtaWidgetViews.visible(views, false, R.id.eta_nf_when, R.id.eta_nf_day, R.id.eta_nf_time);
            if (size == Size.LARGE) {
                EtaWidgetViews.visible(views, false, R.id.eta_nf_chips);
                ink.text(R.id.eta_nf_label, "Next to finish", EtaWidgetText.Face.TITLE, 11f, room, 1, 0.06f, true,
                    light.builder, dark.builder);
            }
            if (size == Size.TALL) EtaWidgetViews.visible(views, false, R.id.eta_nf_chips);
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
            float daySp = pick(size, 12f, 11f, 12f, 12f);
            int whenBox = size == Size.SMALL || size == Size.TALL ? ink.px(width - 24)
                : size == Size.WIDE ? ink.px((width - 20 - 48 - 10 - 8) * 0.45f) : ink.px((width - 28 - 64 - 12 - 8) * 0.5f);
            float timeSp = EtaWidgetText.fit(context, time, EtaWidgetText.Face.NUMBER, pick(size, 19f, 17f, 22f, 22f), 12f, whenBox);
            Bitmap timePic = ink.text(R.id.eta_nf_time, time, EtaWidgetText.Face.NUMBER, timeSp, 0, light.text, dark.text);
            Bitmap dayPic = size == Size.WIDE
                ? ink.text(R.id.eta_nf_day, day, EtaWidgetText.Face.BODY, daySp, 0, light.soft, dark.soft)
                : size == Size.SMALL
                    ? ink.text(R.id.eta_nf_day, day, EtaWidgetText.Face.TITLE, daySp, 0, laneLight, laneDark)
                    : ink.text(R.id.eta_nf_day, day, EtaWidgetText.Face.BODY, daySp, 0, laneLight, laneDark);
            int whenPx = size == Size.LARGE || size == Size.WIDE ? Math.max(timePic.getWidth(), dayPic.getWidth()) : 0;

            int room = ink.room(whenPx);
            ink.text(R.id.eta_nf_name, upgrade.name, EtaWidgetText.Face.TITLE, nameSp, room, size == Size.TALL ? 2 : 1, 0f, false,
                light.text, dark.text);
            // On a short square the level line is what gives way, so the time is never cut off.
            boolean levelShown = !(size == Size.SMALL && height < 125);
            EtaWidgetViews.visible(views, levelShown, R.id.eta_nf_level);
            if (levelShown)
                ink.text(R.id.eta_nf_level, upgrade.detail, EtaWidgetText.Face.BODY, levelSp, room, light.soft, dark.soft);

            Bitmap art = EtaWidgetArt.load(context, upgrade.image, artSide);
            if (art != null) views.setImageViewBitmap(R.id.eta_nf_art, art);
            else views.setImageViewResource(R.id.eta_nf_art, R.mipmap.ic_launcher);
            if (size == Size.LARGE) {
                String where = data.villages.size() > 1
                    ? "Next to finish · " + (next.village.name.isEmpty() ? next.village.tag : next.village.name)
                    : "Next to finish";
                ink.text(R.id.eta_nf_label, where, EtaWidgetText.Face.TITLE, 11f, room, 1, 0.06f, true, laneLight, laneDark);
            }
            if (size == Size.LARGE || size == Size.TALL) chips(context, ink, next.village, now);
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
    private static void chips(Context context, Ink ink, EtaWidgetVillages.Village village, long now) {
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
        EtaWidgetViews.visible(views, !lanes.isEmpty(), R.id.eta_nf_chips);
        // How much of a chip is left for its number, in pixels: the chip's share of the width, less its padding, icon and gap.
        int count = Math.max(1, lanes.size());
        int chipWidth = tall ? (ink.widthDp - 24 - 4) / 2 : (ink.widthDp - 28 - 4 * (count - 1)) / count;
        int valueRoom = ink.px(chipWidth - 12 - (tall ? 18 : 20) - 5);
        for (int i = 0; i < CHIP.length; i++) {
            boolean shown = i < lanes.size();
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
            EtaWidgetViews.visible(views, lanes.size() > 0, R.id.eta_nf_row1);
            EtaWidgetViews.visible(views, lanes.size() > 2, R.id.eta_nf_row2);
            EtaWidgetViews.visible(views, lanes.size() > 4, R.id.eta_nf_row3);
        }
    }
}
