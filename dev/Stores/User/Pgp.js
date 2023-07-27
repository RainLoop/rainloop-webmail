import { SettingsCapa, SettingsGet } from 'Common/Globals';
//import { staticLink } from 'Common/Links';

//import { showScreenPopup } from 'Knoin/Knoin';

//import { EmailModel } from 'Model/Email';
//import { OpenPgpKeyModel } from 'Model/OpenPgpKey';

import { GnuPGUserStore } from 'Stores/User/GnuPG';
import { OpenPGPUserStore } from 'Stores/User/OpenPGP';

// https://mailvelope.github.io/mailvelope/Keyring.html
let mailvelopeKeyring = null;

export const
	BEGIN_PGP_MESSAGE = '-----BEGIN PGP MESSAGE-----',
//	BEGIN_PGP_SIGNATURE = '-----BEGIN PGP SIGNATURE-----',
//	BEGIN_PGP_SIGNED = '-----BEGIN PGP SIGNED MESSAGE-----',

	PgpUserStore = new class {
		init() {
			if (SettingsCapa('OpenPGP') && window.crypto && crypto.getRandomValues) {
				rl.loadScript(SettingsGet('StaticLibsJs').replace('/libs.', '/openpgp.'))
//				rl.loadScript(staticLink('js/min/openpgp.min.js'))
					.then(() => this.loadKeyrings())
					.catch(e => {
						this.loadKeyrings();
						console.error(e);
					});
			} else {
				this.loadKeyrings();
			}
		}

		loadKeyrings(identifier) {
			identifier = identifier || SettingsGet('Email');
			if (window.mailvelope) {
				const fn = keyring => {
						mailvelopeKeyring = keyring;
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

			OpenPGPUserStore.loadKeyrings();

			if (SettingsCapa('GnuPG')) {
				GnuPGUserStore.loadKeyrings();
			}
		}

		/**
		 * @returns {boolean}
		 */
		isSupported() {
			return !!(OpenPGPUserStore.isSupported() || GnuPGUserStore.isSupported() || window.mailvelope);
		}

		/**
		 * @returns {boolean}
		 */
		isEncrypted(text) {
			return 0 === text.trim().indexOf(BEGIN_PGP_MESSAGE);
		}

		async mailvelopeHasPublicKeyForEmails(recipients) {
			const
				mailvelope = mailvelopeKeyring && await mailvelopeKeyring.validKeyForAddress(recipients)
					/*.then(LookupResult => Object.entries(LookupResult))*/,
				entries = mailvelope && Object.entries(mailvelope);
			return entries && entries.filter(value => value[1]).length === recipients.length;
		}

		/**
		 * Checks if verifying/encrypting a message is possible with given email addresses.
		 * Returns the first library that can.
		 */
		async hasPublicKeyForEmails(recipients) {
			const count = recipients.length;
			if (count) {
				if (GnuPGUserStore.hasPublicKeyForEmails(recipients)) {
					return 'gnupg';
				}
				if (OpenPGPUserStore.hasPublicKeyForEmails(recipients)) {
					return 'openpgp';
				}
			}
			return false;
		}

		async getMailvelopePrivateKeyFor(email/*, sign*/) {
			if (mailvelopeKeyring && await mailvelopeKeyring.hasPrivateKey({email:email})) {
				return ['mailvelope', email];
			}
			return false;
		}

		/**
		 * Checks if signing a message is possible with given email address.
		 * Returns the first library that can.
		 */
		async getKeyForSigning(email) {
			let key = OpenPGPUserStore.getPrivateKeyFor(email, 1);
			if (key) {
				return ['openpgp', key];
			}

			key = GnuPGUserStore.getPrivateKeyFor(email, 1);
			if (key) {
				return ['gnupg', key];
			}

	//		return await this.getMailvelopePrivateKeyFor(email, 1);
		}

		async decrypt(message) {
			const sender = message.from[0].email,
				armoredText = message.plain();
			if (!this.isEncrypted(armoredText)) {
				throw Error('Not armored text');
			}

			// Try OpenPGP.js
			if (OpenPGPUserStore.isSupported()) {
				let result = await OpenPGPUserStore.decrypt(armoredText, sender);
				if (result) {
					return result;
				}
			}

			// Try Mailvelope (does not support inline images)
			if (mailvelopeKeyring) {
				try {
					let emails = [...message.from,...message.to,...message.cc].validUnique(),
						i = emails.length;
					while (i--) {
						if (await this.getMailvelopePrivateKeyFor(emails[i].email)) {
							/**
							* https://mailvelope.github.io/mailvelope/Mailvelope.html#createEncryptedFormContainer
							* Creates an iframe to display an encrypted form
							*/
		//					mailvelope.createEncryptedFormContainer('#mailvelope-form');
							/**
							* https://mailvelope.github.io/mailvelope/Mailvelope.html#createDisplayContainer
							* Creates an iframe to display the decrypted content of the encrypted mail.
							*/
							const body = message.body;
							body.textContent = '';
							let result = await mailvelope.createDisplayContainer(
								'#'+body.id,
								armoredText,
								mailvelopeKeyring,
								{
									senderAddress: sender
									// emails[i].email
								}
							);
							if (result) {
								if (result.error?.message) {
									if ('PWD_DIALOG_CANCEL' !== result.error.code) {
										alert(result.error.code + ': ' + result.error.message);
									}
								} else {
									body.classList.add('mailvelope');
									return true;
								}
							}
							break;
						}
					}
				} catch (err) {
					console.error(err);
				}
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
				if (gnupg && signed.sigPartId) {
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
		 * Returns headers that should be added to an outgoing email.
		 * So far this is only the autocrypt header.
		 */
	/*
		mailvelopeKeyring.additionalHeadersForOutgoingEmail(headers)
		mailvelopeKeyring.addSyncHandler(syncHandlerObj)
		mailvelopeKeyring.createKeyBackupContainer(selector, options)
		mailvelopeKeyring.createKeyGenContainer(selector, {
	//		userIds: [],
			keySize: 4096
		})

		mailvelopeKeyring.exportOwnPublicKey(emailAddr).then(<AsciiArmored, Error>)
		mailvelopeKeyring.importPublicKey(armored)

		// https://mailvelope.github.io/mailvelope/global.html#SyncHandlerObject
		mailvelopeKeyring.addSyncHandler({
			uploadSync
			downloadSync
			backup
			restore
		});
	*/

	};
