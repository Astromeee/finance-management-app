package app.pocketledger.mobile;

import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetData")
public class WidgetDataPlugin extends Plugin {
    @PluginMethod public void update(PluginCall call) {
        getContext().getSharedPreferences("ledger_widget", 0).edit().putString("snapshot", call.getString("snapshot", "")).apply();
        MonthlySpendingWidget.refreshAll(getContext());
        call.resolve();
    }
}
