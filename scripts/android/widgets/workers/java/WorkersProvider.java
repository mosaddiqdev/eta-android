package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

// The "Workers" widget: the village page's Workers tab as a scrolling list, for the main village (set in Settings) or the one
// opened last. This class only answers the phone; the rows, the frame and the list each have a file (Workers*.java), and the one
// alarm is the shared EtaWidgetSchedule. Docs: docs/android.md
public class WorkersProvider extends AppWidgetProvider {
    static final String WIDGET = "workers";
    static final String REFRESH = "__PACKAGE__.widget.WORKERS_REFRESH";

    static EtaWidgetVillages data(Context context) {
        return EtaWidgetVillages.read(context, WIDGET);
    }

    /** Draws every widget of this kind again. Called by EtaWidgetsPlugin when the page sends new data. */
    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        draw(context, manager, manager.getAppWidgetIds(new ComponentName(context, WorkersProvider.class)));
        // The picker's picture, with the player's own village and its rows.
        EtaWidgetPreview.set(context, WorkersProvider.class, WorkersRenderer.preview(context, data(context), System.currentTimeMillis()));
    }

    private static void draw(Context context, AppWidgetManager manager, int[] ids) {
        if (ids.length == 0) {
            EtaWidgetSchedule.cancel(context, WorkersProvider.class, REFRESH);
            return;
        }
        long now = System.currentTimeMillis();
        EtaWidgetVillages data = data(context);
        for (int id : ids) {
            manager.updateAppWidget(id, WorkersRenderer.render(context, id, manager.getAppWidgetOptions(id), data, now));
            // The rows are built by the list's factory, which has to be asked to build them again.
            manager.notifyAppWidgetViewDataChanged(id, R.id.eta_wk_list);
        }
        long next = 0;
        for (EtaWidgetVillages.Village village : data.villages)
            for (EtaWidgetVillages.Upgrade u : village.upgrades) if (u.at > now && (next == 0 || u.at < next)) next = u.at;
        EtaWidgetSchedule.arm(context, WorkersProvider.class, REFRESH, next, now);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        draw(context, manager, ids);
    }

    // Resized: the rows' text is cut to the width, so they are built again.
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
        EtaWidgetSchedule.cancel(context, WorkersProvider.class, REFRESH);
    }
}
