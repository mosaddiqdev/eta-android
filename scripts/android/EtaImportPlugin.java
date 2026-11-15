package __PACKAGE__;

import android.content.Intent;
import android.widget.Toast;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.atomic.AtomicBoolean;

// The "Import village" Quick Settings tile (EtaImportTile) opens the app with ACTION. MainActivity notes that here, and
// the page asks for it once it is up (src/native/clipboardImport.ts). The page does the import itself, because the
// village parser and the saved villages live there. After it, the page shows a system toast and sends the player back to
// the game, so the whole trip is one tap.
@CapacitorPlugin(name = "EtaImport")
public class EtaImportPlugin extends Plugin {
    static final String ACTION = "__PACKAGE__.IMPORT_CLIPBOARD";
    private static final AtomicBoolean requested = new AtomicBoolean(false);

    // Called by MainActivity for every intent it gets, at start and when it is already running.
    static void note(Intent intent) {
        if (intent == null || !ACTION.equals(intent.getAction())) return;
        requested.set(true);
        // A restart of the activity (rotation, say) hands it this same intent again, and must not import twice.
        intent.setAction(Intent.ACTION_MAIN);
    }

    @PluginMethod
    public void take(PluginCall call) {
        JSObject result = new JSObject();
        result.put("requested", requested.getAndSet(false));
        call.resolve(result);
    }

    // A system toast, so it stays on screen over the game after the app has gone to the background.
    @PluginMethod
    public void toast(PluginCall call) {
        String text = call.getString("text", "");
        getActivity().runOnUiThread(() -> Toast.makeText(getContext(), text, Toast.LENGTH_SHORT).show());
        call.resolve();
    }
}
