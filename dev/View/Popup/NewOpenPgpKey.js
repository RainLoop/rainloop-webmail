import { pInt } from 'Common/Utils';

import { PgpUserStore } from 'Stores/User/Pgp';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

class NewOpenPgpKeyPopupView extends AbstractViewPopup {
	constructor() {
		super('NewOpenPgpKey');

		this.addObservables({
			email: '',
			emailError: false,

			name: '',
			password: '',
			keyBitLength: 4096,

			submitRequest: false,
			submitError: ''
		});

		this.email.subscribe(() => this.emailError(false));

		decorateKoCommands(this, {
			generateOpenPgpKeyCommand: 1
		});
	}

	generateOpenPgpKeyCommand() {
		const userId = {},
			openpgpKeyring = PgpUserStore.openpgpKeyring;

		this.emailError(!this.email().trim());
		if (!openpgpKeyring || this.emailError()) {
			return false;
		}

		userId.email = this.email();
		if (this.name()) {
			userId.name = this.name();
		}

		this.submitRequest(true);
		this.submitError('');

		setTimeout(() => {
			try {
				PgpUserStore.openpgp
					.generateKey({
						userIds: [userId],
						numBits: pInt(this.keyBitLength()),
						passphrase: this.password().trim()
					})
					.then((keyPair) => {
						this.submitRequest(false);

						if (keyPair && keyPair.privateKeyArmored) {
							openpgpKeyring.privateKeys.importKey(keyPair.privateKeyArmored);
							openpgpKeyring.publicKeys.importKey(keyPair.publicKeyArmored);

							openpgpKeyring.store();

							rl.app.reloadOpenPgpKeys();
							this.cancelCommand();
						}
					})
					.catch((e) => {
						this.submitRequest(false);
						this.showError(e);
					});
			} catch (e) {
				this.submitRequest(false);
				this.showError(e);
			}
		}, 100);

		return true;
	}

	showError(e) {
		console.log(e);
		if (e && e.message) {
			this.submitError(e.message);
		}
	}

	clearPopup() {
		this.name('');
		this.password('');

		this.email('');
		this.emailError(false);
		this.keyBitLength(4096);

		this.submitError('');
	}

	onShow() {
		this.clearPopup();
	}
}

export { NewOpenPgpKeyPopupView, NewOpenPgpKeyPopupView as default };
