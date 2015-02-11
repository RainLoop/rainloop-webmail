
(function () {

	'use strict';

	var
		_ = require('_'),

		Utils = require('Common/Utils'),
		Plugins = require('Common/Plugins')
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
		if (Utils.isObject(sName))
		{
			oContext = fFunc || null;
			fFunc = null;

			_.each(sName, function (fSubFunc, sSubName) {
				this.sub(sSubName, fSubFunc, oContext);
			}, this);
		}
		else
		{
			if (Utils.isUnd(this.oSubs[sName]))
			{
				this.oSubs[sName] = [];
			}

			this.oSubs[sName].push([fFunc, oContext]);
		}

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

}());