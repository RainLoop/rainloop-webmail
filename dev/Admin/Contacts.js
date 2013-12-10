/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AdminContacts()
{
//	var oData = RL.data();

	this.contactsSupported = !!RL.settingsGet('ContactsIsSupported');
	this.enableContacts = ko.observable(!!RL.settingsGet('ContactsEnable'));
	
	this.pdoDsn = ko.observable(RL.settingsGet('ContactsPdoDsn'));
	this.pdoUser = ko.observable(RL.settingsGet('ContactsPdoUser'));
	this.pdoPassword = ko.observable(RL.settingsGet('ContactsPdoPassword'));

	this.pdoDsnTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.pdoUserTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.pdoPasswordTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.testing = ko.observable(false);
	this.testContactsSuccess = ko.observable(false);
	this.testContactsError = ko.observable(false);
	this.testContactsErrorMessage = ko.observable('');

	this.testContactsCommand = Utils.createCommand(this, function () {

		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');
		this.testing(true);

		RL.remote().testContacts(this.onTestContactsResponse, {
			'ContactsPdoDsn': this.pdoDsn(),
			'ContactsPdoUser': this.pdoUser(),
			'ContactsPdoPassword': this.pdoPassword()
		});

	}, function () {
		return '' !== this.pdoDsn() && '' !== this.pdoUser();
	});

	this.onTestContactsResponse = _.bind(this.onTestContactsResponse, this);
}

Utils.addSettingsViewModel(AdminContacts, 'AdminSettingsContacts', 'Contacts', 'contacts');

AdminContacts.prototype.onTestContactsResponse = function (sResult, oData)
{
	this.testContactsSuccess(false);
	this.testContactsError(false);
	this.testContactsErrorMessage('');

	if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result.Result)
	{
		this.testContactsSuccess(true);
	}
	else
	{
		this.testContactsError(true);
		this.testContactsErrorMessage(oData.Result.Message || '');
	}

	this.testing(false);
};

AdminContacts.prototype.onShow = function ()
{
	this.testContactsSuccess(false);
	this.testContactsError(false);
	this.testContactsErrorMessage('');
};

AdminContacts.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var
			f1 = Utils.settingsSaveHelperSimpleFunction(self.pdoDsnTrigger, self),
			f2 = Utils.settingsSaveHelperSimpleFunction(self.pdoUserTrigger, self),
			f3 = Utils.settingsSaveHelperSimpleFunction(self.pdoPasswordTrigger, self)
		;

		self.enableContacts.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'ContactsEnable': bValue ? '1' : '0'
			});
		});
		
		self.pdoDsn.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f1, {
				'ContactsPdoDsn': Utils.trim(sValue)
			});
		});
		
		self.pdoUser.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f2, {
				'ContactsPdoUser': Utils.trim(sValue)
			});
		});

		self.pdoPassword.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f3, {
				'ContactsPdoPassword': Utils.trim(sValue)
			});
		});

	}, 50);
};
