import ko from 'ko';

import { inFocus } from 'Common/Utils';
import { KeyState } from 'Common/Enums';
import { keyScope } from 'Common/Globals';

export class AbstractViewNext {
	bDisabeCloseOnEsc = false;
	sDefaultKeyScope = KeyState.None;
	sCurrentKeyScope = KeyState.None;

	viewModelVisibility = ko.observable(false);
	modalVisibility = ko.observable(false).extend({ rateLimit: 0 });

	viewModelName = '';
	viewModelNames = [];
	viewModelDom = null;

	/**
	 * @returns {void}
	 */
	storeAndSetKeyScope() {
		this.sCurrentKeyScope = keyScope();
		keyScope(this.sDefaultKeyScope);
	}

	/**
	 * @returns {void}
	 */
	restoreKeyScope() {
		keyScope(this.sCurrentKeyScope);
	}

	/**
	 * @returns {void}
	 */
	registerPopupKeyDown() {
		addEventListener('keydown', event => {
			if (event && this.modalVisibility && this.modalVisibility()) {
				if (!this.bDisabeCloseOnEsc && 'Escape' == event.key) {
					this.cancelCommand && this.cancelCommand();
					return false;
				} else if ('Backspace' == event.key && !inFocus()) {
					return false;
				}
			}

			return true;
		});
	}

	cancelCommand() {} // eslint-disable-line no-empty-function
	closeCommand() {} // eslint-disable-line no-empty-function

	querySelector(selectors) {
		return this.viewModelDom.querySelector(selectors);
	}

}
