package com.noor.salah.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.location.Location;
import android.location.LocationManager;
import android.os.SystemClock;
import android.util.Log;
import android.widget.RemoteViews;

import com.noor.salah.MainActivity;
import com.noor.salah.R;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Home-screen widget: Hijri + Solar dates, all prayer times,
 * and a live countdown to the next un-prayed prayer.
 *
 * Location flow: the app writes lat/lng into "CapacitorStorage"
 * (widget_settings). If the user has never done that, the widget
 * falls back to the device's last-known location (when the location
 * permission has been granted), and finally to Abbottabad defaults.
 */
public class NoorWidgetProvider extends AppWidgetProvider {

    private static final String TAG = "NoorWidget";
    private static final String ACTION_TICK = "com.noor.salah.WIDGET_TICK";
    private static final String[] ORDER = { "fajr", "dhuhr", "asr", "maghrib", "isha" };

    private static final Map<String, String> LABELS = new HashMap<>();
    private static final Map<String, String> AR = new HashMap<>();
    private static final Map<String, Integer> CELL_IDS = new HashMap<>();
    private static final int GOLD = Color.parseColor("#E8CF8A");
    private static final int MUTED = Color.parseColor("#93AD9F");

    static {
        LABELS.put("fajr", "Fajr");       AR.put("fajr", "الفجر");   CELL_IDS.put("fajr", R.id.w_fajr);
        LABELS.put("dhuhr", "Dhuhr");     AR.put("dhuhr", "الظهر");  CELL_IDS.put("dhuhr", R.id.w_dhuhr);
        LABELS.put("asr", "Asr");         AR.put("asr", "العصر");    CELL_IDS.put("asr", R.id.w_asr);
        LABELS.put("maghrib", "Maghrib"); AR.put("maghrib", "المغرب"); CELL_IDS.put("maghrib", R.id.w_maghrib);
        LABELS.put("isha", "Isha");       AR.put("isha", "العشاء");  CELL_IDS.put("isha", R.id.w_isha);
    }

    private static class State {
        PrayerMath.Conf conf = new PrayerMath.Conf();
        Set<String> done = new HashSet<>();
        String loc = "";
        boolean hasSaved = false;
    }

