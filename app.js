/* ═══════════════════════════════════════════════════════════
   NOOR SALAH — app logic
   reminders · check-off (time-gated) · countdown · theming
   Hijri + Solar calendar · widget mirror · Azan (Makkah) mode
   ═══════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ── Capacitor bridges (undefined in plain browser) ───── */
var Cap = window.Capacitor;
var LN    = Cap && Cap.Plugins && Cap.Plugins.LocalNotifications;
var AzanB = Cap && Cap.Plugins && Cap.Plugins.AzanBridge;
var Prefs = Cap && Cap.Plugins && Cap.Plugins.Preferences;

/* ── Data ─────────────────────────────────────────────── */
var PRAYERS = [
  { key: 'fajr',    en: 'Fajr',    ar: 'الفجر'  },
  { key: 'dhuhr',   en: 'Dhuhr',   ar: 'الظهر'  },
  { key: 'asr',     en: 'Asr',     ar: 'العصر'  },
  { key: 'maghrib', en: 'Maghrib', ar: 'المغرب' },
  { key: 'isha',    en: 'Isha',    ar: 'العشاء' }
];
var ALL_SLOTS = PRAYERS.concat([{ key: 'sunrise', en: 'Sunrise', ar: 'الشروق' }]);

var ICONS = {
  dawn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 18h18"/><path d="M7.5 18a4.5 4.5 0 0 1 9 0"/><path d="M12 8.5V11"/><path d="M6.2 10.2l1.4 1.4"/><path d="M17.8 10.2l-1.4 1.4"/><path d="M12 4.5v1.6"/></svg>',
  rise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18h18"/><path d="M7.5 18a4.5 4.5 0 0 1 9 0"/><path d="M12 10.5V5.5"/><path d="M9.5 8L12 5.5 14.5 8"/></svg>',
  noon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19"/></svg>',
  afternoon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 17.5h16"/><circle cx="11" cy="11" r="3.6"/><path d="M11 4v1.6M4.6 7.4l1.2 1.2M17.4 7.4l-1.2 1.2M20 17.5"/></svg>',
  sunset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h18"/><path d="M7.5 17a4.5 4.5 0 0 1 9 0"/><path d="M12 6.5v4"/><path d="M9.5 8.5L12 11l2.5-2.5"/></svg>',
  night: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13.6A8 8 0 0 1 10.4 4a6.6 6.6 0 1 0 9.6 9.6z"/><path d="M17.5 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  bellOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8.7 6.7A6 6 0 0 1 18 8c0 5 1.5 7.2 2.4 8.2M6.3 6.5C6.1 7 6 7.5 6 8c0 7-3 9-3 9h13.5"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/><path d="M2 2l20 20"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5v14M15 5v14"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5.5l11 6.5-11 6.5z"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5.5 6.5 9H3v6h3.5L11 18.5z"/><path d="M16 9l5 6M21 9l-5 6"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
};

var HIJRI_MONTHS = [
  { en: 'Muharram',        ar: 'محرم'         },
  { en: 'Safar',           ar: 'صفر'          },
  { en: 'Rabi al-Awwal',   ar: 'ربيع الأول'    },
  { en: 'Rabi al-Thani',   ar: 'ربيع الثاني'   },
  { en: 'Jumada al-Ula',   ar: 'جمادى الأولى'  },
  { en: 'Jumada al-Akhirah', ar: 'جمادى الآخرة' },
  { en: 'Rajab',           ar: 'رجب'          },
  { en: 'Sha’ban',         ar: 'شعبان'        },
  { en: 'Ramadan',         ar: 'رمضان'        },
  { en: 'Shawwal',         ar: 'شوال'         },
  { en: 'Dhul-Qa’dah',     ar: 'ذو القعدة'     },
  { en: 'Dhul-Hijjah',     ar: 'ذو الحجة'      }
];
var GREG_MONTHS = ['January','February','March','April','May','June',
                   'July','August','September','October','November','December'];

var HOLIDAYS = {
  '1-1':   'Islamic New Year',
  '1-10':  'Day of Ashura',
  '2-12':  'Mawlid an-Nabi',
  '7-27':  'Isra & Mi’raj',
  '8-15':  'Nisf Sha’ban',
  '9-1':   'First of Ramadan',
  '9-27':  'Laylat al-Qadr',
  '10-1':  'Eid al-Fitr',
  '10-2':  'Eid al-Fitr · day 2',
  '10-3':  'Eid al-Fitr · day 3',
  '12-9':  'Day of Arafah',
  '12-10': 'Eid al-Adha',
  '12-11': 'Eid al-Adha · day 2',
  '12-12': 'Eid al-Adha · day 3'
};

/* ── Settings & state ─────────────────────────────────── */
var DEFAULTS = {
  method: 'isna', asr: 2, offset: 0, sound: 'notify',
  lat: 34.1558, lng: 73.2194, loc: 'Abbottabad, Pakistan',
  hijri: -1,              /* Pakistan: one day behind Umm al-Qura by default */
  muted: {}
};
var settings = load('noor_settings', DEFAULTS);

function load(k, def) {
  try { return Object.assign({}, def, JSON.parse(localStorage.getItem(k) || '{}')); }
  catch (e) { return Object.assign({}, def); }
}
function saveSettings() {
  try { localStorage.setItem('noor_settings', JSON.stringify(settings)); } catch (e) {}
  mirrorNative();
}

