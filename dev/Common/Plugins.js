/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		Plugins = {
			__boot: null,
			__remote: null,
			__data: null
		},
		_ = require('_'),
		Utils = require('Utils'),
		AppSettings = require('../Storages/AppSettings.js')
	;

	/**
	 * @type {Object}
	 */
	Plugins.oViewModelsHooks = {};

	/**
	 * @type {Object}
	 */
	Plugins.oSimpleHooks = {};

	/**
	 * @param {string} sName
	 * @param {Function} ViewModel
	 */
	Plugins.regViewModelHook = function (sName, ViewModel)
	{
		if (ViewModel)
		{
			ViewModel.__hookName = sName;
		}
	};

	/**
	 * @param {string} sName
	 * @param {Function} fCallback
	 */
	Plugins.addHook = function (sName, fCallback)
	{
		if (Utils.isFunc(fCallback))
		{
			if (!Utils.isArray(Plugins.oSimpleHooks[sName]))
			{
				Plugins.oSimpleHooks[sName] = [];
			}

			Plugins.oSimpleHooks[sName].push(fCallback);
		}
	};

	/**
	 * @param {string} sName
	 * @param {Array=} aArguments
	 */
	Plugins.runHook = function (sName, aArguments)
	{
		if (Utils.isArray(Plugins.oSimpleHooks[sName]))
		{
			aArguments = aArguments || [];

			_.each(Plugins.oSimpleHooks[sName], function (fCallback) {
				fCallback.apply(null, aArguments);
			});
		}
	};

	/**
	 * @param {string} sName
	 * @return {?}
	 */
	Plugins.mainSettingsGet = function (sName)
	{
		return AppSettings.settingsGet(sName);
	};

	/**
	 * @param {Function} fCallback
	 * @param {string} sAction
	 * @param {Object=} oParameters
	 * @param {?number=} iTimeout
	 * @param {string=} sGetAdd = ''
	 * @param {Array=} aAbortActions = []
	 */
	Plugins.remoteRequest = function (fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions)
	{
		if (Plugins.__remote)
		{
			Plugins.__remote.defaultRequest(fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions);
		}
	};

	/**
	 * @param {string} sPluginSection
	 * @param {string} sName
	 * @return {?}
	 */
	Plugins.settingsGet = function (sPluginSection, sName)
	{
		var oPlugin = AppSettings.settingsGet('Plugins');
		oPlugin = oPlugin && !Utils.isUnd(oPlugin[sPluginSection]) ? oPlugin[sPluginSection] : null;
		return oPlugin ? (Utils.isUnd(oPlugin[sName]) ? null : oPlugin[sName]) : null;
	};

	module.exports = Plugins;

}(module, require));