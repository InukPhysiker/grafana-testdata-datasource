import { DataSourcePlugin } from '@grafana/data';
import EpicsDataSource from './datasource';
import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';
import { EpicsQuery, EpicsJsonData } from './types';

export const plugin = new DataSourcePlugin<EpicsDataSource, EpicsQuery, EpicsJsonData>(EpicsDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);

// CloudWatch

// import './query_parameter_ctrl';

// import CloudWatchDatasource from './datasource';
// import { CloudWatchQueryCtrl } from './query_ctrl';
// import { CloudWatchConfigCtrl } from './config_ctrl';

// class CloudWatchAnnotationsQueryCtrl {
//   static templateUrl = 'partials/annotations.editor.html';
// }

// export {
//   CloudWatchDatasource as Datasource,
//   CloudWatchQueryCtrl as QueryCtrl,
//   CloudWatchConfigCtrl as ConfigCtrl,
//   CloudWatchAnnotationsQueryCtrl as AnnotationsQueryCtrl,
// };

