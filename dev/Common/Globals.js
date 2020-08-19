import ko from 'ko';
import { KeyState } from 'Common/Enums';

const $win = jQuery(window);

export { $win };

export const $html = jQuery('html');
export const $htmlCL = document.documentElement.classList;

/**
 * @type {boolean}
 */
export const community = RL_COMMUNITY;

/**
 * @type {?}
 */
export const dropdownVisibility = ko.observable(false).extend({ rateLimit: 0 });

/**
 * @type {boolean}
 */
export const useKeyboardShortcuts = ko.observable(true);

/**
 * @type {string}
 */
const sUserAgent =
	('navigator' in window && 'userAgent' in navigator && navigator.userAgent.toLowerCase()) || '';

/**
 * @type {boolean}
 */
export const bMobileDevice = (/android|iphone|ipod|ipad|blackberry|mobile/i).test(sUserAgent);

/**
 * @type {Object}
 */
export const htmlEditorDefaultConfig = {
	'title': false,
	'stylesSet': false,
	'customConfig': '',
	'contentsCss': '',
	'toolbarGroups': [
		{ name: 'spec' },
		{ name: 'styles' },
		{ name: 'basicstyles', groups: ['basicstyles', 'cleanup', 'bidi'] },
		{ name: 'colors' },
		bMobileDevice ? {} : { name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align'] },
		{ name: 'links' },
		{ name: 'insert' },
		{ name: 'document', groups: ['mode', 'document', 'doctools'] },
		{ name: 'others' }
	],

	'removePlugins': 'liststyle',
	'removeButtons': 'Format,Undo,Redo,Cut,Copy,Paste,Anchor,Strike,Subscript,Superscript,Image,SelectAll,Source',
	'removeDialogTabs': 'link:advanced;link:target;image:advanced;images:advanced',

	'extraPlugins': 'plain,signature',

	'allowedContent': true,
	'extraAllowedContent': true,

	'fillEmptyBlocks': false,
	'ignoreEmptyParagraph': true,
	'disableNativeSpellChecker': false,

	'colorButton_enableAutomatic': false,
	'colorButton_enableMore': true,

	'font_defaultLabel': 'Arial',
	'fontSize_defaultLabel': '13',
	'fontSize_sizes': '10/10px;12/12px;13/13px;14/14px;16/16px;18/18px;20/20px;24/24px;28/28px;36/36px;48/48px'
};

/**
 * @type {Object}
 */
export const htmlEditorLangsMap = {
	'ar_sa': 'ar-sa',
	'bg_bg': 'bg',
	'cs_CZ': 'cs',
	'de_de': 'de',
	'el_gr': 'el',
	'es_es': 'es',
	'et_ee': 'et',
	'fr_fr': 'fr',
	'hu_hu': 'hu',
	'is_is': 'is',
	'it_it': 'it',
	'ja_jp': 'ja',
	'ko_kr': 'ko',
	'lt_lt': 'lt',
	'lv_lv': 'lv',
	'fa_ir': 'fa',
	'nb_no': 'nb',
	'nl_nl': 'nl',
	'pl_pl': 'pl',
	'pt_br': 'pt-br',
	'pt_pt': 'pt',
	'ro_ro': 'ro',
	'ru_ru': 'ru',
	'sk_sk': 'sk',
	'sl_si': 'sl',
	'sv_se': 'sv',
	'tr_tr': 'tr',
	'uk_ua': 'uk',
	'zh_cn': 'zh-cn',
	'zh_tw': 'zh'
};


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

// popups
export const popupVisibilityNames = ko.observableArray([]);

export const popupVisibility = ko.computed(() => 0 < popupVisibilityNames().length);

popupVisibility.subscribe((bValue) => {
	$htmlCL.toggle('rl-modal', bValue);
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
	aBootstrapDropdowns: [],
	iMessageBodyCacheCount: 0,
	bUnload: false
};
