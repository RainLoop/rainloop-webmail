
(function () {

	'use strict';

	var
		ko = require('ko'),

		Settings = require('Storage/Settings')
	;

	/**
	 * @constructor
	 */
	function AppAdminStore()
	{
		// same
		this.allowLanguagesOnSettings = ko.observable(true);
		this.allowLanguagesOnLogin = ko.observable(true);
		// ----

		this.determineUserLanguage = ko.observable(false);
		this.determineUserDomain = ko.observable(false);

		this.weakPassword = ko.observable(false);
		this.useLocalProxyForExternalImages = ko.observable(false);
	}

	AppAdminStore.prototype.populate = function()
	{
		this.allowLanguagesOnLogin(!!Settings.settingsGet('AllowLanguagesOnLogin'));
		this.allowLanguagesOnSettings(!!Settings.settingsGet('AllowLanguagesOnSettings'));

		this.determineUserLanguage(!!Settings.settingsGet('DetermineUserLanguage'));
		this.determineUserDomain(!!Settings.settingsGet('DetermineUserDomain'));

		this.weakPassword(!!Settings.settingsGet('WeakPassword'));
		this.useLocalProxyForExternalImages(!!Settings.settingsGet('UseLocalProxyForExternalImages'));
	};

	module.exports = new AppAdminStore();

}());
