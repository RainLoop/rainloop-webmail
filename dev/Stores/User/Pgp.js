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
		keyPair.privateKey
		keyPair.publicKey
		keyPair.revocationCertificate
		keyPair.onServer
		keyPair.inGnuPG
	 */
	storeKeyPair(keyPair, callback) {
		OpenPGPUserStore.isSupported() && OpenPGPUserStore.storeKeyPair(keyPair);
//		if (Settings.capa(Capa.GnuPG)) {
		GnuPGUserStore.storeKeyPair(keyPair, callback);
	}

	/**
	 * Checks if verifying/encrypting a message is possible with given email addresses.
	 * Returns the first library that can.
	 */
	async hasPublicKeyForEmails(recipients, all) {
		const count = recipients.length;
		if (count) {
			if (GnuPGUserStore.hasPublicKeyForEmails(recipients, all)) {
				return 'gnupg';
			}

			if (OpenPGPUserStore.hasPublicKeyForEmails(recipients, all)) {
				return 'openpgp';
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

	getGnuPGPrivateKeyFor(query, sign) {
		let key = GnuPGUserStore.getPrivateKeyFor(query, sign);
		if (key) {
			return ['gnupg', key];
		}
	}

	getOpenPGPPrivateKeyFor(query/*, sign*/) {
		let key = OpenPGPUserStore.getPrivateKeyFor(query/*, sign*/);
		if (key) {
			return ['openpgp', key];
		}
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
		return this.getGnuPGPrivateKeyFor(email, 1)
			|| this.getOpenPGPPrivateKeyFor(email, 1)
			|| await this.getMailvelopePrivateKeyFor(email, 1);
	}

	/**
	 * Checks if decrypting a message is possible with given keyIds or email address.
	 * Returns the first library that can.
	 */
	async getKeyForDecryption(ids, email) {
		ids = [email].concat(ids);
		let i = ids.length,
			key = await this.getMailvelopePrivateKeyFor({email:email});
		if (key) {
			return key;
		}
/*      Not working, needs full fingerprint
		while (i--) {
			key = await this.getMailvelopePrivateKeyFor(ids[i]);
			if (key) {
				return key;
			}
			if (await keyring.hasPrivateKey(ids[i])) {
				return ['mailvelope', ids[i]];
			}
		}
		i = ids.length;
*/
		while (i--) {
			key = this.getGnuPGPrivateKeyFor(ids[i]);
			if (key) {
				return key;
			}
		}

		i = ids.length;
		while (i--) {
			key = this.getOpenPGPPrivateKeyFor(ids[i]);
			if (key) {
				return key;
			}
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
