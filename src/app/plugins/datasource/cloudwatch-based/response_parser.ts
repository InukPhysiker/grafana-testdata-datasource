import _ from 'lodash';

export default class ResponseParser {
  constructor(private results: any) {}

  parseArchiverResponse() {
    const data: Array<{ target?: any; datapoints?: any }> = [];

    if (!this.results || this.results.length === 0) {
      return { data: data };
    }

    this.results.array.forEach((element: any) => {
      data.push({
        target: element.meta.name,
        datapoints: element.data.map((item: any) => [item.val, item.millis])
      })
      
    });

    return { data: data };
  }
}
