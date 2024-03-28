
(rl => { if (rl) {

	class ExampleUserSettings
	{
		constructor()
		{
			this.userSkype = ko.observable('');
			this.userFacebook = ko.observable('');

			this.loading = ko.observable(false);
			this.saving = ko.observable(false);

			this.savingOrLoading = ko.computed(() => {
				return this.loading() || this.saving();
			});
		}

		exampleJsonSaveData()
		{
			if (!this.saving()) {
				this.saving(true);

				rl.pluginRemoteRequest((iError, oData) => {

					this.saving(false);

					if (iError) {
						console.error({
							iError: iError,
							oData: oData
						});
					} else {
						console.dir({
							iError: iError,
							oData: oData
						});
					}

				}, 'JsonSaveExampleUserData', {
					'UserSkype': this.userSkype(),
					'UserFacebook': this.userFacebook()
				});
			}
		}

		onBuild()
		{
			this.loading(true);

			rl.pluginRemoteRequest((iError, oData) => {

				this.loading(false);

				if (!iError) {
					self.userSkype(oData.Result.UserSkype || '');
					self.userFacebook(oData.Result.UserFacebook || '');
				}

			}, 'JsonGetExampleUserData');

		}
	}

	rl.addSettingsViewModel(ExampleUserSettings, 'ExampleUserSettingsTab',
		'SETTINGS_EXAMPLE_PLUGIN/TAB_NAME', 'Example');

}})(window.rl);
