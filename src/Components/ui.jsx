import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import Icon, { ICONS } from './icons'
import { colors, radius, shadow, spacing } from './theme'
import { rtlStyle, useLang } from '../i18n'

export function Card({ style, children }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function SectionTitle({ children, action, onAction }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

export function PrimaryButton({ title, onPress, disabled, busy, icon }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
      accessibilityRole="button"
    >
      {busy ? (
        <ActivityIndicator color={colors.onGold} />
      ) : (
        <View style={styles.buttonContent}>
          {icon ? <Icon name={icon} size={18} color={colors.onGold} /> : null}
          <Text style={styles.buttonText}>{title}</Text>
        </View>
      )}
    </Pressable>
  )
}

export function Chip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  )
}

export function Loading({ label }) {
  const { t } = useLang()
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.gold} size="large" />
      <Text style={styles.muted}>{label || t('common.loading')}</Text>
    </View>
  )
}

export function ErrorState({ message, onRetry }) {
  const { t, lang } = useLang()
  return (
    <View style={styles.center}>
      <Icon name={ICONS.alert} size={44} color={colors.gold} />
      <Text style={[styles.stateTitle, rtlStyle(lang)]}>
        {message || t('common.wrong')}
      </Text>
      {onRetry ? <PrimaryButton title={t('common.retry')} icon={ICONS.refresh} onPress={onRetry} /> : null}
    </View>
  )
}

export function LocationPrompt({ onPress }) {
  const { t, lang } = useLang()
  return (
    <View style={styles.center}>
      <Icon name={ICONS.mosque} size={52} color={colors.gold} />
      <Text style={styles.stateTitle}>{t('ui.loc.title')}</Text>
      <Text style={[styles.stateHint, rtlStyle(lang)]}>{t('ui.loc.hint')}</Text>
      <PrimaryButton title={t('ui.loc.button')} icon={ICONS.settings} onPress={onPress} />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    ...shadow,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.s,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonPressed: {
    backgroundColor: colors.goldBright,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  buttonText: {
    color: colors.onGold,
    fontSize: 16,
    fontWeight: '800',
  },
  chip: {
    paddingHorizontal: spacing.m,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardDeep,
  },
  chipSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.onGold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.m,
    // Keeps the spinner visible when rendered inside a ScrollView.
    minHeight: 260,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  stateTitle: {
    color: colors.text,
    fontSize: 17,
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 24,
  },
  stateHint: {
    color: colors.textFaint,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})
