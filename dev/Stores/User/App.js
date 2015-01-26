
(function () {

	'use strict';

	var
		ko = require('ko'),

		Globals = require('Common/Globals'),

		Settings = require('Storage/Settings')
	;

	/**
	 * @constructor
	 */
	function AppUserStore()
	{
		// same
		this.allowLanguagesOnSettings = ko.observable(true);
		this.allowLanguagesOnLogin = ko.observable(true);
		// ----

		this.contactsAutosave = ko.observable(false);
		this.useLocalProxyForExternalImages = ko.observable(false);

		this.contactsIsAllowed = ko.observable(false);

		this.interfaceAnimation = ko.observable(true);

		this.interfaceAnimation.subscribe(function (bValue) {
			if (Globals.bMobileDevice || !bValue)
			{
				Globals.$html.removeClass('rl-anim').addClass('no-rl-anim');
			}
			else
			{
				Globals.$html.removeClass('no-rl-anim').addClass('rl-anim');
			}
		});

		this.interfaceAnimation.valueHasMutated();
	}

	AppUserStore.prototype.populate = function()
	{
		this.allowLanguagesOnLogin(!!Settings.settingsGet('AllowLanguagesOnLogin'));
		this.allowLanguagesOnSettings(!!Settings.settingsGet('AllowLanguagesOnSettings'));

		this.useLocalProxyForExternalImages(!!Settings.settingsGet('UseLocalProxyForExternalImages'));
		this.contactsIsAllowed(!!Settings.settingsGet('ContactsIsAllowed'));
		this.interfaceAnimation(!!Settings.settingsGet('InterfaceAnimation'));
	};

	module.exports = new AppUserStore();

}());
