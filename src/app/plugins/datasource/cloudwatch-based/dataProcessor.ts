import _ from 'lodash';
import * as utils from './utils';
import ts, { groupByPerf as groupBy } from './timeseries';

const SUM = ts.SUM;
const COUNT = ts.COUNT;
const AVERAGE = ts.AVERAGE;
const MIN = ts.MIN;
const MAX = ts.MAX;
const MEDIAN = ts.MEDIAN;
const PERCENTILE = ts.PERCENTILE;

const downsampleSeries = ts.downsample;
const groupByExported = (interval: any, groupFunc: any, datapoints: any) => groupBy(datapoints, interval, groupFunc);
const sumSeries = ts.sumSeries;
const delta = ts.delta;
const rate = ts.rate;
const scale = (factor: number, datapoints: any[]) => ts.scalePerf(datapoints, factor);
const offset = (delta: any, datapoints: any[]) => ts.offset(datapoints, delta);
const simpleMovingAverage = (n: number, datapoints: any) => ts.simpleMovingAverage(datapoints, n);
const expMovingAverage = (a: number, datapoints: any[]) => ts.expMovingAverage(datapoints, a);
const percentile = (interval: string, n: number, datapoints: string | any[]) => groupBy(datapoints, interval, _.partial(PERCENTILE, n));

function limit(order: string, n: number, orderByFunc: string | number, timeseries: any) {
  const orderByCallback = aggregationFunctions[orderByFunc];
  const sortByIteratee = (ts: { datapoints: any }) => {
    const values = _.map(ts.datapoints, point => {
      return point[0];
    });
    return orderByCallback(values);
  };
  const sortedTimeseries = _.sortBy(timeseries, sortByIteratee);
  if (order === 'bottom') {
    return sortedTimeseries.slice(0, n);
  } else {
    return sortedTimeseries.slice(-n);
  }
}

function removeAboveValue(n: number, datapoints: any) {
  return _.map(datapoints, point => {
    return [point[0] > n ? null : point[0], point[1]];
  });
}

function removeBelowValue(n: number, datapoints: any) {
  return _.map(datapoints, point => {
    return [point[0] < n ? null : point[0], point[1]];
  });
}

function transformNull(n: any, datapoints: any) {
  return _.map(datapoints, point => {
    return [point[0] !== null ? point[0] : n, point[1]];
  });
}

function sortSeries(direction: any, timeseries: any[]) {
  return _.orderBy(
    timeseries,
    [
      ts => {
        return ts.target.toLowerCase();
      },
    ],
    direction
  );
}

function setAlias(alias: any, timeseries: { target: any }) {
  timeseries.target = alias;
  return timeseries;
}

function replaceAlias(regexp: string, newAlias: any, timeseries: { target: string }) {
  let pattern;
  if (utils.isRegex(regexp)) {
    pattern = utils.buildRegex(regexp);
  } else {
    pattern = regexp;
  }

  const alias = timeseries.target.replace(pattern, newAlias);
  timeseries.target = alias;
  return timeseries;
}

function setAliasByRegex(alias: any, timeseries: { target: string }) {
  timeseries.target = extractText(timeseries.target, alias);
  return timeseries;
}

function extractText(str: string, pattern: string | RegExp) {
  const extractPattern = new RegExp(pattern);
  const extractedValue = extractPattern.exec(str);
  // extractedValue = extractedValue[0];
  return extractedValue[0];
}

function groupByWrapper(interval: string, groupFunc: string | number, datapoints: any[]) {
  const groupByCallback = aggregationFunctions[groupFunc];
  return groupBy(datapoints, interval, groupByCallback);
}

function aggregateByWrapper(interval: string, aggregateFunc: string | number, datapoints: any[]) {
  // Flatten all points in frame and then just use groupBy()
  const flattenedPoints = ts.flattenDatapoints(datapoints);
  // groupBy_perf works with sorted series only
  const sortedPoints = ts.sortByTime(flattenedPoints);
  const groupByCallback = aggregationFunctions[aggregateFunc];
  return groupBy(sortedPoints, interval, groupByCallback);
}

function aggregateWrapper(groupByCallback: { (values: any): any; (values: any): any; (arg0: any[]): any }, interval: string, datapoints: any[]) {
  const flattenedPoints = ts.flattenDatapoints(datapoints);
  // groupBy_perf works with sorted series only
  const sortedPoints = ts.sortByTime(flattenedPoints);
  return groupBy(sortedPoints, interval, groupByCallback);
}

function percentileAgg(interval: string, n: number, datapoints: any[]) {
  const flattenedPoints = ts.flattenDatapoints(datapoints);
  // groupBy_perf works with sorted series only
  const sortedPoints = ts.sortByTime(flattenedPoints);
  const groupByCallback = _.partial(PERCENTILE, n);
  return groupBy(sortedPoints, interval, groupByCallback);
}

function timeShift(interval: string, range: any) {
  const shift = utils.parseTimeShiftInterval(interval) / 1000;
  return _.map(range, time => {
    return time - shift;
  });
}

function unShiftTimeSeries(interval: string, datapoints: any) {
  const unshift = utils.parseTimeShiftInterval(interval);
  return _.map(datapoints, dp => {
    return [dp[0], dp[1] + unshift];
  });
}

const metricFunctions = {
  groupBy: groupByWrapper,
  scale: scale,
  offset: offset,
  delta: delta,
  rate: rate,
  movingAverage: simpleMovingAverage,
  exponentialMovingAverage: expMovingAverage,
  percentile: percentile,
  transformNull: transformNull,
  aggregateBy: aggregateByWrapper,
  // Predefined aggs
  percentileAgg: percentileAgg,
  average: _.partial(aggregateWrapper, AVERAGE),
  min: _.partial(aggregateWrapper, MIN),
  max: _.partial(aggregateWrapper, MAX),
  median: _.partial(aggregateWrapper, MEDIAN),
  sum: _.partial(aggregateWrapper, SUM),
  count: _.partial(aggregateWrapper, COUNT),
  sumSeries: sumSeries,
  removeAboveValue: removeAboveValue,
  removeBelowValue: removeBelowValue,
  top: _.partial(limit, 'top'),
  bottom: _.partial(limit, 'bottom'),
  sortSeries: sortSeries,
  timeShift: timeShift,
  setAlias: setAlias,
  setAliasByRegex: setAliasByRegex,
  replaceAlias: replaceAlias,
};

const aggregationFunctions: { [index: string]: any } = {
  avg: AVERAGE,
  min: MIN,
  max: MAX,
  median: MEDIAN,
  sum: SUM,
  count: COUNT,
};

export default {
  downsampleSeries: downsampleSeries,
  groupBy: groupByExported,
  AVERAGE: AVERAGE,
  MIN: MIN,
  MAX: MAX,
  MEDIAN: MEDIAN,
  SUM: SUM,
  COUNT: COUNT,
  unShiftTimeSeries: unShiftTimeSeries,

  get aggregationFunctions() {
    return aggregationFunctions;
  },

  get metricFunctions() {
    return metricFunctions;
  },
};
