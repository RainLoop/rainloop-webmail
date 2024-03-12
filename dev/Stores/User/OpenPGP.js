/**
 * OpenPGP.js
 */

import ko from 'ko';

import { arrayLength } from 'Common/Utils';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';
import { OpenPgpKeyPopupView } from 'View/Popup/OpenPgpKey';

import { Passphrases } from 'Storage/Passphrases';

const
	findOpenPGPKey = (keys, query/*, sign*/) =>
		keys.find(key =>
			key.for(query) || query == key.id || query == key.fingerprint
		),

	decryptKey = async (privateKey, btnTxt = 'SIGN') => {
		if (privateKey.key.isDecrypted()) {
			return privateKey.key;
		}
		const key = privateKey.id,
			pass = await Passphrases.ask(privateKey,
				'OpenPGP.js key<br>' + key + ' ' + privateKey.emails[0],
				'CRYPTO/'+btnTxt
			);
		if (pass) {
			const passphrase = pass.password,
				result = await openpgp.decryptKey({
					privateKey: privateKey.key,
					passphrase
				});
			result && pass.remember && Passphrases.set(privateKey, passphrase);
			return result;
		}
	},

	collator = new Intl.Collator(undefined, {sensitivity: 'base'}),
	sort = keys => keys.sort(
//		(a, b) => collator.compare(a.emails[0], b.emails[0]) || collator.compare(a.fingerprint, b.fingerprint)
		(a, b) => collator.compare(a.emails[0], b.emails[0]) || collator.compare(a.id, b.id)
	),
	dedup = keys => sort((keys || [])
		.filter((v, i, a) => a.findIndex(entry => entry.fingerprint == v.fingerprint) === i)
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
		while (i--) try {
			key = await openpgp.readKey({armoredKey:armoredKeys[i]});
			key.err || keys.push(new OpenPgpKeyModel(armoredKeys[i], key));
		} catch (e) {
			console.error(e);
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
		this.id = key.getKeyID().toHex().toUpperCase();
		this.fingerprint = key.getFingerprint();
		this.can_encrypt = !!key.getEncryptionKey();
		this.can_sign = !!key.getSigningKey();
		this.emails = key.users.map(user => IDN.toASCII(user.userID.email)).filter(email => email);
		this.armor = armor;
		this.askDelete = ko.observable(false);
		this.openForDeletion = ko.observable(null).askDeleteHelper();
//		key.getUserIDs()
//		key.getPrimaryUser()
	}

/*
	get id() { return this.key.getKeyID().toHex().toUpperCase(); }
	get fingerprint() { return this.key.getFingerprint(); }
	get can_encrypt() { return !!this.key.getEncryptionKey(); }
	get can_sign() { return !!this.key.getSigningKey(); }
	get emails() { return this.key.users.map(user => IDN.toASCII(user.userID.email)).filter(email => email); }
	get armor() { return this.key.armor(); }
*/
	for(email) {
		return this.emails.includes(IDN.toASCII(email));
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
		if (window.openpgp) {
			loadOpenPgpKeys(publicKeysItem).then(keys => {
				this.publicKeys(dedup(keys));
				console.log('openpgp.js public keys loaded');
			});
			loadOpenPgpKeys(privateKeysItem).then(keys => {
				this.privateKeys(dedup(keys));
				console.log('openpgp.js private keys loaded');
			});
		}
	}

	/**
	 * @returns {boolean}
	 */
	isSupported() {
		return !!window.openpgp;
	}

	importKey(armoredKey) {
		this.importKeys([armoredKey]);
	}

	async importKeys(keys) {
		if (window.openpgp) {
			const privateKeys = this.privateKeys(),
				publicKeys = this.publicKeys();
			for (const armoredKey of keys) try {
				let key = await openpgp.readKey({armoredKey:armoredKey});
				if (!key.err) {
					key = new OpenPgpKeyModel(armoredKey, key);
					const keys = key.key.isPrivate() ? privateKeys : publicKeys;
					keys.find(entry => entry.fingerprint == key.fingerprint)
					|| keys.push(key);
				}
			} catch (e) {
				console.error(e, armoredKey);
			}
			this.privateKeys(sort(privateKeys));
			this.publicKeys(sort(publicKeys));
			storeOpenPgpKeys(privateKeys, privateKeysItem);
			storeOpenPgpKeys(publicKeys, publicKeysItem);
		}
	}

	/**
		keyPair.privateKey
		keyPair.publicKey
		keyPair.revocationCertificate
	 */
	storeKeyPair(keyPair) {
		if (window.openpgp) {
			openpgp.readKey({armoredKey:keyPair.publicKey}).then(key => {
				this.publicKeys.push(new OpenPgpKeyModel(keyPair.publicKey, key));
				storeOpenPgpKeys(this.publicKeys, publicKeysItem);
			});
			openpgp.readKey({armoredKey:keyPair.privateKey}).then(key => {
				this.privateKeys.push(new OpenPgpKeyModel(keyPair.privateKey, key));
				storeOpenPgpKeys(this.privateKeys, privateKeysItem);
			});
		}
	}

	/**
	 * Checks if verifying/encrypting a message is possible with given email addresses.
	 */
	hasPublicKeyForEmails(recipients) {
		const count = recipients.length,
			length = count ? recipients.filter(email =>
				this.publicKeys().find(key => key.for(email))
			).length : 0;
		return length && length === count;
	}

	getPrivateKeyFor(query/*, sign*/) {
		return findOpenPGPKey(this.privateKeys, query/*, sign*/);
	}

	/**
	 * https://docs.openpgpjs.org/#encrypt-and-decrypt-string-data-with-pgp-keys
	 */
	async decrypt(armoredText, sender)
	{
		const message = await openpgp.readMessage({ armoredMessage: armoredText }),
			privateKeys = this.privateKeys(),
			msgEncryptionKeyIDs = message.getEncryptionKeyIDs().map(key => key.bytes);
		// Find private key that can decrypt message
		let i = privateKeys.length, privateKey;
		while (i--) {
			if ((await privateKeys[i].key.getDecryptionKeys()).find(
				key => msgEncryptionKeyIDs.includes(key.getKeyID().bytes)
			)) {
				privateKey = privateKeys[i];
				break;
			}
		}
		if (privateKey) try {
			const decryptedKey = await decryptKey(privateKey, 'DECRYPT');
			if (decryptedKey) {
				const publicKey = findOpenPGPKey(this.publicKeys, sender/*, sign*/);
				return await openpgp.decrypt({
					message,
					verificationKeys: publicKey?.key,
//					expectSigned: true,
//					signature: '', // Detached signature
					decryptionKeys: decryptedKey
				});
			}
		} catch (err) {
			alert(err);
			console.error(err);
		}
	}

	/**
	 * https://docs.openpgpjs.org/#sign-and-verify-cleartext-messages
	 */
	async verify(message) {
		const data = message.pgpSigned(), // { partId: "1", sigPartId: "2", micAlg: "pgp-sha256" }
			publicKey = this.publicKeys().find(key => key.for(message.from[0].email));
		if (data && publicKey) {
			data.folder = message.folder;
			data.uid = message.uid;
			data.tryGnuPG = 0;
			let response;
			if (data.sigPartId) {
				response = await Remote.post('PgpVerifyMessage', null, data);
			} else if (data.bodyPart) {
				// MimePart
				response = { Result: { text: data.bodyPart.raw, signature: data.sigPart.body } };
			} else {
				response = { Result: { text: message.plain(), signature: null } };
			}
			if (response) {
				const signature = response.Result.signature
					? await openpgp.readSignature({ armoredSignature: response.Result.signature })
					: null;
				const signedMessage = signature
					? await openpgp.createMessage({ text: response.Result.text })
					: await openpgp.readCleartextMessage({ cleartextMessage: response.Result.text });
//				(signature||signedMessage).getSigningKeyIDs();
				let result = await openpgp.verify({
					message: signedMessage,
					verificationKeys: publicKey.key,
//					expectSigned: true, // !!detachedSignature
					signature: signature
				});
				return {
					fingerprint: publicKey.fingerprint,
					success: result && !!result.signatures.length
				};
			}
		}
	}

	/**
	 * https://docs.openpgpjs.org/global.html#sign
	 */
	async sign(text, privateKey, detached) {
		const signingKey = await decryptKey(privateKey);
		if (signingKey) {
			const message = detached
				? await openpgp.createMessage({ text: text })
				: await openpgp.createCleartextMessage({ text: text });
			return await openpgp.sign({
				message: message,
				signingKeys: signingKey,
				detached: !!detached
			});
		}
		throw 'Sign cancelled';
	}

	/**
	 * https://docs.openpgpjs.org/global.html#encrypt
	 */
	async encrypt(text, recipients, signPrivateKey) {
		const count = recipients.length;
		recipients = recipients.map(email => this.publicKeys().find(key => key.for(email))).filter(key => key);
		if (count === recipients.length) {
			if (signPrivateKey) {
				signPrivateKey = await decryptKey(signPrivateKey);
				if (!signPrivateKey) {
					return;
				}
			}
			return await openpgp.encrypt({
				message: await openpgp.createMessage({ text: text }),
				encryptionKeys: recipients.map(pkey => pkey.key),
				signingKeys: signPrivateKey
//				signature
			});
		}
		throw 'Encrypt failed';
	}

};
