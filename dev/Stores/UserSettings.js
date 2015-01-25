
(function () {

	'use strict';

	var
		ko = require('ko'),

		Consts = require('Common/Consts'),
		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		Settings = require('Storage/Settings')
	;

	/**
	 * @constructor
	 */
	function UserSettingsStore()
	{
		this.layout = ko.observable(Enums.Layout.SidePreview)
			.extend({'limitedList': [
				Enums.Layout.SidePreview, Enums.Layout.BottomPreview, Enums.Layout.NoPreview
			]});

		this.editorDefaultType = ko.observable(Enums.EditorDefaultType.Html)
			.extend({'limitedList': [
				Enums.EditorDefaultType.Html, Enums.EditorDefaultType.Plain,
				Enums.EditorDefaultType.HtmlForced, Enums.EditorDefaultType.PlainForced
			]});

		this.languages = ko.observableArray([]);

		this.language = ko.observable('')
			.extend({'limitedList': this.languages});

		this.themes = ko.observableArray([]);
		this.themeBackgroundName = ko.observable('');
		this.themeBackgroundHash = ko.observable('');

		this.theme = ko.observable('')
			.extend({'limitedList': this.themes});

		this.messagesPerPage = ko.observable(Consts.Defaults.MessagesPerPage)
			.extend({'limitedList': Consts.Defaults.MessagesPerPageArray});

		this.computedProperies();
	}

	UserSettingsStore.prototype.computedProperies = function ()
	{
		this.usePreviewPane = ko.computed(function () {
			return Enums.Layout.NoPreview !== this.layout();
		}, this);
	};

	UserSettingsStore.prototype.populate = function ()
	{
		var
			aLanguages = Settings.settingsGet('Languages'),
			aThemes = Settings.settingsGet('Themes')
		;

		this.layout(Utils.pInt(Settings.settingsGet('Layout')));
		this.editorDefaultType(Settings.settingsGet('EditorDefaultType'));

		this.languages(Utils.isArray(aLanguages) ? aLanguages : []);
		this.language(Settings.settingsGet('Language'));

		this.themes(Utils.isArray(aThemes) ? aThemes : []);
		this.theme(Settings.settingsGet('Theme'));
		this.themeBackgroundName(Settings.settingsGet('UserBackgroundName'));
		this.themeBackgroundHash(Settings.settingsGet('UserBackgroundHash'));

		this.messagesPerPage(Settings.settingsGet('MPP'));
	};

	module.exports = new UserSettingsStore();

}());
