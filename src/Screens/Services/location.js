import { Linking, PermissionsAndroid, Platform } from 'react-native'
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
            // code 1 = geolocation ka PERMISSION_DENIED (PositionError). Caller
            // isi number se pehchan kar app settings kholne ka offer de sakta hai.
            const error = new Error('Permission denied')
            error.code = 1
            throw error
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

/**
 * GPS/permission issue ke mutabiq sahi page kholein: permission ke liye app
 * ka page, GPS band hone par Location (switches) wala page. (Modal isay
 * "Open settings" button se bulata hai.)
 */
export function openLocationSettings(issue) {
    if (Platform.OS !== 'android') {
        Linking.openSettings().catch(() => {})
        return
    }
    const intent =
        issue === 'permission'
            ? 'android.settings.APPLICATION_DETAILS_SETTINGS'
            : 'android.settings.LOCATION_SOURCE_SETTINGS'
    Linking.sendIntent(intent).catch(() => {})
}
