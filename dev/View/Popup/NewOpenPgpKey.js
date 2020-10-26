import { pInt } from 'Common/Utils';

import PgpStore from 'Stores/User/Pgp';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/NewOpenPgpKey',
	templateID: 'PopupsNewOpenPgpKey'
})
class NewOpenPgpKeyPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.addObservables({
			email: '',
			emailFocus: '',
			emailError: false,

			name: '',
			password: '',
			keyBitLength: 2048,

			submitRequest: false,
			submitError: ''
		});

		this.email.subscribe(() => this.emailError(false));
	}

	@command()
	generateOpenPgpKeyCommand() {
		const userId = {},
			openpgpKeyring = PgpStore.openpgpKeyring;

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
				PgpStore.openpgp
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
							this.cancelCommand && this.cancelCommand();
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
		this.keyBitLength(2048);

		this.submitError('');
	}

	onShow() {
		this.clearPopup();
	}

	onShowWithDelay() {
		this.emailFocus(true);
	}
}

export { NewOpenPgpKeyPopupView, NewOpenPgpKeyPopupView as default };
