import ko from 'ko';
import { KeyState } from 'Common/Enums';

export const $html = document.documentElement;
export const $htmlCL = $html.classList;

/**
 * @type {?}
 */
export const dropdownVisibility = ko.observable(false).extend({ rateLimit: 0 });

export const VIEW_MODELS = {
	settings: [],
	'settings-removed': [],
	'settings-disabled': []
};

export const moveAction = ko.observable(false);
export const leftPanelDisabled = ko.observable(false);
export const leftPanelType = ko.observable('');
export const leftPanelWidth = ko.observable(0);

leftPanelDisabled.subscribe(value => value && moveAction() && moveAction(false));

moveAction.subscribe(value => value && leftPanelDisabled() && leftPanelDisabled(false));

// keys
export const keyScopeReal = ko.observable(KeyState.All);
export const keyScopeFake = ko.observable(KeyState.All);

export const keyScope = ko.computed({
	read: () => keyScopeFake(),
	write: value => {
		if (KeyState.Menu !== value) {
			keyScopeFake(value);
			if (dropdownVisibility()) {
				value = KeyState.Menu;
			}
		}

		keyScopeReal(value);
	}
});

keyScopeReal.subscribe(value => shortcuts.setScope(value));

dropdownVisibility.subscribe(value => {
	if (value) {
		keyScope(KeyState.Menu);
	} else if (KeyState.Menu === shortcuts.getScope()) {
		keyScope(keyScopeFake());
	}
});
