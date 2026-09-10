package app.pocketledger.mobile;

import com.getcapacitor.BridgeActivity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {
    private static final int APP_BACKGROUND = Color.rgb(243, 238, 228);

    private void applySystemBarAppearance() {
        getWindow().setStatusBarColor(APP_BACKGROUND);
        getWindow().setNavigationBarColor(APP_BACKGROUND);
        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(
            getWindow(), getWindow().getDecorView()
        );
        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);
        // Some Android launchers restore their own icon mode after the first
        // frame. Re-applying on the decor view keeps clock and status icons dark.
        getWindow().getDecorView().post(() -> {
            WindowInsetsControllerCompat postedController = new WindowInsetsControllerCompat(
                getWindow(), getWindow().getDecorView()
            );
            postedController.setAppearanceLightStatusBars(true);
            postedController.setAppearanceLightNavigationBars(true);
        });
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppSettingsPlugin.class);
        registerPlugin(PocketNotificationsPlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        // Resize the whole viewport so fixed navigation and sheets also avoid
        // Android's system bars, display cutouts, and the on-screen keyboard.
        View content = findViewById(android.R.id.content);
        content.setBackgroundColor(APP_BACKGROUND);
        applySystemBarAppearance();
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets safe = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            Insets keyboard = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(safe.left, safe.top, safe.right, Math.max(safe.bottom, keyboard.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(content);
    }

    @Override
    protected void onPostResume() {
        super.onPostResume();
        applySystemBarAppearance();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applySystemBarAppearance();
    }
}
