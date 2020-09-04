import ko from 'ko';

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
		const Settings = rl.settings,
			aLanguages = Settings.app('languages'),
			aLanguagesAdmin = Settings.app('languagesAdmin');

		this.languages(Array.isArray(aLanguages) ? aLanguages : []);
		this.languagesAdmin(Array.isArray(aLanguagesAdmin) ? aLanguagesAdmin : []);

		this.language(Settings.get('Language'));
		this.languageAdmin(Settings.get('LanguageAdmin'));

		this.userLanguage(Settings.get('UserLanguage'));
		this.userLanguageAdmin(Settings.get('UserLanguageAdmin'));
	}
}

export default new LanguageStore();
