// import angular from 'angular';
import _ from 'lodash';

// import * as dateMath from '@grafana/data';
// import kbn from 'app/core/utils/kbn';

// import defaults from 'lodash/defaults';

import ResponseParser from './response_parser';

import UrlBuilder from './url_builder';

// import { DataSourceApi, DataQueryRequest, DataSourceInstanceSettings } from '@grafana/ui/src/types';
import { DataQueryRequest, DataQueryResponse, DataSourceApi, DataSourceInstanceSettings } from '@grafana/data';

import { EpicsQuery, EpicsJsonData } from './types';

export default class EpicsDataSource extends DataSourceApi<EpicsQuery, EpicsJsonData> {


  backendSrv: any;
  templateSrv: any;
  defaultDropdownValue: 'pv name';
  baseUrl: string;
  url: string;
  servlet: string;
  // Cloudwatch
  standardStatistics: any;
  variables: any;

  constructor(instanceSettings: DataSourceInstanceSettings<EpicsJsonData>, backendSrv: any, templateSrv: any) {
    super(instanceSettings);
    this.url = instanceSettings.url;
    this.baseUrl = `/retrieval/`;
    this.servlet = `data/getData.qw?`;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.variables = this.templateSrv.variables;
    this.standardStatistics = ['Average', 'Maximum', 'Minimum', 'Sum', 'SampleCount'];
  }

  async query(options: DataQueryRequest<EpicsQuery>): Promise<DataQueryResponse> {
    // const queries: any[] = [];
    // const streams: Array<Observable<DataQueryResponse>> = [];

    const queries = _.filter(options.targets, item => {
      return item.hide !== true && item.pvname && item.pvname !== this.defaultDropdownValue;
    }).map(target => {
      const item = target;

      const retrievalParameters = UrlBuilder.buildArchiveRetrievalUrl(
        item.pvname,
        item.operator,
        options.range,
        options.intervalMs,
        options.maxDataPoints
      );

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
        alias: item.alias,
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

    if (!queries || queries.length === 0) {
      return { data: [] };
    }

    const promises = this.doQueries(queries);

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
}
