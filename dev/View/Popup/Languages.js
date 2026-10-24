import ko from 'ko';

import { convertLangName } from 'Common/Translator';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class LanguagesPopupView extends AbstractViewPopup {
	constructor() {
		super('Languages');
		this.fLang = null;
		this.languages = ko.observableArray();
	}

	onShow(fLanguage, langs, userLanguage) {
		this.fLang = fLanguage;
		this.languages(langs.map(language => ({
			key: language,
			user: userLanguage === language,
			selected: fLanguage?.() === language,
			fullName: convertLangName(language),
			title: convertLangName(language, true)
		})));
	}

	changeLanguage(lang) {
		this.fLang?.(lang);
		this.close();
	}
}
