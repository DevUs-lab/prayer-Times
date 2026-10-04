/**
 * Language pack: English, Urdu (Arabic script), Hindi (Devanagari) and
 * Roman Urdu. One flat key space with {{param}} interpolation and an
 * English fallback, so a missing key degrades to English instead of noise.
 *
 *   translate(lang, key, params)  pure lookup (any caller, any time)
 *   t(key, params)                same, using the active language
 *   setActiveLang(id)             what the provider/Settings call
 *
 * `rom` only lists keys that differ from English — the rest are inherited,
 * which keeps Roman Urdu exactly the app's legacy copy.
 */
export const LANGS = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'ur', label: 'Urdu', native: 'اردو' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { id: 'rom', label: 'Roman Urdu', native: 'Roman Urdu' },
]

export const DEFAULT_LANG = 'en'
const VALID_LANGS = LANGS.map((entry) => entry.id)

let activeLang = DEFAULT_LANG

export function setActiveLang(next) {
  activeLang = VALID_LANGS.includes(next) ? next : DEFAULT_LANG
}

export function getActiveLang() {
  return activeLang
}

/** Urdu is the only right-to-left language here (text direction, not layout). */
export function isRtl(lang = activeLang) {
  return lang === 'ur'
}

/** Locale for JS date formatting; unknown locales fall back inside date.js. */
export function intlLocale(lang = activeLang) {
  if (lang === 'hi') return 'hi-IN'
  if (lang === 'ur') return 'ur-PK'
  return 'en-GB'
}

