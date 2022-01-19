import ko from 'ko';

import { arrayLength } from 'Common/Utils';
import { AbstractModel } from 'Knoin/AbstractModel';

export class OpenPgpKeyModel extends AbstractModel {
	/**
	 * @param {string} index
	 * @param {string} guID
	 * @param {string} ID
	 * @param {array} IDs
	 * @param {array} userIDs
	 * @param {array} emails
	 * @param {boolean} isPrivate
	 * @param {string} armor
	 * @param {string} userID
	 */
	constructor(index, guID, ID, IDs, userIDs, emails, isPrivate, armor, userID) {
		super();

		this.index = index;
		this.id = ID;
		this.ids = arrayLength(IDs) ? IDs : [ID];
		this.guid = guID;
		this.user = '';
		this.users = userIDs;
		this.email = '';
		this.emails = emails;
		this.armor = armor;
		this.isPrivate = !!isPrivate;

		this.selectUser(userID);

		this.deleteAccess = ko.observable(false);
	}

	/**
	 * OpenPGP.js
	 */
	getNativeKeys() {
		try {
			let key = openpgp.key.readArmored(this.armor);
			if (key && !key.err && key.keys && key.keys[0]) {
				return key.keys;
			}
		} catch (e) {
			console.error(e);
		}
		return null;
	}

	select(pattern, property) {
		if (this[property]) {
			const index = this[property].indexOf(pattern);
			if (-1 !== index) {
				this.user = this.users[index];
				this.email = this.emails[index];
			}
		}
	}

	selectUser(user) {
		this.select(user, 'users');
	}

	selectEmail(email) {
		this.select(email, 'emails');
	}
}
