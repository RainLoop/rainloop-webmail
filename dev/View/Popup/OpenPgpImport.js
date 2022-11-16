import { addObservablesTo } from 'External/ko';
import { GnuPGUserStore } from 'Stores/User/GnuPG';
import { OpenPGPUserStore } from 'Stores/User/OpenPGP';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class OpenPgpImportPopupView extends AbstractViewPopup {
	constructor() {
		super('OpenPgpImport');

		addObservablesTo(this, {
			key: '',
			keyError: false,
			keyErrorMessage: '',

			saveGnuPG: true,
			saveServer: false
		});

		this.canGnuPG = GnuPGUserStore.isSupported();

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
					this.saveGnuPG() && GnuPGUserStore.isSupported() && GnuPGUserStore.importKey(this.key(), (iError, oData) => {
						iError && alert(oData.ErrorMessage);
					});
					OpenPGPUserStore.isSupported() && OpenPGPUserStore.importKey(this.key());
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

		this.close();
	}

	onShow(key) {
		this.key(key || '');
		this.keyError(false);
		this.keyErrorMessage('');
	}
}
