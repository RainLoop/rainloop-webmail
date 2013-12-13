/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AdminPlugins()
{
	var oData = RL.data();
	
	this.enabledPlugins = ko.observable(!!RL.settingsGet('EnabledPlugins'));

	this.pluginsError = ko.observable('');
	
	this.plugins = oData.plugins;
	this.pluginsLoading = oData.pluginsLoading;
	
	this.visibility = ko.computed(function () {
		return oData.pluginsLoading() ? 'visible' : 'hidden';
	}, this);
	
	this.onPluginLoadRequest = _.bind(this.onPluginLoadRequest, this);
	this.onPluginDisableRequest = _.bind(this.onPluginDisableRequest, this);
}

Utils.addSettingsViewModel(AdminPlugins, 'AdminSettingsPlugins', 'Plugins', 'plugins');

AdminPlugins.prototype.disablePlugin = function (oPlugin)
{
	oPlugin.disabled(!oPlugin.disabled());
	RL.remote().pluginDisable(this.onPluginDisableRequest, oPlugin.name, oPlugin.disabled());
};

AdminPlugins.prototype.configurePlugin = function (oPlugin)
{
	RL.remote().plugin(this.onPluginLoadRequest, oPlugin.name);
};

AdminPlugins.prototype.onBuild = function (oDom)
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
		.on('click', '.e-item .disable-plugin', function () {
			var oPlugin = ko.dataFor(this);
			if (oPlugin)
			{
				self.disablePlugin(oPlugin);
			}
		})
	;

	this.enabledPlugins.subscribe(function (bValue) {
		RL.remote().saveAdminConfig(Utils.emptyFunction, {
			'EnabledPlugins': bValue ? '1' : '0'
		});
	});
};

AdminPlugins.prototype.onShow = function ()
{
	this.pluginsError('');
	RL.reloadPluginList();
};

AdminPlugins.prototype.onPluginLoadRequest = function (sResult, oData)
{
	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		kn.showScreenPopup(PopupsPluginViewModel, [oData.Result]);
	}
};

AdminPlugins.prototype.onPluginDisableRequest = function (sResult, oData)
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

	RL.reloadPluginList();
};
