package __PACKAGE__;

import android.content.Context;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

// What the page last sent for the Next finish widget (src/widgets/nextFinish/data.ts): every upgrade still running, for
// each saved village, with the words already made. Which one is next, and what has finished since, is worked out here at
// draw time, so the widget stays right between imports.
final class NextFinishData {
    static final String WIDGET = "nextFinish";

    static final class Upgrade {
        long at;
        String lane;
        String name;
        String detail;
        String image;
        boolean goblin;
    }

    /** One kind of worker: Builders, Lab, Pets, Builder Base, Star Lab. */
    static final class Lane {
        String key;
        String name;
        // Regular workers, or -1 when the export doesn't say.
        int capacity = -1;
        String icon;
    }

    static final class Village {
        String tag;
        String name;
        final List<Lane> lanes = new ArrayList<>();
        final List<Upgrade> upgrades = new ArrayList<>();

        /**
         * What the summary tile says for a kind of worker, as on the village page: busy of how many, with a Goblin as a
         * worker only while he works, or just how many are busy when the export doesn't give the count. Null when the
         * village has none of that kind and nothing running there, so there is nothing to show.
         */
        String value(Lane lane, long now) {
            int regular = 0;
            int goblin = 0;
            for (Upgrade u : upgrades) {
                if (u.at <= now || !u.lane.equals(lane.key)) continue;
                if (u.goblin) goblin++;
                else regular++;
            }
            if (lane.capacity < 0) return regular + goblin > 0 ? String.valueOf(regular + goblin) : null;
            return (regular + goblin) + "/" + (lane.capacity + goblin);
        }
    }

    static final class Pick {
        final Village village;
        final Upgrade upgrade;

        Pick(Village village, Upgrade upgrade) {
            this.village = village;
            this.upgrade = upgrade;
        }
    }

    final List<Village> villages = new ArrayList<>();
    /** "auto", "12" or "24": the app's own clock setting. */
    String clock = "auto";

    static NextFinishData read(Context context) {
        NextFinishData data = new NextFinishData();
        String stored = EtaWidgetsPlugin.data(context, WIDGET);
        if (stored == null) return data;
        try {
            JSONObject root = new JSONObject(stored);
            data.clock = root.optString("clock", "auto");
            JSONArray villages = root.optJSONArray("villages");
            for (int i = 0; villages != null && i < villages.length(); i++) data.villages.add(village(villages.getJSONObject(i)));
        } catch (JSONException unreadable) {
            data.villages.clear();
        }
        return data;
    }

    private static Village village(JSONObject json) throws JSONException {
        Village village = new Village();
        village.tag = json.optString("tag");
        village.name = json.optString("name");
        JSONArray lanes = json.optJSONArray("lanes");
        for (int i = 0; lanes != null && i < lanes.length(); i++) {
            JSONObject item = lanes.getJSONObject(i);
            Lane lane = new Lane();
            lane.key = item.optString("lane");
            lane.name = item.optString("name");
            lane.capacity = item.isNull("capacity") ? -1 : item.optInt("capacity", -1);
            lane.icon = item.isNull("icon") ? null : item.optString("icon");
            village.lanes.add(lane);
        }
        JSONArray upgrades = json.optJSONArray("upgrades");
        for (int i = 0; upgrades != null && i < upgrades.length(); i++) {
            JSONObject item = upgrades.getJSONObject(i);
            Upgrade upgrade = new Upgrade();
            upgrade.at = item.getLong("at");
            upgrade.lane = item.optString("lane");
            upgrade.name = item.optString("name");
            upgrade.detail = item.optString("detail");
            upgrade.image = item.isNull("image") ? null : item.optString("image");
            upgrade.goblin = item.optBoolean("goblin");
            village.upgrades.add(upgrade);
        }
        return village;
    }

    private static boolean home(String lane) {
        return lane.equals("builder") || lane.equals("lab") || lane.equals("pet");
    }

    /** The upgrade that finishes next, across every village. Home lanes first; the Builder Base only if nothing is running at home. */
    Pick next(long now) {
        Pick home = null;
        Pick any = null;
        for (Village village : villages)
            for (Upgrade u : village.upgrades) {
                if (u.at <= now) continue;
                if (any == null || u.at < any.upgrade.at) any = new Pick(village, u);
                if (home(u.lane) && (home == null || u.at < home.upgrade.at)) home = new Pick(village, u);
            }
        return home != null ? home : any;
    }

    /** The first moment something shown here stops being true: the next upgrade to finish. 0 when nothing is running. */
    long nextChange(long now) {
        long soonest = 0;
        for (Village village : villages)
            for (Upgrade u : village.upgrades) if (u.at > now && (soonest == 0 || u.at < soonest)) soonest = u.at;
        return soonest;
    }
}
