import { useState, useCallback } from 'react';
import Geolocation from 'react-native-geolocation-service';
import { usePermissions } from './usePermissions';

export const useGeolocation = () => {
  const { requestGPS } = usePermissions();
  const [address, setAddress] = useState(null);
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'User-Agent': 'ConnexifyMobile/1.0' } },
      );
      const data = await res.json();
      const { road, suburb, city, state } = data.address || {};
      return [road, suburb || city, state].filter(Boolean).join(', ');
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    const granted = await requestGPS();
    if (!granted) { setLoading(false); return null; }

    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setCoords({ latitude, longitude });
          const addr = await reverseGeocode(latitude, longitude);
          setAddress(addr);
          setLoading(false);
          resolve({ latitude, longitude, address: addr });
        },
        (err) => {
          console.warn('Geolocation error:', err.message);
          setLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
      );
    });
  }, [requestGPS]);

  return { getCurrentLocation, coords, address, loading };
};
