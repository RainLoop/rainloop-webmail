import { pInt, pString } from 'Common/Utils';
import { i18n, getNotification } from 'Common/Translator';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { DomainAdminStore } from 'Stores/Admin/Domain';

class DomainPopupView extends AbstractViewPopup {
	constructor() {
		super('Domain');

		this.addObservables({
			edit: false,
			saving: false,
			savingError: '',
			page: 'main',
			sieveSettings: false,

			testing: false,
			testingDone: false,
			testingImapError: false,
			testingSieveError: false,
			testingSmtpError: false,
			testingImapErrorDesc: '',
			testingSieveErrorDesc: '',
			testingSmtpErrorDesc: '',

			imapServerFocus: false,
			sieveServerFocus: false,
			smtpServerFocus: false,

			name: '',

			imapServer: '',
			imapPort: '143',
			imapSecure: 0,
			imapShortLogin: false,
			useSieve: false,
			sieveServer: '',
			sievePort: '4190',
			sieveSecure: 0,
			smtpServer: '',
			smtpPort: '25',
			smtpSecure: 0,
			smtpShortLogin: false,
			smtpAuth: true,
			smtpSetSender: false,
			smtpPhpMail: false,
			whiteList: '',
			aliasName: '',

			enableSmartPorts: false
		});

		this.addComputables({
			headerText: () => {
				const name = this.name(),
					aliasName = this.aliasName();

				let result = '';

				if (this.edit()) {
					result = i18n('POPUPS_DOMAIN/TITLE_EDIT_DOMAIN', { NAME: name });
					if (aliasName) {
						result += ' ← ' + aliasName;
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
					this.imapServer() &&
					this.imapPort() &&
					(useSieve ? this.sieveServer() && this.sievePort() : true) &&
					((this.smtpServer() && this.smtpPort()) || usePhpMail)
				);
			},

			canBeTested: () => !this.testing() && this.domainIsComputed(),
			canBeSaved: () => !this.saving() && this.domainIsComputed()
		});

		this.addSubscribables({
			testingImapError: value => value || this.testingImapErrorDesc(''),
			testingSieveError: value => value || this.testingSieveErrorDesc(''),
			testingSmtpError: value => value || this.testingSmtpErrorDesc(''),

			page: () => this.sieveSettings(false),

			// smart form improvements
			imapServerFocus: value =>
				value && this.name() && !this.imapServer() && this.imapServer(this.name().replace(/[.]?[*][.]?/g, '')),

			sieveServerFocus: value =>
				value && this.imapServer() && !this.sieveServer() && this.sieveServer(this.imapServer()),

			smtpServerFocus: value => value && this.imapServer() && !this.smtpServer()
				&& this.smtpServer(this.imapServer().replace(/imap/gi, 'smtp')),

			imapSecure: value => {
				if (this.enableSmartPorts()) {
					const port = pInt(this.imapPort());
					switch (pString(value)) {
						case '0':
						case '2':
							if (993 === port) {
								this.imapPort('143');
							}
							break;
						case '1':
							if (143 === port) {
								this.imapPort('993');
							}
							break;
						// no default
					}
				}
			},

			smtpSecure: value => {
				if (this.enableSmartPorts()) {
					const port = pInt(this.smtpPort());
					switch (pString(value)) {
						case '0':
							if (465 === port || 587 === port) {
								this.smtpPort('25');
							}
							break;
						case '1':
							if (25 === port || 587 === port) {
								this.smtpPort('465');
							}
							break;
						case '2':
							if (25 === port || 465 === port) {
								this.smtpPort('587');
							}
							break;
						// no default
					}
				}
			}
		});

		decorateKoCommands(this, {
			createOrAddCommand: self => self.canBeSaved(),
			testConnectionCommand: self => self.canBeTested(),
			whiteListCommand: 1,
			backCommand: 1,
			sieveCommand: 1
		});
	}

	createOrAddCommand() {
		this.saving(true);
		Remote.createOrUpdateDomain(
			this.onDomainCreateOrSaveResponse.bind(this),
			this
		);
	}

	testConnectionCommand() {
		this.page('main');

		this.testingDone(false);
		this.testingImapError(false);
		this.testingSieveError(false);
		this.testingSmtpError(false);
		this.testing(true);

		Remote.testConnectionForDomain(
			(iError, oData) => {
				this.testing(false);
				if (iError) {
					this.testingImapError(true);
					this.testingSieveError(true);
					this.testingSmtpError(true);
					this.sieveSettings(false);
				} else {
					let bImap = false,
						bSieve = false;

					this.testingDone(true);
					this.testingImapError(true !== oData.Result.Imap);
					this.testingSieveError(true !== oData.Result.Sieve);
					this.testingSmtpError(true !== oData.Result.Smtp);

					if (this.testingImapError() && oData.Result.Imap) {
						bImap = true;
						this.testingImapErrorDesc('');
						this.testingImapErrorDesc(oData.Result.Imap);
					}

					if (this.testingSieveError() && oData.Result.Sieve) {
						bSieve = true;
						this.testingSieveErrorDesc('');
						this.testingSieveErrorDesc(oData.Result.Sieve);
					}

					if (this.testingSmtpError() && oData.Result.Smtp) {
						this.testingSmtpErrorDesc('');
						this.testingSmtpErrorDesc(oData.Result.Smtp);
					}

					if (this.sieveSettings()) {
						if (!bSieve && bImap) {
							this.sieveSettings(false);
						}
					} else if (bSieve && !bImap) {
						this.sieveSettings(true);
					}
				}
			},
			this
		);
	}

	whiteListCommand() {
		this.page('white-list');
	}

	backCommand() {
		this.page('main');
	}

	sieveCommand() {
		this.sieveSettings(!this.sieveSettings());
		this.clearTesting();
	}

	onDomainCreateOrSaveResponse(iError) {
		this.saving(false);
		if (iError) {
			this.savingError(getNotification(iError));
		} else {
			DomainAdminStore.fetch();
			this.closeCommand();
		}
	}

	clearTesting() {
		this.testing(false);
		this.testingDone(false);
		this.testingImapError(false);
		this.testingSieveError(false);
		this.testingSmtpError(false);
	}

	onHide() {
		this.page('main');
		this.sieveSettings(false);
	}

	onShow(oDomain) {
		this.saving(false);

		this.page('main');
		this.sieveSettings(false);

		this.clearTesting();

		this.clearForm();
		if (oDomain) {
			this.enableSmartPorts(false);

			this.edit(true);

			this.name(oDomain.Name);
			this.imapServer(oDomain.IncHost);
			this.imapPort('' + pInt(oDomain.IncPort));
			this.imapSecure(oDomain.IncSecure);
			this.imapShortLogin(!!oDomain.IncShortLogin);
			this.useSieve(!!oDomain.UseSieve);
			this.sieveServer(oDomain.SieveHost);
			this.sievePort('' + pInt(oDomain.SievePort));
			this.sieveSecure(oDomain.SieveSecure);
			this.smtpServer(oDomain.OutHost);
			this.smtpPort('' + pInt(oDomain.OutPort));
			this.smtpSecure(oDomain.OutSecure);
			this.smtpShortLogin(!!oDomain.OutShortLogin);
			this.smtpAuth(!!oDomain.OutAuth);
			this.smtpSetSender(!!oDomain.OutSetSender);
			this.smtpPhpMail(!!oDomain.OutUsePhpMail);
			this.whiteList(oDomain.WhiteList);
			this.aliasName(oDomain.AliasName);

			this.enableSmartPorts(true);
		}
	}

	clearForm() {
		this.edit(false);

		this.page('main');
		this.sieveSettings(false);

		this.enableSmartPorts(false);

		this.savingError('');

		this.name('');

		this.imapServer('');
		this.imapPort('143');
		this.imapSecure(0);
		this.imapShortLogin(false);

		this.useSieve(false);
		this.sieveServer('');
		this.sievePort('4190');
		this.sieveSecure(0);

		this.smtpServer('');
		this.smtpPort('25');
		this.smtpSecure(0);
		this.smtpShortLogin(false);
		this.smtpAuth(true);
		this.smtpSetSender(true);
		this.smtpPhpMail(false);

		this.whiteList('');
		this.aliasName('');
		this.enableSmartPorts(true);
	}
}

export { DomainPopupView, DomainPopupView as default };
