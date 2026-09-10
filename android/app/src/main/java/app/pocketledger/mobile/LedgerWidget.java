package app.pocketledger.mobile;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class LedgerWidget extends AppWidgetProvider {
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.ledger_widget);
            bind(context, views, R.id.widget_expense, "expense", 0);
            bind(context, views, R.id.widget_income, "income", 1);
            manager.updateAppWidget(id, views);
        }
    }
    private void bind(Context context, RemoteViews views, int viewId, String direction, int request) {
        Intent intent = new Intent(context, QuickEntryActivity.class)
            .putExtra("direction", direction)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        views.setOnClickPendingIntent(viewId, PendingIntent.getActivity(context, request, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
    }
}
