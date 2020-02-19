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

        // let startTime = new Date(range.from);
        // let stopTime = new Date(range.to);

        // ISO string required by EPICS Archiver Appliance
        // let startTimeISO = startTime.toISOString();
        // let stopTimeISO = stopTime.toISOString();

        // milliseconds required for time range calculation
        // let startTime_ms = startTime.getTime();
        // let stopTime_ms = stopTime.getTime();

        // let time_range = moment.duration(stopTime_ms - startTime_ms);
        const timeRange = moment.duration(intervalMs);

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
            sampleRate = 5 * Math.round((3.5 * (timeRange.asHours()) + 1) / 5.0) || 1;
        } else if (timeRange.asWeeks() < 1) {
            sampleRate = 60 * Math.round(timeRange.asDays());
        } else if (timeRange.asMonths() < 1) {
            sampleRate = 600 * Math.round(timeRange.asWeeks());
        } else if (Math.round(timeRange.asMonths()) === 6) {
            sampleRate = 14440;
        } else if (timeRange.asMonths() >= 1) {
            sampleRate = 3600 * Math.round(timeRange.asMonths());
        }

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
            case 'min': {
                retrievalParameters = 'pv=min_';
                break;
            }
            case 'max': {
                retrievalParameters = 'pv=max_';
                break;
            }
            case 'mean': {
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
            sampleRate
            + '(' + pvname + ')'
            + '&from=' + range.from.toISOString()
            + '&to=' + range.to.toISOString()
            + '&fetchLatestMetadata=false';

        return retrievalParameters;

    }

}
