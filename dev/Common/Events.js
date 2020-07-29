import * as Plugins from 'Common/Plugins';

const SUBS = {};

/**
 * @param {string|Object} name
 * @param {Function} func
 * @param {Object=} context
 */
export function sub(name, func, context) {
	if (typeof name === 'object') {
		context = func || null;
		func = null;

		Object.entries(name).forEach(([subFunc, subName]) => {
			sub(subName, subFunc, context);
		});
	} else {
		if (undefined === SUBS[name]) {
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

	if (undefined !== SUBS[name]) {
		SUBS[name].forEach(items => {
			if (items[0]) {
				items[0].apply(items[1] || null, args || []);
			}
		});
	}
}
