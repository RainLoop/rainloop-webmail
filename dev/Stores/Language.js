import ko from 'ko';
import { Settings, SettingsGet } from 'Common/Globals';
import { isArray } from 'Common/Utils';

export const LanguageStore = {
	language: ko.observable(''),
	languages: ko.observableArray(),
	userLanguage: ko.observable(''),
	hourCycle: ko.observable(''),

	populate: function() {
		const aLanguages = Settings.app('languages');
		this.languages(isArray(aLanguages) ? aLanguages : []);
		this.language(SettingsGet('Language'));
		this.userLanguage(SettingsGet('UserLanguage'));
		this.hourCycle(SettingsGet('hourCycle'));
	}
}
