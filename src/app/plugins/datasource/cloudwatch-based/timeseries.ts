/**
 * timeseries.js
 *
 * This module contains functions for working with time series.
 *
 * datapoints - array of points where point is [value, timestamp]. In almost all cases (if other wasn't
 * explicitly said) we assume datapoints are sorted by timestamp. Timestamp is the number of milliseconds
 * since 1 January 1970 00:00:00 UTC.
 *
 */

import _ from 'lodash';
import * as utils from './utils';
import * as c from './constants';

const POINT_VALUE = 0;
const POINT_TIMESTAMP = 1;

/**
 * Downsample time series by using given function (avg, min, max).
 */
function downsample(datapoints: string | any[], timeTo: number, msInterval: number, func: string) {
  const downsampledSeries = [];
  const timeWindow = {
    from: timeTo * 1000 - msInterval,
    to: timeTo * 1000,
  };

  let pointsSum = 0;
  let pointsNum = 0;
  let valueAvg = 0;
  let frame = [];

  for (let i = datapoints.length - 1; i >= 0; i -= 1) {
    if (timeWindow.from < datapoints[i][1] && datapoints[i][1] <= timeWindow.to) {
      pointsSum += datapoints[i][0];
      pointsNum++;
      frame.push(datapoints[i][0]);
    } else {
      valueAvg = pointsNum ? pointsSum / pointsNum : 0;

      if (func === 'max') {
        downsampledSeries.push([_.max(frame), timeWindow.to]);
      } else if (func === 'min') {
        downsampledSeries.push([_.min(frame), timeWindow.to]);
      } else {
        downsampledSeries.push([valueAvg, timeWindow.to]);
      }

      // Shift time window
      timeWindow.to = timeWindow.from;
      timeWindow.from -= msInterval;

      pointsSum = 0;
      pointsNum = 0;
      frame = [];

      // Process point again
      i++;
    }
  }
  return downsampledSeries.reverse();
}

/**
 * Group points by given time interval
 * datapoints: [[<value>, <unixtime>], ...]
 */
function groupBy(datapoints: any, interval: string, groupByCallback: (arg0: any[]) => any) {
  const msInterval = utils.parseInterval(interval) as number;

  // Calculate frame timestamps
  const frames = _.groupBy(datapoints, point => {
    // Calculate time for group of points
    return Math.floor(point[1] / msInterval) * msInterval;
  });

  // frame: { '<unixtime>': [[<value>, <unixtime>], ...] }
  // return [{ '<unixtime>': <value> }, { '<unixtime>': <value> }, ...]
  const grouped = _.mapValues(frames, frame => {
    const points = _.map(frame, point => {
      return point[0];
    });
    return groupByCallback(points);
  });

  // Convert points to Grafana format
  return sortByTime(
    _.map(grouped, (value, timestamp) => {
      return [Number(value), Number(timestamp)];
    })
  );
}

export function groupByPerf(
  datapoints: string | any[],
  interval: string,
  groupByCallback: { (values: any): any; (values: any): any; (arg0: any[]): any }
) {
  if (datapoints.length === 0) {
    return [];
  }

  if (interval === c.RANGE_VARIABLE_VALUE) {
    return groupByRange(datapoints, groupByCallback);
  }

  const msInterval = utils.parseInterval(interval) as number;
  const groupedSeries = [];
  let frameValues = [];
  let frameValue;
  let frameTS = datapoints.length ? getPointTimeFrame(datapoints[0][POINT_TIMESTAMP], msInterval) : 0;
  let pointFrameTS = frameTS;
  let point;

  for (let i = 0; i < datapoints.length; i++) {
    point = datapoints[i];
    pointFrameTS = getPointTimeFrame(point[POINT_TIMESTAMP], msInterval);
    if (pointFrameTS === frameTS) {
      frameValues.push(point[POINT_VALUE]);
    } else if (pointFrameTS > frameTS) {
      frameValue = groupByCallback(frameValues);
      groupedSeries.push([frameValue, frameTS]);

      // Move frame window to next non-empty interval and fill empty by null
      frameTS += msInterval as number;
      while (frameTS < pointFrameTS) {
        groupedSeries.push([null, frameTS]);
        frameTS += msInterval as number;
      }
      frameValues = [point[POINT_VALUE]];
    }
  }

  frameValue = groupByCallback(frameValues);
  groupedSeries.push([frameValue, frameTS]);

  return groupedSeries;
}

