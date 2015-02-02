
(function () {

	'use strict';

	var
		ko = require('ko'),

		Settings = require('Storage/Settings'),
		
		AppStore = require('Stores/App')
	;

	/**
	 * @constructor
	 */
	function AppUserStore()
	{
		AppStore.call(this);

		this.projectHash = ko.observable('');
		this.threadsAllowed = ko.observable(false);

		this.contactsAutosave = ko.observable(false);
		this.useLocalProxyForExternalImages = ko.observable(false);

		this.contactsIsAllowed = ko.observable(false);

		this.devEmail = '';
		this.devPassword = '';
	}

	AppUserStore.prototype.populate = function()
	{
		AppStore.prototype.populate.call(this);

		this.projectHash(Settings.settingsGet('ProjectHash'));

		this.useLocalProxyForExternalImages(!!Settings.settingsGet('UseLocalProxyForExternalImages'));
		this.contactsIsAllowed(!!Settings.settingsGet('ContactsIsAllowed'));

		this.devEmail = Settings.settingsGet('DevEmail');
		this.devPassword = Settings.settingsGet('DevPassword');
	};

	module.exports = new AppUserStore();

}());
