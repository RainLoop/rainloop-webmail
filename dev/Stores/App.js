
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
	function AppStore()
	{
		this.allowLanguagesOnSettings = ko.observable(true);
		this.allowLanguagesOnLogin = ko.observable(true);

		this.interfaceAnimation = ko.observable(true);

		this.interfaceAnimation.subscribe(function (bValue) {
			var bAnim = Globals.bMobileDevice || !bValue;
			Globals.$html.toggleClass('rl-anim', !bAnim).toggleClass('no-rl-anim', bAnim);
		});

		this.interfaceAnimation.valueHasMutated();

		this.prem = ko.observable(false);
		this.community = ko.observable(true);
	}

	AppStore.prototype.populate = function()
	{
		this.allowLanguagesOnLogin(!!Settings.settingsGet('AllowLanguagesOnLogin'));
		this.allowLanguagesOnSettings(!!Settings.settingsGet('AllowLanguagesOnSettings'));

		this.interfaceAnimation(!!Settings.settingsGet('InterfaceAnimation'));

		this.prem(!!Settings.settingsGet('PremType'));
		this.community(!!Settings.settingsGet('Community'));
	};

	module.exports = AppStore;

}());
