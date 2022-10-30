import { AbstractModel } from 'Knoin/AbstractModel';
import { addObservablesTo } from 'External/ko';

export class AccountModel extends AbstractModel {
	/**
	 * @param {string} email
	 * @param {boolean=} canBeDelete = true
	 * @param {number=} count = 0
	 */
	constructor(email/*, count = 0*/, isAdditional = true) {
		super();

		this.email = email;

		addObservablesTo(this, {
//			count: count || 0,
			askDelete: false,
			isAdditional: isAdditional
		});
	}

}
