
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
	function LicensingAdminSetting()
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

	LicensingAdminSetting.prototype.onBuild = function ()
	{
		if (this.subscriptionEnabled())
		{
			require('App/Admin').reloadLicensing(false);
		}
	};

	LicensingAdminSetting.prototype.onShow = function ()
	{
		this.adminDomain(Settings.settingsGet('AdminDomain'));
	};

	LicensingAdminSetting.prototype.showActivationForm = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Activate'));
	};

	/**
	 * @returns {string}
	 */
	LicensingAdminSetting.prototype.licenseExpiredMomentValue = function ()
	{
		var
			iTime = this.licenseExpired(),
			oDate = moment.unix(iTime)
		;

		return iTime && 1898625600 === iTime ? 'Never' : (oDate.format('LL') + ' (' + oDate.from(moment()) + ')');
	};

	module.exports = LicensingAdminSetting;

}());