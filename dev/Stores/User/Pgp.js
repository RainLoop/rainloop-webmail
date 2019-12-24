import ko from 'ko';
import _ from '_';
import $ from '$';

import { i18n } from 'Common/Translator';
import { log, isArray, isNonEmptyArray, pString, isUnd, trim } from 'Common/Utils';

import AccountStore from 'Stores/User/Account';

import { showScreenPopup } from 'Knoin/Knoin';

class PgpUserStore {
	constructor() {
		this.capaOpenPGP = ko.observable(false);

		this.openpgp = null;

		this.openpgpkeys = ko.observableArray([]);
		this.openpgpKeyring = null;

		this.openpgpkeysPublic = ko.computed(() => _.filter(this.openpgpkeys(), (item) => !!(item && !item.isPrivate)));
		this.openpgpkeysPrivate = ko.computed(() => _.filter(this.openpgpkeys(), (item) => !!(item && item.isPrivate)));
	}

	/**
	 * @returns {boolean}
	 */
	isSupported() {
		return !!this.openpgp;
	}

	findKeyByHex(keys, hash) {
		return _.find(keys, (item) => hash && item && (hash === item.id || -1 < item.ids.indexOf(hash)));
	}

	findPublicKeyByHex(hash) {
		return this.findKeyByHex(this.openpgpkeysPublic(), hash);
	}

	findPrivateKeyByHex(hash) {
		return this.findKeyByHex(this.openpgpkeysPrivate(), hash);
	}

	findPublicKeysByEmail(email) {
		return _.compact(
			_.flatten(
				_.map(this.openpgpkeysPublic(), (item) => {
					const key = item && -1 < item.emails.indexOf(email) ? item : null;
					return key ? key.getNativeKeys() : [null];
				}),
				true
			)
		);
	}

	findPublicKeysBySigningKeyIds(signingKeyIds) {
		return _.compact(
			_.flatten(
				_.map(signingKeyIds, (id) => {
					const key = id && id.toHex ? this.findPublicKeyByHex(id.toHex()) : null;
					return key ? key.getNativeKeys() : [null];
				}),
				true
			)
		);
	}

	findPrivateKeysByEncryptionKeyIds(encryptionKeyIds, recipients, returnWrapKeys) {
		let result = isArray(encryptionKeyIds)
			? _.compact(
					_.flatten(
						_.map(encryptionKeyIds, (id) => {
							const key = id && id.toHex ? this.findPrivateKeyByHex(id.toHex()) : null;
							return key ? (returnWrapKeys ? [key] : key.getNativeKeys()) : [null];
						}),
						true
					)
			  )
			: [];

		if (0 === result.length && isNonEmptyArray(recipients)) {
			result = _.uniq(
				_.compact(
					_.flatten(
						_.map(recipients, (sEmail) => {
							const keys = sEmail ? this.findAllPrivateKeysByEmailNotNative(sEmail) : null;
							return keys
								? returnWrapKeys
									? keys
									: _.flatten(
											_.map(keys, (key) => key.getNativeKeys()),
											true
									  )
								: [null];
						}),
						true
					)
				),
				(key) => key.id
			);
		}

		return result;
	}

	/**
	 * @param {string} email
	 * @returns {?}
	 */
	findPublicKeyByEmailNotNative(email) {
		return _.find(this.openpgpkeysPublic(), (item) => item && -1 < item.emails.indexOf(email)) || null;
	}

	/**
	 * @param {string} email
	 * @returns {?}
	 */
	findPrivateKeyByEmailNotNative(email) {
		return _.find(this.openpgpkeysPrivate(), (item) => item && -1 < item.emails.indexOf(email)) || null;
	}

	/**
	 * @param {string} email
	 * @returns {?}
	 */
	findAllPublicKeysByEmailNotNative(email) {
		return _.filter(this.openpgpkeysPublic(), (item) => item && -1 < item.emails.indexOf(email)) || null;
	}

	/**
	 * @param {string} email
	 * @returns {?}
	 */
	findAllPrivateKeysByEmailNotNative(email) {
		return _.filter(this.openpgpkeysPrivate(), (item) => item && -1 < item.emails.indexOf(email)) || null;
	}

	/**
	 * @param {string} email
	 * @param {string=} password
	 * @returns {?}
	 */
	findPrivateKeyByEmail(email, password) {
		let privateKey = null;
		const key = _.find(this.openpgpkeysPrivate(), (item) => item && -1 < item.emails.indexOf(email));

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
			if (privateKeys && 0 < privateKeys.length) {
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
			if (signingKeyIds && 0 < signingKeyIds.length) {
				const publicKeys = this.findPublicKeysBySigningKeyIds(signingKeyIds);
				if (publicKeys && 0 < publicKeys.length) {
					try {
						const result = message.verify(publicKeys),
							valid = _.find(_.isArray(result) ? result : [], (item) => item && item.valid && item.keyid);

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

		if (!isUnd(text)) {
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
										? _.compact(_.map(keyIds, (item) => (item && item.toHex ? item.toHex() : null))).join(', ')
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
								? _.compact(_.map(keyIds, (item) => (item && item.toHex ? item.toHex() : null))).join(', ')
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
