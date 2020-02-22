// import { DataQuery } from '@grafana/ui/src/types';
import { DataQuery, SelectableValue, DataSourceJsonData } from '@grafana/data';

export interface EpicsQuery extends DataQuery {
  queryText?: string;
  operator: 'min' | 'max' | 'mean';
  // alias?: string;
  pvname: string;
  constant: number;
  id: string;
  region: string;
  namespace: string;
  metricName: string;
  dimensions: { [key: string]: string | string[] };
  statistics: string[];
  period: string;
  expression: string;
  alias: string;
  matchExact: boolean;
}

export interface AnnotationQuery extends EpicsQuery {
  prefixMatching: boolean;
  actionPrefix: string;
  alarmNamePrefix: string;
}

export type SelectableStrings = Array<SelectableValue<string>>;

export interface EpicsJsonData extends DataSourceJsonData {
  timeField?: string;
  assumeRoleArn?: string;
  database?: string;
  customMetricsNamespaces?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface EpicsSecureJsonData {
  accessKey: string;
  secretKey: string;
}

// Stackdriver code
export enum MetricFindQueryTypes {
  Services = 'services',
  MetricTypes = 'metricTypes',
  LabelKeys = 'labelKeys',
  LabelValues = 'labelValues',
  ResourceTypes = 'resourceTypes',
  Aggregations = 'aggregations',
  Aligners = 'aligners',
  AlignmentPeriods = 'alignmentPeriods',
}