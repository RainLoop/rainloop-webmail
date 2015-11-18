
import ko from 'ko';
import Settings from 'Storage/Settings';

import {AbstractAppStore} from 'Stores/AbstractApp';

class AppAdminStore extends AbstractAppStore
{
	constructor()
	{
		super();

		this.determineUserLanguage = ko.observable(false);
		this.determineUserDomain = ko.observable(false);

		this.weakPassword = ko.observable(false);
		this.useLocalProxyForExternalImages = ko.observable(false);
	}

	populate() {

		super.populate();

		this.determineUserLanguage(!!Settings.settingsGet('DetermineUserLanguage'));
		this.determineUserDomain(!!Settings.settingsGet('DetermineUserDomain'));

		this.weakPassword(!!Settings.settingsGet('WeakPassword'));
		this.useLocalProxyForExternalImages(!!Settings.settingsGet('UseLocalProxyForExternalImages'));
	};
}

module.exports = new AppAdminStore();
