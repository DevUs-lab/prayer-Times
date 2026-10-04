import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = '@pt/onboarded'

/** Has the user ever completed the language/location intro? */
export async function loadOnboarded() {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1'
  } catch (e) {
    return false
  }
}

export async function markOnboarded() {
  try {
    await AsyncStorage.setItem(KEY, '1')
  } catch (e) {
    // best-effort: worst case the intro shows once more
  }
}
