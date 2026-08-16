package com.noor.salah.widget;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.noor.salah.MainActivity;
import com.noor.salah.R;

import org.json.JSONObject;

import java.util.Calendar;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Adhan engine. Runs on the same always-armed prayer-boundary alarm chain
 * as the widget, so it needs no alarms of its own: at each boundary it checks
 * the shared CapacitorStorage prefs, and when a prayer is due (and reminder
 * sound = azan) it plays the adhan and posts a notification carrying
 * Pause / Mute / Mark-prayed actions.
 */
public class AzanCenter {

    public static final String A_PAUSE  = "com.noor.salah.AZAN_PAUSE";
    public static final String A_RESUME = "com.noor.salah.AZAN_RESUME";
    public static final String A_STOP   = "com.noor.salah.AZAN_STOP";
    public static final String A_DONE   = "com.noor.salah.AZAN_DONE";
    public static final String EXTRA_PRAYER = "prayer";

    private static final String TAG = "NoorAzan";
    private static final String CHANNEL = "azan_live";
    private static final int NOTIF_ID = 556;

    private static final String[] ORDER = { "fajr", "dhuhr", "asr", "maghrib", "isha" };
    private static final Map<String, String> LABELS = new HashMap<>();
    private static final Map<String, String> AR = new HashMap<>();
    static {
        LABELS.put("fajr", "Fajr");       AR.put("fajr", "الفجر");
        LABELS.put("dhuhr", "Dhuhr");     AR.put("dhuhr", "الظهر");
        LABELS.put("asr", "Asr");         AR.put("asr", "العصر");
        LABELS.put("maghrib", "Maghrib"); AR.put("maghrib", "المغرب");
        LABELS.put("isha", "Isha");       AR.put("isha", "العشاء");
    }

    private static final int PLAYING = 1, PAUSED = 2, FINISHED = 3;
    private static String currentKey = null;

    /** fires at every prayer boundary (piggybacked on the widget alarm chain) */
    public static void onTick(Context ctx) {
        try {
            SharedPreferences prefs = ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String s = prefs.getString("widget_settings", null);
            JSONObject o = s != null ? new JSONObject(s) : new JSONObject();
            if (!"azan".equals(o.optString("sound", "notify"))) return;

            PrayerMath.Conf conf = new PrayerMath.Conf();
            conf.lat = o.optDouble("lat", conf.lat);
            conf.lng = o.optDouble("lng", conf.lng);
            conf.method = o.optString("method", conf.method);
            conf.asr = o.optInt("asr", conf.asr);

            Set<String> muted = new HashSet<>();
            JSONObject mj = o.optJSONObject("muted");
            if (mj != null) for (String k : ORDER) if (mj.optBoolean(k, false)) muted.add(k);

            String dayKey = dayKey();
            Set<String> done = new HashSet<>();
            try {
                JSONObject dj = new JSONObject(prefs.getString("widget_done_" + dayKey, "{}"));
                for (String k : ORDER) if (dj.has(k)) done.add(k);
            } catch (Throwable ignored) {}

            long nowMs = System.currentTimeMillis();
            LinkedHashMap<String, Calendar> times = PrayerMath.compute(Calendar.getInstance(), conf);
            String hit = null;
            for (String k : ORDER) {
                Calendar t = times.get(k);
                if (t == null) continue;
                long dt = nowMs - t.getTimeInMillis();
                if (dt >= 0 && dt <= 120000) hit = k;   /* latest crossed boundary */
            }
            if (hit == null || done.contains(hit) || muted.contains(hit)) return;

            SharedPreferences own = ctx.getSharedPreferences("noor_azan", Context.MODE_PRIVATE);
            if ((hit + "@" + dayKey).equals(own.getString("last", ""))) return;
            own.edit().putString("last", hit + "@" + dayKey).apply();

            currentKey = hit;
            AzanPlayer.start(ctx);
            showNotif(ctx, hit, PLAYING);
        } catch (Throwable t) {
            Log.e(TAG, "onTick", t);
        }
    }

