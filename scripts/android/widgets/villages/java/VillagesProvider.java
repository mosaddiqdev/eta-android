package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

// The "Villages" widget: every saved village's next finish, and a note where a worker is idle. This class only answers the
// phone; the data and the drawing have a file each (Villages*.java), and the one alarm is the shared EtaWidgetSchedule.
// Docs: docs/android.md
public class VillagesProvider extends AppWidgetProvider {
    static final String REFRESH = "__PACKAGE__.widget.VILLAGES_REFRESH";

    /** Draws every widget of this kind again. Called by EtaWidgetsPlugin when the page sends new data. */
    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        draw(context, manager, manager.getAppWidgetIds(new ComponentName(context, VillagesProvider.class)));
        // The picker's picture, at the size the widget is first placed at, with the player's own villages.
        Bundle placed = new Bundle();
        placed.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        placed.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 180);
        EtaWidgetPreview.set(context, VillagesProvider.class,
            VillagesRenderer.render(context, placed, VillagesData.read(context), System.currentTimeMillis()));
    }

    private static void draw(Context context, AppWidgetManager manager, int[] ids) {
        if (ids.length == 0) {
            EtaWidgetSchedule.cancel(context, VillagesProvider.class, REFRESH);
            return;
        }
        long now = System.currentTimeMillis();
        VillagesData data = VillagesData.read(context);
        for (int id : ids)
            manager.updateAppWidget(id, VillagesRenderer.render(context, manager.getAppWidgetOptions(id), data, now));
        EtaWidgetSchedule.arm(context, VillagesProvider.class, REFRESH, data.nextChange(now), now);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        draw(context, manager, ids);
    }

    // Resized: the height decides how many rows it shows.
    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        draw(context, manager, new int[] {id});
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (REFRESH.equals(action)
            || Intent.ACTION_TIME_CHANGED.equals(action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
            || Intent.ACTION_LOCALE_CHANGED.equals(action)) refresh(context);
        else super.onReceive(context, intent);
    }

    @Override
    public void onDisabled(Context context) {
        EtaWidgetSchedule.cancel(context, VillagesProvider.class, REFRESH);
    }
}
