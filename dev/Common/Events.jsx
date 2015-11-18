
import {_} from 'common';
import Utils from 'Common/Utils';
import Plugins from 'Common/Plugins';

class Events
{
	subs = {};

	constructor() {}

	/**
	 * @param {string|Object} name
	 * @param {Function} func
	 * @param {Object=} context
	 * @return {Events}
	 */
	sub(name, func, context) {

		if (Utils.isObject(name))
		{
			context = func || null;
			func = null;

			_.each(name, (subFunc, subName) => {
				this.sub(subName, subFunc, context);
			}, this);
		}
		else
		{
			if (Utils.isUnd(this.subs[name]))
			{
				this.subs[name] = [];
			}

			this.subs[name].push([func, context]);
		}

		return this;
	}

	/**
	 * @param {string} name
	 * @param {Array=} args
	 * @return {Events}
	 */
	pub(name, args) {

		Plugins.runHook('rl-pub', [name, args]);

		if (!Utils.isUnd(this.subs[name]))
		{
			_.each(this.subs[name], (items) => {
				if (items[0])
				{
					items[0].apply(items[1] || null, args || []);
				}
			});
		}

		return this;
	}
}

module.exports = new Events();