    /** adhan finished naturally */
    public static void onAudioDone(Context ctx) {
        try {
            if (currentKey != null) showNotif(ctx, currentKey, FINISHED);
        } catch (Throwable ignored) {}
    }

    /** notification action buttons (also used by the in-app AzanBridge plugin) */
    public static void handleAction(Context ctx, String action, String key) {
        try {
            switch (action) {
                case A_PAUSE:
                    AzanPlayer.pause();
                    showNotif(ctx, key != null ? key : currentKey, PAUSED);
                    break;
                case A_RESUME:
                    AzanPlayer.resume();
                    showNotif(ctx, key != null ? key : currentKey, PLAYING);
                    break;
                case A_STOP:
                    AzanPlayer.stop();
                    cancelNotif(ctx);
                    currentKey = null;
                    break;
                case A_DONE:
                    AzanPlayer.stop();
                    cancelNotif(ctx);
                    markDone(ctx, key != null ? key : currentKey);
                    currentKey = null;
                    NoorWidgetProvider.refreshAll(ctx);
                    break;
            }
        } catch (Throwable t) {
            Log.e(TAG, "handleAction", t);
        }
    }

    public static void markDone(Context ctx, String key) {
        if (key == null) return;
        try {
            SharedPreferences prefs = ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String dk = "widget_done_" + dayKey();
            JSONObject o = new JSONObject(prefs.getString(dk, "{}"));
            o.put(key, 1);
            prefs.edit().putString(dk, o.toString()).apply();
        } catch (Throwable t) {
            Log.e(TAG, "markDone", t);
        }
    }

    private static String dayKey() {
        Calendar n = Calendar.getInstance();
        return String.format(Locale.US, "%d-%02d-%02d",
                n.get(Calendar.YEAR), n.get(Calendar.MONTH) + 1, n.get(Calendar.DAY_OF_MONTH));
    }

    /* ── notification ─────────────────────────────────────── */
    private static void showNotif(Context ctx, String key, int state) {
        if (key == null) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        NotificationChannel ch = new NotificationChannel(
                CHANNEL, "Adhan", NotificationManager.IMPORTANCE_HIGH);
        ch.setSound(null, null);              /* sound comes from our MediaPlayer */
        ch.enableVibration(false);
        nm.createNotificationChannel(ch);

        PendingIntent open = PendingIntent.getActivity(ctx, 90,
                new Intent(ctx, MainActivity.class),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String text;
        if (state == PLAYING)      text = "Adhan playing — Masjid al-Haram";
        else if (state == PAUSED)  text = "Adhan paused";
        else                       text = "Adhan finished — tap to mark as prayed";

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_az_stat)
                .setContentTitle(AR.get(key) + "  ·  " + LABELS.get(key))
                .setContentText(text)
                .setContentIntent(open)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setOngoing(false)          /* never a stuck notification: always dismissible */
                .setAutoCancel(true)
                .setDeleteIntent(actionPI(ctx, A_STOP, key, 94))  /* swipe away = mute */
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        b.addAction(R.drawable.ic_az_stat,
                state == PAUSED ? "Resume" : "Pause",
                actionPI(ctx, state == PAUSED ? A_RESUME : A_PAUSE, key, 91));
        if (state != FINISHED) {
            b.addAction(R.drawable.ic_az_stat, "Mute",  actionPI(ctx, A_STOP, key, 92));
        }
        b.addAction(R.drawable.ic_az_stat, "Mark prayed", actionPI(ctx, A_DONE, key, 93));

        nm.notify(NOTIF_ID, b.build());
    }

    private static PendingIntent actionPI(Context ctx, String action, String key, int req) {
        Intent i = new Intent(action)
                .setComponent(new ComponentName(ctx, AzanReceiver.class))
                .putExtra(EXTRA_PRAYER, key);
        return PendingIntent.getBroadcast(ctx, req, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void cancelNotif(Context ctx) {
        try {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(NOTIF_ID);
        } catch (Throwable ignored) {}
    }
}
