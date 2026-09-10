package app.pocketledger.mobile;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import org.json.*;
import java.text.*;
import java.util.*;

public class MonthlySpendingWidget extends AppWidgetProvider {
    private static final String ACTION_REFRESH = "app.pocketledger.mobile.REFRESH_MONTHLY_WIDGET";
    @Override public void onReceive(Context context, Intent intent) {
        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, MonthlySpendingWidget.class));
            for (int id : ids) {
                RemoteViews loading = new RemoteViews(context.getPackageName(), R.layout.monthly_widget);
                loading.setTextViewText(R.id.monthly_updated, "Writing your ledger…");
                manager.partiallyUpdateAppWidget(id, loading);
            }
            Intent refresh = new Intent(context, QuickEntryActivity.class).putExtra("refreshOnly", true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(refresh);
            return;
        }
        super.onReceive(context, intent);
    }
    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        new MonthlySpendingWidget().onUpdate(context, manager, manager.getAppWidgetIds(new ComponentName(context, MonthlySpendingWidget.class)));
    }
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.monthly_widget);
            Date now = new Date();
            views.setTextViewText(R.id.monthly_month, new SimpleDateFormat("MMMM", Locale.getDefault()).format(now).toUpperCase(Locale.getDefault()) + " SPENDING");
            views.removeAllViews(R.id.monthly_rows);
            views.setTextViewText(R.id.monthly_total, "—");
            views.setTextViewText(R.id.monthly_updated, "Tap refresh to load your ledger");
            try {
                JSONObject snapshot = new JSONObject(context.getSharedPreferences("ledger_widget", 0).getString("snapshot", ""));
                String month = new SimpleDateFormat("yyyy-MM", Locale.US).format(now);
                if (month.equals(snapshot.optString("month"))) {
                    String symbol = snapshot.optString("symbol", "Rs");
                    NumberFormat format = NumberFormat.getIntegerInstance(Locale.getDefault());
                    views.setTextViewText(R.id.monthly_total, symbol + " " + format.format(snapshot.optDouble("total")));
                    JSONArray rows = snapshot.optJSONArray("rows");
                    if (rows != null) for (int index = 0; index < Math.min(rows.length(), 4); index++) {
                        JSONObject row = rows.getJSONObject(index);
                        RemoteViews item = new RemoteViews(context.getPackageName(), R.layout.monthly_widget_row);
                        item.setTextViewText(R.id.monthly_category, row.optString("name"));
                        item.setTextViewText(R.id.monthly_amount, format.format(row.optDouble("amount")));
                        views.addView(R.id.monthly_rows, item);
                    }
                    views.setTextViewText(R.id.monthly_updated, (rows == null || rows.length() == 0 ? "No spending yet · " : "") + "Updated " + new SimpleDateFormat("d MMM, HH:mm", Locale.getDefault()).format(new Date(snapshot.optLong("updatedAt"))));
                } else views.setTextViewText(R.id.monthly_updated, "New month · tap refresh");
            } catch (JSONException ignored) { }
            Intent refresh = new Intent(context, MonthlySpendingWidget.class).setAction(ACTION_REFRESH);
            views.setOnClickPendingIntent(R.id.monthly_refresh, PendingIntent.getBroadcast(context, 20, refresh, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            manager.updateAppWidget(id, views);
        }
    }
}
