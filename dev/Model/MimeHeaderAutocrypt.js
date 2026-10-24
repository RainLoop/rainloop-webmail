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
				entry = entry.match(/^([^=]+)=(.*)$/);
				const trim = str => (str || '').trim().replace(/^["']|["']+$/g, '');
				this[trim(entry[1]).replace('-', '_')] = trim(entry[2]);
			});
			this.keydata = this.keydata.replace(/\s+/g, '\n');
		}
	}

	toString() {
		let result = `addr=${this.addr}; `;
		if ('mutual' === this.prefer_encrypt) {
			result += 'prefer-encrypt=mutual; ';
		}
		return result + 'keydata=' + this.keydata.replace(/\n/g, '\n ');
	}

	pem() {
		return '-----BEGIN PGP PUBLIC KEY BLOCK-----\n\n'
			+ this.keydata
			+ '\n-----END PGP PUBLIC KEY BLOCK-----';
	}
}
