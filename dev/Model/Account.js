import ko from 'ko';

import { change } from 'Common/Links';

import { AbstractModel } from 'Knoin/AbstractModel';

class AccountModel extends AbstractModel {
	/**
	 * @param {string} email
	 * @param {boolean=} canBeDelete = true
	 * @param {number=} count = 0
	 */
	constructor(email, canBeDelete = true, count = 0) {
		super('AccountModel');

		this.email = email;

		this.count = ko.observable(count);

		this.deleteAccess = ko.observable(false);
		this.canBeDeleted = ko.observable(!!canBeDelete);
		this.canBeEdit = this.canBeDeleted;
	}

	/**
	 * @returns {string}
	 */
	changeAccountLink() {
		return change(this.email);
	}
}

export { AccountModel, AccountModel as default };
