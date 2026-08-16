package com.noor.salah.widget;

import java.util.Calendar;
import java.util.LinkedHashMap;
import java.util.TimeZone;

/** On-device prayer-time engine — same astronomy as the web side. */
public class PrayerMath {

    private static final double D = Math.PI / 180.0;
    private static final double R = 180.0 / Math.PI;

    public static class Conf {
        public double lat = 34.1558;
        public double lng = 73.2194;
        public String method = "isna";
        public int asr = 2;
    }

    private static double fix360(double a) { double x = a % 360.0; return x < 0 ? x + 360.0 : x; }
    private static double fix24(double h)  { double x = h % 24.0;  return x < 0 ? x + 24.0 : x; }

    private static double julian(int y0, int m0, int d) {
        int y = y0, m = m0;
        if (m <= 2) { y -= 1; m += 12; }
        int A = y / 100;
        int B = 2 - A + A / 4;
        return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
    }

    private static class SunPos {
        final double decl, eqt;
        SunPos(double decl, double eqt) { this.decl = decl; this.eqt = eqt; }
    }

    private static SunPos sunPosition(double jd) {
        double T = jd - 2451545.0;
        double g = fix360(357.529 + 0.98560028 * T);
        double q = fix360(280.459 + 0.98564736 * T);
        double L = fix360(q + 1.915 * Math.sin(g * D) + 0.020 * Math.sin(2 * g * D));
        double e = 23.439 - 0.00000036 * T;
        double RA = Math.atan2(Math.cos(e * D) * Math.sin(L * D), Math.cos(L * D)) * R / 15;
        return new SunPos(Math.asin(Math.sin(e * D) * Math.sin(L * D)) * R, q / 15 - fix24(RA));
    }

    /** name → Calendar for fajr, sunrise, dhuhr, asr, maghrib, isha */
    public static LinkedHashMap<String, Calendar> compute(Calendar day, final Conf c) {
        double fajrAng = 15.0, ishaAng = 15.0, ishaMinAng = Double.NaN;
        switch (c.method) {
            case "mwl":     fajrAng = 18.0; ishaAng = 17.0; break;
            case "egypt":   fajrAng = 19.5; ishaAng = 17.5; break;
            case "makkah":  fajrAng = 18.5; ishaMinAng = 90.0; break;
            case "karachi": fajrAng = 18.0; ishaAng = 18.0; break;
        }
        final int asrF = (c.asr == 1) ? 1 : 2;
        final double ishaMin = ishaMinAng;

        int y = day.get(Calendar.YEAR);
        int m = day.get(Calendar.MONTH) + 1;
        int d = day.get(Calendar.DAY_OF_MONTH);
        final double tz = TimeZone.getDefault().getOffset(day.getTimeInMillis()) / 3600000.0;
        final double jd0 = julian(y, m, d) - c.lng / 360.0;

        class Solver {
            double mid(double t) { return fix24(12 - sunPosition(jd0 + t).eqt); }

            double angleTime(double angle, double t, boolean ccw) {
                SunPos sp = sunPosition(jd0 + t);
                double cosT = (-Math.sin(angle * D) - Math.sin(sp.decl * D) * Math.sin(c.lat * D))
                        / (Math.cos(sp.decl * D) * Math.cos(c.lat * D));
                if (cosT > 1 || cosT < -1) return Double.NaN;
                double T = Math.acos(cosT) * R / 15;
                return mid(t) + (ccw ? -T : T);
            }

            double asrTime(int f, double t) {
                double decl = sunPosition(jd0 + t).decl;
                double ang = -R * Math.atan(1.0 / (f + Math.tan(Math.abs(c.lat - decl) * D)));
                return angleTime(ang, t, false);
            }
        }
        Solver s = new Solver();

        double fajr    = s.angleTime(fajrAng, 5.0 / 24, true);
        double sunrise = s.angleTime(0.833, 6.0 / 24, true);
        double dhuhr   = s.mid(0.5);
        double asr     = s.asrTime(asrF, 13.0 / 24);
        double maghrib = s.angleTime(0.833, 18.0 / 24, false);
        double isha    = !Double.isNaN(ishaMin) ? maghrib + ishaMin / 60
                                                : s.angleTime(ishaAng, 18.0 / 24, false);

        double night = fix24(sunrise + 24 - maghrib);
        if (Double.isNaN(fajr)) fajr = fix24(sunrise - night / 7);
        if (Double.isNaN(isha)) isha = !Double.isNaN(ishaMin) ? maghrib + ishaMin / 60
                                                              : fix24(maghrib + night / 7);

        final double adj = tz - c.lng / 15.0;

        LinkedHashMap<String, Calendar> out = new LinkedHashMap<>();
        out.put("fajr",    toCal(day, fajr, adj));
        out.put("sunrise", toCal(day, sunrise, adj));
        out.put("dhuhr",   toCal(day, dhuhr + 2.0 / 60, adj));
        out.put("asr",     toCal(day, asr, adj));
        out.put("maghrib", toCal(day, maghrib, adj));
        out.put("isha",    toCal(day, isha, adj));
        return out;
    }

    private static Calendar toCal(Calendar day, double hours, double adj) {
        Calendar cal = (Calendar) day.clone();
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        cal.add(Calendar.MINUTE, (int) Math.round(fix24(hours + adj) * 60));
        return cal;
    }
}
