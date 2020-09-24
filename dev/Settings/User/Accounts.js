import ko from 'ko';

import { Capa, StorageResultType } from 'Common/Enums';

import AccountStore from 'Stores/User/Account';
import IdentityStore from 'Stores/User/Identity';
import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

class AccountsUserSettings {
	constructor() {
		this.allowAdditionalAccount = rl.settings.capa(Capa.AdditionalAccounts);
		this.allowIdentities = rl.settings.capa(Capa.Identities);

		this.accounts = AccountStore.accounts;
		this.identities = IdentityStore.identities;

		this.accountForDeletion = ko.observable(null).deleteAccessHelper();
		this.identityForDeletion = ko.observable(null).deleteAccessHelper();
	}

	addNewAccount() {
		showScreenPopup(require('View/Popup/Account'));
	}

	editAccount(account) {
		if (account && account.canBeEdit()) {
			showScreenPopup(require('View/Popup/Account'), [account]);
		}
	}

	addNewIdentity() {
		showScreenPopup(require('View/Popup/Identity'));
	}

	editIdentity(identity) {
		showScreenPopup(require('View/Popup/Identity'), [identity]);
	}

	/**
	 * @param {AccountModel} accountToRemove
	 * @returns {void}
	 */
	deleteAccount(accountToRemove) {
		if (accountToRemove && accountToRemove.deleteAccess()) {
			this.accountForDeletion(null);
			if (accountToRemove) {
				this.accounts.remove((account) => accountToRemove === account);

				Remote.accountDelete((result, data) => {
					if (StorageResultType.Success === result && data && data.Result && data.Reload) {
						rl.route.root();
						setTimeout(() => location.reload(), 1);
					} else {
						rl.app.accountsAndIdentities();
					}
				}, accountToRemove.email);
			}
		}
	}

	/**
	 * @param {IdentityModel} identityToRemove
	 * @returns {void}
	 */
	deleteIdentity(identityToRemove) {
		if (identityToRemove && identityToRemove.deleteAccess()) {
			this.identityForDeletion(null);

			if (identityToRemove) {
				IdentityStore.identities.remove((oIdentity) => identityToRemove === oIdentity);

				Remote.identityDelete(() => {
					rl.app.accountsAndIdentities();
				}, identityToRemove.id);
			}
		}
	}

	accountsAndIdentitiesAfterMove() {
		Remote.accountsAndIdentitiesSortOrder(null, AccountStore.getEmailAddresses(), IdentityStore.getIDS());
	}

	onBuild(oDom) {
		oDom.addEventListener('click', event => {
			let el = event.target.closestWithin('.accounts-list .account-item .e-action', oDom);
			el && ko.dataFor(el) && this.editAccount(ko.dataFor(el));

			el = event.target.closestWithin('.identities-list .identity-item .e-action', oDom);
			el && ko.dataFor(el) && this.editIdentity(ko.dataFor(el));
		});
	}
}

export { AccountsUserSettings, AccountsUserSettings as default };
