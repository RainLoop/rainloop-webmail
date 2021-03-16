
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

	CustomUserSettings.prototype.customJsonSaveData = function ()
	{
		var self = this;

		if (this.saving())
		{
			return false;
		}

		this.saving(true);

		rl.pluginRemoteRequest(function (iError, oData) {

			self.saving(false);

			if (!iError && oData && oData.Result)
			{
				// true
			}
			else if (rl.Enums.StorageResultType.Abort === iError) {
				// show abort
			}
			else
			{
				// false
			}

		}, 'JsonSaveCustomUserData', {
			'UserSkype': this.userSkype(),
			'UserFacebook': this.userFacebook()
		});
	};

	CustomUserSettings.prototype.onBuild = function () // special function
	{
		var self = this;

		this.loading(true);

		rl.pluginRemoteRequest(function (iError, oData) {

			self.loading(false);

			if (!iError && oData && oData.Result)
			{
				self.userSkype(oData.Result.UserSkype || '');
				self.userFacebook(oData.Result.UserFacebook || '');
			}

		}, 'JsonGetCustomUserData');

	};

	rl.addSettingsViewModel(CustomUserSettings, 'PluginCustomSettingsTab',
		'SETTINGS_CUSTOM_PLUGIN/TAB_NAME', 'custom');

}());
