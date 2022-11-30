import { addObservablesTo } from 'External/ko';
//import { pInt } from 'Common/Utils';

import { GnuPGUserStore } from 'Stores/User/GnuPG';
import { OpenPGPUserStore } from 'Stores/User/OpenPGP';

import { IdentityUserStore } from 'Stores/User/Identity';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { SettingsCapa } from 'Common/Globals';

export class OpenPgpGeneratePopupView extends AbstractViewPopup {
	constructor() {
		super('OpenPgpGenerate');

		this.identities = IdentityUserStore;

		addObservablesTo(this, {
			email: '',
			emailError: false,

			name: '',
			password: '',
			keyType: 'ECC',

			submitRequest: false,
			submitError: '',

			backupPublicKey: true,
			backupPrivateKey: false,

			saveGnuPGPublic: true,
			saveGnuPGPrivate: false
		});

		this.canGnuPG = SettingsCapa('GnuPG');

		this.email.subscribe(() => this.emailError(false));
	}

	submitForm() {
		const type = this.keyType().toLowerCase(),
			userId = {
				name: this.name(),
				email: this.email()
			},
			cfg = {
				type: type,
				userIDs: [userId],
				passphrase: this.password().trim()
//				format: 'armored' // output key format, defaults to 'armored' (other options: 'binary' or 'object')
			}
/*
		if ('ecc' === type) {
			cfg.curve = 'curve25519';
		} else {
			cfg.rsaBits = pInt(this.keyBitLength());
		}
*/
		this.emailError(!this.email().trim());
		if (this.emailError()) {
			return;
		}

		this.submitRequest(true);
		this.submitError('');

		openpgp.generateKey(cfg).then(keyPair => {
			if (keyPair) {
				const fn = () => {
					this.submitRequest(false);
					this.close();
				};

				OpenPGPUserStore.storeKeyPair(keyPair);

				keyPair.onServer = (this.backupPublicKey() ? 1 : 0) + (this.backupPrivateKey() ? 2 : 0);
				keyPair.inGnuPG = (this.saveGnuPGPublic() ? 1 : 0) + (this.saveGnuPGPrivate() ? 2 : 0);
				if (keyPair.onServer || keyPair.inGnuPG) {
					if (!this.backupPrivateKey() && !this.saveGnuPGPrivate()) {
						delete keyPair.privateKey;
					}
					GnuPGUserStore.storeKeyPair(keyPair, fn);
				} else {
					fn();
				}
			}
		})
		.catch((e) => {
			this.submitRequest(false);
			this.showError(e);
		});
	}

	hideError() {
		this.submitError('');
	}

	showError(e) {
		console.log(e);
		if (e?.message) {
			this.submitError(e.message);
		}
	}

	onShow() {
		this.name(''/*IdentityUserStore()[0].name()*/);
		this.password('');
		this.email(''/*IdentityUserStore()[0].email()*/);
		this.emailError(false);
		this.submitError('');
	}
}
