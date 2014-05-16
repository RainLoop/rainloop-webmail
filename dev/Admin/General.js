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

	this.allowLanguagesOnSettings = oData.allowLanguagesOnSettings;
	this.capaThemes = oData.capaThemes;
	this.capaGravatar = oData.capaGravatar;
	this.capaAdditionalAccounts = oData.capaAdditionalAccounts;
	this.capaAdditionalIdentities = oData.capaAdditionalIdentities;
	
	this.themesOptions = ko.computed(function () {
		return _.map(oData.themes(), function (sTheme) {
			return {
				'optValue': sTheme,
				'optText': Utils.convertThemeName(sTheme)
			};
		});
	});

	this.mainLanguageFullName = ko.computed(function () {
		return Utils.convertLangName(this.mainLanguage());
	}, this);
	
	this.weakPassword = !!RL.settingsGet('WeakPassword');
	
	this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.themeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
}

Utils.addSettingsViewModel(AdminGeneral, 'AdminSettingsGeneral', 'General', 'general', true);

AdminGeneral.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var
			f2 = Utils.settingsSaveHelperSimpleFunction(self.languageTrigger, self),
			f3 = Utils.settingsSaveHelperSimpleFunction(self.themeTrigger, self)
		;

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
		
		self.capaAdditionalAccounts.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'CapaAdditionalAccounts': bValue ? '1' : '0'
			});
		});

		self.capaAdditionalIdentities.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'CapaAdditionalIdentities': bValue ? '1' : '0'
			});
		});

		self.capaGravatar.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'CapaGravatar': bValue ? '1' : '0'
			});
		});

		self.capaThemes.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'CapaThemes': bValue ? '1' : '0'
			});
		});

		self.allowLanguagesOnSettings.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowLanguagesOnSettings': bValue ? '1' : '0'
			});
		});

	}, 50);
};

AdminGeneral.prototype.selectLanguage = function ()
{
	kn.showScreenPopup(PopupsLanguagesViewModel);
};
