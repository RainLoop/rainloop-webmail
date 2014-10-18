
(function () {

	'use strict';

	var
		ko = require('ko'),

		Remote = require('Storage/User/Remote'),
		Data = require('Storage/User/Data')
	;

	/**
	 * @constructor
	 */
	function ContactsUserSetting()
	{
		this.contactsAutosave = Data.contactsAutosave;

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

		this.saveTrigger.subscribe(function () {
			Remote.saveContactsSyncData(null,
				this.enableContactsSync(),
				this.contactsSyncUrl(),
				this.contactsSyncUser(),
				this.contactsSyncPass()
			);
		}, this);
	}

	ContactsUserSetting.prototype.onBuild = function ()
	{
		Data.contactsAutosave.subscribe(function (bValue) {
			Remote.saveSettings(null, {
				'ContactsAutosave': bValue ? '1' : '0'
			});
		});
	};

	module.exports = ContactsUserSetting;

}());