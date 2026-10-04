import { elevationInFeet, formatGmtOffset } from '../src/Screens/Services/weather'

describe('home screen meta line (Bulandi / GMT)', () => {
  test('GMT offset is shown like the other prayer apps', () => {
    expect(formatGmtOffset(18000)).toBe('+5.0') // Asia/Karachi
    expect(formatGmtOffset(0)).toBe('+0.0')
    expect(formatGmtOffset(-19800)).toBe('-5:30')
    expect(formatGmtOffset(-14400)).toBe('-4.0')
  })

  test('invalid offsets render nothing', () => {
    expect(formatGmtOffset(undefined)).toBe('')
    expect(formatGmtOffset('nonsense')).toBe('')
  })

  test('elevation is converted from metres to feet', () => {
    expect(elevationInFeet(407.8)).toBe(1338)
    expect(elevationInFeet(7)).toBe(23)
    expect(elevationInFeet(0)).toBe(0)
    expect(elevationInFeet(null)).toBeNull()
    expect(elevationInFeet(NaN)).toBeNull()
  })
})
