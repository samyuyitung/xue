// Main application entry point

import { resorts } from './config/resorts.js';
import { getMetrics } from './config/metrics.js';
import { fetchAllForecasts } from './api/weatherApi.js';
import { transformForecast } from './data/forecastTransformer.js';
import {
  createCombinedForecastTable,
  createErrorElement,
  clearContainer,
  showLoading
} from './ui/tableRenderer.js';

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

let container;
let lastUpdate = null;
let cachedResults = null;
let unitSystem = 'imperial';

/**
 * Update the last updated timestamp display
 */
function updateTimestamp() {
  const timestampEl = document.getElementById('last-updated');
  if (timestampEl && lastUpdate) {
    const timeStr = lastUpdate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
    timestampEl.textContent = `Last updated: ${timeStr}`;
  }
}

/**
 * Update the unit toggle button text
 */
function updateToggleButton() {
  const toggleBtn = document.getElementById('unit-toggle');
  if (toggleBtn) {
    // Show what clicking will switch TO
    toggleBtn.textContent = unitSystem === 'imperial' ? 'Metric' : 'Imperial';
  }
}

/**
 * Render the forecast table with current unit system
 */
function renderForecast() {
  if (!cachedResults) return;

  clearContainer(container);

  const metrics = getMetrics(unitSystem);

  // Separate successful and failed results
  const successfulResults = [];
  const failedResults = [];

  cachedResults.forEach(result => {
    if (result.error) {
      failedResults.push(result);
    } else {
      const transformedData = transformForecast(result.periods, metrics);
      successfulResults.push({ resort: result.resort, transformedData });
    }
  });

  // Show errors first
  failedResults.forEach(result => {
    const element = createErrorElement(result.resort.name, result.error);
    container.appendChild(element);
  });

  // Create combined table for successful results
  if (successfulResults.length > 0) {
    const combinedTable = createCombinedForecastTable(successfulResults, metrics);
    container.appendChild(combinedTable);
  }
}

/**
 * Load and display forecasts for all resorts
 */
async function loadForecasts() {
  showLoading(container);

  try {
    cachedResults = await fetchAllForecasts(resorts);

    renderForecast();

    lastUpdate = new Date();
    updateTimestamp();

  } catch (error) {
    console.error('Failed to load forecasts:', error);
    container.innerHTML = `
      <div class="global-error">
        <span class="error-icon">⚠️</span>
        <h2>Failed to load forecasts</h2>
        <p>${error.message}</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

/**
 * Toggle between imperial and metric units
 */
function toggleUnits() {
  unitSystem = unitSystem === 'imperial' ? 'metric' : 'imperial';
  updateToggleButton();
  renderForecast();
}

/**
 * Initialize the application
 */
function init() {
  container = document.getElementById('forecast-container');

  if (!container) {
    console.error('Forecast container not found');
    return;
  }

  // Initialize toggle button
  updateToggleButton();

  // Load forecasts immediately
  loadForecasts();

  // Set up auto-refresh
  setInterval(loadForecasts, REFRESH_INTERVAL);

  // Set up manual refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadForecasts);
  }

  // Set up unit toggle button
  const toggleBtn = document.getElementById('unit-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleUnits);
  }
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
