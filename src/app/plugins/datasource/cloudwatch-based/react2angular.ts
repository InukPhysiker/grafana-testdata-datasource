import angular from 'angular';

export function react2AngularDirective(name: string, component: any, options: any) {
  angular.module('grafana.directives').directive(name, [
    'reactDirective',
    reactDirective => {
      return reactDirective(component, options);
    },
  ]);
}
