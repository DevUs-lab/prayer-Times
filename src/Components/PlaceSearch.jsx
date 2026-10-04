import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

import Icon, { ICONS } from './icons'
import { colors, radius, spacing } from './theme'
import { searchPlaces } from '../Screens/Services/geocode'
import { useLang } from '../i18n'

const SEARCH_DEBOUNCE_MS = 350

/**
 * Search box with live suggestions (350 ms debounce). Owns its own query
 * state and clears itself after a successful pick, so Settings and the
 * first-run onboarding can share one implementation.
 *
 * `onChoose(place)` may be async — a rejected promise keeps the query so
 * the caller's error message and the typed text stay in sync.
 */
export default function PlaceSearch({ onChoose, disabled }) {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)

  const timerRef = useRef(null)
  const requestRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const runSearch = async (text) => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setSearching(true)

    let places = []
    try {
      places = await searchPlaces(text)
    } catch (e) {
      places = []
    }

    // Ignore stale/late answers (the user kept typing meanwhile).
    if (!mountedRef.current || requestRef.current !== requestId) return

    setSuggestions(places)
    setSearched(true)
    setSearching(false)
  }

  const clear = () => {
    setQuery('')
    if (timerRef.current) clearTimeout(timerRef.current)
    requestRef.current += 1 // invalidate any request still in flight
    setSuggestions([])
    setSearched(false)
    setSearching(false)
  }

  const onChangeText = (text) => {
    setQuery(text)

    if (timerRef.current) clearTimeout(timerRef.current)
    const trimmed = text.trim()

    if (trimmed.length < 2) {
      requestRef.current += 1
      setSuggestions([])
      setSearched(false)
      setSearching(false)
      return
    }

    timerRef.current = setTimeout(() => runSearch(trimmed), SEARCH_DEBOUNCE_MS)
  }

  const submitQuery = () => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    if (timerRef.current) clearTimeout(timerRef.current)
    runSearch(trimmed)
  }

  const choose = async (place) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    try {
      await onChoose(place)
      clear()
    } catch (e) {
      // Caller shows why; keep the query so the user can try again.
    }
  }

  return (
    <View>
      <View style={styles.searchBox}>
        <Icon name={ICONS.search} size={18} color={colors.gold} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('set.find.placeholder')}
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={onChangeText}
          onSubmitEditing={submitQuery}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          underlineColorAndroid="transparent"
        />
        {query.length > 0 ? (
          <TouchableOpacity
            onPress={clear}
            style={styles.clearButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name={ICONS.close} size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {searching ? <Text style={styles.statusText}>{t('set.searching')}</Text> : null}

      {suggestions.map((place) => {
        const key = `${place.latitude.toFixed(4)}|${place.longitude.toFixed(4)}|${place.label}`
        return (
          <TouchableOpacity
            key={key}
            style={styles.suggestionRow}
            onPress={() => choose(place)}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <Icon name={ICONS.place} size={18} color={colors.gold} />
            <View style={styles.suggestionText}>
              <Text style={styles.suggestionTitle} numberOfLines={1}>
                {place.name}
              </Text>
              <Text style={styles.suggestionSub} numberOfLines={2}>
                {place.secondary}
              </Text>
            </View>
            <Icon name={ICONS.chevronRight} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )
      })}

      {searched && !searching && suggestions.length === 0 ? (
        <Text style={styles.statusText}>{t('set.noResults')}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.m,
    paddingVertical: 11,
    backgroundColor: colors.cardDeep,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  clearButton: {
    paddingLeft: 4,
  },
  statusText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: spacing.m,
    textAlign: 'center',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginTop: spacing.s,
    paddingVertical: spacing.s + 2,
    paddingHorizontal: spacing.s,
    borderRadius: radius.s,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardDeep,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  suggestionSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
})
