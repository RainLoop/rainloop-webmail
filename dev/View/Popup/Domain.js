import { pInt, forEachObjectEntry } from 'Common/Utils';
import { i18n, getNotification } from 'Common/Translator';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { DomainAdminStore } from 'Stores/Admin/Domain';

import { AskPopupView } from 'View/Popup/Ask';

const domainToParams = oDomain => ({
			Name: oDomain.name(),

			IncHost: oDomain.imapHost(),
			IncPort: oDomain.imapPort(),
			IncSecure: oDomain.imapSecure(),

			UseSieve: oDomain.useSieve() ? 1 : 0,
			SieveHost: oDomain.sieveHost(),
			SievePort: oDomain.sievePort(),
			SieveSecure: oDomain.sieveSecure(),

			OutHost: oDomain.smtpHost(),
			OutPort: oDomain.smtpPort(),
			OutSecure: oDomain.smtpSecure(),
			OutAuth: oDomain.smtpAuth() ? 1 : 0,
			OutUsePhpMail: oDomain.smtpPhpMail() ? 1 : 0
		});

export class DomainPopupView extends AbstractViewPopup {
	constructor() {
		super('Domain');

		this.addObservables(this.getDefaults());
		this.addObservables({
			edit: false,

			saving: false,

			testing: false,
			testingDone: false,
			testingImapError: false,
			testingSieveError: false,
			testingSmtpError: false,
			testingImapErrorDesc: '',
			testingSieveErrorDesc: '',
			testingSmtpErrorDesc: '',

			imapHostFocus: false,
			sieveHostFocus: false,
			smtpHostFocus: false,
		});

		this.addComputables({
			headerText: () => {
				const name = this.name(),
					aliasName = this.aliasName();

				let result = '';

				if (this.edit()) {
					result = i18n('POPUPS_DOMAIN/TITLE_EDIT_DOMAIN', { NAME: name });
					if (aliasName) {
						result += ' ⫘ ' + aliasName;
					}
				} else {
					result = name
							? i18n('POPUPS_DOMAIN/TITLE_ADD_DOMAIN_WITH_NAME', { NAME: name })
							: i18n('POPUPS_DOMAIN/TITLE_ADD_DOMAIN');
				}

				return result;
			},

			domainDesc: () => {
				const name = this.name();
				return !this.edit() && name ? i18n('POPUPS_DOMAIN/NEW_DOMAIN_DESC', { NAME: '*@' + name }) : '';
			},

			domainIsComputed: () => {
				const usePhpMail = this.smtpPhpMail(),
					useSieve = this.useSieve();

				return (
					this.name() &&
					this.imapHost() &&
					this.imapPort() &&
					(useSieve ? this.sieveHost() && this.sievePort() : true) &&
					((this.smtpHost() && this.smtpPort()) || usePhpMail)
				);
			},

			canBeTested: () => !this.testing() && this.domainIsComputed(),
			canBeSaved: () => !this.saving() && this.domainIsComputed()
		});

		this.addSubscribables({
			testingImapError: value => value || this.testingImapErrorDesc(''),
			testingSieveError: value => value || this.testingSieveErrorDesc(''),
			testingSmtpError: value => value || this.testingSmtpErrorDesc(''),

			// smart form improvements
			imapHostFocus: value =>
				value && this.name() && !this.imapHost() && this.imapHost(this.name().replace(/[.]?[*][.]?/g, '')),

			sieveHostFocus: value =>
				value && this.imapHost() && !this.sieveHost() && this.sieveHost(this.imapHost()),

			smtpHostFocus: value => value && this.imapHost() && !this.smtpHost()
				&& this.smtpHost(this.imapHost().replace(/imap/gi, 'smtp')),

			imapSecure: value => {
				if (this.enableSmartPorts()) {
					const port = pInt(this.imapPort());
					switch (pInt(value)) {
						case 0:
						case 2:
							if (993 === port) {
								this.imapPort(143);
							}
							break;
						case 1:
							if (143 === port) {
								this.imapPort(993);
							}
							break;
						// no default
					}
				}
			},

			smtpSecure: value => {
				if (this.enableSmartPorts()) {
					const port = pInt(this.smtpPort());
					switch (pInt(value)) {
						case 0:
							if (465 === port || 587 === port) {
								this.smtpPort(25);
							}
							break;
						case 1:
							if (25 === port || 587 === port) {
								this.smtpPort(465);
							}
							break;
						case 2:
							if (25 === port || 465 === port) {
								this.smtpPort(587);
							}
							break;
						// no default
					}
				}
			}
		});

		decorateKoCommands(this, {
			createOrAddCommand: self => self.canBeSaved(),
			testConnectionCommand: self => self.canBeTested()
		});
	}

