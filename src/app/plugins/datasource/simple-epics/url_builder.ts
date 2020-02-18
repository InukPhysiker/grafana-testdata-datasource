import moment from 'moment';

export default class UrlBuilder {
  static buildArchiveRetrievalUrl(
    pvname: string,
    operator: string,
    range: any,
    intervalMs: number,
    maxDataPoints: number
  ) {

    // TODO: deal with maxDataPoints

    // var startTime = new Date(range.from);
    // var stopTime = new Date(range.to);

    // ISO string required by EPICS Archiver Appliance
    // var startTimeISO = startTime.toISOString();
    // var stopTimeISO = stopTime.toISOString();

    // milliseconds required for time range calculation
    // var startTime_ms = startTime.getTime();
    // var stopTime_ms = stopTime.getTime();

    // var time_range = moment.duration(stopTime_ms - startTime_ms);
    var time_range = moment.duration(intervalMs);

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

    var sampleRate = 1; // retrieve all data points

    if (time_range.asDays() < 1) {
        sampleRate = 5 * Math.round((3.5 * (time_range.asHours()) + 1) / 5.0) || 1;
    } else if (time_range.asWeeks() < 1) {
        sampleRate = 60 * Math.round(time_range.asDays());
    } else if (time_range.asMonths() < 1) {
        sampleRate = 600 * Math.round(time_range.asWeeks());
    } else if (Math.round(time_range.asMonths()) == 6) {
        sampleRate = 14440
    } else if (time_range.asMonths() >= 1) {
        sampleRate = 3600 * Math.round(time_range.asMonths());
    }

    switch(operator) { 
      case 'firstSample': { 
          var retrievalParameters = 'pv=firstSample_' 
         break; 
      } 
      case 'lastSample': { 
          var retrievalParameters = 'pv=lastSample_' 
         break; 
      } 
      case 'min': { 
          var retrievalParameters = 'pv=min_' 
         break; 
      } 
      case 'max': { 
          var retrievalParameters = 'pv=max_' 
         break; 
      } 
      case 'mean': { 
          var retrievalParameters = 'pv=mean_' 
         break; 
      } 
      default: { 
          // Fix later
          var retrievalParameters = 'pv=lastSample_' 
         break; 
      } 
   }

   retrievalParameters +=
      sampleRate
      + '(' + pvname + ')'
      + '&from=' + range.from.toISOString()
      + '&to=' + range.to.toISOString()
      + '&fetchLatestMetadata=false';

      return retrievalParameters;

  }

}
