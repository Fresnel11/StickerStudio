package com.stickerstudio;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

final class StickerStore {
    private static final Object LOCK = new Object();
    static String hash(byte[] data) throws Exception {
        StringBuilder out = new StringBuilder();
        for (byte b : MessageDigest.getInstance("SHA-256").digest(data)) out.append(String.format(Locale.ROOT, "%02x", b & 255));
        return out.toString();
    }
    static JSONObject save(Context context, String sourceId, String name, JSONArray stickers) throws Exception {
        if (sourceId == null || sourceId.length() > 200 || name == null || name.trim().isEmpty() || name.length() > 40)
            throw new IllegalArgumentException("Donnez un nom à votre pack (40 caractères maximum).");
        if (stickers == null || stickers.length() < 3 || stickers.length() > 6)
            throw new IllegalArgumentException("Ajoutez entre 3 et 6 stickers dans ce pack.");
        List<byte[]> files = new ArrayList<>(); Boolean animated = null;
        MessageDigest version = MessageDigest.getInstance("SHA-256"); version.update(name.trim().getBytes(StandardCharsets.UTF_8));
        for (int i = 0; i < stickers.length(); i++) {
            String data = stickers.getString(i);
            if (!data.startsWith("data:image/webp;base64,") || data.length() > 700000) throw new IllegalArgumentException("Sticker WebP invalide.");
            byte[] bytes = Base64.decode(data.substring(data.indexOf(',') + 1), Base64.NO_WRAP);
            WebpInfo info = WebpInfo.read(bytes);
            Bitmap decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (decoded == null) throw new IllegalArgumentException("Un sticker est illisible.");
            boolean correctSize = decoded.getWidth() == 512 && decoded.getHeight() == 512;
            decoded.recycle();
            if (!correctSize) throw new IllegalArgumentException("Un sticker doit mesurer 512 × 512 pixels.");
            if (animated != null && animated != info.animated) throw new IllegalArgumentException("Séparez les stickers fixes et animés dans deux packs.");
            animated = info.animated; files.add(bytes); version.update(bytes);
        }
        String id = hash(sourceId.getBytes(StandardCharsets.UTF_8));
        String revision = hash(version.digest());
        synchronized (LOCK) {
            android.content.SharedPreferences catalog = context.getSharedPreferences("whatsapp_packs", Context.MODE_PRIVATE);
            if (!catalog.contains(id) && catalog.getAll().size() >= 10) throw new IllegalArgumentException("Dix packs ont déjà été préparés sur cet appareil.");
            File root = new File(context.getFilesDir(), "whatsapp");
            File directory = new File(root, id + "-" + revision);
            if (!directory.exists() && !directory.mkdirs()) throw new IOException("Stockage indisponible.");
            JSONArray entries = new JSONArray();
            boolean complete = new File(directory, ".ready").isFile();
            for (int i = 0; i < files.size(); i++) {
                String filename = "sticker-" + i + ".webp";
                if (!complete) try (FileOutputStream stream = new FileOutputStream(new File(directory, filename))) { stream.write(files.get(i)); }
                entries.put(filename);
            }
            if (!complete) {
            Bitmap bitmap = BitmapFactory.decodeByteArray(files.get(0), 0, files.get(0).length);
            if (bitmap == null) throw new IllegalArgumentException("Le premier sticker est illisible.");
            Bitmap tray = Bitmap.createScaledBitmap(bitmap, 96, 96, true);
            try (FileOutputStream stream = new FileOutputStream(new File(directory, "tray.png"))) { tray.compress(Bitmap.CompressFormat.PNG, 100, stream); }
            tray.recycle(); if (tray != bitmap) bitmap.recycle();
            if (!new File(directory, ".ready").createNewFile()) throw new IOException("Préparation du pack impossible.");
            }
            JSONObject pack = new JSONObject().put("id", id).put("name", name.trim()).put("version", revision)
                .put("directory", directory.getName()).put("animated", animated).put("files", entries);
            // Publish only after every file is written. Existing exports remain readable.
            if (!catalog.edit().putString(id, pack.toString()).commit()) throw new IOException("Enregistrement du pack impossible.");
            return pack;
        }
    }
    static List<JSONObject> all(Context context) {
        synchronized (LOCK) {
            List<JSONObject> result = new ArrayList<>();
            for (Object value : context.getSharedPreferences("whatsapp_packs", Context.MODE_PRIVATE).getAll().values()) {
                try { result.add(new JSONObject((String)value)); } catch (Exception ignored) { }
            }
            return result;
        }
    }
    static JSONObject find(Context context, String id) throws FileNotFoundException {
        for (JSONObject pack : all(context)) if (pack.optString("id").equals(id)) return pack;
        throw new FileNotFoundException("Pack introuvable.");
    }
    static File asset(Context context, String id, String filename) throws FileNotFoundException {
        JSONObject pack = find(context, id);
        boolean allowed = filename.equals("tray.png");
        JSONArray files = pack.optJSONArray("files");
        for (int i = 0; files != null && i < files.length(); i++) allowed |= filename.equals(files.optString(i));
        if (!allowed) throw new FileNotFoundException("Fichier non autorisé.");
        File root = new File(context.getFilesDir(), "whatsapp");
        File file = new File(new File(root, pack.optString("directory")), filename);
        try { if (!file.getCanonicalPath().startsWith(root.getCanonicalPath() + File.separator)) throw new FileNotFoundException(); }
        catch (IOException e) { throw new FileNotFoundException("Chemin invalide."); }
        return file;
    }
}
