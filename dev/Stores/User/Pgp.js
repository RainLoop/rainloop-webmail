import ko from 'ko';
import $ from '$';

import { i18n } from 'Common/Translator';
import { log, isNonEmptyArray, pString, trim } from 'Common/Utils';

import AccountStore from 'Stores/User/Account';

import { showScreenPopup } from 'Knoin/Knoin';

class PgpUserStore {
	constructor() {
		this.capaOpenPGP = ko.observable(false);

		this.openpgp = null;

		this.openpgpkeys = ko.observableArray([]);
		this.openpgpKeyring = null;

		this.openpgpkeysPublic = ko.computed(() => this.openpgpkeys().filter(item => !!(item && !item.isPrivate)));
		this.openpgpkeysPrivate = ko.computed(() => this.openpgpkeys().filter(item => !!(item && item.isPrivate)));
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
		}).flat().filter(value => !!value);
	}

	findPublicKeysBySigningKeyIds(signingKeyIds) {
		return signingKeyIds.map(id => {
			const key = id && id.toHex ? this.findPublicKeyByHex(id.toHex()) : null;
			return key ? key.getNativeKeys() : [null];
		}).flat().filter(value => !!value);
	}

	findPrivateKeysByEncryptionKeyIds(encryptionKeyIds, recipients, returnWrapKeys) {
		let result = Array.isArray(encryptionKeyIds)
			? encryptionKeyIds.map(id => {
					const key = id && id.toHex ? this.findPrivateKeyByHex(id.toHex()) : null;
					return key ? (returnWrapKeys ? [key] : key.getNativeKeys()) : [null];
				}).flat().filter(value => !!value)
			: [];

		if (!result.length && isNonEmptyArray(recipients)) {
			result = recipients.map(sEmail => {
				const keys = sEmail ? this.findAllPrivateKeysByEmailNotNative(sEmail) : null;
				return keys
					? returnWrapKeys
						? keys
						: keys.map(key => key.getNativeKeys()).flat()
					: [null];
			}).flat().filter((key, index, self) => key => !!key.id && self.indexOf(key) == index);
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
		return this.findPrivateKeyByEmail(AccountStore.email(), password);
	}

	decryptMessage(message, recipients, fCallback) {
		if (message && message.getEncryptionKeyIds) {
			const privateKeys = this.findPrivateKeysByEncryptionKeyIds(message.getEncryptionKeyIds(), recipients, true);
			if (privateKeys && privateKeys.length) {
				showScreenPopup(require('View/Popup/MessageOpenPgp'), [
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
							valid = (Array.isArray(result) ? result : []).find(item => item && item.valid && item.keyid);

						if (valid && valid.keyid && valid.keyid && valid.keyid.toHex) {
							fCallback(this.findPublicKeyByHex(valid.keyid.toHex()));
							return true;
						}
					} catch (e) {
						log(e);
					}
				}

				fCallback(null, signingKeyIds);
				return false;
			}
		}

		fCallback(null);
		return false;
	}

	controlsHelper(dom, verControl, success, title, text) {
		if (success) {
			dom
				.removeClass('error')
				.addClass('success')
				.attr('title', title);
			verControl
				.removeClass('error')
				.addClass('success')
				.attr('title', title);
		} else {
			dom
				.removeClass('success')
				.addClass('error')
				.attr('title', title);
			verControl
				.removeClass('success')
				.addClass('error')
				.attr('title', title);
		}

		if (undefined !== text) {
			dom.text(trim(text));
		}
	}

	static domControlEncryptedClickHelper(store, dom, armoredMessage, recipients) {
		return function() {
			let message = null;
			const $this = $(this); // eslint-disable-line no-invalid-this

			if ($this.hasClass('success')) {
				return false;
			}

			try {
				message = store.openpgp.message.readArmored(armoredMessage);
			} catch (e) {
				log(e);
			}

			if (message && message.getText && message.verify && message.decrypt) {
				store.decryptMessage(
					message,
					recipients,
					(validPrivateKey, decryptedMessage, validPublicKey, signingKeyIds) => {
						if (decryptedMessage) {
							if (validPublicKey) {
								store.controlsHelper(
									dom,
									$this,
									true,
									i18n('PGP_NOTIFICATIONS/GOOD_SIGNATURE', {
										'USER': validPublicKey.user + ' (' + validPublicKey.id + ')'
									}),
									decryptedMessage.getText()
								);
							} else if (validPrivateKey) {
								const keyIds = isNonEmptyArray(signingKeyIds) ? signingKeyIds : null,
									additional = keyIds
										? keyIds.map(item => (item && item.toHex ? item.toHex() : null)).filter(value => !!value).join(', ')
										: '';

								store.controlsHelper(
									dom,
									$this,
									false,
									i18n('PGP_NOTIFICATIONS/UNVERIFIRED_SIGNATURE') + (additional ? ' (' + additional + ')' : ''),
									decryptedMessage.getText()
								);
							} else {
								store.controlsHelper(dom, $this, false, i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR'));
							}
						} else {
							store.controlsHelper(dom, $this, false, i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR'));
						}
					}
				);

				return false;
			}

			store.controlsHelper(dom, $this, false, i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR'));
			return false;
		};
	}

	static domControlSignedClickHelper(store, dom, armoredMessage) {
		return function() {
			let message = null;
			const $this = $(this); // eslint-disable-line no-invalid-this

			if ($this.hasClass('success') || $this.hasClass('error')) {
				return false;
			}

			try {
				message = store.openpgp.cleartext.readArmored(armoredMessage);
			} catch (e) {
				log(e);
			}

			if (message && message.getText && message.verify) {
				store.verifyMessage(message, (validKey, signingKeyIds) => {
					if (validKey) {
						store.controlsHelper(
							dom,
							$this,
							true,
							i18n('PGP_NOTIFICATIONS/GOOD_SIGNATURE', {
								'USER': validKey.user + ' (' + validKey.id + ')'
							}),
							message.getText()
						);
					} else {
						const keyIds = isNonEmptyArray(signingKeyIds) ? signingKeyIds : null,
							additional = keyIds
								? keyIds.map(item => (item && item.toHex ? item.toHex() : null)).filter(value => !!value).join(', ')
								: '';

						store.controlsHelper(
							dom,
							$this,
							false,
							i18n('PGP_NOTIFICATIONS/UNVERIFIRED_SIGNATURE') + (additional ? ' (' + additional + ')' : '')
						);
					}
				});

				return false;
			}

			store.controlsHelper(dom, $this, false, i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR'));
			return false;
		};
	}

	/**
	 * @param {*} dom
	 * @param {MessageModel} rainLoopMessage
	 */
	initMessageBodyControls(dom, rainLoopMessage) {
		if (dom && !dom.hasClass('inited')) {
			dom.addClass('inited');

			const encrypted = dom.hasClass('encrypted'),
				signed = dom.hasClass('signed'),
				recipients = rainLoopMessage ? rainLoopMessage.getEmails(['from', 'to', 'cc']) : [];

			let verControl = null;

			if (encrypted || signed) {
				const domText = dom.text();
				dom.data('openpgp-original', domText);

				if (encrypted) {
					verControl = $('<div class="b-openpgp-control"><i class="icon-lock"></i></div>')
						.attr('title', i18n('MESSAGE/PGP_ENCRYPTED_MESSAGE_DESC'))
						.on('click', PgpUserStore.domControlEncryptedClickHelper(this, dom, domText, recipients));
				} else if (signed) {
					verControl = $('<div class="b-openpgp-control"><i class="icon-lock"></i></div>')
						.attr('title', i18n('MESSAGE/PGP_SIGNED_MESSAGE_DESC'))
						.on('click', PgpUserStore.domControlSignedClickHelper(this, dom, domText));
				}

				if (verControl) {
					dom.before(verControl).before('<div></div>');
				}
			}
		}
	}
}

export default new PgpUserStore();
