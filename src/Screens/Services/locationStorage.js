import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'user_location'

export async function saveLocation(location) {
  await AsyncStorage.setItem(KEY, JSON.stringify(location))
}

export async function loadLocation() {
  try {
    const value = await AsyncStorage.getItem(KEY)
    return value ? JSON.parse(value) : null
  } catch (e) {
    // Kharab/purana saved data app ko boot hone se na roke — start hi na ho
    // jana sab se buri haalat hai. Null = dobara location set karni paregi.
    return null
  }
}