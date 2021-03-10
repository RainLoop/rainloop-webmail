import ko from 'ko';
import { Settings, SettingsGet } from 'Common/Globals';

export const LanguageStore = {
	languages: ko.observableArray(),
	userLanguage: ko.observable(''),

	populate: function() {
		const aLanguages = Settings.app('languages');
		this.languages(Array.isArray(aLanguages) ? aLanguages : []);
		this.language(SettingsGet('Language'));
		this.userLanguage(SettingsGet('UserLanguage'));
	}
}

LanguageStore.language = ko.observable('')
	.extend({ limitedList: LanguageStore.languages });