/* push settings + today's check-state to the native side (widget & azan engine) */
function mirrorNative() {
  if (!Prefs) return;
  Prefs.set({ key: 'widget_settings', value: JSON.stringify({
    lat: settings.lat, lng: settings.lng,
    method: settings.method, asr: settings.asr,
    loc: settings.loc.split(',')[0],
    sound: settings.sound, muted: settings.muted,
    hijri: settings.hijri
  }) }).catch(function () {});
  Prefs.set({ key: 'widget_done_' + todayKey, value: JSON.stringify(doneMap()) })
    .catch(function () {});
}

/* native “Mark prayed” (azan notification button) lands in prefs → merge in */
function mergeFromWidget() {
  if (!Prefs) return;
  Prefs.get({ key: 'widget_done_' + todayKey }).then(function (r) {
    try {
      var m = JSON.parse(r.value || '{}'), cur = doneMap(), changed = false;
      Object.keys(m).forEach(function (k) {
        if (m[k] && !cur[k]) { cur[k] = 1; changed = true; }
      });
      if (changed) {
        localStorage.setItem('noor_done_' + todayKey, JSON.stringify(cur));
        renderList(); updateHero(new Date());
      }
    } catch (e) {}
  }).catch(function () {});
}

var dayTimes = null;
var todayKey = '';
var alerted = {};
var lastMinMark = -1;

/* ── Offline reverse-geocoder (bundled GeoNames subset) ── */
var cityDB = null;
function describeLocation(lat, lng, cb) {
  if (cityDB) return cb(resolveCity(lat, lng));
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'cities.json', true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;
    try { cityDB = JSON.parse(xhr.responseText); } catch (e) { cityDB = {}; }
    cb(cityDB.c ? resolveCity(lat, lng) : null);
  };
  try { xhr.send(); } catch (e) { cb(null); }
}
function resolveCity(lat, lng) {
  var best = null, bd = Infinity, i, r, dx, dy, d;
  var cos = Math.cos(lat * Math.PI / 180);
  for (i = 0; i < cityDB.c.length; i++) {
    r = cityDB.c[i];
    dy = (r[2] - lat) * 111.32;
    dx = (r[3] - lng) * 111.32 * cos;
    d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = r; }
  }
  if (!best || Math.sqrt(bd) > 150) return null;
  var country = (cityDB.n && cityDB.n[best[1]]) || best[1];
  return best[0] + ', ' + country;
}

/* ── DOM handles ──────────────────────────────────────── */
var $ = function (id) { return document.getElementById(id); };
var el = {
  locName: $('locName'), hijri: $('hijriDate'), greg: $('gregDate'),
  hero: document.querySelector('.hero'),
  heroLabel: $('heroLabel'), heroAr: $('heroAr'), heroEn: $('heroEn'),
  heroTime: $('heroTime'), countdown: $('countdown'), ring: $('ringFg'),
  list: $('prayerList'), footInfo: $('footInfo'),
  sheet: $('sheet'), overlay: $('sheetOverlay'),
  gpsNote: $('gpsNote'),
  toast: $('toast'), toastIcon: $('toastIcon'), toastTitle: $('toastTitle'),
  toastSub: $('toastSub'), toastBtn: $('toastBtn'),
  vPrayers: $('view-prayers'), vCalendar: $('view-calendar'),
  calGrid: $('calGrid'), calDetail: $('calDetail'),
  calPrimary: $('calPrimary'), calSecondary: $('calSecondary'),
  hint: $('hint'),
  pkOverlay: $('pkOverlay'), pkTitle: $('pkTitle'), pkOpts: $('pkOpts'),
  azanPanel: $('azanPanel'), azanTitle: $('azanTitle'), azanSub: $('azanSub'),
  azanHint: $('azanHint'), azanPause: $('azanPause')
};
var RING_C = 2 * Math.PI * 54;

/* ── Date helpers ─────────────────────────────────────── */
function fmtKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
         '-' + String(d.getDate()).padStart(2, '0');
}
function fmt12(dt) {
  var h = dt.getHours(), m = dt.getMinutes();
  var ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return { t: h + ':' + String(m).padStart(2, '0'), ap: ap };
}
function fmt12s(dt) { var f = fmt12(dt); return f.t + ' ' + f.ap; }

var hijriFmt = null;
try {
  hijriFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',
    { day: 'numeric', month: 'numeric', year: 'numeric' });
} catch (e) {}

/* All Hijri rendering flows through here, so the moon-sighting adjustment
   (settings.hijri, in days) is applied in this one place and the whole app
   — header chip, calendar grids, month solver, Eid labels — follows it. */
function hijriParts(dt) {
  if (!hijriFmt) return null;
  var d = settings.hijri ? new Date(dt.getTime() + settings.hijri * 86400000) : dt;
  var o = {};
  hijriFmt.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
  var m = parseInt(o.month, 10);
  if (isNaN(m)) {
    m = 0;
    HIJRI_MONTHS.forEach(function (hm, i) {
      if (String(o.month).toLowerCase().indexOf(hm.en.toLowerCase().slice(0, 4)) === 0) m = i + 1;
    });
  }
  return { d: parseInt(o.day, 10), m: m, y: parseInt(o.year, 10) };
}
function hijriString(dt) {
  var h = hijriParts(dt);
  if (!h || !h.m) return '';
  return h.d + ' ' + HIJRI_MONTHS[h.m - 1].en + ' ' + h.y + ' AH';
}

