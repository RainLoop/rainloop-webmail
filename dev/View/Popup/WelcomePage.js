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

		this.closeFocused = ko.observable(false);
	}

	clearPopup() {
		this.welcomePageURL('');
		this.closeFocused(false);
	}

	/**
	 * @param {string} sUrl
	 * @returns {void}
	 */
	onShow(sUrl) {
		this.clearPopup();

		this.welcomePageURL(sUrl);
	}

	onShowWithDelay() {
		this.closeFocused(true);
	}

	onHide() {
		Promises.welcomeClose();
	}
}

export { WelcomePagePopupView, WelcomePagePopupView as default };