const en = {
  /* ---- tabs ---- */
  'tab.home': 'Home',
  'tab.calendar': 'Calendar',
  'tab.settings': 'Settings',

  /* ---- shared ---- */
  'common.retry': 'Try again',
  'common.loading': 'Loading…',
  'common.wrong': 'Something went wrong',
  'common.close': 'Close',
  'common.skip': 'Skip for now',
  'time.am': 'AM',
  'time.pm': 'PM',

  /* ---- first-run onboarding ---- */
  'ob.step': 'Step {{n}} of 2',
  'ob.lang.title': 'Choose your language',
  'ob.lang.hint': 'You can change it later in Settings.',
  'ob.loc.title': 'Set your location',
  'ob.loc.hint': 'Prayer times depend on where you are.',
  'ob.loc.auto': 'Auto-detect (GPS)',
  'ob.loc.manual': 'Search my city',
  'ob.loc.detecting': 'Finding your location…',
  'ob.loc.failed': 'Could not find it automatically — search below',
  'ob.loc.skip': 'Skip for now',

  /* ---- Home ---- */
  'home.title': 'Prayer Times',
  'home.loading': 'Loading prayer times…',
  'home.now': 'NOW',
  'home.next': 'NEXT',
  'home.ends': 'Ends',
  'home.starts': 'Starts',
  'home.remaining': 'time left',
  'home.table.section': "Today's prayers · Hanafi Asr",
  'home.table.prayer': 'PRAYER',
  'home.table.starts': 'STARTS',
  'home.table.ends': 'ENDS',
  'home.weather.title': 'Weather',
  'home.weather.none': 'Weather not available yet',
  'home.weather.feels': 'Feels like',
  'home.weather.humidity': 'Humidity',
  'home.weather.wind': 'Wind',
  'home.weather.rain': 'Rain',
  'home.weather.next8': 'NEXT 8 HOURS',
  'home.weather.today': 'Today',
  'home.weather.uv': 'UV',
  'home.weather.mm': '{{n}} mm',
  'home.weather.hilo': 'H {{max}}°  L {{min}}°',
  'home.elevation': 'Elevation {{ft}} ft',
  'home.source': 'Prayer times: Aladhan · Weather: Open-Meteo',
  'home.approxLocation': 'Location is approximate — set GPS or search your city in Settings.',

  /* ---- countdown sentence: "${name} ends in 04:11:23" ---- */
  'caption.endsIn': '{{name}} ends in',

  /* ---- Calendar ---- */
  'cal.syncError': 'Islamic dates could not sync — check internet',
  'cal.loadError': 'Calendar unavailable',
  'cal.loading': 'Loading Islamic month…',
  'cal.prev': 'Previous month',
  'cal.next': 'Next month',
  'cal.change': 'Change month',
  'cal.today': 'Go to current month',
  'cal.legend': 'Bigger number = Hijri date · smaller = Gregorian date · highlighted = today',
  'cal.select': 'Select Hijri month',
  'cal.prevYear': 'Previous year',
  'cal.nextYear': 'Next year',
  'cal.monthFallback': 'Month {{n}}',
  'cal.week.sun': 'Sun',
  'cal.week.mon': 'Mon',
  'cal.week.tue': 'Tue',
  'cal.week.wed': 'Wed',
  'cal.week.thu': 'Thu',
  'cal.week.fri': 'Fri',
  'cal.week.sat': 'Sat',

  /* ---- Settings ---- */
  'set.loc.unset': 'Location not set',
  'set.find': 'Find a location',
  'set.find.hint':
    'Type a place name — like "Jhang" — and a list appears below. Tap your place.',
  'set.find.placeholder': 'City, town or area…',
  'set.searching': 'Searching…',
  'set.noResults': 'No place found — type again',
  'set.auto.title': 'Or auto-detect in one tap',
  'set.auto.hint':
    'GPS (most accurate) — or by your city if permission is denied. GPS keeps the times matched to your real place.',
  'set.auto.button': 'Auto-detect location',
  'set.saved': 'Location saved ✓',
  'set.saveFailed': 'Location not saved — try again',
  'set.detected': 'Location found: {{label}}',
  'set.detectFailed': 'Could not detect — allow permission or type it in',
  'set.type.gps': 'GPS (auto detected)',
  'set.type.ip': 'IP (auto detected)',
  'set.type.manual': 'Manual',
  'set.language.title': 'Language',
  'set.language.hint': 'The whole app follows the language you pick.',

  /* ---- shared states ---- */
  'ui.loc.title': 'Set your location in Settings first',
  'ui.loc.hint': 'After that you get prayer times and weather for your city',
  'ui.loc.button': 'Open Settings',
  'app.bootError': 'App could not start — try again',
  'app.loading': 'Getting things ready…',

  /* ---- errors (services throw these via t()) ---- */
  'err.invalidLocation': 'Location looks wrong — set it again in Settings',
  'err.offlineFirst': 'No internet — the first download is needed',
  'err.times': 'Prayer times could not be loaded',
  'err.offlineSaved': 'No internet — showing saved data',
  'err.noEntry': 'No times for this date',
  'err.hijriFetch': 'Islamic calendar could not load',
  'err.hijriEmpty': 'Islamic calendar was empty — try again',
  'err.hijriDate': 'Hijri date not found',
  'err.timeout': 'Network is slow — try again',
  'err.http': 'Request failed ({{status}})',
  'err.network': 'No internet connection',
  'err.geocode': 'Place not found — check the city name',
  'err.ipDetect': 'Could not detect location',

  /* ---- weather ---- */
  'weather.unavailable': 'Weather unavailable',
  'wmo.0': 'Clear sky',
  'wmo.1': 'Mainly clear',
  'wmo.2': 'Partly cloudy',
  'wmo.3': 'Overcast',
  'wmo.45': 'Fog',
  'wmo.48': 'Rime fog',
  'wmo.51': 'Light drizzle',
  'wmo.53': 'Drizzle',
  'wmo.55': 'Heavy drizzle',
  'wmo.56': 'Freezing drizzle',
  'wmo.57': 'Heavy freezing drizzle',
  'wmo.61': 'Light rain',
  'wmo.63': 'Rain',
  'wmo.65': 'Heavy rain',
  'wmo.66': 'Freezing rain',
  'wmo.67': 'Heavy freezing rain',
  'wmo.71': 'Light snow',
  'wmo.73': 'Snow',
  'wmo.75': 'Heavy snow',
  'wmo.77': 'Snow grains',
  'wmo.80': 'Light showers',
  'wmo.81': 'Showers',
  'wmo.82': 'Violent showers',
  'wmo.85': 'Snow showers',
  'wmo.86': 'Heavy snow showers',
  'wmo.95': 'Thunderstorm',
  'wmo.96': 'Thunderstorm with hail',
  'wmo.99': 'Heavy thunderstorm',
}

