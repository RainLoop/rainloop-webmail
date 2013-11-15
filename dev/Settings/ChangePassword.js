/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsChangePasswordScreen()
{
	this.changeProcess = ko.observable(false);

	this.passwordUpdateError = ko.observable(false);
	this.passwordUpdateSuccess = ko.observable(false);
	
	this.currentPassword = ko.observable('');
	this.newPassword = ko.observable('');

	this.currentPassword.subscribe(function () {
		this.passwordUpdateError(false);
		this.passwordUpdateSuccess(false);
	}, this);

	this.newPassword.subscribe(function () {
		this.passwordUpdateError(false);
		this.passwordUpdateSuccess(false);
	}, this);

	this.saveNewPasswordCommand = Utils.createCommand(this, function () {

		this.changeProcess(true);
		
		this.passwordUpdateError(false);
		this.passwordUpdateSuccess(false);

		RL.remote().changePassword(this.onChangePasswordResponse, this.currentPassword(), this.newPassword());

	}, function () {
		return !this.changeProcess() && '' !== this.currentPassword() && '' !== this.newPassword();
	});

	this.onChangePasswordResponse = _.bind(this.onChangePasswordResponse, this);
}

Utils.addSettingsViewModel(SettingsChangePasswordScreen, 'SettingsChangePassword', 'SETTINGS_LABELS/LABEL_CHANGE_PASSWORD_NAME', 'change-password');

SettingsChangePasswordScreen.prototype.onHide = function ()
{
	this.changeProcess(false);
	this.currentPassword('');
	this.newPassword('');
};

SettingsChangePasswordScreen.prototype.onChangePasswordResponse = function (sResult, oData)
{
	this.changeProcess(false);
	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		this.currentPassword('');
		this.newPassword('');
		
		this.passwordUpdateSuccess(true);
	}
	else
	{
		this.passwordUpdateError(true);
	}
};
