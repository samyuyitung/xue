# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

This is a zero-dependency, no-build static web app. There is no package.json, no bundler, no test framework, and no linter. To run it, serve the directory with any static file server and open `index.html` in a browser.

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser.

## Architecture

The app displays NOAA weather forecasts for Washington State ski resorts in a single combined table with color-coded cells.

**Data flow:** `main.js` orchestrates the pipeline:
1. `config/resorts.js` defines resorts as `{id, name, lat, lon}` objects
2. `api/weatherApi.js` fetches from NOAA in three steps: resolve lat/lon to a grid point (`/points/{lat},{lon}`), then fetch both hourly forecast and raw gridpoint data in parallel. The raw gridpoint endpoint (`/gridpoints/{gridId}/{gridX},{gridY}`) provides quantitative `snowfallAmount` and `quantitativePrecipitation` time-series data (in mm). These multi-hour intervals are distributed into per-hour buckets and merged into each forecast period. Results are cached in-memory for 10 minutes. All resorts fetch in parallel via `Promise.allSettled`.
3. `data/forecastTransformer.js` groups hourly periods into 4-hour slots (6 slots/day, 5 days = 30 slots). Numeric values are averaged by default; metrics with `aggregate: 'sum'` (snow/rain amounts) are summed instead. Categorical values use mode.
4. `config/metrics.js` defines 7 metrics (temperature, wind, precip chance, conditions, snow level, snow amount, rain amount) with extract/format functions. Each metric knows how to pull its value from a NOAA period and format it for both imperial and metric units. Snow and rain amount metrics use `aggregate: 'sum'` so precipitation accumulates over 4-hour slots rather than averaging.
5. `ui/tableRenderer.js` builds the DOM table. `createCombinedForecastTable` renders all resorts in one table with resort name separator rows. Cell colors are determined by value thresholds (e.g., temp <= 32F = blue, wind >= 40 = red).

**State:** Module-level variables in `main.js` hold `unitSystem`, `cachedResults`, and `lastUpdate`. Unit toggle re-renders from cached data without re-fetching. Auto-refresh runs every 30 minutes.

**Key conventions:**
- All JS uses native ES Modules (`import`/`export`) loaded via `<script type="module">`
- Snow level is a heuristic estimate from temperature, not a direct API field
- NOAA wind speed comes as a string like `"15 mph"` and is parsed with regex
- NOAA raw gridpoint data uses ISO 8601 intervals (e.g., `"2024-01-15T06:00:00+00:00/PT6H"`) with values in mm; these are distributed evenly across hours
- Precipitation metrics (snow amount, rain amount) use sum aggregation, not averaging
- To add a resort, add an entry to the `resorts` array in `config/resorts.js`
- To add a metric, add a definition in `config/metrics.js` and a color function + case in `ui/tableRenderer.js`
