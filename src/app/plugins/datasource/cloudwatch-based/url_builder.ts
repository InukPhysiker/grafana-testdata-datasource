export default class UrlBuilder {
  static buildArchiveRetrievalUrl(pvname: string, operator: string, range: any, intervalMs: number) {
    const binSize = Math.round(intervalMs / 1000);

    let retrievalParameters = '';

    switch (operator) {
      case 'firstSample': {
        retrievalParameters = 'pv=firstSample_';
        break;
      }
      case 'lastSample': {
        retrievalParameters = 'pv=lastSample_';
        break;
      }
      case 'Minimum': {
        retrievalParameters = 'pv=min_';
        break;
      }
      case 'Maximum': {
        retrievalParameters = 'pv=max_';
        break;
      }
      case 'Average': {
        retrievalParameters = 'pv=mean_';
        break;
      }
      default: {
        // Fix later
        retrievalParameters = 'pv=lastSample_';
        break;
      }
    }

    retrievalParameters +=
      binSize + '(' + pvname + ')' + '&from=' + range.from.toISOString() + '&to=' + range.to.toISOString() + '&fetchLatestMetadata=false';

    return retrievalParameters;
  }
}
