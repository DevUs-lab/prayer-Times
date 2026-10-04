import React from 'react'
import { StyleSheet, View } from 'react-native'
import { colors } from './theme'

/**
 * Ornamental divider: gold line — diamond — gold line.
 * Used between sections inside cards.
 */
export function Ornament({ style }) {
  return (
    <View style={[styles.ornamentRow, style]}>
      <View style={styles.ornamentLine} />
      <View style={styles.ornamentDiamondOuter}>
        <View style={styles.ornamentDiamondInner} />
      </View>
      <View style={styles.ornamentLine} />
    </View>
  )
}

/**
 * Geometric band of rotated squares — a light, image-free Islamic pattern
 * used along the top of hero cards.
 */
export function PatternBand({ count = 12, style }) {
  return (
    <View style={[styles.band, style]} accessibilityElementsHidden importantForAccessibility="no">
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.bandSquare} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  ornamentLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.goldLine,
  },
  ornamentDiamondOuter: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  ornamentDiamondInner: {
    width: 4,
    height: 4,
    backgroundColor: colors.gold,
  },
  band: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  bandSquare: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: colors.goldLine,
    transform: [{ rotate: '45deg' }],
  },
})
