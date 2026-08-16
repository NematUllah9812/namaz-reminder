package com.noor.salah.widget;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.PowerManager;
import android.util.Log;

/**
 * Native adhan playback — plays res/raw/azan even when the app is closed.
 *
 * NOTE: both the attribute order and the WAKE_LOCK permission matter here.
 * setAudioAttributes() must run BEFORE setDataSource()/prepare(), and
 * setWakeMode() requires android.permission.WAKE_LOCK in the manifest —
 * otherwise these calls throw and playback dies silently.
 */
public class AzanPlayer {

    private static final String TAG = "NoorAzan";
    private static MediaPlayer mp;

    public static synchronized void start(final Context ctx) {
        stopInternal();
        try {
            final Context app = ctx.getApplicationContext();
            MediaPlayer p = new MediaPlayer();
            p.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build());
            Uri uri = Uri.parse("android.resource://" + app.getPackageName() + "/raw/azan");
            p.setDataSource(app, uri);
            try {
                p.setWakeMode(app, PowerManager.PARTIAL_WAKE_LOCK);
            } catch (Throwable t) {
                Log.w(TAG, "setWakeMode unavailable", t);
            }
            p.setLooping(false);
            p.setOnCompletionListener(m -> {
                stopInternal();
                AzanCenter.onAudioDone(app);
            });
            p.setOnErrorListener((m, what, extra) -> {
                Log.e(TAG, "MediaPlayer error what=" + what + " extra=" + extra);
                stopInternal();
                AzanCenter.onAudioDone(app);
                return true;
            });
            p.prepare();
            mp = p;
            p.start();
        } catch (Throwable t) {
            Log.e(TAG, "start", t);
            stopInternal();
        }
    }

    public static synchronized void pause() {
        try { if (mp != null && mp.isPlaying()) mp.pause(); } catch (Throwable ignored) {}
    }

    public static synchronized void resume() {
        try { if (mp != null && !mp.isPlaying()) mp.start(); } catch (Throwable ignored) {}
    }

    public static synchronized void stop() { stopInternal(); }

    /** currently producing audio */
    public static synchronized boolean isPlaying() {
        try { return mp != null && mp.isPlaying(); } catch (Throwable ignored) { return false; }
    }

    /** a session exists (playing or paused) */
    public static synchronized boolean isActive() { return mp != null; }

    private static synchronized void stopInternal() {
        try { if (mp != null) mp.stop(); } catch (Throwable ignored) {}
        try { if (mp != null) mp.release(); } catch (Throwable ignored) {}
        mp = null;
    }
}
