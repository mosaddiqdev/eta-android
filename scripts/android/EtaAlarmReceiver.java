package __PACKAGE__;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// An alarm set by EtaNotifier went off. The id is the last part of the address (eta://notification/<id>).
public class EtaAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent.getData() == null) return;
        try {
            EtaNotifier.fire(context, Integer.parseInt(intent.getData().getLastPathSegment()));
        } catch (NumberFormatException notOurs) {
            // Not an address this app wrote.
        }
    }
}
