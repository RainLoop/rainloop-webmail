
(function () {

	'use strict';

	var
		ko = require('ko'),

		Settings = require('Storage/Settings'),
		LicenseStore = require('Stores/Admin/License')
	;

	/**
	 * @constructor
	 */
	function LicensingAdminSettings()
	{
		this.licensing = LicenseStore.licensing;
		this.licensingProcess = LicenseStore.licensingProcess;
		this.licenseValid = LicenseStore.licenseValid;
		this.licenseExpired = LicenseStore.licenseExpired;
		this.licenseError = LicenseStore.licenseError;
		this.licenseTrigger = LicenseStore.licenseTrigger;

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

	LicensingAdminSettings.prototype.showTrialForm = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Activate'), [true]);
	};

	/**
	 * @return {boolean}
	 */
	LicensingAdminSettings.prototype.licenseIsUnlim = function ()
	{
		return 1898625600 === this.licenseExpired() || 1898625700 === this.licenseExpired();
	};

	/**
	 * @return {string}
	 */
	LicensingAdminSettings.prototype.licenseExpiredMomentValue = function ()
	{
		var
			moment = require('moment'),
			iTime = this.licenseExpired(),
			oM = moment.unix(iTime)
		;

		return this.licenseIsUnlim() ? 'Never' :
			(iTime && (oM.format('LL') + ' (' + oM.from(moment()) + ')'));
	};

	module.exports = LicensingAdminSettings;

}());