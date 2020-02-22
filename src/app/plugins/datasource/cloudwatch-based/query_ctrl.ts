import _ from 'lodash';

import { QueryCtrl } from 'app/plugins/sdk';
//import { EpicsQuery } from './types';

export class EpicsQueryCtrl extends QueryCtrl {
  static templateUrl = 'partials/query.editor.html';
  templateSrv: any;

  /** @ngInject */
  constructor($scope: any, $injector: any, templateSrv: any) {
    super($scope, $injector);
    this.templateSrv = templateSrv;
    this.onQueryChange = this.onQueryChange.bind(this);
    this.onExecuteQuery = this.onExecuteQuery.bind(this);
  }

  onQueryChange(target: EpicsQuery) {
    Object.assign(this.target, target);
  }

  onExecuteQuery() {
    this.$scope.ctrl.refresh();
  }
}
