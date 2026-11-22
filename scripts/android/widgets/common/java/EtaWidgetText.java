package __PACKAGE__;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.os.Build;
import android.text.TextPaint;
import android.text.TextUtils;
import android.util.TypedValue;
import android.widget.RemoteViews;
import androidx.core.content.res.ResourcesCompat;

// Text drawn by the app, shown in the widget as a picture. A home screen draws a widget's TextViews in the phone's own
// font, and some launchers ignore a font set in the layout, so the app's typeface cannot be relied on there. A picture
// of the text always looks as drawn. The text is white and the ImageView tints it, so it follows light and dark like
// any other colour. Each ImageView in a layout stands for one line and carries no description: the row has one.
final class EtaWidgetText {
    private EtaWidgetText() {}

    /** The app's typefaces: Plus Jakarta Sans for words, JetBrains Mono for times and tags, as on the page. */
    enum Face {
        TITLE(R.font.eta_sans_700, Typeface.DEFAULT_BOLD),
        BODY(R.font.eta_sans_500, Typeface.DEFAULT),
        NUMBER(R.font.eta_mono_600, Typeface.MONOSPACE);

        final int resource;
        final Typeface fallback;
        private Typeface loaded;

        Face(int resource, Typeface fallback) {
            this.resource = resource;
            this.fallback = fallback;
        }

        synchronized Typeface get(Context context) {
            if (loaded == null) {
                try {
                    loaded = ResourcesCompat.getFont(context, resource);
                } catch (RuntimeException unreadable) {
                    loaded = null;
                }
                if (loaded == null) loaded = fallback;
            }
            return loaded;
        }
    }

    static float density(Context context) {
        return context.getResources().getDisplayMetrics().density;
    }

    /**
     * `sp` follows the phone's text size, up to 1.3x so a row never outgrows its height. `maxPx` cuts the line with an ellipsis,
     * so it never needs more room than it was given. `tracking` is letter spacing in em.
     */
    static Bitmap draw(Context context, CharSequence text, Face face, float sp, int maxPx, float tracking, boolean upper) {
        float scale = Math.min(context.getResources().getConfiguration().fontScale, 1.3f);
        TextPaint paint = new TextPaint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        paint.setTypeface(face.get(context));
        paint.setTextSize(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, sp, context.getResources().getDisplayMetrics()) / context.getResources().getConfiguration().fontScale * scale);
        paint.setLetterSpacing(tracking);
        paint.setColor(0xFFFFFFFF);
        CharSequence line = upper ? text.toString().toUpperCase() : text;
        if (maxPx > 0) line = TextUtils.ellipsize(line, paint, maxPx, TextUtils.TruncateAt.END);
        Paint.FontMetrics metrics = paint.getFontMetrics();
        int width = Math.max(1, (int) Math.ceil(paint.measureText(line, 0, line.length())) + 2);
        int height = Math.max(1, (int) Math.ceil(metrics.descent - metrics.ascent) + 2);
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        new Canvas(bitmap).drawText(line, 0, line.length(), 1f, 1f - metrics.ascent, paint);
        return bitmap;
    }

    /** Shows the picture in `id` and sets its colour. With the app on Auto, Android 12 and newer flip it with the phone's theme. */
    static void put(RemoteViews views, int id, Bitmap bitmap, EtaWidgetTheme theme, boolean forced, int light, int dark) {
        views.setImageViewBitmap(id, bitmap);
        if (!forced && Build.VERSION.SDK_INT >= 31) views.setColorInt(id, "setColorFilter", light, dark);
        else views.setInt(id, "setColorFilter", theme.dark ? dark : light);
    }
}
