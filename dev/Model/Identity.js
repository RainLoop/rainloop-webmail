//import { AbstractModel } from 'Knoin/AbstractModel';
import { EmailModel } from 'Model/Email';
import { addObservablesTo, addComputablesTo } from 'External/ko';

export class IdentityModel extends EmailModel /*AbstractModel*/ {
	constructor() {
		super();

		addObservablesTo(this, {
			id: '',
			label: '',
//			email: '',
//			name: '',

			replyTo: '',
			bcc: '',
			sentFolder: '',

			signature: '',
			signatureInsertBefore: false,

			pgpSign: false,
			pgpEncrypt: false,

			smimeKey: '',
			smimeCertificate: '',
			smimeCertificateChain: '',

			askDelete: false,

			exists: false
		});

		addComputablesTo(this, {
			smimeKeyEncrypted: () => this.smimeKey().includes('-----BEGIN ENCRYPTED PRIVATE KEY-----'),
			smimeKeyValid: () => /^-----BEGIN (ENCRYPTED |RSA )?PRIVATE KEY-----/.test(this.smimeKey()),
			smimeCertificateValid: () => /^-----BEGIN CERTIFICATE-----/.test(this.smimeCertificate()),
			smimeCertificateChainValid: () => !this.smimeCertificateChain()
				|| /^-----BEGIN CERTIFICATE-----/.test(this.smimeCertificateChain())
		});
	}

	/**
	 * @returns {string}
	 */
	toString() {
		const name = this.name,
			email = this.email,
			label = this.label();
		return (name ? `${name} ` : '') + `<${email}>` + (label ? ` (${label})` : '');
	}
}
