/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		Enums = require('Enums'),
		Utils = require('Utils'),

		Settings = require('Storage:Settings')
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
			mLayout = Utils.pInt(Settings.settingsGet('Layout')),
			aLanguages = Settings.settingsGet('Languages'),
			aThemes = Settings.settingsGet('Themes')
		;

		if (Utils.isArray(aLanguages))
		{
			this.languages(aLanguages);
		}

		if (Utils.isArray(aThemes))
		{
			this.themes(aThemes);
		}

		this.mainLanguage(Settings.settingsGet('Language'));
		this.mainTheme(Settings.settingsGet('Theme'));

		this.capaAdditionalAccounts(Settings.capa(Enums.Capa.AdditionalAccounts));
		this.capaAdditionalIdentities(Settings.capa(Enums.Capa.AdditionalIdentities));
		this.capaGravatar(Settings.capa(Enums.Capa.Gravatar));
		this.determineUserLanguage(!!Settings.settingsGet('DetermineUserLanguage'));
		this.determineUserDomain(!!Settings.settingsGet('DetermineUserDomain'));

		this.capaThemes(Settings.capa(Enums.Capa.Themes));
		this.allowLanguagesOnLogin(!!Settings.settingsGet('AllowLanguagesOnLogin'));
		this.allowLanguagesOnSettings(!!Settings.settingsGet('AllowLanguagesOnSettings'));
		this.useLocalProxyForExternalImages(!!Settings.settingsGet('UseLocalProxyForExternalImages'));

		this.editorDefaultType(Settings.settingsGet('EditorDefaultType'));
		this.showImages(!!Settings.settingsGet('ShowImages'));
		this.contactsAutosave(!!Settings.settingsGet('ContactsAutosave'));
		this.interfaceAnimation(Settings.settingsGet('InterfaceAnimation'));

		this.mainMessagesPerPage(Settings.settingsGet('MPP'));

		this.desktopNotifications(!!Settings.settingsGet('DesktopNotifications'));
		this.useThreads(!!Settings.settingsGet('UseThreads'));
		this.replySameFolder(!!Settings.settingsGet('ReplySameFolder'));
		this.useCheckboxesInList(!!Settings.settingsGet('UseCheckboxesInList'));

		this.layout(Enums.Layout.SidePreview);
		if (-1 < Utils.inArray(mLayout, [Enums.Layout.NoPreview, Enums.Layout.SidePreview, Enums.Layout.BottomPreview]))
		{
			this.layout(mLayout);
		}
		this.facebookSupported(!!Settings.settingsGet('SupportedFacebookSocial'));
		this.facebookEnable(!!Settings.settingsGet('AllowFacebookSocial'));
		this.facebookAppID(Settings.settingsGet('FacebookAppID'));
		this.facebookAppSecret(Settings.settingsGet('FacebookAppSecret'));

		this.twitterEnable(!!Settings.settingsGet('AllowTwitterSocial'));
		this.twitterConsumerKey(Settings.settingsGet('TwitterConsumerKey'));
		this.twitterConsumerSecret(Settings.settingsGet('TwitterConsumerSecret'));

		this.googleEnable(!!Settings.settingsGet('AllowGoogleSocial'));
		this.googleClientID(Settings.settingsGet('GoogleClientID'));
		this.googleClientSecret(Settings.settingsGet('GoogleClientSecret'));
		this.googleApiKey(Settings.settingsGet('GoogleApiKey'));

		this.dropboxEnable(!!Settings.settingsGet('AllowDropboxSocial'));
		this.dropboxApiKey(Settings.settingsGet('DropboxApiKey'));

		this.contactsIsAllowed(!!Settings.settingsGet('ContactsIsAllowed'));
	};

	module.exports = AbstractData;

}(module, require));