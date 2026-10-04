import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import Icon, { ICONS } from '../../Components/icons'
import { Card, PrimaryButton } from '../../Components/ui'
import { colors, radius, spacing } from '../../Components/theme'
import PlaceSearch from '../../Components/PlaceSearch'
import { LANGS, rtlStyle, useLang } from '../../i18n'
import { detectLocationAutomatically } from '../Services/geocode'
import { getElevation } from '../Services/elevation'
import { saveLocation } from '../Services/locationStorage'

/* ------------------------------------------------------------------ */
/* Step 1 — language (tap applies instantly, the shell moves on)       */
/* ------------------------------------------------------------------ */

export function LanguageStep({ onPicked }) {
  const { t, setLang, lang } = useLang()
  const insets = useSafeAreaInsets()

  const pick = (id) => {
    setLang(id)
    if (onPicked) onPicked(id)
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.centered, { paddingTop: insets.top + spacing.xl }]}
    >
      <Icon name={ICONS.mosque} size={46} color={colors.gold} />
      <Text style={styles.stepBadge}>{t('ob.step', { n: 1 })}</Text>
      <Text style={styles.title}>{t('ob.lang.title')}</Text>
      <Text style={[styles.hint, rtlStyle(lang)]}>{t('ob.lang.hint')}</Text>

      <View style={styles.list}>
        {LANGS.map((entry) => {
          const selected = lang === entry.id
          return (
            <Pressable
              key={entry.id}
              onPress={() => pick(entry.id)}
              style={[styles.langCard, selected && styles.langCardActive]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <View style={styles.langTexts}>
                <Text style={styles.langNative} numberOfLines={1}>
                  {entry.native}
                </Text>
                <Text style={styles.langLabel}>{entry.label}</Text>
              </View>
              <Icon
                name={selected ? ICONS.check : ICONS.chevronRight}
                size={20}
                color={selected ? colors.gold : colors.textFaint}
              />
            </Pressable>
          )
        })}
      </View>
    </ScrollView>
  )
}

/* ------------------------------------------------------------------ */
/* Step 2 — location (auto-detect or search, with a skip as a last     */
/* resort so nobody ever gets stuck here)                              */
/* ------------------------------------------------------------------ */

export function LocationStep({ onDone, onSkip }) {
  const { t, lang } = useLang()
  const insets = useSafeAreaInsets()
  const [mode, setMode] = useState('choose')
  const [busy, setBusy] = useState(null)
  const [failed, setFailed] = useState(false)

  const autoDetect = async () => {
    setBusy('auto')
    setFailed(false)
    try {
      const next = await detectLocationAutomatically()
      await saveLocation(next)
      // Unchai save hote hi cache — pehla download offline ho to bhi
      // sunrise/Maghrib sahi nikle. (await nahi: ye raasta nahi rokta.)
      getElevation(next.latitude, next.longitude).catch(() => {})
      onDone(next)
    } catch (e) {
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  const choose = async (place) => {
    const next = {
      type: 'manual',
      name: place.name,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      label: place.label,
    }
    await saveLocation(next) // PlaceSearch keeps the query if this throws
    getElevation(next.latitude, next.longitude).catch(() => {})
    onDone(next)
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.centered, { paddingTop: insets.top + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Icon name={ICONS.place} size={46} color={colors.gold} />
      <Text style={styles.stepBadge}>{t('ob.step', { n: 2 })}</Text>
      <Text style={styles.title}>{t('ob.loc.title')}</Text>
      <Text style={[styles.hint, rtlStyle(lang)]}>{t('ob.loc.hint')}</Text>

      {mode === 'choose' ? (
        <View style={styles.actions}>
          <PrimaryButton
            title={t('ob.loc.auto')}
            icon={ICONS.crosshair}
            onPress={autoDetect}
            busy={busy === 'auto'}
          />
          <PrimaryButton
            title={t('ob.loc.manual')}
            icon={ICONS.search}
            onPress={() => setMode('search')}
            disabled={busy !== null}
          />
          {failed ? <Text style={styles.failed}>{t('ob.loc.failed')}</Text> : null}
        </View>
      ) : (
        <Card style={styles.searchCard}>
          <PlaceSearch onChoose={choose} disabled={busy !== null} />
        </Card>
      )}

      <Pressable onPress={onSkip} hitSlop={8} accessibilityRole="button">
        <Text style={styles.skip}>{t('ob.loc.skip')}</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    gap: spacing.s,
  },
  stepBadge: {
    marginTop: spacing.l,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: colors.gold,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textFaint,
    textAlign: 'center',
    marginBottom: spacing.m,
    maxWidth: 320,
  },
  list: {
    alignSelf: 'stretch',
    gap: spacing.s,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.m,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
  },
  langCardActive: {
    borderColor: colors.gold,
    backgroundColor: colors.goldSoft,
  },
  langTexts: {
    flex: 1,
  },
  langNative: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  langLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.s,
    marginTop: spacing.xs,
  },
  searchCard: {
    alignSelf: 'stretch',
  },
  failed: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.goldBright,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  skip: {
    marginTop: spacing.m,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
})
