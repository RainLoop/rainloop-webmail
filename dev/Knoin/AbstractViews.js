import ko from 'ko';

import { inFocus, addObservablesTo, addComputablesTo, addSubscribablesTo } from 'Common/Utils';
import { Scope } from 'Common/Enums';
import { keyScope } from 'Common/Globals';
import { ViewType } from 'Knoin/Knoin';

class AbstractView {
	constructor(name, templateID, type)
	{
		this.viewModelName = 'View/' + name;
		this.viewModelTemplateID = templateID;
		this.viewModelPosition = type;

		this.bDisabeCloseOnEsc = false;
		this.sDefaultScope = Scope.None;
		this.sCurrentScope = Scope.None;

		this.viewModelVisible = false;
		this.modalVisibility = ko.observable(false).extend({ rateLimit: 0 });

		this.viewModelName = '';
		this.viewModelDom = null;
	}

	/**
	 * @returns {void}
	 */
	storeAndSetScope() {
		this.sCurrentScope = keyScope();
		keyScope(this.sDefaultScope);
	}

	/**
	 * @returns {void}
	 */
	restoreScope() {
		keyScope(this.sCurrentScope);
	}

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
		if (name in Scope) {
			this.sDefaultScope = Scope[name];
		}
	}
/*
	cancelCommand() {}
	closeCommand() {}
*/
	/**
	 * @returns {void}
	 */
	registerPopupKeyDown() {
		addEventListener('keydown', event => {
			if (event && this.modalVisibility && this.modalVisibility()) {
				if (!this.bDisabeCloseOnEsc && 'Escape' == event.key) {
					this.cancelCommand();
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
		super(name, templateID, ViewType.Content);
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
