import ko from 'ko';

import { SettingsCapa } from 'Common/Globals';

//import { EmailModel } from 'Model/Email';
//import { OpenPgpKeyModel } from 'Model/OpenPgpKey';

import Remote from 'Remote/User/Fetch';

import { showScreenPopup } from 'Knoin/Knoin';
import { OpenPgpKeyPopupView } from 'View/Popup/OpenPgpKey';

import { Passphrases } from 'Storage/Passphrases';

const
	findGnuPGKey = (keys, query/*, sign*/) =>
		keys.find(key =>
//			key[sign ? 'can_sign' : 'can_decrypt']
			(key.can_sign || key.can_decrypt)
			&& (key.emails.includes(query) || key.subkeys.find(key => query == key.keyid || query == key.fingerprint))
		);

export const GnuPGUserStore = new class {
	constructor() {
		/**
		 * PECL gnupg / PEAR Crypt_GPG
		 * [ {email, can_encrypt, can_sign}, ... ]
		 */
		this.keyring;
		this.publicKeys = ko.observableArray();
		this.privateKeys = ko.observableArray();
	}

	loadKeyrings() {
		this.keyring = null;
		this.publicKeys([]);
		this.privateKeys([]);
		SettingsCapa('GnuPG')
		&& Remote.request('GnupgGetKeys',
			(iError, oData) => {
				if (oData?.Result) {
					this.keyring = oData.Result;
					const initKey = (key, isPrivate) => {
						const aEmails = [];
						key.id = key.subkeys[0].keyid;
						key.fingerprint = key.subkeys[0].fingerprint;
						key.uids.forEach(uid => uid.email && aEmails.push(uid.email));
						key.emails = aEmails;
						key.askDelete = ko.observable(false);
						key.openForDeletion = ko.observable(null).askDeleteHelper();
						key.remove = () => {
							if (key.askDelete()) {
								Remote.request('GnupgDeleteKey',
									(iError, oData) => {
										if (oData) {
											if (iError) {
												alert(oData.ErrorMessage);
											} else if (oData.Result) {
												isPrivate
													? this.privateKeys.remove(key)
													: this.publicKeys.remove(key);
											}
										}
									}, {
										keyId: key.id,
										isPrivate: isPrivate
									}
								);
							}
						};
						if (isPrivate) {
							key.password = async (btnTxt = 'CRYPTO/SIGN') => {
								const pass = await Passphrases.ask(key,
									'GnuPG key<br>' + key.id + ' ' + key.emails[0],
									btnTxt
								);
								pass && pass.remember && Passphrases.set(key, pass.password);
								return pass?.password;
							};
						}
						key.fetch = async callback => {
							if (key.armor) {
								callback && callback();
							} else {
								let pass = isPrivate ? await key.password('OPENPGP/POPUP_VIEW_TITLE') : '';
								if (null != pass) try {
									const result = await Remote.post('GnupgExportKey', null, {
											keyId: key.id,
											isPrivate: isPrivate,
											passphrase: pass
										});
									if (result?.Result) {
										key.armor = result.Result;
										callback && callback();
									} else {
										Passphrases.delete(key);
									}
								} catch (e) {
									Passphrases.delete(key);
									alert(e.message);
								}
							}
							return key.armor;
						};
						key.view = () => key.fetch(() => showScreenPopup(OpenPgpKeyPopupView, [key]));
						return key;
					},
					collator = new Intl.Collator(undefined, {sensitivity: 'base'}),
					sort = keys => keys.sort(
						(a, b) => collator.compare(a.emails[0], b.emails[0]) || collator.compare(a.id, b.id)
					);
					this.publicKeys(sort(oData.Result.public.map(key => initKey(key, 0))));
					this.privateKeys(sort(oData.Result.private.map(key => initKey(key, 1))));
					console.log('gnupg ready');
				}
			}
		);
	}

	/**
	 * @returns {boolean}
	 */
	isSupported() {
		return SettingsCapa('GnuPG');
	}

	/**
		keyPair.privateKey
		keyPair.publicKey
		keyPair.revocationCertificate
		keyPair.onServer
		keyPair.inGnuPG
	 */
	storeKeyPair(keyPair, callback) {
		Remote.request('PgpStoreKeyPair',
			(iError, oData) => {
				if (oData?.Result) {
//					this.gnupgKeyring = oData.Result;
				}
				callback?.(iError, oData);
			}, keyPair
		);
	}

	/**
	 * Checks if verifying/encrypting a message is possible with given email addresses.
	 */
	hasPublicKeyForEmails(recipients) {
		const count = recipients.length,
			length = count ? recipients.filter(email =>
//				(key.can_verify || key.can_encrypt) &&
				this.publicKeys.find(key => key.emails.includes(email))
			).length : 0;
		return length && length === count;
	}

	getPublicKeyFingerprints(recipients) {
		const fingerprints = [];
		recipients.forEach(email => {
			fingerprints.push(this.publicKeys.find(key => key.emails.includes(email)).fingerprint);
		});
		return fingerprints;
	}

	getPrivateKeyFor(query, sign) {
		return findGnuPGKey(this.privateKeys, query, sign);
	}

	async decrypt(message) {
		const
			pgpInfo = message.pgpEncrypted();
		if (pgpInfo) {
			let ids = [message.to[0].email].concat(pgpInfo.keyIds),
				i = ids.length, key;
			while (i--) {
				key = findGnuPGKey(this.privateKeys, ids[i]);
				if (key) {
					break;
				}
			}
			if (key) {
				// Also check message.from[0].email
				let params = {
					folder: message.folder,
					uid: message.uid,
					partId: pgpInfo.partId,
					keyId: key.id,
					passphrase: await key.password('CRYPTO/DECRYPT'),
					data: '' // message.plain() optional
				}
				if (null != params.passphrase) {
					try {
						const response = await Remote.post('GnupgDecrypt', null, params);
						if (response?.Result?.data) {
							return response.Result;
						}
						throw response;
					} catch (e) {
						Passphrases.delete(key);
						throw e;
					}
				}
			}
		}
	}

	async verify(message) {
		let data = message.pgpSigned(); // { partId: "1", sigPartId: "2", micAlg: "pgp-sha256" }
		if (data) {
			data = { ...data }; // clone
//			const sender = message.from[0].email;
//			let mode = await this.hasPublicKeyForEmails([sender]);
			data.folder = message.folder;
			data.uid = message.uid;
			if (data.bodyPart) {
				data.bodyPart = data.bodyPart.raw;
				data.sigPart = data.sigPart.body;
			}
			let response = await Remote.post('PgpVerifyMessage', null, data);
			if (response?.Result) {
				return {
					fingerprint: response.Result.fingerprint,
					success: 0 == response.Result.status, // GOODSIG
					error: response.Result.message
				};
			}
		}
	}

	async sign(privateKey) {
		return await privateKey.password();
	}

};
