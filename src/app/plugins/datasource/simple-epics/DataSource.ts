import _ from 'lodash';

import defaults from 'lodash/defaults';

import { DataQueryRequest, DataQueryResponse, DataSourceApi, DataSourceInstanceSettings, MutableDataFrame, FieldType } from '@grafana/data';

import { EpicsQuery, EpicsDataSourceOptions, defaultQuery } from './types';

export class DataSource extends DataSourceApi<EpicsQuery, EpicsDataSourceOptions> {
  backendSrv: any;
  baseUrl: string;
  url: string;
  constructor(
    instanceSettings: DataSourceInstanceSettings<EpicsDataSourceOptions>,
    backendSrv: any
    ) {
    super(instanceSettings);
    this.baseUrl = `/retrieval/`;
    this.url = instanceSettings.url;
  }

  async query(options: DataQueryRequest<EpicsQuery>): Promise<DataQueryResponse> {
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    // Return a constant for each query.
    const data = options.targets.map(target => {
      const query = defaults(target, defaultQuery);
      return new MutableDataFrame({
        refId: query.refId,
        fields: [
          { name: 'Time', values: [from, to], type: FieldType.time },
          { name: 'Value', values: [query.constant, query.constant], type: FieldType.number },
        ],
      });
    });

    return { data };
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
