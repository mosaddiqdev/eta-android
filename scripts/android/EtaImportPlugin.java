package __PACKAGE__;

import android.widget.Toast;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// What the tile's page (src/native/quickImport.ts) needs from Android: a toast that stays up over the game, and a way to
// close the see-through screen it runs in (EtaImportActivity).
@CapacitorPlugin(name = "EtaImport")
public class EtaImportPlugin extends Plugin {
    // The clipboard as read when the screen got focus. Plugin calls run off the main thread, so waiting here is fine.
    @PluginMethod
    public void clipboard(PluginCall call) {
        long until = System.currentTimeMillis() + 2000;
        while (EtaImportActivity.clip == null && System.currentTimeMillis() < until) {
            try {
                Thread.sleep(25);
            } catch (InterruptedException e) {
                break;
            }
        }
        JSObject result = new JSObject();
        result.put("text", EtaImportActivity.clip == null ? "" : EtaImportActivity.clip);
        call.resolve(result);
    }

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
