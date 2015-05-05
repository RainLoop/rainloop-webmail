
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		Remote = require('Remote/User/Ajax')
	;

	/**
	 * @constructor
	 */
	function ChangePasswordUserSettings()
	{
		this.changeProcess = ko.observable(false);

		this.errorDescription = ko.observable('');
		this.passwordMismatch = ko.observable(false);
		this.passwordUpdateError = ko.observable(false);
		this.passwordUpdateSuccess = ko.observable(false);

		this.currentPassword = ko.observable('');
		this.currentPassword.error = ko.observable(false);
		this.newPassword = ko.observable('');
		this.newPassword2 = ko.observable('');

		this.currentPassword.subscribe(function () {
			this.passwordUpdateError(false);
			this.passwordUpdateSuccess(false);
			this.currentPassword.error(false);
		}, this);

		this.newPassword.subscribe(function () {
			this.passwordUpdateError(false);
			this.passwordUpdateSuccess(false);
			this.passwordMismatch(false);
		}, this);

		this.newPassword2.subscribe(function () {
			this.passwordUpdateError(false);
			this.passwordUpdateSuccess(false);
			this.passwordMismatch(false);
		}, this);

		this.saveNewPasswordCommand = Utils.createCommand(this, function () {

			if (this.newPassword() !== this.newPassword2())
			{
				this.passwordMismatch(true);
				this.errorDescription(Translator.i18n('SETTINGS_CHANGE_PASSWORD/ERROR_PASSWORD_MISMATCH'));
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

		}, function () {
			return !this.changeProcess() && '' !== this.currentPassword() &&
				'' !== this.newPassword() && '' !== this.newPassword2();
		});

		this.onChangePasswordResponse = _.bind(this.onChangePasswordResponse, this);
	}

	ChangePasswordUserSettings.prototype.onHide = function ()
	{
		this.changeProcess(false);
		this.currentPassword('');
		this.newPassword('');
		this.newPassword2('');
		this.errorDescription('');
		this.passwordMismatch(false);
		this.currentPassword.error(false);
	};

	ChangePasswordUserSettings.prototype.onChangePasswordResponse = function (sResult, oData)
	{
		this.changeProcess(false);
		this.passwordMismatch(false);
		this.errorDescription('');
		this.currentPassword.error(false);

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			this.currentPassword('');
			this.newPassword('');
			this.newPassword2('');

			this.passwordUpdateSuccess(true);
			this.currentPassword.error(false);

			require('App/User').setClientSideToken(oData.Result);
		}
		else
		{
			if (oData && Enums.Notification.CurrentPasswordIncorrect === oData.ErrorCode)
			{
				this.currentPassword.error(true);
			}

			this.passwordUpdateError(true);
			this.errorDescription(oData && oData.ErrorCode ? Translator.getNotification(oData.ErrorCode) :
				Translator.getNotification(Enums.Notification.CouldNotSaveNewPassword));
		}
	};

	module.exports = ChangePasswordUserSettings;

}());