const ur = {
  'tab.home': 'گھر',
  'tab.calendar': 'کیلنڈر',
  'tab.settings': 'سیٹنگز',

  'common.retry': 'دوبارہ کوشش کریں',
  'common.loading': 'لوڈ ہو رہا ہے…',
  'common.wrong': 'کچھ غلط ہو گیا',
  'common.close': 'بند کریں',
  'common.skip': 'ابھی کے لیے چھوڑیں',

  'ob.step': 'مرحلہ {{n}} از 2',
  'ob.lang.title': 'اپنی زبان منتخب کریں',
  'ob.lang.hint': 'یہ بعد میں سیٹنگز میں بدل سکتے ہیں۔',
  'ob.loc.title': 'اپنی جگہ مقرر کریں',
  'ob.loc.hint': 'نماز کے اوقات آپ کی جگہ پر منحصر ہیں۔',
  'ob.loc.auto': 'از خود تلاش کریں (GPS)',
  'ob.loc.manual': 'میرا شہر تلاش کریں',
  'ob.loc.detecting': 'آپ کی جگہ تلاش ہو رہی ہے…',
  'ob.loc.failed': 'از خود تلاش نہ ہو سکی — نیچے تلاش کریں',
  'ob.loc.skip': 'ابھی کے لیے چھوڑیں',

  'home.title': 'نماز کے اوقات',
  'home.loading': 'نماز کے اوقات لوڈ ہو رہے ہیں…',
  'home.now': 'ابھی',
  'home.next': 'اگلا',
  'home.ends': 'ختم',
  'home.starts': 'شروع',
  'home.remaining': 'باقی وقت',
  'home.table.section': 'آج کی نمازیں · حنفی عصر',
  'home.table.prayer': 'نماز',
  'home.table.starts': 'شروع',
  'home.table.ends': 'ختم',
  'home.weather.title': 'موسم',
  'home.weather.none': 'موسم ابھی دستیاب نہیں',
  'home.weather.feels': 'محسوس ہوتا ہے',
  'home.weather.humidity': 'نمی',
  'home.weather.wind': 'ہوا',
  'home.weather.rain': 'بارش',
  'home.weather.next8': 'اگلے 8 گھنٹے',
  'home.weather.today': 'آج',
  'home.weather.hilo': 'زیادہ {{max}}°  کم {{min}}°',
  'home.elevation': 'بلندی {{ft}} فٹ',
  'home.source': 'نماز کے اوقات: Aladhan · موسم: Open-Meteo',
  'home.approxLocation': 'جگہ اندازے سے لی گئی ہے — سیٹنگز میں GPS یا شہر خود چنیں۔',

  'caption.endsIn': '{{name}} کا وقت ختم ہونے میں',

  'cal.syncError': 'ہجری تواریخ اپڈیٹ نہ ہو سکیں — انٹرنیٹ چیک کریں',
  'cal.loadError': 'کیلنڈر دستیاب نہیں',
  'cal.loading': 'اسلامی مہینہ لوڈ ہو رہا ہے…',
  'cal.prev': 'پچھلا مہینہ',
  'cal.next': 'اگلا مہینہ',
  'cal.change': 'مہینہ بدلیں',
  'cal.today': 'موجودہ مہینے پر جائیں',
  'cal.legend': 'بڑی تاریخ ہجری · چھوٹی گریگوریان · آج نمایاں',
  'cal.select': 'ہجری مہینہ منتخب کریں',
  'cal.prevYear': 'پچھلا سال',
  'cal.nextYear': 'اگلا سال',
  'cal.monthFallback': 'مہینہ {{n}}',
  'cal.week.sun': 'اتوار',
  'cal.week.mon': 'پیر',
  'cal.week.tue': 'منگل',
  'cal.week.wed': 'بدھ',
  'cal.week.thu': 'جمعرات',
  'cal.week.fri': 'جمعہ',
  'cal.week.sat': 'ہفتہ',

  'set.loc.unset': 'جگہ مقرر نہیں',
  'set.find': 'جگہ تلاش کریں',
  'set.find.hint': 'جگہ کا نام لکھیں — جیسے "Jhang" — نیچے فہرست آ جائے گی۔ اپنی جگہ چنیں۔',
  'set.find.placeholder': 'شہر، قصبہ یا علاقہ…',
  'set.searching': 'تلاش کر رہے ہیں…',
  'set.noResults': 'کوئی جگہ نہیں ملی — دوبارہ لکھیں',
  'set.auto.title': 'یا ایک ٹپ میں از خود تلاش',
  'set.auto.hint':
    'GPS (سب سے درست) — اگر اجازت نہ ملے تو شہر کے مطابق۔ GPS سے اوقات آپ کے اصل مقام سے ملتے ہیں۔',
  'set.auto.button': 'از خود جگہ تلاش کریں',
  'set.saved': 'جگہ محفوظ ہو گئی ✓',
  'set.saveFailed': 'جگہ محفوظ نہ ہو سکی — دوبارہ کوشش کریں',
  'set.detected': 'جگہ ملی: {{label}}',
  'set.detectFailed': 'تلاش نہ ہو سکی — اجازت دیں یا از خود لکھیں',
  'set.type.gps': 'GPS (از خود ملی)',
  'set.type.ip': 'IP (از خود ملی)',
  'set.type.manual': 'مینول',
  'set.language.title': 'زبان',
  'set.language.hint': 'پوری ایپ آپ کی چنی ہوئی زبان میں چلے گی۔',

  'ui.loc.title': 'پہلے سیٹنگز میں جگہ مقرر کریں',
  'ui.loc.hint': 'اس کے بعد آپ کو اپنے شہر کے نماز کے اوقات اور موسم ملیں گے',
  'ui.loc.button': 'سیٹنگز کھولیں',
  'app.bootError': 'ایپ شروع نہ ہو سکی — دوبارہ کوشش کریں',
  'app.loading': 'تیار ہو رہا ہے…',

  'err.invalidLocation': 'جگہ غلط لگ رہی ہے — سیٹنگز میں دوبارہ کریں',
  'err.offlineFirst': 'انٹرنیٹ نہیں — پہلی بار ڈاؤن لوڈ ضروری ہے',
  'err.times': 'نماز کے اوقات نہیں مل سکے',
  'err.offlineSaved': 'انٹرنیٹ نہیں — محفوظ شدہ ڈیٹا دکھا رہے ہیں',
  'err.noEntry': 'اس تاریخ کے اوقات نہیں ملے',
  'err.hijriFetch': 'اسلامی کیلنڈر لوڈ نہ ہو سکا',
  'err.hijriEmpty': 'اسلامی کیلنڈر خالی تھا — دوبارہ کوشش کریں',
  'err.hijriDate': 'ہجری تاریخ نہیں ملی',
  'err.timeout': 'نیٹ ورک سست ہے — دوبارہ کوشش کریں',
  'err.http': 'درخواست ناکام ({{status}})',
  'err.network': 'انٹرنیٹ کنکشن نہیں',
  'err.geocode': 'جگہ نہیں ملی — شہر کا نام چیک کریں',
  'err.ipDetect': 'جگہ از خود تلاش نہ ہو سکی',

  'weather.unavailable': 'موسم دستیاب نہیں',
  'wmo.0': 'صاف آسمان',
  'wmo.1': 'زیادہ تر صاف',
  'wmo.2': 'کچھ ابر',
  'wmo.3': 'ابر آلود',
  'wmo.45': 'دھند',
  'wmo.48': 'برفی دھند',
  'wmo.51': 'ہلکی بوند بوند',
  'wmo.53': 'بوند بوند',
  'wmo.55': 'تیز بوند بوند',
  'wmo.56': 'جمی ہوئی بوند بوند',
  'wmo.57': 'شدید جمی ہوئی بوند بوند',
  'wmo.61': 'ہلکی بارش',
  'wmo.63': 'بارش',
  'wmo.65': 'تیز بارش',
  'wmo.66': 'جمی ہوئی بارش',
  'wmo.67': 'شدید جمی ہوئی بارش',
  'wmo.71': 'ہلکی برفباری',
  'wmo.73': 'برفباری',
  'wmo.75': 'شدید برفباری',
  'wmo.77': 'برف کے دانے',
  'wmo.80': 'ہلکی چھینٹیں',
  'wmo.81': 'چھینٹیں',
  'wmo.82': 'تیز چھینٹیں',
  'wmo.85': 'برف والی چھینٹیں',
  'wmo.86': 'تیز برف والی چھینٹیں',
  'wmo.95': 'طوفان',
  'wmo.96': 'گرے کے ساتھ طوفان',
  'wmo.99': 'شدید طوفان',
}

