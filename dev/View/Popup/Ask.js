import ko from 'ko';

import { KeyState } from 'Common/Enums';
import { i18n } from 'Common/Translator';

import { popup } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/Ask',
	templateID: 'PopupsAsk'
})
class AskPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.askDesc = ko.observable('');
		this.yesButton = ko.observable('');
		this.noButton = ko.observable('');

		this.fYesAction = null;
		this.fNoAction = null;

		this.bFocusYesOnShow = true;
		this.bDisabeCloseOnEsc = true;
		this.sDefaultKeyScope = KeyState.PopupAsk;
	}

	clearPopup() {
		this.askDesc('');
		this.yesButton(i18n('POPUPS_ASK/BUTTON_YES'));
		this.noButton(i18n('POPUPS_ASK/BUTTON_NO'));

		this.fYesAction = null;
		this.fNoAction = null;
	}

	yesClick() {
		this.cancelCommand();

		if (typeof this.fYesAction === 'function') {
			this.fYesAction.call(null);
		}
	}

	noClick() {
		this.cancelCommand();

		if (typeof this.fNoAction === 'function') {
			this.fNoAction.call(null);
		}
	}

	/**
	 * @param {string} sAskDesc
	 * @param {Function=} fYesFunc
	 * @param {Function=} fNoFunc
	 * @param {string=} sYesButton
	 * @param {string=} sNoButton
	 * @param {boolean=} bFocusYesOnShow = true
	 * @returns {void}
	 */
	onShow(askDesc, fYesFunc = null, fNoFunc = null, yesButton = '', noButton = '', isFocusYesOnShow = true) {
		this.clearPopup();

		this.fYesAction = fYesFunc || null;
		this.fNoAction = fNoFunc || null;

		this.askDesc(askDesc || '');

		if (yesButton) {
			this.yesButton(yesButton);
		}

		if (noButton) {
			this.noButton(noButton);
		}

		this.bFocusYesOnShow = !!isFocusYesOnShow;
	}

	onShowWithDelay() {
		if (this.bFocusYesOnShow) {
			this.querySelector('.buttonYes').focus();
		}
	}

	onBuild() {
		key('tab, shift+tab, right, left', KeyState.PopupAsk, () => {
			let btn = this.querySelector('.buttonYes');
			if (btn.matches(':focus')) {
				btn = this.querySelector('.buttonNo');
			}
			btn.focus();
			return false;
		});

		key('esc', KeyState.PopupAsk, () => {
			this.noClick();
			return false;
		});
	}
}

export { AskPopupView, AskPopupView as default };
