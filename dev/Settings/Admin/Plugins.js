
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		Settings = require('Storage/Settings'),

		AppStore = require('Stores/Admin/App'),
		PluginStore = require('Stores/Admin/Plugin'),
		
		Remote = require('Remote/Admin/Ajax')
	;

	/**
	 * @constructor
	 */
	function PluginsAdminSettings()
	{
		this.enabledPlugins = ko.observable(!!Settings.settingsGet('EnabledPlugins'));

		this.plugins = PluginStore.plugins;
		this.pluginsError = PluginStore.plugins.error;

		this.community = RL_COMMUNITY || AppStore.community();

		this.visibility = ko.computed(function () {
			return PluginStore.plugins.loading() ? 'visible' : 'hidden';
		}, this);

		this.onPluginLoadRequest = _.bind(this.onPluginLoadRequest, this);
		this.onPluginDisableRequest = _.bind(this.onPluginDisableRequest, this);
	}

	PluginsAdminSettings.prototype.disablePlugin = function (oPlugin)
	{
		oPlugin.disabled(!oPlugin.disabled());
		Remote.pluginDisable(this.onPluginDisableRequest, oPlugin.name, oPlugin.disabled());
	};

	PluginsAdminSettings.prototype.configurePlugin = function (oPlugin)
	{
		Remote.plugin(this.onPluginLoadRequest, oPlugin.name);
	};

	PluginsAdminSettings.prototype.onBuild = function (oDom)
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

	PluginsAdminSettings.prototype.onShow = function ()
	{
		PluginStore.plugins.error('');
		require('App/Admin').reloadPluginList();
	};

	PluginsAdminSettings.prototype.onPluginLoadRequest = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			require('Knoin/Knoin').showScreenPopup(require('View/Popup/Plugin'), [oData.Result]);
		}
	};

	PluginsAdminSettings.prototype.onPluginDisableRequest = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData)
		{
			if (!oData.Result && oData.ErrorCode)
			{
				if (Enums.Notification.UnsupportedPluginPackage === oData.ErrorCode && oData.ErrorMessage && '' !== oData.ErrorMessage)
				{
					PluginStore.plugins.error(oData.ErrorMessage);
				}
				else
				{
					PluginStore.plugins.error(Translator.getNotification(oData.ErrorCode));
				}
			}
		}

		require('App/Admin').reloadPluginList();
	};

	module.exports = PluginsAdminSettings;

}());