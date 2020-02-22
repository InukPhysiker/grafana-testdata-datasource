import React, { useState, useEffect } from 'react';
import { SelectableValue } from '@grafana/data';
// import { Segment, SegmentAsync } from '@grafana/ui';
import { Segment, SegmentAsync } from '@grafana/ui';
import { EpicsQuery, SelectableStrings } from '../types';
import EpicsDatasource from '../datasource';
// import { Stats, Dimensions, QueryInlineField } from './';
import { Stats, QueryInlineField } from './';

export type Props = {
  query: EpicsQuery;
  datasource: EpicsDatasource;
  onRunQuery?: () => void;
  onChange: (value: EpicsQuery) => void;
  hideWilcard?: boolean;
};

interface State {
  areas: SelectableStrings;
  devices: SelectableStrings;
  metricNames: SelectableStrings;
  variableOptionGroup: SelectableValue<string>;
  showMeta: boolean;
}

export function QueryFieldsEditor({
  query,
  datasource,
  onChange,
  onRunQuery = () => {},
  hideWilcard = false,
}: React.PropsWithChildren<Props>) {
  const [state, setState] = useState<State>({
    areas: [],
    devices: [],
    metricNames: [],
    variableOptionGroup: {},
    showMeta: false,
  });

  useEffect(() => {
    const variableOptionGroup = {
      label: 'Template Variables',
      options: datasource.variables.map(toOption),
    };

    Promise.all([datasource.metricFindQuery('areas()'), datasource.metricFindQuery('devices()')]).then(
      ([areas, devices]) => {
        setState({
          ...state,
          areas: [...areas, variableOptionGroup],
          devices: [...devices, variableOptionGroup],
          variableOptionGroup,
        });
      }
    );
  }, []);

  const loadMetricNames = async () => {
    const { device, area } = query;
    return datasource.metricFindQuery(`metrics(${device}${area})`).then(appendTemplateVariables);
  };

  const appendTemplateVariables = (values: SelectableValue[]) => [
    ...values,
    { label: 'Template Variables', options: datasource.variables.map(toOption) },
  ];

  const toOption = (value: any) => ({ label: value, value });

  const onQueryChange = (query: EpicsQuery) => {
    onChange(query);
    onRunQuery();
  };

  // Load dimension values based on current selected dimensions.
  // Remove the new dimension key and all dimensions that has a wildcard as selected value
  // const loadDimensionValues = (newKey: string) => {
  //   const { [newKey]: value, ...dim } = query.dimensions;
  //   const newDimensions = Object.entries(dim).reduce(
  //     (result, [key, value]) => (value === '*' ? result : { ...result, [key]: value }),
  //     {}
  //   );
  //   return datasource
  //     .getDimensionValues(query.region, query.namespace, query.metricName, newKey, newDimensions)
  //     .then(values => (values.length ? [{ value: '*', text: '*', label: '*' }, ...values] : values))
  //     .then(appendTemplateVariables);
  // };

  const { areas, devices, variableOptionGroup } = state;
  return (
    <>
      {query.expression.length === 0 && (
        <>
          <QueryInlineField label="Device">
            <Segment
              value={query.device}
              placeholder="Select Device"
              allowCustomValue
              options={devices}
              onChange={({ value: device }) => onQueryChange({ ...query, device })}
            />
          </QueryInlineField>

          <QueryInlineField label="Area">
            <Segment
              value={query.area}
              placeholder="Select Area"
              options={areas}
              allowCustomValue
              onChange={({ value: area }) => onQueryChange({ ...query, area })}
            />
          </QueryInlineField>

          <QueryInlineField label="Process Variable">
            <SegmentAsync
              value={query.metricName}
              placeholder="Select PV name"
              allowCustomValue
              loadOptions={loadMetricNames}
              onChange={({ value: metricName }) => onQueryChange({ ...query, metricName })}
            />
          </QueryInlineField>

          <QueryInlineField label="Statistics">
            <Stats
              stats={datasource.standardStatistics.map(toOption)}
              values={query.statistics}
              onChange={statistics => onQueryChange({ ...query, statistics })}
              variableOptionGroup={variableOptionGroup}
            />
          </QueryInlineField>

          {/* <QueryInlineField label="Dimensions">
            <Dimensions
              dimensions={query.dimensions}
              onChange={dimensions => onQueryChange({ ...query, dimensions })}
              loadKeys={() => datasource.getDimensionKeys(query.namespace, query.region).then(appendTemplateVariables)}
              loadValues={loadDimensionValues}
            />
          </QueryInlineField> */}
        </>
      )}
    </>
  );
}
