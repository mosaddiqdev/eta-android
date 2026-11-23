package __PACKAGE__;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.os.Build;
import android.text.StaticLayout;
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

    private static TextPaint paint(Context context, Face face, float sp, float tracking) {
        float fontScale = context.getResources().getConfiguration().fontScale;
        TextPaint paint = new TextPaint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        paint.setTypeface(face.get(context));
        // The phone's text size setting applies, up to 1.3x so a row never outgrows its height.
        float size = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, sp, context.getResources().getDisplayMetrics());
        paint.setTextSize(size / fontScale * Math.min(fontScale, 1.3f));
        paint.setLetterSpacing(tracking);
        paint.setColor(0xFFFFFFFF);
        return paint;
    }

    /** How wide the text is at this size, in pixels, without drawing it. */
    static int width(Context context, CharSequence text, Face face, float sp, float tracking) {
        return (int) Math.ceil(paint(context, face, sp, tracking).measureText(text, 0, text.length())) + 2;
    }

    /** The biggest size from `maxSp` down to `minSp` at which the text fits `maxPx`, or `minSp` if none does. */
    static float fit(Context context, CharSequence text, Face face, float maxSp, float minSp, int maxPx) {
        float sp = maxSp;
        while (sp > minSp && width(context, text, face, sp, 0f) > maxPx) sp -= 1f;
        return sp;
    }

    /**
     * `maxPx` cuts the text with an ellipsis, so it never needs more room than it was given; `lines` lets it wrap onto
     * more than one line before that. `tracking` is letter spacing in em.
     */
    static Bitmap draw(Context context, CharSequence text, Face face, float sp, int maxPx, int lines, float tracking, boolean upper) {
        TextPaint paint = paint(context, face, sp, tracking);
        CharSequence line = upper ? text.toString().toUpperCase() : text;
        if (lines > 1 && maxPx > 0) {
            StaticLayout layout = StaticLayout.Builder.obtain(line, 0, line.length(), paint, maxPx)
                .setMaxLines(lines).setEllipsize(TextUtils.TruncateAt.END).setIncludePad(false).build();
            int widest = 1;
            for (int i = 0; i < layout.getLineCount(); i++) widest = Math.max(widest, (int) Math.ceil(layout.getLineWidth(i)));
            Bitmap bitmap = Bitmap.createBitmap(widest + 2, Math.max(1, layout.getHeight()) + 2, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            canvas.translate(1f, 1f);
            layout.draw(canvas);
            return bitmap;
        }
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
