import ko from 'ko';

import { AbstractModel } from 'Knoin/AbstractModel';

class IdentityModel extends AbstractModel {
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

			deleteAccess: false
		});

		this.canBeDeleted = ko.computed(() => !!this.id());
	}

	/**
	 * @returns {string}
	 */
	formattedName() {
		const name = this.name(),
			email = this.email();

		return name ? name + ' (' + email + ')' : email;
	}
}

export { IdentityModel, IdentityModel as default };
