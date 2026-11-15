package __PACKAGE__;

import android.widget.Toast;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// What the tile's page (src/native/quickImport.ts) needs from Android: a toast that stays up over the game, and a way to
// close the see-through screen it runs in (EtaImportActivity).
@CapacitorPlugin(name = "EtaImport")
public class EtaImportPlugin extends Plugin {
    @PluginMethod
    public void toast(PluginCall call) {
        String text = call.getString("text", "");
        getActivity().runOnUiThread(() -> Toast.makeText(getContext(), text, Toast.LENGTH_LONG).show());
        call.resolve();
    }

    @PluginMethod
    public void finish(PluginCall call) {
        // Without a task of its own left behind, the game is the screen that comes back.
        getActivity().runOnUiThread(() -> getActivity().finishAndRemoveTask());
        call.resolve();
    }
}