/* ── Done-state storage (per day) ─────────────────────── */
function doneMap() {
  try { return JSON.parse(localStorage.getItem('noor_done_' + todayKey) || '{}'); }
  catch (e) { return {}; }
}
function isDone(k) { return !!doneMap()[k]; }
function setDone(k, v) {
  var m = doneMap();
  if (v) m[k] = 1; else delete m[k];
  try { localStorage.setItem('noor_done_' + todayKey, JSON.stringify(m)); } catch (e) {}
  mirrorNative();
  renderList(); updateHero(new Date()); syncReminders();
}

/* a prayer can only be checked off once its time has begun */
function prayerLocked(k) {
  return !isDone(k) && dayTimes && dayTimes.dates[k] > new Date();
}

/* ── Time computation ─────────────────────────────────── */
function computeDay(date) {
  return PrayEngine.compute(date, settings.lat, settings.lng,
    { method: settings.method, asr: settings.asr });
}

function nextPrayer(now) {
  var i, p, t;
  for (i = 0; i < PRAYERS.length; i++) {
    p = PRAYERS[i]; t = dayTimes.dates[p.key];
    if (t > now) return { p: p, at: t, tomorrow: false };
  }
  var tm = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  var nt = computeDay(tm);
  return { p: PRAYERS[0], at: nt.dates.fajr, tomorrow: true };
}

function currentPeriod(now) {
  var d = dayTimes.dates;
  if (now < d.sunrise) return 'fajr';
  if (now < d.asr)     return 'dhuhr';
  if (now < d.maghrib) return 'asr';
  if (now < d.isha)    return 'maghrib';
  return 'isha';
}

