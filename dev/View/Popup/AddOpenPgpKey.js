import { PgpUserStore } from 'Stores/User/Pgp';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

class AddOpenPgpKeyPopupView extends AbstractViewPopup {
	constructor() {
		super('AddOpenPgpKey');

		this.addObservables({
			key: '',
			keyError: false,
			keyErrorMessage: ''
		});

		this.key.subscribe(() => {
			this.keyError(false);
			this.keyErrorMessage('');
		});

		decorateKoCommands(this, {
			addOpenPgpKeyCommand: 1
		});
	}

	addOpenPgpKeyCommand() {
		// eslint-disable-next-line max-len
		const reg = /[-]{3,6}BEGIN[\s]PGP[\s](PRIVATE|PUBLIC)[\s]KEY[\s]BLOCK[-]{3,6}[\s\S]+?[-]{3,6}END[\s]PGP[\s](PRIVATE|PUBLIC)[\s]KEY[\s]BLOCK[-]{3,6}/gi,
			openpgpKeyring = PgpUserStore.openpgpKeyring;

		let keyTrimmed = this.key().trim();

		if (/[\n]/.test(keyTrimmed)) {
			keyTrimmed = keyTrimmed.replace(/[\r]+/g, '').replace(/[\n]{2,}/g, '\n\n');
		}

		this.keyError(!keyTrimmed);
		this.keyErrorMessage('');

		if (!openpgpKeyring || this.keyError()) {
			return false;
		}

		let match = null,
			count = 30,
			done = false;

		do {
			match = reg.exec(keyTrimmed);
			if (match && 0 < count) {
				if (match[0] && match[1] && match[2] && match[1] === match[2]) {
					let err = null;
					if ('PRIVATE' === match[1]) {
						err = openpgpKeyring.privateKeys.importKey(match[0]);
					} else if ('PUBLIC' === match[1]) {
						err = openpgpKeyring.publicKeys.importKey(match[0]);
					}

					if (err) {
						this.keyError(true);
						this.keyErrorMessage(err && err[0] ? '' + err[0] : '');
						console.log(err);
					}
				}

				--count;
				done = false;
			} else {
				done = true;
			}
		} while (!done);

		openpgpKeyring.store();

		rl.app.reloadOpenPgpKeys();

		if (this.keyError()) {
			return false;
		}

		this.cancelCommand();
		return true;
	}

	clearPopup() {
		this.key('');
		this.keyError(false);
		this.keyErrorMessage('');
	}

	onShow() {
		this.clearPopup();
	}
}

export { AddOpenPgpKeyPopupView, AddOpenPgpKeyPopupView as default };
