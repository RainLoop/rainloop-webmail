/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
'use strict';

(function (module) {

	var
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),

		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		AppSettings = require('../Storages/AppSettings.js'),
		Data = require('../Storages/AdminDataStorage.js'),

		PopupsLanguagesViewModel = require('../ViewModels/Popups/PopupsLanguagesViewModel.js')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsGeneral()
	{
		this.mainLanguage = Data.mainLanguage;
		this.mainTheme = Data.mainTheme;

		this.language = Data.language;
		this.theme = Data.theme;

		this.allowLanguagesOnSettings = Data.allowLanguagesOnSettings;
		this.capaThemes = Data.capaThemes;
		this.capaGravatar = Data.capaGravatar;
		this.capaAdditionalAccounts = Data.capaAdditionalAccounts;
		this.capaAdditionalIdentities = Data.capaAdditionalIdentities;

		this.mainAttachmentLimit = ko.observable(Utils.pInt(AppSettings.settingsGet('AttachmentLimit')) / (1024 * 1024)).extend({'posInterer': 25});
		this.uploadData = AppSettings.settingsGet('PhpUploadSizes');
		this.uploadDataDesc = this.uploadData && (this.uploadData['upload_max_filesize'] || this.uploadData['post_max_size']) ?
			[
				this.uploadData['upload_max_filesize'] ? 'upload_max_filesize = ' + this.uploadData['upload_max_filesize'] + '; ' : '',
				this.uploadData['post_max_size'] ? 'post_max_size = ' + this.uploadData['post_max_size'] : ''
			].join('')
				: '';

		this.themesOptions = ko.computed(function () {
			return _.map(Data.themes(), function (sTheme) {
				return {
					'optValue': sTheme,
					'optText': Utils.convertThemeName(sTheme)
				};
			});
		});

		this.mainLanguageFullName = ko.computed(function () {
			return Utils.convertLangName(this.mainLanguage());
		}, this);

		this.weakPassword = !!AppSettings.settingsGet('WeakPassword');

		this.attachmentLimitTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		this.themeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	}

	AdminSettingsGeneral.prototype.onBuild = function ()
	{
		var
			self = this,
			Remote = require('../Storages/AdminAjaxRemoteStorage.js')
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

			self.capaThemes.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'CapaThemes': bValue ? '1' : '0'
				});
			});

			self.allowLanguagesOnSettings.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'AllowLanguagesOnSettings': bValue ? '1' : '0'
				});
			});

		}, 50);
	};

	AdminSettingsGeneral.prototype.selectLanguage = function ()
	{
		require('../Knoin/Knoin.js').showScreenPopup(PopupsLanguagesViewModel);
	};

	/**
	 * @return {string}
	 */
	AdminSettingsGeneral.prototype.phpInfoLink = function ()
	{
		return LinkBuilder.phpInfo();
	};

	module.exports = AdminSettingsGeneral;

}(module));