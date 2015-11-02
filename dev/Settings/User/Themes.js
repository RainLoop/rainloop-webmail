
(function () {

	'use strict';

	var
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),

		Jua = require('Jua'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),
		Translator = require('Common/Translator'),

		ThemeStore = require('Stores/Theme'),

		Settings = require('Storage/Settings'),
		
		Remote = require('Remote/User/Ajax')
	;

	/**
	 * @constructor
	 */
	function ThemesUserSettings()
	{
		this.theme = ThemeStore.theme;
		this.themes = ThemeStore.themes;
		this.themesObjects = ko.observableArray([]);

		this.background = {};
		this.background.name = ThemeStore.themeBackgroundName;
		this.background.hash = ThemeStore.themeBackgroundHash;
		this.background.uploaderButton = ko.observable(null);
		this.background.loading = ko.observable(false);
		this.background.error = ko.observable('');

		this.capaUserBackground = ko.observable(Settings.capa(Enums.Capa.UserBackground));

		this.themeTrigger = ko.observable(Enums.SaveSettingsStep.Idle).extend({'throttle': 100});

		this.iTimer = 0;
		this.oThemeAjaxRequest = null;

		this.theme.subscribe(function (sValue) {

			_.each(this.themesObjects(), function (oTheme) {
				oTheme.selected(sValue === oTheme.name);
			});

			Utils.changeTheme(sValue, this.themeTrigger);

			Remote.saveSettings(null, {
				'Theme': sValue
			});

		}, this);

		this.background.hash.subscribe(function (sValue) {

			var $oBg = $('#rl-bg');
			if (!sValue)
			{
				if ($oBg.data('backstretch'))
				{
					$oBg.backstretch('destroy').attr('style', '');
				}
			}
			else
			{
				$('#rl-bg').attr('style', 'background-image: none !important;').backstretch(
					Links.userBackground(sValue), {
						'fade': 1000, 'centeredX': true, 'centeredY': true
					}).removeAttr('style');
			}

		}, this);
	}

	ThemesUserSettings.prototype.onBuild = function ()
	{
		var sCurrentTheme = this.theme();
		this.themesObjects(_.map(this.themes(), function (sTheme) {
			return {
				'name': sTheme,
				'nameDisplay': Utils.convertThemeName(sTheme),
				'selected': ko.observable(sTheme === sCurrentTheme),
				'themePreviewSrc': Links.themePreviewLink(sTheme)
			};
		}));

		this.initUploader();
	};

	ThemesUserSettings.prototype.onShow = function ()
	{
		this.background.error('');
	};

	ThemesUserSettings.prototype.clearBackground = function ()
	{
		if (this.capaUserBackground())
		{
			var self = this;
			Remote.clearUserBackground(function () {
				self.background.name('');
				self.background.hash('');
			});
		}
	};

	ThemesUserSettings.prototype.initUploader = function ()
	{
		if (this.background.uploaderButton() && this.capaUserBackground())
		{
			var
				oJua = new Jua({
					'action': Links.uploadBackground(),
					'name': 'uploader',
					'queueSize': 1,
					'multipleSizeLimit': 1,
					'disableDragAndDrop': true,
					'disableMultiple': true,
					'clickElement': this.background.uploaderButton()
				})
			;

			oJua
				.on('onStart', _.bind(function () {

					this.background.loading(true);
					this.background.error('');

					return true;

				}, this))
				.on('onComplete', _.bind(function (sId, bResult, oData) {

					this.background.loading(false);

					if (bResult && sId && oData && oData.Result && oData.Result.Name && oData.Result.Hash)
					{
						this.background.name(oData.Result.Name);
						this.background.hash(oData.Result.Hash);
					}
					else
					{
						this.background.name('');
						this.background.hash('');

						var sError = '';
						if (oData.ErrorCode)
						{
							switch (oData.ErrorCode)
							{
								case Enums.UploadErrorCode.FileIsTooBig:
									sError = Translator.i18n('SETTINGS_THEMES/ERROR_FILE_IS_TOO_BIG');
									break;
								case Enums.UploadErrorCode.FileType:
									sError = Translator.i18n('SETTINGS_THEMES/ERROR_FILE_TYPE_ERROR');
									break;
							}
						}

						if (!sError && oData.ErrorMessage)
						{
							sError = oData.ErrorMessage;
						}

						this.background.error(sError || Translator.i18n('SETTINGS_THEMES/ERROR_UNKNOWN'));
					}

					return true;

				}, this))
			;
		}
	};

	module.exports = ThemesUserSettings;

}());