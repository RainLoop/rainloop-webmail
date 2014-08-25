/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
'use strict';

(function (module) {

	var
		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js'),

		AppSettings = require('./AppSettings.js')
	;

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
			mLayout = Utils.pInt(AppSettings.settingsGet('Layout')),
			aLanguages = AppSettings.settingsGet('Languages'),
			aThemes = AppSettings.settingsGet('Themes')
		;

		if (Utils.isArray(aLanguages))
		{
			this.languages(aLanguages);
		}

		if (Utils.isArray(aThemes))
		{
			this.themes(aThemes);
		}

		this.mainLanguage(AppSettings.settingsGet('Language'));
		this.mainTheme(AppSettings.settingsGet('Theme'));

		this.capaAdditionalAccounts(AppSettings.capa(Enums.Capa.AdditionalAccounts));
		this.capaAdditionalIdentities(AppSettings.capa(Enums.Capa.AdditionalIdentities));
		this.capaGravatar(AppSettings.capa(Enums.Capa.Gravatar));
		this.determineUserLanguage(!!AppSettings.settingsGet('DetermineUserLanguage'));
		this.determineUserDomain(!!AppSettings.settingsGet('DetermineUserDomain'));

		this.capaThemes(AppSettings.capa(Enums.Capa.Themes));
		this.allowLanguagesOnLogin(!!AppSettings.settingsGet('AllowLanguagesOnLogin'));
		this.allowLanguagesOnSettings(!!AppSettings.settingsGet('AllowLanguagesOnSettings'));
		this.useLocalProxyForExternalImages(!!AppSettings.settingsGet('UseLocalProxyForExternalImages'));

		this.editorDefaultType(AppSettings.settingsGet('EditorDefaultType'));
		this.showImages(!!AppSettings.settingsGet('ShowImages'));
		this.contactsAutosave(!!AppSettings.settingsGet('ContactsAutosave'));
		this.interfaceAnimation(AppSettings.settingsGet('InterfaceAnimation'));

		this.mainMessagesPerPage(AppSettings.settingsGet('MPP'));

		this.desktopNotifications(!!AppSettings.settingsGet('DesktopNotifications'));
		this.useThreads(!!AppSettings.settingsGet('UseThreads'));
		this.replySameFolder(!!AppSettings.settingsGet('ReplySameFolder'));
		this.useCheckboxesInList(!!AppSettings.settingsGet('UseCheckboxesInList'));

		this.layout(Enums.Layout.SidePreview);
		if (-1 < Utils.inArray(mLayout, [Enums.Layout.NoPreview, Enums.Layout.SidePreview, Enums.Layout.BottomPreview]))
		{
			this.layout(mLayout);
		}
		this.facebookSupported(!!AppSettings.settingsGet('SupportedFacebookSocial'));
		this.facebookEnable(!!AppSettings.settingsGet('AllowFacebookSocial'));
		this.facebookAppID(AppSettings.settingsGet('FacebookAppID'));
		this.facebookAppSecret(AppSettings.settingsGet('FacebookAppSecret'));

		this.twitterEnable(!!AppSettings.settingsGet('AllowTwitterSocial'));
		this.twitterConsumerKey(AppSettings.settingsGet('TwitterConsumerKey'));
		this.twitterConsumerSecret(AppSettings.settingsGet('TwitterConsumerSecret'));

		this.googleEnable(!!AppSettings.settingsGet('AllowGoogleSocial'));
		this.googleClientID(AppSettings.settingsGet('GoogleClientID'));
		this.googleClientSecret(AppSettings.settingsGet('GoogleClientSecret'));
		this.googleApiKey(AppSettings.settingsGet('GoogleApiKey'));

		this.dropboxEnable(!!AppSettings.settingsGet('AllowDropboxSocial'));
		this.dropboxApiKey(AppSettings.settingsGet('DropboxApiKey'));

		this.contactsIsAllowed(!!AppSettings.settingsGet('ContactsIsAllowed'));
	};

	module.exports = AbstractData;

}(module));