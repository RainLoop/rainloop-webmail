
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:Admin:Data'),
		Remote = require('Storage:Admin:Remote')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsPlugins()
	{
		this.enabledPlugins = ko.observable(!!Settings.settingsGet('EnabledPlugins'));

		this.pluginsError = ko.observable('');

		this.plugins = Data.plugins;
		this.pluginsLoading = Data.pluginsLoading;

		this.visibility = ko.computed(function () {
			return Data.pluginsLoading() ? 'visible' : 'hidden';
		}, this);

		this.onPluginLoadRequest = _.bind(this.onPluginLoadRequest, this);
		this.onPluginDisableRequest = _.bind(this.onPluginDisableRequest, this);
	}

	AdminSettingsPlugins.prototype.disablePlugin = function (oPlugin)
	{
		oPlugin.disabled(!oPlugin.disabled());
		Remote.pluginDisable(this.onPluginDisableRequest, oPlugin.name, oPlugin.disabled());
	};

	AdminSettingsPlugins.prototype.configurePlugin = function (oPlugin)
	{
		Remote.plugin(this.onPluginLoadRequest, oPlugin.name);
	};

	AdminSettingsPlugins.prototype.onBuild = function (oDom)
	{
		var self = this;

		oDom
			.on('click', '.e-item .configure-plugin-action', function () {
				var oPlugin = ko.dataFor(this);
				if (oPlugin)
				{
					self.configurePlugin(oPlugin);
				}
			})
			.on('click', '.e-item .disabled-plugin', function () {
				var oPlugin = ko.dataFor(this);
				if (oPlugin)
				{
					self.disablePlugin(oPlugin);
				}
			})
		;

		this.enabledPlugins.subscribe(function (bValue) {
			Remote.saveAdminConfig(Utils.emptyFunction, {
				'EnabledPlugins': bValue ? '1' : '0'
			});
		});
	};

	AdminSettingsPlugins.prototype.onShow = function ()
	{
		this.pluginsError('');
		require('App:Admin').reloadPluginList();
	};

	AdminSettingsPlugins.prototype.onPluginLoadRequest = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			require('App:Knoin').showScreenPopup(require('View:Popup:Plugin'), [oData.Result]);
		}
	};

	AdminSettingsPlugins.prototype.onPluginDisableRequest = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData)
		{
			if (!oData.Result && oData.ErrorCode)
			{
				if (Enums.Notification.UnsupportedPluginPackage === oData.ErrorCode && oData.ErrorMessage && '' !== oData.ErrorMessage)
				{
					this.pluginsError(oData.ErrorMessage);
				}
				else
				{
					this.pluginsError(Utils.getNotification(oData.ErrorCode));
				}
			}
		}

		require('App:Admin').reloadPluginList();
	};

	module.exports = AdminSettingsPlugins;

}());