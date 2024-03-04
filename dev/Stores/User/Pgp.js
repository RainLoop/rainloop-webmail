import { SettingsCapa, SettingsGet } from 'Common/Globals';
//import { staticLink } from 'Common/Links';

//import { showScreenPopup } from 'Knoin/Knoin';

//import { EmailModel } from 'Model/Email';
//import { OpenPgpKeyModel } from 'Model/OpenPgpKey';

import { GnuPGUserStore } from 'Stores/User/GnuPG';
import { OpenPGPUserStore } from 'Stores/User/OpenPGP';
import { MailvelopeUserStore } from 'Stores/User/Mailvelope';

import Remote from 'Remote/User/Fetch';

export const
	BEGIN_PGP_MESSAGE = '-----BEGIN PGP MESSAGE-----',
//	BEGIN_PGP_SIGNATURE = '-----BEGIN PGP SIGNATURE-----',
//	BEGIN_PGP_SIGNED = '-----BEGIN PGP SIGNED MESSAGE-----',
//	BEGIN_PGP_PUBLIC_KEY = '-----BEGIN PGP PUBLIC KEY BLOCK-----',
//	END_PGP_PUBLIC_KEY = '-----END PGP PUBLIC KEY BLOCK-----',

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
			MailvelopeUserStore.loadKeyring(identifier);
			OpenPGPUserStore.loadKeyrings();
			GnuPGUserStore.loadKeyrings();
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

		importKey(key, gnuPG, backup) {
			if (gnuPG || backup) {
				Remote.request('PgpImportKey',
					(iError, oData) => {
						if (gnuPG && oData?.Result/* && (oData.Result.imported || oData.Result.secretimported)*/) {
							GnuPGUserStore.loadKeyrings();
						}
						iError && alert(oData.ErrorMessage);
					}, {
						key, gnuPG, backup
					}
				);
			}
			OpenPGPUserStore.importKey(key);
		}

		/**
		 * Checks if verifying/encrypting a message is possible with given email addresses.
		 * Returns the first library that can.
		 */
		hasPublicKeyForEmails(recipients) {
			if (recipients.length) {
				if (GnuPGUserStore.hasPublicKeyForEmails(recipients)) {
					return 'gnupg';
				}
				if (OpenPGPUserStore.hasPublicKeyForEmails(recipients)) {
					return 'openpgp';
				}
			}
			return false;
		}

		async decrypt(message) {
			const armoredText = message.plain();
			if (!this.isEncrypted(armoredText)) {
				throw Error('Not armored text');
			}

			// Try OpenPGP.js
			if (OpenPGPUserStore.isSupported()) {
				const sender = message.from[0].email;
				let result = await OpenPGPUserStore.decrypt(armoredText, sender);
				if (result) {
					return result;
				}
			}

			// Try Mailvelope (does not support inline images)
			return (await MailvelopeUserStore.decrypt(message))
				// Or try GnuPG
				|| GnuPGUserStore.decrypt(message);
		}

		async verify(message) {
			const signed = message.pgpSigned(),
				sender = message.from[0].email;
			if (signed) {
				// OpenPGP only when inline, else we must download the whole message
				if (!signed.sigPartId && OpenPGPUserStore.hasPublicKeyForEmails([sender])) {
					return OpenPGPUserStore.verify(message);
				}
				if (GnuPGUserStore.hasPublicKeyForEmails([sender])) {
					return GnuPGUserStore.verify(message);
				}
				// Mailvelope can't
				// https://github.com/mailvelope/mailvelope/issues/434
			}
		}

		getPublicKeyOfEmails(recipients) {
			if (recipients.length) {
				let result = {};
				recipients.forEach(email => {
					OpenPGPUserStore.publicKeys().forEach(key => {
						if (key.emails.includes(email)) {
							result[email] = key.armor;
						}
					});
					GnuPGUserStore.publicKeys.map(async key => {
						if (!result[email] && key.emails.includes(email)) {
							result[email] = await key.fetch();
						}
					});
				});
				return result;
			}
			return false;
		}
	};
