/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsDomainViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsDomain');

	this.edit = ko.observable(false);
	this.saving = ko.observable(false);
	this.savingError = ko.observable('');
	this.whiteListPage = ko.observable(false);

	this.testing = ko.observable(false);
	this.testingDone = ko.observable(false);
	this.testingImapError = ko.observable(false);
	this.testingSmtpError = ko.observable(false);
	this.testingImapErrorDesc = ko.observable('');
	this.testingSmtpErrorDesc = ko.observable('');

	this.testingImapError.subscribe(function (bValue) {
		if (!bValue)
		{
			this.testingImapErrorDesc('');
		}
	}, this);

	this.testingSmtpError.subscribe(function (bValue) {
		if (!bValue)
		{
			this.testingSmtpErrorDesc('');
		}
	}, this);

	this.testingImapErrorDesc = ko.observable('');
	this.testingSmtpErrorDesc = ko.observable('');

	this.imapServerFocus = ko.observable(false);
	this.smtpServerFocus = ko.observable(false);

	this.name = ko.observable('');
	this.name.focused = ko.observable(false);

	this.imapServer = ko.observable('');
	this.imapPort = ko.observable('' + Consts.Values.ImapDefaulPort);
	this.imapSecure = ko.observable(Enums.ServerSecure.None);
	this.imapShortLogin = ko.observable(false);
	this.smtpServer = ko.observable('');
	this.smtpPort = ko.observable('' + Consts.Values.SmtpDefaulPort);
	this.smtpSecure = ko.observable(Enums.ServerSecure.None);
	this.smtpShortLogin = ko.observable(false);
	this.smtpAuth = ko.observable(true);
	this.whiteList = ko.observable('');

	this.headerText = ko.computed(function () {
		var sName = this.name();
		return this.edit() ? 'Edit Domain "' + sName + '"' :
			'Add Domain' + ('' === sName ? '' : ' "' + sName + '"');
	}, this);

	this.domainIsComputed = ko.computed(function () {
		return '' !== this.name() &&
			'' !== this.imapServer() &&
			'' !== this.imapPort() &&
			'' !== this.smtpServer() &&
			'' !== this.smtpPort();
	}, this);

	this.canBeTested = ko.computed(function () {
		return !this.testing() && this.domainIsComputed();
	}, this);

	this.canBeSaved = ko.computed(function () {
		return !this.saving() && this.domainIsComputed();
	}, this);

	this.createOrAddCommand = Utils.createCommand(this, function () {
		this.saving(true);
		RL.remote().createOrUpdateDomain(
			_.bind(this.onDomainCreateOrSaveResponse, this),
			!this.edit(),
			this.name(),
			this.imapServer(),
			Utils.pInt(this.imapPort()),
			this.imapSecure(),
			this.imapShortLogin(),
			this.smtpServer(),
			Utils.pInt(this.smtpPort()),
			this.smtpSecure(),
			this.smtpShortLogin(),
			this.smtpAuth(),
			this.whiteList()
		);
	}, this.canBeSaved);

	this.testConnectionCommand = Utils.createCommand(this, function () {
		this.whiteListPage(false);
		this.testingDone(false);
		this.testingImapError(false);
		this.testingSmtpError(false);
		this.testing(true);
		RL.remote().testConnectionForDomain(
			_.bind(this.onTestConnectionResponse, this),
			this.name(),
			this.imapServer(),
			Utils.pInt(this.imapPort()),
			this.imapSecure(),
			this.smtpServer(),
			Utils.pInt(this.smtpPort()),
			this.smtpSecure(),
			this.smtpAuth()
		);
	}, this.canBeTested);

	this.whiteListCommand = Utils.createCommand(this, function () {
		this.whiteListPage(!this.whiteListPage());
	});

	// smart form improvements
	this.imapServerFocus.subscribe(function (bValue) {
		if (bValue && '' !== this.name() && '' === this.imapServer())
		{
			this.imapServer(this.name().replace(/[.]?[*][.]?/g, ''));
		}
	}, this);

	this.smtpServerFocus.subscribe(function (bValue) {
		if (bValue && '' !== this.imapServer() && '' === this.smtpServer())
		{
			this.smtpServer(this.imapServer().replace(/imap/ig, 'smtp'));
		}
	}, this);

	this.imapSecure.subscribe(function (sValue) {
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
	}, this);

	this.smtpSecure.subscribe(function (sValue) {
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
	}, this);

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsDomainViewModel', PopupsDomainViewModel);

PopupsDomainViewModel.prototype.onTestConnectionResponse = function (sResult, oData)
{
	this.testing(false);
	if (Enums.StorageResultType.Success === sResult && oData.Result)
	{
		this.testingDone(true);
		this.testingImapError(true !== oData.Result.Imap);
		this.testingSmtpError(true !== oData.Result.Smtp);

		if (this.testingImapError() && oData.Result.Imap)
		{
			this.testingImapErrorDesc(oData.Result.Imap);
		}

		if (this.testingSmtpError() && oData.Result.Smtp)
		{
			this.testingSmtpErrorDesc(oData.Result.Smtp);
		}
	}
	else
	{
		this.testingImapError(true);
		this.testingSmtpError(true);
	}
};

PopupsDomainViewModel.prototype.onDomainCreateOrSaveResponse = function (sResult, oData)
{
	this.saving(false);
	if (Enums.StorageResultType.Success === sResult && oData)
	{
		if (oData.Result)
		{
			RL.reloadDomainList();
			this.closeCommand();
		}
		else if (Enums.Notification.DomainAlreadyExists === oData.ErrorCode)
		{
			this.savingError('Domain already exists');
		}
	}
	else
	{
		this.savingError('Unknown error');
	}
};

PopupsDomainViewModel.prototype.onHide = function ()
{
	this.whiteListPage(false);
};

PopupsDomainViewModel.prototype.onShow = function (oDomain)
{
	this.saving(false);
	this.whiteListPage(false);

	this.testing(false);
	this.testingDone(false);
	this.testingImapError(false);
	this.testingSmtpError(false);

	this.clearForm();
	if (oDomain)
	{
		this.edit(true);

		this.name(Utils.trim(oDomain.Name));
		this.imapServer(Utils.trim(oDomain.IncHost));
		this.imapPort('' + Utils.pInt(oDomain.IncPort));
		this.imapSecure(Utils.trim(oDomain.IncSecure));
		this.imapShortLogin(!!oDomain.IncShortLogin);
		this.smtpServer(Utils.trim(oDomain.OutHost));
		this.smtpPort('' + Utils.pInt(oDomain.OutPort));
		this.smtpSecure(Utils.trim(oDomain.OutSecure));
		this.smtpShortLogin(!!oDomain.OutShortLogin);
		this.smtpAuth(!!oDomain.OutAuth);
		this.whiteList(Utils.trim(oDomain.WhiteList));
	}
};

PopupsDomainViewModel.prototype.onFocus = function ()
{
	if ('' === this.name())
	{
		this.name.focused(true);
	}
};

PopupsDomainViewModel.prototype.clearForm = function ()
{
	this.edit(false);
	this.whiteListPage(false);

	this.savingError('');

	this.name('');
	this.name.focused(false);

	this.imapServer('');
	this.imapPort('' + Consts.Values.ImapDefaulPort);
	this.imapSecure(Enums.ServerSecure.None);
	this.imapShortLogin(false);
	this.smtpServer('');
	this.smtpPort('' + Consts.Values.SmtpDefaulPort);
	this.smtpSecure(Enums.ServerSecure.None);
	this.smtpShortLogin(false);
	this.smtpAuth(true);
	this.whiteList('');
};
