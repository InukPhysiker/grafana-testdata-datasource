import _ from 'lodash';

import ResponseParser from './response_parser';

// import UrlBuilder from './url_builder';

import { DataSourceApi, DataQueryRequest, DataQueryResponse, DataSourceInstanceSettings } from '@grafana/data';

import { EpicsQuery, EpicsJsonData } from './types';

// import EpicsMetricFindQuery from './EpicsMetricFindQuery';

// Zabbix stuff
import dataProcessor from './dataProcessor';
import * as utils from './utils';
import * as metricFunctions from './metricFunctions';

export default class EpicsDataSource extends DataSourceApi<EpicsQuery, EpicsJsonData> {
  backendSrv: any;
  templateSrv: any;
  defaultDropdownValue: 'pv name';
  baseUrl: string;
  url: string;
  servlet: string;
  variables: any;
  standardAreas: any;
  standardDevices: any;
  archiverOperators: string[];
  customOperators: string[];
  datasourceOperators: string[];

  constructor(instanceSettings: DataSourceInstanceSettings<EpicsJsonData>, backendSrv: any, templateSrv: any) {
    super(instanceSettings);
    this.url = instanceSettings.url;
    this.baseUrl = `/retrieval/`;
    this.servlet = `data/getData.qw?`;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.variables = this.templateSrv.variables;
    this.standardAreas = ['1401', '1402', '1403', '1404', '1405', '1406', '1407', '1408', '1409', '1410'];
    this.standardDevices = ['TM', 'HM', 'PT', 'IOP', 'CCG'];
    this.archiverOperators = ['mean', 'min', 'max', 'count', 'jitter', 'std', 'variance', 'popvariance'];
    this.customOperators = ['raw'];
    this.datasourceOperators = [...this.archiverOperators, ...this.customOperators];
  }

  async query(options: DataQueryRequest<EpicsQuery>): Promise<DataQueryResponse> {
    const queries = _.filter(options.targets, item => {
      return item.hide !== true && item.metricName && item.metricName !== this.defaultDropdownValue;
    }).map(target => {
      const item = target;

      return Object.values(item.operators).map((operator: string) => {
        // const retrievalParameters = UrlBuilder.buildArchiveRetrievalUrl(item.metricName, operator, options.range, options.intervalMs);

        const binSize = Math.round(options.intervalMs / 1000);

        let retrievalParameters = 'pv=';

        if (this.archiverOperators.includes(operator)) {
          retrievalParameters += operator + '_' + binSize.toString();
        } // retrieve raw data with no down sampling

        retrievalParameters += '(' + item.metricName + ')';
        retrievalParameters += '&from=' + options.range.from.toISOString();
        retrievalParameters += '&to=' + options.range.to.toISOString();
        retrievalParameters += '&fetchLatestMetadata=false';

        return {
          // refId: string;
          // hide?: boolean;
          // key?: string;
          // datasource?: string | null;
          // metric?: any;
          refId: target.refId,
          // intervalMs: options.intervalMs,
          // maxDataPoints: options.maxDataPoints,
          datasourceId: this.id,
          url: `${this.baseUrl}${this.servlet}${retrievalParameters}`,
          alias: item.metricName + ' ' + operator,
          requestId: options.requestId,
          // dashboardId: number;
          // interval: string;
          intervalMs: options.intervalMs,
          maxDataPoints: options.maxDataPoints,
          // panelId: number;
          range: options.range,
          // reverse?: boolean;
          // scopedVars: ScopedVars;
          // targets: TQuery[];
          // timezone: string;
          // app: CoreApp | string;
          // cacheTimeout?: string;
          // exploreMode?: 'Logs' | 'Metrics';
          // rangeRaw?: RawTimeRange;
          // timeInfo?: string;
          // startTime: number;
          // endTime?: number;
        };
      });
    });

    if (!queries || queries.length === 0) {
      return { data: [] };
    }

    const promises = this.doQueries(_.flatten(queries));

    return Promise.all(promises).then(results => {
      return new ResponseParser(results).parseArchiverResponse();
    });
    
  }

  doQueries(queries: any) {
    return _.map(queries, query => {
      return this.doRequest(query.url)
        .then(result => {
          return {
            result: result,
            query: query,
          };
        })
        .catch(err => {
          throw {
            error: err,
            query: query,
          };
        });
    });
  }

  // async metricFindQuery(query: any) {
  //   const epicsMetricFindQuery = new EpicsMetricFindQuery(this);
  //   return epicsMetricFindQuery.execute(query);
  // }

  async metricFindQuery(query: string) {
    let pvstring;

    const areaQuery = query.match(/^areas\(\)/);
    if (areaQuery) {
      return this.standardAreas.map((s: string) => ({ value: s, label: s, text: s }));
    }

    const deviceQuery = query.match(/^devices\(\)/);
    if (deviceQuery) {
      return this.standardDevices.map((s: string) => ({ value: s, label: s, text: s }));
    }

    // Regular expression must match allowable process variable names
    const metricNameQuery = query.match(/^metrics\(([a-zA-Z0-9\-:)]*)\)/);
    if (metricNameQuery) {
      pvstring = metricNameQuery[1];
      return this.getPVNames(pvstring).then((results: any) => {
        return _.map(results, item => {
          return {
            value: item,
            label: item,
            text: item,
          };
        });
      });
    }

    // const statsQuery = query.match(/^statistics\(\)/);
    // if (statsQuery) {
    //   return this.standardStatistics.map((s: string) => ({ value: s, label: s, text: s }));
    // }

