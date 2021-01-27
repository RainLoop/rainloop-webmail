import ko from 'ko';

export const LanguageStore = {
	languages: ko.observableArray(),
	userLanguage: ko.observable(''),

	populate: function() {
		const Settings = rl.settings,
			aLanguages = Settings.app('languages');
		this.languages(Array.isArray(aLanguages) ? aLanguages : []);
		this.language(Settings.get('Language'));
		this.userLanguage(Settings.get('UserLanguage'));
	}
}

LanguageStore.language = ko.observable('')
	.extend({ limitedList: LanguageStore.languages, reversible: true });
