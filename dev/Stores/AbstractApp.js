import ko from 'ko';
import * as Settings from 'Storage/Settings';

class AbstractAppStore {
	constructor() {
		this.allowLanguagesOnSettings = ko.observable(true);
		this.allowLanguagesOnLogin = ko.observable(true);
		this.newMoveToFolder = ko.observable(true);

		this.prem = ko.observable(false);
		this.community = ko.observable(true);
	}

	populate() {
		this.allowLanguagesOnLogin(!!Settings.settingsGet('AllowLanguagesOnLogin'));
		this.allowLanguagesOnSettings(!!Settings.settingsGet('AllowLanguagesOnSettings'));
		this.newMoveToFolder(!!Settings.settingsGet('NewMoveToFolder'));

		this.prem(!!Settings.settingsGet('PremType'));
		this.community(!!Settings.settingsGet('Community'));
	}
}

export { AbstractAppStore, AbstractAppStore as default };
