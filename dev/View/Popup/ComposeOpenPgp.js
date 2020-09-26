import ko from 'ko';

import { pString, defautOptionsAfterRender } from 'Common/Utils';

import { KeyState } from 'Common/Enums';
import { i18n } from 'Common/Translator';

import PgpStore from 'Stores/User/Pgp';

import { EmailModel } from 'Model/Email';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

const KEY_NAME_SUBSTR = -8;

@popup({
	name: 'View/Popup/ComposeOpenPgp',
	templateID: 'PopupsComposeOpenPgp'
})
class ComposeOpenPgpPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.publicKeysOptionsCaption = i18n('PGP_NOTIFICATIONS/ADD_A_PUBLICK_KEY');
		this.privateKeysOptionsCaption = i18n('PGP_NOTIFICATIONS/SELECT_A_PRIVATE_KEY');

		this.notification = ko.observable('');

		this.sign = ko.observable(false);
		this.encrypt = ko.observable(false);

		this.password = ko.observable('');

		this.text = ko.observable('');
		this.selectedPrivateKey = ko.observable(null);
		this.selectedPublicKey = ko.observable(null);

		this.signKey = ko.observable(null);
		this.encryptKeys = ko.observableArray([]);

		this.encryptKeysView = ko.computed(
			() => this.encryptKeys().map(oKey => (oKey ? oKey.key : null)).filter(value => !!value)
		);

		this.privateKeysOptions = ko.computed(() => {
			const opts = PgpStore.openpgpkeysPrivate().map((oKey, iIndex) => {
				if (this.signKey() && this.signKey().key.id === oKey.id) {
					return null;
				}
				return oKey.users.map(user => ({
					'id': oKey.guid,
					'name': '(' + oKey.id.substr(KEY_NAME_SUBSTR).toUpperCase() + ') ' + user,
					'key': oKey,
					'class': iIndex % 2 ? 'odd' : 'even'
				}));
			});

			return opts.flat().filter(value => !!value);
		});

		this.publicKeysOptions = ko.computed(() => {
			const opts = PgpStore.openpgpkeysPublic().map((oKey, index) => {
				if (this.encryptKeysView().includes(oKey)) {
					return null;
				}
				return oKey.users.map(user => ({
					'id': oKey.guid,
					'name': '(' + oKey.id.substr(KEY_NAME_SUBSTR).toUpperCase() + ') ' + user,
					'key': oKey,
					'class': index % 2 ? 'odd' : 'even'
				}));
			});
			return opts.flat().filter(value => !!value);
		});

		this.submitRequest = ko.observable(false);

		this.resultCallback = null;

		this.selectedPrivateKey.subscribe((value) => {
			if (value) {
				this.selectCommand();
				this.updateCommand();
			}
		});

		this.selectedPublicKey.subscribe((value) => {
			if (value) {
				this.addCommand();
			}
		});

		this.sDefaultKeyScope = KeyState.PopupComposeOpenPGP;

		this.defautOptionsAfterRender = defautOptionsAfterRender;

		this.addOptionClass = (domOption, item) => {
			this.defautOptionsAfterRender(domOption, item);

			if (item && undefined !== item.class && domOption) {
				domOption.classList.add(item.class);
			}
		};

		this.deletePublickKey = this.deletePublickKey.bind(this);
	}

	@command((self) => !self.submitRequest() && (self.sign() || self.encrypt()))
	doCommand() {
		let result = true,
			privateKey = null,
			aPublicKeys = [];

		this.submitRequest(true);

		if (result && this.sign()) {
			if (!this.signKey()) {
				this.notification(i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND'));
				result = false;
			} else if (!this.signKey().key) {
				this.notification(
					i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND_FOR', {
						'EMAIL': this.signKey().email
					})
				);

				result = false;
			}

			if (result) {
				const privateKeys = this.signKey().key.getNativeKeys();
				privateKey = privateKeys[0] || null;

				try {
					if (privateKey) {
						privateKey.decrypt(pString(this.password()));
					}
				} catch (e) {
					privateKey = null;
				}

				if (!privateKey) {
					this.notification(i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND'));
					result = false;
				}
			}
		}

		if (result && this.encrypt()) {
			if (!this.encryptKeys().length) {
				this.notification(i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND'));
				result = false;
			} else if (this.encryptKeys()) {
				aPublicKeys = [];

				this.encryptKeys().forEach(oKey => {
					if (oKey && oKey.key) {
						aPublicKeys = aPublicKeys.concat(oKey.key.getNativeKeys().flat(Infinity).filter(value => !!value));
					} else if (oKey && oKey.email) {
						this.notification(
							i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND_FOR', {
								'EMAIL': oKey.email
							})
						);

						result = false;
					}
				});

				if (result && (!aPublicKeys.length || this.encryptKeys().length !== aPublicKeys.length)) {
					result = false;
				}
			}
		}

		if (result && this.resultCallback) {
			setTimeout(() => {
				let pgpPromise = null;

				try {
					if (aPublicKeys.length) {
						if (privateKey) {
							pgpPromise = PgpStore.openpgp.encrypt({
								data: this.text(),
								publicKeys: aPublicKeys,
								privateKeys: [privateKey]
							});
						} else {
							pgpPromise = PgpStore.openpgp.encrypt({
								data: this.text(),
								publicKeys: aPublicKeys
							});
						}
					} else if (privateKey) {
						pgpPromise = PgpStore.openpgp.sign({
							data: this.text(),
							privateKeys: [privateKey]
						});
					}
				} catch (e) {
					console.log(e);

					this.notification(
						i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
							'ERROR': '' + e
						})
					);
				}

				if (pgpPromise) {
					try {
						pgpPromise
							.then((mData) => {
								this.resultCallback(mData.data);
								this.cancelCommand();
							})
							.catch((e) => {
								this.notification(
									i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
										'ERROR': '' + e
									})
								);
							});
					} catch (e) {
						this.notification(
							i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
								'ERROR': '' + e
							})
						);
					}
				}

				this.submitRequest(false);
			}, 20);
		} else {
			this.submitRequest(false);
		}

		return result;
	}

	@command()
	selectCommand() {
		const keyId = this.selectedPrivateKey(),
			option = keyId ? this.privateKeysOptions().find(item => item && keyId === item.id) : null;

		if (option) {
			this.signKey({
				'empty': !option.key,
				'selected': ko.observable(!!option.key),
				'users': option.key.users,
				'hash': option.key.id.substr(KEY_NAME_SUBSTR).toUpperCase(),
				'key': option.key
			});
		}
	}

	@command()
	addCommand() {
		const keyId = this.selectedPublicKey(),
			keys = this.encryptKeys(),
			option = keyId ? this.publicKeysOptions().find(item => item && keyId === item.id) : null;

		if (option) {
			keys.push({
				'empty': !option.key,
				'selected': ko.observable(!!option.key),
				'removable': ko.observable(!this.sign() || !this.signKey() || this.signKey().key.id !== option.key.id),
				'users': option.key.users,
				'hash': option.key.id.substr(KEY_NAME_SUBSTR).toUpperCase(),
				'key': option.key
			});

			this.encryptKeys(keys);
		}
	}

	@command()
	updateCommand() {
		this.encryptKeys().forEach(oKey => {
			oKey.removable(!this.sign() || !this.signKey() || this.signKey().key.id !== oKey.key.id);
		});
	}

	deletePublickKey(publicKey) {
		this.encryptKeys.remove(publicKey);
	}

	clearPopup() {
		this.notification('');

		this.sign(false);
		this.encrypt(false);

		this.password('');

		this.signKey(null);
		this.encryptKeys([]);
		this.text('');

		this.resultCallback = null;
	}

	onBuild() {
//		shortcuts.add('tab', 'shift', KeyState.PopupComposeOpenPGP, () => {
		shortcuts.add('tab', '', KeyState.PopupComposeOpenPGP, () => {
			let btn = this.querySelector('.inputPassword');
			if (btn.matches(':focus')) {
				btn = this.querySelector('.buttonDo');
			}
			btn.focus();
			return false;
		});
	}

	onHideWithDelay() {
		this.clearPopup();
	}

	onShowWithDelay() {
		this.querySelector(this.sign() ? '.inputPassword' : '.buttonDo').focus();
	}

	onShow(fCallback, sText, identity, sTo, sCc, sBcc) {
		this.clearPopup();

		let rec = [],
			emailLine = '';

		const email = new EmailModel();

		this.resultCallback = fCallback;

		if (sTo) {
			rec.push(sTo);
		}

		if (sCc) {
			rec.push(sCc);
		}

		if (sBcc) {
			rec.push(sBcc);
		}

		rec = rec.join(', ').split(',');
		rec = rec.map(value => {
				email.clear();
				email.parse(value.trim());
				return email.email || false;
			}).filter(value => !!value);

		if (identity && identity.email()) {
			emailLine = identity.email();
			rec.unshift(emailLine);

			const keys = PgpStore.findAllPrivateKeysByEmailNotNative(emailLine);
			if (keys && keys[0]) {
				this.signKey({
					'users': keys[0].users || [emailLine],
					'hash': keys[0].id.substr(KEY_NAME_SUBSTR).toUpperCase(),
					'key': keys[0]
				});
			}
		}

		if (this.signKey()) {
			this.sign(true);
		}

		if (rec.length) {
			this.encryptKeys(
				rec.map(recEmail => {
					const keys = PgpStore.findAllPublicKeysByEmailNotNative(recEmail);
					return keys
						? keys.map(publicKey => ({
								'empty': !publicKey,
								'selected': ko.observable(!!publicKey),
								'removable': ko.observable(
									!this.sign() || !this.signKey() || this.signKey().key.id !== publicKey.id
								),
								'users': publicKey ? publicKey.users || [recEmail] : [recEmail],
								'hash': publicKey ? publicKey.id.substr(KEY_NAME_SUBSTR).toUpperCase() : '',
								'key': publicKey
						  }))
						: [];
				}).flat().filter(
					(encryptKey, index, self) => encryptKey => !!encryptKey.hash && self.indexOf(encryptKey) == index
				)
			);

			if (this.encryptKeys().length) {
				this.encrypt(true);
			}
		}

		this.text(sText);
	}
}

export { ComposeOpenPgpPopupView, ComposeOpenPgpPopupView as default };
