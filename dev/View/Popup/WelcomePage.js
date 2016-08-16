
import ko from 'ko';

import Promises from 'Promises/User/Ajax';

import {view, ViewType} from 'Knoin/Knoin';
import {AbstractViewNext} from 'Knoin/AbstractViewNext';

@view({
	name: 'View/Popup/WelcomePage',
	type: ViewType.Popup,
	templateID: 'PopupsWelcomePage'
})
class WelcomePagePopupView extends AbstractViewNext
{
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

module.exports = WelcomePagePopupView;
