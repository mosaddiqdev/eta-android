package __PACKAGE__;

import android.content.Context;
import android.graphics.Bitmap;
import android.widget.RemoteViews;

// What a widget's renderer needs to put words on a layout: the views, the theme and whether the app forces it, and the
// two ways to say a line (EtaWidgetText) with its colour for light and for dark. A widget's renderer extends it with what
// is its own (a clock setting, the time now, the room it has).
class EtaWidgetInk {
    final Context context;
    final RemoteViews views;
    final EtaWidgetTheme theme;
    final EtaWidgetTheme light = EtaWidgetTheme.fixed(false);
    final EtaWidgetTheme dark = EtaWidgetTheme.fixed(true);
    /** True when the app's own Dark or Light overrides the phone's, so colours are fixed and not left to flip by themselves. */
    final boolean forced;

    EtaWidgetInk(Context context, RemoteViews views) {
        this.context = context;
        this.views = views;
        this.theme = EtaWidgetTheme.of(context);
        this.forced = !context.getSharedPreferences("eta_native", Context.MODE_PRIVATE).getString("theme", "auto").equals("auto");
    }

    int px(float dp) {
        return Math.round(dp * EtaWidgetText.density(context));
    }

    /** One line, cut to `maxPx` (0 for no limit). */
    Bitmap text(int id, CharSequence text, EtaWidgetText.Face face, float sp, int maxPx, int lightColor, int darkColor) {
        return text(id, text, face, sp, maxPx, 1, 0f, false, lightColor, darkColor);
    }

    Bitmap text(int id, CharSequence text, EtaWidgetText.Face face, float sp, int maxPx, int lines, float tracking,
                boolean upper, int lightColor, int darkColor) {
        Bitmap bitmap = EtaWidgetText.draw(context, text, face, sp, maxPx, lines, tracking, upper);
        EtaWidgetText.put(views, id, bitmap, theme, forced, lightColor, darkColor);
        return bitmap;
    }

    /** `auto` while the phone decides light or dark, else the fixed one. */
    int surface(int auto, int darkOne, int lightOne) {
        return !forced ? auto : theme.dark ? darkOne : lightOne;
    }
}
