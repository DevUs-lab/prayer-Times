import React, { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Card, ErrorState, Loading, PrimaryButton } from '../../../Components/ui'
import { Ornament, PatternBand } from '../../../Components/Ornament'
import Icon, { ICONS } from '../../../Components/icons'
import { colors, radius, shadow, spacing } from '../../../Components/theme'
import { intlLocale, rtlStyle, t, useLang } from '../../../i18n'
import {
  HIJRI_MONTHS,
  getHijriForDate,
  getHijriMonthDays,
  hijriMonthDisplay,
  hijriMonthName,
} from '../../Services/prayerTimes'
import { fromDmy, pad2 } from '../../../utils/date'

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function formatGregorian(iso, locale) {
  const date = fromDmy(iso)
  if (!date) return String(iso || '')
  try {
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch (e) {
    try {
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    } catch (e2) {
      return iso
    }
  }
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets()
  const { lang } = useLang() // re-render on language change; strings use `t`
  const [hMonth, setHMonth] = useState(null)
  const [hYear, setHYear] = useState(null)
  const [todayHijri, setTodayHijri] = useState(null)
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  // Work out which Hijri month we are in right now.
  const initToday = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const hijri = await getHijriForDate(new Date())
      setTodayHijri(hijri)
      setHMonth(Number(hijri.month.number))
      setHYear(Number(hijri.year))
    } catch (e) {
      setError(t('cal.syncError'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    initToday()
  }, [initToday])

  const loadDays = useCallback(async (month, year) => {
    setLoading(true)
    setError('')
    try {
      const data = await getHijriMonthDays(month, year)
      setDays(data)
    } catch (e) {
      setDays([])
      setError(e && e.message ? e.message : t('cal.loadError'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hMonth || !hYear) return
    loadDays(hMonth, hYear)
  }, [hMonth, hYear, loadDays])

  const step = (delta) => {
    if (!hMonth) return
    let month = hMonth + delta
    let year = hYear
    if (month > 12) {
      month = 1
      year += 1
    } else if (month < 1) {
      month = 12
      year -= 1
    }
    setHMonth(month)
    setHYear(year)
  }

  const goToToday = () => {
    if (!todayHijri) return
    setHMonth(Number(todayHijri.month.number))
    setHYear(Number(todayHijri.year))
  }

  const isCurrentMonth =
    todayHijri &&
    hMonth === Number(todayHijri.month.number) &&
    hYear === Number(todayHijri.year)

  const firstGregorian = days[0]?.gregorian?.date
  const lastGregorian = days[days.length - 1]?.gregorian?.date
  const firstDate = firstGregorian ? fromDmy(firstGregorian) : null
  const leadingBlanks = firstDate ? firstDate.getUTCDay() : 0
  const cells = []
  for (let i = 0; i < leadingBlanks; i += 1) cells.push(null)
  days.forEach((day) => cells.push(day))
  while (cells.length % 7 !== 0) cells.push(null)

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const isToday = (day) => {
    if (!todayHijri || !day) return false
    return (
      Number(day.hijri.day) === Number(todayHijri.day) &&
      Number(day.hijri.month.number) === Number(todayHijri.month.number) &&
      Number(day.hijri.year) === Number(todayHijri.year)
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.m }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.header}>
          <PatternBand count={10} />

          <View style={styles.navRow}>
            <Pressable
              onPress={() => step(-1)}
              style={styles.navButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('cal.prev')}
            >
              <Icon name={ICONS.chevronLeft} size={26} color={colors.gold} />
            </Pressable>

            <Pressable style={styles.titleWrap} onPress={() => setPickerOpen(true)}>
              <Text style={styles.monthTitle}>{hijriMonthName(hMonth, lang)}</Text>
              <Text style={styles.yearTitle}>{hYear} AH</Text>
              <View style={styles.changeHint}>
                <Text style={styles.changeHintText}>{t('cal.change')}</Text>
                <Icon name={ICONS.chevronDown} size={14} color={colors.textFaint} />
              </View>
            </Pressable>

            <Pressable
              onPress={() => step(1)}
              style={styles.navButton}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('cal.next')}
            >
              <Icon name={ICONS.chevronRight} size={26} color={colors.gold} />
            </Pressable>
          </View>

          <Ornament />

          {firstGregorian && lastGregorian ? (
            <Text style={styles.range}>
              {formatGregorian(firstGregorian, intlLocale(lang))} —{' '}
              {formatGregorian(lastGregorian, intlLocale(lang))}
            </Text>
          ) : null}

          {!isCurrentMonth ? (
            <Pressable onPress={goToToday} style={styles.todayButton}>
              <Icon name={ICONS.calendar} size={16} color={colors.onGold} />
              <Text style={styles.todayButtonText}>{t('cal.today')}</Text>
            </Pressable>
          ) : null}
        </Card>

        <View style={styles.weekdayRow}>
          {WEEKDAY_KEYS.map((day) => (
            <Text key={day} style={styles.weekday}>
              {t(`cal.week.${day}`)}
            </Text>
          ))}
        </View>

        {loading ? (
          <Loading label={t('cal.loading')} />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => (hMonth && hYear ? loadDays(hMonth, hYear) : initToday())}
          />
        ) : (
          <View style={styles.grid}>
            {weeks.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={styles.weekRow}>
                {week.map((day, index) => {
                  if (!day) return <View key={`blank-${weekIndex}-${index}`} style={styles.cell} />

                  const today = isToday(day)

                  return (
                    <View
                      key={day.gregorian.date}
                      style={[styles.cell, today && styles.cellToday]}
                    >
                      <Text style={[styles.hijriDay, today && styles.cellTodayText]}>
                        {Number(day.hijri.day)}
                      </Text>
                      <Text style={[styles.gregorianDay, today && styles.cellTodaySub]}>
                        {pad2(Number(day.gregorian.day))}
                      </Text>
                      {Number(day.hijri.day) === 1 ? (
                        <Text style={styles.monthMarker} numberOfLines={1}>
                          {String(hijriMonthDisplay(day.hijri.month, lang)).slice(0, 3)}
                        </Text>
                      ) : null}
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.legend, rtlStyle(lang)]}>{t('cal.legend')}</Text>
      </ScrollView>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('cal.select')}</Text>

            <View style={styles.yearRow}>
              <Pressable
                onPress={() => setHYear((year) => (year || new Date().getFullYear()) - 1)}
                style={styles.yearButton}
                accessibilityRole="button"
                accessibilityLabel={t('cal.prevYear')}
              >
                <Text style={styles.yearButtonText}>−</Text>
              </Pressable>
              <Text style={styles.yearValue}>{hYear} AH</Text>
              <Pressable
                onPress={() => setHYear((year) => (year || new Date().getFullYear()) + 1)}
                style={styles.yearButton}
                accessibilityRole="button"
                accessibilityLabel={t('cal.nextYear')}
              >
                <Text style={styles.yearButtonText}>+</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.monthList} showsVerticalScrollIndicator={false}>
              {HIJRI_MONTHS.map((month) => {
                const selected = month.number === hMonth
                // Urdu mode names the row in Arabic and shows Latin second;
                // the other languages keep Arabic as the familiar second line.
                const primary = hijriMonthName(month.number, lang)
                const secondary = lang === 'ur' ? month.en : month.ar
                return (
                  <Pressable
                    key={month.number}
                    style={[styles.monthItem, selected && styles.monthItemSelected]}
                    onPress={() => {
                      setHMonth(month.number)
                      setPickerOpen(false)
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[styles.monthItemName, selected && styles.monthItemTextSelected]}
                    >
                      {primary}
                    </Text>
                    <Text
                      style={[styles.monthItemArabic, selected && styles.monthItemTextSelected]}
                    >
                      {secondary}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            <PrimaryButton title={t('common.close')} onPress={() => setPickerOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.xxl,
    gap: spacing.m,
  },
  header: {
    backgroundColor: colors.cardDeep,
    ...shadow,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.text,
  },
  yearTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.gold,
    marginTop: 2,
  },
  changeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  changeHintText: {
    fontSize: 11,
    color: colors.textFaint,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  range: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  todayButton: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.s,
    paddingHorizontal: spacing.m,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },
  todayButtonText: {
    color: colors.onGold,
    fontWeight: '800',
    fontSize: 13,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 0.8,
  },
  grid: {
    gap: 6,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cell: {
    flex: 1,
    aspectRatio: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardDeep,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.s,
  },
  cellToday: {
    backgroundColor: colors.gold,
    borderColor: colors.goldBright,
  },
  cellTodayText: {
    color: colors.onGold,
  },
  cellTodaySub: {
    color: colors.onGold,
    opacity: 0.75,
  },
  hijriDay: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  gregorianDay: {
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 1,
    fontWeight: '600',
  },
  monthMarker: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.gold,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  legend: {
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 26, 19, 0.72)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    gap: spacing.m,
    maxHeight: '82%',
    ...shadow,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.gold,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.l,
  },
  yearButton: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.cardDeep,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearButtonText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.gold,
    lineHeight: 26,
  },
  yearValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    minWidth: 96,
    textAlign: 'center',
  },
  monthList: {
    flexGrow: 0,
  },
  monthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: spacing.m,
    borderRadius: radius.s,
    marginBottom: 6,
    backgroundColor: colors.cardDeep,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  monthItemSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.goldBright,
  },
  monthItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  monthItemArabic: {
    fontSize: 16,
    color: colors.textMuted,
  },
  monthItemTextSelected: {
    color: colors.onGold,
  },
})
