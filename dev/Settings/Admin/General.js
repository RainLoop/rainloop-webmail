
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),

		UserSettingsStore = require('Stores/UserSettings'),

		Settings = require('Storage/Settings'),
		Data = require('Storage/Admin/Data')
	;

	/**
	 * @constructor
	 */
	function GeneralAdminSettings()
	{
		this.language = UserSettingsStore.language;
		this.languages = UserSettingsStore.languages;
		this.theme = UserSettingsStore.theme;
		this.themes = UserSettingsStore.themes;

		this.capaThemes = Data.capaThemes;
		this.capaUserBackground = Data.capaUserBackground;
		this.allowLanguagesOnSettings = Data.allowLanguagesOnSettings;
		this.capaGravatar = Data.capaGravatar;
		this.capaAdditionalAccounts = Data.capaAdditionalAccounts;
		this.capaAdditionalIdentities = Data.capaAdditionalIdentities;
		this.capaAttachmentThumbnails = Data.capaAttachmentThumbnails;

		this.weakPassword = Data.weakPassword;

		this.mainAttachmentLimit = ko.observable(Utils.pInt(Settings.settingsGet('AttachmentLimit')) / (1024 * 1024)).extend({'posInterer': 25});
		this.uploadData = Settings.settingsGet('PhpUploadSizes');
		this.uploadDataDesc = this.uploadData && (this.uploadData['upload_max_filesize'] || this.uploadData['post_max_size']) ? [
			this.uploadData['upload_max_filesize'] ? 'upload_max_filesize = ' + this.uploadData['upload_max_filesize'] + '; ' : '',
			this.uploadData['post_max_size'] ? 'post_max_size = ' + this.uploadData['post_max_size'] : ''
		].join('') : '';

		this.themesOptions = ko.computed(function () {
			return _.map(this.themes(), function (sTheme) {
				return {
					'optValue': sTheme,
					'optText': Utils.convertThemeName(sTheme)
				};
			});
		}, this);

		this.languageFullName = ko.computed(function () {
			return Utils.convertLangName(this.language());
		}, this);

		this.attachmentLimitTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.themeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	}

	GeneralAdminSettings.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('Storage/Admin/Remote')
		;

		_.delay(function () {

			var
				f1 = Utils.settingsSaveHelperSimpleFunction(self.attachmentLimitTrigger, self),
				f2 = Utils.settingsSaveHelperSimpleFunction(self.languageTrigger, self),
				f3 = Utils.settingsSaveHelperSimpleFunction(self.themeTrigger, self)
			;

			self.mainAttachmentLimit.subscribe(function (sValue) {
				Remote.saveAdminConfig(f1, {
					'AttachmentLimit': Utils.pInt(sValue)
				});
			});

			self.language.subscribe(function (sValue) {
				Remote.saveAdminConfig(f2, {
					'Language': Utils.trim(sValue)
				});
			});

			self.theme.subscribe(function (sValue) {

				Utils.changeTheme(sValue, '', self.themeTrigger);

				Remote.saveAdminConfig(f3, {
					'Theme': Utils.trim(sValue)
				});
			});

			self.capaAdditionalAccounts.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'CapaAdditionalAccounts': bValue ? '1' : '0'
				});
			});

			self.capaAdditionalIdentities.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'CapaAdditionalIdentities': bValue ? '1' : '0'
				});
			});

			self.capaGravatar.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'CapaGravatar': bValue ? '1' : '0'
				});
			});

			self.capaAttachmentThumbnails.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'CapaAttachmentThumbnails': bValue ? '1' : '0'
				});
			});

			self.capaThemes.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'CapaThemes': bValue ? '1' : '0'
				});
			});

			self.capaUserBackground.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'CapaUserBackground': bValue ? '1' : '0'
				});
			});

			self.allowLanguagesOnSettings.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'AllowLanguagesOnSettings': bValue ? '1' : '0'
				});
			});

		}, 50);
	};

	GeneralAdminSettings.prototype.selectLanguage = function ()
	{
		require('Knoin/Knoin').showScreenPopup(require('View/Popup/Languages'));
	};

	/**
	 * @return {string}
	 */
	GeneralAdminSettings.prototype.phpInfoLink = function ()
	{
		return Links.phpInfo();
	};

	module.exports = GeneralAdminSettings;

}());