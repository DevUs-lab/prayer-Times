import React, { useCallback, useEffect, useRef, useState } from 'react'

import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Card, ErrorState, Loading, LocationPrompt, SectionTitle } from '../../Components/ui'
import { Ornament, PatternBand } from '../../Components/Ornament'
import Icon, { ICONS } from '../../Components/icons'
import { colors, radius, shadow, spacing } from '../../Components/theme'
import { displaySub, displayName, intlLocale, t, useLang } from '../../i18n'
import { locationLabel } from '../Services/geocode'
import {
  buildDayEvents,
  computeNextItem,
  DEFAULT_METHOD,
  getPrayerDay,
  hijriMonthDisplay,
  syncIfNeeded,
  withWindows,
} from '../Services/prayerTimes'
import { fetchWeather, weatherInfo, windDirectionLabel } from '../Services/weather'

import {
  addDays, atTimeOn, formatCountdown, formatLongDate, formatTime12,
  formatWeekdayShort, nowInTimeZone, minutesFromMidnight,
} from '../../utils/date'
/**
 * Everything for the "next" card: the merged timeline of prayers + day
 * events, the countdown to the end of the current segment (e.g. "Zuhr ka
 * waqt khatam hone mein") and the progress bar. Recomputed on every render
 * (the 1s tick re-renders the screen).
 */
function buildCountdown(windows, events, tomorrowFajrTime, timezone) {
  if (!windows || windows.length === 0) return null

  const now = nowInTimeZone(timezone)
  const result = computeNextItem(windows, events, tomorrowFajrTime, now)
  if (!result.target) return null

  return { ...result, now }
}
/** Table ki wo row jo is waqt chal rahi hai (sirf asli namazen, Sunrise nahi). */
function findCurrentPrayerKey(windows, now) {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  for (const item of windows) {
    if (!item.isPrayer) continue
    const start = minutesFromMidnight(item.time)
    const end = minutesFromMidnight(item.end)
    if (start == null || end == null) continue

    // Isha jaisi row raat 12 ke paar chali jati hai (start > end)
    const running =
      start <= end ? nowMin >= start && nowMin < end : nowMin >= start || nowMin < end
    if (running) return item.key
  }
  return null
}

