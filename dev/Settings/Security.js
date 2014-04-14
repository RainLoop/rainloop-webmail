/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsSecurity()
{
	this.processing = ko.observable(false);
	this.clearing = ko.observable(false);
	this.secreting = ko.observable(false);

	this.viewUser = ko.observable('');
	this.viewEnable = ko.observable(false);
	this.viewEnable.subs = true;
	this.twoFactorStatus = ko.observable(false);

	this.viewSecret = ko.observable('');
	this.viewBackupCodes = ko.observable('');
	this.viewUrl = ko.observable('');

	this.bFirst = true;

	this.viewTwoFactorStatus = ko.computed(function () {
		Globals.langChangeTrigger();
		return Utils.i18n(
			this.twoFactorStatus() ?
				'SETTINGS_SECURITY/TWO_FACTOR_SECRET_CONFIGURED_DESC' :
				'SETTINGS_SECURITY/TWO_FACTOR_SECRET_NOT_CONFIGURED_DESC'
		);
	}, this);
	
	this.onResult = _.bind(this.onResult, this);
	this.onSecretResult = _.bind(this.onSecretResult, this);
}

Utils.addSettingsViewModel(SettingsSecurity, 'SettingsSecurity', 'SETTINGS_LABELS/LABEL_SECURITY_NAME', 'security');

SettingsSecurity.prototype.showSecret = function ()
{
	this.secreting(true);
	RL.remote().showTwoFactorSecret(this.onSecretResult);
};

SettingsSecurity.prototype.hideSecret = function ()
{
	this.viewSecret('');
	this.viewBackupCodes('');
	this.viewUrl('');
};

SettingsSecurity.prototype.createTwoFactor = function ()
{
	this.processing(true);
	RL.remote().createTwoFactor(this.onResult);
};

SettingsSecurity.prototype.enableTwoFactor = function ()
{
	this.processing(true);
	RL.remote().enableTwoFactor(this.onResult, this.viewEnable());
};

SettingsSecurity.prototype.testTwoFactor = function ()
{
	kn.showScreenPopup(PopupsTwoFactorTestViewModel);
};

SettingsSecurity.prototype.clearTwoFactor = function ()
{
	this.viewSecret('');
	this.viewBackupCodes('');
	this.viewUrl('');
	
	this.clearing(true);
	RL.remote().clearTwoFactor(this.onResult);
};

SettingsSecurity.prototype.onShow = function ()
{
	this.viewSecret('');
	this.viewBackupCodes('');
	this.viewUrl('');
};

SettingsSecurity.prototype.onResult = function (sResult, oData)
{
	this.processing(false);
	this.clearing(false);

	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		this.viewUser(Utils.pString(oData.Result.User));
		this.viewEnable(!!oData.Result.Enable);
		this.twoFactorStatus(!!oData.Result.IsSet);

		this.viewSecret(Utils.pString(oData.Result.Secret));
		this.viewBackupCodes(Utils.pString(oData.Result.BackupCodes).replace(/[\s]+/g, '  '));
		this.viewUrl(Utils.pString(oData.Result.Url));
	}
	else
	{
		this.viewUser('');
		this.viewEnable(false);
		this.twoFactorStatus(false);

		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrl('');
	}

	if (this.bFirst)
	{
		this.bFirst = false;
		var self = this;
		this.viewEnable.subscribe(function (bValue) {
			if (this.viewEnable.subs)
			{
				RL.remote().enableTwoFactor(function (sResult, oData) {
					if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
					{
						self.viewEnable.subs = false;
						self.viewEnable(false);
						self.viewEnable.subs = true;
					}
				}, bValue);
			}
		}, this);
	}
};

SettingsSecurity.prototype.onSecretResult = function (sResult, oData)
{
	this.secreting(false);

	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		this.viewSecret(Utils.pString(oData.Result.Secret));
		this.viewUrl(Utils.pString(oData.Result.Url));
	}
	else
	{
		this.viewSecret('');
		this.viewUrl('');
	}
};

SettingsSecurity.prototype.onBuild = function ()
{
	this.processing(true);
	RL.remote().getTwoFactor(this.onResult);
};
