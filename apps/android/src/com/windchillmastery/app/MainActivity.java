package com.windchillmastery.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Hosts the Windchill Mastery website, bundled in assets/www, in a full-screen WebView.
 * Pages are served from a private https origin so routing, localStorage and fonts behave
 * exactly as on the web, with no network needed.
 */
public class MainActivity extends Activity {
    static final String HOST = "app.windchillmastery.local";
    static final String ORIGIN = "https://" + HOST;
    private static final int FILE_CHOOSER = 41;

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0B0E24);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setTextZoom(100);
        s.setUserAgentString(s.getUserAgentString() + " WindchillMasteryApp/" + Bridge.versionName(this));

        web.addJavascriptInterface(new Bridge(this, web), "WindchillApp");
        web.setWebViewClient(new AssetClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });
        setContentView(web);

        if (saved != null) web.restoreState(saved);
        else web.loadUrl(ORIGIN + startPath(getIntent()));
    }

    private static String startPath(Intent intent) {
        String p = intent != null ? intent.getStringExtra("path") : null;
        return p != null && p.startsWith("/") ? p : "/";
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String p = intent.getStringExtra("path");
        if (p != null && p.startsWith("/")) web.loadUrl(ORIGIN + p);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    /** Serves https://app.windchillmastery.local/... from assets/www and sends other links to the browser. */
    private class AssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!HOST.equals(uri.getHost())) return null;
            return serve(uri.getPath());
        }

        @Override
        @SuppressWarnings("deprecation")
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri uri = Uri.parse(url);
            if (HOST.equals(uri.getHost())) return false;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (Exception ignored) {
            }
            return true;
        }
    }

    private WebResourceResponse serve(String path) {
        if (path == null || path.isEmpty()) path = "/";
        if (path.contains("..")) return notFound();
        String rel = path.substring(1);
        String[] candidates;
        if (rel.isEmpty() || rel.endsWith("/")) candidates = new String[] {rel + "index.html"};
        else if (rel.lastIndexOf('.') > rel.lastIndexOf('/')) candidates = new String[] {rel};
        else candidates = new String[] {rel + "/index.html", rel + ".html"};
        for (String c : candidates) {
            try {
                InputStream in = getAssets().open("www/" + c);
                return response(200, "OK", mime(c), in);
            } catch (IOException ignored) {
            }
        }
        return notFound();
    }

    private WebResourceResponse notFound() {
        try {
            return response(404, "Not Found", "text/html", getAssets().open("www/404.html"));
        } catch (IOException e) {
            return response(404, "Not Found", "text/plain", new java.io.ByteArrayInputStream("Not found".getBytes()));
        }
    }

    private static WebResourceResponse response(int status, String reason, String mime, InputStream in) {
        Map<String, String> headers = new HashMap<String, String>();
        headers.put("Cache-Control", "no-cache");
        headers.put("Access-Control-Allow-Origin", ORIGIN);
        boolean text = mime.startsWith("text/") || mime.endsWith("javascript") || mime.endsWith("json") || mime.endsWith("svg+xml");
        return new WebResourceResponse(mime, text ? "UTF-8" : null, status, reason, headers, in);
    }

    static String mime(String name) {
        String n = name.toLowerCase();
        if (n.endsWith(".html")) return "text/html";
        if (n.endsWith(".js") || n.endsWith(".mjs")) return "text/javascript";
        if (n.endsWith(".css")) return "text/css";
        if (n.endsWith(".json")) return "application/json";
        if (n.endsWith(".txt")) return "text/plain";
        if (n.endsWith(".svg")) return "image/svg+xml";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        if (n.endsWith(".webp")) return "image/webp";
        if (n.endsWith(".woff2")) return "font/woff2";
        if (n.endsWith(".woff")) return "font/woff";
        if (n.endsWith(".pdf")) return "application/pdf";
        if (n.endsWith(".mp4")) return "video/mp4";
        if (n.endsWith(".webmanifest")) return "application/manifest+json";
        if (n.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }

    static boolean atLeast(int sdk) {
        return Build.VERSION.SDK_INT >= sdk;
    }
}
