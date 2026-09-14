package com.stickerstudio;

import static org.junit.Assert.*;
import android.content.Context;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.net.Uri;
import android.util.Base64;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.*;
import org.junit.Test;
import java.io.ByteArrayOutputStream;
import java.io.FileNotFoundException;
import java.util.UUID;

public class StickerProviderTest {
    @Test public void exportsPackThroughWhatsAppContractAndRejectsTraversal() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.stickerstudio", context.getPackageName());
        Bitmap image = Bitmap.createBitmap(512, 512, Bitmap.Config.ARGB_8888);
        image.eraseColor(0xffff8800);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        image.compress(Bitmap.CompressFormat.WEBP, 80, output); image.recycle();
        String data = "data:image/webp;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
        String sourceId = "verification-" + UUID.randomUUID();
        JSONObject pack = StickerStore.save(context, sourceId, "Pack de contrôle", new JSONArray().put(data).put(data).put(data));
        String id = pack.getString("id");
        try {
            Uri base = Uri.parse("content://com.stickerstudio.stickers/");
            try (Cursor metadata = context.getContentResolver().query(base.buildUpon().appendPath("metadata").appendPath(id).build(), null, null, null, null)) {
                assertTrue(metadata.moveToFirst());
                assertEquals("Pack de contrôle", metadata.getString(metadata.getColumnIndexOrThrow("sticker_pack_name")));
                assertEquals(0, metadata.getInt(metadata.getColumnIndexOrThrow("animated_sticker_pack")));
                assertEquals("tray.png", metadata.getString(metadata.getColumnIndexOrThrow("sticker_pack_icon")));
            }
            try (Cursor stickers = context.getContentResolver().query(base.buildUpon().appendPath("stickers").appendPath(id).build(), null, null, null, null)) { assertEquals(3, stickers.getCount()); }
            Uri asset = base.buildUpon().appendPath("stickers_asset").appendPath(id).appendPath("sticker-0.webp").build();
            try (android.content.res.AssetFileDescriptor fd = context.getContentResolver().openAssetFileDescriptor(asset, "r")) { assertEquals(output.size(), fd.getLength()); }
            assertEquals("image/webp", context.getContentResolver().getType(asset));
            assertThrows(FileNotFoundException.class, () -> StickerStore.asset(context, id, "../secret"));
            assertThrows(FileNotFoundException.class, () -> context.getContentResolver().openAssetFileDescriptor(asset, "w"));
            assertThrows(IllegalArgumentException.class, () -> StickerStore.save(context, sourceId, "Test", new JSONArray().put(data).put(data)));
            JSONObject renamed = StickerStore.save(context, sourceId, "Autre nom", new JSONArray().put(data).put(data).put(data));
            assertEquals(id, renamed.getString("id"));
            assertNotEquals(pack.getString("version"), renamed.getString("version"));
        } finally {
            context.getSharedPreferences("whatsapp_packs", Context.MODE_PRIVATE).edit().remove(id).commit();
            java.io.File root = new java.io.File(context.getFilesDir(), "whatsapp");
            for (java.io.File dir : root.listFiles()) if (dir.getName().startsWith(id + "-")) { for (java.io.File file : dir.listFiles()) file.delete(); dir.delete(); }
        }
    }
}
