package __PACKAGE__;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

// The widget never ticks. It is drawn again when the page sends new data, when the next upgrade finishes (so it moves on
// to the one after), and at midnight (so "Tomorrow" becomes "Today"). This sets that one alarm; each draw replaces it.
final class NextFinishSchedule {
    private NextFinishSchedule() {}

    private static PendingIntent intent(Context context) {
        Intent refresh = new Intent(context, NextFinishProvider.class).setAction(NextFinishProvider.REFRESH);
        return PendingIntent.getBroadcast(context, 0, refresh, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** `finishAt` is when the next upgrade finishes in Unix milliseconds, or 0 when none is running. */
    static void arm(Context context, long finishAt, long now) {
        long at = NextFinishWhen.nextMidnight(now);
        // A second after, so the upgrade has really finished when the widget asks.
        if (finishAt > 0) at = Math.min(at, finishAt + 1_000);
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        boolean exact = Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms();
        try {
            if (exact) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC, at, intent(context));
            else alarms.setAndAllowWhileIdle(AlarmManager.RTC, at, intent(context));
        } catch (SecurityException refused) {
            alarms.set(AlarmManager.RTC, at, intent(context));
        }
    }

    static void cancel(Context context) {
        context.getSystemService(AlarmManager.class).cancel(intent(context));
    }
}
