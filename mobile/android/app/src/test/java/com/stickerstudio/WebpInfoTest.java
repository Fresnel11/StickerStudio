package com.stickerstudio;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

public class WebpInfoTest {
    private byte[] file(int width, int duration) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write("RIFF".getBytes(StandardCharsets.US_ASCII)); out.write(new byte[4]); out.write("WEBPVP8X".getBytes(StandardCharsets.US_ASCII));
        out.write(new byte[]{10,0,0,0,2,0,0,0,(byte)(width-1),(byte)((width-1)>>8),0,(byte)255,1,0});
        out.write("ANMF".getBytes(StandardCharsets.US_ASCII)); out.write(new byte[]{16,0,0,0});
        byte[] frame = new byte[16]; frame[12] = (byte)duration; frame[13] = (byte)(duration>>8); out.write(frame);
        byte[] bytes = out.toByteArray(); bytes[4] = (byte)(bytes.length - 8); return bytes;
    }
    @Test public void validatesDimensionsAndTiming() throws Exception {
        assertTrue(WebpInfo.read(file(512, 100)).animated);
        assertThrows(IllegalArgumentException.class, () -> WebpInfo.read(file(511,100)));
        assertThrows(IllegalArgumentException.class, () -> WebpInfo.read(file(512,7)));
        assertThrows(IllegalArgumentException.class, () -> WebpInfo.read(file(512,10001)));
        byte[] corrupt = file(512,100); corrupt[4]++;
        assertThrows(IllegalArgumentException.class, () -> WebpInfo.read(corrupt));
    }
}
