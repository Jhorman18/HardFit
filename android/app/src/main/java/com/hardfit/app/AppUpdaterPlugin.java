package com.hardfit.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean allowed = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            allowed = getContext().getPackageManager().canRequestPackageInstalls();
        }
        JSObject ret = new JSObject();
        ret.put("value", allowed);
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String urlString = call.getString("url");
        if (urlString == null || urlString.trim().isEmpty()) {
            call.reject("URL de descarga no proporcionada.");
            return;
        }

        new Thread(() -> {
            HttpURLConnection connection = null;
            InputStream input = null;
            FileOutputStream output = null;
            File outputFile = null;

            try {
                Context context = getContext();
                File updatesDir = new File(context.getCacheDir(), "updates");
                if (!updatesDir.exists()) {
                    updatesDir.mkdirs();
                }

                outputFile = new File(updatesDir, "HardFit-update.apk");
                if (outputFile.exists()) {
                    outputFile.delete();
                }

                URL currentUrl = new URL(urlString);
                int redirects = 0;
                boolean connected = false;

                while (!connected && redirects < 10) {
                    connection = (HttpURLConnection) currentUrl.openConnection();
                    connection.setConnectTimeout(30000);
                    connection.setReadTimeout(30000);
                    connection.setInstanceFollowRedirects(true);
                    // Sin esto Dropbox comprime la respuesta, oculta el tamaño y el progreso no avanza.
                    connection.setRequestProperty("Accept-Encoding", "identity");

                    int responseCode = connection.getResponseCode();
                    if (responseCode == HttpURLConnection.HTTP_MOVED_PERM
                            || responseCode == HttpURLConnection.HTTP_MOVED_TEMP
                            || responseCode == HttpURLConnection.HTTP_SEE_OTHER
                            || responseCode == 307
                            || responseCode == 308) {
                        String newLocation = connection.getHeaderField("Location");
                        if (newLocation == null) {
                            throw new Exception("Redirección HTTP " + responseCode + " sin cabecera Location.");
                        }
                        currentUrl = new URL(currentUrl, newLocation);
                        connection.disconnect();
                        redirects++;
                    } else if (responseCode == HttpURLConnection.HTTP_OK) {
                        connected = true;
                    } else {
                        throw new Exception("Error del servidor al descargar: HTTP " + responseCode);
                    }
                }

                if (!connected) {
                    throw new Exception("Demasiadas redirecciones al descargar la actualización.");
                }

                int fileLength = connection.getContentLength();
                input = connection.getInputStream();
                output = new FileOutputStream(outputFile);

                byte[] buffer = new byte[8192];
                long total = 0;
                int count;
                int lastPercent = -1;

                while ((count = input.read(buffer)) != -1) {
                    total += count;
                    output.write(buffer, 0, count);

                    if (fileLength > 0) {
                        int percent = Math.min(100, (int) ((total * 100) / fileLength));
                        if (percent != lastPercent) {
                            lastPercent = percent;
                            JSObject progress = new JSObject();
                            progress.put("percent", percent);
                            notifyListeners("progress", progress);
                        }
                    }
                }

                output.flush();
                output.close();
                output = null;

                input.close();
                input = null;

                connection.disconnect();
                connection = null;

                PackageManager pm = context.getPackageManager();
                PackageInfo archiveInfo = pm.getPackageArchiveInfo(outputFile.getAbsolutePath(), 0);
                if (archiveInfo == null || archiveInfo.packageName == null) {
                    if (outputFile.exists()) outputFile.delete();
                    call.reject("El archivo descargado no es un APK válido.");
                    return;
                }

                String currentPackage = context.getPackageName();
                if (!currentPackage.equals(archiveInfo.packageName)) {
                    if (outputFile.exists()) outputFile.delete();
                    call.reject("El paquete del APK (" + archiveInfo.packageName + ") no coincide con la aplicación (" + currentPackage + ").");
                    return;
                }

                long downloadedVersionCode;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    downloadedVersionCode = archiveInfo.getLongVersionCode();
                } else {
                    downloadedVersionCode = archiveInfo.versionCode;
                }

                PackageInfo currentInfo = pm.getPackageInfo(currentPackage, 0);
                long installedVersionCode;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    installedVersionCode = currentInfo.getLongVersionCode();
                } else {
                    installedVersionCode = currentInfo.versionCode;
                }

                if (downloadedVersionCode <= installedVersionCode) {
                    if (outputFile.exists()) outputFile.delete();
                    call.reject("La versión descargada (" + downloadedVersionCode + ") no es mayor que la instalada (" + installedVersionCode + ").");
                    return;
                }

                Uri apkUri = FileProvider.getUriForFile(
                        context,
                        currentPackage + ".fileprovider",
                        outputFile
                );

                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(installIntent);

                call.resolve();
            } catch (Exception e) {
                if (outputFile != null && outputFile.exists()) {
                    outputFile.delete();
                }
                call.reject("Error al descargar o preparar la actualización: " + (e.getMessage() != null ? e.getMessage() : e.toString()));
            } finally {
                try {
                    if (input != null) input.close();
                } catch (Exception ignored) {}
                try {
                    if (output != null) output.close();
                } catch (Exception ignored) {}
                try {
                    if (connection != null) connection.disconnect();
                } catch (Exception ignored) {}
            }
        }).start();
    }
}
