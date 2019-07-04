import ko from 'ko';

import { AbstractModel } from 'Knoin/AbstractModel';

class IdentityModel extends AbstractModel {
	/**
	 * @param {string} id
	 * @param {string} email
	 */
	constructor(id, email) {
		super('IdentityModel');

		this.id = ko.observable(id || '');
		this.email = ko.observable(email);
		this.name = ko.observable('');

		this.replyTo = ko.observable('');
		this.bcc = ko.observable('');

		this.signature = ko.observable('');
		this.signatureInsertBefore = ko.observable(false);

		this.deleteAccess = ko.observable(false);
		this.canBeDeleted = ko.computed(() => '' !== this.id());
	}

	/**
	 * @returns {string}
	 */
	formattedName() {
		const name = this.name(),
			email = this.email();

		return '' !== name ? name + ' (' + email + ')' : email;
	}
}

export { IdentityModel, IdentityModel as default };
