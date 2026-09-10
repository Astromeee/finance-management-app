package app.pocketledger.mobile;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class PocketReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        PocketNotificationsPlugin.createChannel(context);
        int id = intent.getIntExtra("id", 73000);
        NotificationCompat.Builder notification = new NotificationCompat.Builder(context, PocketNotificationsPlugin.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_pocket_ledger)
            .setContentTitle(intent.getStringExtra("title"))
            .setContentText(intent.getStringExtra("body"))
            .setContentIntent(PocketNotificationsPlugin.openAppIntent(context, id))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true);
        try {
            NotificationManagerCompat.from(context).notify(id, notification.build());
        } catch (SecurityException ignored) {
            // Permission can be revoked after the alarm was scheduled.
        }
    }
}
