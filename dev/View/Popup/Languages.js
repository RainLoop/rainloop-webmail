import ko from 'ko';
import { koComputable } from 'External/ko';

import { convertLangName } from 'Common/Translator';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class LanguagesPopupView extends AbstractViewPopup {
	constructor() {
		super('Languages');

		this.fLang = null;
		this.userLanguage = ko.observable('');

		this.langs = ko.observableArray();

		this.languages = koComputable(() => {
			const userLanguage = this.userLanguage();
			return this.langs.map(language => ({
				key: language,
				user: language === userLanguage,
				selected: ko.observable(false),
				fullName: convertLangName(language)
			}));
		});

		this.langs.subscribe(() => this.setLanguageSelection());
	}

	languageTooltipName(language) {
		return convertLangName(language, true);
	}

	setLanguageSelection() {
		const currentLang = this.fLang ? ko.unwrap(this.fLang) : '';
		this.languages().forEach(item => item.selected(item.key === currentLang));
	}

	beforeShow() {
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
		this.fLang?.(lang);
		this.close();
	}
}
