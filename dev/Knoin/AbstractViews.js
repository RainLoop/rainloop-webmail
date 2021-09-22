import ko from 'ko';

import { inFocus, addObservablesTo, addComputablesTo, addSubscribablesTo } from 'Common/Utils';
import { Scope } from 'Common/Enums';
import { keyScope } from 'Common/Globals';
import { ViewType } from 'Knoin/Knoin';

class AbstractView {
	constructor(name, templateID, type)
	{
//		Object.defineProperty(this, 'templateId', { value: templateID });
		this.templateId = templateID;
		this.viewType = type;
		this.viewModelDom = null;

		this.modalVisibility = ko.observable(false).extend({ rateLimit: 0 });

		this.keyScope = {
			scope: Scope.None,
			previous: Scope.None,
			set: function() {
				this.previous = keyScope();
				keyScope(this.scope);
			},
			unset: function() {
				keyScope(this.previous);
			}
		};
	}

/*
	onBuild() {}
	onBeforeShow() {}
	onShow() {}
	onHide() {}
*/

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
			this.keyScope.scope = Scope[name];
		}
		this.bDisabeCloseOnEsc = false;
	}
/*
	onShowWithDelay() {}
	onHideWithDelay() {}

	cancelCommand() {}
	closeCommand() {}
*/
	/**
	 * @returns {void}
	 */
	registerPopupKeyDown() {
		addEventListener('keydown', event => {
			if (event && this.modalVisibility()) {
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

/*
export class AbstractViewSettings
{
	onBuild(viewModelDom) {}
	onBeforeShow() {}
	onShow() {}
	onHide() {}
	viewModelDom
}
*/
