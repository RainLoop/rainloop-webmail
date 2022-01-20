import ko from 'ko';

import { arrayLength } from 'Common/Utils';
import { AbstractModel } from 'Knoin/AbstractModel';

export class OpenPgpKeyModel extends AbstractModel {
	/**
	 * @param {string} guID
	 * @param {string} ID
	 * @param {array} IDs
	 * @param {array} userIDs
	 * @param {array} emails
	 * @param {string} armor
	 * @param {string} userID
	 */
	constructor(guID, ID, IDs, userIDs, emails, armor, userID) {
		super();

		this.id = ID;
		this.ids = arrayLength(IDs) ? IDs : [ID];
		this.guid = guID;
		this.user = '';
		this.users = userIDs;
		this.email = '';
		this.emails = emails;
		this.armor = armor;

		if (this.users) {
			const index = this.users.indexOf(userID);
			if (-1 !== index) {
				this.user = this.users[index];
				this.email = this.emails[index];
			}
		}

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
}
