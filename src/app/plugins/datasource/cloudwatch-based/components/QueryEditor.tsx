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

  // Zabbix stuff

      // Use custom format for template variables
      // this.replaceTemplateVars = this.datasource.replaceTemplateVars;
      // this.templateSrv = templateSrv;
  
      // this.editorModes = [
      //   {value: 'num',       text: 'Metrics',     mode: c.MODE_METRICS},
      //   {value: 'text',      text: 'Text',        mode: c.MODE_TEXT},
      //   {value: 'itservice', text: 'IT Services', mode: c.MODE_ITSERVICE},
      //   {value: 'itemid',    text: 'Item ID',     mode: c.MODE_ITEMID},
      //   {value: 'triggers',  text: 'Triggers',    mode: c.MODE_TRIGGERS}
      // ];
  
      // this.$scope.editorMode = {
      //   METRICS: c.MODE_METRICS,
      //   TEXT: c.MODE_TEXT,
      //   ITSERVICE: c.MODE_ITSERVICE,
      //   ITEMID: c.MODE_ITEMID,
      //   TRIGGERS: c.MODE_TRIGGERS
      // };
  
      // this.slaPropertyList = [
      //   {name: "Status", property: "status"},
      //   {name: "SLA", property: "sla"},
      //   {name: "OK time", property: "okTime"},
      //   {name: "Problem time", property: "problemTime"},
      //   {name: "Down time", property: "downtimeTime"}
      // ];
  
      // this.ackFilters = [
      //   {text: 'all triggers', value: 2},
      //   {text: 'unacknowledged', value: 0},
      //   {text: 'acknowledged', value: 1},
      // ];
  
      // this.resultFormats = [{ text: 'Time series', value: 'time_series' }, { text: 'Table', value: 'table' }];
  
      // this.triggerSeverity = c.TRIGGER_SEVERITY;
  
      // // Map functions for bs-typeahead
      // this.getGroupNames = _.bind(this.getMetricNames, this, 'groupList');
      // this.getHostNames = _.bind(this.getMetricNames, this, 'hostList', true);
      // this.getApplicationNames = _.bind(this.getMetricNames, this, 'appList');
      // this.getItemNames = _.bind(this.getMetricNames, this, 'itemList');
      // this.getITServices = _.bind(this.getMetricNames, this, 'itServiceList');
      // this.getVariables = _.bind(this.getTemplateVariables, this);

  // Zabbix stuff - END

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

  initFilters() {
    let itemtype = _.find(this.editorModes, { 'mode': this.target.mode });
    itemtype = itemtype ? itemtype.value : null;
    return Promise.all([
      this.suggestGroups(),
      this.suggestHosts(),
      this.suggestApps(),
      this.suggestItems(itemtype)
    ]);
  }

  // Get list of metric names for bs-typeahead directive
  getMetricNames(metricList, addAllValue) {
    let metrics = _.uniq(_.map(this.metric[metricList], 'name'));

    // Add template variables
    _.forEach(this.templateSrv.variables, variable => {
      metrics.unshift('$' + variable.name);
    });

    if (addAllValue) {
      metrics.unshift('/.*/');
    }

    return metrics;
  }

  getTemplateVariables() {
    return _.map(this.templateSrv.variables, variable => {
      return '$' + variable.name;
    });
  }

  suggestGroups() {
    return this.zabbix.getAllGroups()
      .then(groups => {
        this.metric.groupList = groups;
        return groups;
      });
  }

  suggestHosts() {
    let groupFilter = this.replaceTemplateVars(this.target.group.filter);
    return this.zabbix.getAllHosts(groupFilter)
      .then(hosts => {
        this.metric.hostList = hosts;
        return hosts;
      });
  }

  suggestApps() {
    let groupFilter = this.replaceTemplateVars(this.target.group.filter);
    let hostFilter = this.replaceTemplateVars(this.target.host.filter);
    return this.zabbix.getAllApps(groupFilter, hostFilter)
      .then(apps => {
        this.metric.appList = apps;
        return apps;
      });
  }

  suggestItems(itemtype = 'num') {
    let groupFilter = this.replaceTemplateVars(this.target.group.filter);
    let hostFilter = this.replaceTemplateVars(this.target.host.filter);
    let appFilter = this.replaceTemplateVars(this.target.application.filter);
    let options = {
      itemtype: itemtype,
      showDisabledItems: this.target.options.showDisabledItems
    };

    return this.zabbix
      .getAllItems(groupFilter, hostFilter, appFilter, options)
      .then(items => {
        this.metric.itemList = items;
        return items;
      });
  }

  suggestITServices() {
    return this.zabbix.getITService()
      .then(itservices => {
        this.metric.itServiceList = itservices;
        return itservices;
      });
  }

  isRegex(str) {
    return utils.isRegex(str);
  }

  isVariable(str) {
    return utils.isTemplateVariable(str, this.templateSrv.variables);
  }

  onTargetBlur() {
    var newTarget = _.cloneDeep(this.target);
    if (!_.isEqual(this.oldTarget, this.target)) {
      this.oldTarget = newTarget;
      this.targetChanged();
    }
  }

  onVariableChange() {
    if (this.isContainsVariables()) {
      this.targetChanged();
    }
  }

  /**
   * Check query for template variables
   */
  isContainsVariables() {
    return _.some(['group', 'host', 'application'], field => {
      if (this.target[field] && this.target[field].filter) {
        return utils.isTemplateVariable(this.target[field].filter, this.templateSrv.variables);
      } else {
        return false;
      }
    });
  }

  parseTarget() {
    // Parse target
  }

  // Validate target and set validation info
  validateTarget() {
    // validate
  }

  targetChanged() {
    this.initFilters();
    this.parseTarget();
    this.panelCtrl.refresh();
  }

  addFunction(funcDef) {
    var newFunc = metricFunctions.createFuncInstance(funcDef);
    newFunc.added = true;
    this.target.functions.push(newFunc);

    this.moveAliasFuncLast();

    if (newFunc.params.length && newFunc.added ||
      newFunc.def.params.length === 0) {
      this.targetChanged();
    }
  }

  removeFunction(func) {
    this.target.functions = _.without(this.target.functions, func);
    this.targetChanged();
  }

  moveFunction(func, offset) {
    const index = this.target.functions.indexOf(func);
    _.move(this.target.functions, index, index + offset);
    this.targetChanged();
  }

  moveAliasFuncLast() {
    var aliasFunc = _.find(this.target.functions, func => {
      return func.def.category === 'Alias';
    });

    if (aliasFunc) {
      this.target.functions = _.without(this.target.functions, aliasFunc);
      this.target.functions.push(aliasFunc);
    }
  }

  toggleQueryOptions() {
    this.showQueryOptions = !this.showQueryOptions;
  }

  onQueryOptionChange() {
    this.queryOptionsText = this.renderQueryOptionsText();
    this.onTargetBlur();
  }

  renderQueryOptionsText() {
    var optionsMap = {
      showDisabledItems: "Show disabled items",
      skipEmptyValues: "Skip empty values"
    };
    var options = [];
    _.forOwn(this.target.options, (value, key) => {
      if (value) {
        if (value === true) {
          // Show only option name (if enabled) for boolean options
          options.push(optionsMap[key]);
        } else {
          // Show "option = value" for another options
          options.push(optionsMap[key] + " = " + value);
        }
      }
    });
    return "Options: " + options.join(', ');
  }

  /**
   * Switch query editor to specified mode.
   * Modes:
   *  0 - items
   *  1 - IT services
   *  2 - Text metrics
   */
  switchEditorMode(mode) {
    this.target.mode = mode;
    this.init();
    this.targetChanged();
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
