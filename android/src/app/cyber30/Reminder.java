package app.cyber30;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/** Daily reminders, scheduled by Android itself, so they arrive even when the app is closed. */
public class Reminder extends BroadcastReceiver {
    static final String CHANNEL = "daily";

    static void createChannel(Context c) {
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Daily lesson reminders", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("Morning lesson reminder and evening streak nudge");
        c.getSystemService(NotificationManager.class).createNotificationChannel(ch);
    }

    static void save(Context c, String morning, String evening, boolean enabled) {
        c.getSharedPreferences("cyber30", Context.MODE_PRIVATE).edit()
                .putString("morning", morning).putString("evening", evening).putBoolean("enabled", enabled).apply();
        schedule(c);
    }

    static void schedule(Context c) {
        SharedPreferences p = c.getSharedPreferences("cyber30", Context.MODE_PRIVATE);
        boolean on = p.getBoolean("enabled", true);
        set(c, 1, "morning", p.getString("morning", "08:00"), on);
        set(c, 2, "evening", p.getString("evening", "20:00"), on);
    }

    private static void set(Context c, int code, String kind, String hhmm, boolean on) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        Intent i = new Intent(c, Reminder.class).putExtra("kind", kind);
        PendingIntent pi = PendingIntent.getBroadcast(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(pi);
        if (!on) return;
        int h = 8, m = 0;
        try { String[] t = hhmm.split(":"); h = Integer.parseInt(t[0]); m = Integer.parseInt(t[1]); } catch (Exception ignored) { }
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, h);
        cal.set(Calendar.MINUTE, m);
        cal.set(Calendar.SECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis()) cal.add(Calendar.DAY_OF_MONTH, 1);
        am.setInexactRepeating(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), AlarmManager.INTERVAL_DAY, pi);
    }

    static void show(Context c, String title, String text) {
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(c, CHANNEL)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(title).setContentText(text)
                .setContentIntent(pi).setAutoCancel(true).build();
        try { c.getSystemService(NotificationManager.class).notify(title.hashCode(), n); } catch (SecurityException ignored) { }
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        createChannel(c);
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        String last = c.getSharedPreferences("cyber30", Context.MODE_PRIVATE).getString("lastActive", "");
        if ("evening".equals(intent.getStringExtra("kind"))) {
            if (!today.equals(last)) show(c, "Keep your streak alive 🔥", "One 3-minute card keeps your streak going.");
        } else {
            show(c, "Your Cyber30 lesson is ready", "Small steps, every day. Tap to continue.");
        }
    }
}
