
/* global RL_COMMUNITY */

(function () {

	'use strict';

	var
		Globals = {},

		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		key = require('key'),

		Enums = require('Common/Enums')
	;

	Globals.$win = $(window);
	Globals.$doc = $(window.document);
	Globals.$html = $('html');
	Globals.$body = $('body');
	Globals.$div = $('<div></div>');

	Globals.$win.__sizes = [0, 0];

	/**
	 * @type {?}
	 */
	Globals.startMicrotime = (new window.Date()).getTime();

	/**
	 * @type {boolean}
	 */
	Globals.community = RL_COMMUNITY;

	/**
	 * @type {?}
	 */
	Globals.dropdownVisibility = ko.observable(false).extend({'rateLimit': 0});

	/**
	 * @type {boolean}
	 */
	Globals.useKeyboardShortcuts = ko.observable(true);

	/**
	 * @type {number}
	 */
	Globals.iAjaxErrorCount = 0;

	/**
	 * @type {number}
	 */
	Globals.iTokenErrorCount = 0;

	/**
	 * @type {number}
	 */
	Globals.iMessageBodyCacheCount = 0;

	/**
	 * @type {boolean}
	 */
	Globals.bUnload = false;

	/**
	 * @type {string}
	 */
	Globals.sUserAgent = 'navigator' in window && 'userAgent' in window.navigator &&
		window.navigator.userAgent.toLowerCase() || '';

	/**
	 * @type {boolean}
	 */
	Globals.bIE = Globals.sUserAgent.indexOf('msie') > -1;

	/**
	 * @type {boolean}
	 */
	Globals.bChrome = Globals.sUserAgent.indexOf('chrome') > -1;

	/**
	 * @type {boolean}
	 */
	Globals.bSafari = !Globals.bChrome && Globals.sUserAgent.indexOf('safari') > -1;

	/**
	 * @type {boolean}
	 */
	Globals.bMobileDevice =
		/android/i.test(Globals.sUserAgent) ||
		/iphone/i.test(Globals.sUserAgent) ||
		/ipod/i.test(Globals.sUserAgent) ||
		/ipad/i.test(Globals.sUserAgent) ||
		/blackberry/i.test(Globals.sUserAgent)
	;

	/**
	 * @type {boolean}
	 */
	Globals.bDisableNanoScroll = Globals.bMobileDevice;

	/**
	 * @type {boolean}
	 */
	Globals.bAllowPdfPreview = !Globals.bMobileDevice;

	/**
	 * @type {boolean}
	 */
	Globals.bAnimationSupported = !Globals.bMobileDevice && Globals.$html.hasClass('csstransitions') &&
		 Globals.$html.hasClass('cssanimations');

	/**
	 * @type {boolean}
	 */
	Globals.bXMLHttpRequestSupported = !!window.XMLHttpRequest;

	/**
	 * @type {*}
	 */
	Globals.__APP__ = null;

	/**
	 * @type {Object}
	 */
	Globals.oHtmlEditorDefaultConfig = {
		'title': false,
		'stylesSet': false,
		'customConfig': '',
		'contentsCss': '',
		'toolbarGroups': [
			{name: 'spec'},
			{name: 'styles'},
			{name: 'basicstyles', groups: ['basicstyles', 'cleanup', 'bidi']},
			{name: 'colors'},
			{name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align']},
			{name: 'links'},
			{name: 'insert'},
			{name: 'document', groups: ['mode', 'document', 'doctools']},
			{name: 'others'}
		],

		'removePlugins': 'liststyle',
		'removeButtons': 'Format,Undo,Redo,Cut,Copy,Paste,Anchor,Strike,Subscript,Superscript,Image,SelectAll,Source',
		'removeDialogTabs': 'link:advanced;link:target;image:advanced;images:advanced',

		'extraPlugins': 'plain,signature',

		'allowedContent': true,
		'extraAllowedContent': true,

		'fillEmptyBlocks': false,
		'ignoreEmptyParagraph': true,

		'font_defaultLabel': 'Arial',
		'fontSize_defaultLabel': '13',
		'fontSize_sizes': '10/10px;12/12px;13/13px;14/14px;16/16px;18/18px;20/20px;24/24px;28/28px;36/36px;48/48px'
	};

	/**
	 * @type {Object}
	 */
	Globals.oHtmlEditorLangsMap = {
		'bg': 'bg',
		'de': 'de',
		'es': 'es',
		'fr': 'fr',
		'hu': 'hu',
		'is': 'is',
		'it': 'it',
		'ja': 'ja',
		'ja-jp': 'ja',
		'ko': 'ko',
		'ko-kr': 'ko',
		'lt': 'lt',
		'lv': 'lv',
		'nl': 'nl',
		'no': 'no',
		'pl': 'pl',
		'pt': 'pt',
		'pt-pt': 'pt',
		'pt-br': 'pt-br',
		'ro': 'ro',
		'ru': 'ru',
		'sk': 'sk',
		'sv': 'sv',
		'tr': 'tr',
		'ua': 'ru',
		'zh': 'zh',
		'zh-tw': 'zh',
		'zh-cn': 'zh-cn'
	};

	if (Globals.bAllowPdfPreview && window.navigator && window.navigator.mimeTypes)
	{
		Globals.bAllowPdfPreview = !!_.find(window.navigator.mimeTypes, function (oType) {
			return oType && 'application/pdf' === oType.type;
		});
	}

	Globals.aBootstrapDropdowns = [];

	Globals.aViewModels = {
		'settings': [],
		'settings-removed': [],
		'settings-disabled': []
	};

	Globals.leftPanelDisabled = ko.observable(false);
	Globals.leftPanelType = ko.observable('');

	// popups
	Globals.popupVisibilityNames = ko.observableArray([]);

	Globals.popupVisibility = ko.computed(function () {
		return 0 < Globals.popupVisibilityNames().length;
	}, this);

	Globals.popupVisibility.subscribe(function (bValue) {
		Globals.$html.toggleClass('rl-modal', bValue);
	});

	// keys
	Globals.keyScopeReal = ko.observable(Enums.KeyState.All);
	Globals.keyScopeFake = ko.observable(Enums.KeyState.All);

	Globals.keyScope = ko.computed({
		'owner': this,
		'read': function () {
			return Globals.keyScopeFake();
		},
		'write': function (sValue) {

			if (Enums.KeyState.Menu !== sValue)
			{
				if (Enums.KeyState.Compose === sValue)
				{
					// disableKeyFilter
					key.filter = function () {
						return Globals.useKeyboardShortcuts();
					};
				}
				else
				{
					// restoreKeyFilter
					key.filter = function (event) {

						if (Globals.useKeyboardShortcuts())
						{
							var
								oElement = event.target || event.srcElement,
								sTagName = oElement ? oElement.tagName : ''
							;

							sTagName = sTagName.toUpperCase();
							return !(sTagName === 'INPUT' || sTagName === 'SELECT' || sTagName === 'TEXTAREA' ||
								(oElement && sTagName === 'DIV' && ('editorHtmlArea' === oElement.className || 'true' === '' + oElement.contentEditable))
							);
						}

						return false;
					};
				}

				Globals.keyScopeFake(sValue);
				if (Globals.dropdownVisibility())
				{
					sValue = Enums.KeyState.Menu;
				}
			}

			Globals.keyScopeReal(sValue);
		}
	});

	Globals.keyScopeReal.subscribe(function (sValue) {
//		window.console.log('keyScope=' + sValue); // DEBUG
		key.setScope(sValue);
	});

	Globals.dropdownVisibility.subscribe(function (bValue) {
		if (bValue)
		{
			Globals.keyScope(Enums.KeyState.Menu);
		}
		else if (Enums.KeyState.Menu === key.getScope())
		{
			Globals.keyScope(Globals.keyScopeFake());
		}
	});

	module.exports = Globals;

}());