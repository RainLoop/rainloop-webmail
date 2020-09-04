import ko from 'ko';

class AbstractAppStore {
	constructor() {
		this.allowLanguagesOnSettings = ko.observable(true);
		this.allowLanguagesOnLogin = ko.observable(true);
		this.newMoveToFolder = ko.observable(true);
	}

	populate() {
		this.allowLanguagesOnLogin(!!rl.settings.get('AllowLanguagesOnLogin'));
		this.allowLanguagesOnSettings(!!rl.settings.get('AllowLanguagesOnSettings'));
		this.newMoveToFolder(!!rl.settings.get('NewMoveToFolder'));
	}
}

export { AbstractAppStore, AbstractAppStore as default };
