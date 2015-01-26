
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
	function SettingsUserStore()
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

		this.messagesPerPage = ko.observable(Consts.Defaults.MessagesPerPage)
			.extend({'limitedList': Consts.Defaults.MessagesPerPageArray});

		this.showImages = ko.observable(false);
		this.useCheckboxesInList = ko.observable(true);
		this.useThreads = ko.observable(false);
		this.replySameFolder = ko.observable(false);

		this.computedProperies();
	}

	SettingsUserStore.prototype.computedProperies = function ()
	{
		this.usePreviewPane = ko.computed(function () {
			return Enums.Layout.NoPreview !== this.layout();
		}, this);
	};

	SettingsUserStore.prototype.populate = function ()
	{
		this.layout(Utils.pInt(Settings.settingsGet('Layout')));
		this.editorDefaultType(Settings.settingsGet('EditorDefaultType'));

		this.messagesPerPage(Settings.settingsGet('MPP'));

		this.showImages(!!Settings.settingsGet('ShowImages'));
		this.useCheckboxesInList(!!Settings.settingsGet('UseCheckboxesInList'));
		this.useThreads(!!Settings.settingsGet('UseThreads'));
		this.replySameFolder(!!Settings.settingsGet('ReplySameFolder'));
	};

	module.exports = new SettingsUserStore();

}());
