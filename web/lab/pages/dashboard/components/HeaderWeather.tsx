import { CloudSun, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWeatherQuery } from '../../../api/weather/useWeatherQuery';
import { DashboardWidget } from '../dashboard.types';

type Coordinates = { latitude: number; longitude: number };

export function HeaderWeather({ widget }: { widget?: DashboardWidget }) {
  const configured =
    Number.isFinite(Number(widget?.config?.latitude)) &&
    Number.isFinite(Number(widget?.config?.longitude))
      ? { latitude: Number(widget?.config.latitude), longitude: Number(widget?.config.longitude) }
      : null;
  const [detected, setDetected] = useState<Coordinates | null>(null);
  const [permission, setPermission] = useState<'idle' | 'loading' | 'denied'>('idle');
  const coordinates = configured || detected;

  const requestLocation = () => {
    if (configured || !navigator.geolocation) {
      setPermission('denied');
      return;
    }
    setPermission('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setDetected({ latitude: coords.latitude, longitude: coords.longitude });
        setPermission('idle');
      },
      () => setPermission('denied'),
      { enableHighAccuracy: false, maximumAge: 600000, timeout: 10000 },
    );
  };

  useEffect(() => {
    if (!Number.isFinite(Number(widget?.config?.latitude)) || !Number.isFinite(Number(widget?.config?.longitude))) requestLocation();
  }, [widget?.config?.latitude, widget?.config?.longitude]);

  const weatherQuery = useWeatherQuery(
    coordinates?.latitude ?? 0,
    coordinates?.longitude ?? 0,
    Boolean(coordinates),
  );
  const weather = weatherQuery.data;
  if (!weather?.current) {
    return (
      <button type="button" className="header-weather header-weather-prompt" onClick={requestLocation} disabled={permission === 'loading'}>
        <CloudSun aria-hidden="true" />
        <span>{permission === 'loading' ? 'Localizando…' : permission === 'denied' ? 'Permitir localização' : 'Carregar clima'}</span>
      </button>
    );
  }

  const location = String(weather.timezone || '')
    .split('/')
    .at(-1)
    ?.replaceAll('_', ' ');

  return (
    <span className="header-weather">
      <CloudSun aria-hidden="true" />
      <strong>{Math.round(weather.current.temperature_2m)}°</strong>
      {location && <span><MapPin aria-hidden="true" />{location}</span>}
    </span>
  );
}
