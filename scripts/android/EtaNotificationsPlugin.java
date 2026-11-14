package __PACKAGE__;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONArray;

// The page's side of the notifications (src/native/notifications.ts). The page decides what to say and when; this asks
// for the permissions and hands the list to EtaNotifier.
@CapacitorPlugin(
    name = "EtaNotifications",
    permissions = {@Permission(strings = {Manifest.permission.POST_NOTIFICATIONS}, alias = "post")})
public class EtaNotificationsPlugin extends Plugin {
    private static final String ASKED = "askedForNotifications";

    // "prompt": Android will still show its question. "denied": it won't, so the only way is the phone's settings.
    private JSObject status() {
        boolean on = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        boolean asked = EtaNotifier.prefs(getContext()).getBoolean(ASKED, false);
        JSObject status = new JSObject();
        status.put("permission", on ? "granted" : Build.VERSION.SDK_INT >= 33 && !asked ? "prompt" : "denied");
        status.put("exact", EtaNotifier.canScheduleExact(getContext()));
        return status;
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        boolean on = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        if (on || Build.VERSION.SDK_INT < 33) {
            call.resolve(status());
            return;
        }
        EtaNotifier.prefs(getContext()).edit().putBoolean(ASKED, true).apply();
        requestPermissionForAlias("post", call, "afterRequest");
    }

    @PermissionCallback
    private void afterRequest(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        JSONArray items = call.getArray("items");
        EtaNotifier.replace(getContext(), items == null ? new JSONArray() : items);
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void test(PluginCall call) {
        EtaNotifier.post(getContext(), call.getObject("item"));
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        open(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName()));
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31)
            open(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getContext().getPackageName())));
        call.resolve(new JSObject());
    }

    private void open(Intent intent) {
        getActivity().startActivity(intent);
    }
}
