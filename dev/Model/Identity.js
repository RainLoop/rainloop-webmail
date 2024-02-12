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
			label: '',
			email: '',
			name: '',

			replyTo: '',
			bcc: '',
			sentFolder: '',

			signature: '',
			signatureInsertBefore: false,

			pgpSign: false,
			pgpEncrypt: false,

			askDelete: false
		});
	}

	/**
	 * @returns {string}
	 */
	formattedName() {
		const name = this.name(),
			email = this.email(),
			label = this.label();
		return (name ? `${name} ` : '') + `<${email}>` + (label ? ` (${label})` : '');
	}
}
