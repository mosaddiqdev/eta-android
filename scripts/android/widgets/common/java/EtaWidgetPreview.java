package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import android.widget.RemoteViews;

// The widget picker's picture. The layout file alone can't show the words (they are drawn by the app, not typed into the
// layout), so on Android 15 and newer the app hands the picker a real drawing of the widget with the player's own data.
// The phone may refuse too many of these, and older phones use the layout, so a miss changes nothing else.
final class EtaWidgetPreview {
    private EtaWidgetPreview() {}

    static void set(Context context, Class<?> provider, RemoteViews views) {
        if (Build.VERSION.SDK_INT < 35) return;
        try {
            AppWidgetManager.getInstance(context).setWidgetPreview(
                new ComponentName(context, provider), AppWidgetProviderInfo.WIDGET_CATEGORY_HOME_SCREEN, views);
        } catch (RuntimeException refused) {
            // Rate limited or not allowed: the picker keeps what it had.
        }
    }
}
