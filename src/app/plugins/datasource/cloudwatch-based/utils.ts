import _ from 'lodash';
import moment from 'moment';
import kbn from 'grafana/app/core/utils/kbn';
import * as c from './constants';
import { VariableQuery, VariableQueryTypes } from './types';

/*
 * This regex matches 3 types of variable reference with an optional format specifier
 * \$(\w+)                          $var1
 * \[\[([\s\S]+?)(?::(\w+))?\]\]    [[var2]] or [[var2:fmt2]]
 * \${(\w+)(?::(\w+))?}             ${var3} or ${var3:fmt3}
 */
export const variableRegex = /\$(\w+)|\[\[([\s\S]+?)(?::(\w+))?\]\]|\${(\w+)(?:\.([^:^\}]+))?(?::(\w+))?}/g;

/**
 * Expand Zabbix item name
 *
 * @param  {string} name item name, ie "CPU $2 time"
 * @param  {string} key  item key, ie system.cpu.util[,system,avg1]
 * @return {string}      expanded name, ie "CPU system time"
 */
export function expandItemName(name, key) {

  // extract params from key:
  // "system.cpu.util[,system,avg1]" --> ["", "system", "avg1"]
  const key_params_str = key.substring(key.indexOf('[') + 1, key.lastIndexOf(']'));
  const key_params = splitKeyParams(key_params_str);

  // replace item parameters
  for (let i = key_params.length; i >= 1; i--) {
    name = name.replace('$' + i, key_params[i - 1]);
  }
  return name;
}

export function expandItems(items) {
  _.forEach(items, item => {
    item.item = item.name;
    item.name = expandItemName(item.item, item.key_);
    return item;
  });
  return items;
}

function splitKeyParams(paramStr) {
  const params = [];
  let quoted = false;
  let in_array = false;
  const split_symbol = ',';
  let param = '';

  _.forEach(paramStr, symbol => {
    if (symbol === '"' && in_array) {
      param += symbol;
    } else if (symbol === '"' && quoted) {
      quoted = false;
    } else if (symbol === '"' && !quoted) {
      quoted = true;
    } else if (symbol === '[' && !quoted) {
      in_array  = true;
    } else if (symbol === ']' && !quoted) {
      in_array = false;
    } else if (symbol === split_symbol && !quoted && !in_array) {
      params.push(param);
      param = '';
    } else {
      param += symbol;
    }
  });

  params.push(param);
  return params;
}

const MACRO_PATTERN = /{\$[A-Z0-9_\.]+}/g;

export function containsMacro(itemName) {
  return MACRO_PATTERN.test(itemName);
}

export function replaceMacro(item, macros) {
  let itemName = item.name;
  const item_macros = itemName.match(MACRO_PATTERN);
  _.forEach(item_macros, macro => {
    const host_macros = _.filter(macros, m => {
      if (m.hostid) {
        return m.hostid === item.hostid;
      } else {
        // Add global macros
        return true;
      }
    });

    const macro_def = _.find(host_macros, { macro: macro });
    if (macro_def && macro_def.value) {
      const macro_value = macro_def.value;
      const macro_regex = new RegExp(escapeMacro(macro));
      itemName = itemName.replace(macro_regex, macro_value);
    }
  });

  return itemName;
}

function escapeMacro(macro) {
  macro = macro.replace(/\$/, '\\\$');
  return macro;
}

export function parseLegacyVariableQuery(query: string): VariableQuery {
  let queryType: VariableQueryTypes;
  const parts = [];

  // Split query. Query structure: group.host.app.item
  _.each(splitTemplateQuery(query), part => {
    // Replace wildcard to regex
    if (part === '*') {
      part = '/.*/';
    }
    parts.push(part);
  });
  const template = _.zipObject(['group', 'host', 'app', 'item'], parts);

  if (parts.length === 4 && template.app === '/.*/') {
    // Search for all items, even it's not belong to any application
    template.app = '';
  }

  switch (parts.length) {
    case 1:
      queryType = VariableQueryTypes.Group;
      break;
    case 2:
      queryType = VariableQueryTypes.Host;
      break;
    case 3:
      queryType = VariableQueryTypes.Application;
      break;
    case 4:
      queryType = VariableQueryTypes.Item;
      break;
  }

  const variableQuery: VariableQuery = {
    queryType,
    group: template.group || '',
    host: template.host || '',
    application: template.app || '',
    item: template.item || '',
  };

  return variableQuery;
}

/**
 * Split template query to parts of zabbix entities
 * group.host.app.item -> [group, host, app, item]
 * {group}{host.com} -> [group, host.com]
 */
export function splitTemplateQuery(query) {
  const splitPattern = /\{[^\{\}]*\}|\{\/.*\/\}/g;
  let split;

  if (isContainsBraces(query)) {
    const result = query.match(splitPattern);
    split = _.map(result, part => {
      return _.trim(part, '{}');
    });
  } else {
    split = query.split('.');
  }

  return split;
}

function isContainsBraces(query) {
  const bracesPattern = /^\{.+\}$/;
  return bracesPattern.test(query);
}

// Pattern for testing regex
export const regexPattern = /^\/(.*)\/([gmi]*)$/m;

