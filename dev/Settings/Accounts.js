/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsAccounts()
{
	var oData = RL.data();
	
	this.accounts = oData.accounts;
	
	this.processText = ko.computed(function () {
		return oData.accountsLoading() ? Utils.i18n('SETTINGS_ACCOUNTS/LOADING_PROCESS') : '';
	}, this);

	this.visibility = ko.computed(function () {
		return '' === this.processText() ? 'hidden' : 'visible';
	}, this);

	this.accountForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
		function (oPrev) {
			if (oPrev)
			{
				oPrev.deleteAccess(false);
			}
		}, function (oNext) {
			if (oNext)
			{
				oNext.deleteAccess(true);
			}
		}
	]});
}

Utils.addSettingsViewModel(SettingsAccounts, 'SettingsAccounts', 'SETTINGS_LABELS/LABEL_ACCOUNTS_NAME', 'accounts');

SettingsAccounts.prototype.addNewAccount = function ()
{
	kn.showScreenPopup(PopupsAddAccountViewModel);
};

/**
 *
 * @param {AccountModel} oAccountToRemove
 */
SettingsAccounts.prototype.deleteAccount = function (oAccountToRemove)
{
	if (oAccountToRemove && oAccountToRemove.deleteAccess())
	{
		this.accountForDeletion(null);
		
		var
			fRemoveAccount = function (oAccount) {
				return oAccountToRemove === oAccount;
			}
		;

		if (oAccountToRemove)
		{
			this.accounts.remove(fRemoveAccount);
			
			RL.remote().accountDelete(function () {
				RL.accountsAndIdentities();
			}, oAccountToRemove.email);
		}
	}
};
