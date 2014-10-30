
(function () {

	'use strict';

	var
		ko = require('ko'),
		moment = require('moment'),

		Settings = require('Storage/Settings'),
		Data = require('Storage/Admin/Data')
	;

	/**
	 * @constructor
	 */
	function LicensingAdminSettings()
	{
		this.licensing = Data.licensing;
		this.licensingProcess = Data.licensingProcess;
		this.licenseValid = Data.licenseValid;
		this.licenseExpired = Data.licenseExpired;
		this.licenseError = Data.licenseError;
		this.licenseTrigger = Data.licenseTrigger;

		this.adminDomain = ko.observable('');
		this.subscriptionEnabled = ko.observable(!!Settings.settingsGet('SubscriptionEnabled'));

		this.licenseTrigger.subscribe(function () {
			if (this.subscriptionEnabled())
			{
				require('App/Admin').reloadLicensing(true);
			}
		}, this);
	}

	LicensingAdminSettings.prototype.onBuild = function ()
	{
		if (this.subscriptionEnabled())
		{
			require('App/Admin').reloadLicensing(false);
		}
	};

	LicensingAdminSettings.prototype.onShow = function ()
	{
		this.adminDomain(Settings.settingsGet('AdminDomain'));
	};

	LicensingAdminSettings.prototype.showActivationForm = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Activate'));
	};

	/**
	 * @returns {string}
	 */
	LicensingAdminSettings.prototype.licenseExpiredMomentValue = function ()
	{
		var
			iTime = this.licenseExpired(),
			oDate = moment.unix(iTime)
		;

		return iTime && 1898625600 === iTime ? 'Never' : (oDate.format('LL') + ' (' + oDate.from(moment()) + ')');
	};

	module.exports = LicensingAdminSettings;

}());