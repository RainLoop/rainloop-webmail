/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
		ko = require('ko'),

		Utils = require('Utils'),

		Remote = require('Storage:RainLoop:Remote'),
		Data = require('Storage:RainLoop:Data')
	;

	/**
	 * @constructor
	 */
	function SettingsContacts()
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

	SettingsContacts.prototype.onBuild = function ()
	{
		Data.contactsAutosave.subscribe(function (bValue) {
			Remote.saveSettings(Utils.emptyFunction, {
				'ContactsAutosave': bValue ? '1' : '0'
			});
		});
	};

	module.exports = SettingsContacts;

}(module, require));