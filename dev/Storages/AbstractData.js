/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function AbstractData()
{
	this.leftPanelDisabled = ko.observable(false);
	this.useKeyboardShortcuts = ko.observable(true);

	this.keyScopeReal = ko.observable(Enums.KeyState.All);
	this.keyScopeFake = ko.observable(Enums.KeyState.All);

	this.keyScope = ko.computed({
		'owner': this,
		'read': function () {
			return this.keyScopeFake();
		},
		'write': function (sValue) {

			if (Enums.KeyState.Menu !== sValue)
			{
				if (Enums.KeyState.Compose === sValue)
				{
					Utils.disableKeyFilter();
				}
				else
				{
					Utils.restoreKeyFilter();
				}

				this.keyScopeFake(sValue);
				if (Globals.dropdownVisibility())
				{
					sValue = Enums.KeyState.Menu;
				}
			}

			this.keyScopeReal(sValue);
		}
	});

	this.keyScopeReal.subscribe(function (sValue) {
//		window.console.log(sValue);
		key.setScope(sValue);
	});

	this.leftPanelDisabled.subscribe(function (bValue) {
		RL.pub('left-panel.' + (bValue ? 'off' : 'on'));
	});

	Globals.dropdownVisibility.subscribe(function (bValue) {
		if (bValue)
		{
			Globals.tooltipTrigger(!Globals.tooltipTrigger());
			this.keyScope(Enums.KeyState.Menu);
		}
		else if (Enums.KeyState.Menu === key.getScope())
		{
			this.keyScope(this.keyScopeFake());
		}
	}, this);

	Utils.initDataConstructorBySettings(this);
}

AbstractData.prototype.populateDataOnStart = function()
{
	var
		mLayout = Utils.pInt(RL.settingsGet('Layout')),
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

	this.capaAdditionalAccounts(RL.capa(Enums.Capa.AdditionalAccounts));
	this.capaAdditionalIdentities(RL.capa(Enums.Capa.AdditionalIdentities));
	this.capaGravatar(RL.capa(Enums.Capa.Gravatar));
	this.determineUserLanguage(!!RL.settingsGet('DetermineUserLanguage'));

	this.capaThemes(RL.capa(Enums.Capa.Themes));
	this.allowLanguagesOnLogin(!!RL.settingsGet('AllowLanguagesOnLogin'));
	this.allowLanguagesOnSettings(!!RL.settingsGet('AllowLanguagesOnSettings'));
	this.useLocalProxyForExternalImages(!!RL.settingsGet('UseLocalProxyForExternalImages'));

	this.editorDefaultType(RL.settingsGet('EditorDefaultType'));
	this.showImages(!!RL.settingsGet('ShowImages'));
	this.contactsAutosave(!!RL.settingsGet('ContactsAutosave'));
	this.interfaceAnimation(RL.settingsGet('InterfaceAnimation'));

	this.mainMessagesPerPage(RL.settingsGet('MPP'));

	this.desktopNotifications(!!RL.settingsGet('DesktopNotifications'));
	this.useThreads(!!RL.settingsGet('UseThreads'));
	this.replySameFolder(!!RL.settingsGet('ReplySameFolder'));
	this.replyCounter(!!RL.settingsGet('ReplyCounter'));
	this.useCheckboxesInList(!!RL.settingsGet('UseCheckboxesInList'));

	this.layout(Enums.Layout.SidePreview);
	if (-1 < Utils.inArray(mLayout, [Enums.Layout.NoPreview, Enums.Layout.SidePreview, Enums.Layout.BottomPreview]))
	{
		this.layout(mLayout);
	}
	this.facebookSupported(!!RL.settingsGet('SupportedFacebookSocial'));
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
