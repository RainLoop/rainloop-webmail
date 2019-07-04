import _ from '_';
import ko from 'ko';

import { convertLangName } from 'Common/Utils';

// import {view, ViewType} from 'Knoin/Knoin';
import { popup } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/Languages',
	templateID: 'PopupsLanguages'
})
class LanguagesPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.fLang = null;
		this.userLanguage = ko.observable('');

		this.langs = ko.observableArray([]);

		this.languages = ko.computed(() => {
			const userLanguage = this.userLanguage();
			return _.map(this.langs(), (language) => ({
				key: language,
				user: language === userLanguage,
				selected: ko.observable(false),
				fullName: convertLangName(language)
			}));
		});

		this.langs.subscribe(() => {
			this.setLanguageSelection();
		});
	}

	languageTooltipName(language) {
		const result = convertLangName(language, true);
		return convertLangName(language, false) === result ? '' : result;
	}

	setLanguageSelection() {
		const currentLang = this.fLang ? ko.unwrap(this.fLang) : '';
		_.each(this.languages(), (item) => {
			item.selected(item.key === currentLang);
		});
	}

	onBeforeShow() {
		this.fLang = null;
		this.userLanguage('');

		this.langs([]);
	}

	onShow(fLanguage, langs, userLanguage) {
		this.fLang = fLanguage;
		this.userLanguage(userLanguage || '');

		this.langs(langs);
	}

	changeLanguage(lang) {
		if (this.fLang) {
			this.fLang(lang);
		}

		this.cancelCommand();
	}
}

export { LanguagesPopupView, LanguagesPopupView as default };
