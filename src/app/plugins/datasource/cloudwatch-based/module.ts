import { DataSourcePlugin } from '@grafana/data';
import EpicsDataSource from './datasource';
import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';
import { EpicsQuery, EpicsJsonData } from './types';
import './add-metric-function.directive';
import './metric-function-editor.directive';

export const plugin = new DataSourcePlugin<EpicsDataSource, EpicsQuery, EpicsJsonData>(EpicsDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