	createOrAddCommand() {
		this.saving(true);
		Remote.request('AdminDomainSave',
			this.onDomainCreateOrSaveResponse.bind(this),
			Object.assign(domainToParams(this), {
				Create: this.edit() ? 0 : 1,

				IncShortLogin: this.imapShortLogin() ? 1 : 0,

				OutShortLogin: this.smtpShortLogin() ? 1 : 0,
				OutSetSender: this.smtpSetSender() ? 1 : 0,

				WhiteList: this.whiteList()
			})
		);
	}

	testConnectionCommand() {
		this.clearTesting(false);
		// https://github.com/the-djmaze/snappymail/issues/477
		AskPopupView.credentials('IMAP', 'GLOBAL/TEST').then(credentials => {
			if (credentials) {
				this.testing(true);
				const params = domainToParams(this);
				params.username = credentials.username;
				params.password = credentials.password;
				Remote.request('AdminDomainTest',
					(iError, oData) => {
						this.testing(false);
						if (iError) {
							this.testingImapError(true);
							this.testingSieveError(true);
							this.testingSmtpError(true);
						} else {
							this.testingDone(true);
							this.testingImapError(true !== oData.Result.Imap);
							this.testingSieveError(true !== oData.Result.Sieve);
							this.testingSmtpError(true !== oData.Result.Smtp);

							if (this.testingImapError() && oData.Result.Imap) {
								this.testingImapErrorDesc('');
								this.testingImapErrorDesc(oData.Result.Imap);
							}

							if (this.testingSieveError() && oData.Result.Sieve) {
								this.testingSieveErrorDesc('');
								this.testingSieveErrorDesc(oData.Result.Sieve);
							}

							if (this.testingSmtpError() && oData.Result.Smtp) {
								this.testingSmtpErrorDesc('');
								this.testingSmtpErrorDesc(oData.Result.Smtp);
							}
						}
					},
					params
				);
			}
		});
	}

	onDomainCreateOrSaveResponse(iError) {
		this.saving(false);
		if (iError) {
			this.savingError(getNotification(iError));
		} else {
			DomainAdminStore.fetch();
			this.close();
		}
	}

	clearTesting() {
		this.testing(false);
		this.testingDone(false);
		this.testingImapError(false);
		this.testingSieveError(false);
		this.testingSmtpError(false);
	}

	onShow(oDomain) {
		this.saving(false);
		this.clearTesting();
		this.clearForm();
		if (oDomain) {
			this.enableSmartPorts(false);
			this.edit(true);
			forEachObjectEntry(oDomain, (key, value) => this[key]?.(value));
			this.enableSmartPorts(true);
		}
	}

	getDefaults() {
		return {
			enableSmartPorts: false,

			savingError: '',

			name: '',

			imapHost: '',
			imapPort: 143,
			imapSecure: 0,
			imapShortLogin: false,

			useSieve: false,
			sieveHost: '',
			sievePort: 4190,
			sieveSecure: 0,

			smtpHost: '',
			smtpPort: 25,
			smtpSecure: 0,
			smtpShortLogin: false,
			smtpAuth: true,
			smtpSetSender: false,
			smtpPhpMail: false,

			whiteList: '',
			aliasName: ''
		};
	}

	clearForm() {
		this.edit(false);
		forEachObjectEntry(this.getDefaults(), (key, value) => this[key](value));
		this.enableSmartPorts(true);
	}
}
