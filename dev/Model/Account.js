import { AbstractModel } from 'Knoin/AbstractModel';

export class AccountModel extends AbstractModel {
	/**
	 * @param {string} email
	 * @param {boolean=} canBeDelete = true
	 * @param {number=} count = 0
	 */
	constructor(email/*, count = 0*/, isAdditional = true) {
		super();

		this.email = email;

		this.addObservables({
//			count: count || 0,
			askDelete: false,
			isAdditional: isAdditional
		});
	}

}