const hi = {
  'tab.home': 'घर',
  'tab.calendar': 'कैलेंडर',
  'tab.settings': 'सेटिंग्स',

  'common.retry': 'फिर से कोशिश करें',
  'common.loading': 'लोड हो रहा है…',
  'common.wrong': 'कुछ गलत हो गया',
  'common.close': 'बंद करें',
  'common.skip': 'अभी के लिए छोड़ें',

  'ob.step': 'चरण {{n}} / 2',
  'ob.lang.title': 'अपनी भाषा चुनें',
  'ob.lang.hint': 'आप इसे बाद में सेटिंग्स में बदल सकते हैं।',
  'ob.loc.title': 'अपना स्थान तय करें',
  'ob.loc.hint': 'नमाज़ के वक्त आपकी जगह पर निर्भर हैं।',
  'ob.loc.auto': 'स्वतः पता लगाएँ (GPS)',
  'ob.loc.manual': 'मेरा शहर खोजें',
  'ob.loc.detecting': 'आपका स्थान खोजा जा रहा है…',
  'ob.loc.failed': 'अपने आप पता नहीं चल सका — नीचे खोजें',
  'ob.loc.skip': 'अभी के लिए छोड़ें',

  'home.title': 'नमाज़ के वक्त',
  'home.loading': 'नमाज़ के वक्त लोड हो रहे हैं…',
  'home.now': 'अभी',
  'home.next': 'अगला',
  'home.ends': 'समाप्त',
  'home.starts': 'शुरू',
  'home.remaining': 'बचा समय',
  'home.table.section': 'आज की नमाज़ें · हनफ़ी असर',
  'home.table.prayer': 'नमाज़',
  'home.table.starts': 'शुरू',
  'home.table.ends': 'समाप्त',
  'home.weather.title': 'मौसम',
  'home.weather.none': 'मौसम अभी उपलब्ध नहीं',
  'home.weather.feels': 'महसूस होता है',
  'home.weather.humidity': 'नमी',
  'home.weather.wind': 'हवा',
  'home.weather.rain': 'बारिश',
  'home.weather.next8': 'अगले 8 घंटे',
  'home.weather.today': 'आज',
  'home.weather.hilo': 'अधिकतम {{max}}°  न्यूनतम {{min}}°',
  'home.elevation': 'ऊँचाई {{ft}} फुट',
  'home.source': 'नमाज़ के वक़्त: Aladhan · मौसम: Open-Meteo',
  'home.approxLocation': 'स्थान अनुमान से लिया गया है — सेटिंग्स में GPS या शहर खुद चुनें।',

  'caption.endsIn': '{{name}} का समय समाप्त होने में',

  'cal.syncError': 'हिजरी तारीख़ें सिंक नहीं हुईं — इंटरनेट जाँचें',
  'cal.loadError': 'कैलेंडर उपलब्ध नहीं',
  'cal.loading': 'इस्लामी महीना लोड हो रहा है…',
  'cal.prev': 'पिछला महीना',
  'cal.next': 'अगला महीना',
  'cal.change': 'महीना बदलें',
  'cal.today': 'वर्तमान महीने पर जाएँ',
  'cal.legend': 'बड़ी संख्या = हिजरी तारीख़ · छोटी = ग्रेगोरियन · आज उभरा हुआ',
  'cal.select': 'हिजरी महीना चुनें',
  'cal.prevYear': 'पिछला साल',
  'cal.nextYear': 'अगला साल',
  'cal.monthFallback': 'महीना {{n}}',
  'cal.week.sun': 'रवि',
  'cal.week.mon': 'सोम',
  'cal.week.tue': 'मंगल',
  'cal.week.wed': 'बुध',
  'cal.week.thu': 'गुरु',
  'cal.week.fri': 'शुक्र',
  'cal.week.sat': 'शनि',

  'set.loc.unset': 'स्थान तय नहीं',
  'set.find': 'स्थान खोजें',
  'set.find.hint': 'जगह का नाम लिखें — जैसे "Jhang" — नीचे सूची आएगी। अपनी जगह चुनें।',
  'set.find.placeholder': 'शहर, कस्बा या इलाका…',
  'set.searching': 'खोज रहे हैं…',
  'set.noResults': 'कोई जगह नहीं मिली — फिर लिखें',
  'set.auto.title': 'या एक टैप में स्वतः पता लगाएँ',
  'set.auto.hint':
    'GPS (सबसे सटीक) — अनुमति न मिले तो शहर के अनुसार। GPS से वक्त आपके असली मकाम से मेल खाते हैं।',
  'set.auto.button': 'स्वतः स्थान पता लगाएँ',
  'set.saved': 'स्थान सहेजा गया ✓',
  'set.saveFailed': 'स्थान सहेजा नहीं गया — फिर कोशिश करें',
  'set.detected': 'स्थान मिला: {{label}}',
  'set.detectFailed': 'पता नहीं चल सका — अनुमति दें या खुद लिखें',
  'set.type.gps': 'GPS (स्वतः मिला)',
  'set.type.ip': 'IP (स्वतः मिला)',
  'set.type.manual': 'हाथ से',
  'set.language.title': 'भाषा',
  'set.language.hint': 'पूरी ऐप आपकी चुनी हुई भाषा में चलेगी।',

  'ui.loc.title': 'पहले सेटिंग्स में स्थान सेट करें',
  'ui.loc.hint': 'उसके बाद आपको अपने शहर के नमाज़ के वक्त और मौसम मिलेंगे',
  'ui.loc.button': 'सेटिंग्स खोलें',
  'app.bootError': 'ऐप शुरू नहीं हो सकी — फिर कोशिश करें',
  'app.loading': 'तैयार हो रहा है…',

  'err.invalidLocation': 'स्थान गलत लग रहा है — सेटिंग्स में फिर सेट करें',
  'err.offlineFirst': 'इंटरनेट नहीं — पहली बार डाउनलोड ज़रूरी है',
  'err.times': 'नमाज़ के वक्त नहीं मिले',
  'err.offlineSaved': 'इंटरनेट नहीं — सहेजा गया डेटा दिखा रहे हैं',
  'err.noEntry': 'इस तारीख़ के वक्त नहीं मिले',
  'err.hijriFetch': 'इस्लामी कैलेंडर लोड नहीं हुआ',
  'err.hijriEmpty': 'इस्लामी कैलेंडर खाली था — फिर कोशिश करें',
  'err.hijriDate': 'हिजरी तारीख़ नहीं मिली',
  'err.timeout': 'नेटवर्क धीमा है — फिर कोशिश करें',
  'err.http': 'अनुरोध विफल ({{status}})',
  'err.network': 'इंटरनेट कनेक्शन नहीं',
  'err.geocode': 'जगह नहीं मिली — शहर का नाम जाँचें',
  'err.ipDetect': 'स्थान का पता नहीं चल सका',

  'weather.unavailable': 'मौसम उपलब्ध नहीं',
  'wmo.0': 'साफ़ आसमान',
  'wmo.1': 'मुख्यतः साफ़',
  'wmo.2': 'आंशिक रूप से बादल',
  'wmo.3': 'बादल छाए',
  'wmo.45': 'कोहरा',
  'wmo.48': 'पाला कोहरा',
  'wmo.51': 'हल्की बूंदाबांदी',
  'wmo.53': 'बूंदाबांदी',
  'wmo.55': 'तेज़ बूंदाबांदी',
  'wmo.56': 'जमी हुई बूंदाबांदी',
  'wmo.57': 'भारी जमी हुई बूंदाबांदी',
  'wmo.61': 'हल्की बारिश',
  'wmo.63': 'बारिश',
  'wmo.65': 'भारी बारिश',
  'wmo.66': 'जमी हुई बारिश',
  'wmo.67': 'भारी जमी हुई बारिश',
  'wmo.71': 'हल्की बर्फबारी',
  'wmo.73': 'बर्फबारी',
  'wmo.75': 'भारी बर्फबारी',
  'wmo.77': 'बर्फ के दाने',
  'wmo.80': 'हल्की बौछार',
  'wmo.81': 'बौछार',
  'wmo.82': 'तेज़ बौछार',
  'wmo.85': 'बर्फ की बौछार',
  'wmo.86': 'भारी बर्फ की बौछार',
  'wmo.95': 'तूफ़ान',
  'wmo.96': 'ओले के साथ तूफ़ान',
  'wmo.99': 'भारी तूफ़ान',
}

