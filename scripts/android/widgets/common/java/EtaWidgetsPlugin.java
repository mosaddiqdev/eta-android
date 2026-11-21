package __PACKAGE__;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// The page's way to a widget (src/widgets/plugin.ts). It keeps what the page sends and asks that widget to draw again.
// It does not know which widgets exist: "nextFinish" is drawn by NextFinishProvider.refresh(Context), found by name.
@CapacitorPlugin(name = "EtaWidgets")
public class EtaWidgetsPlugin extends Plugin {
    static final String PREFS = "eta_widgets";

    /** What the page last sent for this widget, or null if it never has. */
    static String data(Context context, String widget) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(widget, null);
    }

    @PluginMethod
    public void update(PluginCall call) {
        String widget = call.getString("widget");
        JSObject data = call.getObject("data");
        if (widget == null || !widget.matches("[a-zA-Z]+") || data == null) {
            call.reject("A widget name and its data are needed.");
            return;
        }
        Context context = getContext();
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(widget, data.toString()).apply();
        try {
            String name = Character.toUpperCase(widget.charAt(0)) + widget.substring(1) + "Provider";
            Class.forName(context.getPackageName() + "." + name)
                .getDeclaredMethod("refresh", Context.class)
                .invoke(null, context);
        } catch (ReflectiveOperationException unknown) {
            // No provider by that name in this build: the data is kept and nothing is drawn.
        }
        call.resolve();
    }
}
