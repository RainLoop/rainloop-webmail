import ko from 'ko';
import { Scope } from 'Common/Enums';

export const doc = document;

export const $htmlCL = doc.documentElement.classList;

export const elementById = id => doc.getElementById(id);

export const Settings = rl.settings;
export const SettingsGet = rl.settings.get;

export const dropdownVisibility = ko.observable(false).extend({ rateLimit: 0 });

export const moveAction = ko.observable(false);
export const leftPanelDisabled = ko.observable(false);

export const createElement = (name, attr) => {
	let el = doc.createElement(name);
	attr && Object.entries(attr).forEach(([k,v]) => el.setAttribute(k,v));
	return el;
};

leftPanelDisabled.subscribe(value => {
	value && moveAction() && moveAction(false);
	$htmlCL.toggle('rl-left-panel-disabled', value);
});

moveAction.subscribe(value => value && leftPanelDisabled() && leftPanelDisabled(false));

// keys
export const keyScopeReal = ko.observable(Scope.All);

export const keyScope = (()=>{
	let keyScopeFake = Scope.All;
	dropdownVisibility.subscribe(value => {
		if (value) {
			keyScope(Scope.Menu);
		} else if (Scope.Menu === shortcuts.getScope()) {
			keyScope(keyScopeFake);
		}
	});
	return ko.computed({
		read: () => keyScopeFake,
		write: value => {
			if (Scope.Menu !== value) {
				keyScopeFake = value;
				if (dropdownVisibility()) {
					value = Scope.Menu;
				}
			}

			keyScopeReal(value);
		}
	});
})();

keyScopeReal.subscribe(value => shortcuts.setScope(value));
