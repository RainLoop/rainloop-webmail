
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),

		Data = require('Storage/User/Data'),
		Remote = require('Storage/User/Remote')
	;

	/**
	 * @constructor
	 */
	function AccountsUserSetting()
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

	AccountsUserSetting.prototype.addNewAccount = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/AddAccount'));
	};

	/**
	 * @param {AccountModel} oAccountToRemove
	 */
	AccountsUserSetting.prototype.deleteAccount = function (oAccountToRemove)
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

	module.exports = AccountsUserSetting;

}());