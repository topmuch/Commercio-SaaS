'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
}

function getInitialState(): GeolocationState {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      latitude: null,
      longitude: null,
      accuracy: null,
      error: 'Géolocalisation non supportée',
      loading: false,
    }
  }
  return {
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
  }
}

const geoOptions: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
}

export function useGeolocation(watch = false) {
  const [state, setState] = useState<GeolocationState>(getInitialState)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Géolocalisation non supportée', loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (mountedRef.current) {
          setState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            error: null,
            loading: false,
          })
        }
      },
      (err) => {
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            error: `Erreur GPS: ${err.message}`,
            loading: false,
          }))
        }
      },
      geoOptions
    )
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return

    const onSuccess = (position: GeolocationPosition) => {
      if (mountedRef.current) {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          loading: false,
        })
      }
    }

    const onError = (err: GeolocationPositionError) => {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          error: `Erreur GPS: ${err.message}`,
          loading: false,
        }))
      }
    }

    if (watch) {
      const watchId = navigator.geolocation.watchPosition(onSuccess, onError, geoOptions)
      return () => navigator.geolocation.clearWatch(watchId)
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, geoOptions)
    }
  }, [watch])

  return { ...state, refresh }
}
