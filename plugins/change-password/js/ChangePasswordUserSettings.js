
(rl => {

	if (!rl)
	{
		return;
	}

	class ChangePasswordUserSettings
	{
		constructor() {
			ko.addObservablesTo(this, {
				changeProcess: false,

				errorDescription: '',
				passwordMismatch: false,
				passwordUpdateError: false,
				passwordUpdateSuccess: false,

				currentPassword: '',
				currentPasswordError: false,
				newPassword: '',
				newPassword2: '',
			});

			this.currentPassword.subscribe(() => this.resetUpdate(true));
			this.newPassword.subscribe(() => this.resetUpdate());
			this.newPassword2.subscribe(() => this.resetUpdate());

			ko.decorateCommands(this, {
				saveNewPasswordCommand: self => !self.changeProcess()
					&& '' !== self.currentPassword()
					&& '' !== self.newPassword()
					&& '' !== self.newPassword2()
			});
		}

		saveNewPasswordCommand() {
			if (this.newPassword() !== this.newPassword2()) {
				this.passwordMismatch(true);
				this.errorDescription(rl.i18n('SETTINGS_CHANGE_PASSWORD/ERROR_PASSWORD_MISMATCH'));
			} else {
				this.reset(true);
				rl.pluginRemoteRequest(
					(...args) => {
						console.dir(...args);
						this.onChangePasswordResponse(...args);
					},
					'ChangePassword',
					{
						'PrevPassword': this.currentPassword(),
						'NewPassword': this.newPassword()
					}
				);
			}
		}

		reset(change) {
			this.changeProcess(change);
			this.resetUpdate();
			this.currentPasswordError(false);
			this.errorDescription('');
		}

		resetUpdate(current) {
			this.passwordUpdateError(false);
			this.passwordUpdateSuccess(false);
			current ? this.currentPasswordError(false) : this.passwordMismatch(false);
		}

		onHide() {
			this.reset(false);
			this.currentPassword('');
			this.newPassword('');
			this.newPassword2('');
		}

		onChangePasswordResponse(result, data) {
			this.reset(false);
			if (rl.Enums.StorageResultType.Success === result && data && data.Result) {
				this.currentPassword('');
				this.newPassword('');
				this.newPassword2('');
				this.passwordUpdateSuccess(true);
				rl.hash.set();
				rl.settings.set('AuthAccountHash', data.Result);
			} else {
				this.passwordUpdateError(true);
				this.errorDescription(rl.i18n('NOTIFICATIONS/COULD_NOT_SAVE_NEW_PASSWORD'));
				if (data) {
					if (131 === data.ErrorCode) {
						// Notification.CurrentPasswordIncorrect
						this.currentPasswordError(true);
					}
					if (data.ErrorMessageAdditional) {
						this.errorDescription(data.ErrorMessageAdditional);
					}
				}
			}
		}
	}

	rl.addSettingsViewModel(
		ChangePasswordUserSettings,
		'SettingsChangePassword',
		'GLOBAL/PASSWORD',
		'change-password'
	);

})(window.rl);
