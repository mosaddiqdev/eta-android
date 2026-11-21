package __PACKAGE__;

import android.content.Context;
import android.content.res.Configuration;

// The app's colours (src/styles/tokens.css), for every widget. A widget follows the app's own Auto / Dark / Light, which
// EtaThemePlugin keeps in the "eta_native" preferences, and the phone's theme when that is Auto.
final class EtaWidgetTheme {
    final boolean dark;
    final int text;
    final int soft;
    final int builder;
    final int lab;
    final int pet;
    final int good;
    final int onAccent;

    private EtaWidgetTheme(boolean dark) {
        this.dark = dark;
        text = dark ? 0xFFECECEC : 0xFF151515;
        soft = dark ? 0xFF9B9B9B : 0xFF646463;
        builder = dark ? 0xFF4ABBE8 : 0xFF0E7BAD;
        lab = dark ? 0xFFE660C6 : 0xFFA31782;
        pet = dark ? 0xFFE3BE68 : 0xFF916600;
        good = dark ? 0xFF8FD1AE : 0xFF1D724D;
        onAccent = dark ? 0xFF121212 : 0xFFFFFFFF;
    }

    /** One theme or the other, whatever the app and the phone are set to. */
    static EtaWidgetTheme fixed(boolean dark) {
        return new EtaWidgetTheme(dark);
    }

    static EtaWidgetTheme of(Context context) {
        String chosen = context.getSharedPreferences("eta_native", Context.MODE_PRIVATE).getString("theme", "auto");
        if (chosen.equals("dark")) return new EtaWidgetTheme(true);
        if (chosen.equals("light")) return new EtaWidgetTheme(false);
        int night = context.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return new EtaWidgetTheme(night == Configuration.UI_MODE_NIGHT_YES);
    }

    /** The accent of a lane: builders cyan, laboratory magenta, pet house gold. The Builder Base lanes share the first two. */
    int lane(String lane) {
        if (lane.equals("lab") || lane.equals("bbLab")) return lab;
        if (lane.equals("pet")) return pet;
        return builder;
    }
}
