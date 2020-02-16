import { DataSourcePlugin } from '@grafana/data';
import { DataSource } from './DataSource';
import { ConfigEditor } from './ConfigEditor';
import { QueryEditor } from './QueryEditor';
import { EpicsQuery, EpicsDataSourceOptions } from './types';

export const plugin = new DataSourcePlugin<DataSource, EpicsQuery, EpicsDataSourceOptions>(DataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
