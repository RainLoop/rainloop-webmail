import ko from 'ko';

import { SettingsCapa, SettingsGet } from 'Common/Globals';

import { AccountUserStore } from 'Stores/User/Account';
import { IdentityUserStore } from 'Stores/User/Identity';
import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { AccountPopupView } from 'View/Popup/Account';
import { IdentityPopupView } from 'View/Popup/Identity';

export class UserSettingsAccounts /*extends AbstractViewSettings*/ {
	constructor() {
		this.allowAdditionalAccount = SettingsCapa('AdditionalAccounts');
		this.allowIdentities = SettingsCapa('Identities');

		this.accounts = AccountUserStore.accounts;
		this.loading = AccountUserStore.loading;
		this.identities = IdentityUserStore;
		this.mainEmail = SettingsGet('MainEmail');

		this.accountForDeletion = ko.observable(null).askDeleteHelper();
		this.identityForDeletion = ko.observable(null).askDeleteHelper();
	}

	addNewAccount() {
		showScreenPopup(AccountPopupView);
	}

	editAccount(account) {
		if (account && account.isAdditional()) {
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
		if (accountToRemove && accountToRemove.askDelete()) {
			this.accountForDeletion(null);
			if (accountToRemove) {
				this.accounts.remove((account) => accountToRemove === account);

				Remote.request('AccountDelete', (iError, data) => {
					if (!iError && data.Reload) {
						rl.route.root();
						setTimeout(() => location.reload(), 1);
					} else {
						rl.app.accountsAndIdentities();
					}
				}, {
					EmailToDelete: accountToRemove.email
				});
			}
		}
	}

	/**
	 * @param {IdentityModel} identityToRemove
	 * @returns {void}
	 */
	deleteIdentity(identityToRemove) {
		if (identityToRemove && identityToRemove.askDelete()) {
			this.identityForDeletion(null);

			if (identityToRemove) {
				IdentityUserStore.remove(oIdentity => identityToRemove === oIdentity);
				Remote.request('IdentityDelete', () => rl.app.accountsAndIdentities(), {
					IdToDelete: identityToRemove.id()
				});
			}
		}
	}

	accountsAndIdentitiesAfterMove() {
		Remote.request('AccountsAndIdentitiesSortOrder', null, {
			Accounts: AccountUserStore.getEmailAddresses().filter(v => v != SettingsGet('MainEmail')),
			Identities: IdentityUserStore.getIDS()
		});
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
