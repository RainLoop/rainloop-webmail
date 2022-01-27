import ko from 'ko';

import { Capa } from 'Common/Enums';
import { doc, createElement, Settings } from 'Common/Globals';
import { staticLink } from 'Common/Links';
import { isArray, arrayLength } from 'Common/Utils';
import { delegateRunOnDestroy } from 'Common/UtilsUser';

//import { showScreenPopup } from 'Knoin/Knoin';

//import { MessageOpenPgpPopupView } from 'View/Popup/MessageOpenPgp';

//import { EmailModel } from 'Model/Email';
//import { OpenPgpKeyModel } from 'Model/OpenPgpKey';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';
import { ViewOpenPgpKeyPopupView } from 'View/Popup/ViewOpenPgpKey';

const
	findKeyByHex = (keys, hash) =>
		keys.find(item => item && (hash === item.id || item.ids.includes(hash)));

/**
 * OpenPGP.js v5 removed the localStorage (keyring)
 * This should be compatible with the old OpenPGP.js v2
 */
const
	publicKeysItem = 'openpgp-public-keys',
	privateKeysItem = 'openpgp-private-keys',
	storage = window.localStorage,
	loadOpenPgpKeys = async itemname => {
		let keys = [], key,
			armoredKeys = JSON.parse(storage.getItem(itemname)),
			i = arrayLength(armoredKeys);
		if (i) {
			while (i--) {
				key = await openpgp.readKey({armoredKey:armoredKeys[i]});
				if (!key.err) {
					keys.push(new OpenPgpKeyModel(armoredKeys[i], key));
				}
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
			key.users.forEach(user => {
				if (user.userID.email) {
					aEmails.push(user.userID.email);
				}
			});
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
		showScreenPopup(ViewOpenPgpKeyPopupView, [this]);
	}

	remove() {
		if (this.askDelete()) {
			if (this.key.isPrivate()) {
				PgpUserStore.openpgpPrivateKeys.remove(this);
				storeOpenPgpKeys(PgpUserStore.openpgpPrivateKeys, privateKeysItem);
			} else {
				PgpUserStore.openpgpPublicKeys.remove(this);
				storeOpenPgpKeys(PgpUserStore.openpgpPublicKeys, publicKeysItem);
			}
			delegateRunOnDestroy(this);
		}
	}
}

export const PgpUserStore = new class {
	constructor() {
		/**
		 * PECL gnupg / PEAR Crypt_GPG
		 * [ {email, can_encrypt, can_sign}, ... ]
		 */
		this.gnupgKeyring;
		this.gnupgKeys = ko.observableArray();

		// OpenPGP.js
		this.openpgpPublicKeys = ko.observableArray();
		this.openpgpPrivateKeys = ko.observableArray();

		// https://mailvelope.github.io/mailvelope/Keyring.html
		this.mailvelopeKeyring = null;
	}

	init() {
		if (Settings.capa(Capa.OpenPGP) && window.crypto && crypto.getRandomValues) {
			const script = createElement('script', {src:staticLink('js/min/openpgp.min.js')});
			script.onload = () => this.loadKeyrings();
			script.onerror = () => {
				this.loadKeyrings();
				console.error(script.src);
			};
			doc.head.append(script);
		} else {
			this.loadKeyrings();
		}
	}

	loadKeyrings(identifier) {
		if (window.mailvelope) {
			var fn = keyring => {
				this.mailvelopeKeyring = keyring;
				console.log('mailvelope ready');
			};
			mailvelope.getKeyring().then(fn, err => {
				if (identifier) {
					// attempt to create a new keyring for this app/user
					mailvelope.createKeyring(identifier).then(fn, err => console.error(err));
				} else {
					console.error(err);
				}
			});
			addEventListener('mailvelope-disconnect', event => {
				alert('Mailvelope is updated to version ' + event.detail.version + '. Reload page');
			}, false);
		} else {
			addEventListener('mailvelope', () => this.loadKeyrings(identifier));
		}

		if (openpgp) {
			loadOpenPgpKeys(publicKeysItem).then(keys => {
				this.openpgpPublicKeys(keys || []);
				console.log('openpgp.js public keys loaded');
			});
			loadOpenPgpKeys(privateKeysItem).then(keys => {
				this.openpgpPrivateKeys(keys || [])
				console.log('openpgp.js private keys loaded');
			});
		}

		if (Settings.capa(Capa.GnuPG)) {
			this.gnupgKeyring = null;
			this.gnupgKeys([]);
			Remote.request('GnupgGetKeys',
				(iError, oData) => {
					if (oData && oData.Result) {
						this.gnupgKeyring = oData.Result;
						this.gnupgKeys(Object.values(oData.Result));
						console.log('gnupg ready');
					}
				}
			);
		}
	}

	/**
	 * @returns {boolean}
	 */
	isSupported() {
		return !!(window.openpgp || window.mailvelope || Settings.capa(Capa.GnuPG));
	}

	gnupgImportKey(key, callback) {
		if (Settings.capa(Capa.GnuPG)) {
			Remote.request('GnupgImportKey',
				(iError, oData) => {
					if (oData && oData.Result) {
//						this.gnupgKeyring = oData.Result;
					}
					callback && callback(iError, oData);
				}, {
					Key: key
				}
			);
		}
	}

	/**
		keyPair.privateKey
		keyPair.publicKey
		keyPair.revocationCertificate
		keyPair.onServer
		keyPair.inGnuPG
		keyPair.uid.name
		keyPair.uid.email
	 */
	storeKeyPair(keyPair, callback) {
//		if (Settings.capa(Capa.GnuPG)) {
		Remote.request('PgpStoreKeyPair',
			(iError, oData) => {
				if (oData && oData.Result) {
//					this.gnupgKeyring = oData.Result;
				}
				callback && callback(iError, oData);
			}, keyPair
		);
//		storeKeys(publicKeysItem);
//		storeKeys(privateKeysItem);

		openpgp.readKey({armoredKey:keyPair.publicKey}).then(key => {
			PgpUserStore.openpgpPublicKeys.push(new OpenPgpKeyModel(keyPair.publicKey, key));
			storeOpenPgpKeys(PgpUserStore.openpgpPublicKeys, publicKeysItem);
		});
		openpgp.readKey({armoredKey:keyPair.privateKey}).then(key => {
			PgpUserStore.openpgpPrivateKeys.push(new OpenPgpKeyModel(keyPair.privateKey, key));
			storeOpenPgpKeys(PgpUserStore.openpgpPrivateKeys, privateKeysItem);
		});
	}

	/**
	 * Checks if verifying/encrypting a message is possible with given email addresses.
	 * Returns the first library that can.
	 */
	async hasPublicKeyForEmails(recipients, all) {
		const count = recipients.length;
		if (count) {
			let length = this.gnupgKeyring && recipients.filter(email =>
				this.gnupgKeyring[email] && this.gnupgKeyring[email].can_encrypt).length;
			if (length && (!all || length === count)) {
				return 'gnupg';
			}

			length = recipients.filter(email =>
				this.openpgpPublicKeys().find(key => key.emails.includes(email))
			).length;
			if (openpgp && (!all || openpgp === count)) {
				return 'openpgp';
			}

			let mailvelope = this.mailvelopeKeyring && await this.mailvelopeKeyring.validKeyForAddress(recipients)
				/*.then(LookupResult => Object.entries(LookupResult))*/;
			mailvelope = Object.entries(mailvelope);
			if (mailvelope && mailvelope.length
				&& (all ? (mailvelope.filter(([, value]) => value).length === count) : mailvelope.find(([, value]) => value))
			) {
				return 'mailvelope';
			}
		}
		return false;
	}

	getGnuPGPrivateKeyFor(email, sign) {
		let key = this.gnupgKeyring && this.gnupgKeyring[email];
		if (key && key[sign?'can_sign':'can_decrypt']) {
			return ['gnupg', key];
		}
	}

	getOpenPGPPrivateKeyFor(email/*, sign*/) {
		let key = this.openpgpPrivateKeys().find(key => key.emails.includes(email));
		if (key && key.length) {
			return ['openpgp', key[0]];
		}
	}

	getOpenPGPPublicKeyFor(email/*, sign*/) {
		return this.gnupgKeyring && this.openpgpKeyring.publicKeys.getForAddress(email);
	}

	/**
	 * Checks if signing a message is possible with given email address.
	 * Returns the first library that can.
	 */
	async getMailvelopePrivateKeyFor(email/*, sign*/) {
		let keyring = this.mailvelopeKeyring;
		if (keyring) {
			/**
			 * Mailvelope can't find by email, so we must get the fingerprint and use that instead
			 */
			let keys = await keyring.validKeyForAddress([email]);
			if (keys && keys[email] && await keyring.hasPrivateKey(keys[email].keys[0].fingerprint)) {
				return ['mailvelope', keys[email].keys[0].fingerprint];
			}
		}

		return false;
	}

	/**
	 * Checks if signing a message is possible with given email address.
	 * Returns the first library that can.
	 */
	async getKeyForSigning(email) {
		return this.getGnuPGPrivateKeyFor(email, 1)
			|| this.getOpenPGPPrivateKeyFor(email, 1)
			|| await this.getMailvelopePrivateKeyFor(email, 1);
	}

	/**
	 * Checks if decrypting a message is possible with given email address.
	 * Returns the first library that can.
	 */
	async getKeyForDecrypting(email) {
		return await this.getMailvelopePrivateKeyFor(email)
			|| this.getGnuPGPrivateKeyFor(email)
			|| this.getOpenPGPPrivateKeyFor(email);
	}

	/**
	 * OpenPGP.js
	 */

/*
	decryptMessage(message, recipients, fCallback) {
		if (message && message.getEncryptionKeyIds) {
			// findPrivateKeysByEncryptionKeyIds
			const encryptionKeyIds = message.getEncryptionKeyIds();
			let privateKeys = isArray(encryptionKeyIds)
				? encryptionKeyIds.map(id => {
						// openpgpKeyring.publicKeys.getForId(id.toHex())
						// openpgpKeyring.privateKeys.getForId(id.toHex())
						const key = id && id.toHex ? findKeyByHex(this.openpgpPrivateKeys, id.toHex()) : null;
						return key ? [key] : [null];
					}).flat().filter(v => v)
				: [];
			if (!privateKeys.length && arrayLength(recipients)) {
				privateKeys = recipients.map(sEmail =>
					(sEmail
						? this.openpgpPrivateKeys.filter(item => item && item.emails.includes(sEmail)) : 0)
						|| [null]
				).flat().validUnique(key => key.id);
			}

			if (privateKeys && privateKeys.length) {
				showScreenPopup(MessageOpenPgpPopupView, [
					(decryptedKey) => {
						if (decryptedKey) {
							message.decrypt(decryptedKey).then(
								(decryptedMessage) => {
									let privateKey = null;
									if (decryptedMessage) {
										privateKey = findKeyByHex(this.openpgpPrivateKeys, decryptedKey.primaryKey.keyid.toHex());
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
					const key = id && id.toHex ? findKeyByHex(this.openpgpPublicKeys, id.toHex()) : null;
					return key ? key.key : [null];
				}).flat().filter(v => v);
				if (publicKeys && publicKeys.length) {
					try {
						const result = message.verify(publicKeys),
							valid = (isArray(result) ? result : []).find(item => item && item.valid && item.keyid);

						if (valid && valid.keyid && valid.keyid && valid.keyid.toHex) {
							fCallback(findKeyByHex(this.openpgpPublicKeys, valid.keyid.toHex()));
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

	/**
	 * Creates an iframe with an editor for a new encrypted mail.
	 * The iframe will be injected into the container identified by selector.
	 * https://mailvelope.github.io/mailvelope/Editor.html
	 */
/*
	mailvelope.createEditorContainer(selector, this.mailvelopeKeyring, {
		quota: 20480, // mail content (text + attachments) limit in kilobytes (default: 20480)
		signMsg: false, // if true then the mail will be signed (default: false)
		armoredDraft: '', // Ascii Armored PGP Text Block
				a PGP message, signed and encrypted with the default key of the user, will be used to restore a draft in the editor
				The armoredDraft parameter can't be combined with the parameters: predefinedText, quotedMail... parameters, keepAttachments
		predefinedText: '', // text that will be added to the editor
		quotedMail: '', // Ascii Armored PGP Text Block mail that should be quoted
		quotedMailIndent: true, // if true the quoted mail will be indented (default: true)
		quotedMailHeader: '', // header to be added before the quoted mail
		keepAttachments: false, // add attachments of quotedMail to editor (default: false)
	}).then(editor => {
		editor.editorId;
	}, error_handler)
*/

	/**
	 * Returns headers that should be added to an outgoing email.
	 * So far this is only the autocrypt header.
	 */
/*
	this.mailvelopeKeyring.additionalHeadersForOutgoingEmail(headers)
*/

/*
	this.mailvelopeKeyring.addSyncHandler(syncHandlerObj)
*/
/*
	this.mailvelopeKeyring.createKeyGenContainer(selector, {
//		userIds: [],
		keySize: 4096
	})
*/

/*
	exportOwnPublicKey(emailAddr).then(<AsciiArmored, Error>)

	this.mailvelopeKeyring.hasPrivateKey(fingerprint)

	this.mailvelopeKeyring.importPublicKey(armored)
*/

};
