import React from 'react';
import { DataSourceHttpSettings } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { EpicsDataSourceOptions } from '../types';

export const ConfigEditor = (props: DataSourcePluginOptionsEditorProps<EpicsDataSourceOptions>) => {
  const { options, onOptionsChange } = props;

  return (
    <>
      <DataSourceHttpSettings
        defaultUrl="http://archiver.clsi.ca:17668"
        dataSourceConfig={options}
        onChange={onOptionsChange as any}
      />
    </>
  );
};
