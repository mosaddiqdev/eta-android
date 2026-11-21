package __PACKAGE__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import java.util.ArrayList;
import java.util.List;

// Draws the widget: the app's colours, words and lane icons in one of four layouts, chosen by the size the home screen
// gives it. Nothing here counts: times are a day and a clock time, so the picture stays true until the next redraw.
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

    /** Sets a colour that belongs to the theme. On Android 12 and newer the phone picks light or dark itself when the theme flips. */
    private static void tint(RemoteViews views, int id, EtaWidgetTheme theme, boolean forced, int light, int dark) {
        if (!forced && Build.VERSION.SDK_INT >= 31) views.setColorInt(id, "setTextColor", light, dark);
        else views.setInt(id, "setTextColor", theme.dark ? dark : light);
    }

    private static void visible(RemoteViews views, boolean on, int... ids) {
        for (int id : ids) views.setViewVisibility(id, on ? View.VISIBLE : View.GONE);
    }

    static RemoteViews render(Context context, Bundle options, NextFinishData data, long now) {
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110);
        Size size = sizeOf(width, height);
        EtaWidgetTheme theme = EtaWidgetTheme.of(context);
        String chosen = context.getSharedPreferences("eta_native", Context.MODE_PRIVATE).getString("theme", "auto");
        boolean forced = !chosen.equals("auto");
        int layout = size == Size.LARGE ? R.layout.eta_nf_large
            : size == Size.WIDE ? R.layout.eta_nf_wide
            : size == Size.TALL ? R.layout.eta_nf_tall
            : R.layout.eta_nf_small;
        RemoteViews views = new RemoteViews(context.getPackageName(), layout);
        EtaWidgetTheme light = EtaWidgetTheme.fixed(false);
        EtaWidgetTheme dark = EtaWidgetTheme.fixed(true);

        // Surfaces. With the theme on Auto these are the plain drawables, which the phone resolves light or dark by itself.
        views.setInt(R.id.eta_nf_root, "setBackgroundResource",
            !forced ? R.drawable.eta_nf_bg : theme.dark ? R.drawable.eta_nf_bg_dark : R.drawable.eta_nf_bg_light);
        views.setInt(R.id.eta_nf_art, "setBackgroundResource",
            !forced ? R.drawable.eta_nf_tile : theme.dark ? R.drawable.eta_nf_tile_dark : R.drawable.eta_nf_tile_light);
        tint(views, R.id.eta_nf_name, theme, forced, light.text, dark.text);
        tint(views, R.id.eta_nf_time, theme, forced, light.text, dark.text);
        tint(views, R.id.eta_nf_level, theme, forced, light.soft, dark.soft);
        tint(views, R.id.eta_nf_day, theme, forced, light.soft, dark.soft);

        NextFinishData.Pick next = data.next(now);
        int artSide = size == Size.LARGE || size == Size.TALL ? 200 : 144;
        if (next == null) {
            // Nothing to show: say what to do, and keep the whole widget a way into the app.
            boolean none = data.villages.isEmpty();
            views.setTextViewText(R.id.eta_nf_name, none ? "Open ClashETA" : "Nothing upgrading");
            views.setTextViewText(R.id.eta_nf_level, none ? "Import your village" : "Every worker is free");
            views.setImageViewResource(R.id.eta_nf_art, R.mipmap.ic_launcher);
            visible(views, false, R.id.eta_nf_when, R.id.eta_nf_day, R.id.eta_nf_time);
            visible(views, true, R.id.eta_nf_level);
            if (size == Size.LARGE) {
                visible(views, false, R.id.eta_nf_chips);
                views.setTextViewText(R.id.eta_nf_label, "Next to finish");
                tint(views, R.id.eta_nf_label, theme, forced, light.builder, dark.builder);
            }
            if (size == Size.TALL) visible(views, false, R.id.eta_nf_chips);
        } else {
            NextFinishData.Upgrade upgrade = next.upgrade;
            views.setTextViewText(R.id.eta_nf_name, upgrade.name);
            views.setTextViewText(R.id.eta_nf_level, upgrade.detail);
            // On a short square the level line is what gives way, so the time is never cut off.
            visible(views, !(size == Size.SMALL && height < 125), R.id.eta_nf_level);
            visible(views, true, R.id.eta_nf_when, R.id.eta_nf_day, R.id.eta_nf_time);
            views.setTextViewText(R.id.eta_nf_day, NextFinishWhen.day(upgrade.at, now));
            views.setTextViewText(R.id.eta_nf_time, NextFinishWhen.time(context, upgrade.at, data.clock));
            Bitmap art = NextFinishArt.load(context, upgrade.image, artSide);
            if (art != null) views.setImageViewBitmap(R.id.eta_nf_art, art);
            else views.setImageViewResource(R.id.eta_nf_art, R.mipmap.ic_launcher);
            // The day takes the lane's colour where there is room for a splash of colour.
            if (size != Size.WIDE)
                tint(views, R.id.eta_nf_day, theme, forced, light.lane(upgrade.lane), dark.lane(upgrade.lane));
            if (size == Size.LARGE) {
                String where = data.villages.size() > 1 ? "Next to finish · " + (next.village.name.isEmpty() ? next.village.tag : next.village.name) : "Next to finish";
                views.setTextViewText(R.id.eta_nf_label, where);
                tint(views, R.id.eta_nf_label, theme, forced, light.lane(upgrade.lane), dark.lane(upgrade.lane));
            }
            if (size == Size.LARGE || size == Size.TALL) chips(context, views, next.village, size, now, theme, forced);
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
    private static void chips(Context context, RemoteViews views, NextFinishData.Village village, Size size, long now,
                              EtaWidgetTheme theme, boolean forced) {
        List<NextFinishData.Lane> lanes = new ArrayList<>();
        List<String> values = new ArrayList<>();
        for (NextFinishData.Lane lane : village.lanes) {
            String value = village.value(lane, now);
            if (value == null || lanes.size() == CHIP.length) continue;
            lanes.add(lane);
            values.add(value);
        }
        EtaWidgetTheme light = EtaWidgetTheme.fixed(false);
        EtaWidgetTheme dark = EtaWidgetTheme.fixed(true);
        visible(views, !lanes.isEmpty(), R.id.eta_nf_chips);
        for (int i = 0; i < CHIP.length; i++) {
            boolean shown = i < lanes.size();
            // In the card the chips sit two to a row: an empty partner keeps its place so a lone chip isn't stretched.
            boolean partnerShown = i % 2 == 0 ? i + 1 < lanes.size() : true;
            views.setViewVisibility(CHIP[i], shown ? View.VISIBLE : size == Size.TALL && partnerShown && i % 2 == 1 ? View.INVISIBLE : View.GONE);
            if (!shown) continue;
            views.setInt(CHIP[i], "setBackgroundResource",
                !forced ? R.drawable.eta_nf_chip : theme.dark ? R.drawable.eta_nf_chip_dark : R.drawable.eta_nf_chip_light);
            Bitmap icon = NextFinishArt.load(context, lanes.get(i).icon, 72);
            if (icon != null) views.setImageViewBitmap(ICON[i], icon);
            else views.setImageViewResource(ICON[i], R.mipmap.ic_launcher);
            views.setTextViewText(VALUE[i], values.get(i));
            tint(views, VALUE[i], theme, forced, light.text, dark.text);
            views.setContentDescription(CHIP[i], lanes.get(i).name + " " + values.get(i));
        }
        if (size == Size.TALL) {
            visible(views, lanes.size() > 0, R.id.eta_nf_row1);
            visible(views, lanes.size() > 2, R.id.eta_nf_row2);
            visible(views, lanes.size() > 4, R.id.eta_nf_row3);
        }
    }
}
