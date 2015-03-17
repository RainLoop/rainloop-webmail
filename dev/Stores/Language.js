
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
		this.languagesTop = ko.observableArray([]);

		this.language = ko.observable('')
			.extend({'limitedList': this.languages});
	}

	LanguageStore.prototype.populate = function ()
	{
		var
			aLanguages = Settings.settingsGet('Languages'),
			aLanguagesTop = Settings.settingsGet('LanguagesTop')
		;

		this.languages(Utils.isArray(aLanguages) ? aLanguages : []);
		this.languagesTop(Utils.isArray(aLanguagesTop) ? aLanguagesTop : []);

		this.language(Settings.settingsGet('Language'));
	};

	module.exports = new LanguageStore();

}());
