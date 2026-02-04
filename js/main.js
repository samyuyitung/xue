// Main application entry point

import { resorts } from './config/resorts.js';
import { metrics } from './config/metrics.js';
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
 * Load and display forecasts for all resorts
 */
async function loadForecasts() {
  showLoading(container);

  try {
    const results = await fetchAllForecasts(resorts);

    clearContainer(container);

    // Separate successful and failed results
    const successfulResults = [];
    const failedResults = [];

    results.forEach(result => {
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
 * Initialize the application
 */
function init() {
  container = document.getElementById('forecast-container');

  if (!container) {
    console.error('Forecast container not found');
    return;
  }

  // Load forecasts immediately
  loadForecasts();

  // Set up auto-refresh
  setInterval(loadForecasts, REFRESH_INTERVAL);

  // Set up manual refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadForecasts);
  }
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
