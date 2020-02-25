import React, { PureComponent, ChangeEvent } from 'react';
import { Input } from '@grafana/ui';
import { EpicsQuery, EpicsJsonData } from '../types';
import EpicsDataSource from '../datasource';
import { QueryField, Alias, QueryFieldsEditor } from './';
import { QueryEditorProps } from '@grafana/data';

type Props = QueryEditorProps<EpicsDataSource, EpicsQuery, EpicsJsonData>;

interface State {
  showMeta: boolean;
}

export class QueryEditor extends PureComponent<Props, State> {
  state: State = { showMeta: false };

  static getDerivedStateFromProps(props: Props, state: State) {
    const { query } = props;

    if (!query.device) {
      query.device = '';
    }

    if (!query.metricName) {
      query.metricName = '';
    }

    if (!query.expression) {
      query.expression = '';
    }

    if (!query.dimensions) {
      query.dimensions = {};
    }

    if (!query.area) {
      query.area = '';
    }

    if (!query.alias) {
      query.alias = '';
    }

    // if (!query.statistics || !query.statistics.length) {
    //   query.statistics = ['Average'];
    // }

    if (!query.operators || !query.operators.length) {
      query.operators = ['mean'];
    }

    return state;
  }

  onChange(query: EpicsQuery) {
    const { onChange, onRunQuery } = this.props;
    onChange(query);
    onRunQuery();
  }

  render() {
    const { query, onRunQuery } = this.props;
    return (
      <>
        <QueryFieldsEditor {...this.props}></QueryFieldsEditor>
        {query.operators.length <= 1 && (
          <div className="gf-form-inline">
            <div className="gf-form gf-form--grow">
              <QueryField
                className="gf-form--grow"
                label="Expression"
                tooltip="Optionally you can add an expression here. Please note that if a math expression that is referencing other queries is being used, it will not be possible to create an alert rule based on this query"
              >
                <Input
                  className="gf-form-input"
                  onBlur={onRunQuery}
                  value={query.expression || ''}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => this.onChange({ ...query, expression: event.target.value })}
                />
              </QueryField>
            </div>
          </div>
        )}
        <div className="gf-form-inline">
          {/* <div className="gf-form">
            <QueryField label="Period" tooltip="Minimum interval between points in seconds">
              <Input
                className="gf-form-input width-8"
                value={query.period || ''}
                placeholder="auto"
                onBlur={onRunQuery}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  this.onChange({ ...query, period: event.target.value })
                }
              />
            </QueryField>
          </div> */}
          <div className="gf-form">
            <QueryField label="Alias" tooltip="Alias replacement variables: {{metric}}, {{stat}}, {{device}}, {{area}}, {{label}}">
              <Alias value={query.alias} onChange={(value: string) => this.onChange({ ...query, alias: value })} />
            </QueryField>
          </div>
          <div className="gf-form gf-form--grow">
            <div className="gf-form-label gf-form-label--grow" />
          </div>
        </div>
      </>
    );
  }
}
