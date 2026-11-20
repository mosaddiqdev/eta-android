package __PACKAGE__;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.graphics.Color;
import android.graphics.PixelFormat;
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
    // What was on the clipboard when this screen first had focus; read by EtaImportPlugin.clipboard().
    static volatile String clip = null;

    // BridgeActivity.onCreate puts Capacitor's opaque AppTheme.NoActionBar on the activity, which is what made the first
    // version a black screen. This keeps the see-through theme in place instead.
    @Override
    public void setTheme(int resId) {
        super.setTheme(R.style.EtaImportTheme);
    }

    // Android lets only the app with window focus read the clipboard, and this screen has it from the first moment, so
    // it is read here, natively, and the page asks for the text. No waiting and retrying inside the web view.
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (!hasFocus || clip != null) return;
        String text = "";
        ClipboardManager manager = getSystemService(ClipboardManager.class);
        ClipData data = manager == null ? null : manager.getPrimaryClip();
        if (data != null && data.getItemCount() > 0) {
            CharSequence item = data.getItemAt(0).coerceToText(this);
            if (item != null) text = item.toString();
        }
        clip = text;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        clip = null;
        // A window that is see-through from its first frame, before the web view exists.
        getWindow().setFormat(PixelFormat.TRANSLUCENT);
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
