package __PACKAGE__;

import android.content.Context;
import android.text.format.DateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

// "Tomorrow" and "10:05 PM", worded as on the village page (src/features/finish/format.ts): Today, Tomorrow, then the
// weekday and date. The clock follows the app's own setting, or the phone's when that is Auto.
final class NextFinishWhen {
    private NextFinishWhen() {}

    private static long midnight(long time) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(time);
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        return calendar.getTimeInMillis();
    }

    /** Calendar days, not 24-hour blocks, so a daylight-saving change can't turn tomorrow into today. */
    static String day(long at, long now) {
        int away = Math.round((midnight(at) - midnight(now)) / 86_400_000f);
        if (away == 0) return "Today";
        if (away == 1) return "Tomorrow";
        Locale locale = Locale.getDefault();
        return DateFormat.format(DateFormat.getBestDateTimePattern(locale, "EEEdMMM"), new Date(at)).toString();
    }

    static String time(Context context, long at, String clock) {
        boolean twentyFour = clock.equals("24") || (!clock.equals("12") && DateFormat.is24HourFormat(context));
        String skeleton = twentyFour ? "Hmm" : "hmma";
        return DateFormat.format(DateFormat.getBestDateTimePattern(Locale.getDefault(), skeleton), new Date(at)).toString();
    }

    /** The next local midnight, a few seconds past it, when "Tomorrow" has become "Today". */
    static long nextMidnight(long now) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(midnight(now));
        calendar.add(Calendar.DAY_OF_YEAR, 1);
        return calendar.getTimeInMillis() + 5_000;
    }
}
