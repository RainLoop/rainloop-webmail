
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Links = require('Common/Links'),

		AccountStore = require('Stores/User/Account'),
		IdentityStore = require('Stores/User/Identity'),

		Settings = require('Storage/Settings'),
		Remote = require('Remote/User/Ajax')
	;

	/**
	 * @constructor
	 */
	function AccountsUserSettings()
	{
		this.allowAdditionalAccount = Settings.capa(Enums.Capa.AdditionalAccounts);
		this.allowIdentities = Settings.capa(Enums.Capa.Identities);

		this.accounts = AccountStore.accounts;
		this.identities = IdentityStore.identities;

		this.accountForDeletion = ko.observable(null).deleteAccessHelper();
		this.identityForDeletion = ko.observable(null).deleteAccessHelper();
	}

	AccountsUserSettings.prototype.scrollableOptions = function (sWrapper)
	{
		return {
			handle: '.drag-handle',
			containment: sWrapper || 'parent',
			axis: 'y'
		};
	};

	AccountsUserSettings.prototype.addNewAccount = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Account'));
	};

	AccountsUserSettings.prototype.editAccount = function (oAccountItem)
	{
		if (oAccountItem && oAccountItem.canBeEdit())
		{
			require('Knoin/Knoin').showScreenPopup(require('View/Popup/Account'), [oAccountItem]);
		}
	};

	AccountsUserSettings.prototype.addNewIdentity = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Identity'));
	};

	AccountsUserSettings.prototype.editIdentity = function (oIdentity)
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Identity'), [oIdentity]);
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

	/**
	 * @param {IdentityModel} oIdentityToRemove
	 */
	AccountsUserSettings.prototype.deleteIdentity = function (oIdentityToRemove)
	{
		if (oIdentityToRemove && oIdentityToRemove.deleteAccess())
		{
			this.identityForDeletion(null);

			if (oIdentityToRemove)
			{
				IdentityStore.identities.remove(function (oIdentity) {
					return oIdentityToRemove === oIdentity;
				});

				Remote.identityDelete(function () {
					require('App/User').accountsAndIdentities();
				}, oIdentityToRemove.id);
			}
		}
	};

	AccountsUserSettings.prototype.accountsAndIdentitiesAfterMove = function ()
	{
		Remote.accountsAndIdentitiesSortOrder(null,
			AccountStore.accountsEmails.peek(), IdentityStore.identitiesIDS.peek());
	};

	AccountsUserSettings.prototype.onBuild = function (oDom)
	{
		var self = this;

		oDom
			.on('click', '.accounts-list .account-item .e-action', function () {
				var oAccountItem = ko.dataFor(this);
				if (oAccountItem)
				{
					self.editAccount(oAccountItem);
				}
			})
			.on('click', '.identities-list .identity-item .e-action', function () {
				var oIdentityItem = ko.dataFor(this);
				if (oIdentityItem)
				{
					self.editIdentity(oIdentityItem);
				}
			})
		;
	};

	module.exports = AccountsUserSettings;

}());