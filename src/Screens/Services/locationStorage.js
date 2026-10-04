import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'user_location'

export async function saveLocation(location) {
  await AsyncStorage.setItem(KEY, JSON.stringify(location))
}

export async function loadLocation() {
  const value = await AsyncStorage.getItem(KEY)
  return value ? JSON.parse(value) : null
}