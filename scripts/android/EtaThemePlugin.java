package __PACKAGE__;

import android.app.UiModeManager;
import android.content.Context;
import android.os.Build;
import androidx.appcompat.app.AppCompatDelegate;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Carries the app's own Auto / Dark / Light setting (src/native/nativeTheme.ts) over to Android, so the launch splash
// and the native window follow it and not only the phone's setting. The choice is kept here as well, because the splash
// is drawn before the page runs and has to know it on its own.
@CapacitorPlugin(name = "EtaTheme")
public class EtaThemePlugin extends Plugin {
    private static final String KEY = "theme";

    // Called by MainActivity before the splash is installed, and by apply() when the setting changes.
    static void applySaved(Context context) {
        set(context, EtaNotifier.prefs(context).getString(KEY, "auto"));
    }

    private static void set(Context context, String theme) {
        boolean dark = "dark".equals(theme);
        boolean light = "light".equals(theme);
        if (Build.VERSION.SDK_INT >= 31) {
            // Android 12+ remembers this for the app, so the next cold start's splash is already in the right theme.
            UiModeManager manager = context.getSystemService(UiModeManager.class);
            manager.setApplicationNightMode(
                dark ? UiModeManager.MODE_NIGHT_YES : light ? UiModeManager.MODE_NIGHT_NO : UiModeManager.MODE_NIGHT_AUTO);
        } else {
            AppCompatDelegate.setDefaultNightMode(
                dark ? AppCompatDelegate.MODE_NIGHT_YES
                     : light ? AppCompatDelegate.MODE_NIGHT_NO : AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);
        }
    }

    @PluginMethod
    public void apply(PluginCall call) {
        String theme = call.getString("theme", "auto");
        EtaNotifier.prefs(getContext()).edit().putString(KEY, theme).apply();
        // The night mode calls want the main thread.
        getActivity().runOnUiThread(() -> set(getContext(), theme));
        call.resolve(new JSObject());
    }
}
