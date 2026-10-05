package com.windchillmastery.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import java.util.Calendar;

/** Daily learning reminder: one inexact alarm a day, re-armed after it fires and after reboot. */
final class Reminders {
    private static final String PREFS = "reminders";
    private static final String CHANNEL = "reminders";
    private static final int FLAG_IMMUTABLE = 0x04000000;

    private Reminders() {
    }

    static void save(Context c, boolean enabled, int hour, int minute) {
        c.getSharedPreferences(PREFS, 0).edit()
            .putBoolean("enabled", enabled).putInt("hour", hour).putInt("minute", minute).apply();
    }

    private static PendingIntent alarmIntent(Context c) {
        Intent i = new Intent(c, ReminderReceiver.class);
        return PendingIntent.getBroadcast(c, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE);
    }

    static void schedule(Context c) {
        SharedPreferences p = c.getSharedPreferences(PREFS, 0);
        if (!p.getBoolean("enabled", false)) return;
        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, p.getInt("hour", 19));
        next.set(Calendar.MINUTE, p.getInt("minute", 0));
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= System.currentTimeMillis() + 1000) next.add(Calendar.DAY_OF_YEAR, 1);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), alarmIntent(c));
    }

    static void cancel(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        am.cancel(alarmIntent(c));
    }

    static void notify(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        Notification.Builder b = new Notification.Builder(c);
        if (MainActivity.atLeast(26)) {
            // NotificationChannel is API 26; this shell compiles against API 23, so use reflection.
            try {
                Class<?> ch = Class.forName("android.app.NotificationChannel");
                Object channel = ch.getConstructor(String.class, CharSequence.class, int.class)
                    .newInstance(CHANNEL, c.getString(R.string.reminder_channel), 3);
                nm.getClass().getMethod("createNotificationChannel", ch).invoke(nm, channel);
                b.getClass().getMethod("setChannelId", String.class).invoke(b, CHANNEL);
            } catch (Exception ignored) {
            }
        }
        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 2, open, PendingIntent.FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE);
        b.setSmallIcon(R.drawable.ic_notification)
            .setColor(0xFF5B3DF5)
            .setContentTitle("Keep your streak going")
            .setContentText("A 5-minute Windchill lesson is waiting for you.")
            .setAutoCancel(true)
            .setContentIntent(pi);
        try {
            nm.notify(1, b.build());
        } catch (SecurityException ignored) {
            // Notification permission was denied.
        }
    }
}