/** Roman Urdu = the app's legacy copy; only keys that differ from English. */
const rom = {
  'common.wrong': 'Kuch ghalat ho gaya',
  'common.skip': 'Abhi chhod dein',

  'ob.step': 'Step {{n}} az 2',
  'ob.lang.title': 'Apni zaban muntakhib karein',
  'ob.lang.hint': 'Ye baad mein Settings mein badal sakte hain.',
  'ob.loc.title': 'Apni location set karein',
  'ob.loc.hint': 'Prayer times aapki jagah par munhasir hain.',
  'ob.loc.auto': 'Khud dhoondein (GPS)',
  'ob.loc.manual': 'Mera shehar dhoondein',
  'ob.loc.detecting': 'Location dhoondi ja rahi hai…',
  'ob.loc.failed': 'Auto detect nahi hui — neeche search karein',
  'ob.loc.skip': 'Abhi chhod dein',

  'home.remaining': 'baqi waqt',
  'home.table.section': 'Aaj ki nawazein · Hanafi Asr',
  'home.elevation': 'Bulandi {{ft}} ft',
  'home.approxLocation': 'Location andaza se li gayi hai — Settings mein GPS ya haath se set karein.',

  'caption.endsIn': '{{name}} ka waqt khatam hone mein',

  'cal.syncError': 'Hijri date sync nahi ho saki — internet check karein',
  'cal.loadError': 'Calendar nahi mil saka',
  'cal.monthFallback': 'Month {{n}}',

  'set.loc.unset': 'Location set nahi hui',
  'set.find': 'Location dhoondein',
  'set.find.hint':
    'Naam likhein — jaise "Jhang" — aur neeche apne aap jagahon ki list aa jayegi. List se apni jagah tap karein.',
  'set.find.placeholder': 'City, town ya mohalla…',
  'set.searching': 'Dhoond rahe hain…',
  'set.noResults': 'Koi jagah nahi mili — dobara likhein',
  'set.auto.title': 'Ya ek tap mein auto-detect',
  'set.auto.hint':
    'GPS (bilkul sahi) — agar permission na de toh aapke shehar ke hisaab se. Prayer times aapke asal maqam se match karne ke liye GPS behtar hai.',
  'set.auto.button': 'Location auto-detect karein',
  'set.saved': 'Location save ho gayi ✓',
  'set.saveFailed': 'Location save nahi hui — dobara try karein',
  'set.detected': 'Location auto mili: {{label}}',
  'set.detectFailed': 'Location detect nahi hui — permission allow karein ya haath se likhein',
  'set.language.title': 'Zaban',
  'set.language.hint': 'Poori app aapki chuni hui zaban mein chalegi.',

  'ui.loc.title': 'Pehle Settings mein location set karein',
  'ui.loc.hint': 'Location ke baad aapko apne shehar ke prayer times aur weather milenge',
  'app.bootError': 'App start nahi ho payi — dobara try karein',

  'err.invalidLocation': 'Location sahi nahi hai, Settings mein dobara set karein',
  'err.offlineFirst': 'Internet nahi mila — pehli baar ka data download nahi ho saka',
  'err.times': 'Prayer times nahi mil sake',
  'err.offlineSaved': 'Internet nahi mila — purana saved data dikha rahe hain',
  'err.noEntry': 'Is date ke liye times nahi mile',
  'err.hijriFetch': 'Islamic calendar nahi mil saka',
  'err.hijriEmpty': 'Islamic calendar khali tha — dobara try karein',
  'err.hijriDate': 'Hijri date nahi mil saki',
  'err.timeout': 'Network slow hai — dobara try karein',
  'err.network': 'Internet nahi mila',
  'err.geocode': 'Location nahi mili — city ka naam check karein',
  'err.ipDetect': 'Location khud se detect nahi ho saki',
}

