/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @type {?}
 */
Globals.now = (new Date()).getTime();

/**
 * @type {?}
 */
Globals.momentTrigger = ko.observable(true);

/**
 * @type {?}
 */
Globals.langChangeTrigger = ko.observable(true);

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
Globals.sUserAgent = (navigator.userAgent || '').toLowerCase();

/**
 * @type {boolean}
 */
Globals.bIsiOSDevice = -1 < Globals.sUserAgent.indexOf('iphone') || -1 < Globals.sUserAgent.indexOf('ipod') || -1 < Globals.sUserAgent.indexOf('ipad');

/**
 * @type {boolean}
 */
Globals.bIsAndroidDevice = -1 < Globals.sUserAgent.indexOf('android');

/**
 * @type {boolean}
 */
Globals.bMobileDevice = Globals.bIsiOSDevice || Globals.bIsAndroidDevice;

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
Globals.bAllowOpenPGP = false;

/**
 * @type {boolean}
 */
Globals.bAnimationSupported = !Globals.bMobileDevice && $html.hasClass('csstransitions');

/**
 * @type {string}
 */
Globals.sAnimationType = '';

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
		{name: 'basicstyles', groups: ['basicstyles', 'cleanup']},
		{name: 'colors'},
		{name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align']},
		{name: 'links'},
		{name: 'insert'},
		{name: 'others'}
//		{name: 'document', groups: ['mode', 'document', 'doctools']}
	],

	'removePlugins': 'contextmenu', //blockquote
	'removeButtons': 'Format,Undo,Redo,Cut,Copy,Paste,Anchor,Strike,Subscript,Superscript,Image,SelectAll',
	'removeDialogTabs': 'link:advanced;link:target;image:advanced',

	'extraPlugins': 'plain',
	
	'allowedContent': true,
	'autoParagraph': false,

	'enterMode': window.CKEDITOR.ENTER_BR,
	'shiftEnterMode': window.CKEDITOR.ENTER_BR,

	'font_defaultLabel': 'Arial',
	'fontSize_defaultLabel': '13',
	'fontSize_sizes': '10/10px;12/12px;13/13px;14/14px;16/16px;18/18px;20/20px;24/24px;28/28px;36/36px;48/48px'
};

/**
 * @type {Object}
 */
Globals.oHtmlEditorLangsMap = {
	'de': 'de',
	'es': 'es',
	'fr': 'fr',
	'hu': 'hu',
	'is': 'is',
	'it': 'it',
	'ko': 'ko',
	'ko-kr': 'ko',
	'lv': 'lv',
	'nl': 'nl',
	'no': 'no',
	'pl': 'pl',
	'pt': 'pt',
	'pt-pt': 'pt',
	'pt-br': 'pt-br',
	'ru': 'ru',
	'ro': 'ro',
	'zh': 'zh',
	'zh-cn': 'zh-cn'
};

if (Globals.bAllowPdfPreview && navigator && navigator.mimeTypes)
{
	Globals.bAllowPdfPreview = !!_.find(navigator.mimeTypes, function (oType) {
		return oType && 'application/pdf' === oType.type;
	});
}
