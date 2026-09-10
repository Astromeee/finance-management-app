package app.pocketledger.mobile;

import android.os.Bundle;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.WindowManager;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

/** A separate floating window: the main ledger is never launched by a widget tap. */
public class QuickEntryActivity extends BridgeActivity {
    @Override public void setTheme(int ignored) { super.setTheme(R.style.QuickEntryTheme); }

    @Override public void onCreate(Bundle state) {
        registerPlugin(QuickEntryPlugin.class);
        registerPlugin(WidgetDataPlugin.class);
        super.onCreate(state);
        float density = getResources().getDisplayMetrics().density;
        int width = Math.min((int) (400 * density), getResources().getDisplayMetrics().widthPixels - (int) (32 * density));
        int height = Math.min((int) (430 * density), (int) (getResources().getDisplayMetrics().heightPixels * .72));
        getWindow().setLayout(width, height);
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        setFinishOnTouchOutside(false);
        if (bridge != null) {
            bridge.getWebView().setBackgroundColor(Color.TRANSPARENT);
            bridge.getWebView().getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
        }
    }
}
