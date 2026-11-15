package __PACKAGE__;

import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

// "Import village" in the Quick Settings panel. The phone starts this service only while the panel shows the tile, so
// it costs no battery or memory otherwise. A tap opens EtaImportActivity, a see-through screen over the game that
// imports what was copied and closes itself. Docs: docs/android.md
public class EtaImportTile extends TileService {
    @Override
    public void onStartListening() {
        super.onStartListening();
        Tile tile = getQsTile();
        if (tile == null) return;
        tile.setState(Tile.STATE_INACTIVE);
        if (Build.VERSION.SDK_INT >= 29) tile.setSubtitle("From clipboard");
        tile.updateTile();
    }

    @Override
    public void onClick() {
        super.onClick();
        // The clipboard and the saved villages are not reachable from a locked phone, so it is unlocked first.
        if (isLocked()) unlockAndRun(this::open);
        else open();
    }

    private void open() {
        Intent intent = new Intent(this, EtaImportActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_MULTIPLE_TASK);
        if (Build.VERSION.SDK_INT >= 34) {
            // Android 14 wants a PendingIntent here; the Intent version is deprecated.
            startActivityAndCollapse(
                PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        } else {
            startActivityAndCollapse(intent);
        }
    }
}
