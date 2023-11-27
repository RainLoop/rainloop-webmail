
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
					link.download = 'backup.zip';
					link.href = 'data:application/zip;base64,' + oData.Result.zip;
					link.textContent = 'backup.zip';
					this.viewModelDom.append(link);
					link.click();
					link.remove();
				}

			}, 'JsonAdminGetData');
		}
	}

	rl.addSettingsViewModelForAdmin(BackupAdminSettings, 'BackupAdminSettingsTab',
		'Backup and Restore', 'Backup');

}})(window.rl);
