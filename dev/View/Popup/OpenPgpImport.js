import { PgpUserStore } from 'Stores/User/Pgp';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { Capa } from 'Common/Enums';
import { Settings } from 'Common/Globals';

export class OpenPgpImportPopupView extends AbstractViewPopup {
	constructor() {
		super('OpenPgpImport');

		this.addObservables({
			key: '',
			keyError: false,
			keyErrorMessage: '',

			saveGnuPG: true,
			saveServer: true
		});

		this.canGnuPG = Settings.capa(Capa.GnuPG);

		this.key.subscribe(() => {
			this.keyError(false);
			this.keyErrorMessage('');
		});
	}

	submitForm() {
		let keyTrimmed = this.key().trim();

		if (/\n/.test(keyTrimmed)) {
			keyTrimmed = keyTrimmed.replace(/\r+/g, '').replace(/\n{2,}/g, '\n\n');
		}

		this.keyError(!keyTrimmed);
		this.keyErrorMessage('');

		if (!keyTrimmed) {
			return;
		}

		let match = null,
			count = 30,
			done = false;
		// eslint-disable-next-line max-len
		const reg = /[-]{3,6}BEGIN[\s]PGP[\s](PRIVATE|PUBLIC)[\s]KEY[\s]BLOCK[-]{3,6}[\s\S]+?[-]{3,6}END[\s]PGP[\s](PRIVATE|PUBLIC)[\s]KEY[\s]BLOCK[-]{3,6}/gi;

		do {
			match = reg.exec(keyTrimmed);
			if (match && 0 < count) {
				if (match[0] && match[1] && match[2] && match[1] === match[2]) {
					let err = null;
					if (this.saveGnuPG()) {
						PgpUserStore.gnupgImportKey(this.key());
					}
					PgpUserStore.openpgpImportKey(this.key());
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

		if (this.keyError()) {
			return;
		}

		this.cancelCommand();
	}

	onShow() {
		this.key('');
		this.keyError(false);
		this.keyErrorMessage('');
	}
}
