/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AbstractData()
{
	Utils.initDataConstructorBySettings(this);
}

AbstractData.prototype.populateDataOnStart = function()
{
	var
		aLanguages = RL.settingsGet('Languages'),
		aThemes = RL.settingsGet('Themes')
	;

	if (Utils.isArray(aLanguages))
	{
		this.languages(aLanguages);
	}

	if (Utils.isArray(aThemes))
	{
		this.themes(aThemes);
	}

	this.mainLanguage(RL.settingsGet('Language'));
	this.mainTheme(RL.settingsGet('Theme'));

	this.allowCustomTheme(!!RL.settingsGet('AllowCustomTheme'));
	this.allowAdditionalAccounts(!!RL.settingsGet('AllowAdditionalAccounts'));
	this.allowIdentities(!!RL.settingsGet('AllowIdentities'));
	this.determineUserLanguage(!!RL.settingsGet('DetermineUserLanguage'));
	
	this.allowThemes(!!RL.settingsGet('AllowThemes'));
	this.allowCustomLogin(!!RL.settingsGet('AllowCustomLogin'));
	this.allowLanguagesOnLogin(!!RL.settingsGet('AllowLanguagesOnLogin'));
	this.allowLanguagesOnSettings(!!RL.settingsGet('AllowLanguagesOnSettings'));

	this.editorDefaultType(RL.settingsGet('EditorDefaultType'));
	this.showImages(!!RL.settingsGet('ShowImages'));
	this.interfaceAnimation(RL.settingsGet('InterfaceAnimation'));

	this.mainMessagesPerPage(RL.settingsGet('MPP'));

	this.desktopNotifications(!!RL.settingsGet('DesktopNotifications'));
	this.useThreads(!!RL.settingsGet('UseThreads'));
	this.replySameFolder(!!RL.settingsGet('ReplySameFolder'));
	this.usePreviewPane(!!RL.settingsGet('UsePreviewPane'));
	this.useCheckboxesInList(!!RL.settingsGet('UseCheckboxesInList'));

	this.facebookEnable(!!RL.settingsGet('AllowFacebookSocial'));
	this.facebookAppID(RL.settingsGet('FacebookAppID'));
	this.facebookAppSecret(RL.settingsGet('FacebookAppSecret'));

	this.twitterEnable(!!RL.settingsGet('AllowTwitterSocial'));
	this.twitterConsumerKey(RL.settingsGet('TwitterConsumerKey'));
	this.twitterConsumerSecret(RL.settingsGet('TwitterConsumerSecret'));

	this.googleEnable(!!RL.settingsGet('AllowGoogleSocial'));
	this.googleClientID(RL.settingsGet('GoogleClientID'));
	this.googleClientSecret(RL.settingsGet('GoogleClientSecret'));

	this.dropboxEnable(!!RL.settingsGet('AllowDropboxSocial'));
	this.dropboxApiKey(RL.settingsGet('DropboxApiKey'));

	this.contactsIsAllowed(!!RL.settingsGet('ContactsIsAllowed'));
};