    public static void refreshAll(Context context) {
        try {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(context, NoorWidgetProvider.class));
            for (int id : ids) updateOne(context, mgr, id);
        } catch (Throwable t) {
            Log.e(TAG, "refreshAll", t);
        }
        AzanCenter.onTick(context);   /* adhan engine shares this alarm chain */
        scheduleNext(context);
    }

    private static State loadState(Context context) {
        State st = new State();
        try {
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String s = prefs.getString("widget_settings", null);
            if (s != null) {
                st.hasSaved = true;
                JSONObject o = new JSONObject(s);
                st.conf.lat = o.optDouble("lat", st.conf.lat);
                st.conf.lng = o.optDouble("lng", st.conf.lng);
                st.conf.method = o.optString("method", st.conf.method);
                st.conf.asr = o.optInt("asr", st.conf.asr);
                st.loc = o.optString("loc", "");
            }
            Calendar n = Calendar.getInstance();
            String key = String.format(Locale.US, "widget_done_%d-%02d-%02d",
                    n.get(Calendar.YEAR), n.get(Calendar.MONTH) + 1, n.get(Calendar.DAY_OF_MONTH));
            JSONObject o = new JSONObject(prefs.getString(key, "{}"));
            for (String k : ORDER) if (o.has(k)) st.done.add(k);
        } catch (Throwable t) {
            Log.e(TAG, "loadState", t);
        }
        return st;
    }

    /** use the device's last-known location when the app hasn't saved one yet */
    private static void applyDeviceLocation(Context context, PrayerMath.Conf conf) {
        try {
            if (context.checkSelfPermission(android.Manifest.permission.ACCESS_COARSE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) return;
            LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            if (lm == null) return;
            Location best = null;
            String[] providers = { LocationManager.GPS_PROVIDER,
                    LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER };
            for (String p : providers) {
                try {
                    Location l = lm.getLastKnownLocation(p);
                    if (l != null && (best == null || l.getTime() > best.getTime())) best = l;
                } catch (Throwable ignored) {
                }
            }
            if (best != null) {
                conf.lat = best.getLatitude();
                conf.lng = best.getLongitude();
                Log.i(TAG, "widget using device location " + conf.lat + "," + conf.lng);
            }
        } catch (Throwable t) {
            Log.e(TAG, "applyDeviceLocation", t);
        }
    }

    private static void updateOne(Context context, AppWidgetManager mgr, int widgetId) {
        RemoteViews rv = new RemoteViews(context.getPackageName(), R.layout.widget_noor);

        /* taps: whole widget opens app, refresh icon re-renders */
        try {
            PendingIntent open = PendingIntent.getActivity(context, 0,
                    new Intent(context, MainActivity.class),
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            rv.setOnClickPendingIntent(R.id.w_root, open);
            PendingIntent refr = PendingIntent.getBroadcast(context, 78,
                    new Intent(ACTION_TICK).setComponent(new ComponentName(context, NoorWidgetProvider.class)),
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            rv.setOnClickPendingIntent(R.id.w_refresh, refr);
        } catch (Throwable t) {
            Log.e(TAG, "intents", t);
        }

        /* ── dates ── */
        Calendar nowCal = Calendar.getInstance();
        try {
            int hOff = -1;   /* Pakistan default: one day behind Umm al-Qura (local moon sighting) */
            try {
                SharedPreferences pr = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                String js = pr.getString("widget_settings", null);
                if (js != null) hOff = new JSONObject(js).optInt("hijri", -1);
            } catch (Throwable ignored) {}
            Calendar hc = (Calendar) nowCal.clone();
            hc.add(Calendar.DAY_OF_YEAR, hOff);   /* day-shifted → displayed Hijri date follows the announcement */
            rv.setTextViewText(R.id.w_hijri, Hijri.format(hc));
        } catch (Throwable t) { Log.e(TAG, "hijri", t); }

        State st = loadState(context);
        if (!st.hasSaved) applyDeviceLocation(context, st.conf);

        try {
            String greg = new SimpleDateFormat("EEE, d MMM yyyy", Locale.ENGLISH).format(nowCal.getTime());
            if (st.loc.length() > 0) greg += "  ·  " + st.loc;
            rv.setTextViewText(R.id.w_greg, greg);
        } catch (Throwable t) { Log.e(TAG, "greg", t); }

        /* ── prayer times ── */
        long nowMs = System.currentTimeMillis();
        LinkedHashMap<String, Calendar> times;
        try {
            times = PrayerMath.compute(nowCal, st.conf);
        } catch (Throwable t) {
            Log.e(TAG, "compute", t);
            push(mgr, widgetId, rv);
            return;
        }

        String nextKey = null;
        Calendar nextAt = null;
        for (String k : ORDER) {
            Calendar t = times.get(k);
            if (t != null && t.getTimeInMillis() > nowMs && !st.done.contains(k)) {
                nextKey = k;
                nextAt = t;
                break;
            }
        }
        if (nextKey == null) {
            try {
                Calendar tomorrow = Calendar.getInstance();
                tomorrow.add(Calendar.DAY_OF_YEAR, 1);
                nextAt = PrayerMath.compute(tomorrow, st.conf).get("fajr");
                nextKey = "fajr";
            } catch (Throwable t) { Log.e(TAG, "tomorrow", t); }
        }

        if (nextKey != null && nextAt != null) {
            try {
                rv.setTextViewText(R.id.w_next_name, LABELS.get(nextKey) + "  ·  " + AR.get(nextKey));
                rv.setTextViewText(R.id.w_next_time,
                        new SimpleDateFormat("h:mm a", Locale.ENGLISH).format(nextAt.getTime()));
            } catch (Throwable t) { Log.e(TAG, "next", t); }

            try {   /* live countdown, hardware-ticked */
                long base = SystemClock.elapsedRealtime() + (nextAt.getTimeInMillis() - nowMs);
                rv.setChronometer(R.id.w_chrono, base, "%H:%M:%S", true);
                rv.setChronometerCountDown(R.id.w_chrono, true);
            } catch (Throwable t) { Log.e(TAG, "chrono", t); }
        }

        try {
            SimpleDateFormat tf = new SimpleDateFormat("h:mm", Locale.ENGLISH);
            for (String k : ORDER) {
                Integer id = CELL_IDS.get(k);
                Calendar t = times.get(k);
                if (id == null || t == null) continue;
                rv.setTextViewText(id, tf.format(t.getTime()));
                rv.setTextColor(id, k.equals(nextKey) ? GOLD : MUTED);
            }
        } catch (Throwable t) { Log.e(TAG, "cells", t); }

        push(mgr, widgetId, rv);
    }

    private static void push(AppWidgetManager mgr, int widgetId, RemoteViews rv) {
        try {
            mgr.updateAppWidget(widgetId, rv);
        } catch (Throwable t) {
            Log.e(TAG, "push", t);
        }
    }

    /** next wake-up: soonest of (next prayer boundary, just-after-midnight) */
    private static void scheduleNext(Context context) {
        try {
            PrayerMath.Conf conf = loadState(context).conf;
            long now = System.currentTimeMillis();
            LinkedHashMap<String, Calendar> times = PrayerMath.compute(Calendar.getInstance(), conf);
            long at = Long.MAX_VALUE;
            for (String k : ORDER) {
                Calendar t = times.get(k);
                if (t != null) {
                    long ms = t.getTimeInMillis();
                    if (ms > now + 30000 && ms < at) at = ms;
                }
            }
            Calendar mid = Calendar.getInstance();
            mid.add(Calendar.DAY_OF_YEAR, 1);
            mid.set(Calendar.HOUR_OF_DAY, 0);
            mid.set(Calendar.MINUTE, 0);
            mid.set(Calendar.SECOND, 10);
            mid.set(Calendar.MILLISECOND, 0);
            if (mid.getTimeInMillis() < at) at = mid.getTimeInMillis();
            if (at == Long.MAX_VALUE) at = mid.getTimeInMillis();

            PendingIntent pi = PendingIntent.getBroadcast(context, 77,
                    new Intent(ACTION_TICK).setComponent(new ComponentName(context, NoorWidgetProvider.class)),
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } catch (SecurityException se) {
            try {
                PendingIntent pi = PendingIntent.getBroadcast(context, 77,
                        new Intent(ACTION_TICK).setComponent(new ComponentName(context, NoorWidgetProvider.class)),
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                Calendar mid = Calendar.getInstance();
                mid.add(Calendar.HOUR_OF_DAY, 1);
                am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, mid.getTimeInMillis(), pi);
            } catch (Throwable ignored) {
            }
        } catch (Throwable t) {
            Log.e(TAG, "scheduleNext", t);
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int id : appWidgetIds) updateOne(context, appWidgetManager, id);
        scheduleNext(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_TICK.equals(action) || Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            refreshAll(context);
        }
    }
}