export function groupByRange(
  datapoints: string | any[],
  groupByCallback: { (values: any): any; (values: any): any; (arg0: any[]): any; (arg0: any[]): any }
) {
  const frameValues = [];
  const frameStart = datapoints[0][POINT_TIMESTAMP];
  const frameEnd = datapoints[datapoints.length - 1][POINT_TIMESTAMP];
  let point;
  for (let i = 0; i < datapoints.length; i++) {
    point = datapoints[i];
    frameValues.push(point[POINT_VALUE]);
  }
  const frameValue = groupByCallback(frameValues);
  return [
    [frameValue, frameStart],
    [frameValue, frameEnd],
  ];
}

/**
 * Summarize set of time series into one.
 * @param {datapoints[]} timeseries array of time series
 */
function sumSeries(timeseries: any[]) {
  // Calculate new points for interpolation
  let newTimestamps = _.uniq(
    _.map(_.flatten(timeseries), point => {
      return point[1];
    })
  );
  newTimestamps = _.sortBy(newTimestamps);

  const interpolatedTimeseries = _.map(timeseries, series => {
    series = fillZeroes(series, newTimestamps);
    const timestamps = _.map(series, point => {
      return point[1];
    });
    const newPoints = _.map(_.difference(newTimestamps, timestamps), timestamp => {
      return [null, timestamp];
    });
    const newSeries = series.concat(newPoints);
    return sortByTime(newSeries);
  });

  _.each(interpolatedTimeseries, interpolateSeries);

  const newTimeseries = [];
  let sum;
  for (let i = newTimestamps.length - 1; i >= 0; i--) {
    sum = 0;
    for (let j = interpolatedTimeseries.length - 1; j >= 0; j--) {
      sum += interpolatedTimeseries[j][i][0];
    }
    newTimeseries.push([sum, newTimestamps[i]]);
  }

  return sortByTime(newTimeseries);
}

function scale(datapoints: any, factor: number) {
  return _.map(datapoints, point => {
    return [point[0] * factor, point[1]];
  });
}

function scalePerf(datapoints: any[], factor: number) {
  for (let i = 0; i < datapoints.length; i++) {
    datapoints[i] = [datapoints[i][POINT_VALUE] * factor, datapoints[i][POINT_TIMESTAMP]];
  }

  return datapoints;
}

function offset(datapoints: any[], delta: any) {
  for (let i = 0; i < datapoints.length; i++) {
    datapoints[i] = [datapoints[i][POINT_VALUE] + delta, datapoints[i][POINT_TIMESTAMP]];
  }

  return datapoints;
}

/**
 * Simple delta. Calculate value delta between points.
 * @param {*} datapoints
 */
function delta(datapoints: any[]) {
  const newSeries = [];
  let deltaValue;
  for (let i = 1; i < datapoints.length; i++) {
    deltaValue = datapoints[i][0] - datapoints[i - 1][0];
    newSeries.push([deltaValue, datapoints[i][1]]);
  }
  return newSeries;
}

/**
 * Calculates rate per second. Resistant to counter reset.
 * @param {*} datapoints
 */
