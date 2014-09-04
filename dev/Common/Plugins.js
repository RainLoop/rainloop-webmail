
(function () {

	'use strict';

	var
		_ = require('_'),

		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function Plugins()
	{
		this.__boot = null;
		this.__data = null;
		this.__remote = null;

		this.oSettings = require('Storage:Settings');

		this.oViewModelsHooks = {};
		this.oSimpleHooks = {};
	}

	Plugins.prototype.__boot = null;
	Plugins.prototype.__data = null;
	Plugins.prototype.__remote = null;

	/**
	 * @type {Object}
	 */
	Plugins.prototype.oViewModelsHooks = {};

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
	 * @param {string=} sGetAdd = ''
	 * @param {Array=} aAbortActions = []
	 */
	Plugins.prototype.remoteRequest = function (fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions)
	{
		if (this.__remote)
		{
			this.__remote.defaultRequest(fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions);
		}
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