const MESSAGES = { en, ur, hi, rom }

/** lang → key → text, with English (then the key itself) as the fallback. */
export function translate(lang, key, params) {
  const table = MESSAGES[lang] || MESSAGES[DEFAULT_LANG]
  let text = table && Object.prototype.hasOwnProperty.call(table, key) ? table[key] : en[key]
  if (text === undefined || text === null) text = key
  if (params) {
    Object.keys(params).forEach((name) => {
      text = String(text).split(`{{${name}}}`).join(String(params[name]))
    })
  }
  return text
}

/** Translate with the active language (services and plain modules use this). */
export function t(key, params) {
  return translate(activeLang, key, params)
}

/* ------------------------------------------------------------------ */
/* Names: prayers and the day's other events                           */
/* ------------------------------------------------------------------ */

/** en/rom read straight from the data's `label`; these cover ur/hi + en. */
export const PRAYER_NAMES = {
  Fajr: { en: 'Fajr', ur: 'فجر', hi: 'फज्र' },
  Sunrise: { en: 'Sunrise', ur: 'طلوع آفتاب', hi: 'सूर्योदय' },
  Dhuhr: { en: 'Dhuhr', ur: 'ظہر', hi: 'ज़ुहर' },
  Asr: { en: 'Asr', ur: 'عصر', hi: 'असर' },
  Maghrib: { en: 'Maghrib', ur: 'مغرب', hi: 'मग़रिब' },
  Isha: { en: 'Isha', ur: 'عشاء', hi: 'इशा' },
}

