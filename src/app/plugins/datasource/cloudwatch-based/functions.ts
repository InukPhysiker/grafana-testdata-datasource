import uniqBy from 'lodash/uniqBy';
import { alignOptions, aggOptions, ValueTypes, MetricKind } from './constants';

export const extractServicesFromMetricDescriptors = (metricDescriptors: any) => uniqBy(metricDescriptors, 'service');

export const getMetricTypesByService = (metricDescriptors: any[], service: any) =>
  metricDescriptors.filter(m => m.service === service);

export const getMetricTypes = (metricDescriptors: any[], metricType: any, interpolatedMetricType: any, selectedService: any) => {
  const metricTypes = getMetricTypesByService(metricDescriptors, selectedService).map(m => ({
    value: m.type,
    name: m.displayName,
  }));
  const metricTypeExistInArray = metricTypes.some(m => m.value === interpolatedMetricType);
  const selectedMetricType = metricTypeExistInArray ? metricType : metricTypes[0].value;
  return {
    metricTypes,
    selectedMetricType,
  };
};

export const getAlignmentOptionsByMetric = (metricValueType: ValueTypes, metricKind: MetricKind) => {
  return !metricValueType
    ? []
    : alignOptions.filter(i => {
        return i.valueTypes.indexOf(metricValueType) !== -1 && i.metricKinds.indexOf(metricKind) !== -1;
      });
};

export const getAggregationOptionsByMetric = (valueType: ValueTypes, metricKind: MetricKind) => {
  return !metricKind
    ? []
    : aggOptions.filter(i => {
        return i.valueTypes.indexOf(valueType) !== -1 && i.metricKinds.indexOf(metricKind) !== -1;
      });
};

export const getLabelKeys = async (datasource: { getLabels: (arg0: any, arg1: string) => any; }, selectedMetricType: any) => {
  const refId = 'handleLabelKeysQuery';
  const response = await datasource.getLabels(selectedMetricType, refId);
  const labelKeys = response.meta
    ? [
        ...Object.keys(response.meta.resourceLabels).map(l => `resource.label.${l}`),
        ...Object.keys(response.meta.metricLabels).map(l => `metric.label.${l}`),
      ]
    : [];
  return labelKeys;
};

export const getAlignmentPickerData = ({ valueType, metricKind, perSeriesAligner }: any, templateSrv: { replace: (arg0: any) => string; }) => {
  const options = getAlignmentOptionsByMetric(valueType, metricKind).map(option => ({
    ...option,
    label: option.text,
  }));
  const alignOptions = [
    {
      label: 'Alignment options',
      expanded: true,
      options,
    },
  ];
  if (!options.some(o => o.value === templateSrv.replace(perSeriesAligner))) {
    perSeriesAligner = options.length > 0 ? options[0].value : '';
  }
  return { alignOptions, perSeriesAligner };
};
