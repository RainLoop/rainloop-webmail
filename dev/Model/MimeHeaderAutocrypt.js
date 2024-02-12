//import { AbstractModel } from 'Knoin/AbstractModel';

export class MimeHeaderAutocryptModel/* extends AbstractModel*/
{
	constructor(value) {
//		super();
		this.addr = '';
		this.prefer_encrypt = 'nopreference', // nopreference or mutual
		this.keydata = '';

		if (value) {
			value.split(';').forEach(entry => {
				entry = entry.split('=');
				const trim = str => (str || '').trim().replace(/^["']|["']+$/g, '');
				this[trim(entry[0]).replace('-', '_')] = trim(entry[1]);
			});
		}
	}

	toString() {
		if ('mutual' === this.prefer_encrypt) {
			return `addr=${this.addr}; prefer-encrypt=mutual; keydata=${this.keydata}`;
		}
		return `addr=${this.addr}; keydata=${this.keydata}`;
	}

	key() {
		return '-----BEGIN PGP PUBLIC KEY BLOCK-----\n\n'
			+ this.keydata
			+ '\n-----END PGP PUBLIC KEY BLOCK-----';
	}
}
