import _ from 'lodash';

export default class ResponseParser {
  constructor(private results: any) {}

  parseArchiverResponse() {
    const data: Array<{ target?: any; datapoints?: any }> = [];

    if (!this.results || this.results.length === 0) {
      return { data: data };
    }

    const archiverResults = this.results[0].result;
    if (!archiverResults.meta.name || !archiverResults.data) {
      return { data: data };
    }

    data.push({ target: this.results[0].meta.name });
    data.push({ datapoints: this.results[0].data.map((item: any) => [item.val, item.millis]) });

    return { data: data };
  }
}
