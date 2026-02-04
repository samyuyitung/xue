// Metric definitions for weather display
// To add a new metric, add an object with {id, label, unit, extract, format}

export const metrics = [
  {
    id: 'temperature',
    label: 'Temperature',
    unit: '°F',
    extract: (period) => period.temperature,
    format: (value) => value !== null ? `${Math.round(value)}°F` : '—'
  },
  {
    id: 'wind',
    label: 'Wind',
    unit: '',
    extract: (period) => {
      // Wind speed comes as "15 mph" string, parse the number
      const match = period.windSpeed?.match(/(\d+)/);
      const speed = match ? parseInt(match[1], 10) : null;
      const direction = period.windDirection || null;
      return { speed, direction };
    },
    format: (value) => {
      if (!value || value.speed === null) return '—';
      const dir = value.direction || '';
      return `${Math.round(value.speed)} mph ${dir}`.trim();
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
    format: (value) => value || '—'
  },
  {
    id: 'snow-level',
    label: 'Snow Level',
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
    format: (value) => value !== null ? `${Math.round(value).toLocaleString()} ft` : '—'
  }
];
