// DOM table rendering for forecast display

/**
 * Create a loading indicator
 * @param {string} resortName
 * @returns {HTMLElement}
 */
export function createLoadingElement(resortName) {
  const container = document.createElement('div');
  container.className = 'resort-loading';
  container.innerHTML = `
    <h2>${resortName}</h2>
    <div class="loading-spinner">
      <div class="spinner"></div>
      <span>Loading forecast...</span>
    </div>
  `;
  return container;
}

/**
 * Create an error display
 * @param {string} resortName
 * @param {string} errorMessage
 * @returns {HTMLElement}
 */
export function createErrorElement(resortName, errorMessage) {
  const container = document.createElement('div');
  container.className = 'resort-error';
  container.innerHTML = `
    <h2>${resortName}</h2>
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      <span>Failed to load forecast: ${errorMessage}</span>
    </div>
  `;
  return container;
}

/**
 * Get CSS class for temperature value
 * @param {number} temp
 * @returns {string}
 */
function getTemperatureClass(temp) {
  if (temp === null) return '';
  if (temp <= 20) return 'temp-freezing';
  if (temp <= 32) return 'temp-cold';
  if (temp <= 45) return 'temp-cool';
  return 'temp-mild';
}

/**
 * Get CSS class for wind speed value
 * @param {number} speed
 * @returns {string}
 */
function getWindClass(speed) {
  if (speed === null) return '';
  if (speed >= 40) return 'wind-extreme';
  if (speed >= 25) return 'wind-high';
  if (speed >= 15) return 'wind-moderate';
  return 'wind-light';
}

/**
 * Get CSS class for conditions
 * @param {string} conditions
 * @returns {string}
 */
function getConditionsClass(conditions) {
  if (!conditions) return '';
  const lower = conditions.toLowerCase();
  if (lower.includes('snow')) return 'condition-snow';
  if (lower.includes('rain')) return 'condition-rain';
  if (lower.includes('cloud')) return 'condition-cloudy';
  if (lower.includes('sunny') || lower.includes('clear')) return 'condition-sunny';
  return '';
}

/**
 * Get cell styling based on metric and value
 * @param {string} metricId
 * @param {*} value
 * @returns {string}
 */
function getCellClass(metricId, value) {
  switch (metricId) {
    case 'temperature':
      return getTemperatureClass(value);
    case 'wind':
      return getWindClass(value?.speed);
    case 'conditions':
      return getConditionsClass(value);
    default:
      return '';
  }
}

/**
 * Create the forecast table for a resort
 * @param {object} resort
 * @param {object} transformedData
 * @param {Array} metrics
 * @returns {HTMLElement}
 */
export function createForecastTable(resort, transformedData, metrics) {
  const container = document.createElement('div');
  container.className = 'resort-forecast';
  container.id = `forecast-${resort.id}`;

  const header = document.createElement('h2');
  const link = document.createElement('a');
  link.href = `https://forecast.weather.gov/MapClick.php?lat=${resort.lat}&lon=${resort.lon}`;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = resort.name;
  header.appendChild(link);
  container.appendChild(header);

  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'table-wrapper';

  const table = document.createElement('table');
  table.className = 'forecast-table';

  // Create header row with time slots
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  // Empty cell for metric labels column
  const cornerCell = document.createElement('th');
  cornerCell.className = 'metric-header';
  headerRow.appendChild(cornerCell);

  // Time slot headers
  transformedData.slots.forEach((slot, index) => {
    const th = document.createElement('th');
    th.className = 'time-header';
    th.textContent = slot.label;

    // Add day separator class
    if (index > 0 && index % 6 === 0) {
      th.classList.add('day-start');
    }

    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body with metric rows
  const tbody = document.createElement('tbody');

  metrics.forEach(metric => {
    const row = document.createElement('tr');
    row.className = `metric-row metric-${metric.id}`;

    // Metric label cell
    const labelCell = document.createElement('td');
    labelCell.className = 'metric-label';
    labelCell.textContent = metric.label;
    row.appendChild(labelCell);

    // Value cells
    const metricValues = transformedData.metricData[metric.id];
    metricValues.forEach((data, index) => {
      const cell = document.createElement('td');
      cell.className = 'metric-value';
      cell.textContent = data.formattedValue;

      // Add conditional styling
      const cellClass = getCellClass(metric.id, data.value);
      if (cellClass) {
        cell.classList.add(cellClass);
      }

      // Add day separator class
      if (index > 0 && index % 6 === 0) {
        cell.classList.add('day-start');
      }

      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  container.appendChild(tableWrapper);

  return container;
}

/**
 * Clear the forecast container
 * @param {HTMLElement} container
 */
export function clearContainer(container) {
  container.innerHTML = '';
}

/**
 * Show global loading state
 * @param {HTMLElement} container
 */
export function showLoading(container) {
  container.innerHTML = `
    <div class="global-loading">
      <div class="spinner"></div>
      <span>Loading forecasts for all resorts...</span>
    </div>
  `;
}
