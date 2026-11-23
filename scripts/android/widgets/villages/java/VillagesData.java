package __PACKAGE__;

import android.content.Context;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

// What the page last sent for the Villages widget (src/widgets/villages/data.ts). Which upgrades are still running, and
// which workers are idle because of that, is worked out here at draw time, so the widget stays right between imports.
final class VillagesData {
    static final String WIDGET = "villages";

    static final class Upgrade {
        long at;
        String lane;
        String name;
        String detail;
        String image;
        boolean goblin;
    }

    static final class Lane {
        String key;
        String name;
        int capacity;
    }

    static final class Village {
        String tag;
        String name;
        final List<Lane> lanes = new ArrayList<>();
        final List<Upgrade> upgrades = new ArrayList<>();

        /** What the player calls it, or its tag until they do. */
        String label() {
            return name.isEmpty() ? tag : name;
        }

        /** The upgrades still running, soonest first. */
        List<Upgrade> running(long now) {
            List<Upgrade> found = new ArrayList<>();
            for (Upgrade u : upgrades) if (u.at > now) found.add(u);
            found.sort(Comparator.comparingLong(u -> u.at));
            return found;
        }

        /**
         * A note when a worker at home has nothing to do: "1 Builder free", or "3 free" across kinds. A Goblin works on top of
         * the regular workers, so he never counts as one of them. Null when every worker is busy, or when the export does
         * not say how many there are.
         */
        String idle(long now) {
            int total = 0;
            Lane only = null;
            int kinds = 0;
            for (Lane lane : lanes) {
                int busy = 0;
                for (Upgrade u : upgrades) if (u.at > now && !u.goblin && u.lane.equals(lane.key)) busy++;
                int free = lane.capacity - busy;
                if (free <= 0) continue;
                total += free;
                kinds++;
                only = lane;
            }
            if (total == 0) return null;
            return kinds == 1 ? total + " " + only.name + " free" : total + " free";
        }
    }

    final List<Village> villages = new ArrayList<>();
    /** "auto", "12" or "24": the app's own clock setting. */
    String clock = "auto";

    static VillagesData read(Context context) {
        VillagesData data = new VillagesData();
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
            lane.capacity = item.optInt("capacity", 0);
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

    /** The villages with something running first, soonest finish first, then the ones with nothing running, as saved. */
    List<Village> byNextFinish(long now) {
        List<Village> sorted = new ArrayList<>(villages);
        sorted.sort(Comparator.comparingLong((Village v) -> {
            List<Upgrade> running = v.running(now);
            return running.isEmpty() ? Long.MAX_VALUE : running.get(0).at;
        }));
        return sorted;
    }

    /** The first moment something shown here stops being true: the next upgrade to finish. 0 when nothing is running. */
    long nextChange(long now) {
        long soonest = 0;
        for (Village village : villages)
            for (Upgrade u : village.upgrades) if (u.at > now && (soonest == 0 || u.at < soonest)) soonest = u.at;
        return soonest;
    }
}
