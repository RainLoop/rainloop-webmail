//import { pInt } from 'Common/Utils';

import { PgpUserStore } from 'Stores/User/Pgp';
import { IdentityUserStore } from 'Stores/User/Identity';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { Capa } from 'Common/Enums';
import { Settings } from 'Common/Globals';

export class OpenPgpGeneratePopupView extends AbstractViewPopup {
	constructor() {
		super('OpenPgpGenerate');

		this.identities = IdentityUserStore;

		this.addObservables({
			email: '',
			emailError: false,

			name: '',
			password: '',
			keyType: 'ECC',

			submitRequest: false,
			submitError: '',

			saveGnuPG: true,
			saveServer: true
		});

		this.canGnuPG = Settings.capa(Capa.GnuPG);

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
				keyPair.onServer = this.saveServer() ? 1 : 0;
				keyPair.inGnuPG = this.saveGnuPG() ? 1 : 0;
				keyPair.uid = userId;
				PgpUserStore.storeKeyPair(keyPair, ()=>{
					this.submitRequest(false);
					this.cancelCommand();
				});
			}
		})
		.catch((e) => {
			this.submitRequest(false);
			this.showError(e);
		});
	}

	showError(e) {
		console.log(e);
		if (e && e.message) {
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
