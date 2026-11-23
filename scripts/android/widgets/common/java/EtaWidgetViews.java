package __PACKAGE__;

import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;

// Two small things every widget does to its views.
final class EtaWidgetViews {
    private EtaWidgetViews() {}

    /** Sets a colour that belongs to the theme. On Android 12 and newer the phone picks light or dark itself when the theme flips. */
    static void tint(RemoteViews views, int id, EtaWidgetTheme theme, boolean forced, int light, int dark) {
        if (!forced && Build.VERSION.SDK_INT >= 31) views.setColorInt(id, "setTextColor", light, dark);
        else views.setInt(id, "setTextColor", theme.dark ? dark : light);
    }

    static void visible(RemoteViews views, boolean on, int... ids) {
        for (int id : ids) views.setViewVisibility(id, on ? View.VISIBLE : View.GONE);
    }
}
