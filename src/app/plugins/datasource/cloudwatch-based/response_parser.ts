import _ from 'lodash';

export default class ResponseParser {
  constructor(private results: any) {}

  parseArchiverResponse() {
    const data: Array<{ target?: any; datapoints?: any }> = [];

    if (!this.results || this.results.length === 0) {
      return { data: data };
    }

    Object.values(this.results).forEach((element: any) => {
      if (!element.result.data[0].meta.name || element.result.data[0].data.length === 0) {
        return;
      }
      data.push({
        target: element.query.alias || element.result.data[0].meta.name,
        datapoints: element.result.data[0].data.map((item: any) => [item.val, item.millis]),
      });
    });

    return { data: data };
  }
}
