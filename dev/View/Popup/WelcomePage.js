import ko from 'ko';

import Promises from 'Promises/User/Ajax';

import { popup } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/WelcomePage',
	templateID: 'PopupsWelcomePage'
})
class WelcomePagePopupView extends AbstractViewNext {
	constructor() {
		super();

		this.welcomePageURL = ko.observable('');
	}

	clearPopup() {
		this.welcomePageURL('');
	}

	/**
	 * @param {string} sUrl
	 * @returns {void}
	 */
	onShow(sUrl) {
		this.clearPopup();

		this.welcomePageURL(sUrl);
	}

	onHide() {
		Promises.welcomeClose();
	}
}

export { WelcomePagePopupView, WelcomePagePopupView as default };
