/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		AppData = require('AppData'),
		Utils = require('Utils')
	;

	/**
	 * @constructor
	 */
	function AppSettings()
	{
		this.oSettings = null;
	}

	AppSettings.prototype.oSettings = null;

	/**
	 * @param {string} sName
	 * @return {?}
	 */
	AppSettings.prototype.settingsGet = function (sName)
	{
		if (null === this.oSettings)
		{
			this.oSettings = Utils.isNormal(AppData) ? AppData : {};
		}

		return Utils.isUnd(this.oSettings[sName]) ? null : this.oSettings[sName];
	};

	/**
	 * @param {string} sName
	 * @param {?} mValue
	 */
	AppSettings.prototype.settingsSet = function (sName, mValue)
	{
		if (null === this.oSettings)
		{
			this.oSettings = Utils.isNormal(AppData) ? AppData : {};
		}

		this.oSettings[sName] = mValue;
	};

	/**
	 * @param {string} sName
	 * @return {boolean}
	 */
	AppSettings.prototype.capa = function (sName)
	{
		var mCapa = this.settingsGet('Capa');
		return Utils.isArray(mCapa) && Utils.isNormal(sName) && -1 < Utils.inArray(sName, mCapa);
	};


	module.exports = new AppSettings();

}(module, require));