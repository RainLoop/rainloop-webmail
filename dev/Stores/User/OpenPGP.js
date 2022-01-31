/**
 * OpenPGP.js
 */

import ko from 'ko';

import { arrayLength } from 'Common/Utils';
import { delegateRunOnDestroy } from 'Common/UtilsUser';

import { showScreenPopup } from 'Knoin/Knoin';
import { OpenPgpKeyPopupView } from 'View/Popup/OpenPgpKey';

const
	findOpenPGPKey = (keys, query/*, sign*/) =>
		keys.find(key =>
			key.emails.includes(query) || query == key.id || query == key.fingerprint
		),

	/**
	 * OpenPGP.js v5 removed the localStorage (keyring)
	 * This should be compatible with the old OpenPGP.js v2
	 */
	publicKeysItem = 'openpgp-public-keys',
	privateKeysItem = 'openpgp-private-keys',
	storage = window.localStorage,
	loadOpenPgpKeys = async itemname => {
		let keys = [], key,
			armoredKeys = JSON.parse(storage.getItem(itemname)),
			i = arrayLength(armoredKeys);
		while (i--) {
			key = await openpgp.readKey({armoredKey:armoredKeys[i]});
			if (!key.err) {
				keys.push(new OpenPgpKeyModel(armoredKeys[i], key));
			}
		}
		return keys;
	},
	storeOpenPgpKeys = (keys, section) => {
		let armoredKeys = keys.map(item => item.armor);
		if (armoredKeys.length) {
			storage.setItem(section, JSON.stringify(armoredKeys));
		} else {
			storage.removeItem(section);
		}
	};

class OpenPgpKeyModel {
	constructor(armor, key) {
		this.key = key;
		const aEmails = [];
		if (key.users) {
			key.users.forEach(user => user.userID.email && aEmails.push(user.userID.email));
		}
		this.id = key.getKeyID().toHex();
		this.fingerprint = key.getFingerprint();
		this.can_encrypt = !!key.getEncryptionKey();
		this.can_sign = !!key.getSigningKey();
		this.emails = aEmails;
		this.armor = armor;
		this.askDelete = ko.observable(false);
		this.openForDeletion = ko.observable(null).askDeleteHelper();
//		key.getUserIDs()
//		key.getPrimaryUser()
	}

	view() {
		showScreenPopup(OpenPgpKeyPopupView, [this]);
	}

	remove() {
		if (this.askDelete()) {
			if (this.key.isPrivate()) {
				OpenPGPUserStore.privateKeys.remove(this);
				storeOpenPgpKeys(OpenPGPUserStore.privateKeys, privateKeysItem);
			} else {
				OpenPGPUserStore.publicKeys.remove(this);
				storeOpenPgpKeys(OpenPGPUserStore.publicKeys, publicKeysItem);
			}
			delegateRunOnDestroy(this);
		}
	}
/*
	toJSON() {
		return this.armor;
	}
*/
}

export const OpenPGPUserStore = new class {
	constructor() {
		this.publicKeys = ko.observableArray();
		this.privateKeys = ko.observableArray();
	}

	loadKeyrings() {
		loadOpenPgpKeys(publicKeysItem).then(keys => {
			this.publicKeys(keys || []);
			console.log('openpgp.js public keys loaded');
		});
		loadOpenPgpKeys(privateKeysItem).then(keys => {
			this.privateKeys(keys || [])
			console.log('openpgp.js private keys loaded');
		});
	}

	/**
	 * @returns {boolean}
	 */
	isSupported() {
		return !!window.openpgp;
	}

	importKey(armoredKey) {
		openpgp.readKey({armoredKey:armoredKey}).then(key => {
			if (!key.err) {
				if (key.isPrivate()) {
					this.privateKeys.push(new OpenPgpKeyModel(armoredKey, key));
					storeOpenPgpKeys(this.privateKeys, privateKeysItem);
				} else {
					this.publicKeys.push(new OpenPgpKeyModel(armoredKey, key));
					storeOpenPgpKeys(this.publicKeys, publicKeysItem);
				}
			}
		});
	}

	/**
		keyPair.privateKey
		keyPair.publicKey
		keyPair.revocationCertificate
	 */
	storeKeyPair(keyPair) {
		openpgp.readKey({armoredKey:keyPair.publicKey}).then(key => {
			this.publicKeys.push(new OpenPgpKeyModel(keyPair.publicKey, key));
			storeOpenPgpKeys(this.publicKeys, publicKeysItem);
		});
		openpgp.readKey({armoredKey:keyPair.privateKey}).then(key => {
			this.privateKeys.push(new OpenPgpKeyModel(keyPair.privateKey, key));
			storeOpenPgpKeys(this.privateKeys, privateKeysItem);
		});
	}

	/**
	 * Checks if verifying/encrypting a message is possible with given email addresses.
	 */
	hasPublicKeyForEmails(recipients, all) {
		const count = recipients.length,
			length = count ? recipients.filter(email =>
				this.publicKeys().find(key => key.emails.includes(email))
			).length : 0;
		return length && (!all || length === count);
	}

	getPrivateKeyFor(query/*, sign*/) {
		return findOpenPGPKey(this.privateKeys, query/*, sign*/);
	}

	getPublicKeyFor(query/*, sign*/) {
		return findOpenPGPKey(this.publicKeys, query/*, sign*/);
	}

	/**
	 * https://docs.openpgpjs.org/#encrypt-and-decrypt-string-data-with-pgp-keys
	 */
	async decrypt(armoredText, privateKey, publicKey)
	{
		const passphrase = prompt('Passphrase');
		if (!passphrase) {
			return;
		}
		const message = await openpgp.readMessage({ armoredMessage: armoredText });
		const decryptedKey = await openpgp.decryptKey({
//			privateKey: await openpgp.readPrivateKey({ armoredKey: armoredPrivateKey }),
			privateKey: privateKey,
			passphrase
		});
		return await openpgp.decrypt({
			message,
			verificationKeys: publicKey,
//			expectSigned: true,
//			signature: '', // Detached signature
			decryptionKeys: decryptedKey
		});
	}

	async verify(message, detachedSignature, publicKey) {
		return await openpgp.verify({
			message,
			verificationKeys: publicKey,
//			expectSigned: true, // !!detachedSignature
			signature: detachedSignature
		});
	}

};
