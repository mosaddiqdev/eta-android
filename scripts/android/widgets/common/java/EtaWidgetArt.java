package __PACKAGE__;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import java.io.IOException;
import java.io.InputStream;

// The pictures, from the app's own assets (public/...): the upgrade and the lane icons. A widget's pictures count against a memory
// limit on the home screen, so each is shrunk to what a tile can show, and centred on a square so it isn't cropped.
final class EtaWidgetArt {
    private static final String ROOT = "public/";

    private EtaWidgetArt() {}

    /** `side` is the longest edge in pixels the tile can show; nothing is kept larger. */
    static Bitmap load(Context context, String path, int side) {
        if (path == null || !path.startsWith(ROOT) || path.contains("..")) return null;
        try (InputStream in = context.getAssets().open(path)) {
            Bitmap source = BitmapFactory.decodeStream(in);
            if (source == null) return null;
            float scale = Math.min(1f, (float) side / Math.max(source.getWidth(), source.getHeight()));
            int width = Math.max(1, Math.round(source.getWidth() * scale));
            int height = Math.max(1, Math.round(source.getHeight() * scale));
            Bitmap small = scale < 1f ? Bitmap.createScaledBitmap(source, width, height, true) : source;
            int edge = Math.max(width, height);
            Bitmap square = Bitmap.createBitmap(edge, edge, Bitmap.Config.ARGB_8888);
            new Canvas(square).drawBitmap(small, (edge - width) / 2f, (edge - height) / 2f, null);
            return square;
        } catch (IOException missing) {
            return null;
        }
    }
}
