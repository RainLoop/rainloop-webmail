
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

		rl.pluginRemoteRequest(function (iError, oData) {

			self.loading(false);

			if (!iError && oData && oData.Result) {
				self.php(oData.Result.PHP || '');
			}

			if (rl.Enums.StorageResultType.Abort === iError) {
				// show abort
			}

		}, 'JsonAdminGetData');

	};

	rl.addSettingsViewModelForAdmin(CustomAdminSettings, 'PluginCustomAdminSettingsTab',
		'SETTINGS_CUSTOM_ADMIN_CUSTOM_TAB_PLUGIN/TAB_NAME', 'custom');

}());
