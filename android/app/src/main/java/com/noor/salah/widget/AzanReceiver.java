package com.noor.salah.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Handles the adhan notification's Pause / Resume / Mute / Mark-prayed buttons. */
public class AzanReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String key = intent.getStringExtra(AzanCenter.EXTRA_PRAYER);
        AzanCenter.handleAction(context, intent.getAction(), key);
    }
}
