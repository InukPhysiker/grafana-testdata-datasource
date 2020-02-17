import _ from 'lodash';

export default class ResponseParser {
  constructor(private results: any) {}

  parseArchiverResponse() {
    const data: { target?: any; datapoints?: any; }[] = [];

    if (!this.results || this.results.results.length === 0) {
      return { data: data };
    }

    const archiverResults = this.results.results[0];
    if (!archiverResults.meta.name || !archiverResults.data) {
      return { data: data };
    }

    data.push({target: this.results.meta.name});
    data.push({datapoints: this.results.data.map((item: any) => [item.val, item.millis])});

    return { data: data };

  }
}
