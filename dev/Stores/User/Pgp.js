import { Capa } from 'Common/Enums';
import { doc, createElement, Settings } from 'Common/Globals';
import { staticLink } from 'Common/Links';

//import { showScreenPopup } from 'Knoin/Knoin';

//import { EmailModel } from 'Model/Email';
//import { OpenPgpKeyModel } from 'Model/OpenPgpKey';

import { GnuPGUserStore } from 'Stores/User/GnuPG';
import { OpenPGPUserStore } from 'Stores/User/OpenPGP';

export const PgpUserStore = new class {
	constructor() {
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

		if (OpenPGPUserStore.isSupported()) {
			OpenPGPUserStore.loadKeyrings(identifier);
		}

		if (Settings.capa(Capa.GnuPG)) {
			GnuPGUserStore.loadKeyrings(identifier);
		}
	}

	/**
	 * @returns {boolean}
	 */
	isSupported() {
		return !!(OpenPGPUserStore.isSupported() || GnuPGUserStore.isSupported() || window.mailvelope);
	}

	/**
	 * Checks if verifying/encrypting a message is possible with given email addresses.
	 * Returns the first library that can.
	 */
	async hasPublicKeyForEmails(recipients, all) {
		const count = recipients.length;
		if (count) {
			if (OpenPGPUserStore.hasPublicKeyForEmails(recipients, all)) {
				return 'openpgp';
			}

			if (GnuPGUserStore.hasPublicKeyForEmails(recipients, all)) {
				return 'gnupg';
			}

			let keyring = this.mailvelopeKeyring,
				mailvelope = keyring && await keyring.validKeyForAddress(recipients)
				/*.then(LookupResult => Object.entries(LookupResult))*/;
			mailvelope = mailvelope && Object.entries(mailvelope);
			if (mailvelope && (all ? (mailvelope.filter(([, value]) => value).length === count) : mailvelope.length)) {
				return 'mailvelope';
			}
		}
		return false;
	}

	async getMailvelopePrivateKeyFor(email/*, sign*/) {
		let keyring = this.mailvelopeKeyring;
		if (keyring && await keyring.hasPrivateKey({email:email})) {
			return ['mailvelope', email];
		}
		return false;
	}

	/**
	 * Checks if signing a message is possible with given email address.
	 * Returns the first library that can.
	 */
	async getKeyForSigning(email) {
/*
		let key = GnuPGUserStore.getPrivateKeyFor(email, 1);
		if (key) {
			return ['gnupg', key];
		}
*/
		let key = OpenPGPUserStore.getPrivateKeyFor(email, 1);
		if (key) {
			return ['openpgp', key];
		}

//		return await this.getMailvelopePrivateKeyFor(email, 1);
	}

	async decrypt(message) {
		const sender = message.from[0].email,
			armoredText = message.plain();

		if (!armoredText.includes('-----BEGIN PGP MESSAGE-----')) {
			return;
		}

		// Try OpenPGP.js
		let result = await OpenPGPUserStore.decrypt(armoredText, sender);
		if (result) {
			return result;
		}

		// Try Mailvelope (does not support inline images)
		try {
			let key = await this.getMailvelopePrivateKeyFor(message.to[0].email);
			if (key) {
				/**
				* https://mailvelope.github.io/mailvelope/Mailvelope.html#createEncryptedFormContainer
				* Creates an iframe to display an encrypted form
				*/
//				mailvelope.createEncryptedFormContainer('#mailvelope-form');
				/**
				* https://mailvelope.github.io/mailvelope/Mailvelope.html#createDisplayContainer
				* Creates an iframe to display the decrypted content of the encrypted mail.
				*/
				const body = message.body;
				body.textContent = '';
				result = await mailvelope.createDisplayContainer(
					'#'+body.id,
					armoredText,
					this.mailvelopeKeyring,
					{
						senderAddress: sender
					}
				);
				if (result) {
					if (result.error && result.error.message) {
						if ('PWD_DIALOG_CANCEL' !== result.error.code) {
							alert(result.error.code + ': ' + result.error.message);
						}
					} else {
						body.classList.add('mailvelope');
						return;
					}
				}
			}
		} catch (err) {
			console.error(err);
		}

		// Now try GnuPG
		return GnuPGUserStore.decrypt(message);
	}

	async verify(message) {
		const signed = message.pgpSigned();
		if (signed) {
			const sender = message.from[0].email,
				gnupg = GnuPGUserStore.hasPublicKeyForEmails([sender]),
				openpgp = OpenPGPUserStore.hasPublicKeyForEmails([sender]);
			// Detached signature use GnuPG first, else we must download whole message
			if (gnupg && signed.SigPartId) {
				return GnuPGUserStore.verify(message);
			}
			if (openpgp) {
				return OpenPGPUserStore.verify(message);
			}
			if (gnupg) {
				return GnuPGUserStore.verify(message);
			}
			// Mailvelope can't
			// https://github.com/mailvelope/mailvelope/issues/434
		}
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
