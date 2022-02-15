import { koComputable } from 'External/ko';

import { AbstractModel } from 'Knoin/AbstractModel';

export class IdentityModel extends AbstractModel {
	/**
	 * @param {string} id
	 * @param {string} email
	 */
	constructor(id, email) {
		super();

		this.addObservables({
			id: id || '',
			email: email,
			name: '',

			replyTo: '',
			bcc: '',

			signature: '',
			signatureInsertBefore: false,

			askDelete: false
		});

		this.canBeDeleted = koComputable(() => !!this.id());
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
