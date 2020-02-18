import _ from 'lodash';
import { QueryCtrl } from 'app/plugins/sdk';
import './css/query_editor.css!';

export class EPICSArchAppQueryCtrl extends QueryCtrl {
  static templateUrl = 'partials/query.editor.html';

  defaults = {
  };


  errors: any;

  queryTypes: any;

    queryTypeValidators = {
      "firstSample": this.validateFirstSampleQuery.bind(this),
      "lastSample": this.validateLastSampleQuery.bind(this),
      "min": this.validateMinQuery.bind(this),
      "max": this.validateMaxQuery.bind(this),
      "mean": this.validateMeanQuery.bind(this),
    };

  defaultQueryType = "lastSample";

  selectedProcessVariableSegment: any;

  /** @ngInject **/
  constructor($scope: any, $injector: any, private templateSrv: any, private uiSegmentSrv: any) {
    super($scope, $injector);

    _.defaultsDeep(this.target, this.defaults);

    this.target.pvname = this.target.pvname || {fake: true, value: '-- pv name --'};
    this.selectedProcessVariableSegment = this.uiSegmentSrv.newSegment(this.target.selectedProcessVariableSegment || this.target.pvname);

      if (!this.target.queryType) {
        this.target.queryType = this.defaultQueryType;

  }

    this.queryTypes = _.keys(this.queryTypeValidators);

    this.errors = this.validateTarget();

  }

  getOptions(query: any) {
    return this.datasource.metricFindQuery(query || '');
  }

  getProcessVariableSegments(query: any) {
    return this.datasource.getPVNames(query).then((values: any) => {
      return values.map((value: any) => {
        return this.uiSegmentSrv.newSegment({
          value
        });
      });
    });
  }

  onChange() {
    this.target.pvname = this.selectedProcessVariableSegment.value;
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }


  targetBlur() {
    this.errors = this.validateTarget();
    this.refresh();
  }


    isValidQueryType(type: any) {
      return _.has(this.queryTypeValidators, type);
    }
    

validateFirstSampleQuery(target: any, errs: any) {
      return true;
    }
    validateLastSampleQuery(target: any, errs: any) {
      return true;
    }
    validateMinQuery(target: any, errs: any) {
      return true;
    }
    validateMaxQuery(target: any, errs: any) {
      return true;
    }
    validateMeanQuery(target: any, errs: any) {
      return true;
    }

  validateTarget() {
    var errs: any = {};

      if (!this.target.queryType) {
        errs.queryType = "You must supply a query type.";
      } else if (!this.isValidQueryType(this.target.queryType)) {
        errs.queryType = "Unknown query type: " + this.target.queryType + ".";
      } else {
        this.queryTypeValidators[this.target.queryType](this.target, errs);
      }



     // if (this.query) {
        // if (!this.isValidQuery(this.query)) {
        //   errs.query = "Invalid Query type: " + this.query + ".";
        // }
     // }


    return errs;

  }

}
