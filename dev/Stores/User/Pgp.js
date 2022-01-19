import ko from 'ko';

import { Capa } from 'Common/Enums';
import { doc, createElement, Settings } from 'Common/Globals';
import { openPgpJs, openPgpWorkerJs } from 'Common/Links';
import { isArray, arrayLength, pString, addComputablesTo } from 'Common/Utils';
import { delegateRunOnDestroy } from 'Common/UtilsUser';

import { showScreenPopup } from 'Knoin/Knoin';

import { MessageOpenPgpPopupView } from 'View/Popup/MessageOpenPgp';

import { EmailModel } from 'Model/Email';
import { OpenPgpKeyModel } from 'Model/OpenPgpKey';

import Remote from 'Remote/User/Fetch';

const
	findKeyByHex = (keys, hash, isPrivate) =>
		keys.find(item => item && isPrivate == item.isPrivate && (hash === item.id || item.ids.includes(hash))),
	findAllKeysByEmail = (keys, email, isPrivate) =>
		keys.filter(item => item && isPrivate == item.isPrivate && item.emails.includes(email));

export const PgpUserStore = new class {
	constructor() {
		// PECL gnupg / PEAR Crypt_GPG
		this.gnupgkeys;

		// OpenPGP.js
		this.openpgpkeys = ko.observableArray();
		this.openpgpKeyring = null;

		// https://mailvelope.github.io/mailvelope/Keyring.html
		this.mailvelopeKeyring = null;

		addComputablesTo(this, {
			openpgpkeysPublic: () => this.openpgpkeys.filter(item => item && !item.isPrivate),
			openpgpkeysPrivate: () => this.openpgpkeys.filter(item => item && item.isPrivate)
		});
	}

	init() {
		if (Settings.capa(Capa.OpenPGP) && window.crypto && crypto.getRandomValues) {
			const script = createElement('script', {src:openPgpJs()});
			script.onload = () => {
				if (window.Worker) {
					try {
						openpgp.initWorker({ path: openPgpWorkerJs() });
					} catch (e) {
						console.error(e);
					}
				}
				this.loadKeyrings();
			};
			script.onerror = () => {
				this.loadKeyrings();
				console.error(script.src);
			}
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
			this.openpgpKeyring = new openpgp.Keyring();
			this.reloadOpenPgpKeys();
		}

		if (Settings.capa(Capa.GnuPGP)) {
			this.gnupgkeys = [];
			Remote.request('GnupgGetKeysEmails',
				(iError, oData) => {
					if (oData.Result) {
						this.gnupgkeys = oData.Result;
						console.log('gnupg ready');
					}
				}
			);
		}
	}

	reloadOpenPgpKeys() {
		if (this.openpgpKeyring) {
			const keys = [],
				email = new EmailModel();

			this.openpgpKeyring.getAllKeys().forEach((oItem, iIndex) => {
				if (oItem && oItem.primaryKey) {
					const aEmails = [],
						aUsers = [],
						primaryUser = oItem.getPrimaryUser(),
						user =
							primaryUser && primaryUser.user
								? primaryUser.user.userId.userid
								: oItem.users && oItem.users[0]
								? oItem.users[0].userId.userid
								: '';

					if (oItem.users) {
						oItem.users.forEach(item => {
							if (item.userId) {
								email.clear();
								email.parse(item.userId.userid);
								if (email.validate()) {
									aEmails.push(email.email);
									aUsers.push(item.userId.userid);
								}
							}
						});
					}

					if (aEmails.length) {
						keys.push(
							new OpenPgpKeyModel(
								iIndex,
								oItem.primaryKey.getFingerprint(),
								oItem.primaryKey
									.getKeyId()
									.toHex()
									.toLowerCase(),
								oItem.getKeyIds()
									.map(item => (item && item.toHex ? item.toHex() : null))
									.validUnique(),
								aUsers,
								aEmails,
								oItem.isPrivate(),
								oItem.armor(),
								user
							)
						);
					}
				}
			});

			delegateRunOnDestroy(this.openpgpkeys());
			this.openpgpkeys(keys);
			console.log('openpgp.js ready');
		}
	}

	/**
	 * @returns {boolean}
	 */
	isSupported() {
		return !!(window.openpgp || window.mailvelope);
	}

	findPublicKeyByHex(hash) {
		return findKeyByHex(this.openpgpkeys, hash, 0);
	}

	findPrivateKeyByHex(hash) {
		return findKeyByHex(this.openpgpkeys, hash, 1);
	}

	findPublicKeysByEmail(email) {
		return this.openpgpkeysPublic().map(item => {
			const key = item && item.emails.includes(email) ? item : null;
			return key ? key.getNativeKeys() : [null];
		}).flat().filter(v => v);
	}

	findPublicKeysBySigningKeyIds(signingKeyIds) {
		return signingKeyIds.map(id => {
			const key = id && id.toHex ? this.findPublicKeyByHex(id.toHex()) : null;
			return key ? key.getNativeKeys() : [null];
		}).flat().filter(v => v);
	}

	findPrivateKeysByEncryptionKeyIds(encryptionKeyIds, recipients, returnWrapKeys) {
		let result = isArray(encryptionKeyIds)
			? encryptionKeyIds.map(id => {
					const key = id && id.toHex ? this.findPrivateKeyByHex(id.toHex()) : null;
					return key ? (returnWrapKeys ? [key] : key.getNativeKeys()) : [null];
				}).flat().filter(v => v)
			: [];

		if (!result.length && arrayLength(recipients)) {
			result = recipients.map(sEmail => {
				const keys = sEmail ? this.findAllPrivateKeysByEmailNotNative(sEmail) : null;
				return keys
					? returnWrapKeys
						? keys
						: keys.map(key => key.getNativeKeys()).flat()
					: [null];
			}).flat().validUnique(key => key.id);
		}

		return result;
	}

	/**
	 * Checks if verifying/encrypting a message is possible with given email addresses.
	 * Returns the first library that can.
	 */
	async hasPublicKeyForEmails(recipients, all) {
		const
			count = recipients.length,
			openpgp = count && this.openpgpkeys && recipients.filter(email =>
				this.openpgpkeys.find(item => item && !item.isPrivate && item.emails.includes(email))
			);

		if (this.gnupgkeys) {
			let length = recipients.filter(email => this.gnupgkeys[email] && this.gnupgkeys[email].can_encrypt).length;
			if (length && (!all || length === count)) {
				return 'gnupg';
			}
		}

		if (openpgp && openpgp.length && (!all || openpgp.length === count)) {
			return 'openpgp';
		}

		let mailvelope = count && this.mailvelopeKeyring && await this.mailvelopeKeyring.validKeyForAddress(recipients)
			/*.then(LookupResult => Object.entries(LookupResult))*/;
		mailvelope = Object.entries(mailvelope);
		if (mailvelope && mailvelope.length
			&& (all ? (mailvelope.filter(([, value]) => value).length === count) : mailvelope.find(([, value]) => value))
		) {
			return 'mailvelope';
		}

		return false;
	}

	/**
	 * Checks if signing/decrypting a message is possible with given email address.
	 * Returns the first library that can.
	 */
	async hasPrivateKeyForEmail(email) {
		if (this.gnupgkeys && this.gnupgkeys[email] && this.gnupgkeys[email].can_sign) {
			return 'gnupg';
		}

		if (this.openpgpkeys && this.openpgpkeys.find(item => item && item.isPrivate && item.emails.includes(email))) {
			return 'openpgp';
		}

		let keyring = this.mailvelopeKeyring;
		if (keyring) {
			/**
			 * Mailvelope can't find by email, so we must get the fingerprint and use that instead
			 */
			let keys = await keyring.validKeyForAddress([email]);
			if (keys && keys[email] && await keyring.hasPrivateKey(keys[email].keys[0].fingerprint)) {
				return 'mailvelope';
			}
		}

		return false;
	}

	/**
	 * @param {string} email
	 * @returns {?}
	 */
	findAllPublicKeysByEmailNotNative(email) {
		return findAllKeysByEmail(this.openpgpkeys, email, 0);
	}

	/**
	 * @param {string} email
	 * @returns {?}
	 */
	findAllPrivateKeysByEmailNotNative(email) {
		return findAllKeysByEmail(this.openpgpkeys, email, 1);
	}

	/**
	 * @param {string} email
	 * @param {string=} password
	 * @returns {?}
	 */
	findPrivateKeyByEmail(email, password) {
		let privateKey = null;
		const key = this.openpgpkeys.find(item => item && item.isPrivate && item.emails.includes(email));

		if (key) {
			try {
				privateKey = key.getNativeKeys()[0] || null;
				if (privateKey) {
					privateKey.decrypt(pString(password));
				}
			} catch (e) {
				privateKey = null;
			}
		}

		return privateKey;
	}

	decryptMessage(message, recipients, fCallback) {
		if (message && message.getEncryptionKeyIds) {
			const privateKeys = this.findPrivateKeysByEncryptionKeyIds(message.getEncryptionKeyIds(), recipients, true);
			if (privateKeys && privateKeys.length) {
				showScreenPopup(MessageOpenPgpPopupView, [
					(decryptedKey) => {
						if (decryptedKey) {
							message.decrypt(decryptedKey).then(
								(decryptedMessage) => {
									let privateKey = null;
									if (decryptedMessage) {
										privateKey = this.findPrivateKeyByHex(decryptedKey.primaryKey.keyid.toHex());
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

	verifyMessage(message, fCallback) {
		if (message && message.getSigningKeyIds) {
			const signingKeyIds = message.getSigningKeyIds();
			if (signingKeyIds && signingKeyIds.length) {
				const publicKeys = this.findPublicKeysBySigningKeyIds(signingKeyIds);
				if (publicKeys && publicKeys.length) {
					try {
						const result = message.verify(publicKeys),
							valid = (isArray(result) ? result : []).find(item => item && item.valid && item.keyid);

						if (valid && valid.keyid && valid.keyid && valid.keyid.toHex) {
							fCallback(this.findPublicKeyByHex(valid.keyid.toHex()));
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
	 * Creates an iframe to display the decrypted content of the encrypted mail.
	 * The iframe will be injected into the container identified by selector.
	 */
/*
	mailvelope.createDisplayContainer(selector, armored, this.mailvelopeKeyring, {senderAddress:''}).then(status => {
		if (status.error && status.error.message) {
			return error_handler(status.error);
		}

		ref.hide_message(msgid);
		$(selector).children().not('iframe').hide();
		$(ref.gui_objects.messagebody).addClass('mailvelope');

		// on success we can remove encrypted part from the attachments list
		if (ref.env.pgp_mime_part)
			$('#attach' + ref.env.pgp_mime_part).remove();

		setTimeout(function() { $(window).resize(); }, 10);
	}, error_handler);
*/
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
	 * Creates an iframe to display the keyring settings.
	 * The iframe will be injected into the container identified by selector.
	 */
/*
	mailvelope.createSettingsContainer(selector [, keyring], options)
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
