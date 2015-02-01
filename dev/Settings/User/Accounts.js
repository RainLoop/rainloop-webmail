
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Translator = require('Common/Translator'),
		Links = require('Common/Links'),

		AccountStore = require('Stores/User/Account'),

		Remote = require('Storage/User/Remote')
	;

	/**
	 * @constructor
	 */
	function AccountsUserSettings()
	{
		this.accounts = AccountStore.collection;

		this.processText = ko.computed(function () {
			return AccountStore.loading() ? Translator.i18n('SETTINGS_ACCOUNTS/LOADING_PROCESS') : '';
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

	AccountsUserSettings.prototype.scrollableOptions = function ()
	{
		return {
			handle: '.drag-handle'
		};
	};

	AccountsUserSettings.prototype.addNewAccount = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/AddAccount'));
	};

	AccountsUserSettings.prototype.editAccount = function (oAccountItem)
	{
		if (oAccountItem && oAccountItem.canBeEdit())
		{
			require('Knoin/Knoin').showScreenPopup(require('View/Popup/AddAccount'), [oAccountItem]);
		}
	};

	/**
	 * @param {AccountModel} oAccountToRemove
	 */
	AccountsUserSettings.prototype.deleteAccount = function (oAccountToRemove)
	{
		if (oAccountToRemove && oAccountToRemove.deleteAccess())
		{
			this.accountForDeletion(null);

			var
				kn = require('Knoin/Knoin'),
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
						kn.setHash(Links.root(), true);
						kn.routeOff();

						_.defer(function () {
							window.location.reload();
						});
					}
					else
					{
						require('App/User').accountsAndIdentities();
					}

				}, oAccountToRemove.email);
			}
		}
	};

	AccountsUserSettings.prototype.onBuild = function (oDom)
	{
		var self = this;

		oDom
			.on('click', '.account-item .e-action', function () {
				var oAccountItem = ko.dataFor(this);
				if (oAccountItem)
				{
					self.editAccount(oAccountItem);
				}
			})
		;
	};

	module.exports = AccountsUserSettings;

}());