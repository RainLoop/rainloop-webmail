import ko from 'ko';

import { i18n } from 'Common/Translator';
import { isArray, arrayLength, pString, addComputablesTo } from 'Common/Utils';
import { createElement } from 'Common/Globals';

import { AccountUserStore } from 'Stores/User/Account';

import { showScreenPopup } from 'Knoin/Knoin';

import { MessageOpenPgpPopupView } from 'View/Popup/MessageOpenPgp';

function controlsHelper(dom, verControl, success, title, text)
{
	dom.classList.toggle('error', !success);
	dom.classList.toggle('success', success);
	verControl.classList.toggle('error', !success);
	verControl.classList.toggle('success', success);
	dom.title = verControl.title = title;

	if (undefined !== text) {
		dom.textContent = text.trim();
	}
}

function domControlEncryptedClickHelper(store, dom, armoredMessage, recipients) {
	return function() {
		let message = null;

		if (this.classList.contains('success')) {
			return false;
		}

		try {
			message = store.openpgp.message.readArmored(armoredMessage);
		} catch (e) {
			console.log(e);
		}

		if (message && message.getText && message.verify && message.decrypt) {
			store.decryptMessage(
				message,
				recipients,
				(validPrivateKey, decryptedMessage, validPublicKey, signingKeyIds) => {
					if (decryptedMessage) {
						if (validPublicKey) {
							controlsHelper(
								dom,
								this,
								true,
								i18n('PGP_NOTIFICATIONS/GOOD_SIGNATURE', {
									USER: validPublicKey.user + ' (' + validPublicKey.id + ')'
								}),
								decryptedMessage.getText()
							);
						} else if (validPrivateKey) {
							const keyIds = arrayLength(signingKeyIds) ? signingKeyIds : null,
								additional = keyIds
									? keyIds.map(item => (item && item.toHex ? item.toHex() : null)).filter(v => v).join(', ')
									: '';

							controlsHelper(
								dom,
								this,
								false,
								i18n('PGP_NOTIFICATIONS/UNVERIFIRED_SIGNATURE') + (additional ? ' (' + additional + ')' : ''),
								decryptedMessage.getText()
							);
						} else {
							controlsHelper(dom, this, false, i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR'));
						}
					} else {
						controlsHelper(dom, this, false, i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR'));
					}
				}
			);

			return false;
		}

		controlsHelper(dom, this, false, i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR'));
		return false;
	};
}

function domControlSignedClickHelper(store, dom, armoredMessage) {
	return function() {
		let message = null;

		if (this.classList.contains('success') || this.classList.contains('error')) {
			return false;
		}

		try {
			message = store.openpgp.cleartext.readArmored(armoredMessage);
		} catch (e) {
			console.log(e);
		}

		if (message && message.getText && message.verify) {
			store.verifyMessage(message, (validKey, signingKeyIds) => {
				if (validKey) {
					controlsHelper(
						dom,
						this,
						true,
						i18n('PGP_NOTIFICATIONS/GOOD_SIGNATURE', {
							USER: validKey.user + ' (' + validKey.id + ')'
						}),
						message.getText()
					);
				} else {
					const keyIds = arrayLength(signingKeyIds) ? signingKeyIds : null,
						additional = keyIds
							? keyIds.map(item => (item && item.toHex ? item.toHex() : null)).filter(v => v).join(', ')
							: '';

					controlsHelper(
						dom,
						this,
						false,
						i18n('PGP_NOTIFICATIONS/UNVERIFIRED_SIGNATURE') + (additional ? ' (' + additional + ')' : '')
					);
				}
			});

			return false;
		}

		controlsHelper(dom, this, false, i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR'));
		return false;
	};
}

export const PgpUserStore = new class {
	constructor() {
		this.capaOpenPGP = ko.observable(false);

		this.openpgp = null;

		this.openpgpkeys = ko.observableArray();
		this.openpgpKeyring = null;

		addComputablesTo(this, {
			openpgpkeysPublic: () => this.openpgpkeys.filter(item => item && !item.isPrivate),
			openpgpkeysPrivate: () => this.openpgpkeys.filter(item => item && item.isPrivate)
		});
	}

	/**
	 * @returns {boolean}
	 */
	isSupported() {
		return !!this.openpgp;
	}

	findKeyByHex(keys, hash) {
		return keys.find(item => hash && item && (hash === item.id || item.ids.includes(hash)));
	}

	findPublicKeyByHex(hash) {
		return this.findKeyByHex(this.openpgpkeysPublic(), hash);
	}

	findPrivateKeyByHex(hash) {
		return this.findKeyByHex(this.openpgpkeysPrivate(), hash);
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
	 * @param {string} email
	 * @returns {?}
	 */
	findPublicKeyByEmailNotNative(email) {
		return this.openpgpkeysPublic().find(item => item && item.emails.includes(email)) || null;
	}

	/**
	 * @param {string} email
	 * @returns {?}
	 */
	findPrivateKeyByEmailNotNative(email) {
		return this.openpgpkeysPrivate().find(item => item && item.emails.includes(email)) || null;
	}

	/**
	 * @param {string} email
	 * @returns {?}
	 */
	findAllPublicKeysByEmailNotNative(email) {
		return this.openpgpkeysPublic().filter(item => item && item.emails.includes(email)) || null;
	}

	/**
	 * @param {string} email
	 * @returns {?}
	 */
	findAllPrivateKeysByEmailNotNative(email) {
		return this.openpgpkeysPrivate().filter(item => item && item.emails.includes(email)) || null;
	}

	/**
	 * @param {string} email
	 * @param {string=} password
	 * @returns {?}
	 */
	findPrivateKeyByEmail(email, password) {
		let privateKey = null;
		const key = this.openpgpkeysPrivate().find(item => item && item.emails.includes(email));

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

	/**
	 * @param {string=} password
	 * @returns {?}
	 */
	findSelfPrivateKey(password) {
		return this.findPrivateKeyByEmail(AccountUserStore.email(), password);
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
	 * @param {*} dom
	 * @param {MessageModel} rainLoopMessage
	 */
	initMessageBodyControls(dom, rainLoopMessage) {
		const cl = dom && dom.classList;
		if (!cl.contains('inited')) {
			cl.add('inited');

			const encrypted = cl.contains('encrypted'),
				signed = cl.contains('signed'),
				recipients = rainLoopMessage ? rainLoopMessage.getEmails(['from', 'to', 'cc']) : [];

			let verControl = null;

			if (encrypted || signed) {
				const domText = dom.textContent;

				verControl = Element.fromHTML('<div class="b-openpgp-control"><i class="fontastic">🔒</i></div>');
				if (encrypted) {
					verControl.title = i18n('MESSAGE/PGP_ENCRYPTED_MESSAGE_DESC');
					verControl.addEventListener('click', domControlEncryptedClickHelper(this, dom, domText, recipients));
				} else {
					verControl.title = i18n('MESSAGE/PGP_SIGNED_MESSAGE_DESC');
					verControl.addEventListener('click', domControlSignedClickHelper(this, dom, domText));
				}

				dom.before(verControl, createElement('div'));
			}
		}
	}
};
