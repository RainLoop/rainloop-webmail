
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		LinkBuilder = require('Common/LinkBuilder'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:Admin:Data'),
		Remote = require('Storage:Admin:Remote')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsSecurity()
	{
		this.useLocalProxyForExternalImages = Data.useLocalProxyForExternalImages;

		this.capaOpenPGP = ko.observable(Settings.capa(Enums.Capa.OpenPGP));
		this.capaTwoFactorAuth = ko.observable(Settings.capa(Enums.Capa.TwoFactor));

		this.adminLogin = ko.observable(Settings.settingsGet('AdminLogin'));
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

			if (this.adminPasswordNew() !== this.adminPasswordNew2())
			{
				this.adminPasswordNewError(true);
				return false;
			}

			this.adminPasswordUpdateError(false);
			this.adminPasswordUpdateSuccess(false);

			Remote.saveNewAdminPassword(this.onNewAdminPasswordResponse, {
				'Password': this.adminPassword(),
				'NewPassword': this.adminPasswordNew()
			});

		}, function () {
			return '' !== this.adminPassword() && '' !== this.adminPasswordNew() && '' !== this.adminPasswordNew2();
		});

		this.onNewAdminPasswordResponse = _.bind(this.onNewAdminPasswordResponse, this);
	}

	AdminSettingsSecurity.prototype.onNewAdminPasswordResponse = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			this.adminPassword('');
			this.adminPasswordNew('');
			this.adminPasswordNew2('');

			this.adminPasswordUpdateSuccess(true);
		}
		else
		{
			this.adminPasswordUpdateError(true);
		}
	};

	AdminSettingsSecurity.prototype.onBuild = function ()
	{
		var
			Remote = require('Storage:Admin:Remote')
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
	};

	AdminSettingsSecurity.prototype.onHide = function ()
	{
		this.adminPassword('');
		this.adminPasswordNew('');
		this.adminPasswordNew2('');
	};

	/**
	 * @return {string}
	 */
	AdminSettingsSecurity.prototype.phpInfoLink = function ()
	{
		return LinkBuilder.phpInfo();
	};

	module.exports = AdminSettingsSecurity;

}());
