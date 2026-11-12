package app.cyber30;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;

/**
 * Cyber30 for Android. The whole app (lessons included) is bundled in the APK and served to a
 * WebView from a private origin, so it works offline. Sync with the Kali database goes through
 * the native bridge below, so the page never talks to the network directly.
 */
public class MainActivity extends Activity {
    static final String HOST = "cyber30.local";
    private WebView web;
    private boolean pageReady = false;
    private Uri pendingAuth = null;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        web.addJavascriptInterface(new Bridge(), "Cyber30Native");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!HOST.equals(u.getHost())) return null;
                return asset(u.getPath());
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                pageReady = true;
                if (pendingAuth != null) { deliverAuth(pendingAuth); pendingAuth = null; }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true; // outside links open in the phone's browser
            }
        });
        setContentView(web);
        if (state != null) web.restoreState(state);
        else web.loadUrl("https://" + HOST + "/#/today");
        Reminder.createChannel(this);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        Uri u = intent == null ? null : intent.getData();
        if (u == null || !"app.cyber30".equals(u.getScheme()) || !"auth".equals(u.getHost())) return;
        if (pageReady) deliverAuth(u); else pendingAuth = u;
    }

    private void deliverAuth(Uri u) {
        String code = u.getQueryParameter("code");
        String err = u.getQueryParameter("error_description");
        if (err == null) err = u.getQueryParameter("error");
        String js = "window.__c30auth&&window.__c30auth(" + (code == null ? "null" : JSONObject.quote(code)) + ","
                + (err == null ? "null" : JSONObject.quote(err)) + ")";
        web.evaluateJavascript(js, null);
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

    private WebResourceResponse asset(String path) {
        if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
        if (path.contains("..")) return notFound();
        String file = path.startsWith("/content/") ? path.substring(1) : "web" + path;
        try {
            InputStream in = getAssets().open(file);
            HashMap<String, String> h = new HashMap<>();
            h.put("Cache-Control", "no-cache");
            return new WebResourceResponse(mime(file), "utf-8", 200, "OK", h, in);
        } catch (Exception e) {
            return notFound();
        }
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<>(),
                new ByteArrayInputStream(new byte[0]));
    }

    private static String mime(String f) {
        if (f.endsWith(".html")) return "text/html";
        if (f.endsWith(".js")) return "text/javascript";
        if (f.endsWith(".css")) return "text/css";
        if (f.endsWith(".json") || f.endsWith(".webmanifest")) return "application/json";
        if (f.endsWith(".svg")) return "image/svg+xml";
        if (f.endsWith(".png")) return "image/png";
        return "application/octet-stream";
    }

    @SuppressWarnings("unused")
    private String readAsset(String name) {
        try (InputStream in = getAssets().open(name)) {
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
            return b.toString("UTF-8");
        } catch (Exception e) {
            return "{}";
        }
    }

    /** Methods the web app can call as window.Cyber30Native.*. Only our bundled page is ever loaded. */
    class Bridge {
        @JavascriptInterface
        public void openExternal(String url) {
            if (url == null || !url.startsWith("https://")) return; // only open secure web pages
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) { }
            });
        }

        @JavascriptInterface
        public void http(final String id, final String method, final String url, final String key, final String body) {
            new Thread(() -> {
                int code = 0;
                String text = "";
                try {
                    if (!url.startsWith("http://") && !url.startsWith("https://")) throw new IllegalArgumentException("bad url");
                    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                    c.setConnectTimeout(5000);
                    c.setReadTimeout(15000);
                    c.setRequestMethod(method);
                    c.setRequestProperty("Content-Type", "application/json");
                    if (key != null && !key.isEmpty()) c.setRequestProperty("X-Key", key);
                    if (body != null && !body.isEmpty() && !"GET".equals(method)) {
                        c.setDoOutput(true);
                        try (OutputStream o = c.getOutputStream()) { o.write(body.getBytes("UTF-8")); }
                    }
                    code = c.getResponseCode();
                    InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
                    if (in != null) {
                        ByteArrayOutputStream b = new ByteArrayOutputStream();
                        byte[] buf = new byte[8192];
                        int n;
                        while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
                        text = b.toString("UTF-8");
                        in.close();
                    }
                } catch (Exception e) {
                    code = 0;
                    text = String.valueOf(e.getMessage());
                }
                final String js = "window.__c30cb(" + JSONObject.quote(id) + "," + code + "," + JSONObject.quote(text) + ")";
                web.post(() -> web.evaluateJavascript(js, null));
            }).start();
        }

        @JavascriptInterface
        public void setReminders(String morning, String evening, boolean enabled) {
            Reminder.save(MainActivity.this, morning, evening, enabled);
        }

        @JavascriptInterface
        public void markActive(String day) {
            getSharedPreferences("cyber30", MODE_PRIVATE).edit().putString("lastActive", day).apply();
        }

        @JavascriptInterface
        public void requestNotifications() {
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
                runOnUiThread(() -> requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 1));
            }
        }

        @JavascriptInterface
        public void testNotification() {
            Reminder.show(MainActivity.this, "Cyber30 test", "Phone notifications are working.");
        }
    }
}
