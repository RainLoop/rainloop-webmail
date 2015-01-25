
(function () {

	'use strict';

	var
		Enums = require('Common/Enums'),
		Utils = require('Common/Utils'),

		Settings = require('Storage/Settings')
	;

	/**
	 * @constructor
	 */
	function AbstractDataStorate()
	{
		Utils.initDataConstructorBySettings(this);
	}

	AbstractDataStorate.prototype.populateDataOnStart = function()
	{
		this.capaAdditionalAccounts(Settings.capa(Enums.Capa.AdditionalAccounts));
		this.capaAdditionalIdentities(Settings.capa(Enums.Capa.AdditionalIdentities));
		this.capaGravatar(Settings.capa(Enums.Capa.Gravatar));
		this.capaAttachmentThumbnails(Settings.capa(Enums.Capa.AttachmentThumbnails));
		this.capaSieve(Settings.capa(Enums.Capa.Sieve));
		this.determineUserLanguage(!!Settings.settingsGet('DetermineUserLanguage'));
		this.determineUserDomain(!!Settings.settingsGet('DetermineUserDomain'));

		this.weakPassword(!!Settings.settingsGet('WeakPassword'));

		this.capaThemes(Settings.capa(Enums.Capa.Themes));
		this.capaUserBackground(Settings.capa(Enums.Capa.UserBackground));
		this.allowLanguagesOnLogin(!!Settings.settingsGet('AllowLanguagesOnLogin'));
		this.allowLanguagesOnSettings(!!Settings.settingsGet('AllowLanguagesOnSettings'));
		this.useLocalProxyForExternalImages(!!Settings.settingsGet('UseLocalProxyForExternalImages'));

		this.showImages(!!Settings.settingsGet('ShowImages'));
		this.contactsAutosave(!!Settings.settingsGet('ContactsAutosave'));
		this.interfaceAnimation(!!Settings.settingsGet('InterfaceAnimation'));

		this.useThreads(!!Settings.settingsGet('UseThreads'));
		this.replySameFolder(!!Settings.settingsGet('ReplySameFolder'));
		this.useCheckboxesInList(!!Settings.settingsGet('UseCheckboxesInList'));

		require('Stores/Social').populate();
		require('Stores/UserSettings').populate();
		require('Stores/NotificationSettings').populate();

		this.contactsIsAllowed(!!Settings.settingsGet('ContactsIsAllowed'));
	};

	module.exports = AbstractDataStorate;

}());