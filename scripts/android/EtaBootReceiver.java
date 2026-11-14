package __PACKAGE__;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// Restarting the phone or updating the app clears every alarm. This sets them again from the saved list.
public class EtaBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        EtaNotifier.rearm(context);
    }
}
