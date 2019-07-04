import window from 'window';
import _ from '_';
import $ from '$';
import key from 'key';
import ko from 'ko';
import { KeyState } from 'Common/Enums';

const $win = $(window);
$win.__sizes = [0, 0];

export { $win };

export const $doc = $(window.document);

export const $html = $('html');

export const $body = $('body');

export const $div = $('<div></div>');

export const $hcont = $('<div></div>');
$hcont
	.attr('area', 'hidden')
	.css({ position: 'absolute', left: -5000 })
	.appendTo($body);

export const startMicrotime = new window.Date().getTime();

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
export const sUserAgent =
	('navigator' in window && 'userAgent' in window.navigator && window.navigator.userAgent.toLowerCase()) || '';

/**
 * @type {boolean}
 */
export const bIE = -1 < sUserAgent.indexOf('msie');

/**
 * @type {boolean}
 */
export const bChrome = -1 < sUserAgent.indexOf('chrome');

/**
 * @type {boolean}
 */
export const bSafari = !bChrome && -1 < sUserAgent.indexOf('safari');

/**
 * @type {boolean}
 */
export const bMobileDevice =
	(/android/i).test(sUserAgent) ||
	(/iphone/i).test(sUserAgent) ||
	(/ipod/i).test(sUserAgent) ||
	(/ipad/i).test(sUserAgent) ||
	(/blackberry/i).test(sUserAgent);

/**
 * @type {boolean}
 */
export const bDisableNanoScroll = bMobileDevice;

/**
 * @type {boolean}
 */
export const bAnimationSupported =
	!bMobileDevice && $html.hasClass('csstransitions') && $html.hasClass('cssanimations');

/**
 * @type {boolean}
 */
export const bXMLHttpRequestSupported = !!window.XMLHttpRequest;

/**
 * @type {boolean}
 */
export const bIsHttps =
	window.document && window.document.location ? 'https:' === window.document.location.protocol : false;

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

/**
 * @type {boolean}
 */
let bAllowPdfPreview = !bMobileDevice;

if (bAllowPdfPreview && window.navigator && window.navigator.mimeTypes) {
	bAllowPdfPreview = !!_.find(window.navigator.mimeTypes, (type) => type && 'application/pdf' === type.type);

	if (!bAllowPdfPreview) {
		bAllowPdfPreview = 'undefined' !== typeof window.navigator.mimeTypes['application/pdf'];
	}
}

export { bAllowPdfPreview };

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
	$html.toggleClass('rl-modal', bValue);
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
	//	window.console.log('keyScope=' + sValue); // DEBUG
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
