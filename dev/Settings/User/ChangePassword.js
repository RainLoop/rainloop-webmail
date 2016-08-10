
import _ from '_';
import ko from 'ko';

import {StorageResultType, Notification} from 'Common/Enums';
import {createCommand} from 'Common/Utils';
import {getNotificationFromResponse, i18n} from 'Common/Translator';

import Remote from 'Remote/User/Ajax';

class ChangePasswordUserSettings
{
	constructor() {
		this.changeProcess = ko.observable(false);

		this.errorDescription = ko.observable('');
		this.passwordMismatch = ko.observable(false);
		this.passwordUpdateError = ko.observable(false);
		this.passwordUpdateSuccess = ko.observable(false);

		this.currentPassword = ko.observable('');
		this.currentPassword.error = ko.observable(false);
		this.newPassword = ko.observable('');
		this.newPassword2 = ko.observable('');

		this.currentPassword.subscribe(() => {
			this.passwordUpdateError(false);
			this.passwordUpdateSuccess(false);
			this.currentPassword.error(false);
		});

		this.newPassword.subscribe(() => {
			this.passwordUpdateError(false);
			this.passwordUpdateSuccess(false);
			this.passwordMismatch(false);
		});

		this.newPassword2.subscribe(() => {
			this.passwordUpdateError(false);
			this.passwordUpdateSuccess(false);
			this.passwordMismatch(false);
		});

		this.saveNewPasswordCommand = createCommand(this, () => {
			if (this.newPassword() !== this.newPassword2())
			{
				this.passwordMismatch(true);
				this.errorDescription(i18n('SETTINGS_CHANGE_PASSWORD/ERROR_PASSWORD_MISMATCH'));
			}
			else
			{
				this.changeProcess(true);

				this.passwordUpdateError(false);
				this.passwordUpdateSuccess(false);
				this.currentPassword.error(false);
				this.passwordMismatch(false);
				this.errorDescription('');

				Remote.changePassword(this.onChangePasswordResponse, this.currentPassword(), this.newPassword());
			}

		}, () => !this.changeProcess() && '' !== this.currentPassword() && '' !== this.newPassword() && '' !== this.newPassword2());

		this.onChangePasswordResponse = _.bind(this.onChangePasswordResponse, this);
	}

	onHide() {
		this.changeProcess(false);
		this.currentPassword('');
		this.newPassword('');
		this.newPassword2('');
		this.errorDescription('');
		this.passwordMismatch(false);
		this.currentPassword.error(false);
	}

	onChangePasswordResponse(result, data) {
		this.changeProcess(false);
		this.passwordMismatch(false);
		this.errorDescription('');
		this.currentPassword.error(false);

		if (StorageResultType.Success === result && data && data.Result)
		{
			this.currentPassword('');
			this.newPassword('');
			this.newPassword2('');

			this.passwordUpdateSuccess(true);
			this.currentPassword.error(false);

			require('App/User').default.setClientSideToken(data.Result);
		}
		else
		{
			if (data && Notification.CurrentPasswordIncorrect === data.ErrorCode)
			{
				this.currentPassword.error(true);
			}

			this.passwordUpdateError(true);
			this.errorDescription(getNotificationFromResponse(data, Notification.CouldNotSaveNewPassword));
		}
	}
}

export {ChangePasswordUserSettings, ChangePasswordUserSettings as default};
