import _ from '_';
import { isObject, isUnd } from 'Common/Utils';
import * as Plugins from 'Common/Plugins';

const SUBS = {};

/**
 * @param {string|Object} name
 * @param {Function} func
 * @param {Object=} context
 */
export function sub(name, func, context) {
	if (isObject(name)) {
		context = func || null;
		func = null;

		_.each(name, (subFunc, subName) => {
			sub(subName, subFunc, context);
		});
	} else {
		if (isUnd(SUBS[name])) {
			SUBS[name] = [];
		}

		SUBS[name].push([func, context]);
	}
}

/**
 * @param {string} name
 * @param {Array=} args
 */
export function pub(name, args) {
	Plugins.runHook('rl-pub', [name, args]);

	if (!isUnd(SUBS[name])) {
		_.each(SUBS[name], (items) => {
			if (items[0]) {
				items[0].apply(items[1] || null, args || []);
			}
		});
	}
}
