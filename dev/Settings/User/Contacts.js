
(function () {

	'use strict';

	var
		ko = require('ko'),

		AppStore = require('Stores/User/App'),

		Remote = require('Storage/User/Remote'),
		Data = require('Storage/User/Data')
	;

	/**
	 * @constructor
	 */
	function ContactsUserSettings()
	{
		this.contactsAutosave = AppStore.contactsAutosave;

		this.allowContactsSync = Data.allowContactsSync;
		this.enableContactsSync = Data.enableContactsSync;
		this.contactsSyncUrl = Data.contactsSyncUrl;
		this.contactsSyncUser = Data.contactsSyncUser;
		this.contactsSyncPass = Data.contactsSyncPass;

		this.saveTrigger = ko.computed(function () {
			return [
				this.enableContactsSync() ? '1' : '0',
				this.contactsSyncUrl(),
				this.contactsSyncUser(),
				this.contactsSyncPass()
			].join('|');
		}, this).extend({'throttle': 500});
	}

	ContactsUserSettings.prototype.onBuild = function ()
	{
		this.contactsAutosave.subscribe(function (bValue) {
			Remote.saveSettings(null, {
				'ContactsAutosave': bValue ? '1' : '0'
			});
		});

		this.saveTrigger.subscribe(function () {
			Remote.saveContactsSyncData(null,
				this.enableContactsSync(),
				this.contactsSyncUrl(),
				this.contactsSyncUser(),
				this.contactsSyncPass()
			);
		}, this);
	};

	module.exports = ContactsUserSettings;

}());