/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AdminLicensing()
{
	this.licensing = RL.data().licensing;
	this.licensingProcess = RL.data().licensingProcess;
	this.licenseValid = RL.data().licenseValid;
	this.licenseExpired = RL.data().licenseExpired;
	this.licenseError = RL.data().licenseError;
	this.licenseTrigger = RL.data().licenseTrigger;

	this.adminDomain = ko.observable('');
	this.subscriptionEnabled = ko.observable(!!RL.settingsGet('SubscriptionEnabled'));

	this.licenseTrigger.subscribe(function () {
		if (this.subscriptionEnabled())
		{
			RL.reloadLicensing(true);
		}
	}, this);
}

Utils.addSettingsViewModel(AdminLicensing, 'AdminSettingsLicensing', 'Licensing', 'licensing');

AdminLicensing.prototype.onBuild = function ()
{
	if (this.subscriptionEnabled())
	{
		RL.reloadLicensing(false);
	}
};

AdminLicensing.prototype.onShow = function ()
{
	this.adminDomain(RL.settingsGet('AdminDomain'));
};

AdminLicensing.prototype.showActivationForm = function ()
{
	kn.showScreenPopup(PopupsActivateViewModel);
};

/**
 * @returns {string}
 */
AdminLicensing.prototype.licenseExpiredMomentValue = function ()
{
	var
		iTime = this.licenseExpired(),
		oDate = moment.unix(iTime)
	;

	return iTime && 1898625600 === iTime ? 'Never' : (oDate.format('LL') + ' (' + oDate.from(moment()) + ')');
};