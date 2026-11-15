package __PACKAGE__;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;

// A see-through screen over whatever is in front (the game), opened by the "Import village" tile. It holds the app's
// page quick-import.html, which reads the clipboard (Android allows that only to the app in front, and this is it),
// imports, shows a toast and closes itself. Nothing of it is drawn, so the player never leaves the game.
// It is its own task and is kept out of the recent apps list. Docs: docs/android.md
public class EtaImportActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(EtaImportPlugin.class);
        registerPlugin(EtaNotificationsPlugin.class);
        // The page to load. The rest of the configuration is Capacitor's defaults, which is all this page needs.
        config = new CapConfig.Builder(this).setStartPath("/quick-import.html").create();
        super.onCreate(savedInstanceState);
        // BridgeActivity puts its own opaque theme on top of this activity's see-through one, so both are undone here.
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) webView.setBackgroundColor(Color.TRANSPARENT);
    }
}
