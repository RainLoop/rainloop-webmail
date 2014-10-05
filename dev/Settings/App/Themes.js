
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),

		Data = require('Storage/App/Data'),
		Remote = require('Storage/App/Remote')
	;

	/**
	 * @constructor
	 */
	function ThemesAppSetting()
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

			var
				oThemeLink = $('#rlThemeLink'),
				oThemeStyle = $('#rlThemeStyle'),
				sUrl = oThemeLink.attr('href')
			;

			if (!sUrl)
			{
				sUrl = oThemeStyle.attr('data-href');
			}

			if (sUrl)
			{
				sUrl = sUrl.toString().replace(/\/-\/[^\/]+\/\-\//, '/-/' + sValue + '/-/');
				sUrl = sUrl.toString().replace(/\/Css\/[^\/]+\/User\//, '/Css/0/User/');

				if ('Json/' !== sUrl.substring(sUrl.length - 5, sUrl.length))
				{
					sUrl += 'Json/';
				}

				window.clearTimeout(self.iTimer);
				self.themeTrigger(Enums.SaveSettingsStep.Animate);

				if (this.oThemeAjaxRequest && this.oThemeAjaxRequest.abort)
				{
					this.oThemeAjaxRequest.abort();
				}

				this.oThemeAjaxRequest = $.ajax({
					'url': sUrl,
					'dataType': 'json'
				}).done(function(aData) {

					if (aData && Utils.isArray(aData) && 2 === aData.length)
					{
						if (oThemeLink && oThemeLink[0] && (!oThemeStyle || !oThemeStyle[0]))
						{
							oThemeStyle = $('<style id="rlThemeStyle"></style>');
							oThemeLink.after(oThemeStyle);
							oThemeLink.remove();
						}

						if (oThemeStyle && oThemeStyle[0])
						{
							oThemeStyle.attr('data-href', sUrl).attr('data-theme', aData[0]);
							if (oThemeStyle && oThemeStyle[0] && oThemeStyle[0].styleSheet && !Utils.isUnd(oThemeStyle[0].styleSheet.cssText))
							{
								oThemeStyle[0].styleSheet.cssText = aData[1];
							}
							else
							{
								oThemeStyle.text(aData[1]);
							}
						}

						self.themeTrigger(Enums.SaveSettingsStep.TrueResult);
					}

				}).always(function() {

					self.iTimer = window.setTimeout(function () {
						self.themeTrigger(Enums.SaveSettingsStep.Idle);
					}, 1000);

					self.oThemeAjaxRequest = null;
				});
			}

			Remote.saveSettings(null, {
				'Theme': sValue
			});

		}, this);
	}

	ThemesAppSetting.prototype.onBuild = function ()
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

	module.exports = ThemesAppSetting;

}());