package __PACKAGE__;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import java.io.IOException;
import java.io.InputStream;

// The picture of the upgrade, from the app's own assets (public/game/...). A widget's pictures count against a memory
// limit on the home screen, so each is shrunk to what a tile can show, and centred on a square so it isn't cropped.
final class NextFinishArt {
    private static final String ROOT = "public/game/";
    private static final int SIDE = 144;

    private NextFinishArt() {}

    static Bitmap load(Context context, String path) {
        if (path == null || !path.startsWith(ROOT) || path.contains("..")) return null;
        try (InputStream in = context.getAssets().open(path)) {
            Bitmap source = BitmapFactory.decodeStream(in);
            if (source == null) return null;
            float scale = Math.min(1f, (float) SIDE / Math.max(source.getWidth(), source.getHeight()));
            int width = Math.max(1, Math.round(source.getWidth() * scale));
            int height = Math.max(1, Math.round(source.getHeight() * scale));
            Bitmap small = scale < 1f ? Bitmap.createScaledBitmap(source, width, height, true) : source;
            int side = Math.max(width, height);
            Bitmap square = Bitmap.createBitmap(side, side, Bitmap.Config.ARGB_8888);
            new Canvas(square).drawBitmap(small, (side - width) / 2f, (side - height) / 2f, null);
            return square;
        } catch (IOException missing) {
            return null;
        }
    }
}
