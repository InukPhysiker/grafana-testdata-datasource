// import { DataQuery } from '@grafana/ui/src/types';
import { DataQuery, SelectableValue, DataSourceJsonData } from '@grafana/data';

export interface EpicsQuery extends DataQuery {
  metricFunctions: any;
  operators: string[];
  queryText?: string;
  // alias?: string;
  // pvname: string;
  constant: number;
  // id: string;
  area: string;
  device: string;
  metricName: string;
  processVariable: string;
  dimensions: { [key: string]: string | string[] };
  // statistics: string[];
  period: string;
  expression: string;
  alias: string;
  matchExact: boolean;
  functions: any[];
  target: any;
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

export interface Scenario {
  id: string;
  name: string;
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

// Zabbix types

// import { SelectableValue } from "@grafana/data";

export interface VariableQueryProps {
  query: LegacyVariableQuery;
  onChange: (query: VariableQuery, definition: string) => void;
  datasource: any;
  templateSrv: any;
}

export interface VariableQueryData extends VariableQuery {
  selectedQueryType: SelectableValue<VariableQueryTypes>;
  legacyQuery?: string;
}

export interface VariableQuery {
  queryType: VariableQueryTypes;
  group?: string;
  host?: string;
  application?: string;
  item?: string;
}

export type LegacyVariableQuery = VariableQuery | string;

export enum VariableQueryTypes {
  Group = 'group',
  Host = 'host',
  Application = 'application',
  Item = 'item',
}
