import { PermissionsAndroid, Platform } from 'react-native'
import Geolocation from '@react-native-community/geolocation'

function getPosition(options) {
    return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                })
            },
            (error) => reject(error),
            options,
        )
    })
}

export async function getUserLocation() {
    if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        )
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
            throw new Error('Permission denied')
        }
    }

    // Pehli koshish: asli GPS satellite — sab se sahi, aur internet ki zaroorat
    // nahi (offline bhi chalta hai). Ye Settings ke "GPS (bilkul sahi)" ka waada
    // hai, isliye enableHighAccuracy: true.
    try {
        return await getPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 })
    } catch (e) {
        // GPS nahi mila (imarat ke andar / kam signal): doosri koshish network
        // location se (Wi-Fi + mobile tower) — thori kam sahi, lekin har haal
        // mein behtar hai is se ke location hi na mile.
        return await getPosition({ enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 })
    }
}
