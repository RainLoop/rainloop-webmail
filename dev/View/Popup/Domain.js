import _ from '_';
import ko from 'ko';

import { StorageResultType, ServerSecure, Ports, Notification } from 'Common/Enums';
import { IMAP_DEFAULT_PORT, SIEVE_DEFAULT_PORT, SMTP_DEFAULT_PORT } from 'Common/Consts';
import { bMobileDevice } from 'Common/Globals';
import { trim, pInt, pString } from 'Common/Utils';
import { i18n } from 'Common/Translator';

import CapaAdminStore from 'Stores/Admin/Capa';

import Remote from 'Remote/Admin/Ajax';

import { getApp } from 'Helper/Apps/Admin';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/Domain',
	templateID: 'PopupsDomain'
})
class DomainPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.edit = ko.observable(false);
		this.saving = ko.observable(false);
		this.savingError = ko.observable('');
		this.page = ko.observable('main');
		this.sieveSettings = ko.observable(false);

		this.testing = ko.observable(false);
		this.testingDone = ko.observable(false);
		this.testingImapError = ko.observable(false);
		this.testingSieveError = ko.observable(false);
		this.testingSmtpError = ko.observable(false);
		this.testingImapErrorDesc = ko.observable('');
		this.testingSieveErrorDesc = ko.observable('');
		this.testingSmtpErrorDesc = ko.observable('');

		this.testingImapError.subscribe((value) => {
			if (!value) {
				this.testingImapErrorDesc('');
			}
		});

		this.testingSieveError.subscribe((value) => {
			if (!value) {
				this.testingSieveErrorDesc('');
			}
		});

		this.testingSmtpError.subscribe((value) => {
			if (!value) {
				this.testingSmtpErrorDesc('');
			}
		});

		this.imapServerFocus = ko.observable(false);
		this.sieveServerFocus = ko.observable(false);
		this.smtpServerFocus = ko.observable(false);

		this.name = ko.observable('');
		this.name.focused = ko.observable(false);

		this.imapServer = ko.observable('');
		this.imapPort = ko.observable('' + IMAP_DEFAULT_PORT);
		this.imapSecure = ko.observable(ServerSecure.None);
		this.imapShortLogin = ko.observable(false);
		this.useSieve = ko.observable(false);
		this.sieveAllowRaw = ko.observable(false);
		this.sieveServer = ko.observable('');
		this.sievePort = ko.observable('' + SIEVE_DEFAULT_PORT);
		this.sieveSecure = ko.observable(ServerSecure.None);
		this.smtpServer = ko.observable('');
		this.smtpPort = ko.observable('' + SMTP_DEFAULT_PORT);
		this.smtpSecure = ko.observable(ServerSecure.None);
		this.smtpShortLogin = ko.observable(false);
		this.smtpAuth = ko.observable(true);
		this.smtpPhpMail = ko.observable(false);
		this.whiteList = ko.observable('');
		this.aliasName = ko.observable('');

		this.enableSmartPorts = ko.observable(false);

		this.allowSieve = ko.computed(() => CapaAdminStore.filters() && CapaAdminStore.sieve());

		this.headerText = ko.computed(() => {
			const name = this.name(),
				aliasName = this.aliasName();

			let result = '';

			if (this.edit()) {
				result = i18n('POPUPS_DOMAIN/TITLE_EDIT_DOMAIN', { 'NAME': name });
				if (aliasName) {
					result += ' ← ' + aliasName;
				}
			} else {
				result =
					'' === name
						? i18n('POPUPS_DOMAIN/TITLE_ADD_DOMAIN')
						: i18n('POPUPS_DOMAIN/TITLE_ADD_DOMAIN_WITH_NAME', { 'NAME': name });
			}

			return result;
		});

		this.domainDesc = ko.computed(() => {
			const name = this.name();
			return !this.edit() && name ? i18n('POPUPS_DOMAIN/NEW_DOMAIN_DESC', { 'NAME': '*@' + name }) : '';
		});

		this.domainIsComputed = ko.computed(() => {
			const usePhpMail = this.smtpPhpMail(),
				allowSieve = this.allowSieve(),
				useSieve = this.useSieve();

			return (
				'' !== this.name() &&
				'' !== this.imapServer() &&
				'' !== this.imapPort() &&
				(allowSieve && useSieve ? '' !== this.sieveServer() && '' !== this.sievePort() : true) &&
				(('' !== this.smtpServer() && '' !== this.smtpPort()) || usePhpMail)
			);
		});

		this.canBeTested = ko.computed(() => !this.testing() && this.domainIsComputed());
		this.canBeSaved = ko.computed(() => !this.saving() && this.domainIsComputed());

		this.page.subscribe(() => {
			this.sieveSettings(false);
		});

		// smart form improvements
		this.imapServerFocus.subscribe((value) => {
			if (value && '' !== this.name() && '' === this.imapServer()) {
				this.imapServer(this.name().replace(/[.]?[*][.]?/g, ''));
			}
		});

		this.sieveServerFocus.subscribe((value) => {
			if (value && '' !== this.imapServer() && '' === this.sieveServer()) {
				this.sieveServer(this.imapServer());
			}
		});

		this.smtpServerFocus.subscribe((value) => {
			if (value && '' !== this.imapServer() && '' === this.smtpServer()) {
				this.smtpServer(this.imapServer().replace(/imap/gi, 'smtp'));
			}
		});

		this.imapSecure.subscribe((value) => {
			if (this.enableSmartPorts()) {
				const port = pInt(this.imapPort());
				switch (pString(value)) {
					case '0':
					case '2':
						if (Ports.ImapSsl === port) {
							this.imapPort(pString(Ports.Imap));
						}
						break;
					case '1':
						if (Ports.Imap === port) {
							this.imapPort(pString(Ports.ImapSsl));
						}
						break;
					// no default
				}
			}
		});

		this.smtpSecure.subscribe((value) => {
			if (this.enableSmartPorts()) {
				const port = pInt(this.smtpPort());
				switch (pString(value)) {
					case '0':
						if (Ports.SmtpSsl === port || Ports.SmtpStartTls === port) {
							this.smtpPort(pString(Ports.Smtp));
						}
						break;
					case '1':
						if (Ports.Smtp === port || Ports.SmtpStartTls === port) {
							this.smtpPort(pString(Ports.SmtpSsl));
						}
						break;
					case '2':
						if (Ports.Smtp === port || Ports.SmtpSsl === port) {
							this.smtpPort(pString(Ports.SmtpStartTls));
						}
						break;
					// no default
				}
			}
		});
	}

	@command((self) => self.canBeSaved())
	createOrAddCommand() {
		this.saving(true);
		Remote.createOrUpdateDomain(
			_.bind(this.onDomainCreateOrSaveResponse, this),
			!this.edit(),
			this.name(),

			this.imapServer(),
			pInt(this.imapPort()),
			this.imapSecure(),
			this.imapShortLogin(),

			this.useSieve(),
			this.sieveAllowRaw(),
			this.sieveServer(),
			pInt(this.sievePort()),
			this.sieveSecure(),

			this.smtpServer(),
			pInt(this.smtpPort()),
			this.smtpSecure(),
			this.smtpShortLogin(),
			this.smtpAuth(),
			this.smtpPhpMail(),

			this.whiteList()
		);
	}

	@command((self) => self.canBeTested())
	testConnectionCommand() {
		this.page('main');

		this.testingDone(false);
		this.testingImapError(false);
		this.testingSieveError(false);
		this.testingSmtpError(false);
		this.testing(true);

		Remote.testConnectionForDomain(
			_.bind(this.onTestConnectionResponse, this),
			this.name(),

			this.imapServer(),
			pInt(this.imapPort()),
			this.imapSecure(),

			this.useSieve(),
			this.sieveServer(),
			pInt(this.sievePort()),
			this.sieveSecure(),

			this.smtpServer(),
			pInt(this.smtpPort()),
			this.smtpSecure(),
			this.smtpAuth(),
			this.smtpPhpMail()
		);
	}

	@command()
	whiteListCommand() {
		this.page('white-list');
	}

	@command()
	backCommand() {
		this.page('main');
	}

	@command()
	sieveCommand() {
		this.sieveSettings(!this.sieveSettings());
		this.clearTesting();
	}

	onTestConnectionResponse(sResult, oData) {
		this.testing(false);
		if (StorageResultType.Success === sResult && oData.Result) {
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
		} else {
			this.testingImapError(true);
			this.testingSieveError(true);
			this.testingSmtpError(true);
			this.sieveSettings(false);
		}
	}

	onDomainCreateOrSaveResponse(sResult, oData) {
		this.saving(false);
		if (StorageResultType.Success === sResult && oData) {
			if (oData.Result) {
				getApp().reloadDomainList();
				this.closeCommand();
			} else if (Notification.DomainAlreadyExists === oData.ErrorCode) {
				this.savingError(i18n('ERRORS/DOMAIN_ALREADY_EXISTS'));
			}
		} else {
			this.savingError(i18n('ERRORS/UNKNOWN_ERROR'));
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

			this.name(trim(oDomain.Name));
			this.imapServer(trim(oDomain.IncHost));
			this.imapPort('' + pInt(oDomain.IncPort));
			this.imapSecure(trim(oDomain.IncSecure));
			this.imapShortLogin(!!oDomain.IncShortLogin);
			this.useSieve(!!oDomain.UseSieve);
			this.sieveAllowRaw(!!oDomain.SieveAllowRaw);
			this.sieveServer(trim(oDomain.SieveHost));
			this.sievePort('' + pInt(oDomain.SievePort));
			this.sieveSecure(trim(oDomain.SieveSecure));
			this.smtpServer(trim(oDomain.OutHost));
			this.smtpPort('' + pInt(oDomain.OutPort));
			this.smtpSecure(trim(oDomain.OutSecure));
			this.smtpShortLogin(!!oDomain.OutShortLogin);
			this.smtpAuth(!!oDomain.OutAuth);
			this.smtpPhpMail(!!oDomain.OutUsePhpMail);
			this.whiteList(trim(oDomain.WhiteList));
			this.aliasName(trim(oDomain.AliasName));

			this.enableSmartPorts(true);
		}
	}

	onShowWithDelay() {
		if ('' === this.name() && !bMobileDevice) {
			this.name.focused(true);
		}
	}

	clearForm() {
		this.edit(false);

		this.page('main');
		this.sieveSettings(false);

		this.enableSmartPorts(false);

		this.savingError('');

		this.name('');
		this.name.focused(false);

		this.imapServer('');
		this.imapPort('' + IMAP_DEFAULT_PORT);
		this.imapSecure(ServerSecure.None);
		this.imapShortLogin(false);

		this.useSieve(false);
		this.sieveAllowRaw(false);
		this.sieveServer('');
		this.sievePort('' + SIEVE_DEFAULT_PORT);
		this.sieveSecure(ServerSecure.None);

		this.smtpServer('');
		this.smtpPort('' + SMTP_DEFAULT_PORT);
		this.smtpSecure(ServerSecure.None);
		this.smtpShortLogin(false);
		this.smtpAuth(true);
		this.smtpPhpMail(false);

		this.whiteList('');
		this.aliasName('');
		this.enableSmartPorts(true);
	}
}

export { DomainPopupView, DomainPopupView as default };
