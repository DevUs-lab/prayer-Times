import React, { useEffect, useRef } from 'react'
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Icon, { ICONS } from './icons'
import { colors, radius, shadow, spacing } from './theme'
import { rtlStyle, useLang } from '../i18n'
import { openLocationSettings } from '../Screens/Services/location'

export function Card({ style, children }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function SectionTitle({ children, action, onAction, actionOpen }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {action ? (
        /* Chip jaisa — soft-gold pill + chevron: dekhne par hi pressable lage */
        <Pressable
          onPress={onAction}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ expanded: !!actionOpen }}
          style={({ pressed }) => [
            styles.sectionActionChip,
            pressed && styles.sectionActionPressed,
          ]}
        >
          <Text style={styles.sectionAction} numberOfLines={1}>
            {action}
          </Text>
          <Icon
            name={actionOpen ? ICONS.chevronUp : ICONS.chevronDown}
            size={16}
            color={colors.goldBright}
          />
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

/**
 * GPS/permission fail hone par aane wala modal — Settings aur Onboarding
 * dono yahi lagate hain. System Alert nahi: app ke emerald/gold theme ke
 * mutabiq (Calendar wali sheet ki tarah). "Open settings" sahi page kholti
 * hai aur wapas aate hi `onRetry` se khud dobara detect hota hai; "Close"
 * band kar deta hai (kuch save nahi hota — user khud shehar search kar
 * sakta hai).
 */
export function LocationIssueModal({ issue, onClose, onRetry }) {
  const { t, lang } = useLang()
  // "Open settings" daba kar gaye ho to wapas aate hi dobara detect chale.
  // ("Close" par pending nahi banta — manually chuni hui jagah badli na jaye.)
  const pendingRef = useRef(false)
  const retryRef = useRef(onRetry)
  retryRef.current = onRetry

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && pendingRef.current) {
        pendingRef.current = false
        if (retryRef.current) retryRef.current()
      }
    })
    return () => subscription.remove()
  }, [])

  const openSettings = () => {
    pendingRef.current = true
    openLocationSettings(issue)
    onClose()
  }

  return (
    <Modal
      visible={Boolean(issue)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <Icon name={ICONS.crosshair} size={34} color={colors.gold} />
          <Text style={styles.dialogTitle}>{t('loc.issue.title')}</Text>
          <Text style={[styles.dialogText, rtlStyle(lang)]}>{t('loc.issue.msg')}</Text>
          <View style={styles.dialogActions}>
            <PrimaryButton
              title={t(issue === 'permission' ? 'loc.openApp' : 'loc.openGps')}
              icon={ICONS.settings}
              onPress={openSettings}
            />
          </View>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
            <Text style={styles.dialogDismiss}>{t('common.close')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
  sectionActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.goldLine,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.s + 2,
    flexShrink: 0,
  },
  sectionActionPressed: {
    opacity: 0.55,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.goldBright,
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 26, 19, 0.72)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.m,
    alignItems: 'center',
    ...shadow,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.gold,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  dialogText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  dialogActions: {
    alignSelf: 'stretch',
  },
  dialogDismiss: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textFaint,
    paddingVertical: spacing.s,
  },
})
