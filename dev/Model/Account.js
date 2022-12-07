import { AbstractModel } from 'Knoin/AbstractModel';
import { addObservablesTo } from 'External/ko';

export class AccountModel extends AbstractModel {
	/**
	 * @param {string} email
	 * @param {boolean=} canBeDelete = true
	 * @param {number=} count = 0
	 */
	constructor(email, name/*, count = 0*/, isAdditional = true) {
		super();

		this.name = name;
		this.email = email;

		this.displayName = name ? name + ' <' + email + '>' : email;

		addObservablesTo(this, {
//			count: count || 0,
			askDelete: false,
			isAdditional: isAdditional
		});
	}

	/**
	 * Imports all mail to main account
	 *//*
	importAll(account) {
		rl.app.Remote.streamPerLine(line => {
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
