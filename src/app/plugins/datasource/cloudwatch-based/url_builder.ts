// import moment from 'moment';

export default class UrlBuilder {
  static buildArchiveRetrievalUrl(pvname: string, operator: string, range: any, intervalMs: number, maxDataPoints: number) {
    // TODO: deal with maxDataPoints

    // const timeRange = moment.duration(intervalMs);

    // EPICS Archiver Appliances uses the following sampling values:
    const binSize = determineBinSize(intervalMs, maxDataPoints);

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

// Compute the bin size for the operators automatically based on the number of points in the plot window and (endTime - startTime).
function determineBinSize(intervalMs: number, maxDataPoints: number) {
	var duration = intervalMs/1000;
  var points = maxDataPoints;
  var binSize: number;
	if(duration <= 2*points) {
		binSize = 0;
	}
	var potentialBinSizes = [5, 10, 15, 30, 60, 120, 180, 300, 600, 1200, 1800, 3600, 7200, 14400, 21600, 43200, 86400];
	for(const i in potentialBinSizes) {
		var potentialBinSize = potentialBinSizes[i];
		if((duration/potentialBinSize) <= 2*maxDataPoints) {
			binSize = potentialBinSize;
			break;
		}
  }
  return binSize;
}
