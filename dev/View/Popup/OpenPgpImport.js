import { addObservablesTo } from 'External/ko';
import { GnuPGUserStore } from 'Stores/User/GnuPG';
import { OpenPGPUserStore } from 'Stores/User/OpenPGP';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

import Remote from 'Remote/User/Fetch';
import { i18n } from 'Common/Translator';

export class OpenPgpImportPopupView extends AbstractViewPopup {
	constructor() {
		super('OpenPgpImport');

		addObservablesTo(this, {
			search: '',

			key: '',
			keyError: false,
			keyErrorMessage: '',

			saveGnuPG: true,
			saveServer: true
		});

		this.canGnuPG = GnuPGUserStore.isSupported();

		this.key.subscribe(() => {
			this.keyError(false);
			this.keyErrorMessage('');
		});
	}

	searchPGP() {
		this.key(i18n('SUGGESTIONS/SEARCHING_DESC'));
		Remote.request('SearchPGPKey',
			(iError, oData) => {
				if (iError) {
					this.key(oData.ErrorMessage);
				} else {
					this.key(oData.Result);
				}
			}, {
				query: this.search()
			}
		);
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
					const GnuPG = this.saveGnuPG() && GnuPGUserStore.isSupported(),
						backup = this.saveServer();
					if (GnuPG || backup()) {
						Remote.request('PgpImportKey',
							(iError, oData) => {
								if (GnuPG && oData?.Result/* && (oData.Result.imported || oData.Result.secretimported)*/) {
									GnuPGUserStore.loadKeyrings();
								}
								iError && alert(oData.ErrorMessage);
							}, {
								key: this.key(),
								gnuPG: GnuPG,
								backup: backup
							}
						);
					}
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
