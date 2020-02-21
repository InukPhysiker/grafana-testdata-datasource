import _ from 'lodash';
import moment from 'moment';

export default class EPICSArchAppDatasource {
  id: number;
  url: string;
  jsonData: any;

  /** @ngInject */
  constructor(
    instanceSettings: any,
    private backendSrv: any,
    // private templateSrv: any,
    private $q: any
  ) {
    this.id = instanceSettings.id;
    this.url = instanceSettings.url;
    this.jsonData = instanceSettings.jsonData;
  }

  query(options: any) {
    if (options.targets.length <= 0) {
      return this.$q.when({ data: [] });
    }

    const pvname = options.targets[0].pvname;

    if (pvname === '' || pvname === undefined) {
      return this.$q.when({ data: [] });
    }

    const startTime = new Date(options.range.from);
    const stopTime = new Date(options.range.to);

    // ISO string required by EPICS Archiver Appliance
    const startTimeISO = startTime.toISOString();
    const stopTimeISO = stopTime.toISOString();

    // milliseconds required for time range calculation
    const startTimems = startTime.getTime();
    const stopTimems = stopTime.getTime();

    const timeRange = moment.duration(stopTimems - startTimems);

    // EPICS Archiver Appliances uses the following sampling values:
    //
    // 30m --> lastSample_5
    //  4h --> lastSample_15
    //  8h --> lastSample_30
    //  1d --> lastSample_120
    //  2d --> lastSample_180
    //  1w --> lastSample_600
    //  2w --> lastSample_1200
    //  1M --> lastSample_3600
    //  6M --> lastSample_14400
    //  1Y --> lastSample_43200

    // setSamplingOption does the same and interpolates for other time ranges

    let sampleRate = 1; // retrieve all data points

    if (timeRange.asDays() < 1) {
      sampleRate = 5 * Math.round((3.5 * timeRange.asHours() + 1) / 5.0) || 1;
    } else if (timeRange.asWeeks() < 1) {
      sampleRate = 60 * Math.round(timeRange.asDays());
    } else if (timeRange.asMonths() < 1) {
      sampleRate = 600 * Math.round(timeRange.asWeeks());
    } else if (Math.round(timeRange.asMonths()) === 6) {
      sampleRate = 14440;
    } else if (timeRange.asMonths() >= 1) {
      sampleRate = 3600 * Math.round(timeRange.asMonths());
    }

    const grafanaResponse = {};

    // For each one of the metrics the user entered:
    const requests = options.targets.map((target: any) => {
      return new Promise(resolve => {
        if (target.hide || target.pvname === 'pv name') {
          // If the user clicked on the eye icon to hide, don't fetch the metrics.
          return resolve();
        } else {
          return new Promise(innerResolve => {
            this.getMetrics(target, grafanaResponse, startTimeISO, stopTimeISO, sampleRate, resolve);
          });
        }
      });
    });

    return Promise.all(requests).then(() => {
      return grafanaResponse;
    });
  }

  getMetrics(
    target: any,
    grafanaResponse: any,
    startTime: string,
    stopTime: string,
    sampleRate: string | number,
    callback: { (value?: unknown): void; (): void }
  ) {
    const pvname = target.pvname;

    let retrievalQuery = '';

    switch (target.queryType) {
      case 'firstSample': {
        retrievalQuery = 'pv=firstSample_';
        break;
      }
      case 'lastSample': {
        retrievalQuery = 'pv=lastSample_';
        break;
      }
      case 'min': {
        retrievalQuery = 'pv=min_';
        break;
      }
      case 'max': {
        retrievalQuery = 'pv=max_';
        break;
      }
      case 'mean': {
        retrievalQuery = 'pv=mean_';
        break;
      }
      default: {
        // Fix later
        retrievalQuery = 'pv=lastSample_';
        break;
      }
    }

    retrievalQuery += sampleRate + '(' + pvname + ')' + '&from=' + startTime + '&to=' + stopTime + '&fetchLatestMetadata=true';

    return this.backendSrv
      .datasourceRequest({
        // url: `api/datasources/proxy/${this.id}/dataRetrievalURL/data/getData.qw?${retrievalQuery}`
        url: this.url + `/retrieval/data/getData.qw?${retrievalQuery}`,
      })
      .then((response: any) => {
        // valetr data = [], datapoints = [], titles = [];
        const datapoints = [];
        // let i = 0;
        let j = 0;

        if (response.data[0].data) {
          // let timepos = 0;
          for (j = 0; j < response.data[0].data.length; j++) {
            datapoints.push([response.data[0].data[j]['val'], +new Date(response.data[0].data[j]['millis'])]);
          }
          grafanaResponse.data.push({
            target: response.data[0].meta.name,
            datapoints: datapoints,
            refid: target.refid,
          });
        }
      })
      .then(() => {
        callback();
      })
      .catch((err: any) => {
        // Unable to get metrics
        // let errMsg = 'Error getting metrics.';
        callback();
      });
  }

  annotationQuery(options: any) {
    throw new Error('Annotation Support not implemented yet.');
  }

  metricFindQuery(query: string) {
    throw new Error('Template Variable Support not implemented yet.');
  }

  // pv
  // An optional argument that can contain a GLOB wildcard. We will return PVs that match this GLOB.
  // For example, if pv=KLYS*, the server will return all PVs that start with the string KLYS.
  // regex
  // An optional argument that can contain a Java regex wildcard. We will return PVs that match this regex.
  // For example, if pv=KLYS.*, the server will return all PVs that start with the string KLYS.
  // limit
  // An optional argument that specifies the number of matched PV's that are returned.
  // If unspecified, we return 500 PV names. To get all the PV names, (potentially in the millions), set limit to 1.

  getPVNames(query: string) {
    // const templatedQuery = this.templateSrv.replace(query);
    return this.backendSrv
      .datasourceRequest({
        url: this.url + '/retrieval/bpl/getMatchingPVs?limit=36&pv=' + query + '*',
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

  testDatasource() {
    return this.backendSrv
      .datasourceRequest({
        url: this.url,
        method: 'GET',
      })
      .then((res: any) => {
        return {
          status: 'success',
          message: 'EPICS Archiver Appliance Connection OK',
        };
      })
      .catch((err: { data: { message: any }; status: any }) => {
        console.log(err);
        if (err.data && err.data.message) {
          return {
            status: 'error',
            message: err.data.message,
          };
        } else {
          return {
            status: 'error',
            message: err.status,
          };
        }
      });
  }
}
