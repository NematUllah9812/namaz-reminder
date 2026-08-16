package com.noor.salah;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.noor.salah.widget.NoorWidgetProvider;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AzanBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        /* keep the home-screen widget in sync whenever the app is used */
        try {
            NoorWidgetProvider.refreshAll(getApplicationContext());
        } catch (Exception ignored) {
        }
    }
}
