package com.stickerstudio;

import android.content.*;
import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import org.json.*;
import java.io.*;
import java.util.*;

/** Implements the metadata/stickers/stickers_asset contract documented by WhatsApp. */
public class StickerContentProvider extends ContentProvider {
    static final String[] METADATA = {"sticker_pack_identifier", "sticker_pack_name", "sticker_pack_publisher", "sticker_pack_icon",
        "android_play_store_link", "ios_app_download_link", "sticker_pack_publisher_email", "sticker_pack_publisher_website",
        "sticker_pack_privacy_policy_website", "sticker_pack_license_agreement_website", "image_data_version",
        "whatsapp_will_not_cache_stickers", "animated_sticker_pack"};
    @Override public boolean onCreate() { return true; }
    @Override public Cursor query(Uri uri, String[] projection, String selection, String[] args, String order) {
        List<String> path = uri.getPathSegments();
        MatrixCursor cursor;
        if ((path.size() == 1 || path.size() == 2) && path.get(0).equals("metadata")) {
            cursor = new MatrixCursor(METADATA);
            for (JSONObject pack : StickerStore.all(getContext())) {
                if (path.size() == 2 && !pack.optString("id").equals(path.get(1))) continue;
                cursor.addRow(new Object[]{pack.optString("id"), pack.optString("name"), "Sticker Studio", "tray.png",
                    "", "", "", "https://sticker-studio-ruby.vercel.app", "", "", pack.optString("version"), 0, pack.optBoolean("animated") ? 1 : 0});
            }
        } else if (path.size() == 2 && path.get(0).equals("stickers")) {
            cursor = new MatrixCursor(new String[]{"sticker_file_name", "sticker_emoji", "sticker_accessibility_text"});
            try {
                JSONObject pack = StickerStore.find(getContext(), path.get(1));
                JSONArray files = pack.optJSONArray("files");
                for (int i = 0; i < files.length(); i++) cursor.addRow(new Object[]{files.optString(i), "", pack.optString("name") + " " + (i + 1)});
            } catch (FileNotFoundException ignored) { }
        } else throw new IllegalArgumentException("URI inconnue.");
        cursor.setNotificationUri(getContext().getContentResolver(), uri);
        return cursor;
    }
    @Override public AssetFileDescriptor openAssetFile(Uri uri, String mode) throws FileNotFoundException {
        if (!mode.equals("r")) throw new FileNotFoundException("Lecture seule.");
        List<String> path = uri.getPathSegments();
        if (path.size() != 3 || !path.get(0).equals("stickers_asset")) throw new FileNotFoundException();
        File file = StickerStore.asset(getContext(), path.get(1), path.get(2));
        return new AssetFileDescriptor(ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY), 0, file.length());
    }
    @Override public String getType(Uri uri) {
        List<String> p = uri.getPathSegments();
        if (p.size() == 3 && p.get(0).equals("stickers_asset")) return p.get(2).equals("tray.png") ? "image/png" : "image/webp";
        if ((p.size() == 1 || p.size() == 2) && p.get(0).equals("metadata")) return "vnd.android.cursor." + (p.size() == 1 ? "dir" : "item") + "/vnd." + uri.getAuthority() + ".metadata";
        if (p.size() == 2 && p.get(0).equals("stickers")) return "vnd.android.cursor.dir/vnd." + uri.getAuthority() + ".stickers";
        throw new IllegalArgumentException("URI inconnue.");
    }
    @Override public Uri insert(Uri u, ContentValues v) { throw new UnsupportedOperationException(); }
    @Override public int update(Uri u, ContentValues v, String s, String[] a) { throw new UnsupportedOperationException(); }
    @Override public int delete(Uri u, String s, String[] a) { throw new UnsupportedOperationException(); }
}
