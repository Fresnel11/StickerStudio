package com.stickerstudio;

import java.nio.charset.StandardCharsets;

/** RIFF validation independent of Android, also exercised by JVM tests. */
public final class WebpInfo {
    public final boolean animated;
    public final int width, height;
    private WebpInfo(boolean animated, int width, int height) {
        this.animated = animated; this.width = width; this.height = height;
    }
    private static String tag(byte[] b, int at) { return new String(b, at, 4, StandardCharsets.US_ASCII); }
    private static long le(byte[] b, int at, int count) {
        long n = 0; for (int i = 0; i < count; i++) n |= ((long)b[at + i] & 255) << (8 * i); return n;
    }
    public static WebpInfo read(byte[] bytes) {
        if (bytes.length < 20 || !tag(bytes, 0).equals("RIFF") || !tag(bytes, 8).equals("WEBP") || le(bytes, 4, 4) != bytes.length - 8)
            throw new IllegalArgumentException("Fichier WebP invalide.");
        int width = 0, height = 0, frames = 0; long duration = 0; boolean animated = false, image = false;
        int offset = 12;
        while (offset + 8 <= bytes.length) {
            String type = tag(bytes, offset); long size = le(bytes, offset + 4, 4); int data = offset + 8;
            if (size > bytes.length - data) throw new IllegalArgumentException("Fichier WebP incomplet.");
            if (type.equals("VP8X") && size == 10) {
                animated = (bytes[data] & 2) != 0;
                width = (int)le(bytes, data + 4, 3) + 1; height = (int)le(bytes, data + 7, 3) + 1;
            } else if (type.equals("VP8 ") && size >= 10) {
                image = true;
                if (width == 0) { width = (int)le(bytes, data + 6, 2) & 16383; height = (int)le(bytes, data + 8, 2) & 16383; }
            } else if (type.equals("VP8L") && size >= 5 && (bytes[data] & 255) == 47) {
                image = true;
                long bits = le(bytes, data + 1, 4);
                if (width == 0) { width = (int)(bits & 16383) + 1; height = (int)((bits >> 14) & 16383) + 1; }
            } else if (type.equals("ANMF") && size >= 16) {
                frames++; long frameDuration = le(bytes, data + 12, 3);
                if (frameDuration < 8) throw new IllegalArgumentException("Chaque image animée doit durer au moins 8 ms.");
                duration += frameDuration;
            }
            offset = data + (int)size + (int)(size % 2);
        }
        if (offset != bytes.length || width != 512 || height != 512 || (animated ? frames == 0 || duration > 10000 : !image || frames > 0))
            throw new IllegalArgumentException("Un sticker doit mesurer 512 × 512 pixels et son animation durer au maximum 10 secondes.");
        if (bytes.length > (animated ? 500 : 100) * 1024) throw new IllegalArgumentException(animated ? "Un sticker animé dépasse 500 Ko." : "Un sticker fixe dépasse 100 Ko.");
        return new WebpInfo(animated, width, height);
    }
}
