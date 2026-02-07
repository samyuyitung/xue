// NOAA Weather API integration

const USER_AGENT = 'WashingtonSkiWeather/1.0 (ski-weather-app)';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Simple in-memory cache
const cache = new Map();

function getCacheKey(lat, lon) {
  return `${lat},${lon}`;
}

function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedData(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetch grid point info from NOAA
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<{gridId: string, gridX: number, gridY: number}>}
 */
async function fetchGridPoint(lat, lon) {
  const url = `https://api.weather.gov/points/${lat},${lon}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/geo+json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch grid point: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    gridId: data.properties.gridId,
    gridX: data.properties.gridX,
    gridY: data.properties.gridY
  };
}

/**
 * Fetch hourly forecast from NOAA
 * @param {string} gridId - Grid office ID
 * @param {number} gridX - Grid X coordinate
 * @param {number} gridY - Grid Y coordinate
 * @returns {Promise<Array>} Array of hourly forecast periods
 */
async function fetchHourlyForecast(gridId, gridX, gridY) {
  const url = `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}/forecast/hourly`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/geo+json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch forecast: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.properties.periods;
}

/**
 * Fetch raw gridpoint data from NOAA (contains quantitative precip/snow)
 * @param {string} gridId - Grid office ID
 * @param {number} gridX - Grid X coordinate
 * @param {number} gridY - Grid Y coordinate
 * @returns {Promise<object>} Raw gridpoint properties
 */
async function fetchGridpointData(gridId, gridX, gridY) {
  const url = `https://api.weather.gov/gridpoints/${gridId}/${gridX},${gridY}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/geo+json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch gridpoint data: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.properties;
}

/**
 * Parse an ISO 8601 duration string (e.g., "PT6H", "PT1H") into hours
 * @param {string} duration - ISO 8601 duration
 * @returns {number} Duration in hours
 */
function parseDurationHours(duration) {
  const match = duration.match(/PT(\d+)H/);
  return match ? parseInt(match[1], 10) : 1;
}

/**
 * Distribute a NOAA time-series into per-hour values.
 * Each entry has a validTime like "2024-01-15T06:00:00+00:00/PT6H" and a value in mm.
 * Multi-hour intervals are split evenly across each hour.
 * @param {Array<{validTime: string, value: number}>} values - NOAA time-series
 * @returns {Map<number, number>} Map of hour-start timestamp (ms) to value (mm)
 */
function distributeTimeSeries(values) {
  const hourlyMap = new Map();
  if (!values) return hourlyMap;

  for (const entry of values) {
    const [isoStart, duration] = entry.validTime.split('/');
    const start = new Date(isoStart).getTime();
    const hours = parseDurationHours(duration);
    const perHourValue = (entry.value ?? 0) / hours;

    for (let h = 0; h < hours; h++) {
      const hourStart = start + h * 3600000;
      hourlyMap.set(hourStart, (hourlyMap.get(hourStart) || 0) + perHourValue);
    }
  }

  return hourlyMap;
}

/**
 * Merge snowfall and precip amounts from gridpoint data into hourly periods
 * @param {Array} periods - Hourly forecast periods
 * @param {object} gridData - Raw gridpoint properties
 */
function mergePrecipData(periods, gridData) {
  const snowMap = distributeTimeSeries(gridData.snowfallAmount?.values);
  const precipMap = distributeTimeSeries(gridData.quantitativePrecipitation?.values);

  for (const period of periods) {
    const ts = new Date(period.startTime).getTime();
    period.snowfallAmount = snowMap.get(ts) ?? 0;
    period.precipAmount = precipMap.get(ts) ?? 0;
  }
}

/**
 * Fetch weather forecast for a resort
 * @param {{id: string, name: string, lat: number, lon: number}} resort
 * @returns {Promise<{resort: object, periods: Array, error: string|null}>}
 */
export async function fetchResortForecast(resort) {
  const cacheKey = getCacheKey(resort.lat, resort.lon);

  // Check cache first
  const cached = getCachedData(cacheKey);
  if (cached) {
    return { resort, periods: cached, error: null };
  }

  try {
    // Step 1: Get grid point
    const { gridId, gridX, gridY } = await fetchGridPoint(resort.lat, resort.lon);

    // Step 2: Fetch hourly forecast and raw gridpoint data in parallel
    const [periods, gridData] = await Promise.all([
      fetchHourlyForecast(gridId, gridX, gridY),
      fetchGridpointData(gridId, gridX, gridY)
    ]);

    // Step 3: Merge snowfall and precip amounts into periods
    mergePrecipData(periods, gridData);

    // Cache the result
    setCachedData(cacheKey, periods);

    return { resort, periods, error: null };
  } catch (error) {
    console.error(`Error fetching forecast for ${resort.name}:`, error);
    return { resort, periods: [], error: error.message };
  }
}

/**
 * Fetch forecasts for all resorts in parallel
 * @param {Array} resorts - Array of resort objects
 * @returns {Promise<Array>} Array of forecast results
 */
export async function fetchAllForecasts(resorts) {
  const results = await Promise.allSettled(
    resorts.map(resort => fetchResortForecast(resort))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        resort: resorts[index],
        periods: [],
        error: result.reason?.message || 'Unknown error'
      };
    }
  });
}
