
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
			let minLength = rl.pluginSettingsGet('change-password', 'pass_min_length');
			let minStrength = rl.pluginSettingsGet('change-password', 'pass_min_strength');

			this.changeProcess = ko.observable(false);
			this.errorDescription = ko.observable('');
			this.passwordMismatch = ko.observable(false);
			this.passwordUpdateError = ko.observable(false);
			this.passwordUpdateSuccess = ko.observable(false);
			this.currentPassword = ko.observable('');
			this.currentPasswordError = ko.observable(false);
			this.newPassword = ko.observable('');
			this.newPassword2 = ko.observable('');
			this.pass_min_length = minLength;

			this.currentPassword.subscribe(() => this.resetUpdate(true));
			this.newPassword.subscribe(() => this.resetUpdate());
			this.newPassword2.subscribe(() => this.resetUpdate());

			ko.decorateCommands(this, {
				saveNewPasswordCommand: self => !self.changeProcess()
					&& '' !== self.currentPassword()
					&& self.newPassword().length >= minLength
					&& self.newPassword2() == self.newPassword()
					&& (!this.meter || this.meter.value >= minStrength)
			});
		}

		submitForm(form) {
			form.reportValidity() && this.saveNewPasswordCommand();
		}

		saveNewPasswordCommand() {
			if (this.newPassword() !== this.newPassword2()) {
				this.passwordMismatch(true);
				this.errorDescription(rl.i18n('SETTINGS_CHANGE_PASSWORD/ERROR_PASSWORD_MISMATCH'));
			} else {
				this.reset(true);
				rl.pluginRemoteRequest(
					(iError, data) => {
						this.reset(false);
						if (iError) {
							this.passwordUpdateError(true);
							if (131 === iError) {
								// Notification.CurrentPasswordIncorrect
								this.currentPasswordError(true);
							}
							this.errorDescription((data && rl.i18n(data.ErrorMessageAdditional))
								|| rl.i18n('NOTIFICATIONS/COULD_NOT_SAVE_NEW_PASSWORD'));
						} else {
							this.currentPassword('');
							this.newPassword('');
							this.newPassword2('');
							this.passwordUpdateSuccess(true);
/*
							const refresh = rl.app.refresh;
							rl.app.refresh = ()=>{};
							rl.setData(data.Result);
							rl.app.refresh = refresh;
*/
						}
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
			let meter = dom.querySelector('.new-password-meter');
			meter && this.newPassword.subscribe(value => meter.value = getPassStrength(value));
			this.meter = meter;
		}

		onHide() {
			this.reset(false);
			this.currentPassword('');
			this.newPassword('');
			this.newPassword2('');
		}
	}

	rl.addSettingsViewModel(
		ChangePasswordUserSettings,
		'SettingsChangePassword',
		'GLOBAL/PASSWORD',
		'change-password'
	);

})(window.rl);
