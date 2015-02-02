
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
	function AppAdminStore()
	{
		AppStore.call(this);

		this.determineUserLanguage = ko.observable(false);
		this.determineUserDomain = ko.observable(false);

		this.weakPassword = ko.observable(false);
		this.useLocalProxyForExternalImages = ko.observable(false);
	}

	AppAdminStore.prototype.populate = function()
	{
		AppStore.prototype.populate.call(this);

		this.determineUserLanguage(!!Settings.settingsGet('DetermineUserLanguage'));
		this.determineUserDomain(!!Settings.settingsGet('DetermineUserDomain'));

		this.weakPassword(!!Settings.settingsGet('WeakPassword'));
		this.useLocalProxyForExternalImages(!!Settings.settingsGet('UseLocalProxyForExternalImages'));
	};

	module.exports = new AppAdminStore();

}());
