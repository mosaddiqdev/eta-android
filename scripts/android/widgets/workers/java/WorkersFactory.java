package __PACKAGE__;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import java.util.ArrayList;
import java.util.List;

// The list behind the Workers widget. The rows are built when the data changes (onDataSetChanged, which runs off the main
// thread), so scrolling only hands out what is ready.
final class WorkersFactory implements RemoteViewsService.RemoteViewsFactory {
    private final Context context;
    private final int appWidgetId;
    private volatile List<RemoteViews> items = new ArrayList<>();

    WorkersFactory(Context context, Intent intent) {
        this.context = context;
        this.appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
    }

    @Override
    public void onCreate() {}

    @Override
    public void onDataSetChanged() {
        EtaWidgetVillages data = WorkersProvider.data(context);
        Bundle options = AppWidgetManager.getInstance(context).getAppWidgetOptions(appWidgetId);
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        items = data.villages.isEmpty()
            ? new ArrayList<>()
            : WorkersRows.build(context, data.villages.get(0), data.clock, System.currentTimeMillis(), width).items;
    }

    @Override
    public void onDestroy() {
        items = new ArrayList<>();
    }

    @Override
    public int getCount() {
        return items.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        return position < items.size() ? items.get(position) : null;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return WorkersRows.TYPES;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return false;
    }
}
