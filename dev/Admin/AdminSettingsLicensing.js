/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../External/ko.js'),
		moment = require('../External/moment.js'),

		AppSettings = require('../Storages/AppSettings.js'),
		Data = require('../Storages/AdminDataStorage.js'),

		RL = require('../Boots/AdminApp.js'),
		
		kn = require('../Knoin/Knoin.js'),
		PopupsActivateViewModel = require('../ViewModels/Popups/PopupsActivateViewModel.js')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsLicensing()
	{
		this.licensing = Data.licensing;
		this.licensingProcess = Data.licensingProcess;
		this.licenseValid = Data.licenseValid;
		this.licenseExpired = Data.licenseExpired;
		this.licenseError = Data.licenseError;
		this.licenseTrigger = Data.licenseTrigger;

		this.adminDomain = ko.observable('');
		this.subscriptionEnabled = ko.observable(!!AppSettings.settingsGet('SubscriptionEnabled'));

		this.licenseTrigger.subscribe(function () {
			if (this.subscriptionEnabled())
			{
				RL.reloadLicensing(true);
			}
		}, this);
	}

	AdminSettingsLicensing.prototype.onBuild = function ()
	{
		if (this.subscriptionEnabled())
		{
			RL.reloadLicensing(false);
		}
	};

	AdminSettingsLicensing.prototype.onShow = function ()
	{
		this.adminDomain(AppSettings.settingsGet('AdminDomain'));
	};

	AdminSettingsLicensing.prototype.showActivationForm = function ()
	{
		kn.showScreenPopup(PopupsActivateViewModel);
	};

	/**
	 * @returns {string}
	 */
	AdminSettingsLicensing.prototype.licenseExpiredMomentValue = function ()
	{
		var
			iTime = this.licenseExpired(),
			oDate = moment.unix(iTime)
		;

		return iTime && 1898625600 === iTime ? 'Never' : (oDate.format('LL') + ' (' + oDate.from(moment()) + ')');
	};
	
	module.exports = AdminSettingsLicensing;

}(module));