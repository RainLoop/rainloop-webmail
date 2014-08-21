/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../External/ko.js'),
		
		Utils = require('../Common/Utils.js'),

		Remote = require('../Storages/WebMailAjaxRemoteStorage.js')
	;

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
			Remote.saveContactsSyncData(null,
				this.enableContactsSync(),
				this.contactsSyncUrl(),
				this.contactsSyncUser(),
				this.contactsSyncPass()
			);
		}, this);
	}

	kn.addSettingsViewModel(SettingsContacts, 'SettingsContacts', 'SETTINGS_LABELS/LABEL_CONTACTS_NAME', 'contacts');

	SettingsContacts.prototype.onBuild = function ()
	{
		RL.data().contactsAutosave.subscribe(function (bValue) {
			Remote.saveSettings(Utils.emptyFunction, {
				'ContactsAutosave': bValue ? '1' : '0'
			});
		});
	};

	module.exports = SettingsContacts;

}(module));