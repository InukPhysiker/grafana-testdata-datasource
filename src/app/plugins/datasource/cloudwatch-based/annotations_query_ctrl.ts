import _ from 'lodash';
import { AnnotationQuery } from './types';

export class EpicsAnnotationsQueryCtrl {
  static templateUrl = 'partials/annotations.editor.html';
  annotation: any;

  /** @ngInject */
  constructor() {
    _.defaultsDeep(this.annotation, {
      device: '',
      metricName: '',
      expression: '',
      dimensions: {},
      area: 'default',
      id: '',
      alias: '',
      statistics: ['Average'],
      matchExact: true,
      prefixMatching: false,
      actionPrefix: '',
      alarmNamePrefix: '',
    });

    this.onChange = this.onChange.bind(this);
  }

  onChange(query: AnnotationQuery) {
    Object.assign(this.annotation, query);
  }
}
