import { AbstractModel } from 'Knoin/AbstractModel';
import { addObservablesTo } from 'External/ko';

export class IdentityModel extends AbstractModel {
	/**
	 * @param {string} id
	 * @param {string} email
	 */
	constructor() {
		super();

		addObservablesTo(this, {
			id: '',
			email: '',
			name: '',

			replyTo: '',
			bcc: '',

			signature: '',
			signatureInsertBefore: false,

			askDelete: false
		});
	}

	/**
	 * @returns {string}
	 */
	formattedName() {
		const name = this.name(),
			email = this.email();

		return name ? name + ' <' + email + '>' : email;
	}
}