    const operatorQuery = query.match(/^operators\(\)/);
    if (operatorQuery) {
      return this.archiverOperators.map((s: string) => ({ value: s, label: s, text: s }));
    }

    return Promise.resolve([]);
  }

  getPVNames(pvstring: string) {
    return this.backendSrv
      .datasourceRequest({
        url: this.url + '/retrieval/bpl/getMatchingPVs?limit=36&pv=' + pvstring + '*',
        method: 'GET',
        params: { output: 'json' },
      })
      .then((response: { status: number; data: any }) => {
        if (response.status === 200) {
          return response.data;
        } else {
          return [];
        }
      })
      .catch((error: any) => {
        return;
      });
  }

  async testDatasource() {
    let status: any, message: any;
    const defaultErrorMessage = 'Cannot connect to EPICS Archiver Appliance';
    try {
      const path = `ui/viewer/archViewer.html`;
      const response = await this.doRequest(`${this.baseUrl}${path}`);
      if (response.status === 200) {
        status = 'success';
        message = 'EPICS Archiver Appliance Connection OK';
      } else {
        status = 'error';
        message = response.statusText ? response.statusText : defaultErrorMessage;
      }
    } catch (error) {
      status = 'error';
      if (_.isString(error)) {
        message = error;
      } else {
        message = 'EPICS Archiver Appliance: ';
        message += error.statusText ? error.statusText : defaultErrorMessage;
        if (error.data && error.data.error && error.data.error.code) {
          message += ': ' + error.data.error.code + '. ' + error.data.error.message;
        }
      }
    } finally {
      return {
        status,
        message,
      };
    }
  }

  async doRequest(url: any, maxRetries = 1) {
    return this.backendSrv
      .datasourceRequest({
        url: this.url + url,
        method: 'GET',
      })
      .catch((error: any) => {
        if (maxRetries > 0) {
          return this.doRequest(url, maxRetries - 1);
        }
        throw error;
      });
  }

  // Zabbix stuff

  getTrendValueType(target: { functions: any; }) {
    // Find trendValue() function and get specified trend value
    const trendFunctions = _.map(metricFunctions.getCategories()['Trends'], 'name');
    const trendValueFunc = _.find(target.functions, func => {
      return _.includes(trendFunctions, func.def.name);
    });
    return trendValueFunc ? trendValueFunc.params[0] : "avg";
  }

  applyDataProcessingFunctions(timeseriesData: _.NumericDictionary<unknown>, target: { functions: any }) {
    const transformFunctions = this.bindFunctionDefs(target.functions, 'Transform');
    const aggregationFunctions = this.bindFunctionDefs(target.functions, 'Aggregate');
    const filterFunctions = this.bindFunctionDefs(target.functions, 'Filter');
    const aliasFunctions = this.bindFunctionDefs(target.functions, 'Alias');

    // Apply transformation functions
    timeseriesData = _.cloneDeep(
      _.map(timeseriesData, (timeseries: any) => {
        timeseries.datapoints = utils.sequence(transformFunctions)(timeseries.datapoints);
        return timeseries;
      })
    );

    // Apply filter functions
    if (filterFunctions.length) {
      timeseriesData = utils.sequence(filterFunctions)(timeseriesData);
    }

    // Apply aggregations
    if (aggregationFunctions.length) {
      let dp = _.map(timeseriesData, 'datapoints');
      dp = utils.sequence(aggregationFunctions)(dp);

      const aggFuncNames = _.map(metricFunctions.getCategories()['Aggregate'], 'name');
      const lastAgg = _.findLast(target.functions, func => {
        return _.includes(aggFuncNames, func.def.name);
      });

      timeseriesData = [
        {
          target: lastAgg.text,
          datapoints: dp,
        },
      ];
    }

    // Apply alias functions
    _.forEach(timeseriesData, utils.sequence(aliasFunctions));

    // Apply Time-related functions (timeShift(), etc)
    // Find timeShift() function and get specified trend value
    this.applyTimeShiftFunction(timeseriesData, target);

    return timeseriesData;
  }

  applyTimeShiftFunction(timeseriesData: any, target: { functions: any }) {
    // Find timeShift() function and get specified interval
    const timeShiftFunc = _.find(target.functions, func => {
      return func.def.name === 'timeShift';
    });
    if (timeShiftFunc) {
      const shift = timeShiftFunc.params[0];
      _.forEach(timeseriesData, series => {
        series.datapoints = dataProcessor.unShiftTimeSeries(shift, series.datapoints);
      });
    }
  }

  bindFunctionDefs(functionDefs: any, category: string | number) {
    const aggregationFunctions = _.map(metricFunctions.getCategories()[category], 'name');
    const aggFuncDefs = _.filter(functionDefs, func => {
      return _.includes(aggregationFunctions, func.def.name);
    });

    return _.map(aggFuncDefs, func => {
      const funcInstance = metricFunctions.createFuncInstance(func.def, func.params);
      return funcInstance.bindFunction(dataProcessor.metricFunctions);
    });
  }

  downsampleSeries(timeseriesData: any, options: any) {
    const defaultAgg = dataProcessor.aggregationFunctions['avg'];
    const consolidateByFunc = dataProcessor.aggregationFunctions[options.consolidateBy] || defaultAgg;
    return _.map(timeseriesData, timeseries => {
      if (timeseries.datapoints.length > options.maxDataPoints) {
        timeseries.datapoints = dataProcessor.groupBy(options.interval, consolidateByFunc, timeseries.datapoints);
      }
      return timeseries;
    });
  }
}