/* ── Rendering: prayers view ──────────────────────────── */
function renderDates() {
  var now = new Date();
  el.hijri.textContent = hijriString(now);
  el.greg.textContent = now.toLocaleDateString('en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function iconFor(key) {
  return { fajr: ICONS.dawn, dhuhr: ICONS.noon, asr: ICONS.afternoon,
           maghrib: ICONS.sunset, isha: ICONS.night }[key];
}

function renderList() {
  var now = new Date();
  var np = nextPrayer(now);
  var html = '';

  PRAYERS.forEach(function (p) {
    var done = isDone(p.key);
    var locked = prayerLocked(p.key);
    var isNext = !np.tomorrow && np.p.key === p.key;
    var muted = !!settings.muted[p.key];
    var ft = fmt12(dayTimes.dates[p.key]);
    html +=
      '<li class="prayer' + (done ? ' is-done' : '') + (isNext ? ' is-next' : '') + (locked ? ' is-locked' : '') + '" data-key="' + p.key + '">' +
        (isNext ? '<span class="next-pill">Next</span>' : '') +
        '<div class="p-icon">' + iconFor(p.key) + '</div>' +
        '<div class="p-name"><span class="en">' + p.en + '</span>' +
        '<span class="ar">' + p.ar + '</span></div>' +
        '<div class="p-time"><span class="t">' + ft.t + '</span><span class="ap">' + ft.ap + '</span></div>' +
        '<button class="p-bell' + (muted ? ' muted' : '') + '" data-bell="' + p.key + '" title="Toggle reminder">' +
          (muted ? ICONS.bellOff : ICONS.bell) + '</button>' +
        '<button class="p-check' + (locked ? ' locked' : '') + '" data-check="' + p.key + '" title="' + (locked ? 'Not begun yet' : 'Mark as prayed') + '">' +
          (locked ? ICONS.lock : ICONS.check) + '</button>' +
      '</li>';
  });

  var sr = fmt12(dayTimes.dates.sunrise);
  html +=
    '<li class="prayer sunrise">' +
      '<div class="p-icon">' + ICONS.rise + '</div>' +
      '<div class="p-name"><span class="en">Sunrise</span><span class="ar">الشروق</span></div>' +
      '<div class="p-time"><span class="t">' + sr.t + '</span><span class="ap">' + sr.ap + '</span></div>' +
      '<span></span><span></span>' +
    '</li>';

  el.list.innerHTML = html;
}

function updateHero(now) {
  var np = nextPrayer(now);
  var allDone = PRAYERS.every(function (p) { return isDone(p.key); });

  el.hero.classList.toggle('alldone', allDone);
  el.heroLabel.textContent = allDone ? 'Alhamdulillah — all prayers completed'
                                     : (np.tomorrow ? 'Next prayer · tomorrow' : 'Upcoming prayer');
  el.heroAr.textContent = np.p.ar;
  el.heroEn.textContent = np.p.en;

  var diff = Math.max(0, np.at - now);
  var hh = Math.floor(diff / 3600000);
  var mm = Math.floor(diff / 60000) % 60;
  var ss = Math.floor(diff / 1000) % 60;
  el.countdown.textContent = String(hh).padStart(2, '0') + ':' +
                             String(mm).padStart(2, '0') + ':' +
                             String(ss).padStart(2, '0');

  el.heroTime.innerHTML = 'begins at <b>' + fmt12s(np.at) + '</b>' +
    (settings.offset && settings.sound !== 'azan' ? ' · reminder ' + settings.offset + ' min before' : '');

  var prev = null, i, t;
  for (i = 0; i < PRAYERS.length; i++) {
    t = dayTimes.dates[PRAYERS[i].key];
    if (t <= now) prev = t;
  }
  if (!prev) {
    var yd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    prev = computeDay(yd).dates.isha;
  }
  var frac = (now - prev) / (np.at - prev);
  frac = Math.min(1, Math.max(0, frac));
  el.ring.style.strokeDashoffset = String(RING_C * (1 - frac));
}

function refreshDay() {
  var now = new Date();
  todayKey = fmtKey(now);
  dayTimes = computeDay(now);
  document.body.dataset.period = currentPeriod(now);
  renderDates(); renderList(); updateHero(now);
  el.footInfo.textContent = 'Times computed on-device · ' +
    (PrayEngine.METHODS[settings.method] || {}).label +
    ' · ' + (settings.asr === 1 ? 'Standard' : 'Hanafi') + ' Asr';
  el.locName.textContent = settings.loc.split(',')[0];
  el.gpsNote.textContent = 'Currently: ' + settings.loc;
  mergeFromWidget();
}

/* ═══════════════════════════════════════════════════════
   CALENDAR  (Hijri + Solar)
   ═══════════════════════════════════════════════════════ */
var cal = { mode: 'greg', y: 0, m: 0, hy: 0, hm: 0, sel: null };

function initCal() {
  var now = new Date();
  cal.y = now.getFullYear(); cal.m = now.getMonth();
  var h = hijriParts(now) || { y: 1447, m: 2 };
  cal.hy = h.y; cal.hm = h.m;
  cal.sel = fmtKey(now);
}

function hijriMonthStart(hy, hm) {
  var est = new Date(622, 6, 16);
  est.setDate(est.getDate() + Math.round(((hy - 1) * 12 + (hm - 1)) * 29.530589));
  var guard = 0, hp = hijriParts(est);
  while (hp && (hp.y > hy || (hp.y === hy && hp.m > hm) ||
        (hp.y === hy && hp.m === hm && hp.d > 1)) && guard++ < 60) {
    est.setDate(est.getDate() - 1); hp = hijriParts(est);
  }
  while (hp && !(hp.y === hy && hp.m === hm && hp.d === 1) && guard++ < 60) {
    est.setDate(est.getDate() + 1); hp = hijriParts(est);
  }
  return est;
}

function shortHoliday(hp) {
  return hp ? (HOLIDAYS[hp.m + '-' + hp.d] || null) : null;
}
function monthLabel(hp) { return HIJRI_MONTHS[hp.m - 1].en.slice(0, 4); }

function renderCalendar() {
  var now = new Date();
  var tKey = fmtKey(now);
  var cells = [];

  function mkCell(dt, other) {
    var hp = hijriParts(dt);
    var main, alt;
    if (cal.mode === 'greg') {
      main = String(dt.getDate());
      alt = hp ? (hp.d === 1 ? '1 ' + monthLabel(hp) : String(hp.d)) : '';
    } else {
      main = hp ? String(hp.d) : String(dt.getDate());
      alt = (hp && hp.d === 1) ? '1 ' + GREG_MONTHS[dt.getMonth()].slice(0, 3)
                               : String(dt.getDate());
    }
    return { date: dt, main: main, alt: alt, other: other, hp: hp };
  }

  var i, d;
  if (cal.mode === 'greg') {
    var first = new Date(cal.y, cal.m, 1);
    var startCol = first.getDay();
    var dim = new Date(cal.y, cal.m + 1, 0).getDate();
    var prevDim = new Date(cal.y, cal.m, 0).getDate();
    for (i = startCol - 1; i >= 0; i--) {
      d = new Date(cal.y, cal.m - 1, prevDim - i);
      cells.push(mkCell(d, true));
    }
    for (i = 1; i <= dim; i++) cells.push(mkCell(new Date(cal.y, cal.m, i), false));
    while (cells.length % 7 !== 0 || cells.length < 35) {
      d = new Date(cal.y, cal.m + 1, cells.length - startCol - dim + 1);
      cells.push(mkCell(d, true));
    }
    el.calPrimary.textContent = GREG_MONTHS[cal.m] + ' ' + cal.y;
    var fhp = hijriParts(new Date(cal.y, cal.m, 1));
    var lhp = hijriParts(new Date(cal.y, cal.m, dim));
    el.calSecondary.textContent = (fhp && lhp)
      ? (fhp.m === lhp.m
          ? HIJRI_MONTHS[fhp.m - 1].en + ' ' + fhp.y
          : HIJRI_MONTHS[fhp.m - 1].en + ' – ' + HIJRI_MONTHS[lhp.m - 1].en + ' ' + lhp.y) + ' AH'
      : '';
  } else {
    var start = hijriMonthStart(cal.hy, cal.hm);
    var startCol2 = start.getDay();
    for (i = startCol2 - 1; i >= 0; i--) {
      var pd = new Date(start); pd.setDate(pd.getDate() - (i + 1));
      cells.push(mkCell(pd, true));
    }
    var cur = new Date(start), hp2 = hijriParts(cur);
    while (hp2 && hp2.y === cal.hy && hp2.m === cal.hm && cells.length < 42) {
      cells.push(mkCell(new Date(cur), false));
      cur.setDate(cur.getDate() + 1); hp2 = hijriParts(cur);
    }
    var kk = 1;
    while (cells.length % 7 !== 0 || cells.length < 35) {
      var nd = new Date(cur); nd.setDate(nd.getDate() + kk - 1);
      cells.push(mkCell(nd, true)); kk++;
      if (kk > 12) break;
    }
    var hm0 = HIJRI_MONTHS[cal.hm - 1];
    el.calPrimary.textContent = hm0.en + ' ' + cal.hy + ' AH';
    var gEnd = cells[cells.length - 1].date;
    el.calSecondary.textContent =
      start.getDate() + ' ' + GREG_MONTHS[start.getMonth()].slice(0, 3) +
      ' – ' + gEnd.getDate() + ' ' + GREG_MONTHS[gEnd.getMonth()].slice(0, 3) +
      ' ' + gEnd.getFullYear();
  }

  var html = '';
  cells.forEach(function (c) {
    var k = fmtKey(c.date);
    var cls = 'cal-day' + (c.other ? ' other' : '') +
      (k === tKey ? ' today' : '') + (k === cal.sel ? ' selected' : '') +
      (c.date.getDay() === 5 ? ' jum' : '') +
      (shortHoliday(c.hp) ? ' ev' : '');
    html += '<button class="' + cls + '" data-d="' + k + '">' +
      '<span class="cd-main">' + c.main + '</span>' +
      '<span class="cd-alt">' + c.alt + '</span></button>';
  });
  el.calGrid.innerHTML = html;
  renderCalDetail();
}

function renderCalDetail() {
  var dt = cal.sel ? new Date(cal.sel + 'T12:00:00') : new Date();
  var hp = hijriParts(dt);
  var holi = shortHoliday(hp);
  var times = computeDay(dt);

  var html =
    '<div class="cd-row"><span class="k">Hijri</span><span class="v ar">' +
      (hp ? hp.d + ' ' + HIJRI_MONTHS[hp.m - 1].ar + ' ' + hp.y : '—') + '</span></div>' +
    '<div class="cd-row"><span class="k"></span><span class="v">' +
      (hp ? hp.d + ' ' + HIJRI_MONTHS[hp.m - 1].en + ' ' + hp.y + ' AH' : '') + '</span></div>' +
    '<div class="cd-row"><span class="k">Solar</span><span class="v">' +
      dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
      '</span></div>' +
    (holi ? '<div class="cd-holiday">' + holi + '</div>' : '') +
    '<div class="cd-times">';
  ALL_SLOTS.forEach(function (s) {
    var tm = times.dates[s.key];
    html += '<div class="cd-chip"><span class="n">' + s.en + '</span>' +
            '<span class="t">' + fmt12s(tm) + '</span></div>';
  });
  html += '</div><p class="cd-detail-hint">Prayer times for this date · ' +
    (PrayEngine.METHODS[settings.method] || {}).label + '</p>';
  el.calDetail.innerHTML = html;
}

$('calPrev').addEventListener('click', function () { shiftMonth(-1); });
$('calNext').addEventListener('click', function () { shiftMonth(1); });
$('calTitle').addEventListener('click', function () { initCal(); renderCalendar(); });

function shiftMonth(dir) {
  if (cal.mode === 'greg') {
    cal.m += dir;
    if (cal.m < 0)  { cal.m = 11; cal.y--; }
    if (cal.m > 11) { cal.m = 0;  cal.y++; }
  } else {
    cal.hm += dir;
    if (cal.hm < 1)  { cal.hm = 12; cal.hy--; }
    if (cal.hm > 12) { cal.hm = 1;  cal.hy++; }
  }
  renderCalendar();
}

$('modeGreg').addEventListener('click', function () { setCalMode('greg'); });
$('modeHijri').addEventListener('click', function () { setCalMode('hijri'); });

function setCalMode(mode) {
  if (cal.mode === mode) return;
  if (mode === 'hijri') {
    var hp = hijriParts(new Date(cal.y, cal.m, 15));
    if (hp && hp.m) { cal.hy = hp.y; cal.hm = hp.m; }
  } else {
    var d = hijriMonthStart(cal.hy, cal.hm);
    cal.y = d.getFullYear(); cal.m = d.getMonth();
  }
  cal.mode = mode;
  $('modeGreg').classList.toggle('active', mode === 'greg');
  $('modeHijri').classList.toggle('active', mode === 'hijri');
  renderCalendar();
}

el.calGrid.addEventListener('click', function (ev) {
  var cell = ev.target.closest('[data-d]');
  if (!cell) return;
  cal.sel = cell.getAttribute('data-d');
  renderCalendar();
});

/* ── Tabs ─────────────────────────────────────────────── */
var calInitDone = false;
document.querySelectorAll('.tab').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var tab = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab').forEach(function (b) {
      b.classList.toggle('active', b === btn);
    });
    el.vPrayers.classList.toggle('hidden', tab !== 'prayers');
    el.vCalendar.classList.toggle('hidden', tab !== 'calendar');
    if (tab === 'calendar' && !calInitDone) {
      calInitDone = true; initCal(); renderCalendar();
    }
  });
});

