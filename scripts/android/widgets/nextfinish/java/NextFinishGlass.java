package __PACKAGE__;

import android.graphics.Bitmap;
import android.graphics.BlurMaskFilter;
import android.graphics.Canvas;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;

// The part of the glass that a plain shape can't do. A widget can't blur or bend the wallpaper behind it, so this draws what
// the eye reads as liquid glass: colour from the lane bleeding in at the corners as if refracted, a soft bright band along
// the inside of the edge where thick glass bends light, a specular line lit from the top left, and a faint one bottom right.
// It sits over the translucent body (res/drawable/eta_nf_bg*.xml) and is drawn to the widget's own size.
final class NextFinishGlass {
    private NextFinishGlass() {}

    /** Longest side in pixels. Widget pictures count against a memory limit on the home screen, and soft light needs no more. */
    private static final int MAX_SIDE = 560;

    private static int alpha(int color, int alpha) {
        return (color & 0x00FFFFFF) | (alpha << 24);
    }

    static Bitmap draw(float widthDp, float heightDp, float density, float radiusPx, boolean dark, int accent) {
        float scale = Math.min(1f, MAX_SIDE / (Math.max(widthDp, heightDp) * density));
        float d = density * scale;
        int w = Math.max(2, Math.round(widthDp * d));
        int h = Math.max(2, Math.round(heightDp * d));
        float radius = radiusPx * scale;
        Bitmap bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        RectF bounds = new RectF(0, 0, w, h);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        float reach = Math.max(w, h);

        Path shape = new Path();
        shape.addRoundRect(bounds, radius, radius, Path.Direction.CW);
        canvas.save();
        canvas.clipPath(shape);

        // Colour bleeding in, as if the glass refracted what is behind it: the lane's colour top right, a pale light bottom left.
        paint.setShader(new RadialGradient(w * 0.95f, h * 0.05f, reach * 0.8f, alpha(accent, dark ? 0x58 : 0x3A), alpha(accent, 0), Shader.TileMode.CLAMP));
        canvas.drawRect(bounds, paint);
        paint.setShader(new RadialGradient(w * 0.04f, h, reach * 0.7f, dark ? 0x26FFFFFF : 0x80FFFFFF, 0x00FFFFFF, Shader.TileMode.CLAMP));
        canvas.drawRect(bounds, paint);

        // Where thick glass bends light: a soft bright band just inside the edge, brighter and wider toward the top left.
        paint.setShader(null);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(5 * d);
        paint.setColor(dark ? 0x4DFFFFFF : 0xB8FFFFFF);
        paint.setMaskFilter(new BlurMaskFilter(6 * d, BlurMaskFilter.Blur.NORMAL));
        canvas.drawRoundRect(bounds, radius, radius, paint);
        paint.setMaskFilter(null);
        canvas.restore();

        // Specular lines on the very edge: strong from the top left, a faint answer from the bottom right.
        RectF edge = new RectF(bounds);
        edge.inset(1.2f * d, 1.2f * d);
        float inner = Math.max(0f, radius - 1.2f * d);
        paint.setStrokeWidth(1.8f * d);
        paint.setShader(new LinearGradient(0, 0, w * 0.75f, h * 0.45f, dark ? 0xE6FFFFFF : 0xFFFFFFFF, 0x00FFFFFF, Shader.TileMode.CLAMP));
        canvas.drawRoundRect(edge, inner, inner, paint);
        paint.setShader(new LinearGradient(w, h, w * 0.45f, h * 0.6f, dark ? 0x59FFFFFF : 0xB3FFFFFF, 0x00FFFFFF, Shader.TileMode.CLAMP));
        canvas.drawRoundRect(edge, inner, inner, paint);
        return bitmap;
    }
}
