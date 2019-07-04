import window from 'window';
import _ from '_';
import ko from 'ko';

import { Capa, StorageResultType } from 'Common/Enums';
import { root } from 'Common/Links';

import { capa } from 'Storage/Settings';

import AccountStore from 'Stores/User/Account';
import IdentityStore from 'Stores/User/Identity';
import Remote from 'Remote/User/Ajax';

import { getApp } from 'Helper/Apps/User';

import { showScreenPopup, routeOff, setHash } from 'Knoin/Knoin';

class AccountsUserSettings {
	constructor() {
		this.allowAdditionalAccount = capa(Capa.AdditionalAccounts);
		this.allowIdentities = capa(Capa.Identities);

		this.accounts = AccountStore.accounts;
		this.identities = IdentityStore.identities;

		this.accountForDeletion = ko.observable(null).deleteAccessHelper();
		this.identityForDeletion = ko.observable(null).deleteAccessHelper();
	}

	scrollableOptions(wrapper) {
		return {
			handle: '.drag-handle',
			containment: wrapper || 'parent',
			axis: 'y'
		};
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
						routeOff();
						setHash(root(), true);
						routeOff();

						_.defer(() => window.location.reload());
					} else {
						getApp().accountsAndIdentities();
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
					getApp().accountsAndIdentities();
				}, identityToRemove.id);
			}
		}
	}

	accountsAndIdentitiesAfterMove() {
		Remote.accountsAndIdentitiesSortOrder(null, AccountStore.accountsEmails.peek(), IdentityStore.identitiesIDS.peek());
	}

	onBuild(oDom) {
		const self = this;

		oDom
			.on('click', '.accounts-list .account-item .e-action', function() {
				// eslint-disable-line prefer-arrow-callback
				const account = ko.dataFor(this); // eslint-disable-line no-invalid-this
				if (account) {
					self.editAccount(account);
				}
			})
			.on('click', '.identities-list .identity-item .e-action', function() {
				// eslint-disable-line prefer-arrow-callback
				const identity = ko.dataFor(this); // eslint-disable-line no-invalid-this
				if (identity) {
					self.editIdentity(identity);
				}
			});
	}
}

export { AccountsUserSettings, AccountsUserSettings as default };
