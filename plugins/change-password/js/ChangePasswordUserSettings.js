
(rl => {

	if (!rl)
	{
		return;
	}

	let pw_re = [/[^0-9A-Za-z]+/g, /[0-9]+/g, /[A-Z]+/g, /[a-z]+/g],
		getPassStrength = v => {
			let m,
				i = v.length,
				max = Math.min(100, i * 8),
				s = 0,
				c = 0,
				ii;
			while (i--) {
				s += (v[i] != v[i+1] ? 1 : -0.5);
			}
			for (i = 0; i < 4; ++i) {
				m = v.match(pw_re[i]);
				if (m) {
					++c;
					for (ii = 0; ii < m.length; ++ii) {
						if (5 > m[ii].length) {
							++s;
						}
					}
				}
			}
			return Math.max(0, Math.min(max, s * c * 1.5));
		};

	class ChangePasswordUserSettings
	{
		constructor() {
			this.changeProcess = ko.observable(false);
			this.errorDescription = ko.observable('');
			this.passwordMismatch = ko.observable(false);
			this.passwordUpdateError = ko.observable(false);
			this.passwordUpdateSuccess = ko.observable(false);
			this.currentPassword = ko.observable('');
			this.currentPasswordError = ko.observable(false);
			this.newPassword = ko.observable('');
			this.newPassword2 = ko.observable('');

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

		onBuild(dom) {
			let input = dom.querySelector('.new-password'),
				meter = dom.querySelector('.new-password-meter');
			input && meter && input.addEventListener('input',() => meter.value = getPassStrength(input.value));
		}

		onHide() {
			this.reset(false);
			this.currentPassword('');
			this.newPassword('');
			this.newPassword2('');
		}

		onChangePasswordResponse(iError, data) {
			this.reset(false);
			if (iError) {
				this.passwordUpdateError(true);
				if (131 === iError) {
					// Notification.CurrentPasswordIncorrect
					this.currentPasswordError(true);
				}
				this.errorDescription((data && data.ErrorMessageAdditional)
					|| rl.i18n('NOTIFICATIONS/COULD_NOT_SAVE_NEW_PASSWORD'));
			} else {
				this.currentPassword('');
				this.newPassword('');
				this.newPassword2('');
				this.passwordUpdateSuccess(true);
				rl.settings.set('AuthAccountHash', data.Result);
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
