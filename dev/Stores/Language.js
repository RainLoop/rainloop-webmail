import ko from 'ko';
import { isArray } from 'Common/Utils';
import * as Settings from 'Storage/Settings';

class LanguageStore {
	constructor() {
		this.languages = ko.observableArray([]);
		this.languagesAdmin = ko.observableArray([]);

		this.language = ko
			.observable('')
			.extend({ limitedList: this.languages })
			.extend({ reversible: true });

		this.languageAdmin = ko
			.observable('')
			.extend({ limitedList: this.languagesAdmin })
			.extend({ reversible: true });

		this.userLanguage = ko.observable('');
		this.userLanguageAdmin = ko.observable('');
	}

	populate() {
		const aLanguages = Settings.appSettingsGet('languages'),
			aLanguagesAdmin = Settings.appSettingsGet('languagesAdmin');

		this.languages(isArray(aLanguages) ? aLanguages : []);
		this.languagesAdmin(isArray(aLanguagesAdmin) ? aLanguagesAdmin : []);

		this.language(Settings.settingsGet('Language'));
		this.languageAdmin(Settings.settingsGet('LanguageAdmin'));

		this.userLanguage(Settings.settingsGet('UserLanguage'));
		this.userLanguageAdmin(Settings.settingsGet('UserLanguageAdmin'));
	}
}

export default new LanguageStore();
