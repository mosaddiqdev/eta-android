package __PACKAGE__;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.widget.RemoteViews;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// The list's rows, laid out the way the village page's Workers tab is: each kind of worker with how many are busy, then a
// card for each upgrade running there (picture, name, level, finish time), then a dashed card for each worker that is free.
// The words are pictures drawn with the app's fonts (EtaWidgetText). Every row is built here, so the list factory and the
// picker preview (Android 15+) show exactly the same thing.
final class WorkersRows {
    private WorkersRows() {}

    /** The three kinds of row, so the list can reuse views of the same kind. */
    static final int TYPES = 3;

    static final class Result {
        final List<RemoteViews> items = new ArrayList<>();
        /** How many regular workers at home have nothing to do. */
        int idle;
    }

    // The rows' fixed sizes in dp: the widget's side padding, a card's padding, its picture and the gaps.
    private static final int SIDE = 12;
    private static final int CARD = 6;
    private static final int ART = 36;
    private static final int GAP = 10;
    private static final int WHEN_GAP = 8;

    private static boolean home(String lane) {
        return lane.equals("builder") || lane.equals("lab") || lane.equals("pet");
    }

    /** What a free worker of this kind is called and what to do about it, as on the Workers tab. */
    private static String[] idleCopy(String lane) {
        switch (lane) {
            case "lab": return new String[] {"Laboratory is free", "Start a research"};
            case "pet": return new String[] {"Pet slot open", "Upgrade a pet"};
            case "bbBuilder": return new String[] {"Idle builder", "Start something so it isn’t wasted"};
            case "bbLab": return new String[] {"Star Laboratory is free", "Start a research"};
            default: return new String[] {"Idle builder", "Start something so it isn’t wasted"};
        }
    }

    static Result build(Context context, EtaWidgetVillages.Village village, String clock, long now, int widthDp) {
        Result result = new Result();
        for (EtaWidgetVillages.Lane lane : village.lanes) {
            List<EtaWidgetVillages.Upgrade> running = new ArrayList<>();
            int regular = 0;
            for (EtaWidgetVillages.Upgrade u : village.upgrades) {
                if (u.at <= now || !u.lane.equals(lane.key)) continue;
                running.add(u);
                if (!u.goblin) regular++;
            }
            running.sort(Comparator.comparingLong(u -> u.at));
            int idle = lane.capacity > 0 ? Math.max(0, lane.capacity - regular) : 0;
            // A kind the village doesn't have and isn't using has nothing to show.
            if (running.isEmpty() && idle == 0) continue;

            String busy = village.value(lane, now);
            result.items.add(head(context, lane, busy == null ? "" : busy, widthDp));
            for (EtaWidgetVillages.Upgrade u : running) result.items.add(busy(context, u, clock, now, widthDp));
            for (int i = 0; i < idle; i++) result.items.add(free(context, lane, widthDp));
            if (home(lane.key)) result.idle += idle;
        }
        return result;
    }

