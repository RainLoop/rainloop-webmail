
(function () {

	'use strict';

	var
		window = require('window'),

		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function SettingsStorage()
	{
		this.oSettings = window['rainloopAppData'] || {};
		this.oSettings = Utils.isNormal(this.oSettings) ? this.oSettings : {};
	}

	SettingsStorage.prototype.oSettings = null;

	/**
	 * @param {string} sName
	 * @return {?}
	 */
	SettingsStorage.prototype.settingsGet = function (sName)
	{
		return Utils.isUnd(this.oSettings[sName]) ? null : this.oSettings[sName];
	};

	/**
	 * @param {string} sName
	 * @param {?} mValue
	 */
	SettingsStorage.prototype.settingsSet = function (sName, mValue)
	{
		this.oSettings[sName] = mValue;
	};

	/**
	 * @param {string} sName
	 * @return {boolean}
	 */
	SettingsStorage.prototype.capa = function (sName)
	{
		var mCapa = this.settingsGet('Capa');
		return Utils.isArray(mCapa) && Utils.isNormal(sName) && -1 < Utils.inArray(sName, mCapa);
	};


	module.exports = new SettingsStorage();

}());