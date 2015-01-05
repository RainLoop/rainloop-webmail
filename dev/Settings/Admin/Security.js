
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),

		Settings = require('Storage/Settings'),
		Data = require('Storage/Admin/Data'),
		Remote = require('Storage/Admin/Remote')
	;

	/**
	 * @constructor
	 */
	function SecurityAdminSettings()
	{
		this.useLocalProxyForExternalImages = Data.useLocalProxyForExternalImages;

		this.weakPassword = Data.weakPassword;

		this.capaOpenPGP = ko.observable(Settings.capa(Enums.Capa.OpenPGP));
		this.capaTwoFactorAuth = ko.observable(Settings.capa(Enums.Capa.TwoFactor));

		this.verifySslCertificate = ko.observable(!!Settings.settingsGet('VerifySslCertificate'));
		this.allowSelfSigned = ko.observable(!!Settings.settingsGet('AllowSelfSigned'));

		this.adminLogin = ko.observable(Settings.settingsGet('AdminLogin'));
		this.adminLoginError = ko.observable(false);
		this.adminPassword = ko.observable('');
		this.adminPasswordNew = ko.observable('');
		this.adminPasswordNew2 = ko.observable('');
		this.adminPasswordNewError = ko.observable(false);

		this.adminPasswordUpdateError = ko.observable(false);
		this.adminPasswordUpdateSuccess = ko.observable(false);

		this.adminPassword.subscribe(function () {
			this.adminPasswordUpdateError(false);
			this.adminPasswordUpdateSuccess(false);
		}, this);

		this.adminLogin.subscribe(function () {
			this.adminLoginError(false);
		}, this);

		this.adminPasswordNew.subscribe(function () {
			this.adminPasswordUpdateError(false);
			this.adminPasswordUpdateSuccess(false);
			this.adminPasswordNewError(false);
		}, this);

		this.adminPasswordNew2.subscribe(function () {
			this.adminPasswordUpdateError(false);
			this.adminPasswordUpdateSuccess(false);
			this.adminPasswordNewError(false);
		}, this);

		this.saveNewAdminPasswordCommand = Utils.createCommand(this, function () {

			if ('' === Utils.trim(this.adminLogin()))
			{
				this.adminLoginError(true);
				return false;
			}

			if (this.adminPasswordNew() !== this.adminPasswordNew2())
			{
				this.adminPasswordNewError(true);
				return false;
			}

			this.adminPasswordUpdateError(false);
			this.adminPasswordUpdateSuccess(false);

			Remote.saveNewAdminPassword(this.onNewAdminPasswordResponse, {
				'Login': this.adminLogin(),
				'Password': this.adminPassword(),
				'NewPassword': this.adminPasswordNew()
			});

		}, function () {
			return '' !== Utils.trim(this.adminLogin()) && '' !== this.adminPassword();
		});

		this.onNewAdminPasswordResponse = _.bind(this.onNewAdminPasswordResponse, this);
	}

	SecurityAdminSettings.prototype.onNewAdminPasswordResponse = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			this.adminPassword('');
			this.adminPasswordNew('');
			this.adminPasswordNew2('');

			this.adminPasswordUpdateSuccess(true);

			this.weakPassword(!!oData.Result.Weak);
		}
		else
		{
			this.adminPasswordUpdateError(true);
		}
	};

	SecurityAdminSettings.prototype.onBuild = function ()
	{
		var
			Remote = require('Storage/Admin/Remote')
		;

		this.capaOpenPGP.subscribe(function (bValue) {
			Remote.saveAdminConfig(Utils.emptyFunction, {
				'CapaOpenPGP': bValue ? '1' : '0'
			});
		});

		this.capaTwoFactorAuth.subscribe(function (bValue) {
			Remote.saveAdminConfig(Utils.emptyFunction, {
				'CapaTwoFactorAuth': bValue ? '1' : '0'
			});
		});

		this.useLocalProxyForExternalImages.subscribe(function (bValue) {
			Remote.saveAdminConfig(null, {
				'UseLocalProxyForExternalImages': bValue ? '1' : '0'
			});
		});

		this.verifySslCertificate.subscribe(function (bValue) {
			Remote.saveAdminConfig(null, {
				'VerifySslCertificate': bValue ? '1' : '0'
			});
		});

		this.allowSelfSigned.subscribe(function (bValue) {
			Remote.saveAdminConfig(null, {
				'AllowSelfSigned': bValue ? '1' : '0'
			});
		});
	};

	SecurityAdminSettings.prototype.onHide = function ()
	{
		this.adminPassword('');
		this.adminPasswordNew('');
		this.adminPasswordNew2('');
	};

	/**
	 * @return {string}
	 */
	SecurityAdminSettings.prototype.phpInfoLink = function ()
	{
		return Links.phpInfo();
	};

	module.exports = SecurityAdminSettings;

}());
