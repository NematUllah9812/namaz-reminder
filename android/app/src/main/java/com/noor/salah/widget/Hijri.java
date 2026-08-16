package com.noor.salah.widget;

import java.util.Calendar;

/**
 * Hijri (Umm al-Qura) date for the widget.
 * Embedded, ICU-verified Umm al-Qura month-length table for 1437–1480 AH
 * (Oct 2015 – Jul 2058); outside that range, falls back to the
 * arithmetical civil Hijri calendar (±1 day).
 */
public class Hijri {

    private static final String[] MONTHS = {
        "Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani",
        "Jumada al-Ula", "Jumada al-Akhirah", "Rajab", "Sha’ban",
        "Ramadan", "Shawwal", "Dhul-Qa’dah", "Dhul-Hijjah"
    };

    /* Each int = one Hijri year; bit (m-1) set ⇔ month m has 30 days. */
    private static final long UQ_START = 2457309L;   // 1 Muharram 1437 AH
    private static final long UQ_END   = 2472547L;   // 1 Muharram 1481 AH (exclusive)
    private static final int  UQ_FIRST = 1437;
    private static final int[] UQ_MASKS = {
        2381, 1181, 2397, 698, 1461, 1450, 3413, 2714, 2350, 622, 1373,
        2778, 1748, 1701, 2855, 2637, 1197, 1389, 2906, 1876, 3913, 3730,
        3366, 2646, 854, 1717, 2986, 2962, 2853, 1675, 2715, 1370, 2778,
        1460, 3497, 2898, 2714, 1334, 630, 1397, 2802, 1748, 1705, 1365
    };

    /** returns {year, month(1-12), day} */
    public static int[] parts(Calendar cal) {
        long jd = gjd(
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH) + 1,
            cal.get(Calendar.DAY_OF_MONTH));
        int[] t = fromTable(jd);
        return t != null ? t : tabular(jd);
    }

    public static String format(Calendar cal) {
        int[] p = parts(cal);
        int mi = Math.max(0, Math.min(11, p[1] - 1));
        return p[2] + " " + MONTHS[mi] + " " + p[0] + " AH";
    }

    private static long gjd(int y, int m, int d) {
        if (m <= 2) { y -= 1; m += 12; }
        int a = y / 100;
        int b = 2 - a + a / 4;
        return (long) (Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5);
    }

    private static int[] fromTable(long jd) {
        if (jd < UQ_START || jd >= UQ_END) return null;
        long cur = UQ_START;
        int y = UQ_FIRST;
        for (int mask : UQ_MASKS) {
            int ylen = 29 * 12 + Integer.bitCount(mask);
            if (jd < cur + ylen) {
                long mstart = cur;
                for (int m = 1; m <= 12; m++) {
                    int mlen = 29 + ((mask >> (m - 1)) & 1);
                    if (jd < mstart + mlen) {
                        return new int[]{ y, m, (int) (jd - mstart) + 1 };
                    }
                    mstart += mlen;
                }
            }
            cur += ylen;
            y++;
        }
        return null;
    }

    /* arithmetical civil Hijri (Kuwaiti algorithm, +1 day calibration) */
    private static int[] tabular(long jd) {
        long l = jd - 1948439 + 10632;
        long n = (l - 1) / 10631;
        l = l - 10631 * n + 354;
        long j = ((10985 - l) / 5316) * ((50 * l) / 17719) + (l / 5670) * ((43 * l) / 15238);
        l = l - ((30 - j) / 15) * ((17719 * j) / 50) - (j / 16) * ((15238 * j) / 43) + 29;
        long hm = (24 * l) / 709;
        long hd = l - (709 * hm) / 24;
        long hy = 30 * n + j - 30;
        return new int[]{ (int) hy, (int) hm, (int) hd };
    }
}
