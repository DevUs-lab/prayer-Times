import React from 'react'
import { StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Screens from './src/Screens'
import { LanguageProvider } from './src/i18n'

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <StatusBar barStyle="light-content" />
        <Screens />
      </LanguageProvider>
    </SafeAreaProvider>
  )
}
