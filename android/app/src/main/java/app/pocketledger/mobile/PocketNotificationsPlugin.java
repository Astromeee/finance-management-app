package app.pocketledger.mobile;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONObject;

@CapacitorPlugin(name = "PocketNotifications", permissions = @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications"))
public class PocketNotificationsPlugin extends Plugin {
    static final String CHANNEL_ID = "pocket-ledger-reminders";

    private boolean notificationsAllowed() {
        boolean runtimeAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        return runtimeAllowed && NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
    }

    private void resolvePermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("permission", notificationsAllowed() ? "granted" : "denied");
        call.resolve(result);
    }

    @PluginMethod
    public void getPermissionStatus(PluginCall call) { resolvePermission(call); }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || notificationsAllowed()) {
            resolvePermission(call);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationPermissionResult");
    }

    @PermissionCallback
    private void notificationPermissionResult(PluginCall call) { resolvePermission(call); }

    @PluginMethod
    public void schedule(PluginCall call) {
        if (!notificationsAllowed()) {
            call.reject("Allow notifications in Android settings, then return and try again.");
            return;
        }
        JSArray notifications = call.getArray("notifications");
        if (notifications == null) {
            call.reject("Missing reminders.");
            return;
        }
        try {
            int count = 0;
            for (Object raw : notifications.toList()) {
                JSONObject item = (JSONObject) raw;
                scheduleAlarm(item.getInt("id"), item.getString("title"), item.getString("body"), item.getLong("at"), item.optBoolean("daily", false));
                count += 1;
            }
            JSObject result = new JSObject();
            result.put("count", count);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Android could not schedule these reminders.", error);
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        JSArray ids = call.getArray("ids");
        if (ids == null) { call.resolve(); return; }
        AlarmManager alarms = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        try {
            for (Object raw : ids.toList()) {
                int id = ((Number) raw).intValue();
                alarms.cancel(reminderIntent(getContext(), id, null, null));
            }
            call.resolve();
        } catch (Exception error) {
            call.reject("Android could not cancel these reminders.", error);
        }
    }

    @PluginMethod
    public void sendTest(PluginCall call) {
        if (!notificationsAllowed()) {
            call.reject("Allow notifications in Android settings, then return and try again.");
            return;
        }
        createChannel(getContext());
        NotificationCompat.Builder notification = new NotificationCompat.Builder(getContext(), CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_pocket_ledger)
            .setContentTitle("Pocket Ledger reminders are working")
            .setContentText("Bill and daily logging reminders can now appear on this device.")
            .setContentIntent(openAppIntent(getContext(), 73003))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true);
        NotificationManagerCompat.from(getContext()).notify(73003, notification.build());
        call.resolve();
    }

    private void scheduleAlarm(int id, String title, String body, long at, boolean daily) {
        AlarmManager alarms = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        PendingIntent pending = reminderIntent(getContext(), id, title, body);
        if (daily) alarms.setInexactRepeating(AlarmManager.RTC_WAKEUP, at, AlarmManager.INTERVAL_DAY, pending);
        else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
        else alarms.set(AlarmManager.RTC_WAKEUP, at, pending);
    }

    static PendingIntent reminderIntent(Context context, int id, String title, String body) {
        Intent intent = new Intent(context, PocketReminderReceiver.class).setAction(context.getPackageName() + ".REMINDER." + id);
        if (title != null) intent.putExtra("title", title);
        if (body != null) intent.putExtra("body", body);
        intent.putExtra("id", id);
        return PendingIntent.getBroadcast(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static PendingIntent openAppIntent(Context context, int notificationId) {
        Intent intent = new Intent(context, MainActivity.class)
            .setAction(context.getPackageName() + ".OPEN_FROM_NOTIFICATION." + notificationId)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
            context,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Reminders", NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Bill due dates and daily logging reminders");
        manager.createNotificationChannel(channel);
    }
}
