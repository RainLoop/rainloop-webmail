import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { getNotificationFromResponse, i18n } from 'Common/Translator';
import { Settings } from 'Common/Globals';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';

export class ChangePasswordUserSettings {
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

		decorateKoCommands(this, {
			saveNewPasswordCommand: self => !self.changeProcess()
				&& '' !== self.currentPassword()
				&& '' !== self.newPassword()
				&& '' !== self.newPassword2()
		});
	}

	saveNewPasswordCommand() {
		if (this.newPassword() !== this.newPassword2()) {
			this.passwordMismatch(true);
			this.errorDescription(i18n('SETTINGS_CHANGE_PASSWORD/ERROR_PASSWORD_MISMATCH'));
		} else {
			this.reset(true);
			Remote.changePassword(this.onChangePasswordResponse.bind(this), this.currentPassword(), this.newPassword());
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

		if (StorageResultType.Success === result && data && data.Result) {
			this.currentPassword('');
			this.newPassword('');
			this.newPassword2('');

			this.passwordUpdateSuccess(true);

			rl.hash.set();
			Settings.set('AuthAccountHash', data.Result);
		} else {
			if (data && Notification.CurrentPasswordIncorrect === data.ErrorCode) {
				this.currentPasswordError(true);
			}

			this.passwordUpdateError(true);
			this.errorDescription(getNotificationFromResponse(data, Notification.CouldNotSaveNewPassword));
		}
	}
}