/* ═══════════════════════════════════════════════════════
   THEMED PICKERS (replace native Android dialogs)
   ═══════════════════════════════════════════════════════ */
var PICKS = {
  method: {
    t: 'Calculation method', get: function () { return settings.method; },
    o: [
      { v: 'isna',    l: 'ISNA',                 s: 'Islamic Society of North America' },
      { v: 'karachi', l: 'Karachi',              s: 'Univ. of Islamic Sciences — usual in Pakistan' },
      { v: 'mwl',     l: 'Muslim World League',  s: 'Europe & much of Asia' },
      { v: 'egypt',   l: 'Egyptian',             s: 'General Authority of Survey' },
      { v: 'makkah',  l: 'Umm al-Qura',          s: 'Makkah' }
    ],
    apply: function () { refreshDay(); syncReminders(); }
  },
  asr: {
    t: 'Asr juristic method', get: function () { return String(settings.asr); },
    o: [
      { v: '2', l: 'Hanafi',   s: 'Shadow ×2 — common in South Asia' },
      { v: '1', l: 'Standard', s: 'Shafi’i, Maliki, Hanbali' }
    ],
    apply: function (v) { settings.asr = +v; refreshDay(); syncReminders(); }
  },
  sound: {
    t: 'Reminder sound', get: function () { return settings.sound; },
    o: [
      { v: 'notify', l: 'Notification tone', s: 'Short system sound with banner' },
      { v: 'azan',   l: 'Azan · Makkah',     s: 'Masjid al-Haram adhan — pause / mute anytime' }
    ],
    apply: function () { syncReminders(); }
  },
  offset: {
    t: 'Reminder timing', get: function () { return String(settings.offset); },
    o: [
      { v: '0',  l: 'At prayer time', s: settings.sound === 'azan' ? 'Azan plays exactly at the time' : '' },
      { v: '5',  l: '5 minutes before' },
      { v: '10', l: '10 minutes before' },
      { v: '15', l: '15 minutes before' }
    ],
    apply: function (v) { settings.offset = +v; refreshDay(); syncReminders(); }
  },
  hijri: {
    t: 'Islamic calendar', get: function () { return String(settings.hijri); },
    o: [
      { v: '-1', l: 'Pakistan · auto',      s: 'Umm al-Qura −1 day — usual local moon sighting' },
      { v: '0',  l: 'Saudi · Umm al-Qura',  s: 'Official Saudi calendar' },
      { v: '-2', l: '2 days behind',        s: 'If the local month started a day later' },
      { v: '1',  l: '1 day ahead',          s: 'If the moon was sighted a day earlier' },
      { v: '2',  l: '2 days ahead',         s: 'Rare — for special Eid adjustments' }
    ],
    apply: function () { refreshDay(); try { renderCalendar(); renderCalDetail(); } catch (e) {} }
  }
};
var PK_FIELD = { method: 'pkMethodVal', asr: 'pkAsrVal', sound: 'pkSoundVal', offset: 'pkOffsetVal', hijri: 'pkHijriVal' };
var pkCurrent = null;

