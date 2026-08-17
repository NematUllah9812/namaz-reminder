/* ═══════════════════════════════════════════════════════════════
   Noor Salah — on-device prayer time engine
   Classical astronomical method (solar declination / hour angle),
   matching well-known timetables to within a minute or two.
   ═══════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var D = Math.PI / 180, R = 180 / Math.PI;

  function fix360(a) { a %= 360; return a < 0 ? a + 360 : a; }
  function fix24(h)  { h %= 24;  return h < 0 ? h + 24 : h; }

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    var T = jd - 2451545.0;
    var g = fix360(357.529 + 0.98560028 * T);
    var q = fix360(280.459 + 0.98564736 * T);
    var L = fix360(q + 1.915 * Math.sin(g * D) + 0.020 * Math.sin(2 * g * D));
    var e = 23.439 - 0.00000036 * T;
    var RA = Math.atan2(Math.cos(e * D) * Math.sin(L * D), Math.cos(L * D)) * R / 15;
    return {
      decl: Math.asin(Math.sin(e * D) * Math.sin(L * D)) * R,
      eqt:  q / 15 - fix24(RA)
    };
  }

  var METHODS = {
    mwl:     { label: 'Muslim World League',              fajr: 18,   isha: 17 },
    isna:    { label: 'ISNA',                             fajr: 15,   isha: 15 },
    egypt:   { label: 'Egyptian General Authority',       fajr: 19.5, isha: 17.5 },
    makkah:  { label: 'Umm al-Qura, Makkah',              fajr: 18.5, ishaMin: 90 },
    karachi: { label: 'Univ. of Islamic Sciences, Karachi', fajr: 18, isha: 18 }
  };

  /**
   * compute(date, lat, lng, {method, asr})
   *  method — key of METHODS   (default 'isna')
   *  asr    — 1 standard, 2 Hanafi (default 2)
   * returns { dates:{fajr..isha: Date}, hours:{...} }
   */
  function compute(date, lat, lng, opts) {
    opts = opts || {};
    var method = METHODS[opts.method] || METHODS.isna;
    var asrFactor = (opts.asr === 1) ? 1 : 2;

    var y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
    var tz = -date.getTimezoneOffset() / 60;
    var jd0 = julian(y, m, d) - lng / 360;

    function midDay(t) { return fix24(12 - sunPosition(jd0 + t).eqt); }

    function angleTime(angle, t, ccw) {
      var sp = sunPosition(jd0 + t);
      var cosT = (-Math.sin(angle * D) - Math.sin(sp.decl * D) * Math.sin(lat * D)) /
                 (Math.cos(sp.decl * D) * Math.cos(lat * D));
      if (cosT > 1 || cosT < -1) return NaN;
      var T = Math.acos(cosT) * R / 15;
      return midDay(t) + (ccw ? -T : T);
    }

    function asrTime(f, t) {
      var decl = sunPosition(jd0 + t).decl;
      var ang = -R * Math.atan(1 / (f + Math.tan(Math.abs(lat - decl) * D)));
      return angleTime(ang, t);
    }

    var t = {
      fajr:    angleTime(method.fajr, 5 / 24, true),
      sunrise: angleTime(0.833, 6 / 24, true),
      dhuhr:   midDay(12 / 24),
      asr:     asrTime(asrFactor, 13 / 24),
      maghrib: angleTime(0.833, 18 / 24)
    };
    t.isha = method.ishaMin ? t.maghrib + method.ishaMin / 60
                            : angleTime(method.isha, 18 / 24);

    /* high-latitude safety net (not normally needed in Pakistan) */
    var night = fix24(t.sunrise + 24 - t.maghrib);
    if (isNaN(t.fajr)) t.fajr = fix24(t.sunrise - night / 7);
    if (isNaN(t.isha)) t.isha = method.ishaMin ? t.maghrib + method.ishaMin / 60
                                               : fix24(t.maghrib + night / 7);

    var adj = tz - lng / 15;
    var hours = {}, dates = {}, k, h, dt;
    for (k in t) hours[k] = fix24(t[k] + adj);
    hours.dhuhr = fix24(hours.dhuhr + 2 / 60);               /* ihtiyat */

    for (k in hours) {
      h = hours[k];
      dt = new Date(y, m - 1, d, 0, 0, 0, 0);
      dt.setMinutes(Math.round(h * 60));
      dates[k] = dt;
    }
    return { hours: hours, dates: dates };
  }

  global.PrayEngine = { compute: compute, METHODS: METHODS };
})(window);
