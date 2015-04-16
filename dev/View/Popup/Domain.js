
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),

		Translator = require('Common/Translator'),

		CapaAdminStore = require('Stores/Admin/Capa'),

		Remote = require('Remote/Admin/Ajax'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function DomainPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsDomain');

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

		this.testingImapError.subscribe(function (bValue) {
			if (!bValue)
			{
				this.testingImapErrorDesc('');
			}
		}, this);

		this.testingSieveError.subscribe(function (bValue) {
			if (!bValue)
			{
				this.testingSieveErrorDesc('');
			}
		}, this);

		this.testingSmtpError.subscribe(function (bValue) {
			if (!bValue)
			{
				this.testingSmtpErrorDesc('');
			}
		}, this);

		this.imapServerFocus = ko.observable(false);
		this.sieveServerFocus = ko.observable(false);
		this.smtpServerFocus = ko.observable(false);

		this.name = ko.observable('');
		this.name.focused = ko.observable(false);

		this.imapServer = ko.observable('');
		this.imapPort = ko.observable('' + Consts.Values.ImapDefaulPort);
		this.imapSecure = ko.observable(Enums.ServerSecure.None);
		this.imapShortLogin = ko.observable(false);
		this.useSieve = ko.observable(false);
		this.sieveAllowRaw = ko.observable(false);
		this.sieveServer = ko.observable('');
		this.sievePort = ko.observable('' + Consts.Values.SieveDefaulPort);
		this.sieveSecure = ko.observable(Enums.ServerSecure.None);
		this.smtpServer = ko.observable('');
		this.smtpPort = ko.observable('' + Consts.Values.SmtpDefaulPort);
		this.smtpSecure = ko.observable(Enums.ServerSecure.None);
		this.smtpShortLogin = ko.observable(false);
		this.smtpAuth = ko.observable(true);
		this.smtpPhpMail = ko.observable(false);
		this.whiteList = ko.observable('');

		this.enableSmartPorts = ko.observable(false);

		this.allowSieve = ko.computed(function () {
			return CapaAdminStore.filters() && CapaAdminStore.sieve();
		}, this);

		this.headerText = ko.computed(function () {
			var sName = this.name();
			return this.edit() ? Translator.i18n('POPUPS_DOMAIN/TITLE_EDIT_DOMAIN', {'NAME': sName}) :
				('' === sName ? Translator.i18n('POPUPS_DOMAIN/TITLE_ADD_DOMAIN') :
					Translator.i18n('POPUPS_DOMAIN/TITLE_ADD_DOMAIN_WITH_NAME', {'NAME': sName}));
		}, this);

		this.domainIsComputed = ko.computed(function () {

			var
				bPhpMail = this.smtpPhpMail(),
				bAllowSieve = this.allowSieve(),
				bUseSieve = this.useSieve()
			;

			return '' !== this.name() &&
				'' !== this.imapServer() &&
				'' !== this.imapPort() &&
				(bAllowSieve && bUseSieve ? ('' !== this.sieveServer() && '' !== this.sievePort()) : true) &&
				(('' !== this.smtpServer() && '' !== this.smtpPort()) || bPhpMail);

		}, this);

		this.canBeTested = ko.computed(function () {
			return !this.testing() && this.domainIsComputed();
		}, this);

		this.canBeSaved = ko.computed(function () {
			return !this.saving() && this.domainIsComputed();
		}, this);

		this.createOrAddCommand = Utils.createCommand(this, function () {
			this.saving(true);
			Remote.createOrUpdateDomain(
				_.bind(this.onDomainCreateOrSaveResponse, this),
				!this.edit(),
				this.name(),

				this.imapServer(),
				Utils.pInt(this.imapPort()),
				this.imapSecure(),
				this.imapShortLogin(),

				this.useSieve(),
				this.sieveAllowRaw(),
				this.sieveServer(),
				Utils.pInt(this.sievePort()),
				this.sieveSecure(),

				this.smtpServer(),
				Utils.pInt(this.smtpPort()),
				this.smtpSecure(),
				this.smtpShortLogin(),
				this.smtpAuth(),
				this.smtpPhpMail(),

				this.whiteList()
			);
		}, this.canBeSaved);

		this.testConnectionCommand = Utils.createCommand(this, function () {

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
				Utils.pInt(this.imapPort()),
				this.imapSecure(),

				this.useSieve(),
				this.sieveServer(),
				Utils.pInt(this.sievePort()),
				this.sieveSecure(),

				this.smtpServer(),
				Utils.pInt(this.smtpPort()),
				this.smtpSecure(),
				this.smtpAuth(),
				this.smtpPhpMail()
			);
		}, this.canBeTested);

		this.whiteListCommand = Utils.createCommand(this, function () {
			this.page('white-list');
		});

		this.backCommand = Utils.createCommand(this, function () {
			this.page('main');
		});

		this.sieveCommand = Utils.createCommand(this, function () {
			this.sieveSettings(!this.sieveSettings());
			this.clearTesting();
		});

		this.page.subscribe(function () {
			this.sieveSettings(false);
		}, this);

		// smart form improvements
		this.imapServerFocus.subscribe(function (bValue) {
			if (bValue && '' !== this.name() && '' === this.imapServer())
			{
				this.imapServer(this.name().replace(/[.]?[*][.]?/g, ''));
			}
		}, this);

		this.sieveServerFocus.subscribe(function (bValue) {
			if (bValue && '' !== this.imapServer() && '' === this.sieveServer())
			{
				this.sieveServer(this.imapServer());
			}
		}, this);

		this.smtpServerFocus.subscribe(function (bValue) {
			if (bValue && '' !== this.imapServer() && '' === this.smtpServer())
			{
				this.smtpServer(this.imapServer().replace(/imap/ig, 'smtp'));
			}
		}, this);

		this.imapSecure.subscribe(function (sValue) {
			if (this.enableSmartPorts())
			{
				var iPort = Utils.pInt(this.imapPort());
				sValue = Utils.pString(sValue);
				switch (sValue)
				{
					case '0':
						if (993 === iPort)
						{
							this.imapPort('143');
						}
						break;
					case '1':
						if (143 === iPort)
						{
							this.imapPort('993');
						}
						break;
				}
			}
		}, this);

		this.smtpSecure.subscribe(function (sValue) {
			if (this.enableSmartPorts())
			{
				var iPort = Utils.pInt(this.smtpPort());
				sValue = Utils.pString(sValue);
				switch (sValue)
				{
					case '0':
						if (465 === iPort || 587 === iPort)
						{
							this.smtpPort('25');
						}
						break;
					case '1':
						if (25 === iPort || 587 === iPort)
						{
							this.smtpPort('465');
						}
						break;
					case '2':
						if (25 === iPort || 465 === iPort)
						{
							this.smtpPort('587');
						}
						break;
				}
			}
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Domain', 'PopupsDomainViewModel'], DomainPopupView);
	_.extend(DomainPopupView.prototype, AbstractView.prototype);

	DomainPopupView.prototype.onTestConnectionResponse = function (sResult, oData)
	{
		this.testing(false);
		if (Enums.StorageResultType.Success === sResult && oData.Result)
		{
			var
				bImap = false,
				bSieve = false
			;

			this.testingDone(true);
			this.testingImapError(true !== oData.Result.Imap);
			this.testingSieveError(true !== oData.Result.Sieve);
			this.testingSmtpError(true !== oData.Result.Smtp);

			if (this.testingImapError() && oData.Result.Imap)
			{
				bImap = true;
				this.testingImapErrorDesc('');
				this.testingImapErrorDesc(oData.Result.Imap);
			}

			if (this.testingSieveError() && oData.Result.Sieve)
			{
				bSieve = true;
				this.testingSieveErrorDesc('');
				this.testingSieveErrorDesc(oData.Result.Sieve);
			}

			if (this.testingSmtpError() && oData.Result.Smtp)
			{
				this.testingSmtpErrorDesc('');
				this.testingSmtpErrorDesc(oData.Result.Smtp);
			}

			if (this.sieveSettings())
			{
				if (!bSieve && bImap)
				{
					this.sieveSettings(false);
				}
			}
			else
			{
				if (bSieve && !bImap)
				{
					this.sieveSettings(true);
				}
			}
		}
		else
		{
			this.testingImapError(true);
			this.testingSieveError(true);
			this.testingSmtpError(true);
			this.sieveSettings(false);
		}
	};

	DomainPopupView.prototype.onDomainCreateOrSaveResponse = function (sResult, oData)
	{
		this.saving(false);
		if (Enums.StorageResultType.Success === sResult && oData)
		{
			if (oData.Result)
			{
				require('App/Admin').reloadDomainList();
				this.closeCommand();
			}
			else if (Enums.Notification.DomainAlreadyExists === oData.ErrorCode)
			{
				this.savingError(Translator.i18n('ERRORS/DOMAIN_ALREADY_EXISTS'));
			}
		}
		else
		{
			this.savingError(Translator.i18n('ERRORS/UNKNOWN_ERROR'));
		}
	};

	DomainPopupView.prototype.clearTesting = function ()
	{
		this.testing(false);
		this.testingDone(false);
		this.testingImapError(false);
		this.testingSieveError(false);
		this.testingSmtpError(false);
	};

	DomainPopupView.prototype.onHide = function ()
	{
		this.page('main');
		this.sieveSettings(false);
	};


	DomainPopupView.prototype.onShow = function (oDomain)
	{
		this.saving(false);

		this.page('main');
		this.sieveSettings(false);

		this.clearTesting();

		this.clearForm();
		if (oDomain)
		{
			this.enableSmartPorts(false);

			this.edit(true);

			this.name(Utils.trim(oDomain.Name));
			this.imapServer(Utils.trim(oDomain.IncHost));
			this.imapPort('' + Utils.pInt(oDomain.IncPort));
			this.imapSecure(Utils.trim(oDomain.IncSecure));
			this.imapShortLogin(!!oDomain.IncShortLogin);
			this.useSieve(!!oDomain.UseSieve);
			this.sieveAllowRaw(!!oDomain.SieveAllowRaw);
			this.sieveServer(Utils.trim(oDomain.SieveHost));
			this.sievePort('' + Utils.pInt(oDomain.SievePort));
			this.sieveSecure(Utils.trim(oDomain.SieveSecure));
			this.smtpServer(Utils.trim(oDomain.OutHost));
			this.smtpPort('' + Utils.pInt(oDomain.OutPort));
			this.smtpSecure(Utils.trim(oDomain.OutSecure));
			this.smtpShortLogin(!!oDomain.OutShortLogin);
			this.smtpAuth(!!oDomain.OutAuth);
			this.smtpPhpMail(!!oDomain.OutUsePhpMail);
			this.whiteList(Utils.trim(oDomain.WhiteList));

			this.enableSmartPorts(true);
		}
	};

	DomainPopupView.prototype.onShowWithDelay = function ()
	{
		if ('' === this.name() && !Globals.bMobile)
		{
			this.name.focused(true);
		}
	};

	DomainPopupView.prototype.clearForm = function ()
	{
		this.edit(false);

		this.page('main');
		this.sieveSettings(false);

		this.enableSmartPorts(false);

		this.savingError('');

		this.name('');
		this.name.focused(false);

		this.imapServer('');
		this.imapPort('' + Consts.Values.ImapDefaulPort);
		this.imapSecure(Enums.ServerSecure.None);
		this.imapShortLogin(false);

		this.useSieve(false);
		this.sieveAllowRaw(false);
		this.sieveServer('');
		this.sievePort('' + Consts.Values.SieveDefaulPort);
		this.sieveSecure(Enums.ServerSecure.None);

		this.smtpServer('');
		this.smtpPort('' + Consts.Values.SmtpDefaulPort);
		this.smtpSecure(Enums.ServerSecure.None);
		this.smtpShortLogin(false);
		this.smtpAuth(true);
		this.smtpPhpMail(false);

		this.whiteList('');
		this.enableSmartPorts(true);
	};

	module.exports = DomainPopupView;

}());