function hourLabel(iso) {
  const match = /T(\d{2}):(\d{2})/.exec(iso)
  if (!match) return ''
  const hours = Number(match[1])
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hours12}${suffix}`
}

function weekdayShort(dateIso, locale) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateIso))
  if (!match) return ''
  return formatWeekdayShort(
    new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))),
    locale,
  )
}
function Stat({ icon, label, value }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={18} color={colors.gold} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function Frontend({ location, onOpenSettings }) {
  const insets = useSafeAreaInsets()
  // Subscribes the screen to language changes (all strings below read the
  // active language at render time via `t`).
  const { lang } = useLang()
  const [today, setToday] = useState(null)
  const [tomorrow, setTomorrow] = useState(null)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [, setTick] = useState(0)
  // Aaj ka din — raat guzar jaye to timetable sirf ek baar refresh ho.
  const loadedDayRef = useRef(new Date().toDateString())

  // isRefresh = screen par naye data ki koshish (clear nahi karta)
  // pullSync   = user ne khud refresh kiya → poora saal dobara download
  const load = useCallback(
    async (isRefresh, pullSync) => {
      if (!location) return
      if (isRefresh) {
        setRefreshing(true)
      } else {
        // Purana din / purana shehar na dikhe — naya data aane tak saaf.
        setLoading(true)
        setToday(null)
        setTomorrow(null)
        setWeather(null)
      }
      setError('')

      // Pull-to-refresh: poora saal phone mein utaar do (internet ho to).
      // Nahi mila to bhi rukein nahi — cache ka purana data hi sahi.
      let syncNote = ''
      if (pullSync) {
        try {
          await syncIfNeeded({
            latitude: location.latitude,
            longitude: location.longitude,
            force: true,
          })
        } catch (e) {
          syncNote = t('err.offlineSaved')
        }
      }

      try {
        const now = new Date()
        const [todayData, tomorrowData, weatherData] = await Promise.all([
          getPrayerDay(now, location, DEFAULT_METHOD),
          getPrayerDay(addDays(now, 1), location, DEFAULT_METHOD),
          fetchWeather(location.latitude, location.longitude).catch(() => null),
        ])
        setToday(todayData)
        setTomorrow(tomorrowData)
        setWeather(weatherData)
        if (syncNote) setError(syncNote)

        // App khulna: peeche khamoshi se missing mahine bhar deta hai
        // (nayi jagah / naya saal / 30 din purana data). Internet na ho to
        // chupke se chhod deta hai — cache waise bhi mehfooz hai.
        if (!pullSync) {
          syncIfNeeded({ latitude: location.latitude, longitude: location.longitude }).catch(
            () => { },
          )
        }
      } catch (e) {
        setError(e && e.message ? e.message : t('err.times'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [location],
  )

  useEffect(() => {
    load(false)
  }, [load])

  // Ticking re-renders the countdown every second — aur jab din badal jaye to
  // naye din ke waqt khud le aata hai (sirf ek baar, isliye loadedDayRef).
  useEffect(() => {
    const id = setInterval(() => {
      setTick((value) => value + 1)
      const todayStr = new Date().toDateString()
      if (loadedDayRef.current && loadedDayRef.current !== todayStr) {
        loadedDayRef.current = todayStr // baar baar call se bachne ke liye
        load(true)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [load])

  // Times arrive with seconds straight from the day's calculation.
  const todayTimes = today ? today.times : []
  const tomorrowTimes = tomorrow ? tomorrow.times : []
  const tomorrowFajrTime = tomorrowTimes.find((item) => item.key === 'Fajr')?.time
  const windows = today ? withWindows(todayTimes, tomorrowFajrTime) : []
  // Talu-e-Aftab, Ishraq, Duha, zawal, midnight… travel on the same timeline
  // as the prayers, so they show up inside the "next" card.
  const dayEvents = today ? buildDayEvents({ times: todayTimes, extras: today.extras }) : []
  const countdown = buildCountdown(windows, dayEvents, tomorrowFajrTime, today?.timezone)

  if (!location) return <LocationPrompt onPress={onOpenSettings} />
  if (loading && !today) return <Loading label={t('home.loading')} />
  if (error && !today) return <ErrorState message={error} onRetry={() => load(false)} />

  const hijri = today?.hijri
  const nextInfo = countdown?.target
  const nowInfo = countdown?.current || null // what is running at this minute
  const rowInfo = nowInfo || nextInfo // the big row: Now — or Next before Fajr
  const weatherInfoBlock = weather ? weatherInfo(weather.current.code, weather.current.isDay) : null
  const nextPrayer = countdown?.nextPrayer || null

  // Table ki wo row jo is waqt chal rahi hai (sirf asli namazen, Sunrise nahi).
  // Agar koi namaz na chal rahi ho (misal: sunrise → Zuhr ka gap) to agli
  // namaz highlight ho jaye.
  const clock = nowInTimeZone(today?.timezone)
  const currentKey = findCurrentPrayerKey(windows, clock) || nextPrayer?.key || null

  // "Elevation 1338 ft · GMT +5.0" — altitude + UTC offset for the location.
  const metaBits = []
  if (weather && weather.elevationFeet != null) {
    metaBits.push(t('home.elevation', { ft: weather.elevationFeet }))
  }
  if (weather && weather.gmtOffset) metaBits.push(`GMT ${weather.gmtOffset}`)
  const metaLine = metaBits.join('   ·   ')

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.m }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true, true)}
          tintColor={colors.gold}
          colors={[colors.gold]}
        />
      }
    >
      {/* ---------- Header ---------- */}
      <Card style={styles.hero}>
        <PatternBand />
        <View style={styles.heroTop}>
          <Icon name={ICONS.mosque} size={32} color={colors.gold} />
          <View style={styles.heroTitles}>
            <Text style={styles.heroTitle}>{t('home.title')}</Text>
            <Text style={styles.heroPlace} numberOfLines={2} ellipsizeMode="tail">
              {locationLabel(location)}
            </Text>
          </View>
          <Pressable onPress={() => load(true, true)} hitSlop={10} accessibilityRole="button">
            <Icon name={ICONS.refresh} size={22} color={colors.goldBright} />
          </Pressable>
        </View>

        <Ornament />

        <Text style={styles.hijriDate}>
          {hijri
            ? `${Number(hijri.day)} ${hijriMonthDisplay(hijri.month, lang)} ${hijri.year}`
            : '—'}
        </Text>
        <Text style={styles.gregorianDate}>{formatLongDate(new Date(), intlLocale(lang))}</Text>

        {metaLine ? <Text style={styles.metaLine}>{metaLine}</Text> : null}

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}
      </Card>

      {/* ---------- Now + Next: a prayer OR a day event (Talu-e-Aftab…) ---------- */}
      {nextInfo && rowInfo ? (
        <Card style={styles.nowCard}>
          <View style={styles.nowHeader}>
            <Text style={styles.nowLabel}>{nowInfo ? t('home.now') : t('home.next')}</Text>
            <Text style={styles.nowEnds}>
              {nowInfo ? `${t('home.ends')} ` : `${t('home.starts')} `}
              {formatTime12(nextInfo.time)}
            </Text>
          </View>

          <View style={styles.nowRow}>
            <Icon name={rowInfo.icon} size={44} color={colors.gold} />
            <View style={styles.nowInfo}>
              <Text style={styles.nowName}>{displayName(rowInfo, lang)}</Text>
              <Text style={styles.nowTime}>
                {formatTime12(rowInfo.time)} ·  {displaySub(rowInfo, lang)}
              </Text>
            </View>
            <View style={styles.countdownWrap}>
              <Text style={styles.countdown}>{formatCountdown(countdown.remaining)}</Text>
              <Text style={styles.countdownCaption}>{t('home.remaining')}</Text>
            </View>
          </View>

          {/* What the countdown is counting down to, in the active language */}
          {countdown.caption ? (
            <View style={styles.waqtRow}>
              <Icon name={ICONS.clock} size={14} color={colors.gold} />
              <Text style={styles.waqtText}>{countdown.caption}</Text>
            </View>
          ) : null}

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round((countdown.progress || 0) * 100)}%` },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>
              {countdown.current
                ? `${displayName(countdown.current, lang)} ${formatTime12(countdown.current.time)}`
                : '—'}
            </Text>
            <Text style={styles.progressText}>{formatTime12(nextInfo.time)}</Text>
          </View>

          {/* What takes over when this segment ends (this is where events show up) */}
          {nowInfo ? (
            <View style={styles.nextLine}>
              <Text style={styles.nextTag}>{t('home.next')}</Text>
              <Text style={styles.nextValue}>{displayName(nextInfo, lang)}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* ---------- Prayer table ---------- */}
      <SectionTitle>{t('home.table.section')}</SectionTitle>
      <Card style={styles.listCard}>
        <View style={styles.tableHead}>
          <Text style={[styles.colName, styles.headText]}>{t('home.table.prayer')}</Text>
          <Text style={[styles.colTime, styles.headText]}>{t('home.table.starts')}</Text>
          <Text style={[styles.colTime, styles.headText]}>{t('home.table.ends')}</Text>
        </View>

        {windows.map((prayer, index) => {
          const isCurrent = currentKey === prayer.key
          const isPast =
            !isCurrent && countdown && prayer.isPrayer && prayer.time
              ? atTimeOn(countdown.now, prayer.time).getTime() < countdown.now.getTime()
              : false

          return (
            <View
              key={prayer.key}
              style={[
                styles.row,
                index > 0 && styles.rowBorder,
                isCurrent && styles.rowNext,
              ]}
            >
              <View style={styles.colName}>
                <Icon
                  name={prayer.icon}
                  size={22}
                  color={isCurrent ? colors.gold : colors.textMuted} />
                <View style={styles.nameText}>
                  <Text style={[styles.prayerName, isPast && styles.pastText]}>
                    {displayName(prayer, lang)}
                  </Text>
                  <Text style={[styles.prayerUrdu, isPast && styles.pastText]}>
                    {displaySub(prayer, lang)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.colTime, styles.timeStart, isCurrent && styles.timeNext]}>
                {formatTime12(prayer.time)}
              </Text>
              <Text style={[styles.colTime, styles.timeEnd, isPast && styles.pastText]}>
                {prayer.end ? formatTime12(prayer.end) : '—'}
              </Text>
            </View>
          )
        })}
      </Card>

      {/* ---------- Weather ---------- */}
      <SectionTitle>{t('home.weather.title')}</SectionTitle>

      {weather ? (
        <>
          <Card>
            <View style={styles.weatherHead}>
              <Icon name={weatherInfoBlock.icon} size={58} color={colors.gold} />
              <View style={styles.weatherTempBlock}>
                <Text style={styles.weatherTemp}>{Math.round(weather.current.temperature)}°C</Text>
                <Text style={styles.weatherLabel}>{weatherInfoBlock.label}</Text>
                <Text style={styles.weatherFeels}>
                  {t('home.weather.feels')} {Math.round(weather.current.feelsLike)}°
                  {weather.daily[0]
                    ? ` · H ${Math.round(weather.daily[0].max)}°  L ${Math.round(weather.daily[0].min)}°`
                    : ''}
                </Text>
              </View>
            </View>

            <Ornament />

            <View style={styles.statsRow}>
              <Stat
                icon={ICONS.humidity}
                label={t('home.weather.humidity')}
                value={`${weather.current.humidity}%`}
              />
              <Stat
                icon={ICONS.wind}
                label={t('home.weather.wind')}
                value={`${Math.round(weather.current.windSpeed)} ${windDirectionLabel(
                  weather.current.windDirection,
                )}`}
              />
              <Stat
                icon={ICONS.rain}
                label={t('home.weather.rain')}
                value={`${weather.current.precipitation ?? 0} mm`}
              />
              <Stat
                icon={ICONS.uv}
                label="UV"
                value={weather.daily[0] ? Math.round(weather.daily[0].uvIndex ?? 0) : '—'}
              />
            </View>

            <Ornament />

            <Text style={styles.subHead}>{t('home.weather.next8')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hourlyStrip}
            >
              {weather.hourly.slice(0, 8).map((hour) => (
                <View key={hour.time} style={styles.hourCell}>
                  <Text style={styles.hourTime}>{hourLabel(hour.time)}</Text>
                  <Icon
                    name={weatherInfo(hour.code, true).icon}
                    size={22}
                    color={colors.goldBright}
                  />
                  <Text style={styles.hourTemp}>{Math.round(hour.temperature)}°</Text>
                </View>
              ))}
            </ScrollView>
          </Card>

          <Card style={styles.forecastCard}>
            {weather.daily.map((day, index) => (
              <View key={day.date} style={[styles.forecastRow, index > 0 && styles.rowBorder]}>
                <Text style={styles.forecastDay}>
                  {index === 0
                    ? t('home.weather.today')
                    : weekdayShort(day.date, intlLocale(lang))}
                </Text>
                <Icon
                  name={weatherInfo(day.code, true).icon}
                  size={20}
                  color={colors.goldBright}
                />
                <Text style={styles.forecastRain}>{day.precipitationProbability ?? 0}%</Text>
                <View style={styles.forecastTemps}>
                  <Text style={styles.forecastMax}>{Math.round(day.max)}°</Text>
                  <Text style={styles.forecastMin}>{Math.round(day.min)}°</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : (
        <Card>
          <Text style={styles.weatherUnavailable}>{t('home.weather.none')}</Text>
        </Card>
      )}

      <Text style={styles.source}>Prayer times: Aladhan · Weather: Open-Meteo</Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.l,
    gap: spacing.s,
  },

  /* header */
  hero: {
    backgroundColor: colors.cardDeep,
    ...shadow,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  heroTitles: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 0.5,
  },
  heroPlace: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  hijriDate: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  gregorianDate: {
    fontSize: 14,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  metaLine: {
    fontSize: 12,
    color: colors.goldBright,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  inlineError: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.s,
    textAlign: 'center',
    fontWeight: '600',
  },

  /* now + next card */
  nowCard: {
    backgroundColor: colors.cardDeep,
    borderColor: colors.goldLine,
  },
  nowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nowLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  nowEnds: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  waqtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.s,
    paddingHorizontal: spacing.xs,
  },
  waqtText: {
    flex: 1,
    color: colors.gold,
    fontSize: 13,
    fontWeight: '800',
  },
  nowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.m,
    gap: spacing.m,
  },
  nowInfo: {
    flex: 1,
  },
  nowName: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  nowTime: {
    color: colors.goldBright,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  nextLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginTop: spacing.s,
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextTag: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  nextValue: {
    flex: 1,
    color: colors.goldBright,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  countdownWrap: {
    alignItems: 'flex-end',
  },
  countdown: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  countdownCaption: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginTop: spacing.l,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
  },

  /* prayer table */
  listCard: {
    padding: 0,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    paddingBottom: spacing.s,
    backgroundColor: colors.cardDeep,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 1.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingLeft: spacing.l,
    paddingRight: spacing.l,
    columnGap: spacing.s,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSoft,
  },
  rowNext: {
    backgroundColor: colors.goldSoft,
  },
  colName: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  nameText: {
    flex: 1,
  },
  colTime: {
    width: 74,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  prayerUrdu: {
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 1,
    fontWeight: '600',
  },
  timeStart: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.text,
  },
  timeNext: {
    color: colors.goldBright,
  },
  timeEnd: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  pastText: {
    color: colors.textFaint,
  },

  /* weather */
  weatherHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  weatherTempBlock: {
    flex: 1,
  },
  weatherTemp: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 44,
  },
  weatherLabel: {
    fontSize: 15,
    color: colors.goldBright,
    fontWeight: '700',
  },
  weatherFeels: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textFaint,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subHead: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 1.4,
    marginBottom: spacing.s,
  },
  hourlyStrip: {
    gap: spacing.s,
    paddingRight: spacing.s,
  },
  hourCell: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
    backgroundColor: colors.cardDeep,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    minWidth: 64,
  },
  hourTime: {
    fontSize: 11,
    color: colors.textFaint,
    fontWeight: '700',
  },
  hourTemp: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  forecastCard: {
    padding: 0,
    overflow: 'hidden',
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.l,
    gap: spacing.m,
  },
  forecastDay: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  forecastRain: {
    fontSize: 12,
    color: colors.textFaint,
    fontWeight: '700',
    width: 40,
    textAlign: 'right',
  },
  forecastTemps: {
    flexDirection: 'row',
    gap: spacing.s,
    width: 74,
    justifyContent: 'flex-end',
  },
  forecastMax: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  forecastMin: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textFaint,
  },
  weatherUnavailable: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  source: {
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.m,
    fontWeight: '600',
  },
})
