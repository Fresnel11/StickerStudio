package com.stickerstudio;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import org.json.JSONObject;
import java.io.OutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.util.UUID;

@CapacitorPlugin(name = "Studio")
public class StudioPlugin extends Plugin {
    private boolean adding = false;
    private boolean saving = false;
    private boolean installed(String name) {
        try { getContext().getPackageManager().getPackageInfo(name, 0); return true; }
        catch (PackageManager.NameNotFoundException e) { return false; }
    }
    @PluginMethod public void availability(PluginCall call) {
        call.resolve(new JSObject().put("whatsapp", installed("com.whatsapp")).put("business", installed("com.whatsapp.w4b")));
    }
    @PluginMethod public void openAuth(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("URL manquante");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Impossible d'ouvrir l'URL", e);
        }
    }
    @PluginMethod public void addPack(PluginCall call) {
        if (adding) { call.reject("Un ajout est déjà en cours."); return; }
        String target = call.getString("target", "com.whatsapp");
        if ((!target.equals("com.whatsapp") && !target.equals("com.whatsapp.w4b")) || !installed(target)) {
            call.reject("Installez WhatsApp sur cet appareil pour ajouter votre pack.", "WHATSAPP_MISSING"); return;
        }
        adding = true;
        try {
            JSONObject pack = StickerStore.save(getContext(), call.getString("sourceId"), call.getString("name"), call.getArray("stickers"));
            // Activity saved-state has a small Binder limit; files are already persisted.
            call.getData().remove("stickers");
            Intent intent = new Intent("com.whatsapp.intent.action.ENABLE_STICKER_PACK").setPackage(target);
            intent.putExtra("sticker_pack_id", pack.getString("id"));
            intent.putExtra("sticker_pack_authority", getContext().getPackageName() + ".stickers");
            intent.putExtra("sticker_pack_name", pack.getString("name"));
            startActivityForResult(call, intent, "packResult");
        } catch (Exception error) { adding = false; call.reject(error.getMessage(), "PACK_INVALID", error); }
    }
    @ActivityCallback private void packResult(PluginCall call, ActivityResult result) {
        adding = false; if (call == null) return;
        if (result.getResultCode() == Activity.RESULT_OK) { call.resolve(new JSObject().put("added", true)); return; }
        String validation = result.getData() == null ? null : result.getData().getStringExtra("validation_error");
        if (validation != null) {
            android.util.Log.w("StickerStudio", "WhatsApp validation: " + validation);
            call.reject("WhatsApp a refusé ce pack. Vérifiez vos stickers et mettez WhatsApp à jour.", "WHATSAPP_REJECTED");
        } else call.resolve(new JSObject().put("added", false));
    }
    @PluginMethod public void saveFile(PluginCall call) {
        if (saving) { call.reject("Terminez l’enregistrement en cours."); return; }
        String mime = call.getString("mime", "");
        String data = call.getString("data", "");
        if ((!mime.equals("image/webp") && !mime.equals("application/zip")) || data.length() > 12 * 1024 * 1024) { call.reject("Fichier non pris en charge."); return; }
        saving = true;
        File pending = null;
        try {
            byte[] bytes = Base64.decode(data, Base64.NO_WRAP);
            if (bytes.length < 12 || bytes.length > 8 * 1024 * 1024) throw new IllegalArgumentException("Fichier invalide.");
            if (mime.equals("image/webp")) {
                if (bytes[0] != 'R' || bytes[1] != 'I' || bytes[2] != 'F' || bytes[3] != 'F' || bytes[8] != 'W' || bytes[9] != 'E' || bytes[10] != 'B' || bytes[11] != 'P') throw new IllegalArgumentException("WebP invalide.");
            } else if (bytes[0] != 'P' || bytes[1] != 'K') throw new IllegalArgumentException("Archive invalide.");
            pending = new File(getContext().getCacheDir(), "export-" + UUID.randomUUID() + ".tmp");
            try (FileOutputStream stream = new FileOutputStream(pending)) { stream.write(bytes); }
            call.getData().remove("data");
            call.getData().put("pendingFile", pending.getName());
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime);
            intent.putExtra(Intent.EXTRA_TITLE, call.getString("name", "sticker.webp").replaceAll("[^\\p{L}\\p{N}._ -]", "-"));
            startActivityForResult(call, intent, "saveResult");
        } catch (Exception e) { if (pending != null) pending.delete(); saving = false; call.reject("Enregistrement impossible.", e); }
    }
    @ActivityCallback private void saveResult(PluginCall call, ActivityResult result) {
        saving = false; if (call == null) return;
        String pendingName = call.getString("pendingFile", "");
        if (!pendingName.matches("export-[a-f0-9-]+\\.tmp")) { call.reject("Fichier temporaire introuvable."); return; }
        File pending = new File(getContext().getCacheDir(), pendingName);
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) { pending.delete(); call.reject("Enregistrement annulé."); return; }
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(result.getData().getData())) {
            if (stream == null) throw new Exception("Fichier inaccessible");
            try (FileInputStream input = new FileInputStream(pending)) {
                byte[] buffer = new byte[8192]; int read;
                while ((read = input.read(buffer)) != -1) stream.write(buffer, 0, read);
            }
        } catch (Exception e) { call.reject("Impossible d’enregistrer le fichier.", e); return; }
        finally { pending.delete(); }
        call.resolve();
    }
}
