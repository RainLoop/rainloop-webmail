/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		AppSettings = require('../Storages/AppSettings.js'),
		Data = require('../Storages/AdminDataStorage.js'),
		Remote = require('../Storages/AdminAjaxRemoteStorage.js')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsSecurity()
	{
		this.useLocalProxyForExternalImages = Data.useLocalProxyForExternalImages;

		this.capaOpenPGP = ko.observable(AppSettings.capa(Enums.Capa.OpenPGP));
		this.capaTwoFactorAuth = ko.observable(AppSettings.capa(Enums.Capa.TwoFactor));

		this.adminLogin = ko.observable(AppSettings.settingsGet('AdminLogin'));
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
			Remote = require('../Storages/AdminAjaxRemoteStorage.js')
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

}(module, require));
