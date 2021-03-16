import ko from 'ko';

import { inFocus, addObservablesTo, addComputablesTo, addSubscribablesTo } from 'Common/Utils';
import { KeyState } from 'Common/Enums';
import { keyScope } from 'Common/Globals';
import { ViewType } from 'Knoin/Knoin';

class AbstractView {
	bDisabeCloseOnEsc = false;
	sDefaultKeyScope = KeyState.None;
	sCurrentKeyScope = KeyState.None;

	viewModelVisible = false;
	modalVisibility = ko.observable(false).extend({ rateLimit: 0 });

	viewModelName = '';
	viewModelDom = null;

	constructor(name, templateID, type)
	{
		this.viewModelName = 'View/' + name;
		this.viewModelTemplateID = templateID;
		this.viewModelPosition = type;
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

	cancelCommand() {}
	closeCommand() {}

	querySelector(selectors) {
		return this.viewModelDom.querySelector(selectors);
	}

	addObservables(observables) {
		addObservablesTo(this, observables);
	}

	addComputables(computables) {
		addComputablesTo(this, computables);
	}

	addSubscribables(subscribables) {
		addSubscribablesTo(this, subscribables);
	}

}

export class AbstractViewPopup extends AbstractView
{
	constructor(name)
	{
		super('Popup/' + name, 'Popups' + name, ViewType.Popup);
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
}

export class AbstractViewCenter extends AbstractView
{
	constructor(name, templateID)
	{
		super(name, templateID, ViewType.Center);
	}
}

export class AbstractViewLeft extends AbstractView
{
	constructor(name, templateID)
	{
		super(name, templateID, ViewType.Left);
	}
}

export class AbstractViewRight extends AbstractView
{
	constructor(name, templateID)
	{
		super(name, templateID, ViewType.Right);
	}
}
