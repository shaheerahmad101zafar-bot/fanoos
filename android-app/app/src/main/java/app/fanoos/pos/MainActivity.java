package app.fanoos.pos;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.util.Set;
import java.util.UUID;

public class MainActivity extends Activity {
  private static final String SITE = "https://fanoos-bice.vercel.app";
  private static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
  private WebView web;

  @SuppressLint("SetJavaScriptEnabled")
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    askBluetooth();
    web = new WebView(this);
    setContentView(web);

    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setLoadWithOverviewMode(true);
    settings.setUseWideViewPort(true);
    settings.setSupportZoom(false);
    settings.setUserAgentString(settings.getUserAgentString() + " FanoosApp/1");
    settings.setCacheMode(
        networkOn() ? WebSettings.LOAD_DEFAULT : WebSettings.LOAD_CACHE_ELSE_NETWORK);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
      CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
    }
    CookieManager.getInstance().setAcceptCookie(true);

    web.setWebViewClient(
        new WebViewClient() {
          @Override
          public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (uri == null) return false;
            String url = uri.toString();
            String scheme = uri.getScheme();
            if ("intent".equals(scheme) || "googlechrome".equals(scheme)) {
              openExternal(url);
              return true;
            }
            String path = uri.getPath();
            if (path != null
                && (path.endsWith(".apk")
                    || path.endsWith(".zip")
                    || path.startsWith("/api/download/")
                    || path.startsWith("/download"))) {
              openExternal(url);
              return true;
            }
            return false;
          }
        });
    web.setDownloadListener(
        new DownloadListener() {
          @Override
          public void onDownloadStart(
              String url,
              String userAgent,
              String contentDisposition,
              String mimeType,
              long contentLength) {
            try {
              DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
              String name = URLUtil.guessFileName(url, contentDisposition, mimeType);
              request.setMimeType(mimeType);
              String cookies = CookieManager.getInstance().getCookie(url);
              if (cookies != null) request.addRequestHeader("cookie", cookies);
              request.addRequestHeader("User-Agent", userAgent);
              request.setTitle(name);
              request.setDescription("Fanoos");
              request.setNotificationVisibility(
                  DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
              request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
              DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
              dm.enqueue(request);
              Toast.makeText(MainActivity.this, "Download start — Downloads folder", Toast.LENGTH_LONG)
                  .show();
            } catch (Exception e) {
              openExternal(url);
            }
          }
        });
    web.addJavascriptInterface(new FanoosPrinter(), "FanoosPrinter");
    web.loadUrl(SITE);
  }

  private boolean networkOn() {
    try {
      ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
      if (cm == null) return true;
      if (Build.VERSION.SDK_INT >= 23) {
        Network net = cm.getActiveNetwork();
        if (net == null) return false;
        NetworkCapabilities caps = cm.getNetworkCapabilities(net);
        return caps != null
            && (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
      }
      android.net.NetworkInfo info = cm.getActiveNetworkInfo();
      return info != null && info.isConnected();
    } catch (Exception ignored) {
      return true;
    }
  }

  private void openExternal(String url) {
    try {
      Intent intent;
      if (url.startsWith("intent:") || url.startsWith("googlechrome:")) {
        intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
      } else {
        intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      startActivity(intent);
    } catch (Exception e) {
      Toast.makeText(this, "Chrome mein yeh link kholo", Toast.LENGTH_LONG).show();
    }
  }

  private void askBluetooth() {
    if (Build.VERSION.SDK_INT >= 31) {
      requestPermissions(
          new String[] {Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN},
          21);
    }
  }

  @Override
  public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (web != null) web.reload();
  }

  @Override
  public void onBackPressed() {
    if (web != null && web.canGoBack()) {
      web.goBack();
      return;
    }
    super.onBackPressed();
  }

  public class FanoosPrinter {
    @JavascriptInterface
    public String listBonded() {
      try {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) return "[]";
        Set<BluetoothDevice> bonded = adapter.getBondedDevices();
        JSONArray arr = new JSONArray();
        if (bonded == null) return "[]";
        for (BluetoothDevice device : bonded) {
          JSONObject row = new JSONObject();
          String name = device.getName();
          row.put("name", name == null ? "" : name);
          row.put("address", device.getAddress());
          arr.put(row);
        }
        return arr.toString();
      } catch (SecurityException ignored) {
        return "[]";
      } catch (Exception ignored) {
        return "[]";
      }
    }

    @JavascriptInterface
    public String printSpp(String address, String data) {
      JSONArray jobs = new JSONArray();
      jobs.put(data);
      return runJobs(address, jobs);
    }

    @JavascriptInterface
    public String printSppJobs(String address, String jobsJson) {
      try {
        return runJobs(address, new JSONArray(jobsJson));
      } catch (Exception e) {
        String text = e.getMessage();
        return "error:" + (text == null || text.isEmpty() ? "TM-m30 print nahi hua" : text);
      }
    }

    private String runJobs(String address, JSONArray jobs) {
      BluetoothSocket socket = null;
      try {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) return "error:Phone Bluetooth off hai";
        BluetoothDevice device = adapter.getRemoteDevice(address);
        try {
          adapter.cancelDiscovery();
        } catch (Exception ignored) {
        }
        socket = openSocket(device);
        InputStream in = socket.getInputStream();
        if (in == null) throw new Exception("Bluetooth input nahi khula");
        OutputStream out = socket.getOutputStream();
        for (int i = 0; i < jobs.length(); i += 1) {
          byte[] bytes = Base64.decode(jobs.getString(i), Base64.DEFAULT);
          writeFast(out, bytes);
          waitPrint(bytes.length);
          cutPaper(out);
        }
        Thread.sleep(700);
        return "ok";
      } catch (Exception e) {
        String text = e.getMessage();
        return "error:" + (text == null || text.isEmpty() ? "TM-m30 print nahi hua" : text);
      } finally {
        try {
          if (socket != null) socket.close();
        } catch (Exception ignored) {
        }
      }
    }

    private void writeFast(OutputStream out, byte[] bytes) throws Exception {
      int off = 0;
      while (off < bytes.length) {
        int n = Math.min(1024, bytes.length - off);
        out.write(bytes, off, n);
        off += n;
      }
      out.flush();
    }

    private void waitPrint(int len) throws Exception {
      int ms = 400 + len / 50;
      if (ms > 1800) ms = 1800;
      Thread.sleep(ms);
    }

    private void cutPaper(OutputStream out) throws Exception {
      out.write(new byte[] { 0x0A, 0x1B, 0x64, 0x04, 0x1D, 0x56, 0x42, 0x00 });
      out.flush();
      Thread.sleep(500);
    }

    private BluetoothSocket openSocket(BluetoothDevice device) throws Exception {
      Exception last = null;
      BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP);
      try {
        socket.connect();
        return socket;
      } catch (Exception e) {
        last = e;
        try {
          socket.close();
        } catch (Exception ignored) {
        }
      }
      try {
        socket = device.createInsecureRfcommSocketToServiceRecord(SPP);
        socket.connect();
        return socket;
      } catch (Exception e) {
        last = e;
        try {
          socket.close();
        } catch (Exception ignored) {
        }
      }
      try {
        Method method = device.getClass().getMethod("createRfcommSocket", int.class);
        socket = (BluetoothSocket) method.invoke(device, 1);
        socket.connect();
        return socket;
      } catch (Exception e) {
        last = e;
      }
      throw last == null ? new Exception("Bluetooth socket nahi khula") : last;
    }
  }
}
