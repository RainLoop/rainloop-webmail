
import ko from 'ko';

import {delegateRun, inFocus} from 'Common/Utils';
import {KeyState, EventKeyCode} from 'Common/Enums';
import {$win, keyScope} from 'Common/Globals';

class AbstractViewNext
{
	constructor() {
		this.bDisabeCloseOnEsc = false;
		this.sDefaultKeyScope = KeyState.None;
		this.sCurrentKeyScope = this.sDefaultKeyScope;

		this.viewModelVisibility = ko.observable(false);
		this.modalVisibility = ko.observable(false).extend({rateLimit: 0});

		this.viewModelName = '';
		this.viewModelNames = [];
		this.viewModelDom = null;
	}

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
		$win.on('keydown', (event) => {
			if (event && this.modalVisibility && this.modalVisibility())
			{
				if (!this.bDisabeCloseOnEsc && EventKeyCode.Esc === event.keyCode)
				{
					delegateRun(this, 'cancelCommand');
					return false;
				}
				else if (EventKeyCode.Backspace === event.keyCode && !inFocus())
				{
					return false;
				}
			}

			return true;
		});
	}

	cancelCommand() {} // eslint-disable-line no-empty-function
	closeCommand() {} // eslint-disable-line no-empty-function
}

export {AbstractViewNext, AbstractViewNext as default};
