import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import Icon, { ICONS } from './icons'
import { colors, spacing } from './theme'
import { displayName, displaySub, useLang } from '../i18n'
import { formatTime12 } from '../utils/date'
import { buildAllTimesList, dayEpochNow } from '../Screens/Services/prayerTimes'

/**
 * "All times" — Home ke prayer-table ki EZAFATI view (modal nahi): poora din
 * EK hi sorted list mein, table ke hi style ki rows ke saath —
 *
 *   Fajr · guraiz · Sunrise · guraiz · Ishraq · Duha-e-Kubra · guraiz ·
 *   Dhuhr · Asr (Shafi pehle, phir Hanafi) · guraiz · Maghrib ·
 *   Isha (Shafi, phir Hanafi) · Nisf al-Layl · Afzal time of night
 *
 * SectionTitle ka action ("All times" ⇄ "Show five prayers") ise expand /
 * collapse karta hai — Home `LayoutAnimation` se transition smooth rakhta
 * hai. Order `buildAllTimesList` deta hai (din Fajr se shuru, raat wrap karke
 * aakhir mein), guraiz ke khitte waqt ki jagah par, Shafi row trust fail par
 * chhup jaati hai (galat waqt dikhane se behtar).
 *
 * Props: `windows` (Home ka withWindows list), `events` (buildDayEvents),
 * `extras` (getPrayerDay day.extras — yahin se asrShafi/ishaShafi aate hain),
 * `currentKey` + `now` — table wala NOW highlight aur past dimming barqarar
 * rakhte hain. Dimming SAB rows par ek hi rule se (Fajr-anchored epoch):
 * guraiz, Ishraq, Duha — jo waqt chal chuka, sab faint; START waqt hamesha
 * bright (table ki tarah). Raat ke wrap rows (Nisf/Afzal) sahi future/past.
 */
export default function AllTimesPanel({
  windows = [],
  events = [],
  extras = {},
  currentKey = null,
  now = null,
}) {
  const { t, lang } = useLang()
  const rows = buildAllTimesList({ windows, events, extras })
  if (rows.length === 0) return null

  // Past dimming — table ke hi rules par, par SAB rows ke liye (guraiz,
  // Ishraq/Duha bhi). Epoch Fajr = 0 se shuru (dayEpochNow), isliye 15:00
  // par Afzal (raat 02:00) future hi rehta hai; [00:00, Fajr) → null = kuch
  // past nahi, poora din aane wala hai.
  const nowEpoch = dayEpochNow({ windows, now })

  return (
    <>
      {rows.map((row, rowIndex) => {
        const item = row.item
        const isCurrent = row.kind === 'prayer' && currentKey === row.prayerKey
        // Sunrise dim nahi (isPrayer false — table bhi aisa hi karta hai),
        // baaki prayer/school/event/makruh: waqt chal gaya to faint.
        const isPast =
          !isCurrent &&
          nowEpoch != null &&
          (row.kind !== 'prayer' || !!row.isPrayer) &&
          row.epoch < nowEpoch

        const name = row.kind === 'makruh' ? t('all.row.makruh') : displayName(item, lang)
        // guraiz + events: chhoti i18n gloss — bilkul table ki sub line jaisi
        const sub =
          row.kind === 'makruh' || row.kind === 'event'
            ? t(row.subKey)
            : row.kind === 'school'
              ? t('all.shafi')
              : row.schoolPair
                ? t('all.hanafi')
                : displaySub(item, lang)
        // Har row ka icon prayer-table jaisa: calm outline, koi laal nishan nahi
        const icon = row.kind === 'makruh' ? ICONS.clock : item.icon
        const iconColor = isCurrent ? colors.gold : colors.textMuted

        return (
          <View
            key={row.id}
            style={[styles.row, rowIndex > 0 && styles.rowBorder, isCurrent && styles.rowNext]}
          >
            <View style={styles.colName}>
              <Icon name={icon} size={22} color={iconColor} />
              <View style={styles.nameText}>
                <Text style={[styles.prayerName, isPast && styles.pastText]}>{name}</Text>
                <Text style={[styles.prayerUrdu, isPast && styles.pastText]}>{sub}</Text>
              </View>
            </View>

            <Text
              numberOfLines={1}
              style={[styles.colTime, styles.timeStart, isCurrent && styles.timeNext]}
            >
              {formatTime12(row.time)}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.colTime, styles.timeEnd, isPast && styles.pastText]}
            >
              {row.end ? formatTime12(row.end) : '—'}
            </Text>
          </View>
        )
      })}

      <Text style={styles.note}>{t('all.note')}</Text>
    </>
  )
}

// Wahi rows jo Home ke prayer-table mein hain — "All times" bas list lambi
// karti hai, style ka pattern alag nahi hota.
const styles = StyleSheet.create({
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
    // 12 px font par "12:04:22 PM" ≈ 83 px — 74 par do line toot jata tha
    width: 86,
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
  note: {
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.xs,
    paddingBottom: spacing.s,
  },
})
