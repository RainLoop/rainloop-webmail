import ko from 'ko';
import { Scope } from 'Common/Enums';

let keyScopeFake = Scope.All;

export const

	doc = document,

	$htmlCL = doc.documentElement.classList,

	elementById = id => doc.getElementById(id),

	exitFullscreen = () => getFullscreenElement() && (doc.exitFullscreen || doc.webkitExitFullscreen)(),
	getFullscreenElement = () => doc.fullscreenElement || doc.webkitFullscreenElement,

	Settings = rl.settings,
	SettingsGet = Settings.get,

	dropdownVisibility = ko.observable(false).extend({ rateLimit: 0 }),

	moveAction = ko.observable(false),
	leftPanelDisabled = ko.observable(false),

	createElement = (name, attr) => {
		let el = doc.createElement(name);
		attr && Object.entries(attr).forEach(([k,v]) => el.setAttribute(k,v));
		return el;
	},

	// keys
	keyScopeReal = ko.observable(Scope.All),
	keyScope = value => {
		if (value) {
			if (Scope.Menu !== value) {
				keyScopeFake = value;
				if (dropdownVisibility()) {
					value = Scope.Menu;
				}
			}
			keyScopeReal(value);
			shortcuts.setScope(value);
		} else {
			return keyScopeFake;
		}
	};

dropdownVisibility.subscribe(value => {
	if (value) {
		keyScope(Scope.Menu);
	} else if (Scope.Menu === shortcuts.getScope()) {
		keyScope(keyScopeFake);
	}
});

leftPanelDisabled.subscribe(value => {
	value && moveAction() && moveAction(false);
	$htmlCL.toggle('rl-left-panel-disabled', value);
});

moveAction.subscribe(value => value && leftPanelDisabled() && leftPanelDisabled(false));
