import ko from 'ko';

//import { koComputable } from 'External/ko';
import { SettingsCapa, SettingsGet } from 'Common/Globals';
import { loadAccountsAndIdentities } from 'Common/UtilsUser';

import { AccountUserStore } from 'Stores/User/Account';
import { IdentityUserStore } from 'Stores/User/Identity';
import { SettingsUserStore } from 'Stores/User/Settings';
import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';

import { AccountPopupView } from 'View/Popup/Account';
import { IdentityPopupView } from 'View/Popup/Identity';

export class UserSettingsAccounts /*extends AbstractViewSettings*/ {
	constructor() {
		this.allowAdditionalAccount = SettingsCapa('AdditionalAccounts');
		this.allowIdentities = SettingsCapa('Identities');

		this.accounts = AccountUserStore;
		this.loading = AccountUserStore.loading;
		this.identities = IdentityUserStore;
		this.mainEmail = SettingsGet('mainEmail');

		this.accountForDeletion = ko.observable(null).askDeleteHelper();
		this.identityForDeletion = ko.observable(null).askDeleteHelper();

		this.showUnread = SettingsUserStore.showUnreadCount;
		SettingsUserStore.showUnreadCount.subscribe(value => Remote.saveSetting('ShowUnreadCount', value));

//		this.additionalAccounts = koComputable(() => AccountUserStore.filter(account => account.isAdditional()));
	}

	addNewAccount() {
		showScreenPopup(AccountPopupView);
	}

	editAccount(account) {
		if (account?.isAdditional()) {
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
		if (accountToRemove?.askDelete()) {
			this.accountForDeletion(null);
			this.accounts.remove(account => accountToRemove === account);

			Remote.request('AccountDelete', (iError, data) => {
				if (!iError && data.Reload) {
					rl.route.root();
					setTimeout(() => location.reload(), 1);
				} else {
					loadAccountsAndIdentities();
				}
			}, {
				emailToDelete: accountToRemove.email
			});
		}
	}

	/**
	 * @param {IdentityModel} identityToRemove
	 * @returns {void}
	 */
	deleteIdentity(identityToRemove) {
		if (identityToRemove?.askDelete()) {
			this.identityForDeletion(null);
			IdentityUserStore.remove(oIdentity => identityToRemove === oIdentity);
			Remote.request('IdentityDelete', () => rl.app.accountsAndIdentities(), {
				idToDelete: identityToRemove.id()
			});
		}
	}

	accountsAndIdentitiesAfterMove() {
		Remote.request('AccountsAndIdentitiesSortOrder', null, {
			Accounts: AccountUserStore.getEmailAddresses().filter(v => v != SettingsGet('mainEmail')),
			Identities: IdentityUserStore.map(item => (item ? item.id() : ""))
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