function rate(datapoints: any[]) {
  const newSeries = [];
  let point, pointPrev;
  let valueDelta = 0;
  let timeDelta = 0;
  for (let i = 1; i < datapoints.length; i++) {
    point = datapoints[i];
    pointPrev = datapoints[i - 1];

    // Convert ms to seconds
    timeDelta = (point[POINT_TIMESTAMP] - pointPrev[POINT_TIMESTAMP]) / 1000;

    // Handle counter reset - use previous value
    if (point[POINT_VALUE] >= pointPrev[POINT_VALUE]) {
      valueDelta = (point[POINT_VALUE] - pointPrev[POINT_VALUE]) / timeDelta;
    }

    newSeries.push([valueDelta, point[POINT_TIMESTAMP]]);
  }
  return newSeries;
}

function simpleMovingAverage(datapoints: any, n: number) {
  const sma = [];
  let wSum;
  let wAvg = null;
  let wCount = 0;

  // Initial window
  for (let j = n; j > 0; j--) {
    if (datapoints[n - j][POINT_VALUE] !== null) {
      wAvg += datapoints[n - j][POINT_VALUE];
      wCount++;
    }
  }
  if (wCount > 0 && wAvg) {
    wAvg = wAvg / wCount;
  } else {
    wAvg = null;
  }
  sma.push([wAvg, datapoints[n - 1][POINT_TIMESTAMP]]);

  for (let i = n; i < datapoints.length; i++) {
    // Insert next value
    if (datapoints[i][POINT_VALUE] !== null) {
      wSum = wAvg * wCount;
      wAvg = (wSum + datapoints[i][POINT_VALUE]) / (wCount + 1);
      wCount++;
    }
    // Remove left side point
    if (datapoints[i - n][POINT_VALUE] !== null) {
      wSum = wAvg * wCount;
      if (wCount > 1) {
        wAvg = (wSum - datapoints[i - n][POINT_VALUE]) / (wCount - 1);
        wCount--;
      } else {
        wAvg = null;
        wCount = 0;
      }
    }
    sma.push([wAvg, datapoints[i][POINT_TIMESTAMP]]);
  }
  return sma;
}

function expMovingAverage(datapoints: any[], n: number) {
  let ema = [datapoints[0]];
  let emaPrev = datapoints[0][POINT_VALUE];
  let emaCur;
  let a;

  if (n > 1) {
    // Calculate a from window size
    a = 2 / (n + 1);

    // Initial window, use simple moving average
    let wAvg = null;
    let wCount = 0;
    for (let j = n; j > 0; j--) {
      if (datapoints[n - j][POINT_VALUE] !== null) {
        wAvg += datapoints[n - j][POINT_VALUE];
        wCount++;
      }
    }
    if (wCount > 0 && wAvg) {
      wAvg = wAvg / wCount;
      // Actually, we should set timestamp from datapoints[n-1] and start calculation of EMA from n.
      // But in order to start EMA from first point (not from Nth) we should expand time range and request N additional
      // points outside left side of range. We can't do that, so this trick is used for pretty view of first N points.
      // We calculate AVG for first N points, but then start from 2nd point, not from Nth. In general, it means we
      // assume that previous N values (0-N, 0-(N-1), ..., 0-1) have the same average value as a first N values.
      ema = [[wAvg, datapoints[0][POINT_TIMESTAMP]]];
      emaPrev = wAvg;
      n = 1;
    }
  } else {
    // Use predefined a and start from 1st point (use it as initial EMA value)
    a = n;
    n = 1;
  }

  for (let i = n; i < datapoints.length; i++) {
    if (datapoints[i][POINT_VALUE] !== null) {
      emaCur = a * datapoints[i][POINT_VALUE] + (1 - a) * emaPrev;
      emaPrev = emaCur;
      ema.push([emaCur, datapoints[i][POINT_TIMESTAMP]]);
    } else {
      ema.push([null, datapoints[i][POINT_TIMESTAMP]]);
    }
  }
  return ema;
}

function PERCENTILE(n: number, values: any) {
  const sorted = _.sortBy(values);
  return sorted[Math.floor((sorted.length * n) / 100)];
}

function COUNT(values: any) {
  return values.length;
}

