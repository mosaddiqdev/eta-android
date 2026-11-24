package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

// The "Next finish" widget: the upgrade that finishes next, as a day and a time, in the app's look. This class only
// answers the phone; the data, the drawing and the one alarm each have a file of their own (NextFinish*.java). Docs:
// docs/android.md
public class NextFinishProvider extends AppWidgetProvider {
    static final String REFRESH = "__PACKAGE__.widget.NEXT_FINISH_REFRESH";

    /** Draws every widget of this kind again. Called by EtaWidgetsPlugin when the page sends new data. */
    public static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        draw(context, manager, manager.getAppWidgetIds(new ComponentName(context, NextFinishProvider.class)));
        // The picker's picture, at the size the widget is first placed at, with the player's own village.
        Bundle placed = new Bundle();
        placed.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        placed.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110);
        EtaWidgetPreview.set(context, NextFinishProvider.class,
            NextFinishRenderer.render(context, placed, EtaWidgetVillages.read(context, "nextFinish"), System.currentTimeMillis()));
    }

    private static void draw(Context context, AppWidgetManager manager, int[] ids) {
        if (ids.length == 0) {
            EtaWidgetSchedule.cancel(context, NextFinishProvider.class, REFRESH);
            return;
        }
        long now = System.currentTimeMillis();
        EtaWidgetVillages data = EtaWidgetVillages.read(context, "nextFinish");
        for (int id : ids)
            manager.updateAppWidget(id, NextFinishRenderer.render(context, manager.getAppWidgetOptions(id), data, now));
        EtaWidgetSchedule.arm(context, NextFinishProvider.class, REFRESH, data.nextChange(now), now);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        draw(context, manager, ids);
    }

    // Resized: the size decides which of the three layouts it gets.
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
        EtaWidgetSchedule.cancel(context, NextFinishProvider.class, REFRESH);
    }
}
