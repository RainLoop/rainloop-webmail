import ko from 'ko';

let keyScopeFake = 'all';

export const
	ScopeMenu = 'Menu',

	doc = document,

	$htmlCL = doc.documentElement.classList,

	elementById = id => doc.getElementById(id),

	exitFullscreen = () => getFullscreenElement() && (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc),
	getFullscreenElement = () => doc.fullscreenElement || doc.webkitFullscreenElement,

	Settings = rl.settings,
	SettingsGet = Settings.get,
	SettingsCapa = Settings.capa,

	dropdowns = [],
	dropdownVisibility = ko.observable(false).extend({ rateLimit: 0 }),

	moveAction = ko.observable(false),
	leftPanelDisabled = ko.observable(false),

	createElement = (name, attr) => {
		let el = doc.createElement(name);
		attr && Object.entries(attr).forEach(([k,v]) => el.setAttribute(k,v));
		return el;
	},

	fireEvent = (name, detail) => dispatchEvent(new CustomEvent(name, {detail:detail})),

	formFieldFocused = () => doc.activeElement && doc.activeElement.matches('input,textarea'),

	addShortcut = (...args) => shortcuts.add(...args),

	registerShortcut = (keys, modifiers, scopes, method) =>
		addShortcut(keys, modifiers, scopes, event => formFieldFocused() ? true : method(event)),

	addEventsListener = (element, events, fn, options) =>
		events.forEach(event => element.addEventListener(event, fn, options)),

	addEventsListeners = (element, events) =>
		Object.entries(events).forEach(([event, fn]) => element.addEventListener(event, fn)),

	// keys / shortcuts
	keyScopeReal = ko.observable('all'),
	keyScope = value => {
		if (!value) {
			return keyScopeFake;
		}
		if (ScopeMenu !== value) {
			keyScopeFake = value;
			if (dropdownVisibility()) {
				value = ScopeMenu;
			}
		}
		keyScopeReal(value);
		shortcuts.setScope(value);
	};

dropdownVisibility.subscribe(value => {
	if (value) {
		keyScope(ScopeMenu);
	} else if (ScopeMenu === shortcuts.getScope()) {
		keyScope(keyScopeFake);
	}
});

leftPanelDisabled.toggle = () => leftPanelDisabled(!leftPanelDisabled());
leftPanelDisabled.subscribe(value => {
	value && moveAction() && moveAction(false);
	$htmlCL.toggle('rl-left-panel-disabled', value);
});

moveAction.subscribe(value => value && leftPanelDisabled() && leftPanelDisabled(false));
