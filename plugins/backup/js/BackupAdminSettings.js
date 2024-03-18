
(rl => { if (rl) {

	class BackupAdminSettings
	{
		constructor()
		{
			this.loading = ko.observable(false);
		}

		backup()
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
					var link = document.createElement("a");
					link.download = oData.Result.name;
					link.href = oData.Result.data;
					link.textContent = oData.Result.name;
					this.viewModelDom.append(link);
					link.click();
					link.remove();
				}

			}, 'JsonAdminBackupData');
		}

		submitForm(form) {
			form.reportValidity()
			&& rl.pluginRemoteRequest((iError, oData) => {
				console.dir(oData);
			}, 'JsonAdminRestoreData', new FormData(form));
		}
	}

	rl.addSettingsViewModelForAdmin(BackupAdminSettings, 'BackupAdminSettingsTab',
		'Backup and Restore', 'Backup');

}})(window.rl);
