// Transform NOAA hourly data into 4-hour aggregated slots

const HOURS_PER_SLOT = 4;
const SLOTS_PER_DAY = 6;
const DAYS_TO_SHOW = 5;
const TOTAL_SLOTS = SLOTS_PER_DAY * DAYS_TO_SHOW;

/**
 * Format a date into a time slot label
 * @param {Date} date
 * @returns {string} e.g., "Mon 8AM"
 */
function formatSlotLabel(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[date.getDay()];
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day} ${hours}${ampm}`;
}

/**
 * Format just the time portion of a slot
 * @param {Date} date
 * @returns {string} e.g., "8AM"
 */
function formatTimeLabel(date) {
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}${ampm}`;
}

/**
 * Format just the day portion of a slot with date
 * @param {Date} date
 * @returns {string} e.g., "Mon (1/7)"
 */
function formatDayLabel(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = days[date.getDay()];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${dayName} (${month}/${day})`;
}

/**
 * Get the mode (most common value) from an array
 * @param {Array} arr
 * @returns {*} Most common value
 */
function getMode(arr) {
  const filtered = arr.filter(v => v !== null && v !== undefined);
  if (filtered.length === 0) return null;

  const counts = new Map();
  filtered.forEach(v => {
    counts.set(v, (counts.get(v) || 0) + 1);
  });

  let maxCount = 0;
  let mode = filtered[0];
  counts.forEach((count, value) => {
    if (count > maxCount) {
      maxCount = count;
      mode = value;
    }
  });

  return mode;
}

/**
 * Average numeric values, ignoring nulls
 * @param {Array<number|null>} arr
 * @returns {number|null}
 */
function average(arr) {
  const filtered = arr.filter(v => v !== null && v !== undefined && typeof v === 'number');
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, v) => sum + v, 0) / filtered.length;
}

/**
 * Sum numeric values, treating nulls as 0
 * @param {Array<number|null>} arr
 * @returns {number|null}
 */
function sumValues(arr) {
  const filtered = arr.filter(v => v !== null && v !== undefined && typeof v === 'number');
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, v) => sum + v, 0);
}

/**
 * Aggregate values based on their type
 * @param {Array} values
 * @param {string} [aggregateMode] - 'sum' to sum numeric values instead of averaging
 * @returns {*} Aggregated value
 */
function aggregateValues(values, aggregateMode) {
  if (values.length === 0) return null;

  const filtered = values.filter(v => v !== null && v !== undefined);
  if (filtered.length === 0) return null;

  // Check if values are wind objects {speed, direction}
  if (filtered[0] && typeof filtered[0] === 'object' && 'speed' in filtered[0]) {
    const speeds = filtered.map(v => v.speed).filter(s => s !== null);
    const directions = filtered.map(v => v.direction).filter(d => d !== null);
    return {
      speed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
      direction: getMode(directions)
    };
  }

  // Check if values are numeric
  const numericValues = filtered.filter(v => typeof v === 'number');
  if (numericValues.length === filtered.length) {
    return aggregateMode === 'sum' ? sumValues(values) : average(values);
  }

  // For strings and other types, use mode
  return getMode(values);
}

/**
 * Group periods into 4-hour slots
 * @param {Array} periods - NOAA hourly periods
 * @returns {Array<{startTime: Date, periods: Array}>}
 */
function groupIntoSlots(periods) {
  if (!periods || periods.length === 0) return [];

  const slots = [];
  const now = new Date();

  // Find the first slot start (round down to nearest 4-hour boundary)
  const firstPeriodTime = new Date(periods[0].startTime);
  const startHour = Math.floor(firstPeriodTime.getHours() / HOURS_PER_SLOT) * HOURS_PER_SLOT;
  const slotStart = new Date(firstPeriodTime);
  slotStart.setHours(startHour, 0, 0, 0);

  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const slotStartTime = new Date(slotStart.getTime() + i * HOURS_PER_SLOT * 60 * 60 * 1000);
    const slotEndTime = new Date(slotStartTime.getTime() + HOURS_PER_SLOT * 60 * 60 * 1000);

    const slotPeriods = periods.filter(period => {
      const periodTime = new Date(period.startTime);
      return periodTime >= slotStartTime && periodTime < slotEndTime;
    });

    slots.push({
      startTime: slotStartTime,
      label: formatSlotLabel(slotStartTime),
      timeLabel: formatTimeLabel(slotStartTime),
      dayLabel: formatDayLabel(slotStartTime),
      periods: slotPeriods
    });
  }

  return slots;
}

/**
 * Transform raw forecast data for a metric
 * @param {Array} slots - Grouped time slots
 * @param {object} metric - Metric definition
 * @returns {Array} Array of {label, value, formattedValue}
 */
function extractMetricValues(slots, metric) {
  return slots.map(slot => {
    const values = slot.periods.map(period => metric.extract(period));
    const aggregatedValue = aggregateValues(values, metric.aggregate);

    return {
      label: slot.label,
      value: aggregatedValue,
      formattedValue: metric.format(aggregatedValue)
    };
  });
}

/**
 * Transform forecast data for all metrics
 * @param {Array} periods - NOAA hourly periods
 * @param {Array} metrics - Metric definitions
 * @returns {{slots: Array, metricData: Object}}
 */
export function transformForecast(periods, metrics) {
  const slots = groupIntoSlots(periods);

  const metricData = {};
  metrics.forEach(metric => {
    metricData[metric.id] = extractMetricValues(slots, metric);
  });

  return {
    slots,
    metricData
  };
}

/**
 * Get slot labels for table headers
 * @param {Array} slots
 * @returns {Array<string>}
 */
export function getSlotLabels(slots) {
  return slots.map(slot => slot.label);
}