    private static RemoteViews head(Context context, EtaWidgetVillages.Lane lane, String busy, int widthDp) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.eta_wk_head);
        EtaWidgetInk ink = new EtaWidgetInk(context, views);
        Bitmap icon = EtaWidgetArt.load(context, lane.icon, 72);
        if (icon != null) views.setImageViewBitmap(R.id.eta_wk_head_icon, icon);
        else views.setImageViewResource(R.id.eta_wk_head_icon, R.mipmap.ic_launcher);
        Bitmap count = null;
        if (!busy.isEmpty())
            count = ink.text(R.id.eta_wk_head_busy, busy + " busy", EtaWidgetText.Face.NUMBER, 11f, 0, ink.light.soft, ink.dark.soft);
        else views.setViewVisibility(R.id.eta_wk_head_busy, android.view.View.GONE);
        int room = ink.px(widthDp - 2 * SIDE - 4 - 22 - 8) - (count == null ? 0 : count.getWidth() + ink.px(WHEN_GAP));
        ink.text(R.id.eta_wk_head_title, lane.name, EtaWidgetText.Face.TITLE, 13f, Math.max(0, room), ink.light.lane(lane.key), ink.dark.lane(lane.key));
        views.setContentDescription(R.id.eta_wk_head_root, lane.name + (busy.isEmpty() ? "" : ", " + busy + " busy"));
        views.setOnClickFillInIntent(R.id.eta_wk_head_root, new Intent());
        return views;
    }

    private static RemoteViews busy(Context context, EtaWidgetVillages.Upgrade u, String clock, long now, int widthDp) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.eta_wk_busy);
        EtaWidgetInk ink = new EtaWidgetInk(context, views);
        views.setInt(R.id.eta_wk_busy_card, "setBackgroundResource",
            ink.surface(R.drawable.eta_wk_row, R.drawable.eta_wk_row_dark, R.drawable.eta_wk_row_light));
        views.setInt(R.id.eta_wk_busy_art, "setBackgroundResource",
            ink.surface(R.drawable.eta_wk_tile, R.drawable.eta_wk_tile_dark, R.drawable.eta_wk_tile_light));
        Bitmap art = EtaWidgetArt.load(context, u.image, 108);
        if (art != null) views.setImageViewBitmap(R.id.eta_wk_busy_art, art);
        else views.setImageViewResource(R.id.eta_wk_busy_art, R.mipmap.ic_launcher);

        String day = EtaWidgetWhen.day(u.at, now);
        String time = EtaWidgetWhen.time(context, u.at, clock);
        Bitmap t = ink.text(R.id.eta_wk_busy_time, time, EtaWidgetText.Face.NUMBER, 13f, 0, ink.light.text, ink.dark.text);
        Bitmap d = ink.text(R.id.eta_wk_busy_day, day, EtaWidgetText.Face.BODY, 10f, 0, ink.light.soft, ink.dark.soft);
        int when = Math.max(t.getWidth(), d.getWidth()) + ink.px(WHEN_GAP);
        int room = Math.max(0, ink.px(widthDp - 2 * SIDE - 2 * CARD - ART - GAP) - when);
        ink.text(R.id.eta_wk_busy_title, u.name, EtaWidgetText.Face.TITLE, 13f, room, ink.light.text, ink.dark.text);
        ink.text(R.id.eta_wk_busy_sub, u.detail, EtaWidgetText.Face.BODY, 11f, room, ink.light.soft, ink.dark.soft);
        views.setContentDescription(R.id.eta_wk_busy_root, u.name + ", " + u.detail + ", " + day + " " + time);
        views.setOnClickFillInIntent(R.id.eta_wk_busy_root, new Intent());
        return views;
    }

    private static RemoteViews free(Context context, EtaWidgetVillages.Lane lane, int widthDp) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.eta_wk_idle);
        EtaWidgetInk ink = new EtaWidgetInk(context, views);
        views.setInt(R.id.eta_wk_idle_card, "setBackgroundResource",
            ink.surface(R.drawable.eta_wk_free, R.drawable.eta_wk_free_dark, R.drawable.eta_wk_free_light));
        views.setInt(R.id.eta_wk_idle_art, "setBackgroundResource",
            ink.surface(R.drawable.eta_wk_tile, R.drawable.eta_wk_tile_dark, R.drawable.eta_wk_tile_light));
        Bitmap icon = EtaWidgetArt.load(context, lane.icon, 108);
        if (icon != null) views.setImageViewBitmap(R.id.eta_wk_idle_art, icon);
        else views.setImageViewResource(R.id.eta_wk_idle_art, R.mipmap.ic_launcher);
        String[] copy = idleCopy(lane.key);
        int room = Math.max(0, ink.px(widthDp - 2 * SIDE - 2 * CARD - ART - GAP));
        ink.text(R.id.eta_wk_idle_title, copy[0], EtaWidgetText.Face.TITLE, 13f, room, ink.light.warn, ink.dark.warn);
        ink.text(R.id.eta_wk_idle_sub, copy[1], EtaWidgetText.Face.BODY, 11f, room, ink.light.soft, ink.dark.soft);
        views.setContentDescription(R.id.eta_wk_idle_root, copy[0] + ". " + copy[1]);
        views.setOnClickFillInIntent(R.id.eta_wk_idle_root, new Intent());
        return views;
    }
}
