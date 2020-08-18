import ko from 'ko';

import { inFocus } from 'Common/Utils';
import { KeyState, EventKeyCode } from 'Common/Enums';
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
		addEventListener('keydown', (event) => {
			if (event && this.modalVisibility && this.modalVisibility()) {
				if (!this.bDisabeCloseOnEsc && EventKeyCode.Esc === event.keyCode) {
					this.cancelCommand && this.cancelCommand();
					return false;
				} else if (EventKeyCode.Backspace === event.keyCode && !inFocus()) {
					return false;
				}
			}

			return true;
		});
	}

	cancelCommand() {} // eslint-disable-line no-empty-function
	closeCommand() {} // eslint-disable-line no-empty-function
}
