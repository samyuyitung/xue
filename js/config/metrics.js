// Metric definitions for weather display
// To add a new metric, add an object with {id, label, unit, extract, format}

export const metrics = [
  {
    id: 'temperature',
    label: 'Temperature (F)',
    unit: '°F',
    extract: (period) => period.temperature,
    format: (value) => value !== null ? `${Math.round(value)}°` : '—'
  },
  {
    id: 'wind',
    label: 'Wind (mph)',
    unit: 'mph',
    extract: (period) => {
      // Wind speed comes as "15 mph" string, parse the number
      const match = period.windSpeed?.match(/(\d+)/);
      const speed = match ? parseInt(match[1], 10) : null;
      return { speed };
    },
    format: (value) => {
      if (!value || value.speed === null) return '—';
      return `${Math.round(value.speed)}`;
    }
  },
  {
    id: 'precipitation-chance',
    label: 'Precip Chance',
    unit: '%',
    extract: (period) => period.probabilityOfPrecipitation?.value ?? null,
    format: (value) => value !== null ? `${Math.round(value)}%` : '—'
  },
  {
    id: 'conditions',
    label: 'Conditions',
    unit: '',
    extract: (period) => period.shortForecast,
    format: (value) => {
      if (!value) return '—';
      const lower = value.toLowerCase();

      // Check for specific conditions (order matters - more specific first)
      if (lower.includes('thunder')) return '⛈️';
      if (lower.includes('blizzard')) return '🌨️';
      if (lower.includes('snow') && lower.includes('rain')) return '🌨️🌧️';
      if (lower.includes('freezing rain') || lower.includes('sleet')) return '🌧️❄️';
      if (lower.includes('snow')) return '❄️';
      if (lower.includes('rain') || lower.includes('showers')) return '🌧️';
      if (lower.includes('fog') || lower.includes('mist')) return '🌫️';
      if (lower.includes('partly cloudy') || lower.includes('partly sunny')) return '⛅';
      if (lower.includes('mostly cloudy')) return '🌥️';
      if (lower.includes('cloud') || lower.includes('overcast')) return '☁️';
      if (lower.includes('sunny') || lower.includes('clear')) return '☀️';
      if (lower.includes('wind')) return '💨';

      // Fallback to original text if no match
      return value;
    }
  },
  {
    id: 'snow-level',
    label: 'Snow Level (ft)',
    unit: 'ft',
    extract: (period) => {
      // Estimate snow level from temperature
      // Rough approximation: snow level drops ~1000ft per 5°F below 40°F
      const temp = period.temperature;
      if (temp === null || temp === undefined) return null;
      if (temp <= 32) return 0; // At or below freezing, snow at all elevations
      // Estimate: base at 5000ft, adjust by temperature
      const snowLevel = 5000 + (temp - 32) * 200;
      return Math.max(0, Math.min(10000, snowLevel));
    },
    format: (value) => value !== null ? `${Math.round(value).toLocaleString()}` : '—'
  }
];
