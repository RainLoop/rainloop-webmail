
(function () {

	'use strict';

	var
		_ = require('_'),

		Globals = require('Common/Globals'),
		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function Plugins()
	{
		this.oSettings = require('Storage/Settings');
		this.oSimpleHooks = {};

		this.aUserViewModelsHooks = [];
		this.aAdminViewModelsHooks = [];
	}

	/**
	 * @type {Object}
	 */
	Plugins.prototype.oSettings = {};

	/**
	 * @type {Array}
	 */
	Plugins.prototype.aUserViewModelsHooks = [];

	/**
	 * @type {Array}
	 */
	Plugins.prototype.aAdminViewModelsHooks = [];

	/**
	 * @type {Object}
	 */
	Plugins.prototype.oSimpleHooks = {};

	/**
	 * @param {string} sName
	 * @param {Function} fCallback
	 */
	Plugins.prototype.addHook = function (sName, fCallback)
	{
		if (Utils.isFunc(fCallback))
		{
			if (!Utils.isArray(this.oSimpleHooks[sName]))
			{
				this.oSimpleHooks[sName] = [];
			}

			this.oSimpleHooks[sName].push(fCallback);
		}
	};

	/**
	 * @param {string} sName
	 * @param {Array=} aArguments
	 */
	Plugins.prototype.runHook = function (sName, aArguments)
	{
		if (Utils.isArray(this.oSimpleHooks[sName]))
		{
			aArguments = aArguments || [];

			_.each(this.oSimpleHooks[sName], function (fCallback) {
				fCallback.apply(null, aArguments);
			});
		}
	};

	/**
	 * @param {string} sName
	 * @return {?}
	 */
	Plugins.prototype.mainSettingsGet = function (sName)
	{
		return this.oSettings.settingsGet(sName);
	};

	/**
	 * @param {Function} fCallback
	 * @param {string} sAction
	 * @param {Object=} oParameters
	 * @param {?number=} iTimeout
	 */
	Plugins.prototype.remoteRequest = function (fCallback, sAction, oParameters, iTimeout)
	{
		if (Globals.__APP__)
		{
			Globals.__APP__.remote().defaultRequest(fCallback, 'Plugin' + sAction, oParameters, iTimeout);
		}
	};

	/**
	 * @param {Function} SettingsViewModelClass
	 * @param {string} sLabelName
	 * @param {string} sTemplate
	 * @param {string} sRoute
	 */
	Plugins.prototype.addSettingsViewModel = function (SettingsViewModelClass, sTemplate, sLabelName, sRoute)
	{
		this.aUserViewModelsHooks.push([SettingsViewModelClass, sTemplate, sLabelName, sRoute]);
	};

	/**
	 * @param {Function} SettingsViewModelClass
	 * @param {string} sLabelName
	 * @param {string} sTemplate
	 * @param {string} sRoute
	 */
	Plugins.prototype.addSettingsViewModelForAdmin = function (SettingsViewModelClass, sTemplate, sLabelName, sRoute)
	{
		this.aAdminViewModelsHooks.push([SettingsViewModelClass, sTemplate, sLabelName, sRoute]);
	};

	Plugins.prototype.runSettingsViewModelHooks = function (bAdmin)
	{
		_.each(bAdmin ? this.aAdminViewModelsHooks : this.aUserViewModelsHooks, function (aView) {
			require('Knoin/Knoin').addSettingsViewModel(aView[0], aView[1], aView[2], aView[3]);
		});
	};

	/**
	 * @param {string} sPluginSection
	 * @param {string} sName
	 * @return {?}
	 */
	Plugins.prototype.settingsGet = function (sPluginSection, sName)
	{
		var oPlugin = this.oSettings.settingsGet('Plugins');
		oPlugin = oPlugin && !Utils.isUnd(oPlugin[sPluginSection]) ? oPlugin[sPluginSection] : null;
		return oPlugin ? (Utils.isUnd(oPlugin[sName]) ? null : oPlugin[sName]) : null;
	};

	module.exports = new Plugins();

}());