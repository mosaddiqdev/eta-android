package __PACKAGE__;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// Restarting the phone or updating the app clears every alarm, and so does taking back the exact alarm permission.
// This sets them again from the saved list (as exact ones if that is allowed now).
public class EtaBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        EtaNotifier.rearm(context);
    }
}
