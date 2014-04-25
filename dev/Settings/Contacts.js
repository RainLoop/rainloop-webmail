/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsContacts()
{
	var oData = RL.data();
	
	this.contactsAutosave = oData.contactsAutosave;

	this.allowContactsSync = oData.allowContactsSync;
	this.enableContactsSync = oData.enableContactsSync;
	this.contactsSyncUrl = oData.contactsSyncUrl;
	this.contactsSyncUser = oData.contactsSyncUser;
	this.contactsSyncPass = oData.contactsSyncPass;

	this.saveTrigger = ko.computed(function () {
		return [
			this.enableContactsSync() ? '1' : '0',
			this.contactsSyncUrl(),
			this.contactsSyncUser(),
			this.contactsSyncPass()
		].join('|');
	}, this).extend({'throttle': 500});

	this.saveTrigger.subscribe(function () {
		RL.remote().saveContactsSyncData(null,
			this.enableContactsSync(),
			this.contactsSyncUrl(),
			this.contactsSyncUser(),
			this.contactsSyncPass()
		);
	}, this);
}

Utils.addSettingsViewModel(SettingsContacts, 'SettingsContacts', 'SETTINGS_LABELS/LABEL_CONTACTS_NAME', 'contacts');

SettingsContacts.prototype.onBuild = function ()
{
	RL.data().contactsAutosave.subscribe(function (bValue) {
		RL.remote().saveSettings(Utils.emptyFunction, {
			'ContactsAutosave': bValue ? '1' : '0'
		});
	});
};

//SettingsContacts.prototype.onShow = function ()
//{
//
//};
