
(function () {

	'use strict';

	var
		ko = require('ko'),

		AppStore = require('Stores/User/App'),
		ContactStore = require('Stores/User/Contact'),

		Remote = require('Remote/User/Ajax')
	;

	/**
	 * @constructor
	 */
	function ContactsUserSettings()
	{
		this.contactsAutosave = AppStore.contactsAutosave;

		this.allowContactsSync = ContactStore.allowContactsSync;
		this.enableContactsSync = ContactStore.enableContactsSync;
		this.contactsSyncUrl = ContactStore.contactsSyncUrl;
		this.contactsSyncUser = ContactStore.contactsSyncUser;
		this.contactsSyncPass = ContactStore.contactsSyncPass;

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