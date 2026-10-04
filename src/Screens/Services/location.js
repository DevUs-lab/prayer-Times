import { PermissionsAndroid, Platform } from 'react-native'
import Geolocation from '@react-native-community/geolocation'

export async function getUserLocation() {
    if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        )
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            throw new Error('Permission denied')
        }
    }

    return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                })
            },
            (error) => reject(error),
            { enableHighAccuracy: false, timeout: 15000 }
        )
    })
}