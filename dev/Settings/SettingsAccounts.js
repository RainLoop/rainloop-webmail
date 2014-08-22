/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../External/window.js'),
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),
		
		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		Data = require('../Storages/WebMailDataStorage.js'),
		Remote = require('../Storages/WebMailAjaxRemoteStorage.js'),

		kn = require('../Knoin/Knoin.js'),
		PopupsAddAccountViewModel = require('../ViewModels/Popups/PopupsAddAccountViewModel.js')
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
		kn.showScreenPopup(PopupsAddAccountViewModel);
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
				RL = require('../Boots/RainLoopApp.js'),
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
						RL.accountsAndIdentities();
					}

				}, oAccountToRemove.email);
			}
		}
	};

	module.exports = SettingsAccounts;

}(module));