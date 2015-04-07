
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Translator = require('Common/Translator'),

		Settings = require('Storage/Settings'),

		Remote = require('Remote/User/Ajax'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function TwoFactorConfigurationPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsTwoFactorConfiguration');

		this.lock = ko.observable(false);

		this.capaTwoFactor = Settings.capa(Enums.Capa.TwoFactor);

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
				Translator.i18n('POPUPS_TWO_FACTOR_CFG/TWO_FACTOR_SECRET_TEST_BEFORE_DESC');
		}, this);

		this.viewTwoFactorStatus = ko.computed(function () {
			Translator.trigger();
			return Translator.i18n(
				this.twoFactorStatus() ?
					'POPUPS_TWO_FACTOR_CFG/TWO_FACTOR_SECRET_CONFIGURED_DESC' :
					'POPUPS_TWO_FACTOR_CFG/TWO_FACTOR_SECRET_NOT_CONFIGURED_DESC'
			);
		}, this);

		this.twoFactorAllowedEnable = ko.computed(function () {
			return this.viewEnable() || this.twoFactorTested();
		}, this);

		this.onResult = _.bind(this.onResult, this);
		this.onShowSecretResult = _.bind(this.onShowSecretResult, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/TwoFactorConfiguration', 'TwoFactorConfigurationPopupView'], TwoFactorConfigurationPopupView);
	_.extend(TwoFactorConfigurationPopupView.prototype, AbstractView.prototype);


	TwoFactorConfigurationPopupView.prototype.showSecret = function ()
	{
		this.secreting(true);
		Remote.showTwoFactorSecret(this.onShowSecretResult);
	};

	TwoFactorConfigurationPopupView.prototype.hideSecret = function ()
	{
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrl('');
	};

	TwoFactorConfigurationPopupView.prototype.createTwoFactor = function ()
	{
		this.processing(true);
		Remote.createTwoFactor(this.onResult);
	};

	TwoFactorConfigurationPopupView.prototype.logout = function ()
	{
		require('App/User').logout();
	};

	TwoFactorConfigurationPopupView.prototype.testTwoFactor = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/TwoFactorTest'), [this.twoFactorTested]);
	};

	TwoFactorConfigurationPopupView.prototype.clearTwoFactor = function ()
	{
		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrl('');

		this.twoFactorTested(false);

		this.clearing(true);
		Remote.clearTwoFactor(this.onResult);
	};

	TwoFactorConfigurationPopupView.prototype.onShow = function (bLock)
	{
		this.lock(!!bLock);

		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrl('');
	};

	TwoFactorConfigurationPopupView.prototype.onHide = function ()
	{
		if (this.lock())
		{
			window.location.reload();
		}
	};

	TwoFactorConfigurationPopupView.prototype.onResult = function (sResult, oData)
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

	TwoFactorConfigurationPopupView.prototype.onShowSecretResult = function (sResult, oData)
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

	TwoFactorConfigurationPopupView.prototype.onBuild = function ()
	{
		if (this.capaTwoFactor)
		{
			this.processing(true);
			Remote.getTwoFactor(this.onResult);
		}
	};

	module.exports = TwoFactorConfigurationPopupView;

}());