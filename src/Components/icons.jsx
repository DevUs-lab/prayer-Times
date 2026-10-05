import React from 'react'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

/**
 * Single icon family for the whole app (fonts are bundled in the build,
 * no image assets required).
 */
export default function Icon({ name, size = 20, color, style }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />
}

/** Semantic icon names, so screens never hard-code glyph strings. */
export const ICONS = {
  // navigation
  home: 'home',
  calendar: 'calendar-month',
  settings: 'cog',

  // branding / misc
  mosque: 'mosque',
  refresh: 'refresh',
  place: 'map-marker',
  search: 'magnify',
  crosshair: 'crosshairs-gps', // MDI mein "crosshair-gps" NAZM-e-ghalat hai → "?"
  chevronLeft: 'chevron-left',
  chevronRight: 'chevron-right',
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',
  close: 'close',
  check: 'check-circle-outline',
  info: 'information-outline',
  alert: 'alert-circle-outline',
  clock: 'clock-outline',

  // weather (MaterialCommunityIcons "weather-*" family)
  clearDay: 'weather-sunny',
  clearNight: 'weather-night',
  partlyCloudy: 'weather-partly-cloudy',
  cloudy: 'weather-cloudy',
  fog: 'weather-fog',
  rain: 'weather-rainy',
  heavyRain: 'weather-pouring',
  snow: 'weather-snowy',
  thunder: 'weather-lightning',
  wind: 'weather-windy',

  // stats
  humidity: 'water-outline',
  uv: 'sun-wireless-outline',
  gauge: 'gauge',
}
