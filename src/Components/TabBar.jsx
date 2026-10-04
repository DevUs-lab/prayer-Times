import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon, { ICONS } from './icons'
import { colors, radius } from './theme'
import { useLang } from '../i18n'

export default function TabBar({ active, onChange }) {
  const insets = useSafeAreaInsets()
  const { t } = useLang()

  const tabs = [
    { key: 'home', label: t('tab.home'), icon: ICONS.home },
    { key: 'calendar', label: t('tab.calendar'), icon: ICONS.calendar },
    { key: 'settings', label: t('tab.settings'), icon: ICONS.settings },
  ]

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {tabs.map((tab) => {
        const isActive = tab.key === active
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Icon name={tab.icon} size={22} color={isActive ? colors.gold : colors.textFaint} />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundDeep,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconWrap: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  iconWrapActive: {
    backgroundColor: colors.goldSoft,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 11,
    color: colors.textFaint,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.gold,
    fontWeight: '800',
  },
})
