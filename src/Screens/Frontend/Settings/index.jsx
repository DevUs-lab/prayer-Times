import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Card, LocationIssueModal, PrimaryButton, SectionTitle } from '../../../Components/ui'
import { PatternBand } from '../../../Components/Ornament'
import Icon, { ICONS } from '../../../Components/icons'
import { colors, radius, spacing } from '../../../Components/theme'
import PlaceSearch from '../../../Components/PlaceSearch'
import { LANGS, rtlStyle, t, useLang } from '../../../i18n'
import { detectLocationAutomatically, locationLabel } from '../../Services/geocode'
import { getElevation } from '../../Services/elevation'
import { saveLocation } from '../../Services/locationStorage'

const LOCATION_TYPES = ['gps', 'ip', 'manual']

function typeLabel(type) {
  return LOCATION_TYPES.includes(type) ? t(`set.type.${type}`) : String(type || '')
}

export default function SettingsScreen({ location, onSaved }) {
  const insets = useSafeAreaInsets()
  const { lang, setLang } = useLang()
  const [message, setMessage] = useState('')
  // Message ab i18n KEY hai (render par t(key) se banta hai) — warna zubaan
  // badalne par purani zubaan ka message screen par pada reh jata.
  const [messageParams, setMessageParams] = useState(null)
  // Error par tick nahi dikhta — X (lal). Ye flag sirf messageBox ka hai.
  const [messageIsError, setMessageIsError] = useState(false)
  const [busy, setBusy] = useState(null)
  // GPS/permission fail → theme wala modal (service `{ issue }` lauta hai)
  const [locationIssue, setLocationIssue] = useState(null)

  const show = (key, isError = false, params) => {
    setMessage(key)
    setMessageParams(params || null)
    setMessageIsError(isError)
  }

  // Saves the picked place. A failure rethrows so PlaceSearch keeps the
  // typed query (the message below explains why nothing was saved).
  const choose = async (place) => {
    setBusy(place.label)
    try {
      const next = {
        type: 'manual',
        name: place.name,
        country: place.country,
        latitude: place.latitude,
        longitude: place.longitude,
        label: place.label,
      }
      await saveLocation(next)
      // Unchai save hi ho gayi — pehli dafa offline sunrise/Maghrib sahi
      // rahein. Intezar nahi karte (await nahi), apni raftaar par.
      getElevation(next.latitude, next.longitude).catch(() => {})
      onSaved(next)
      show('set.saved')
    } catch (e) {
      show('set.saveFailed', true)
      throw e
    } finally {
      setBusy(null)
    }
  }

  const autoDetect = async () => {
    setBusy('auto')
    show('')
    try {
      const next = await detectLocationAutomatically()
      if (next.issue) {
        // GPS/permission band — modal batata hai ke settings kholein
        setLocationIssue(next.issue)
        return
      }
      await saveLocation(next)
      getElevation(next.latitude, next.longitude).catch(() => {})
      onSaved(next)
      show('set.detected', false, { label: locationLabel(next) })
    } catch (e) {
      show('set.detectFailed', true)
    } finally {
      setBusy(null)
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.m }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Language — the same four choices as the first-run intro */}
      <SectionTitle>{t('set.language.title')}</SectionTitle>
      <Card>
        <Text style={[styles.hint, rtlStyle(lang), lang === 'ur' && styles.hintRtl]}>
          {t('set.language.hint')}
        </Text>
        <View style={styles.langRow}>
          {LANGS.map((entry) => {
            const selected = lang === entry.id
            return (
              <Pressable
                key={entry.id}
                onPress={() => setLang(entry.id)}
                style={[styles.langChip, selected && styles.langChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[styles.langChipText, selected && styles.langChipTextActive]}
                  numberOfLines={1}
                >
                  {entry.native}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </Card>

      {/* Current location */}
      <Card>
        <PatternBand count={8} />
        <View style={styles.locationRow}>
          <Icon name={ICONS.place} size={26} color={colors.gold} />
          <View style={styles.locationText}>
            <Text style={styles.locationLabel}>
              {location ? locationLabel(location) : t('set.loc.unset')}
            </Text>
            {location ? (
              <Text style={styles.coordinates}>
                {Number(location.latitude).toFixed(4)}, {Number(location.longitude).toFixed(4)} ·{' '}
                {typeLabel(location.type)}
              </Text>
            ) : null}
          </View>
        </View>
      </Card>

      {/* Search with live suggestions */}
      <SectionTitle>{t('set.find')}</SectionTitle>
      <Card>
        <Text style={[styles.hint, rtlStyle(lang), lang === 'ur' && styles.hintRtl]}>
          {t('set.find.hint')}
        </Text>
        <PlaceSearch onChoose={choose} disabled={busy !== null} />
      </Card>

      {/* Auto detect */}
      <SectionTitle>{t('set.auto.title')}</SectionTitle>
      <Card>
        <Text style={[styles.hint, rtlStyle(lang), lang === 'ur' && styles.hintRtl]}>
          {t('set.auto.hint')}
        </Text>
        <PrimaryButton
          title={t('set.auto.button')}
          icon={ICONS.crosshair}
          onPress={autoDetect}
          busy={busy === 'auto'}
          disabled={busy !== null && busy !== 'auto'}
        />
      </Card>

      {message ? (
        <View style={styles.messageBox}>
          <Icon
            name={messageIsError ? ICONS.close : ICONS.check}
            size={16}
            color={messageIsError ? colors.danger : colors.gold}
          />
          {/* message = i18n key → zubaan badalne par dobara banta hai */}
          <Text style={styles.message}>{t(message, messageParams)}</Text>
        </View>
      ) : null}

      {/* GPS/permission issue: app ka apna themed modal (system Alert nahi).
          Settings se wapas aane par onRetry khud dobara detect karta hai. */}
      <LocationIssueModal
        issue={locationIssue}
        onClose={() => setLocationIssue(null)}
        onRetry={autoDetect}
      />
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
    paddingBottom: spacing.xxl,
    gap: spacing.s,
  },

  /* language chips */
  langRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  langChip: {
    paddingHorizontal: spacing.m,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardDeep,
  },
  langChipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.goldBright,
  },
  langChipText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textMuted,
  },
  langChipTextActive: {
    color: colors.onGold,
  },

  /* current location */
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  locationText: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  coordinates: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 3,
    fontWeight: '600',
  },

  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.m,
    lineHeight: 19,
    fontWeight: '600',
  },
  // Urdu paragraphs read better flush to the right (layout stays LTR).
  hintRtl: {
    textAlign: 'right',
  },

  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.s,
    padding: spacing.m,
    borderRadius: radius.pill,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.goldBright,
    textAlign: 'center',
  },
})
