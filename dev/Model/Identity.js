import { AbstractModel } from 'Knoin/AbstractModel';
import { addObservablesTo, addComputablesTo } from 'External/ko';

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

			smimeKey: '',
			smimeCertificate: '',

			askDelete: false
		});

		addComputablesTo(this, {
			smimeKeyEncrypted: () => this.smimeKey().includes('-----BEGIN ENCRYPTED PRIVATE KEY-----'),
			smimeKeyValid: () => /^-----BEGIN (ENCRYPTED |RSA )?PRIVATE KEY-----/.test(this.smimeKey()),
			smimeCertificateValid: () => /^-----BEGIN CERTIFICATE-----/.test(this.smimeCertificate())
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
