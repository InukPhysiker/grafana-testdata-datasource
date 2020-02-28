import React, { PureComponent, ChangeEvent } from 'react';
import { Input, FormLabel, Select } from '@grafana/ui';
import { EpicsQuery, EpicsJsonData, Scenario } from '../types';
import EpicsDataSource from '../datasource';
import { QueryField, Alias, QueryFieldsEditor } from './';
import { QueryEditorProps, SelectableValue } from '@grafana/data';

type Props = QueryEditorProps<EpicsDataSource, EpicsQuery, EpicsJsonData>;

interface State {
  showMeta: boolean;
  processVariableList: Scenario[];
  // functionList: any[];
  currentPV: null;
}

export class QueryEditor extends PureComponent<Props, State> {
  state: State = {
    showMeta: false,
    processVariableList: [],
    currentPV: null,
  };

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

    if (!query.functions || !query.functions.length){
      query.functions = [''];
    }

    return state;
  }

  onChange(query: EpicsQuery) {
    const { onChange, onRunQuery } = this.props;
    onChange(query);
    onRunQuery();
  }

  // onProcessVariableChangeTEST = (item: SelectableValue<string>) => {
  //   this.props.datasource.getPVNames("TM");
  //   this.props.onChange({
  //     ...this.props.query,
  //     processVariable: item.value as any,
  //   });
  // };

  onProcessVariableChange = (item: SelectableValue<string>) => {
    this.props.onChange({
      ...this.props.query,
      processVariable: item.value as any,
    });
  };

// Zabbix stuff

  targetChanged() {
    this.initFilters();
    this.parseTarget();
    this.panelCtrl.refresh();
  }

  addFunction(funcDef: any) {
    var newFunc = metricFunctions.createFuncInstance(funcDef);
    newFunc.added = true;
    this.target.functions.push(newFunc);

    this.moveAliasFuncLast();

    if (newFunc.params.length && newFunc.added ||
      newFunc.def.params.length === 0) {
      this.targetChanged();
    }
  }

  removeFunction(func: any) {
    this.props.query.target.functions = _.without(this.props.query.target.functions, func);
    this.targetChanged();
  }

  moveFunction(func: any, offset: any) {
    const index = this.props.query.target.functions.indexOf(func);
    _.move(this.props.query.target.functions, index, index + offset);
    this.targetChanged();
  }

  moveAliasFuncLast() {
    var aliasFunc = _.find(this.props.query.target.functions, func => {
      return func.def.category === 'Alias';
    });

    if (aliasFunc) {
      this.props.query.target.functions = _.without(this.props.query.target.functions, aliasFunc);
      this.props.query.target.functions.push(aliasFunc);
    }
  }

  render() {
    const { query, onRunQuery } = this.props;

    const options = this.state.processVariableList.map(item => ({ label: item.name, value: item.id }));
    const current = options.find(item => item.value === query.processVariable);

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
          <div className="gf-form">
            <FormLabel className="query-keyword" width={7}>
              Scenario
            </FormLabel>
            <Select options={options} value={current} onChange={this.onProcessVariableChange} />
          </div>
        </div>
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
