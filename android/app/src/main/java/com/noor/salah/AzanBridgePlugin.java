package com.noor.salah;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.noor.salah.widget.AzanCenter;
import com.noor.salah.widget.AzanPlayer;

/** Lets the in-app azan panel control the native adhan player. */
@CapacitorPlugin(name = "AzanBridge")
public class AzanBridgePlugin extends Plugin {

    @PluginMethod
    public void pause(PluginCall call) {
        AzanCenter.handleAction(getContext(), AzanCenter.A_PAUSE, null);
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        AzanCenter.handleAction(getContext(), AzanCenter.A_RESUME, null);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        AzanCenter.handleAction(getContext(), AzanCenter.A_STOP, null);
        call.resolve();
    }

    @PluginMethod
    public void state(PluginCall call) {
        JSObject r = new JSObject();
        r.put("playing", AzanPlayer.isPlaying());
        r.put("active", AzanPlayer.isActive());
        call.resolve(r);
    }
}
