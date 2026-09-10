package app.pocketledger.mobile;

import android.content.Intent;
import android.widget.Toast;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "QuickEntry")
public class QuickEntryPlugin extends Plugin {
    @PluginMethod public void context(PluginCall call) {
        JSObject result = new JSObject();
        result.put("refreshOnly", getActivity().getIntent().getBooleanExtra("refreshOnly", false));
        result.put("direction", "income".equals(getActivity().getIntent().getStringExtra("direction")) ? "income" : "expense");
        call.resolve(result);
    }
    @PluginMethod public void close(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (Boolean.TRUE.equals(call.getBoolean("saved", false))) {
                Toast.makeText(getContext(), "Saved to your ledger", Toast.LENGTH_SHORT).show();
            }
            call.resolve();
            getActivity().finish();
        });
    }
    @PluginMethod public void openApp(PluginCall call) {
        getActivity().startActivity(new Intent(getContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP));
        call.resolve();
        getActivity().finish();
    }
}
