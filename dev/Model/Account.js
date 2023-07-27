import { AbstractModel } from 'Knoin/AbstractModel';
import { addObservablesTo } from 'External/ko';
import Remote from 'Remote/User/Fetch';
import { SettingsUserStore } from 'Stores/User/Settings';

export class AccountModel extends AbstractModel {
	/**
	 * @param {string} email
	 * @param {boolean=} canBeDelete = true
	 * @param {number=} count = 0
	 */
	constructor(email, name, isAdditional = true) {
		super();

		this.name = name;
		this.email = email;

		this.displayName = name ? name + ' <' + email + '>' : email;

		addObservablesTo(this, {
			unreadEmails: null,
			askDelete: false,
			isAdditional: isAdditional
		});

		// Load at random between 3 and 30 seconds
		SettingsUserStore.showUnreadCount() && isAdditional
		&& setTimeout(()=>this.fetchUnread(), (Math.ceil(Math.random() * 10)) * 3000);
	}

	/**
	 * Get INBOX unread messages
	 */
	fetchUnread() {
		Remote.request('AccountUnread', (iError, oData) => {
			iError || this.unreadEmails(oData?.Result?.unreadEmails || null);
		}, {
			email: this.email
		});
	}

	/**
	 * Imports all mail to main account
	 *//*
	importAll(account) {
		Remote.streamPerLine(line => {
			try {
				line = JSON.parse(line);
				console.dir(line);
			} catch (e) {
				// OOPS
			}
		}, 'AccountImport', {
			Action: 'AccountImport',
			email: account.email
		});
	}
	*/

}
