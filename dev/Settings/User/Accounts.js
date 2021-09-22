import ko from 'ko';

import { Capa } from 'Common/Enums';
import { Settings } from 'Common/Globals';

import { AccountUserStore } from 'Stores/User/Account';
import { IdentityUserStore } from 'Stores/User/Identity';
import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { AccountPopupView } from 'View/Popup/Account';
import { IdentityPopupView } from 'View/Popup/Identity';

export class AccountsUserSettings /*extends AbstractViewSettings*/ {
	constructor() {
		this.allowAdditionalAccount = Settings.capa(Capa.AdditionalAccounts);
		this.allowIdentities = Settings.capa(Capa.Identities);

		this.accounts = AccountUserStore.accounts;
		this.loading = AccountUserStore.loading;
		this.identities = IdentityUserStore;

		this.accountForDeletion = ko.observable(null).deleteAccessHelper();
		this.identityForDeletion = ko.observable(null).deleteAccessHelper();
	}

	addNewAccount() {
		showScreenPopup(AccountPopupView);
	}

	editAccount(account) {
		if (account && account.canBeEdit()) {
			showScreenPopup(AccountPopupView, [account]);
		}
	}

	addNewIdentity() {
		showScreenPopup(IdentityPopupView);
	}

	editIdentity(identity) {
		showScreenPopup(IdentityPopupView, [identity]);
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

				Remote.accountDelete((iError, data) => {
					if (!iError && data.Reload) {
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
				IdentityUserStore.remove(oIdentity => identityToRemove === oIdentity);
				Remote.identityDelete(() => rl.app.accountsAndIdentities(), identityToRemove.id());
			}
		}
	}

	accountsAndIdentitiesAfterMove() {
		Remote.accountsAndIdentitiesSortOrder(null, AccountUserStore.getEmailAddresses(), IdentityUserStore.getIDS());
	}

	onBuild(oDom) {
		oDom.addEventListener('click', event => {
			let el = event.target.closestWithin('.accounts-list .e-action', oDom);
			el && ko.dataFor(el) && this.editAccount(ko.dataFor(el));

			el = event.target.closestWithin('.identities-list .e-action', oDom);
			el && ko.dataFor(el) && this.editIdentity(ko.dataFor(el));
		});
	}
}
