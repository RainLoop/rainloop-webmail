/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AdminGeneral()
{
	var oData = RL.data();
	
	this.mainLanguage = oData.mainLanguage;
	this.mainTheme = oData.mainTheme;

	this.language = oData.language;
	this.theme = oData.theme;

	this.allowThemes = oData.allowThemes;
	this.allowCustomTheme = oData.allowCustomTheme;
	this.allowLanguagesOnSettings = oData.allowLanguagesOnSettings;
	this.allowAdditionalAccounts = oData.allowAdditionalAccounts;
	this.allowIdentities = oData.allowIdentities;
	
	this.title = ko.observable(RL.settingsGet('Title'));
	this.loadingDesc = ko.observable(RL.settingsGet('LoadingDescription'));

	this.themesOptions = ko.computed(function () {
		return _.map(oData.themes(), function (sTheme) {
			return {
				'optValue': sTheme,
				'optText': Utils.convertThemeName(sTheme)
			};
		});
	});
	
	this.languagesOptions = ko.computed(function () {
		return _.map(oData.languages(), function (sLanguage) {
			return {
				'optValue': sLanguage,
				'optText': Utils.convertLangName(sLanguage)
			};
		});
	});

	this.contactsSupported = RL.settingsGet('ContactsIsSupported');
	this.contactsIsAllowed = RL.settingsGet('ContactsIsAllowed');
	this.weakPassword = !!RL.settingsGet('WeakPassword');
	
	this.titleTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.themeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.loadingDescTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
}

Utils.addSettingsViewModel(AdminGeneral, 'AdminSettingsGeneral', 'General', 'general', true);

AdminGeneral.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var
			f1 = Utils.settingsSaveHelperSimpleFunction(self.titleTrigger, self),
			f2 = Utils.settingsSaveHelperSimpleFunction(self.languageTrigger, self),
			f3 = Utils.settingsSaveHelperSimpleFunction(self.themeTrigger, self),
			f4 = Utils.settingsSaveHelperSimpleFunction(self.loadingDescTrigger, self)
		;

		self.title.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f1, {
				'Title': Utils.trim(sValue)
			});
		});

		self.loadingDesc.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f4, {
				'LoadingDescription': Utils.trim(sValue)
			});
		});

		self.language.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f2, {
				'Language': Utils.trim(sValue)
			});
		});

		self.theme.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f3, {
				'Theme': Utils.trim(sValue)
			});
		});
		
		self.allowCustomTheme.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowCustomTheme': bValue ? '1' : '0'
			});
		});
		
		self.allowAdditionalAccounts.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowAdditionalAccounts': bValue ? '1' : '0'
			});
		});

		self.allowIdentities.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowIdentities': bValue ? '1' : '0'
			});
		});

		self.allowThemes.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowThemes': bValue ? '1' : '0'
			});
		});

		self.allowLanguagesOnSettings.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowLanguagesOnSettings': bValue ? '1' : '0'
			});
		});

	}, 50);
};