function updatePickerLabels() {
  Object.keys(PICKS).forEach(function (key) {
    var cur = PICKS[key].get();
    var opt = PICKS[key].o.filter(function (o) { return o.v === cur; })[0];
    var b = $(PK_FIELD[key]);
    if (b && opt) b.textContent = opt.l;
  });
}

function openPicker(key) {
  pkCurrent = key;
  var def = PICKS[key];
  var cur = def.get();
  el.pkTitle.textContent = def.t;
  var html = '';
  def.o.forEach(function (o) {
    html += '<button class="pk-opt' + (o.v === cur ? ' sel' : '') + '" data-v="' + o.v + '">' +
      '<span class="pk-dot"></span>' +
      '<span class="pk-txt"><b>' + o.l + '</b>' + (o.s ? '<i>' + o.s + '</i>' : '') + '</span>' +
      '<span class="pk-check">' + ICONS.check + '</span></button>';
  });
  el.pkOpts.innerHTML = html;
  el.pkOverlay.classList.add('open');
}
function closePicker() { el.pkOverlay.classList.remove('open'); pkCurrent = null; }

el.pkOpts.addEventListener('click', function (ev) {
  var btn = ev.target.closest('[data-v]');
  if (!btn || !pkCurrent) return;
  var key = pkCurrent, v = btn.getAttribute('data-v');
  if (key === 'asr' || key === 'offset' || key === 'hijri') settings[key] = +v; else settings[key] = v;
  saveSettings();
  updatePickerLabels();
  closePicker();
  PICKS[key].apply(v);
});
el.pkOverlay.addEventListener('click', function (ev) {
  if (ev.target === el.pkOverlay) closePicker();
});

['Method', 'Asr', 'Sound', 'Offset', 'Hijri'].forEach(function (n) {
  var key = n.toLowerCase();
  $('pk' + n).addEventListener('click', function () { openPicker(key); });
});

/* ═══════════════════════════════════════════════════════
   REMINDERS
   ═══════════════════════════════════════════════════════ */
