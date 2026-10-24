import { SettingsGet } from 'Common/Globals';

// https://mailvelope.github.io/mailvelope/Keyring.html
let mailvelopeKeyring = null;

export const MailvelopeUserStore = {
	keyring: null,

	loadKeyring(identifier) {
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
			addEventListener('mailvelope', () => this.loadKeyring(identifier));
		}
	},

	async hasPublicKeyForEmails(recipients) {
		const
			mailvelope = mailvelopeKeyring && await mailvelopeKeyring.validKeyForAddress(recipients)
				/*.then(LookupResult => Object.entries(LookupResult))*/,
			entries = mailvelope && Object.entries(mailvelope);
		return entries && entries.filter(value => value[1]).length === recipients.length;
	},

	async getPrivateKeyFor(email/*, sign*/) {
		if (mailvelopeKeyring && await mailvelopeKeyring.hasPrivateKey({email:email})) {
			return ['mailvelope', email];
		}
		return false;
	},

	async decrypt(message) {
		// Try Mailvelope (does not support inline images)
		if (mailvelopeKeyring) {
			const sender = message.from[0].email,
				armoredText = message.plain();
			try {
				let emails = [...message.from,...message.to,...message.cc].validUnique(),
					i = emails.length;
				while (i--) {
					if (await this.getPrivateKeyFor(emails[i].email)) {
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
	}
	/**
	 * Returns headers that should be added to an outgoing email.
	 * So far this is only the autocrypt header.
	 */
/*
	mailvelopeKeyring.additionalHeadersForOutgoingEmail(from: 'abc@web.de')
	.then(function(additional) {
		console.log('additionalHeadersForOutgoingEmail', additional);
		// logs: {autocrypt: "addr=abc@web.de; prefer-encrypt=mutual; keydata=..."}
	});

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
