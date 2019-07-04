
(function () {

	if (!window.rl)
	{
		return;
	}

	/**
	 * @constructor
	 */
	function CustomUserSettings()
	{
		this.userSkype = ko.observable('');
		this.userFacebook = ko.observable('');

		this.loading = ko.observable(false);
		this.saving = ko.observable(false);

		this.savingOrLoading = ko.computed(function () {
			return this.loading() || this.saving();
		}, this);
	}

	CustomUserSettings.prototype.customAjaxSaveData = function ()
	{
		var self = this;

		if (this.saving())
		{
			return false;
		}

		this.saving(true);

		window.rl.pluginRemoteRequest(function (sResult, oData) {

			self.saving(false);

			if (window.rl.Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				// true
			}
			else
			{
				// false
			}

		}, 'AjaxSaveCustomUserData', {
			'UserSkype': this.userSkype(),
			'UserFacebook': this.userFacebook()
		});
	};

	CustomUserSettings.prototype.onBuild = function () // special function
	{
		var self = this;

		this.loading(true);

		window.rl.pluginRemoteRequest(function (sResult, oData) {

			self.loading(false);

			if (window.rl.Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				self.userSkype(oData.Result.UserSkype || '');
				self.userFacebook(oData.Result.UserFacebook || '');
			}

		}, 'AjaxGetCustomUserData');

	};

	window.rl.addSettingsViewModel(CustomUserSettings, 'PluginCustomSettingsTab',
		'SETTINGS_CUSTOM_PLUGIN/TAB_NAME', 'custom');

}());