function syncReminders() {
  if (!LN) return;                      /* browser preview → in-page ticker below */
  (async function () {
    try {
      var pending = await LN.getPending();
      if (pending.notifications.length) {
        await LN.cancel({ notifications: pending.notifications.map(function (n) { return { id: n.id }; }) });
      }

      var perm = await LN.checkPermissions();
      if (perm.display !== 'granted') {
        perm = await LN.requestPermissions();
        if (perm.display !== 'granted') return;
      }

      /* azan mode: the native adhan engine owns playback & controls,
         but it still needs the notification permission granted above */
      if (settings.sound === 'azan') return;
      try {
        await LN.createChannel({
          id: 'prayers', name: 'Prayer reminders',
          description: 'Namaz time reminders',
          importance: 5, visibility: 1, vibration: true
        });
      } catch (e) {}

      var now = Date.now(), notifs = [], day, dt, d, i, p, at;
      for (d = 0; d < 7; d++) {
        day = new Date(); day.setDate(day.getDate() + d);
        dt = computeDay(day);
        for (i = 0; i < PRAYERS.length; i++) {
          p = PRAYERS[i];
          if (settings.muted[p.key]) continue;
          if (d === 0 && isDone(p.key)) continue;
          at = new Date(dt.dates[p.key].getTime() - settings.offset * 60000);
          if (at.getTime() <= now + 4000) continue;
          notifs.push({
            id: d * 10 + i + 1,
            channelId: 'prayers',
            title: p.ar + '  ·  ' + p.en,
            body: settings.offset
              ? p.en + ' begins in ' + settings.offset + ' minutes — tap to mark as prayed.'
              : "It's time for " + p.en + " — tap to mark as prayed.",
            schedule: { at: at, allowWhileIdle: true }
          });
        }
      }
      if (notifs.length) await LN.schedule({ notifications: notifs });
    } catch (e) { console.warn('reminder sync failed', e); }
  })();
}

if (Cap && Cap.Plugins && Cap.Plugins.App) {
  try {
    Cap.Plugins.App.addListener('appStateChange', function (s) {
      if (s.isActive) { refreshDay(); mirrorNative(); syncReminders(); }
    });
  } catch (e) {}
}
if (LN) {
  try {
    LN.addListener('localNotificationActionPerformed', function (e) {
      var id = e.notification.id, idx = (id - 1) % 10;
      if (PRAYERS[idx]) setDone(PRAYERS[idx].key, true);
    });
  } catch (e) {}
}

/* fired when a prayer time arrives while the app/preview is open */
function reminderTick() {
  var now = new Date();
  PRAYERS.forEach(function (p) {
    if (settings.muted[p.key] || isDone(p.key)) return;
    var at = dayTimes.dates[p.key].getTime() - settings.offset * 60000;
    var key = p.key + todayKey;
    if (now >= at && now - at < 60000 && !alerted[key]) {
      alerted[key] = true;
      if (settings.sound === 'azan') {
        openAzanPanel(p);                 /* + web audio in browser preview */
      } else if (!LN) {
        fireBanner(p);
        if ('Notification' in window && Notification.permission === 'granted') {
          try { new Notification(p.ar + ' · ' + p.en, { body: "It's time for " + p.en }); } catch (e) {}
        }
      }
    }
  });
}

/* ── Reminder banner (notify mode, browser) ───────────── */
var toastTimer = null, toastPrayer = null;
function fireBanner(p) {
  toastPrayer = p;
  el.toastIcon.innerHTML = iconFor(p.key);
  el.toastTitle.textContent = 'Time for ' + p.en;
  el.toastSub.textContent = 'حان الآن وقت صلاة ' + p.ar;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 30000);
}
function hideToast() { el.toast.classList.remove('show'); toastPrayer = null; }

el.toastBtn.addEventListener('click', function () {
  if (toastPrayer) setDone(toastPrayer.key, true);
  hideToast();
});

/* ── Hint pill (e.g. locked check attempts) ───────────── */
var hintTimer = null;
function showHint(msg) {
  el.hint.textContent = msg;
  el.hint.classList.add('show');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(function () { el.hint.classList.remove('show'); }, 2200);
}

/* ── Azan panel ───────────────────────────────────────── */
var azan = { audio: null, prayer: null, playing: false, native: false };

function openAzanPanel(p) {
  azan.prayer = p;
  el.azanTitle.textContent = p.ar;
  el.azanSub.textContent = 'Azan · ' + p.en;
  el.azanPanel.classList.add('show');
  el.azanHint.textContent = '';
  el.azanPause.classList.remove('hidden');
  azan.native = !!AzanB;
  if (azan.native) {            /* native engine owns the audio; panel mirrors it */
    azan.playing = true;
    syncAzanPauseBtn();
    try {
      AzanB.state().then(function (s) {
        if (s && s.active) { azan.playing = !!s.playing; syncAzanPauseBtn(); }
        else { azan.native = false; playWebAzan(); }   /* native silent → play in-app */
      }).catch(function () {});
    } catch (e) {}
  } else {                      /* browser preview: play right here */
    playWebAzan();
  }
}
function closeAzanPanel() {
  el.azanPanel.classList.remove('show');
  stopWebAzan();
  azan.prayer = null;
}
function playWebAzan() {
  stopWebAzan();
  try {
    azan.audio = new Audio('azan.ogg');
    azan.playing = true;
    azan.audio.onended = function () { azan.playing = false; syncAzanPauseBtn(); };
    azan.audio.onpause = function () { /* keep in sync when ended */ };
    azan.audio.play().catch(function () { azan.playing = false; syncAzanPauseBtn(); });
    syncAzanPauseBtn();
  } catch (e) {}
}
function stopWebAzan() {
  if (azan.audio) { try { azan.audio.pause(); } catch (e) {} azan.audio = null; }
  azan.playing = false;
}
function syncAzanPauseBtn() {
  el.azanPause.innerHTML = (azan.playing ? ICONS.pause : ICONS.play) +
    '<span>' + (azan.playing ? 'Pause' : 'Resume') + '</span>';
}
el.azanPause.addEventListener('click', function () {
  if (azan.native) {
    try { azan.playing ? AzanB.pause() : AzanB.resume(); } catch (e) {}
    azan.playing = !azan.playing;
    syncAzanPauseBtn();
    return;
  }
  if (!azan.audio) return;
  if (azan.playing) { azan.audio.pause(); azan.playing = false; }
  else { azan.audio.play().catch(function () {}); azan.playing = true; }
  syncAzanPauseBtn();
});
$('azanMute').addEventListener('click', function () {
  if (azan.native) { try { AzanB.stop(); } catch (e) {} }
  stopWebAzan();
  showHint('Adhan muted');
  closeAzanPanel();
});
$('azanDone').addEventListener('click', function () {
  if (azan.prayer) setDone(azan.prayer.key, true);
  if (azan.native) { try { AzanB.stop(); } catch (e) {} }
  closeAzanPanel();
});
$('azanWebClose').addEventListener('click', closeAzanPanel);

