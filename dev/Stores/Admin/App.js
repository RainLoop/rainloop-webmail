
import ko from 'ko';
import {settingsGet} from 'Storage/Settings';
import {AbstractAppStore} from 'Stores/AbstractApp';

class AppAdminStore extends AbstractAppStore
{
	constructor() {
		super();

		this.determineUserLanguage = ko.observable(false);
		this.determineUserDomain = ko.observable(false);

		this.weakPassword = ko.observable(false);
		this.useLocalProxyForExternalImages = ko.observable(false);
	}

	populate() {
		super.populate();

		this.determineUserLanguage(!!settingsGet('DetermineUserLanguage'));
		this.determineUserDomain(!!settingsGet('DetermineUserDomain'));

		this.weakPassword(!!settingsGet('WeakPassword'));
		this.useLocalProxyForExternalImages(!!settingsGet('UseLocalProxyForExternalImages'));
	}
}

export default new AppAdminStore();
