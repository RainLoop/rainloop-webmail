
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		SettinsStore = require('Stores/User/Settings'),

		Settings = require('Storage/Settings'),

		Remote = require('Remote/User/Ajax')
	;

	/**
	 * @constructor
	 */
	function SecurityUserSettings()
	{
		this.capaAutoLogout = Settings.capa(Enums.Capa.AutoLogout);
		this.capaTwoFactor = Settings.capa(Enums.Capa.TwoFactor);

		this.autoLogout = SettinsStore.autoLogout;
		this.autoLogout.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

		this.autoLogoutOptions = ko.computed(function () {
			Translator.trigger();
			return [
				{'id': 0, 'name': Translator.i18n('SETTINGS_SECURITY/AUTOLOGIN_NEVER_OPTION_NAME')},
				{'id': 5, 'name': Translator.i18n('SETTINGS_SECURITY/AUTOLOGIN_MINUTES_OPTION_NAME', {'MINUTES': 5})},
				{'id': 10, 'name': Translator.i18n('SETTINGS_SECURITY/AUTOLOGIN_MINUTES_OPTION_NAME', {'MINUTES': 10})},
				{'id': 30, 'name': Translator.i18n('SETTINGS_SECURITY/AUTOLOGIN_MINUTES_OPTION_NAME', {'MINUTES': 30})},
				{'id': 60, 'name': Translator.i18n('SETTINGS_SECURITY/AUTOLOGIN_MINUTES_OPTION_NAME', {'MINUTES': 60})}
			];
		});

		this.processing = ko.observable(false);
		this.clearing = ko.observable(false);
		this.secreting = ko.observable(false);

		this.viewUser = ko.observable('');
		this.twoFactorStatus = ko.observable(false);

		this.twoFactorTested = ko.observable(false);

		this.viewSecret = ko.observable('');
		this.viewBackupCodes = ko.observable('');
		this.viewUrl = ko.observable('');

		this.viewEnable_ = ko.observable(false);

		this.viewEnable = ko.computed({
			'owner': this,
			'read': this.viewEnable_,
			'write': function (bValue) {

				var self = this;

				bValue = !!bValue;

				if (bValue && this.twoFactorTested())
				{
					this.viewEnable_(bValue);

					Remote.enableTwoFactor(function (sResult, oData) {
						if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
						{
							self.viewEnable_(false);
						}

					}, true);
				}
				else
				{
					if (!bValue)
					{
						this.viewEnable_(bValue);
					}

					Remote.enableTwoFactor(function (sResult, oData) {
						if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
						{
							self.viewEnable_(false);
						}

					}, false);
				}
			}
		});

		this.viewTwoFactorEnableTooltip = ko.computed(function () {
			Translator.trigger();
			return this.twoFactorTested() || this.viewEnable_() ? '' :
				Translator.i18n('SETTINGS_SECURITY/TWO_FACTOR_SECRET_TEST_BEFORE_DESC');
		}, this);

		this.viewTwoFactorStatus = ko.computed(function () {
			Translator.trigger();
			return Translator.i18n(
				this.twoFactorStatus() ?
					'SETTINGS_SECURITY/TWO_FACTOR_SECRET_CONFIGURED_DESC' :
					'SETTINGS_SECURITY/TWO_FACTOR_SECRET_NOT_CONFIGURED_DESC'
			);
		}, this);

		this.twoFactorAllowedEnable = ko.computed(function () {
			return this.viewEnable() || this.twoFactorTested();
		}, this);

		this.onResult = _.bind(this.onResult, this);
		this.onShowSecretResult = _.bind(this.onShowSecretResult, this);
	}

	SecurityUserSettings.prototype.showSecret = function ()
	{
		this.secreting(true);
		Remote.showTwoFactorSecret(this.onShowSecretResult);
	};

	SecurityUserSettings.prototype.hideSecret = function ()
	{
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrl('');
	};

	SecurityUserSettings.prototype.createTwoFactor = function ()
	{
		this.processing(true);
		Remote.createTwoFactor(this.onResult);
	};

	SecurityUserSettings.prototype.testTwoFactor = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/TwoFactorTest'), [this.twoFactorTested]);
	};

	SecurityUserSettings.prototype.clearTwoFactor = function ()
	{
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrl('');

		this.twoFactorTested(false);

		this.clearing(true);
		Remote.clearTwoFactor(this.onResult);
	};

	SecurityUserSettings.prototype.onShow = function ()
	{
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrl('');
	};

	SecurityUserSettings.prototype.onResult = function (sResult, oData)
	{
		this.processing(false);
		this.clearing(false);

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			this.viewUser(Utils.pString(oData.Result.User));
			this.viewEnable_(!!oData.Result.Enable);
			this.twoFactorStatus(!!oData.Result.IsSet);
			this.twoFactorTested(!!oData.Result.Tested);

			this.viewSecret(Utils.pString(oData.Result.Secret));
			this.viewBackupCodes(Utils.pString(oData.Result.BackupCodes).replace(/[\s]+/g, '  '));
			this.viewUrl(Utils.pString(oData.Result.Url));
		}
		else
		{
			this.viewUser('');
			this.viewEnable_(false);
			this.twoFactorStatus(false);
			this.twoFactorTested(false);

			this.viewSecret('');
			this.viewBackupCodes('');
			this.viewUrl('');
		}
	};

	SecurityUserSettings.prototype.onShowSecretResult = function (sResult, oData)
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

	SecurityUserSettings.prototype.onBuild = function ()
	{
		if (this.capaTwoFactor)
		{
			this.processing(true);
			Remote.getTwoFactor(this.onResult);
		}

		if (this.capaAutoLogout)
		{
			var self = this;

			_.delay(function () {

				var
					f0 = Utils.settingsSaveHelperSimpleFunction(self.autoLogout.trigger, self)
				;

				self.autoLogout.subscribe(function (sValue) {
					Remote.saveSettings(f0, {
						'AutoLogout': Utils.pInt(sValue)
					});
				});

			});
		}
	};

	module.exports = SecurityUserSettings;

}());