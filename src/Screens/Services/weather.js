import { getJson } from './http'
import { pad2 } from '../../utils/date'
import { t } from '../../i18n/strings'

/** WMO weather interpretation codes -> friendly label + MaterialCommunityIcons name. */
const WEATHER_CODES = {
  0: { label: 'Clear sky', day: 'weather-sunny', night: 'weather-night' },
  1: { label: 'Mainly clear', day: 'weather-sunny', night: 'weather-night' },
  2: { label: 'Partly cloudy', day: 'weather-partly-cloudy', night: 'weather-partly-cloudy' },
  3: { label: 'Overcast', day: 'weather-cloudy', night: 'weather-cloudy' },
  45: { label: 'Fog', day: 'weather-fog', night: 'weather-fog' },
  48: { label: 'Rime fog', day: 'weather-fog', night: 'weather-fog' },
  51: { label: 'Light drizzle', day: 'weather-rainy', night: 'weather-rainy' },
  53: { label: 'Drizzle', day: 'weather-rainy', night: 'weather-rainy' },
  55: { label: 'Heavy drizzle', day: 'weather-pouring', night: 'weather-pouring' },
  56: { label: 'Freezing drizzle', day: 'weather-rainy', night: 'weather-rainy' },
  57: { label: 'Heavy freezing drizzle', day: 'weather-pouring', night: 'weather-pouring' },
  61: { label: 'Light rain', day: 'weather-rainy', night: 'weather-rainy' },
  63: { label: 'Rain', day: 'weather-rainy', night: 'weather-rainy' },
  65: { label: 'Heavy rain', day: 'weather-pouring', night: 'weather-pouring' },
  66: { label: 'Freezing rain', day: 'weather-rainy', night: 'weather-rainy' },
  67: { label: 'Heavy freezing rain', day: 'weather-pouring', night: 'weather-pouring' },
  71: { label: 'Light snow', day: 'weather-snowy', night: 'weather-snowy' },
  73: { label: 'Snow', day: 'weather-snowy', night: 'weather-snowy' },
  75: { label: 'Heavy snow', day: 'weather-snowy', night: 'weather-snowy' },
  77: { label: 'Snow grains', day: 'weather-snowy', night: 'weather-snowy' },
  80: { label: 'Light showers', day: 'weather-rainy', night: 'weather-rainy' },
  81: { label: 'Showers', day: 'weather-rainy', night: 'weather-rainy' },
  82: { label: 'Violent showers', day: 'weather-pouring', night: 'weather-pouring' },
  85: { label: 'Snow showers', day: 'weather-snowy', night: 'weather-snowy' },
  86: { label: 'Heavy snow showers', day: 'weather-snowy', night: 'weather-snowy' },
  95: { label: 'Thunderstorm', day: 'weather-lightning', night: 'weather-lightning' },
  96: { label: 'Thunderstorm with hail', day: 'weather-lightning', night: 'weather-lightning' },
  99: { label: 'Heavy thunderstorm', day: 'weather-lightning', night: 'weather-lightning' },
}

/**
 * Label + icon for a WMO code, in the active language (the English labels
 * on WEATHER_CODES stay as the fallback if a translation key is ever missing).
 */
export function weatherInfo(code, isDay = true) {
  const found = WEATHER_CODES[code]
  let label = t('weather.unavailable')
  if (found) {
    const translated = t(`wmo.${code}`)
    label = translated === `wmo.${code}` ? found.label : translated
  }
  if (!found) return { label, icon: isDay ? 'weather-sunny' : 'weather-night' }
  return { label, icon: isDay ? found.day : found.night }
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export function windDirectionLabel(degrees) {
  const index = Math.round(Number(degrees || 0) / 45) % 8
  return COMPASS[index]
}

/** 18000 -> "+5.0", -19800 -> "-5:30" (shown next to the elevation). */
export function formatGmtOffset(totalSeconds) {
  const seconds = Number(totalSeconds)
  if (!Number.isFinite(seconds)) return ''
  const sign = seconds < 0 ? '-' : '+'
  const absolute = Math.abs(seconds)
  const hours = Math.floor(absolute / 3600)
  const minutes = Math.floor((absolute % 3600) / 60)
  return minutes === 0 ? `${sign}${hours}.0` : `${sign}${hours}:${pad2(minutes)}`
}

/** Metres above sea level -> feet (prayer apps usually show feet). */
export function elevationInFeet(metres) {
  if (typeof metres !== 'number' || !Number.isFinite(metres)) return null
  return Math.round(metres * 3.28084)
}

/** Current wall-clock (location-local) parts derived from the API's UTC offset. */
function locationNow(utcOffsetSeconds) {
  const date = new Date(Date.now() + Number(utcOffsetSeconds || 0) * 1000)
  return {
    prefix: `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}T${pad2(
      date.getUTCHours(),
    )}:00`,
    weekdaySource: date,
  }
}

export async function fetchWeather(latitude, longitude) {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${latitude}&longitude=${longitude}` +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m' +
    '&hourly=temperature_2m,weather_code' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max' +
    '&timezone=auto&forecast_days=7'

  const json = await getJson(url)
  const current = json.current || {}
  const daily = json.daily || {}
  const hourly = json.hourly || {}

  const now = locationNow(json.utc_offset_seconds)

  // Next 12 hours starting from the current hour, in the location's timezone.
  let startIndex = (hourly.time || []).findIndex((time) => time >= now.prefix)
  if (startIndex < 0) startIndex = 0
  const hourlyForecast = (hourly.time || []).slice(startIndex, startIndex + 12).map((time, i) => ({
    time,
    temperature: hourly.temperature_2m[startIndex + i],
    code: hourly.weather_code[startIndex + i],
  }))

  const dailyForecast = (daily.time || []).map((date, i) => ({
    date,
    code: daily.weather_code[i],
    max: daily.temperature_2m_max[i],
    min: daily.temperature_2m_min[i],
    sunrise: daily.sunrise?.[i],
    sunset: daily.sunset?.[i],
    precipitationProbability: daily.precipitation_probability_max?.[i],
    uvIndex: daily.uv_index_max?.[i],
  }))

  return {
    timezone: json.timezone,
    // Used by the home screen meta line: "Bulandi 1338 ft · GMT +5.0"
    elevationFeet: elevationInFeet(json.elevation),
    gmtOffset: formatGmtOffset(json.utc_offset_seconds),
    current: {
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      isDay: current.is_day === 1,
      precipitation: current.precipitation,
      code: current.weather_code,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
    },
    hourly: hourlyForecast,
    daily: dailyForecast,
  }
}