/** The small line under the prayer's name (rom = the legacy Roman sublabel). */
export const PRAYER_SUBS = {
  Fajr: { en: 'Dawn', ur: 'صبح کا وقت', hi: 'भोर', rom: 'Fajr' },
  Sunrise: { en: 'Sun rises', ur: 'سورج نکلتا ہے', hi: 'सूर्य निकलता है', rom: 'Suraj charhta hai' },
  Dhuhr: { en: 'Noon', ur: 'دوپہر', hi: 'दोपहर', rom: 'Zuhr' },
  Asr: { en: 'Hanafi', ur: 'حنفی عصر', hi: 'हनफ़ी असर', rom: 'Asr (Hanafi)' },
  Maghrib: { en: 'Sunset', ur: 'سورج گرتا ہے', hi: 'सूर्यास्त', rom: 'Maghrib' },
  Isha: { en: 'Night', ur: 'رات کی نماز', hi: 'रात की नमाज़', rom: 'Isha (Hanafi)' },
}

/** Day events: Latin labels live on the item; these add the other scripts. */
export const EVENT_NAMES = {
  talu: { ur: 'طلوع آفتاب', hi: 'तलु-ए-आफ़्ताब' },
  ishraq: { ur: 'اشراق', hi: 'इशराक' },
  duhaSughra: { ur: 'ضحیٰ سغراٰ', hi: 'ज़ोहा-ए-सुघरा' },
  duhaKubra: { ur: 'ضحیٰ کبریٰ', hi: 'ज़ोहा-ए-कुबरा' },
  zawal: { ur: 'زوال (مکروہ)', hi: 'ज़वाल (मक्रूह)' },
  midnight: { ur: 'نصف اللیل', hi: 'निस्फ़ अल-लैल' },
  lastthird: { ur: 'تیسرا حصہ', hi: 'तीसरा हिस्सा' },
}

