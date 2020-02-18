import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface EpicsQuery extends DataQuery {
  operator: 'min' | 'max' | 'mean';
  alias?: string;
  pvname: string;
  constant: number;
}

export const defaultQuery: Partial<EpicsQuery> = {
  constant: 6.5,
};

/**
 * These are options configured for each DataSource instance
 */
export interface EpicsDataSourceOptions extends DataSourceJsonData {
  path?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface EpicsSecureJsonData {
  apiKey?: string;
}
