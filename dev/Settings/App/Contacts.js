
(function () {

	'use strict';

	var
		ko = require('ko'),

		Remote = require('Storage/App/Remote'),
		Data = require('Storage/App/Data')
	;

	/**
	 * @constructor
	 */
	function ContactsAppSetting()
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

	ContactsAppSetting.prototype.onBuild = function ()
	{
		Data.contactsAutosave.subscribe(function (bValue) {
			Remote.saveSettings(null, {
				'ContactsAutosave': bValue ? '1' : '0'
			});
		});
	};

	module.exports = ContactsAppSetting;

}());