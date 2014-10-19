
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),

		Data = require('Storage/User/Data'),
		Remote = require('Storage/User/Remote')
	;

	/**
	 * @constructor
	 */
	function ThemesUserSetting()
	{
		var self = this;

		this.mainTheme = Data.mainTheme;
		this.themesObjects = ko.observableArray([]);

		this.themeTrigger = ko.observable(Enums.SaveSettingsStep.Idle).extend({'throttle': 100});

		this.iTimer = 0;
		this.oThemeAjaxRequest = null;

		Data.theme.subscribe(function (sValue) {

			_.each(this.themesObjects(), function (oTheme) {
				oTheme.selected(sValue === oTheme.name);
			});

			Utils.changeTheme(sValue, self.themeTrigger);

			Remote.saveSettings(null, {
				'Theme': sValue
			});

		}, this);
	}

	ThemesUserSetting.prototype.onBuild = function ()
	{
		var sCurrentTheme = Data.theme();
		this.themesObjects(_.map(Data.themes(), function (sTheme) {
			return {
				'name': sTheme,
				'nameDisplay': Utils.convertThemeName(sTheme),
				'selected': ko.observable(sTheme === sCurrentTheme),
				'themePreviewSrc': Links.themePreviewLink(sTheme)
			};
		}));
	};

	module.exports = ThemesUserSetting;

}());