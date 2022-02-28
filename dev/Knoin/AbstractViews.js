import ko from 'ko';

import { inFocus } from 'Common/Utils';
import { addObservablesTo, addComputablesTo, addSubscribablesTo } from 'External/ko';
import { Scope } from 'Common/Enums';
import { keyScope, Settings, leftPanelDisabled } from 'Common/Globals';
import { ViewType, showScreenPopup } from 'Knoin/Knoin';

import { SaveSettingsStep } from 'Common/Enums';
import { SettingsGet } from 'Common/Globals';

class AbstractView {
	constructor(templateID, type)
	{
//		Object.defineProperty(this, 'viewModelTemplateID', { value: templateID });
		this.viewModelTemplateID = templateID;
		this.viewType = type;
		this.viewModelDom = null;

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
	onBeforeShow() {} // Happens before: hidden = false
	onShow() {}       // Happens after: hidden = false
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
		super('Popups' + name, ViewType.Popup);
		this.keyScope.scope = name;
		this.modalVisible = ko.observable(false).extend({ rateLimit: 0 });
		shortcuts.add('escape,close', '', name, () => {
			if (this.modalVisible() && false !== this.onClose()) {
				this.closeCommand();
				return false;
			}
			return true;
		});
		shortcuts.add('backspace', '', name, inFocus());
	}

	// Happens when user hits Escape or Close key
	// return false to prevent closing
	onClose() {}

/*
	onBeforeShow() {} // Happens before showModal()
	onShow() {}       // Happens after  showModal()
	afterShow() {}    // Happens after  showModal() animation transitionend
	onHide() {}       // Happens before animation transitionend
	afterHide() {}    // Happens after  animation transitionend

	closeCommand() {}
*/
}

AbstractViewPopup.showModal = function(params = []) {
	showScreenPopup(this, params);
}

AbstractViewPopup.hidden = function() {
	return !this.__vm || !this.__vm.modalVisible();
}

export class AbstractViewCenter extends AbstractView
{
	constructor(templateID)
	{
		super(templateID, ViewType.Content);
	}
}

export class AbstractViewLeft extends AbstractView
{
	constructor(templateID)
	{
		super(templateID, ViewType.Left);
		this.leftPanelDisabled = leftPanelDisabled;
	}
}

export class AbstractViewRight extends AbstractView
{
	constructor(templateID)
	{
		super(templateID, ViewType.Right);
	}
}

export class AbstractViewSettings
{
/*
	onBuild(viewModelDom) {}
	onBeforeShow() {}
	onShow() {}
	onHide() {}
	viewModelDom
*/
	addSetting(name, valueCb)
	{
		let prop = name = name[0].toLowerCase() + name.slice(1),
			trigger = prop + 'Trigger';
		addObservablesTo(this, {
			[prop]: SettingsGet(name),
			[trigger]: SaveSettingsStep.Idle,
		});
		addSubscribablesTo(this, {
			[prop]: (value => {
				this[trigger](SaveSettingsStep.Animate);
				valueCb && valueCb(value);
				rl.app.Remote.saveSetting(name, value,
					iError => {
						this[trigger](iError ? SaveSettingsStep.FalseResult : SaveSettingsStep.TrueResult);
						setTimeout(() => this[trigger](SaveSettingsStep.Idle), 1000);
					}
				);
			}).debounce(999),
		});
	}
}

export class AbstractViewLogin extends AbstractViewCenter {
	constructor(templateID) {
		super(templateID);
		this.hideSubmitButton = Settings.app('hideSubmitButton');
		this.formError = ko.observable(false).extend({ falseTimeout: 500 });
	}

	onBuild(dom) {
		dom.classList.add('LoginView');
	}

	onShow() {
		rl.route.off();
	}

	submitForm() {
//		return false;
	}
}
