import { change } from 'Common/Links';

import { AbstractModel } from 'Knoin/AbstractModel';

class AccountModel extends AbstractModel {
	/**
	 * @param {string} email
	 * @param {boolean=} canBeDelete = true
	 * @param {number=} count = 0
	 */
	constructor(email, canBeDelete = true, count = 0) {
		super();

		this.email = email;

		this.addObservables({
			count: count,
			deleteAccess: false,
			canBeDeleted: !!canBeDelete
		});
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