export function isRegex(str) {
  return regexPattern.test(str);
}

export function isTemplateVariable(str, templateVariables) {
  const variablePattern = /^\$\w+/;
  if (variablePattern.test(str)) {
    const variables = _.map(templateVariables, variable => {
      return '$' + variable.name;
    });
    return _.includes(variables, str);
  } else {
    return false;
  }
}

export function getRangeScopedVars(range) {
  const msRange = range.to.diff(range.from);
  const sRange = Math.round(msRange / 1000);
  const regularRange = kbn.secondsToHms(msRange / 1000);
  return {
    __range_ms: { text: msRange, value: msRange },
    __range_s: { text: sRange, value: sRange },
    __range: { text: regularRange, value: regularRange },
    __range_series: {text: c.RANGE_VARIABLE_VALUE, value: c.RANGE_VARIABLE_VALUE},
  };
}

export function buildRegex(str) {
  const matches = str.match(regexPattern);
  const pattern = matches[1];
  const flags = matches[2] !== "" ? matches[2] : undefined;
  return new RegExp(pattern, flags);
}

// Need for template variables replace
// From Grafana's templateSrv.js
export function escapeRegex(value) {
  return value.replace(/[\\^$*+?.()|[\]{}\/]/g, '\\$&');
}

export function parseInterval(interval) {
  const intervalPattern = /(^[\d]+)(y|M|w|d|h|m|s)/g;
  const momentInterval: any[] = intervalPattern.exec(interval);
  return moment.duration(Number(momentInterval[1]), momentInterval[2]).valueOf();
}

export function parseTimeShiftInterval(interval) {
  const intervalPattern = /^([\+\-]*)([\d]+)(y|M|w|d|h|m|s)/g;
  const momentInterval: any[] = intervalPattern.exec(interval);
  let duration: any = 0;

  if (momentInterval[1] === '+') {
    duration = 0 - (moment.duration(Number(momentInterval[2]), momentInterval[3]).valueOf() as any);
  } else {
    duration = moment.duration(Number(momentInterval[2]), momentInterval[3]).valueOf();
  }

  return duration;
}

/**
 * Format acknowledges.
 *
 * @param  {array} acknowledges array of Zabbix acknowledge objects
 * @return {string} HTML-formatted table
 */
export function formatAcknowledges(acknowledges) {
  if (acknowledges.length) {
    let formatted_acknowledges = '<br><br>Acknowledges:<br><table><tr><td><b>Time</b></td>'
      + '<td><b>User</b></td><td><b>Comments</b></td></tr>';
    _.each(_.map(acknowledges, ack => {
      const timestamp = moment.unix(ack.clock);
      return '<tr><td><i>' + timestamp.format("DD MMM YYYY HH:mm:ss") + '</i></td><td>' + ack.alias
        + ' (' + ack.name + ' ' + ack.surname + ')' + '</td><td>' + ack.message + '</td></tr>';
    }), ack => {
      formatted_acknowledges = formatted_acknowledges.concat(ack);
    });
    formatted_acknowledges = formatted_acknowledges.concat('</table>');
    return formatted_acknowledges;
  } else {
    return '';
  }
}

export function convertToZabbixAPIUrl(url) {
  const zabbixAPIUrlPattern = /.*api_jsonrpc.php$/;
  const trimSlashPattern = /(.*?)[\/]*$/;
  if (url.match(zabbixAPIUrlPattern)) {
    return url;
  } else {
    return url.replace(trimSlashPattern, "$1");
  }
}

/**
 * Wrap function to prevent multiple calls
 * when waiting for result.
 */
export function callOnce(func, promiseKeeper) {
  return function() {
    if (!promiseKeeper) {
      promiseKeeper = Promise.resolve(
        func.apply(this, arguments)
        .then(result => {
          promiseKeeper = null;
          return result;
        })
      );
    }
    return promiseKeeper;
  };
}

/**
 * Apply function one by one: `sequence([a(), b(), c()]) = c(b(a()))`
 * @param {*} funcsArray functions to apply
 */
export function sequence(funcsArray) {
  return function(result) {
    for (let i = 0; i < funcsArray.length; i++) {
      result = funcsArray[i].call(this, result);
    }
    return result;
  };
}

const versionPattern = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([0-9A-Za-z\.]+))?/;

export function isValidVersion(version) {
  return versionPattern.exec(version);
}

export function parseVersion(version) {
  const match = versionPattern.exec(version);
  if (!match) {
    return null;
  }
  const major = Number(match[1]);
  const minor = Number(match[2] || 0);
  const patch = Number(match[3] || 0);
  const meta = match[4];
  return { major, minor, patch, meta };
}

/**
 * Replaces any space-like symbols (tabs, new lines, spaces) by single whitespace.
 */
export function compactQuery(query) {
  return query.replace(/\s+/g, ' ').trim();
}

export function getArrayDepth(a, level = 0) {
  if (a.length === 0) {
    return 1;
  }
  const elem = a[0];
  if (_.isArray(elem)) {
    return getArrayDepth(elem, level + 1);
  }
  return level + 1;
}

// Fix for backward compatibility with lodash 2.4
if (!_.includes) {
  _.includes = (_ as any).contains;
}
