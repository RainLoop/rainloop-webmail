/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),
		
		Utils = require('./Utils.js'),
		Plugins = require('./Plugins.js')
	;
	
	/**
	 * @constructor
	 */
	function Events()
	{
		this.oSubs = {};
	}

	Events.prototype.oSubs = {};

	/**
	 * @param {string} sName
	 * @param {Function} fFunc
	 * @param {Object=} oContext
	 * @return {Events}
	 */
	Events.prototype.sub = function (sName, fFunc, oContext)
	{
		if (Utils.isUnd(this.oSubs[sName]))
		{
			this.oSubs[sName] = [];
		}

		this.oSubs[sName].push([fFunc, oContext]);

		return this;
	};

	/**
	 * @param {string} sName
	 * @param {Array=} aArgs
	 * @return {Events}
	 */
	Events.prototype.pub = function (sName, aArgs)
	{
		Plugins.runHook('rl-pub', [sName, aArgs]);
		
		if (!Utils.isUnd(this.oSubs[sName]))
		{
			_.each(this.oSubs[sName], function (aItem) {
				if (aItem[0])
				{
					aItem[0].apply(aItem[1] || null, aArgs || []);
				}
			});
		}

		return this;
	};

	module.exports = new Events();

}(module));