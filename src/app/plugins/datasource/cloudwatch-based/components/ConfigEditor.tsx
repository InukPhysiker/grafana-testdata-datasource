// import React, { PureComponent } from 'react';
// import { FormLabel, Select, Input, Button } from '@grafana/ui';
// import {
//   DataSourcePluginOptionsEditorProps,
//   onUpdateDatasourceJsonDataOptionSelect,
//   onUpdateDatasourceOption,
//   onUpdateDatasourceResetOption,
//   onUpdateDatasourceJsonDataOption,
//   onUpdateDatasourceSecureJsonDataOption,
// } from '@grafana/data';
// import { SelectableValue } from '@grafana/data';
// import { getDatasourceSrv } from 'app/features/plugins/datasource_srv';
// import EpicsDatasource from '../datasource';
// import { EpicsJsonData, EpicsSecureJsonData } from '../types';
// import { CancelablePromise, makePromiseCancelable } from 'app/core/utils/CancelablePromise';

import React from 'react';
import { DataSourceHttpSettings } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { EpicsJsonData } from '../types';

export const ConfigEditor = (props: DataSourcePluginOptionsEditorProps<EpicsJsonData>) => {
  const { options, onOptionsChange } = props;

  return (
    <>
      <DataSourceHttpSettings defaultUrl="http://archiver.clsi.ca:17668" dataSourceConfig={options} onChange={onOptionsChange as any} />
    </>
  );
};