function SUM(values: any): any {
  let sum = null;
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null) {
      sum += values[i];
    }
  }
  return sum;
}

function AVERAGE(values: any) {
  const valuesNonNull = getNonNullValues(values);
  if (valuesNonNull.length === 0) {
    return null;
  }
  return SUM(valuesNonNull) / valuesNonNull.length;
}

function getNonNullValues(values: any) {
  const valuesNonNull = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null) {
      valuesNonNull.push(values[i]);
    }
  }
  return valuesNonNull;
}

function MIN(values: any) {
  return _.min(values);
}

function MAX(values: any) {
  return _.max(values);
}

function MEDIAN(values: any) {
  const sorted = _.sortBy(values);
  return sorted[Math.floor(sorted.length / 2)];
}

///////////////////////
// Utility functions //
///////////////////////

/**
 * For given point calculate corresponding time frame.
 *
 * |__*_|_*__|___*| -> |*___|*___|*___|
 *
 * @param {*} timestamp
 * @param {*} msInterval
 */
function getPointTimeFrame(timestamp: number, msInterval: number) {
  return Math.floor(timestamp / msInterval) * msInterval;
}

function sortByTime(series: any[]) {
  return _.sortBy(series, point => {
    return point[1];
  });
}

/**
 * Fill empty front and end of series by zeroes.
 *
 * |   ***   |    |   ***   |
 * |___   ___| -> |***   ***|
 * @param {*} series
 * @param {*} timestamps
 */
function fillZeroes(series: any[], timestamps: any[]) {
  const prepend = [];
  const append = [];
  let newPoint;
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i] < series[0][POINT_TIMESTAMP]) {
      newPoint = [0, timestamps[i]];
      prepend.push(newPoint);
    } else if (timestamps[i] > series[series.length - 1][POINT_TIMESTAMP]) {
      newPoint = [0, timestamps[i]];
      append.push(newPoint);
    }
  }
  return _.concat(_.concat(prepend, series), append);
}

/**
 * Interpolate series with gaps
 */
function interpolateSeries(series: any[]) {
  let left, right;

  // Interpolate series
  for (let i = series.length - 1; i >= 0; i--) {
    if (!series[i][0]) {
      left = findNearestLeft(series, i);
      right = findNearestRight(series, i);
      if (!left) {
        left = right;
      }
      if (!right) {
        right = left;
      }
      series[i][0] = linearInterpolation(series[i][1], left, right);
    }
  }
  return series;
}

function linearInterpolation(timestamp: number, left: number[], right: number[]) {
  if (left[1] === right[1]) {
    return (left[0] + right[0]) / 2;
  } else {
    return left[0] + ((right[0] - left[0]) / (right[1] - left[1])) * (timestamp - left[1]);
  }
}

function findNearestRight(series: any[], pointIndex: number) {
  for (let i = pointIndex; i < series.length; i++) {
    if (series[i][0] !== null) {
      return series[i];
    }
  }
  return null;
}

function findNearestLeft(series: any[], pointIndex: number) {
  for (let i = pointIndex; i > 0; i--) {
    if (series[i][0] !== null) {
      return series[i];
    }
  }
  return null;
}

function flattenDatapoints(datapoints: any[]) {
  const depth = utils.getArrayDepth(datapoints);
  if (depth <= 2) {
    // Don't process if datapoints already flattened
    return datapoints;
  }
  return _.flatten(datapoints);
}

////////////
// Export //
////////////

const exportedFunctions = {
  downsample,
  groupBy,
  groupByPerf,
  groupByRange,
  sumSeries,
  scale,
  offset,
  scalePerf,
  delta,
  rate,
  simpleMovingAverage,
  expMovingAverage,
  SUM,
  COUNT,
  AVERAGE,
  MIN,
  MAX,
  MEDIAN,
  PERCENTILE,
  sortByTime,
  flattenDatapoints,
};

export default exportedFunctions;
