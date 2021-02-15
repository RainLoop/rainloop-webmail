import ko from 'ko';
import { KeyState } from 'Common/Enums';

export const doc = document;

export const $htmlCL = doc.documentElement.classList;

export const Settings = rl.settings;

/** @media screen and (max-width: 600px) { */
export const isMobile = () => $htmlCL.contains('rl-mobile'); // || rl.settings.app('mobile')

export const dropdownVisibility = ko.observable(false).extend({ rateLimit: 0 });

export const moveAction = ko.observable(false);
export const leftPanelDisabled = ko.observable(false);
export const leftPanelType = ko.observable('');

export const createElement = (name, attr) => {
	let el = doc.createElement(name);
	attr && Object.entries(attr).forEach(([k,v]) => el.setAttribute(k,v));
	return el;
};

leftPanelDisabled.subscribe(value => {
	value && moveAction() && moveAction(false);
	$htmlCL.toggle('rl-left-panel-disabled', value);
});

leftPanelType.subscribe(sValue => {
	$htmlCL.toggle('rl-left-panel-none', 'none' === sValue);
	$htmlCL.toggle('rl-left-panel-short', 'short' === sValue);
});

moveAction.subscribe(value => value && leftPanelDisabled() && leftPanelDisabled(false));

// keys
export const keyScopeReal = ko.observable(KeyState.All);

export const keyScope = (()=>{
	let keyScopeFake = KeyState.All;
	dropdownVisibility.subscribe(value => {
		if (value) {
			keyScope(KeyState.Menu);
		} else if (KeyState.Menu === shortcuts.getScope()) {
			keyScope(keyScopeFake);
		}
	});
	return ko.computed({
		read: () => keyScopeFake,
		write: value => {
			if (KeyState.Menu !== value) {
				keyScopeFake = value;
				if (dropdownVisibility()) {
					value = KeyState.Menu;
				}
			}

			keyScopeReal(value);
		}
	});
})();

keyScopeReal.subscribe(value => shortcuts.setScope(value));
