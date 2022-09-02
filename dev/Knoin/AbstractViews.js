import ko from 'ko';

import { addObservablesTo, addComputablesTo, addSubscribablesTo } from 'External/ko';
import { keyScope, SettingsGet, leftPanelDisabled, elementById } from 'Common/Globals';
import { ViewTypePopup, showScreenPopup } from 'Knoin/Knoin';

import { SaveSettingsStep } from 'Common/Enums';

class AbstractView {
	constructor(templateID, type)
	{
//		Object.defineProperty(this, 'viewModelTemplateID', { value: templateID });
		this.viewModelTemplateID = templateID || this.constructor.name.replace('UserView', '');
		this.viewType = type;
		this.viewModelDom = null;

		this.keyScope = {
			scope: 'none',
			previous: 'none',
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
	beforeShow() {} // Happens before: hidden = false
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
		super('Popups' + name, ViewTypePopup);
		this.keyScope.scope = name;
		this.modalVisible = ko.observable(false).extend({ rateLimit: 0 });
		shortcuts.add('escape,close', '', name, () => {
			if (this.modalVisible() && false !== this.onClose()) {
				this.close();
				return false;
			}
			return true;
		});
	}

	// Happens when user hits Escape or Close key
	// return false to prevent closing
	onClose() {}

/*
	beforeShow() {} // Happens before showModal()
	onShow() {}     // Happens after  showModal()
	afterShow() {}  // Happens after  showModal() animation transitionend
	onHide() {}     // Happens before animation transitionend
	afterHide() {}  // Happens after  animation transitionend

	close() {}
*/
}

AbstractViewPopup.showModal = function(params = []) {
	showScreenPopup(this, params);
}

AbstractViewPopup.hidden = function() {
	return !this.__vm || !this.__vm.modalVisible();
}

export class AbstractViewLeft extends AbstractView
{
	constructor(templateID)
	{
		super(templateID, 'Left');
		this.leftPanelDisabled = leftPanelDisabled;
	}
}

export class AbstractViewRight extends AbstractView
{
	constructor(templateID)
	{
		super(templateID, 'Right');
	}
}

export class AbstractViewSettings
{
/*
	onBuild(viewModelDom) {}
	beforeShow() {}
	onShow() {}
	onHide() {}
	viewModelDom
*/
	addSetting(name, valueCb)
	{
		let prop = name[0].toLowerCase() + name.slice(1),
			trigger = prop + 'Trigger';
		addObservablesTo(this, {
			[prop]: SettingsGet(name),
			[trigger]: SaveSettingsStep.Idle,
		});
		addSubscribablesTo(this, {
			[prop]: (value => {
				this[trigger](SaveSettingsStep.Animate);
				valueCb?.(value);
				rl.app.Remote.saveSetting(name, value,
					iError => {
						this[trigger](iError ? SaveSettingsStep.FalseResult : SaveSettingsStep.TrueResult);
						setTimeout(() => this[trigger](SaveSettingsStep.Idle), 1000);
					}
				);
			}).debounce(999),
		});
	}

	addSettings(names)
	{
		names.forEach(name => {
			let prop = name[0].toLowerCase() + name.slice(1);
			this[prop] || (this[prop] = ko.observable(SettingsGet(name)));
			this[prop].subscribe(value => rl.app.Remote.saveSetting(name, value));
		});
	}
}

export class AbstractViewLogin extends AbstractView {
	constructor(templateID) {
		super(templateID, 'Content');
		this.formError = ko.observable(false).extend({ falseTimeout: 500 });
	}

	onBuild(dom) {
		dom.classList.add('LoginView');
	}

	onShow() {
		elementById('rl-left').hidden = true;
		elementById('rl-right').hidden = true;
		rl.route.off();
	}

	onHide() {
		elementById('rl-left').hidden = false;
		elementById('rl-right').hidden = false;
	}

	submitForm() {
//		return false;
	}
}