/* ═══════════════════════════════════════════════════════
   UI EVENTS
   ═══════════════════════════════════════════════════════ */
el.list.addEventListener('click', function (ev) {
  var bell = ev.target.closest('[data-bell]');
  var check = ev.target.closest('[data-check]');
  if (bell) {
    var kb = bell.getAttribute('data-bell');
    settings.muted[kb] = !settings.muted[kb];
    saveSettings(); renderList(); syncReminders();
    return;
  }
  if (check) {
    var kc = check.getAttribute('data-check');
    if (prayerLocked(kc)) {
      var p = PRAYERS.filter(function (x) { return x.key === kc; })[0];
      showHint(p.en + ' has not begun yet — check in after ' + fmt12s(dayTimes.dates[kc]));
      return;
    }
    setDone(kc, !isDone(kc));
  }
});

function openSheet()  { el.sheet.classList.add('open'); el.overlay.classList.add('open'); }
function closeSheet() { el.sheet.classList.remove('open'); el.overlay.classList.remove('open'); }
$('settingsBtn').addEventListener('click', openSheet);
el.overlay.addEventListener('click', closeSheet);
$('locBtn').addEventListener('click', openSheet);

$('gpsBtn').addEventListener('click', function () {
  el.gpsNote.textContent = 'Requesting device location…';

  function applyCoords(lat, lng) {
    settings.lat = +lat.toFixed(4);
    settings.lng = +lng.toFixed(4);
    settings.loc = 'My location';
    describeLocation(settings.lat, settings.lng, function (label) {
      if (label) {
        settings.loc = label;
        saveSettings(); refreshDay(); mirrorNative();
      }
    });
    saveSettings(); refreshDay(); syncReminders();
    el.gpsNote.textContent = 'Location locked — times now follow your device:';
  }
  function fail() {
    el.gpsNote.textContent = 'Could not get location — check permission & GPS, then retry.';
  }

  var Geo = Cap && Cap.Plugins && Cap.Plugins.Geolocation;
  if (Geo) {
    Geo.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 })
      .then(function (pos) { applyCoords(pos.coords.latitude, pos.coords.longitude); })
      .catch(fail);
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (pos) {
      applyCoords(pos.coords.latitude, pos.coords.longitude);
    }, fail, { timeout: 10000 });
  } else {
    fail();
  }
});

$('testBtn').addEventListener('click', function () {
  closeSheet();
  if (settings.sound === 'azan') {
    openAzanPanel(nextPrayer(new Date()).p);
    return;
  }
  if (LN) {
    (async function () {
      try {
        var perm = await LN.requestPermissions();
        if (perm.display !== 'granted') { fireBanner(PRAYERS[0]); return; }
        await LN.schedule({ notifications: [{
          id: 999, channelId: 'prayers',
          title: PRAYERS[0].ar + '  ·  Test reminder',
          body: 'This is how your namaz reminders will appear.',
          schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true }
        }] });
      } catch (e) { fireBanner(PRAYERS[0]); }
    })();
  } else {
    if ('Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch (e) {}
    }
    setTimeout(function () { fireBanner(PRAYERS[0]); }, 1500);
  }
});

if (!LN && 'Notification' in window && Notification.permission === 'default') {
  var ask = function () {
    try { Notification.requestPermission(); } catch (e) {}
    document.removeEventListener('touchstart', ask);
    document.removeEventListener('click', ask);
  };
  document.addEventListener('touchstart', ask);
  document.addEventListener('click', ask);
}

/* ── Clock ────────────────────────────────────────────── */
refreshDay();
mirrorNative();
syncReminders();
updatePickerLabels();

if (/^My location/.test(settings.loc)) {
  describeLocation(settings.lat, settings.lng, function (label) {
    if (label) { settings.loc = label; saveSettings(); refreshDay(); mirrorNative(); }
  });
}

setInterval(function () {
  var now = new Date();
  if (fmtKey(now) !== todayKey) {
    alerted = {};
    refreshDay(); mirrorNative(); syncReminders();
    return;
  }
  updateHero(now);
  var mk = now.getHours() * 60 + now.getMinutes();
  if (mk !== lastMinMark) { lastMinMark = mk; renderList(); }
}, 1000);
setInterval(reminderTick, 5000);

})();
