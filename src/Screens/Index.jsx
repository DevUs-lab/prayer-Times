import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import TabBar from '../Components/TabBar'
import { colors } from '../Components/theme'
import { ErrorState, Loading } from '../Components/ui'
import { t, useLang } from '../i18n'
import Frontend from './Frontend'
import CalendarScreen from './Frontend/Calendar'
import SettingsScreen from './Frontend/Settings'
import { LanguageStep, LocationStep } from './Onboarding'
import { normalizeLocation } from './Services/geocode'
import { loadLocation } from './Services/locationStorage'
import { loadOnboarded, markOnboarded } from './Services/onboarding'

export default function Screens() {
  // First launch order the user asked for: language -> location -> Home.
  // `chosen` stays false until a language is picked (or restored), so the
  // intro shows once and never again afterwards.
  const { chosen, ready: langReady } = useLang()
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [onboarded, setOnboarded] = useState(false)
  const [tab, setTab] = useState('home')

  const bootstrap = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const saved = await loadLocation()
      if (saved) setLocation(await normalizeLocation(saved))
      setOnboarded(await loadOnboarded())
    } catch (e) {
      setLoadError(t('app.bootError'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  const handleSettingsSaved = useCallback((nextLocation) => {
    setLocation(nextLocation)
  }, [])

  // Called by both onboarding steps: remember it so the intro never loops.
  const handleOnboarded = useCallback(async (nextLocation) => {
    if (nextLocation) setLocation(nextLocation)
    await markOnboarded()
    setOnboarded(true)
  }, [])

  if (loading || !langReady) return <Loading label={t('app.loading')} />
  if (loadError) return <ErrorState message={loadError} onRetry={bootstrap} />
  if (!chosen) return <LanguageStep />
  if (!location && !onboarded) {
    return (
      <LocationStep
        onDone={(next) => handleOnboarded(next)}
        onSkip={() => handleOnboarded(null)}
      />
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.screen}>
        {tab === 'home' ? (
          <Frontend location={location} onOpenSettings={() => setTab('settings')} />
        ) : null}
        {tab === 'calendar' ? <CalendarScreen /> : null}
        {tab === 'settings' ? (
          <SettingsScreen location={location} onSaved={handleSettingsSaved} />
        ) : null}
      </View>

      <TabBar active={tab} onChange={setTab} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
  },
})
