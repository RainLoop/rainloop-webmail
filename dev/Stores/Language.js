
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
	function LanguageStore()
	{
		this.languages = ko.observableArray([]);
		this.languagesAdmin = ko.observableArray([]);

		this.language = ko.observable('')
			.extend({'limitedList': this.languages});

		this.languageAdmin = ko.observable('')
			.extend({'limitedList': this.languagesAdmin});

		this.userLanguage = ko.observable('');
		this.userLanguageAdmin = ko.observable('');
	}

	LanguageStore.prototype.populate = function ()
	{
		var
			aLanguages = Settings.settingsGet('Languages'),
			aLanguagesAdmin = Settings.settingsGet('LanguagesAdmin')
		;

		this.languages(Utils.isArray(aLanguages) ? aLanguages : []);
		this.languagesAdmin(Utils.isArray(aLanguagesAdmin) ? aLanguagesAdmin : []);

		this.language(Settings.settingsGet('Language'));
		this.languageAdmin(Settings.settingsGet('LanguageAdmin'));

		this.userLanguage(Settings.settingsGet('UserLanguage'));
		this.userLanguageAdmin(Settings.settingsGet('UserLanguageAdmin'));
	};

	module.exports = new LanguageStore();

}());
