import 'core-js/features/object/assign';
import 'core-js/features/array/includes';
import 'core-js/features/string/includes';
import 'core-js/features/promise';
import 'raf/polyfill';

/* eslint-disable no-undefined, consistent-return */
const log = console && console.log ? console.log : undefined;
console.log = log ? (...props) => {
	if (props && props[0] && 0 === props[0].indexOf('JQMIGRATE:')) {
		return;
	}

	return log(...props);
} : undefined;
