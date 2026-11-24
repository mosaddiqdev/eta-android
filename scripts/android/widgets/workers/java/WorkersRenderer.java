package __PACKAGE__;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

// Draws the widget's frame: a header, the list (WorkersFactory fills it), and what to show instead when there is nothing to
// list. The words are pictures drawn with the app's fonts (EtaWidgetText).
final class WorkersRenderer {
    private WorkersRenderer() {}

    private static RemoteViews frame(Context context, EtaWidgetVillages data, long now, int widthDp, int[] idleOut) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.eta_wk_widget);
        EtaWidgetInk ink = new EtaWidgetInk(context, views);
        views.setInt(R.id.eta_wk_root, "setBackgroundResource",
            ink.surface(R.drawable.eta_wk_bg, R.drawable.eta_wk_bg_dark, R.drawable.eta_wk_bg_light));

        EtaWidgetVillages.Village village = data.villages.isEmpty() ? null : data.villages.get(0);
        int room = ink.px(widthDp - 28);
        String label = village == null ? "Workers" : "Workers · " + (village.name.isEmpty() ? village.tag : village.name);
        android.graphics.Bitmap head = ink.text(R.id.eta_wk_label, label, EtaWidgetText.Face.TITLE, 11f, room / 2 + room / 4, 1,
            0.06f, true, ink.light.builder, ink.dark.builder);

        WorkersRows.Result rows = village == null ? null : WorkersRows.build(context, village, data.clock, now, widthDp);
        if (rows != null && rows.idle > 0) {
            ink.text(R.id.eta_wk_head_idle, rows.idle + " idle", EtaWidgetText.Face.TITLE, 11f, Math.max(0, room - head.getWidth() - ink.px(8)),
                ink.light.warn, ink.dark.warn);
            views.setViewVisibility(R.id.eta_wk_head_idle, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.eta_wk_head_idle, View.GONE);
        }
        if (idleOut != null && rows != null) idleOut[0] = rows.idle;

        // What the empty list says: nothing imported yet, or a village with nothing in it.
        boolean none = village == null;
        ink.text(R.id.eta_wk_empty_title, none ? "Open ClashETA" : "No workers", EtaWidgetText.Face.TITLE, 15f, room,
            ink.light.text, ink.dark.text);
        ink.text(R.id.eta_wk_empty_sub, none ? "Import your village" : "Nothing to show yet", EtaWidgetText.Face.BODY, 12f, room,
            ink.light.soft, ink.dark.soft);
        views.setEmptyView(R.id.eta_wk_list, R.id.eta_wk_empty);

        // A tap on the widget or a row opens the app.
        Intent open = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (open != null) {
            PendingIntent pending =
                PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            views.setOnClickPendingIntent(R.id.eta_wk_root, pending);
            views.setOnClickPendingIntent(R.id.eta_wk_empty, pending);
            views.setPendingIntentTemplate(R.id.eta_wk_list, pending);
        }
        return views;
    }

    /** The widget on the home screen: its list comes from WorkersService, one list per widget. */
    static RemoteViews render(Context context, int appWidgetId, Bundle options, EtaWidgetVillages data, long now) {
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250);
        RemoteViews views = frame(context, data, now, width, null);
        Intent service = new Intent(context, WorkersService.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        // Each widget gets its own list: without a different address the phone would hand one widget's rows to another.
        service.setData(Uri.parse(service.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.eta_wk_list, service);
        return views;
    }

    /** The widget with its rows inside it, for the picker's picture on Android 15 and newer. */
    static RemoteViews preview(Context context, EtaWidgetVillages data, long now) {
        RemoteViews views = frame(context, data, now, 250, null);
        if (android.os.Build.VERSION.SDK_INT >= 31 && !data.villages.isEmpty()) {
            RemoteViews.RemoteCollectionItems.Builder items = new RemoteViews.RemoteCollectionItems.Builder();
            java.util.List<RemoteViews> rows = WorkersRows.build(context, data.villages.get(0), data.clock, now, 250).items;
            for (int i = 0; i < rows.size(); i++) items.addItem(i, rows.get(i));
            items.setViewTypeCount(WorkersRows.TYPES).setHasStableIds(false);
            views.setRemoteAdapter(R.id.eta_wk_list, items.build());
        }
        return views;
    }
}
