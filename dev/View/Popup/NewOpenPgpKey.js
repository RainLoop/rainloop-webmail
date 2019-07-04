import _ from '_';
import ko from 'ko';

import { Magics } from 'Common/Enums';
import { trim, log, delegateRun, pInt } from 'Common/Utils';

import PgpStore from 'Stores/User/Pgp';

import { getApp } from 'Helper/Apps/User';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/NewOpenPgpKey',
	templateID: 'PopupsNewOpenPgpKey'
})
class NewOpenPgpKeyPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.email = ko.observable('');
		this.email.focus = ko.observable('');
		this.email.error = ko.observable(false);

		this.name = ko.observable('');
		this.password = ko.observable('');
		this.keyBitLength = ko.observable(Magics.BitLength2048);

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');

		this.email.subscribe(() => {
			this.email.error(false);
		});
	}

	@command()
	generateOpenPgpKeyCommand() {
		const userId = {},
			openpgpKeyring = PgpStore.openpgpKeyring;

		this.email.error('' === trim(this.email()));
		if (!openpgpKeyring || this.email.error()) {
			return false;
		}

		userId.email = this.email();
		if ('' !== this.name()) {
			userId.name = this.name();
		}

		this.submitRequest(true);
		this.submitError('');

		_.delay(() => {
			try {
				PgpStore.openpgp
					.generateKey({
						userIds: [userId],
						numBits: pInt(this.keyBitLength()),
						passphrase: trim(this.password())
					})
					.then((keyPair) => {
						this.submitRequest(false);

						if (keyPair && keyPair.privateKeyArmored) {
							openpgpKeyring.privateKeys.importKey(keyPair.privateKeyArmored);
							openpgpKeyring.publicKeys.importKey(keyPair.publicKeyArmored);

							openpgpKeyring.store();

							getApp().reloadOpenPgpKeys();
							delegateRun(this, 'cancelCommand');
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
		}, Magics.Time100ms);

		return true;
	}

	showError(e) {
		log(e);
		if (e && e.message) {
			this.submitError(e.message);
		}
	}

	clearPopup() {
		this.name('');
		this.password('');

		this.email('');
		this.email.error(false);
		this.keyBitLength(Magics.BitLength2048);

		this.submitError('');
	}

	onShow() {
		this.clearPopup();
	}

	onShowWithDelay() {
		this.email.focus(true);
	}
}

export { NewOpenPgpKeyPopupView, NewOpenPgpKeyPopupView as default };
