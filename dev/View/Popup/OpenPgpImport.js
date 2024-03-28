import { addObservablesTo } from 'External/ko';
import { GnuPGUserStore } from 'Stores/User/GnuPG';
import { PgpUserStore } from 'Stores/User/Pgp';

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
		const fn = () => Remote.request('PgpSearchKey',
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
		fetch(
			`https://keys.openpgp.org/pks/lookup?op=get&options=mr&search=${this.search()}`,
			{
				method: 'GET',
				mode: 'cors',
				cache: 'no-cache',
				redirect: 'error',
				referrerPolicy: 'no-referrer',
				credentials: 'omit'
			}
		)
		.then(response => {
			if ('application/pgp-keys' == response.headers.get('Content-Type')) {
				response.text().then(body => this.key(body));
			} else {
				fn();
			}
		})
		.catch(e => {
			this.key('keys.openpgp.org: ' + e?.message + '\nTrying local...');
			fn();
			throw e;
		});
	}

	submitForm() {
		let keyTrimmed = this.key().trim();

		if (/\n/.test(keyTrimmed)) {
			keyTrimmed = keyTrimmed.replace(/\r+/g, '').replace(/\n{2,}/g, '\n\n');
		}

		this.keyError(!keyTrimmed);
		this.keyErrorMessage('');

		if (keyTrimmed) {
			let match = null,
				count = 30,
				done = false;
			const GnuPG = this.saveGnuPG() && GnuPGUserStore.isSupported(),
				backup = this.saveServer(),
				// eslint-disable-next-line max-len
				reg = /[-]{3,6}BEGIN[\s]PGP[\s](PRIVATE|PUBLIC)[\s]KEY[\s]BLOCK[-]{3,6}[\s\S]+?[-]{3,6}END[\s]PGP[\s](PRIVATE|PUBLIC)[\s]KEY[\s]BLOCK[-]{3,6}/gi;

			do {
				match = reg.exec(keyTrimmed);
				if (match && 0 < count) {
					if (match[0] && match[1] && match[2] && match[1] === match[2]) {
						PgpUserStore.importKey(this.key(), GnuPG, backup);
					}
					--count;
					done = false;
				} else {
					done = true;
				}
			} while (!done);

			this.close();
		}
	}

	onShow(key) {
		this.key(key || '');
		this.keyError(false);
		this.keyErrorMessage('');
	}
}
