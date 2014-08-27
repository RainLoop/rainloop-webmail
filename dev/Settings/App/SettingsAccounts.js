/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {
	
	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),

		Data = require('Storage:RainLoop:Data'),
		Remote = require('Storage:RainLoop:Remote')
	;

	/**
	 * @constructor
	 */
	function SettingsAccounts()
	{
		this.accounts = Data.accounts;

		this.processText = ko.computed(function () {
			return Data.accountsLoading() ? Utils.i18n('SETTINGS_ACCOUNTS/LOADING_PROCESS') : '';
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

	SettingsAccounts.prototype.addNewAccount = function ()
	{
		require('App:Knoin').showScreenPopup(require('View:Popup:AddAccount'));
	};

	/**
	 * @param {AccountModel} oAccountToRemove
	 */
	SettingsAccounts.prototype.deleteAccount = function (oAccountToRemove)
	{
		if (oAccountToRemove && oAccountToRemove.deleteAccess())
		{
			this.accountForDeletion(null);

			var
				kn = require('App:Knoin'),
				fRemoveAccount = function (oAccount) {
					return oAccountToRemove === oAccount;
				}
			;

			if (oAccountToRemove)
			{
				this.accounts.remove(fRemoveAccount);

				Remote.accountDelete(function (sResult, oData) {

					if (Enums.StorageResultType.Success === sResult && oData &&
						oData.Result && oData.Reload)
					{
						kn.routeOff();
						kn.setHash(LinkBuilder.root(), true);
						kn.routeOff();

						_.defer(function () {
							window.location.reload();
						});
					}
					else
					{
						require('App:RainLoop').accountsAndIdentities();
					}

				}, oAccountToRemove.email);
			}
		}
	};

	module.exports = SettingsAccounts;

}(module, require));