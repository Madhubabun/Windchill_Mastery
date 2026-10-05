package com.windchillmastery.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

/** Exposed to the website as window.WindchillApp (see apps/web/src/lib/native.ts). */
public class Bridge {
    static final String POST_NOTIFICATIONS = "android.permission.POST_NOTIFICATIONS";

    private final Activity activity;
    private final WebView web;

    Bridge(Activity activity, WebView web) {
        this.activity = activity;
        this.web = web;
    }

    static String versionName(Context c) {
        try {
            return c.getPackageManager().getPackageInfo(c.getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException e) {
            return "0";
        }
    }

    @JavascriptInterface
    public boolean isNative() {
        return true;
    }

    @JavascriptInterface
    public String appVersion() {
        return versionName(activity);
    }

    @JavascriptInterface
    public void scheduleReminder(int hour, int minute) {
        Reminders.save(activity, true, hour, minute);
        Reminders.schedule(activity);
        requestNotificationPermission();
    }

    @JavascriptInterface
    public void cancelReminder() {
        Reminders.save(activity, false, 0, 0);
        Reminders.cancel(activity);
    }

    @JavascriptInterface
    public boolean notificationsAllowed() {
        if (!MainActivity.atLeast(33)) return true;
        return activity.checkSelfPermission(POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    @JavascriptInterface
    public void requestNotificationPermission() {
        if (!MainActivity.atLeast(33) || notificationsAllowed()) return;
        activity.runOnUiThread(new Runnable() {
            public void run() {
                activity.requestPermissions(new String[] {POST_NOTIFICATIONS}, 7);
            }
        });
    }

    @JavascriptInterface
    public void print(final String title) {
        activity.runOnUiThread(new Runnable() {
            public void run() {
                PrintManager pm = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
                String name = title == null || title.isEmpty() ? "Windchill Mastery" : title;
                PrintDocumentAdapter adapter = web.createPrintDocumentAdapter(name);
                pm.print(name, adapter, new PrintAttributes.Builder().build());
            }
        });
    }

    @JavascriptInterface
    public void share(String title, String text) {
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_SUBJECT, title);
        send.putExtra(Intent.EXTRA_TEXT, text);
        activity.startActivity(Intent.createChooser(send, title));
    }

    @JavascriptInterface
    public void openExternal(String url) {
        try {
            activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) {
        }
    }
}
