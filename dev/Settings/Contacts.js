/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function SettingsContacts()
{
	var oData = RL.data();
	
	this.contactsAutosave = oData.contactsAutosave;
	this.showPassword = ko.observable(false);

	this.allowContactsSync = !!RL.settingsGet('ContactsSyncIsAllowed');
	this.contactsSyncServer = RL.settingsGet('ContactsSyncServer');
	this.contactsSyncUser = RL.settingsGet('ContactsSyncUser');
	this.contactsSyncPass = RL.settingsGet('ContactsSyncPassword');
	this.contactsSyncPabUrl = RL.settingsGet('ContactsSyncPabUrl');
}

Utils.addSettingsViewModel(SettingsContacts, 'SettingsContacts', 'SETTINGS_LABELS/LABEL_CONTACTS_NAME', 'contacts');

SettingsContacts.prototype.toggleShowPassword = function ()
{
	this.showPassword(!this.showPassword());
};

SettingsContacts.prototype.onBuild = function ()
{
	RL.data().contactsAutosave.subscribe(function (bValue) {
		RL.remote().saveSettings(Utils.emptyFunction, {
			'ContactsAutosave': bValue ? '1' : '0'
		});
	});
};

SettingsContacts.prototype.onShow = function ()
{
	this.showPassword(false);
};
