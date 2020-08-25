import ko from 'ko';
import { KeyState } from 'Common/Enums';

export const $html = jQuery('html');
export const $htmlCL = document.documentElement.classList;

/**
 * @type {?}
 */
export const dropdownVisibility = ko.observable(false).extend({ rateLimit: 0 });

/**
 * @type {boolean}
 */
export const useKeyboardShortcuts = ko.observable(true);

/**
 * @type {boolean}
 */
export const bMobileDevice = (/android|iphone|ipod|ipad|blackberry|mobile/i).test(
	(window.navigator && navigator.userAgent && navigator.userAgent.toLowerCase()) || ''
);

export const VIEW_MODELS = {
	settings: [],
	'settings-removed': [],
	'settings-disabled': []
};

export const moveAction = ko.observable(false);
export const leftPanelDisabled = ko.observable(false);
export const leftPanelType = ko.observable('');
export const leftPanelWidth = ko.observable(0);

leftPanelDisabled.subscribe((value) => {
	if (value && moveAction()) {
		moveAction(false);
	}
});

moveAction.subscribe((value) => {
	if (value && leftPanelDisabled()) {
		leftPanelDisabled(false);
	}
});

// keys
export const keyScopeReal = ko.observable(KeyState.All);
export const keyScopeFake = ko.observable(KeyState.All);

export const keyScope = ko.computed({
	read: () => keyScopeFake(),
	write: (value) => {
		if (KeyState.Menu !== value) {
			if (KeyState.Compose === value) {
				// disableKeyFilter
				key.filter = () => useKeyboardShortcuts();
			} else {
				// restoreKeyFilter
				key.filter = (event) => {
					if (useKeyboardShortcuts()) {
						const el = event.target || event.srcElement,
							tagName = el ? el.tagName.toUpperCase() : '';

						return !(
							'INPUT' === tagName ||
							'SELECT' === tagName ||
							'TEXTAREA' === tagName ||
							(el && 'DIV' === tagName && ('editorHtmlArea' === el.className || 'true' === '' + el.contentEditable))
						);
					}

					return false;
				};
			}

			keyScopeFake(value);
			if (dropdownVisibility()) {
				value = KeyState.Menu;
			}
		}

		keyScopeReal(value);
	}
});

keyScopeReal.subscribe((value) => {
	//	console.log('keyScope=' + sValue); // DEBUG
	key.setScope(value);
});

dropdownVisibility.subscribe((value) => {
	if (value) {
		keyScope(KeyState.Menu);
	} else if (KeyState.Menu === key.getScope()) {
		keyScope(keyScopeFake());
	}
});

/**
 * @type {*}
 */
export const data = {
	__APP__: null,
	iAjaxErrorCount: 0,
	iTokenErrorCount: 0,
	bUnload: false
};
