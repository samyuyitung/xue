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

    // Step 2: Get hourly forecast
    const periods = await fetchHourlyForecast(gridId, gridX, gridY);

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
