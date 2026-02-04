// Metric definitions for weather display
// Supports both imperial (F, mph) and metric (C, km/h) units

/**
 * Convert Fahrenheit to Celsius
 */
function fToC(f) {
  if (f === null) return null;
  return (f - 32) * 5 / 9;
}

/**
 * Convert mph to km/h
 */
function mphToKmh(mph) {
  if (mph === null) return null;
  return mph * 1.60934;
}

/**
 * Convert feet to meters
 */
function ftToM(ft) {
  if (ft === null) return null;
  return ft * 0.3048;
}

/**
 * Get metrics configured for the specified unit system
 * @param {string} unitSystem - 'imperial' or 'metric'
 * @returns {Array} Array of metric definitions
 */
export function getMetrics(unitSystem = 'imperial') {
  const isMetric = unitSystem === 'metric';

  return [
    {
      id: 'temperature',
      label: isMetric ? 'Temperature (C)' : 'Temperature (F)',
      unit: isMetric ? '°C' : '°F',
      extract: (period) => period.temperature,
      format: (value) => {
        if (value === null) return '—';
        const temp = isMetric ? fToC(value) : value;
        return `${Math.round(temp)}°`;
      }
    },
    {
      id: 'wind',
      label: isMetric ? 'Wind (km/h)' : 'Wind (mph)',
      unit: isMetric ? 'km/h' : 'mph',
      extract: (period) => {
        // Wind speed comes as "15 mph" string, parse the number
        const match = period.windSpeed?.match(/(\d+)/);
        const speed = match ? parseInt(match[1], 10) : null;
        return { speed };
      },
      format: (value) => {
        if (!value || value.speed === null) return '—';
        const speed = isMetric ? mphToKmh(value.speed) : value.speed;
        return `${Math.round(speed)}`;
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
      label: isMetric ? 'Snow Level (m)' : 'Snow Level (ft)',
      unit: isMetric ? 'm' : 'ft',
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
      format: (value) => {
        if (value === null) return '—';
        const level = isMetric ? ftToM(value) : value;
        return `${Math.round(level).toLocaleString()}`;
      }
    }
  ];
}

// Default export for backwards compatibility
export const metrics = getMetrics('imperial');
