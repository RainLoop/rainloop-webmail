
(function () {

	'use strict';

	var
		ko = require('ko'),

		Utils = require('Common/Utils'),

		Settings = require('Storage/Settings')
	;

	/**
	 * @constructor
	 */
	function ThemeStore()
	{
		this.themes = ko.observableArray([]);
		this.themeBackgroundName = ko.observable('');
		this.themeBackgroundHash = ko.observable('');

		this.theme = ko.observable('')
			.extend({'limitedList': this.themes});
	}

	ThemeStore.prototype.populate = function ()
	{
		var aThemes = Settings.settingsGet('Themes');

		this.themes(Utils.isArray(aThemes) ? aThemes : []);
		this.theme(Settings.settingsGet('Theme'));
		this.themeBackgroundName(Settings.settingsGet('UserBackgroundName'));
		this.themeBackgroundHash(Settings.settingsGet('UserBackgroundHash'));
	};

	module.exports = new ThemeStore();

}());
