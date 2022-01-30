/**
 * OpenPGP.js
 */

import ko from 'ko';

import { isArray, arrayLength } from 'Common/Utils';
import { delegateRunOnDestroy } from 'Common/UtilsUser';

import { showScreenPopup } from 'Knoin/Knoin';
import { OpenPgpKeyPopupView } from 'View/Popup/OpenPgpKey';

const
	findKeyByHex = (keys, hash) =>
		keys.find(item => item && (hash === item.id || item.ids.includes(hash))),

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
		keyPair.onServer
		keyPair.inGnuPG
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

/*
	decryptMessage(message, recipients, fCallback) {
		message = store.openpgp.message.readArmored(armoredMessage);
		try {
			message = store.openpgp.message.readArmored(armoredMessage);
		} catch (e) {
			log(e);
		}
		if (message && message.getText && message.verify && message.decrypt) {
		if (message && message.getEncryptionKeyIds) {
			// findPrivateKeysByEncryptionKeyIds
			const encryptionKeyIds = message.getEncryptionKeyIds();
			let privateKeys = isArray(encryptionKeyIds)
				? encryptionKeyIds.map(id => {
						// openpgpKeyring.publicKeys.getForId(id.toHex())
						// openpgpKeyring.privateKeys.getForId(id.toHex())
						const key = id && id.toHex ? findKeyByHex(this.privateKeys, id.toHex()) : null;
						return key ? [key] : [null];
					}).flat().filter(v => v)
				: [];
			if (!privateKeys.length && arrayLength(recipients)) {
				privateKeys = recipients.map(sEmail =>
					(sEmail
						? this.privateKeys.filter(item => item && item.emails.includes(sEmail)) : 0)
						|| [null]
				).flat().validUnique(key => key.id);
			}

			if (privateKeys && privateKeys.length) {
				showScreenPopup(OpenPgpSelectorPopupView, [
					(decryptedKey) => {
						if (decryptedKey) {
							message.decrypt(decryptedKey).then(
								(decryptedMessage) => {
									let privateKey = null;
									if (decryptedMessage) {
										privateKey = findKeyByHex(this.privateKeys, decryptedKey.primaryKey.keyid.toHex());
										if (privateKey) {
											this.verifyMessage(decryptedMessage, (oValidKey, aSigningKeyIds) => {
												fCallback(privateKey, decryptedMessage, oValidKey || null, aSigningKeyIds || null);
											});
										} else {
											fCallback(privateKey, decryptedMessage);
										}
									} else {
										fCallback(privateKey, decryptedMessage);
									}
								},
								() => {
									fCallback(null, null);
								}
							);
						} else {
							fCallback(null, null);
						}
					},
					privateKeys
				]);

				return false;
			}
		}

		fCallback(null, null);

		return false;
	}
*/

	verifyMessage(message, fCallback) {
		if (message && message.getSigningKeyIds) {
			const signingKeyIds = message.getSigningKeyIds();
			if (signingKeyIds && signingKeyIds.length) {
				// findPublicKeysBySigningKeyIds
				const publicKeys = signingKeyIds.map(id => {
					const key = id && id.toHex ? findKeyByHex(this.publicKeys, id.toHex()) : null;
					return key ? key.key : [null];
				}).flat().filter(v => v);
				if (publicKeys && publicKeys.length) {
					try {
						const result = message.verify(publicKeys),
							valid = (isArray(result) ? result : []).find(item => item && item.valid && item.keyid);

						if (valid && valid.keyid && valid.keyid && valid.keyid.toHex) {
							fCallback(findKeyByHex(this.publicKeys, valid.keyid.toHex()));
							return true;
						}
					} catch (e) {
						console.log(e);
					}
				}

				fCallback(null, signingKeyIds);
				return false;
			}
		}

		fCallback(null);
		return false;
	}

};