/**
 * Main name for a prayer/event row in `lang` (falls back to the label).
 * Keyed on the prayer tables — not on `isPrayer` — so Sunrise (a table row
 * that is not a prayer) gets translated like its neighbours.
 */
export function displayName(item, lang = activeLang) {
  if (!item) return ''
  const prayer = PRAYER_NAMES[item.key]
  if (prayer) {
    const name = prayer[lang]
    if (name) return name
    return item.label || ''
  }
  const event = EVENT_NAMES[item.key]
  if (event && (lang === 'ur' || lang === 'hi') && event[lang]) return event[lang]
  return item.label || ''
}

/**
 * Secondary line under the name: prayer gloss (rom = legacy sublabel),
 * events keep their Arabic — except in Urdu, where the label is the Latin
 * transliteration (so a row never repeats the same word twice).
 */
export function displaySub(item, lang = activeLang) {
  if (!item) return ''
  const subs = item.key ? PRAYER_SUBS[item.key] : null
  if (subs) return subs[lang] || subs.en || item.urdu || item.label || ''
  if (lang === 'ur') return item.label || ''
  return item.urdu || item.label || ''
}

/** Name used inside the countdown sentence ("Zuhr ka waqt khatam hone mein"). */
export function captionName(item, lang = activeLang) {
  if (!item) return ''
  if (lang === 'rom') return item.isPrayer ? displaySub(item, lang) : displayName(item, lang)
  return displayName(item, lang)
}
