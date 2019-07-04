import _ from '_';
import $ from '$';
import ko from 'ko';
import key from 'key';

import { inArray, pString, log, isUnd, trim, defautOptionsAfterRender } from 'Common/Utils';

import { Magics, KeyState } from 'Common/Enums';
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
		this.password.focus = ko.observable(false);
		this.buttonFocus = ko.observable(false);

		this.text = ko.observable('');
		this.selectedPrivateKey = ko.observable(null);
		this.selectedPublicKey = ko.observable(null);

		this.signKey = ko.observable(null);
		this.encryptKeys = ko.observableArray([]);

		this.encryptKeysView = ko.computed(() => _.compact(_.map(this.encryptKeys(), (oKey) => (oKey ? oKey.key : null))));

		this.privateKeysOptions = ko.computed(() => {
			const opts = _.map(PgpStore.openpgpkeysPrivate(), (oKey, iIndex) => {
				if (this.signKey() && this.signKey().key.id === oKey.id) {
					return null;
				}
				return _.map(oKey.users, (user) => ({
					'id': oKey.guid,
					'name': '(' + oKey.id.substr(KEY_NAME_SUBSTR).toUpperCase() + ') ' + user,
					'key': oKey,
					'class': iIndex % 2 ? 'odd' : 'even'
				}));
			});

			return _.compact(_.flatten(opts, true));
		});

		this.publicKeysOptions = ko.computed(() => {
			const opts = _.map(PgpStore.openpgpkeysPublic(), (oKey, index) => {
				if (-1 < inArray(oKey, this.encryptKeysView())) {
					return null;
				}
				return _.map(oKey.users, (user) => ({
					'id': oKey.guid,
					'name': '(' + oKey.id.substr(KEY_NAME_SUBSTR).toUpperCase() + ') ' + user,
					'key': oKey,
					'class': index % 2 ? 'odd' : 'even'
				}));
			});
			return _.compact(_.flatten(opts, true));
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

			if (item && !isUnd(item.class) && domOption) {
				$(domOption).addClass(item.class);
			}
		};

		this.deletePublickKey = _.bind(this.deletePublickKey, this);
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
			if (0 === this.encryptKeys().length) {
				this.notification(i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND'));
				result = false;
			} else if (this.encryptKeys()) {
				aPublicKeys = [];

				_.each(this.encryptKeys(), (oKey) => {
					if (oKey && oKey.key) {
						aPublicKeys = aPublicKeys.concat(_.compact(_.flatten(oKey.key.getNativeKeys())));
					} else if (oKey && oKey.email) {
						this.notification(
							i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND_FOR', {
								'EMAIL': oKey.email
							})
						);

						result = false;
					}
				});

				if (result && (0 === aPublicKeys.length || this.encryptKeys().length !== aPublicKeys.length)) {
					result = false;
				}
			}
		}

		if (result && this.resultCallback) {
			_.delay(() => {
				let pgpPromise = null;

				try {
					if (privateKey && 0 === aPublicKeys.length) {
						pgpPromise = PgpStore.openpgp.sign({
							data: this.text(),
							privateKeys: [privateKey]
						});
					} else if (privateKey && 0 < aPublicKeys.length) {
						pgpPromise = PgpStore.openpgp.encrypt({
							data: this.text(),
							publicKeys: aPublicKeys,
							privateKeys: [privateKey]
						});
					} else if (!privateKey && 0 < aPublicKeys.length) {
						pgpPromise = PgpStore.openpgp.encrypt({
							data: this.text(),
							publicKeys: aPublicKeys
						});
					}
				} catch (e) {
					log(e);

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
			}, Magics.Time20ms);
		} else {
			this.submitRequest(false);
		}

		return result;
	}

	@command()
	selectCommand() {
		const keyId = this.selectedPrivateKey(),
			option = keyId ? _.find(this.privateKeysOptions(), (item) => item && keyId === item.id) : null;

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
			option = keyId ? _.find(this.publicKeysOptions(), (item) => item && keyId === item.id) : null;

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
		_.each(this.encryptKeys(), (oKey) => {
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
		this.password.focus(false);
		this.buttonFocus(false);

		this.signKey(null);
		this.encryptKeys([]);
		this.text('');

		this.resultCallback = null;
	}

	onBuild() {
		key('tab,shift+tab', KeyState.PopupComposeOpenPGP, () => {
			switch (true) {
				case this.password.focus():
					this.buttonFocus(true);
					break;
				case this.buttonFocus():
					this.password.focus(true);
					break;
				// no default
			}
			return false;
		});
	}

	onHideWithDelay() {
		this.clearPopup();
	}

	onShowWithDelay() {
		if (this.sign()) {
			this.password.focus(true);
		} else {
			this.buttonFocus(true);
		}
	}

	onShow(fCallback, sText, identity, sTo, sCc, sBcc) {
		this.clearPopup();

		let rec = [],
			emailLine = '';

		const email = new EmailModel();

		this.resultCallback = fCallback;

		if ('' !== sTo) {
			rec.push(sTo);
		}

		if ('' !== sCc) {
			rec.push(sCc);
		}

		if ('' !== sBcc) {
			rec.push(sBcc);
		}

		rec = rec.join(', ').split(',');
		rec = _.compact(
			_.map(rec, (value) => {
				email.clear();
				email.parse(trim(value));
				return '' === email.email ? false : email.email;
			})
		);

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

		if (rec && 0 < rec.length) {
			this.encryptKeys(
				_.uniq(
					_.compact(
						_.flatten(
							_.map(rec, (recEmail) => {
								const keys = PgpStore.findAllPublicKeysByEmailNotNative(recEmail);
								return keys
									? _.map(keys, (publicKey) => ({
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
							}),
							true
						)
					),
					(encryptKey) => encryptKey.hash
				)
			);

			if (0 < this.encryptKeys().length) {
				this.encrypt(true);
			}
		}

		this.text(sText);
	}
}

export { ComposeOpenPgpPopupView, ComposeOpenPgpPopupView as default };
