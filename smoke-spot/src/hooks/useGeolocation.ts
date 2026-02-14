// hooks/useGeolocation.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface GeoState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    error: null,
    loading: true,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocation not supported', loading: false }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (err) => {
        setState((s) => ({
          ...s,
          error: err.message,
          loading: false,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    // Check for manual location first
    const stored = localStorage.getItem('manualLocation');
    if (stored) {
      try {
        const { lat, lng } = JSON.parse(stored);
        setState({ lat, lng, error: null, loading: false });
        return;
      } catch {}
    }
    requestLocation();
  }, [requestLocation]);

  return { ...state, refresh: requestLocation };
}
