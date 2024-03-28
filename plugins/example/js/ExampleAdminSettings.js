
(rl => { if (rl) {

	class ExampleAdminSettings
	{
		constructor()
		{
			this.php = ko.observable('');
			this.loading = ko.observable(false);
		}

		onBuild()
		{
			this.loading(true);

			rl.pluginRemoteRequest((iError, oData) => {

				this.loading(false);

				if (iError) {
					console.error({
						iError: iError,
						oData: oData
					});
				} else {
					this.php(oData.Result.PHP || '');
				}

			}, 'JsonAdminGetData');

		}
	}

	rl.addSettingsViewModelForAdmin(ExampleAdminSettings, 'ExampleAdminSettingsTab',
		'SETTINGS_EXAMPLE_ADMIN_EXAMPLE_TAB_PLUGIN/TAB_NAME', 'Example');

}})(window.rl);
