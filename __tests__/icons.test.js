/**
 * Poori app ek hi icon family (MaterialCommunityIcons) use karti hai, aur font
 * unknown naam par literally "?" render karta hai — `glyphMap[name] || '?'`.
 *
 * Wahi hua tha auto-detect button par: `crosshair-gps` likha tha, font mein
 * `crosshairs-gps` hai. Isliye har naam yahan glyphmap se check hota hai.
 */
const { ICONS } = require('../src/Components/icons')
const { PRAYER_LIST } = require('../src/Screens/Services/prayerTimes')
const glyphMap = require('react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json')

test('har ICONS naam font ke glyphmap mein hai (warna screen par “?”)', () => {
  const missing = Object.entries(ICONS).filter(([, name]) => !(name in glyphMap))
  expect(missing).toEqual([])
})

test('prayer rows ke icon naam bhi font mein hain', () => {
  const missing = PRAYER_LIST.filter((row) => !(row.icon in glyphMap)).map((row) => row.key)
  expect(missing).toEqual([])
})
