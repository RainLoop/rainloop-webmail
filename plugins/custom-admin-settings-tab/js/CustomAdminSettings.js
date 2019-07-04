
(function () {

	if (!window.rl)
	{
		return;
	}

	/**
	 * @constructor
	 */
	function CustomAdminSettings()
	{
		this.php = ko.observable('');

		this.loading = ko.observable(false);
	}

	CustomAdminSettings.prototype.onBuild = function () // special function
	{
		var self = this;

		this.loading(true);

		window.rl.pluginRemoteRequest(function (sResult, oData) {

			self.loading(false);

			if (window.rl.Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				self.php(oData.Result.PHP || '');
			}

		}, 'AjaxAdminGetData');

	};

	window.rl.addSettingsViewModelForAdmin(CustomAdminSettings, 'PluginCustomAdminSettingnTab',
		'SETTINGS_CUSTOM_ADMIN_CUSTOM_TAB_PLUGIN/TAB_NAME', 'custom');

}());