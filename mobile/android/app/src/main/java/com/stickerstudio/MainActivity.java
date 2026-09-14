package com.stickerstudio;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle state) {
        registerPlugin(StudioPlugin.class);
        super.onCreate(state);
    }
}
