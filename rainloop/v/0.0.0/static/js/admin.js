/*! RainLoop Webmail Admin Module (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
(function (window, $, ko, crossroads, hasher, _) {

'use strict';

var
	/**
	 * @type {Object}
	 */
	Consts = {},

	/**
	 * @type {Object}
	 */
	Enums = {},

	/**
	 * @type {Object}
	 */
	NotificationI18N = {},

	/**
	 * @type {Object.<Function>}
	 */
	Utils = {},
	
	/**
	 * @type {Object.<Function>}
	 */
	Plugins = {},

	/**
	 * @type {Object.<Function>}
	 */
	Base64 = {},

	/**
	 * @type {Object}
	 */
	Globals = {},

	/**
	 * @type {Object}
	 */
	ViewModels = {
		'settings': [],
		'settings-removed': [],
		'settings-disabled': []
	},

	/**
	 * @type {Array}
	 */
	BootstrapDropdowns = [],

	/**
	 * @type {*}
	 */
	kn = null,

	/**
	 * @type {Object}
	 */
	AppData = window['rainloopAppData'] || {},

	/**
	 * @type {Object}
	 */
	I18n = window['rainloopI18N'] || {},

	$html = $('html'),

	$window = $(window),

	$document = $(window.document),

	NotificationClass = window.Notification && window.Notification.requestPermission ? window.Notification : null
;
/*jshint onevar: false*/
/**
 * @type {?AdminApp}
 */
var RL = null;
/*jshint onevar: true*/

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
Globals.dropdownVisibility = ko.observable(false).extend({'rateLimit': 0});

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

Consts.Defaults = {};
Consts.Values = {};
Consts.DataImages = {};

/**
 * @const
 * @type {number}
 */
Consts.Defaults.MessagesPerPage = 20;

/**
 * @const
 * @type {number}
 */
Consts.Defaults.ContactsPerPage = 20;

/**
 * @const
 * @type {Array}
 */
Consts.Defaults.MessagesPerPageArray = [10, 20, 30, 50, 100/*, 150, 200, 300*/];

/**
 * @const
 * @type {number}
 */
Consts.Defaults.DefaultAjaxTimeout = 20000;

/**
 * @const
 * @type {number}
 */
Consts.Defaults.SearchAjaxTimeout = 120000;

/**
 * @const
 * @type {number}
 */
Consts.Defaults.SendMessageAjaxTimeout = 300000;

/**
 * @const
 * @type {number}
 */
Consts.Defaults.SaveMessageAjaxTimeout = 200000;

/**
 * @const
 * @type {string}
 */
Consts.Values.UnuseOptionValue = '__UNUSE__';

/**
 * @const
 * @type {string}
 */
Consts.Values.GmailFolderName = '[Gmail]';

/**
 * @const
 * @type {string}
 */
Consts.Values.ClientSideCookieIndexName = 'rlcsc';

/**
 * @const
 * @type {number}
 */
Consts.Values.ImapDefaulPort = 143;

/**
 * @const
 * @type {number}
 */
Consts.Values.ImapDefaulSecurePort = 993;

/**
 * @const
 * @type {number}
 */
Consts.Values.SmtpDefaulPort = 25;

/**
 * @const
 * @type {number}
 */
Consts.Values.SmtpDefaulSecurePort = 465;

/**
 * @const
 * @type {number}
 */
Consts.Values.MessageBodyCacheLimit = 15;

/**
 * @const
 * @type {number}
 */
Consts.Values.AjaxErrorLimit = 7;

/**
 * @const
 * @type {number}
 */
Consts.Values.TokenErrorLimit = 10;

/**
 * @const
 * @type {string}
 */
Consts.DataImages.UserDotPic = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2P8DwQACgAD/il4QJ8AAAAASUVORK5CYII=';

/**
 * @const
 * @type {string}
 */
Consts.DataImages.TranspPic = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=';

/**
 * @enum {string}
 */
Enums.StorageResultType = {
	'Success': 'success',
	'Abort': 'abort',
	'Error': 'error',
	'Unload': 'unload'
};

/**
 * @enum {number}
 */
Enums.State = {
	'Empty': 10,
	'Login': 20,
	'Auth': 30
};

/**
 * @enum {number}
 */
Enums.StateType = {
	'Webmail': 0,
	'Admin': 1
};

/**
 * @enum {string}
 */
Enums.KeyState = {
	'All': 'all',
	'None': 'none',
	'ContactList': 'contact-list',
	'MessageList': 'message-list',
	'FolderList': 'folder-list',
	'MessageView': 'message-view',
	'Compose': 'compose',
	'Settings': 'settings',
	'Menu': 'menu',
	'PopupComposeOpenPGP': 'compose-open-pgp',
	'PopupKeyboardShortcutsHelp': 'popup-keyboard-shortcuts-help',
	'PopupAsk': 'popup-ask'
};

/**
 * @enum {number}
 */
Enums.FolderType = {
	'Inbox': 10,
	'SentItems': 11,
	'Draft': 12,
	'Trash': 13,
	'Spam': 14,
	'Archive': 15,
	'User': 99
};

/**
 * @enum {string}
 */
Enums.LoginSignMeTypeAsString = {
	'DefaultOff': 'defaultoff',
	'DefaultOn': 'defaulton',
	'Unused': 'unused'
};

/**
 * @enum {number}
 */
Enums.LoginSignMeType = {
	'DefaultOff': 0,
	'DefaultOn': 1,
	'Unused': 2
};

/**
 * @enum {string}
 */
Enums.ComposeType = {
	'Empty': 'empty',
	'Reply': 'reply',
	'ReplyAll': 'replyall',
	'Forward': 'forward',
	'ForwardAsAttachment': 'forward-as-attachment',
	'Draft': 'draft',
	'EditAsNew': 'editasnew'
};

/**
 * @enum {number}
 */
Enums.UploadErrorCode = {
	'Normal': 0,
	'FileIsTooBig': 1,
	'FilePartiallyUploaded': 2,
	'FileNoUploaded': 3,
	'MissingTempFolder': 4,
	'FileOnSaveingError': 5,
	'FileType': 98,
	'Unknown': 99
};

/**
 * @enum {number}
 */
Enums.SetSystemFoldersNotification = {
	'None': 0,
	'Sent': 1,
	'Draft': 2,
	'Spam': 3,
	'Trash': 4,
	'Archive': 5
};

/**
 * @enum {number}
 */
Enums.ClientSideKeyName = {
	'FoldersLashHash': 0,
	'MessagesInboxLastHash': 1,
	'MailBoxListSize': 2,
	'ExpandedFolders': 3,
	'FolderListSize': 4
};

/**
 * @enum {number}
 */
Enums.EventKeyCode = {
	'Backspace': 8,
	'Tab': 9,
	'Enter': 13,
	'Esc': 27,
	'PageUp': 33,
	'PageDown': 34,
	'Left': 37,
	'Right': 39,
	'Up': 38,
	'Down': 40,
	'End': 35,
	'Home': 36,
	'Space': 32,
	'Insert': 45,
	'Delete': 46,
	'A': 65,
	'S': 83
};

/**
 * @enum {number}
 */
Enums.MessageSetAction = {
	'SetSeen': 0,
	'UnsetSeen': 1,
	'SetFlag': 2,
	'UnsetFlag': 3
};

/**
 * @enum {number}
 */
Enums.MessageSelectAction = {
	'All': 0,
	'None': 1,
	'Invert': 2,
	'Unseen': 3,
	'Seen': 4,
	'Flagged': 5,
	'Unflagged': 6
};

/**
 * @enum {number}
 */
Enums.DesktopNotifications = {
	'Allowed': 0,
	'NotAllowed': 1,
	'Denied': 2,
	'NotSupported': 9
};

/**
 * @enum {number}
 */
Enums.MessagePriority = {
	'Low': 5,
	'Normal': 3,
	'High': 1
};

/**
 * @enum {string}
 */
Enums.EditorDefaultType = {
	'Html': 'Html',
	'Plain': 'Plain'
};

/**
 * @enum {string}
 */
Enums.CustomThemeType = {
	'Light': 'Light',
	'Dark': 'Dark'
};

/**
 * @enum {number}
 */
Enums.ServerSecure = {
	'None': 0,
	'SSL': 1,
	'TLS': 2
};

/**
 * @enum {number}
 */
Enums.SearchDateType = {
	'All': -1,
	'Days3': 3,
	'Days7': 7,
	'Month': 30
};

/**
 * @enum {number}
 */
Enums.EmailType = {
	'Defailt': 0,
	'Facebook': 1,
	'Google': 2
};

/**
 * @enum {number}
 */
Enums.SaveSettingsStep = {
	'Animate': -2,
	'Idle': -1,
	'TrueResult': 1,
	'FalseResult': 0
};

/**
 * @enum {string}
 */
Enums.InterfaceAnimation = {
	'None': 'None',
	'Normal': 'Normal',
	'Full': 'Full'
};

/**
 * @enum {number}
 */
Enums.Layout = {
	'NoPreview': 0,
	'SidePreview': 1,
	'BottomPreview': 2
};

/**
 * @enum {number}
 */
Enums.ContactScopeType = {
	'Default': 0,
	'ShareAll': 2
};

/**
 * @enum {number}
 */
Enums.SignedVerifyStatus = {
	'UnknownPublicKeys': -4,
	'UnknownPrivateKey': -3,
	'Unverified': -2,
	'Error': -1,
	'None': 0,
	'Success': 1
};

/**
 * @enum {number}
 */
Enums.ContactPropertyType = {

	'Unknown': 0,

	'FullName': 10,

	'FirstName': 15,
	'LastName': 16,
	'MiddleName': 16,
	'Nick': 18,

	'NamePrefix': 20,
	'NameSuffix': 21,

	'EmailPersonal': 30,
	'EmailBussines': 31,

	'PhonePersonal': 50,
	'PhoneBussines': 51,

	'MobilePersonal': 60,
	'MobileBussines': 61,

	'FaxPesonal': 70,
	'FaxBussines': 71,

	'Facebook': 90,
	'Skype': 91,
	'GitHub': 92,

	'Note': 110,

	'Custom': 250
};

/**
 * @enum {number}
 */
Enums.Notification = {
	'InvalidToken': 101,
	'AuthError': 102,
	'AccessError': 103,
	'ConnectionError': 104,
	'CaptchaError': 105,
	'SocialFacebookLoginAccessDisable': 106,
	'SocialTwitterLoginAccessDisable': 107,
	'SocialGoogleLoginAccessDisable': 108,
	'DomainNotAllowed': 109,
	'AccountNotAllowed': 110,

	'AccountTwoFactorAuthRequired': 120,
	'AccountTwoFactorAuthError': 121,

	'CantGetMessageList': 201,
	'CantGetMessage': 202,
	'CantDeleteMessage': 203,
	'CantMoveMessage': 204,
	'CantCopyMessage': 205,

	'CantSaveMessage': 301,
	'CantSendMessage': 302,
	'InvalidRecipients': 303,

	'CantCreateFolder': 400,
	'CantRenameFolder': 401,
	'CantDeleteFolder': 402,
	'CantSubscribeFolder': 403,
	'CantUnsubscribeFolder': 404,
	'CantDeleteNonEmptyFolder': 405,

	'CantSaveSettings': 501,
	'CantSavePluginSettings': 502,

	'DomainAlreadyExists': 601,

	'CantInstallPackage': 701,
	'CantDeletePackage': 702,
	'InvalidPluginPackage': 703,
	'UnsupportedPluginPackage': 704,
	
	'LicensingServerIsUnavailable': 710,
	'LicensingExpired': 711,
	'LicensingBanned': 712,

	'DemoSendMessageError': 750,
	
	'AccountAlreadyExists': 801,

	'MailServerError': 901,
	'ClientViewError': 902,
	'UnknownNotification': 999,
	'UnknownError': 999
};

Utils.trim = $.trim;
Utils.inArray = $.inArray;
Utils.isArray = _.isArray;
Utils.isFunc = _.isFunction;
Utils.isUnd = _.isUndefined;
Utils.isNull = _.isNull;
Utils.emptyFunction = function () {};

/**
 * @param {*} oValue
 * @return {boolean}
 */
Utils.isNormal = function (oValue)
{
	return !Utils.isUnd(oValue) && !Utils.isNull(oValue);
};

Utils.windowResize = _.debounce(function (iTimeout) {
	if (Utils.isUnd(iTimeout))
	{
		$window.resize();
	}
	else
	{
		window.setTimeout(function () {
			$window.resize();
		}, iTimeout);
	}
}, 50);

/**
 * @param {(string|number)} mValue
 * @param {boolean=} bIncludeZero
 * @return {boolean}
 */
Utils.isPosNumeric = function (mValue, bIncludeZero)
{
	return Utils.isNormal(mValue) ?
		((Utils.isUnd(bIncludeZero) ? true : !!bIncludeZero) ?
			(/^[0-9]*$/).test(mValue.toString()) :
			(/^[1-9]+[0-9]*$/).test(mValue.toString())) :
		false;
};

/**
 * @param {*} iValue
 * @return {number}
 */
Utils.pInt = function (iValue)
{
	return Utils.isNormal(iValue) && '' !== iValue ? window.parseInt(iValue, 10) : 0;
};

/**
 * @param {*} mValue
 * @return {string}
 */
Utils.pString = function (mValue)
{
	return Utils.isNormal(mValue) ? '' + mValue : '';
};

/**
 * @param {*} aValue
 * @return {boolean}
 */
Utils.isNonEmptyArray = function (aValue)
{
	return Utils.isArray(aValue) && 0 < aValue.length;
};

/**
 * @param {string} sPath
 * @param {*=} oObject
 * @param {Object=} oObjectToExportTo
 */
Utils.exportPath = function (sPath, oObject, oObjectToExportTo)
{
	var
		part = null,
		parts = sPath.split('.'),
		cur = oObjectToExportTo || window
	;

	for (; parts.length && (part = parts.shift());)
	{
		if (!parts.length && !Utils.isUnd(oObject))
		{
			cur[part] = oObject;
		}
		else if (cur[part])
		{
			cur = cur[part];
		}
		else
		{
			cur = cur[part] = {};
		}
	}
};

/**
 * @param {Object} oObject
 * @param {string} sName
 * @param {*} mValue
 */
Utils.pImport = function (oObject, sName, mValue)
{
	oObject[sName] = mValue;
};

/**
 * @param {Object} oObject
 * @param {string} sName
 * @param {*} mDefault
 * @return {*}
 */
Utils.pExport = function (oObject, sName, mDefault)
{
	return Utils.isUnd(oObject[sName]) ? mDefault : oObject[sName];
};

/**
 * @param {string} sText
 * @return {string}
 */
Utils.encodeHtml = function (sText)
{
	return Utils.isNormal(sText) ? sText.toString()
		.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;').replace(/'/g, '&#039;') : '';
};

/**
 * @param {string} sText
 * @param {number=} iLen
 * @return {string}
 */
Utils.splitPlainText = function (sText, iLen)
{
	var
		sPrefix = '',
		sSubText = '',
		sResult = sText,
		iSpacePos = 0,
		iNewLinePos = 0
	;

	iLen = Utils.isUnd(iLen) ? 100 : iLen;

	while (sResult.length > iLen)
	{
		sSubText = sResult.substring(0, iLen);
		iSpacePos = sSubText.lastIndexOf(' ');
		iNewLinePos = sSubText.lastIndexOf('\n');

		if (-1 !== iNewLinePos)
		{
			iSpacePos = iNewLinePos;
		}

		if (-1 === iSpacePos)
		{
			iSpacePos = iLen;
		}

		sPrefix += sSubText.substring(0, iSpacePos) + '\n';
		sResult = sResult.substring(iSpacePos + 1);
	}

	return sPrefix + sResult;
};

Utils.timeOutAction = (function () {

	var
		oTimeOuts = {}
	;

	return function (sAction, fFunction, iTimeOut)
	{
		if (Utils.isUnd(oTimeOuts[sAction]))
		{
			oTimeOuts[sAction] = 0;
		}

		window.clearTimeout(oTimeOuts[sAction]);
		oTimeOuts[sAction] = window.setTimeout(fFunction, iTimeOut);
	};
}());

Utils.timeOutActionSecond = (function () {

	var
		oTimeOuts = {}
	;

	return function (sAction, fFunction, iTimeOut)
	{
		if (!oTimeOuts[sAction])
		{
			oTimeOuts[sAction] = window.setTimeout(function () {
				fFunction();
				oTimeOuts[sAction] = 0;
			}, iTimeOut);
		}
	};
}());

Utils.audio = (function () {

	var
		oAudio = false
	;

	return function (sMp3File, sOggFile) {

		if (false === oAudio)
		{
			if (Globals.bIsiOSDevice)
			{
				oAudio = null;
			}
			else
			{
				var
					bCanPlayMp3	= false,
					bCanPlayOgg	= false,
					oAudioLocal = window.Audio ? new window.Audio() : null
				;

				if (oAudioLocal && oAudioLocal.canPlayType && oAudioLocal.play)
				{
					bCanPlayMp3 = '' !== oAudioLocal.canPlayType('audio/mpeg; codecs="mp3"');
					if (!bCanPlayMp3)
					{
						bCanPlayOgg = '' !== oAudioLocal.canPlayType('audio/ogg; codecs="vorbis"');
					}

					if (bCanPlayMp3 || bCanPlayOgg)
					{
						oAudio = oAudioLocal;
						oAudio.preload = 'none';
						oAudio.loop = false;
						oAudio.autoplay = false;
						oAudio.muted = false;
						oAudio.src = bCanPlayMp3 ? sMp3File : sOggFile;
					}
					else
					{
						oAudio = null;
					}
				}
				else
				{
					oAudio = null;
				}
			}
		}

		return oAudio;
	};
}());

/**
 * @param {(Object|null|undefined)} oObject
 * @param {string} sProp
 * @return {boolean}
 */
Utils.hos = function (oObject, sProp)
{
	return oObject && Object.hasOwnProperty ? Object.hasOwnProperty.call(oObject, sProp) : false;
};

/**
 * @param {string} sKey
 * @param {Object=} oValueList
 * @param {string=} sDefaulValue
 * @return {string}
 */
Utils.i18n = function (sKey, oValueList, sDefaulValue)
{
	var
		sValueName = '',
		sResult = Utils.isUnd(I18n[sKey]) ? (Utils.isUnd(sDefaulValue) ? sKey : sDefaulValue) : I18n[sKey]
	;

	if (!Utils.isUnd(oValueList) && !Utils.isNull(oValueList))
	{
		for (sValueName in oValueList)
		{
			if (Utils.hos(oValueList, sValueName))
			{
				sResult = sResult.replace('%' + sValueName + '%', oValueList[sValueName]);
			}
		}
	}

	return sResult;
};

/**
 * @param {Object} oElement
 */
Utils.i18nToNode = function (oElement)
{
	_.defer(function () {
		$('.i18n', oElement).each(function () {
			var
				jqThis = $(this),
				sKey = ''
			;

			sKey = jqThis.data('i18n-text');
			if (sKey)
			{
				jqThis.text(Utils.i18n(sKey));
			}
			else
			{
				sKey = jqThis.data('i18n-html');
				if (sKey)
				{
					jqThis.html(Utils.i18n(sKey));
				}
				
				sKey = jqThis.data('i18n-placeholder');
				if (sKey)
				{
					jqThis.attr('placeholder', Utils.i18n(sKey));
				}
				
				sKey = jqThis.data('i18n-title');
				if (sKey)
				{
					jqThis.attr('title', Utils.i18n(sKey));
				}
			}
		});
	});
};

Utils.i18nToDoc = function ()
{
	if (window.rainloopI18N)
	{
		I18n = window.rainloopI18N || {};
		Utils.i18nToNode($document);

		Globals.langChangeTrigger(!Globals.langChangeTrigger());
	}

	window.rainloopI18N = {};
};

/**
 * @param {Function} fCallback
 * @param {Object} oScope
 * @param {Function=} fLangCallback
 */
Utils.initOnStartOrLangChange = function (fCallback, oScope, fLangCallback)
{
	if (fCallback)
	{
		fCallback.call(oScope);
	}

	if (fLangCallback)
	{
		Globals.langChangeTrigger.subscribe(function () {
			if (fCallback)
			{
				fCallback.call(oScope);
			}

			fLangCallback.call(oScope);
		});
	}
	else if (fCallback)
	{
		Globals.langChangeTrigger.subscribe(fCallback, oScope);
	}
};

/**
 * @return {boolean}
 */
Utils.inFocus = function ()
{
	var oActiveObj = document.activeElement;
	return (oActiveObj && ('INPUT' === oActiveObj.tagName ||
		'TEXTAREA' === oActiveObj.tagName ||
		'IFRAME' === oActiveObj.tagName ||
		('DIV' === oActiveObj.tagName && 'editorHtmlArea' === oActiveObj.className && oActiveObj.contentEditable)));
};

Utils.removeInFocus = function ()
{
	if (document && document.activeElement && document.activeElement.blur)
	{
		var oA = $(document.activeElement);
		if (oA.is('input') || oA.is('textarea'))
		{
			document.activeElement.blur();
		}
	}
};

Utils.removeSelection = function ()
{
	if (window && window.getSelection)
	{
		var oSel = window.getSelection();
		if (oSel && oSel.removeAllRanges)
		{
			oSel.removeAllRanges();
		}
	}
    else if (document && document.selection && document.selection.empty)
	{
		document.selection.empty();
	}
};

/**
 * @param {string} sPrefix
 * @param {string} sSubject
 * @param {boolean=} bFixLongSubject = true
 * @return {string}
 */
Utils.replySubjectAdd = function (sPrefix, sSubject, bFixLongSubject)
{
	var
		oMatch = null,
		sResult = Utils.trim(sSubject)
	;

	if (null !== (oMatch = (new window.RegExp('^' + sPrefix + '[\\s]?\\:(.*)$', 'gi')).exec(sSubject)) && !Utils.isUnd(oMatch[1]))
	{
		sResult = sPrefix + '[2]: ' + oMatch[1];
	}
	else if (null !== (oMatch = (new window.RegExp('^(' + sPrefix + '[\\s]?[\\[\\(]?)([\\d]+)([\\]\\)]?[\\s]?\\:.*)$', 'gi')).exec(sSubject)) &&
		!Utils.isUnd(oMatch[1]) && !Utils.isUnd(oMatch[2]) && !Utils.isUnd(oMatch[3]))
	{
		sResult = oMatch[1] + (Utils.pInt(oMatch[2]) + 1) + oMatch[3];
	}
	else
	{
		sResult = sPrefix + ': ' + sSubject;
	}

	sResult = sResult.replace(/[\s]+/g, ' ');
	sResult = (Utils.isUnd(bFixLongSubject) ? true : bFixLongSubject) ? Utils.fixLongSubject(sResult) : sResult;
//	sResult = sResult.replace(/^(Re|Fwd)[\s]?\[[\d]+\]:/ig, '$1:');
	return sResult;
};

/**
 * @param {string} sSubject
 * @return {string}
 */
Utils.fixLongSubject = function (sSubject)
{
	var
		iCounter = 0,
		oMatch = null
	;

	sSubject = Utils.trim(sSubject.replace(/[\s]+/, ' '));
	
	do
	{
		oMatch = /^Re(\[([\d]+)\]|):[\s]{0,3}Re(\[([\d]+)\]|):/ig.exec(sSubject);
		if (!oMatch || Utils.isUnd(oMatch[0]))
		{
			oMatch = null;
		}

		if (oMatch)
		{
			iCounter = 0;
			iCounter += Utils.isUnd(oMatch[2]) ? 1 : 0 + Utils.pInt(oMatch[2]);
			iCounter += Utils.isUnd(oMatch[4]) ? 1 : 0 + Utils.pInt(oMatch[4]);

			sSubject = sSubject.replace(/^Re(\[[\d]+\]|):[\s]{0,3}Re(\[[\d]+\]|):/gi, 'Re' + (0 < iCounter ? '[' + iCounter + ']' : '') + ':');
		}

	}
	while (oMatch);

	sSubject = sSubject.replace(/[\s]+/, ' ');
	return sSubject;
};

/**
 * @param {number} iNum
 * @param {number} iDec
 * @return {number}
 */
Utils.roundNumber = function (iNum, iDec)
{
	return Math.round(iNum * Math.pow(10, iDec)) / Math.pow(10, iDec);
};

/**
 * @param {(number|string)} iSizeInBytes
 * @return {string}
 */
Utils.friendlySize = function (iSizeInBytes)
{
	iSizeInBytes = Utils.pInt(iSizeInBytes);

	if (iSizeInBytes >= 1073741824)
	{
		return Utils.roundNumber(iSizeInBytes / 1073741824, 1) + 'GB';
	}
	else if (iSizeInBytes >= 1048576)
	{
		return Utils.roundNumber(iSizeInBytes / 1048576, 1) + 'MB';
	}
	else if (iSizeInBytes >= 1024)
	{
		return Utils.roundNumber(iSizeInBytes / 1024, 0) + 'KB';
	}

	return iSizeInBytes + 'B';
};

/**
 * @param {string} sDesc
 */
Utils.log = function (sDesc)
{
	if (window.console && window.console.log)
	{
		window.console.log(sDesc);
	}
};

/**
 * @param {number} iCode
 * @param {*=} mMessage = ''
 * @return {string}
 */
Utils.getNotification = function (iCode, mMessage)
{
	iCode = Utils.pInt(iCode);
	if (Enums.Notification.ClientViewError === iCode && mMessage)
	{
		return mMessage;
	}

	return Utils.isUnd(NotificationI18N[iCode]) ? '' : NotificationI18N[iCode];
};

Utils.initNotificationLanguage = function ()
{
	NotificationI18N[Enums.Notification.InvalidToken] = Utils.i18n('NOTIFICATIONS/INVALID_TOKEN');
	NotificationI18N[Enums.Notification.AuthError] = Utils.i18n('NOTIFICATIONS/AUTH_ERROR');
	NotificationI18N[Enums.Notification.AccessError] = Utils.i18n('NOTIFICATIONS/ACCESS_ERROR');
	NotificationI18N[Enums.Notification.ConnectionError] = Utils.i18n('NOTIFICATIONS/CONNECTION_ERROR');
	NotificationI18N[Enums.Notification.CaptchaError] = Utils.i18n('NOTIFICATIONS/CAPTCHA_ERROR');
	NotificationI18N[Enums.Notification.SocialFacebookLoginAccessDisable] = Utils.i18n('NOTIFICATIONS/SOCIAL_FACEBOOK_LOGIN_ACCESS_DISABLE');
	NotificationI18N[Enums.Notification.SocialTwitterLoginAccessDisable] = Utils.i18n('NOTIFICATIONS/SOCIAL_TWITTER_LOGIN_ACCESS_DISABLE');
	NotificationI18N[Enums.Notification.SocialGoogleLoginAccessDisable] = Utils.i18n('NOTIFICATIONS/SOCIAL_GOOGLE_LOGIN_ACCESS_DISABLE');
	NotificationI18N[Enums.Notification.DomainNotAllowed] = Utils.i18n('NOTIFICATIONS/DOMAIN_NOT_ALLOWED');
	NotificationI18N[Enums.Notification.AccountNotAllowed] = Utils.i18n('NOTIFICATIONS/ACCOUNT_NOT_ALLOWED');

	NotificationI18N[Enums.Notification.AccountTwoFactorAuthRequired] = Utils.i18n('NOTIFICATIONS/ACCOUNT_TWO_FACTOR_AUTH_REQUIRED');
	NotificationI18N[Enums.Notification.AccountTwoFactorAuthError] = Utils.i18n('NOTIFICATIONS/ACCOUNT_TWO_FACTOR_AUTH_ERROR');

	NotificationI18N[Enums.Notification.CantGetMessageList] = Utils.i18n('NOTIFICATIONS/CANT_GET_MESSAGE_LIST');
	NotificationI18N[Enums.Notification.CantGetMessage] = Utils.i18n('NOTIFICATIONS/CANT_GET_MESSAGE');
	NotificationI18N[Enums.Notification.CantDeleteMessage] = Utils.i18n('NOTIFICATIONS/CANT_DELETE_MESSAGE');
	NotificationI18N[Enums.Notification.CantMoveMessage] = Utils.i18n('NOTIFICATIONS/CANT_MOVE_MESSAGE');
	NotificationI18N[Enums.Notification.CantCopyMessage] = Utils.i18n('NOTIFICATIONS/CANT_MOVE_MESSAGE');

	NotificationI18N[Enums.Notification.CantSaveMessage] = Utils.i18n('NOTIFICATIONS/CANT_SAVE_MESSAGE');
	NotificationI18N[Enums.Notification.CantSendMessage] = Utils.i18n('NOTIFICATIONS/CANT_SEND_MESSAGE');
	NotificationI18N[Enums.Notification.InvalidRecipients] = Utils.i18n('NOTIFICATIONS/INVALID_RECIPIENTS');

	NotificationI18N[Enums.Notification.CantCreateFolder] = Utils.i18n('NOTIFICATIONS/CANT_CREATE_FOLDER');
	NotificationI18N[Enums.Notification.CantRenameFolder] = Utils.i18n('NOTIFICATIONS/CANT_RENAME_FOLDER');
	NotificationI18N[Enums.Notification.CantDeleteFolder] = Utils.i18n('NOTIFICATIONS/CANT_DELETE_FOLDER');
	NotificationI18N[Enums.Notification.CantDeleteNonEmptyFolder] = Utils.i18n('NOTIFICATIONS/CANT_DELETE_NON_EMPTY_FOLDER');
	NotificationI18N[Enums.Notification.CantSubscribeFolder] = Utils.i18n('NOTIFICATIONS/CANT_SUBSCRIBE_FOLDER');
	NotificationI18N[Enums.Notification.CantUnsubscribeFolder] = Utils.i18n('NOTIFICATIONS/CANT_UNSUBSCRIBE_FOLDER');

	NotificationI18N[Enums.Notification.CantSaveSettings] = Utils.i18n('NOTIFICATIONS/CANT_SAVE_SETTINGS');
	NotificationI18N[Enums.Notification.CantSavePluginSettings] = Utils.i18n('NOTIFICATIONS/CANT_SAVE_PLUGIN_SETTINGS');
	
	NotificationI18N[Enums.Notification.DomainAlreadyExists] = Utils.i18n('NOTIFICATIONS/DOMAIN_ALREADY_EXISTS');
	
	NotificationI18N[Enums.Notification.CantInstallPackage] = Utils.i18n('NOTIFICATIONS/CANT_INSTALL_PACKAGE');
	NotificationI18N[Enums.Notification.CantDeletePackage] = Utils.i18n('NOTIFICATIONS/CANT_DELETE_PACKAGE');
	NotificationI18N[Enums.Notification.InvalidPluginPackage] = Utils.i18n('NOTIFICATIONS/INVALID_PLUGIN_PACKAGE');
	NotificationI18N[Enums.Notification.UnsupportedPluginPackage] = Utils.i18n('NOTIFICATIONS/UNSUPPORTED_PLUGIN_PACKAGE');

	NotificationI18N[Enums.Notification.LicensingServerIsUnavailable] = Utils.i18n('NOTIFICATIONS/LICENSING_SERVER_IS_UNAVAILABLE');
	NotificationI18N[Enums.Notification.LicensingExpired] = Utils.i18n('NOTIFICATIONS/LICENSING_EXPIRED');
	NotificationI18N[Enums.Notification.LicensingBanned] = Utils.i18n('NOTIFICATIONS/LICENSING_BANNED');

	NotificationI18N[Enums.Notification.DemoSendMessageError] = Utils.i18n('NOTIFICATIONS/DEMO_SEND_MESSAGE_ERROR');

	NotificationI18N[Enums.Notification.AccountAlreadyExists] = Utils.i18n('NOTIFICATIONS/ACCOUNT_ALREADY_EXISTS');
	
	NotificationI18N[Enums.Notification.MailServerError] = Utils.i18n('NOTIFICATIONS/MAIL_SERVER_ERROR');
	NotificationI18N[Enums.Notification.UnknownNotification] = Utils.i18n('NOTIFICATIONS/UNKNOWN_ERROR');
	NotificationI18N[Enums.Notification.UnknownError] = Utils.i18n('NOTIFICATIONS/UNKNOWN_ERROR');
};

/**
 * @param {*} mCode
 * @return {string}
 */
Utils.getUploadErrorDescByCode = function (mCode)
{
	var sResult = '';
	switch (Utils.pInt(mCode)) {
	case Enums.UploadErrorCode.FileIsTooBig:
		sResult = Utils.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG');
		break;
	case Enums.UploadErrorCode.FilePartiallyUploaded:
		sResult = Utils.i18n('UPLOAD/ERROR_FILE_PARTIALLY_UPLOADED');
		break;
	case Enums.UploadErrorCode.FileNoUploaded:
		sResult = Utils.i18n('UPLOAD/ERROR_NO_FILE_UPLOADED');
		break;
	case Enums.UploadErrorCode.MissingTempFolder:
		sResult = Utils.i18n('UPLOAD/ERROR_MISSING_TEMP_FOLDER');
		break;
	case Enums.UploadErrorCode.FileOnSaveingError:
		sResult = Utils.i18n('UPLOAD/ERROR_ON_SAVING_FILE');
		break;
	case Enums.UploadErrorCode.FileType:
		sResult = Utils.i18n('UPLOAD/ERROR_FILE_TYPE');
		break;
	default:
		sResult = Utils.i18n('UPLOAD/ERROR_UNKNOWN');
		break;
	}

	return sResult;
};

/**
 * @param {?} oObject
 * @param {string} sMethodName
 * @param {Array=} aParameters
 * @param {number=} nDelay
 */
Utils.delegateRun = function (oObject, sMethodName, aParameters, nDelay)
{
	if (oObject && oObject[sMethodName])
	{
		nDelay = Utils.pInt(nDelay);
		if (0 >= nDelay)
		{
			oObject[sMethodName].apply(oObject, Utils.isArray(aParameters) ? aParameters : []);
		}
		else
		{
			_.delay(function () {
				oObject[sMethodName].apply(oObject, Utils.isArray(aParameters) ? aParameters : []);
			}, nDelay);
		}
	}
};

/**
 * @param {?} oEvent
 */
Utils.killCtrlAandS = function (oEvent)
{
	oEvent = oEvent || window.event;
	if (oEvent && oEvent.ctrlKey && !oEvent.shiftKey && !oEvent.altKey)
	{
		var
			oSender = oEvent.target || oEvent.srcElement,
			iKey = oEvent.keyCode || oEvent.which
		;

		if (iKey === Enums.EventKeyCode.S)
		{
			oEvent.preventDefault();
			return;
		}

		if (oSender && oSender.tagName && oSender.tagName.match(/INPUT|TEXTAREA/i))
		{
			return;
		}

		if (iKey === Enums.EventKeyCode.A)
		{
			if (window.getSelection)
			{
				window.getSelection().removeAllRanges();
			}
			else if (window.document.selection && window.document.selection.clear)
			{
				window.document.selection.clear();
			}

			oEvent.preventDefault();
		}
	}
};

/**
 * @param {(Object|null|undefined)} oContext
 * @param {Function} fExecute
 * @param {(Function|boolean|null)=} fCanExecute
 * @return {Function}
 */
Utils.createCommand = function (oContext, fExecute, fCanExecute)
{
	var
		fResult = fExecute ? function () {
			if (fResult.canExecute && fResult.canExecute())
			{
				fExecute.apply(oContext, Array.prototype.slice.call(arguments));
			}
			return false;
		} : function () {}
	;

	fResult.enabled = ko.observable(true);

	fCanExecute = Utils.isUnd(fCanExecute) ? true : fCanExecute;
	if (Utils.isFunc(fCanExecute))
	{
		fResult.canExecute = ko.computed(function () {
			return fResult.enabled() && fCanExecute.call(oContext);
		});
	}
	else
	{
		fResult.canExecute = ko.computed(function () {
			return fResult.enabled() && !!fCanExecute;
		});
	}

	return fResult;
};

/**
 * @param {Object} oData
 */
Utils.initDataConstructorBySettings = function (oData)
{
	oData.editorDefaultType = ko.observable(Enums.EditorDefaultType.Html);
	oData.showImages = ko.observable(false);
	oData.interfaceAnimation = ko.observable(Enums.InterfaceAnimation.Full);
	oData.contactsAutosave = ko.observable(false);

	Globals.sAnimationType = Enums.InterfaceAnimation.Full;
	
	oData.allowThemes = ko.observable(true);
	oData.allowCustomLogin = ko.observable(false);
	oData.allowLanguagesOnSettings = ko.observable(true);
	oData.allowLanguagesOnLogin = ko.observable(true);

	oData.desktopNotifications = ko.observable(false);
	oData.useThreads = ko.observable(true);
	oData.replySameFolder = ko.observable(true);
	oData.useCheckboxesInList = ko.observable(true);
	
	oData.layout = ko.observable(Enums.Layout.SidePreview);
	oData.usePreviewPane = ko.computed(function () {
		return Enums.Layout.NoPreview !== oData.layout();
	});

	oData.interfaceAnimation.subscribe(function (sValue) {
		if (Globals.bMobileDevice || sValue === Enums.InterfaceAnimation.None)
		{
			$html.removeClass('rl-anim rl-anim-full').addClass('no-rl-anim');

			Globals.sAnimationType = Enums.InterfaceAnimation.None;
		}
		else
		{
			switch (sValue)
			{
				case Enums.InterfaceAnimation.Full:
					$html.removeClass('no-rl-anim').addClass('rl-anim rl-anim-full');
					Globals.sAnimationType = sValue;
					break;
				case Enums.InterfaceAnimation.Normal:
					$html.removeClass('no-rl-anim rl-anim-full').addClass('rl-anim');
					Globals.sAnimationType = sValue;
					break;
			}
		}
	});

	oData.interfaceAnimation.valueHasMutated();

	oData.desktopNotificationsPermisions = ko.computed(function () {
		oData.desktopNotifications();
		var iResult = Enums.DesktopNotifications.NotSupported;
		if (NotificationClass && NotificationClass.permission)
		{
			switch (NotificationClass.permission.toLowerCase())
			{
				case 'granted':
					iResult = Enums.DesktopNotifications.Allowed;
					break;
				case 'denied':
					iResult = Enums.DesktopNotifications.Denied;
					break;
				case 'default':
					iResult = Enums.DesktopNotifications.NotAllowed;
					break;
			}
		}
		else if (window.webkitNotifications && window.webkitNotifications.checkPermission)
		{
			iResult = window.webkitNotifications.checkPermission();
		}

		return iResult;
	});

	oData.useDesktopNotifications = ko.computed({
		'read': function () {
			return oData.desktopNotifications() &&
				Enums.DesktopNotifications.Allowed === oData.desktopNotificationsPermisions();
		},
		'write': function (bValue) {
			if (bValue)
			{
				var iPermission = oData.desktopNotificationsPermisions();
				if (Enums.DesktopNotifications.Allowed === iPermission)
				{
					oData.desktopNotifications(true);
				}
				else if (Enums.DesktopNotifications.NotAllowed === iPermission)
				{
					NotificationClass.requestPermission(function () {
						oData.desktopNotifications.valueHasMutated();
						if (Enums.DesktopNotifications.Allowed === oData.desktopNotificationsPermisions())
						{
							if (oData.desktopNotifications())
							{
								oData.desktopNotifications.valueHasMutated();
							}
							else
							{
								oData.desktopNotifications(true);
							}
						}
						else
						{
							if (oData.desktopNotifications())
							{
								oData.desktopNotifications(false);
							}
							else
							{
								oData.desktopNotifications.valueHasMutated();
							}
						}
					});
				}
				else
				{
					oData.desktopNotifications(false);
				}
			}
			else
			{
				oData.desktopNotifications(false);
			}
		}
	});

	oData.language = ko.observable('');
	oData.languages = ko.observableArray([]);

	oData.mainLanguage = ko.computed({
		'read': oData.language,
		'write': function (sValue) {
			if (sValue !== oData.language())
			{
				if (-1 < Utils.inArray(sValue, oData.languages()))
				{
					oData.language(sValue);
				}
				else if (0 < oData.languages().length)
				{
					oData.language(oData.languages()[0]);
				}
			}
			else
			{
				oData.language.valueHasMutated();
			}
		}
	});

	oData.theme = ko.observable('');
	oData.themes = ko.observableArray([]);

	oData.mainTheme = ko.computed({
		'read': oData.theme,
		'write': function (sValue) {
			if (sValue !== oData.theme())
			{
				var aThemes = oData.themes();
				if (-1 < Utils.inArray(sValue, aThemes))
				{
					oData.theme(sValue);
				}
				else if (0 < aThemes.length)
				{
					oData.theme(aThemes[0]);
				}
			}
			else
			{
				oData.theme.valueHasMutated();
			}
		}
	});

	oData.allowCustomTheme = ko.observable(false);
	oData.allowAdditionalAccounts = ko.observable(false);
	oData.allowIdentities = ko.observable(false);
	oData.determineUserLanguage = ko.observable(false);

	oData.messagesPerPage = ko.observable(Consts.Defaults.MessagesPerPage);//.extend({'throttle': 200});

	oData.mainMessagesPerPage = oData.messagesPerPage;
	oData.mainMessagesPerPage = ko.computed({
		'read': oData.messagesPerPage,
		'write': function (iValue) {
			if (-1 < Utils.inArray(Utils.pInt(iValue), Consts.Defaults.MessagesPerPageArray))
			{
				if (iValue !== oData.messagesPerPage())
				{
					oData.messagesPerPage(iValue);
				}
			}
			else
			{
				oData.messagesPerPage.valueHasMutated();
			}
		}
	});

	oData.facebookEnable = ko.observable(false);
	oData.facebookAppID = ko.observable('');
	oData.facebookAppSecret = ko.observable('');

	oData.twitterEnable = ko.observable(false);
	oData.twitterConsumerKey = ko.observable('');
	oData.twitterConsumerSecret = ko.observable('');

	oData.googleEnable = ko.observable(false);
	oData.googleClientID = ko.observable('');
	oData.googleClientSecret = ko.observable('');

	oData.dropboxEnable = ko.observable(false);
	oData.dropboxApiKey = ko.observable('');

	oData.contactsIsAllowed = ko.observable(false);
};

/**
 * @param {{moment:Function}} oObject
 */
Utils.createMomentDate = function (oObject)
{
	if (Utils.isUnd(oObject.moment))
	{
		oObject.moment = ko.observable(moment());
	}

	return ko.computed(function () {
		Globals.momentTrigger();
		return this.moment().fromNow();
	}, oObject);
};

/**
 * @param {{moment:Function, momentDate:Function}} oObject
 */
Utils.createMomentShortDate = function (oObject)
{
	return ko.computed(function () {
		var
			sResult = '',
			oMomentNow = moment(),
			oMoment = this.moment(),
			sMomentDate = this.momentDate()
		;

		if (4 >= oMomentNow.diff(oMoment, 'hours'))
		{
			sResult = sMomentDate;
		}
		else if (oMomentNow.format('L') === oMoment.format('L'))
		{
			sResult = Utils.i18n('MESSAGE_LIST/TODAY_AT', {
				'TIME': oMoment.format('LT')
			});
		}
		else if (oMomentNow.clone().subtract('days', 1).format('L') === oMoment.format('L'))
		{
			sResult = Utils.i18n('MESSAGE_LIST/YESTERDAY_AT', {
				'TIME': oMoment.format('LT')
			});
		}

		else if (oMomentNow.year() === oMoment.year())
		{
			sResult = oMoment.format('D MMM.');
		}
		else
		{
			sResult = oMoment.format('LL');
		}

		return sResult;

	}, oObject);
};

/**
 * @param {string} sFullNameHash
 * @return {boolean}
 */
Utils.isFolderExpanded = function (sFullNameHash)
{
	var aExpandedList = /** @type {Array|null} */ RL.local().get(Enums.ClientSideKeyName.ExpandedFolders);
	return _.isArray(aExpandedList) && -1 !== _.indexOf(aExpandedList, sFullNameHash);
};

/**
 * @param {string} sFullNameHash
 * @param {boolean} bExpanded
 */
Utils.setExpandedFolder = function (sFullNameHash, bExpanded)
{
	var aExpandedList = /** @type {Array|null} */ RL.local().get(Enums.ClientSideKeyName.ExpandedFolders);
	if (!_.isArray(aExpandedList))
	{
		aExpandedList = [];
	}
	
	if (bExpanded)
	{
		aExpandedList.push(sFullNameHash);
		aExpandedList = _.uniq(aExpandedList);
	}
	else
	{
		aExpandedList = _.without(aExpandedList, sFullNameHash);
	}

	RL.local().set(Enums.ClientSideKeyName.ExpandedFolders, aExpandedList);
};

Utils.initLayoutResizer = function (sLeft, sRight, sClientSideKeyName)
{
	var
		oLeft = $(sLeft),
		oRight = $(sRight),
		mLeftWidth = RL.local().get(sClientSideKeyName) || null,
		fResizeFunction = function (oEvent, oObject) {
			if (oObject && oObject.size && oObject.size.width)
			{
				RL.local().set(sClientSideKeyName, oObject.size.width);

				oRight.css({
					'left': '' + oObject.size.width + 'px'
				});
			}
		}
	;

	if (null !== mLeftWidth)
	{
		oLeft.css({
			'width': '' + mLeftWidth + 'px'
		});

		oRight.css({
			'left': '' + mLeftWidth + 'px'
		});
	}

	oLeft.resizable({
		'helper': 'ui-resizable-helper',
		'minWidth': 120,
		'maxWidth': 400,
		'handles': 'e',
		'stop': fResizeFunction
	});
};

//Utils.initLayoutResizer1 = function (sLeft, sRight, sParent/*, koSwither*/,
//	iLimitL, iMaxL, iDefL, iLimitR, sClientSideKeyName)
//{
//	iLimitL = iLimitL || 300;
//	iMaxL = iMaxL || 500;
//	iDefL = iDefL || (iMaxL - iLimitL / 2);
//	iLimitR = iLimitR || 300;
//
//	var
//		iTemp = 0,
//		oLeft = $(sLeft),
//		oRight = $(sRight),
//		oParent = $(sParent),
//		iLeftWidth = RL.local().get(sClientSideKeyName) || iDefL,
//		fFunction = function (oEvent, oObject, bForce) {
//
//			if (oObject || bForce)
//			{
//				var
//					iWidth = oParent.width(),
//					iProc = oObject ? oObject.size.width / iWidth * 100 : null
//				;
//
//				if (null === iProc && bForce)
//				{
//					iProc = oLeft.width() / iWidth * 100;
//				}
//
//				if (null !== iProc)
//				{
//					oLeft.css({
//						'width': '',
//						'height': '',
//						'right': '' + (100 - iProc) + '%'
//					});
//
//					oRight.css({
//						'width': '',
//						'height': '',
//						'left': '' + iProc + '%'
//					});
//				}
//			}
//		},
//		fResiseFunction = function (oEvent, oObject)
//		{
//			if (/*koSwither && koSwither() && */oObject && oObject.element &&
//				oObject.element[0]['id'] && '#' + oObject.element[0]['id'] === '' + sLeft)
//			{
//				var iWidth = oParent.width();
//				iTemp = iWidth - iLimitR;
//				iTemp = iMaxL > iTemp ? iTemp : iMaxL;
//				oLeft.resizable('option', 'maxWidth', iTemp);
//				if (oObject.size && oObject.size.width)
//				{
//					RL.local().set(sClientSideKeyName, oObject.size.width);
//				}
//
//				fFunction(null, null, true);
//			}
//		}
//	;
//
//	if (iLeftWidth)
//	{
//		oLeft.width(iLeftWidth);
//	}
//
//	iTemp = oParent.width() - iLimitR;
//	iTemp = iMaxL > iTemp ? iTemp : iMaxL;
//
//	oLeft.resizable({
//		'minWidth': iLimitL,
//		'maxWidth': iTemp,
//		'handles': 'e',
//		'resize': fFunction,
//		'stop': fFunction
//	});
//
//	fFunction(null, null, true);
//	$window.resize(_.throttle(fResiseFunction, 400));
//};

/**
 * @param {Object} oMessageTextBody
 */
Utils.initBlockquoteSwitcher = function (oMessageTextBody)
{
	if (oMessageTextBody)
	{
		var $oList = $('blockquote:not(.rl-bq-switcher)', oMessageTextBody).filter(function () {
			return 0 === $(this).parent().closest('blockquote', oMessageTextBody).length;
		});
		
		if ($oList && 0 < $oList.length)
		{
			$oList.each(function () {
				var $self = $(this), iH = $self.height();
				if (0 === iH || 100 < iH)
				{
					$self.addClass('rl-bq-switcher hidden-bq');
					$('<span class="rlBlockquoteSwitcher"><i class="icon-ellipsis" /></span>')
						.insertBefore($self)
						.click(function () {
							$self.toggleClass('hidden-bq');
							Utils.windowResize();
						})
						.after('<br />')
						.before('<br />')
					;
				}
			});
		}
	}
};

/**
 * @param {Object} oMessageTextBody
 */
Utils.removeBlockquoteSwitcher = function (oMessageTextBody)
{
	if (oMessageTextBody)
	{
		$(oMessageTextBody).find('blockquote.rl-bq-switcher').each(function () {
			$(this).removeClass('rl-bq-switcher hidden-bq');
		});

		$(oMessageTextBody).find('.rlBlockquoteSwitcher').each(function () {
			$(this).remove();
		});
	}
};

/**
 * @param {Object} oMessageTextBody
 */
Utils.toggleMessageBlockquote = function (oMessageTextBody)
{
	if (oMessageTextBody)
	{
		oMessageTextBody.find('.rlBlockquoteSwitcher').click();
	}
};

/**
 * @param {string} sName
 * @param {Function} ViewModelClass
 * @param {Function=} AbstractViewModel = KnoinAbstractViewModel
 */
Utils.extendAsViewModel = function (sName, ViewModelClass, AbstractViewModel)
{
	if (ViewModelClass)
	{
		if (!AbstractViewModel)
		{
			AbstractViewModel = KnoinAbstractViewModel;
		}

		ViewModelClass.__name = sName;
		Plugins.regViewModelHook(sName, ViewModelClass);
		_.extend(ViewModelClass.prototype, AbstractViewModel.prototype);
	}
};

/**
 * @param {Function} SettingsViewModelClass
 * @param {string} sLabelName
 * @param {string} sTemplate
 * @param {string} sRoute
 * @param {boolean=} bDefault
 */
Utils.addSettingsViewModel = function (SettingsViewModelClass, sTemplate, sLabelName, sRoute, bDefault)
{
	SettingsViewModelClass.__rlSettingsData = {
		'Label':  sLabelName,
		'Template':  sTemplate,
		'Route':  sRoute,
		'IsDefault':  !!bDefault
	};

	ViewModels['settings'].push(SettingsViewModelClass);
};

/**
 * @param {Function} SettingsViewModelClass
 */
Utils.removeSettingsViewModel = function (SettingsViewModelClass)
{
	ViewModels['settings-removed'].push(SettingsViewModelClass);
};

/**
 * @param {Function} SettingsViewModelClass
 */
Utils.disableSettingsViewModel = function (SettingsViewModelClass)
{
	ViewModels['settings-disabled'].push(SettingsViewModelClass);
};

Utils.convertThemeName = function (sTheme)
{
	return Utils.trim(sTheme.replace(/[^a-zA-Z]/g, ' ').replace(/([A-Z])/g, ' $1').replace(/[\s]+/g, ' '));
};

/**
 * @param {string} sName
 * @return {string}
 */
Utils.quoteName = function (sName)
{
	return sName.replace(/["]/g, '\\"');
};

/**
 * @return {number}
 */
Utils.microtime = function ()
{
	return (new Date()).getTime();
};

/**
 *
 * @param {string} sLanguage
 * @param {boolean=} bEng = false
 * @return {string}
 */
Utils.convertLangName = function (sLanguage, bEng)
{
	return Utils.i18n('LANGS_NAMES' + (true === bEng ? '_EN' : '') + '/LANG_' +
		sLanguage.toUpperCase().replace(/[^a-zA-Z0-9]+/, '_'), null, sLanguage);
};

/**
 * @param {number=} iLen
 * @return {string}
 */
Utils.fakeMd5 = function(iLen)
{
	var
		sResult = '',
		sLine = '0123456789abcdefghijklmnopqrstuvwxyz'
	;

	iLen = Utils.isUnd(iLen) ? 32 : Utils.pInt(iLen);

	while (sResult.length < iLen)
	{
		sResult += sLine.substr(Math.round(Math.random() * sLine.length), 1);
	}

	return sResult;
};

Utils.convertPlainTextToHtml = function (sPlain)
{
	return sPlain.toString()
		.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;')
		.replace(/\r/g, '').replace(/\n/g, '<br />');
};

Utils.draggeblePlace = function ()
{
	return $('<div class="draggablePlace"><span class="text"></span>&nbsp;<i class="icon-mail icon-white"></i></div>').appendTo('#rl-hidden');
};

Utils.defautOptionsAfterRender = function (oOption, oItem)
{
	if (oItem && !Utils.isUnd(oItem.disabled))
	{
		ko.applyBindingsToNode(oOption, {
			'disabled': oItem.disabled
		}, oItem);
	}
};

/**
 * @param {Object} oViewModel
 * @param {string} sTemplateID
 * @param {string} sTitle
 * @param {Function=} fCallback
 */
Utils.windowPopupKnockout = function (oViewModel, sTemplateID, sTitle, fCallback)
{
	var
		oScript = null,
		oWin = window.open(''),
		sFunc = '__OpenerApplyBindingsUid' + Utils.fakeMd5() + '__',
		oTemplate = $('#' + sTemplateID)
	;

	window[sFunc] = function () {

		if (oWin && oWin.document.body && oTemplate && oTemplate[0])
		{
			var oBody = $(oWin.document.body);

			$('#rl-content', oBody).html(oTemplate.html());
			$('html', oWin.document).addClass('external ' + $('html').attr('class'));

			Utils.i18nToNode(oBody);

			Knoin.prototype.applyExternal(oViewModel, $('#rl-content', oBody)[0]);

			window[sFunc] = null;

			fCallback(oWin);
		}
	};

	oWin.document.open();
	oWin.document.write('<html><head>' +
'<meta charset="utf-8" />' +
'<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />' +
'<meta name="viewport" content="user-scalable=no" />' +
'<meta name="apple-mobile-web-app-capable" content="yes" />' +
'<meta name="robots" content="noindex, nofollow, noodp" />' +
'<title>' + Utils.encodeHtml(sTitle) + '</title>' +
'</head><body><div id="rl-content"></div></body></html>');
	oWin.document.close();

	oScript = oWin.document.createElement('script');
	oScript.type = 'text/javascript';
	oScript.innerHTML = 'if(window&&window.opener&&window.opener[\'' + sFunc + '\']){window.opener[\'' + sFunc + '\']();window.opener[\'' + sFunc + '\']=null}';
	oWin.document.getElementsByTagName('head')[0].appendChild(oScript);
};

Utils.settingsSaveHelperFunction = function (fCallback, koTrigger, oContext, iTimer)
{
	oContext = oContext || null;
	iTimer = Utils.isUnd(iTimer) ? 1000 : Utils.pInt(iTimer);
	return function (sType, mData, bCached, sRequestAction, oRequestParameters) {
		koTrigger.call(oContext, mData && mData['Result'] ? Enums.SaveSettingsStep.TrueResult : Enums.SaveSettingsStep.FalseResult);
		if (fCallback)
		{
			fCallback.call(oContext, sType, mData, bCached, sRequestAction, oRequestParameters);
		}
		_.delay(function () {
			koTrigger.call(oContext, Enums.SaveSettingsStep.Idle);
		}, iTimer);
	};
};

Utils.settingsSaveHelperSimpleFunction = function (koTrigger, oContext)
{
	return Utils.settingsSaveHelperFunction(null, koTrigger, oContext, 1000);
};


/**
 * @param {string} sHtml
 * @return {string}
 */
Utils.htmlToPlain = function (sHtml)
{
	var
		sText = '',
		sQuoteChar = '> ',

		convertBlockquote = function () {
			if (arguments && 1 < arguments.length)
			{
				var	sText = $.trim(arguments[1])
					.replace(/__bq__start__(.|[\s\S\n\r]*)__bq__end__/gm, convertBlockquote)
				;

				sText = '\n' + sQuoteChar + $.trim(sText).replace(/\n/gm, '\n' + sQuoteChar) + '\n>\n';

				return sText.replace(/\n([> ]+)/gm, function () {
					return (arguments && 1 < arguments.length) ? '\n' + $.trim(arguments[1].replace(/[\s]/, '')) + ' ' : '';
				});
			}

			return '';
		},

		convertDivs = function () {
			if (arguments && 1 < arguments.length)
			{
				var sText = $.trim(arguments[1]);
				if (0 < sText.length)
				{
					sText = sText.replace(/<div[^>]*>(.|[\s\S\r\n]*)<\/div>/gmi, convertDivs);
					sText = '\n' + $.trim(sText) + '\n';
				}
				return sText;
			}
			return '';
		},

		fixAttibuteValue = function () {
			if (arguments && 1 < arguments.length)
			{
				return '' + arguments[1] + arguments[2].replace(/</g, '&lt;').replace(/>/g, '&gt;');
			}

			return '';
		},

		convertLinks = function () {
			if (arguments && 1 < arguments.length)
			{
				var
					sName = $.trim(arguments[1])
//					sHref = $.trim(arguments[0].replace(/<a [\s\S]*href[ ]?=[ ]?["']?([^"']+).+<\/a>/gmi, '$1'))
				;

				return sName;
//				sName = (0 === trim(sName).length) ? '' : sName;
//				sHref = ('mailto:' === sHref.substr(0, 7)) ? '' : sHref;
//				sHref = ('http' === sHref.substr(0, 4)) ? sHref : '';
//				sHref = (sName === sHref) ? '' : sHref;
//				sHref = (0 < sHref.length) ? ' (' + sHref + ') ' : '';
//				return (0 < sName.length) ? sName + sHref : sName;
			}
			return '';
		}
	;

	sText = sHtml
		.replace(/[\s]+/gm, ' ')
		.replace(/((?:href|data)\s?=\s?)("[^"]+?"|'[^']+?')/gmi, fixAttibuteValue)
		.replace(/<br\s?\/?>/gmi, '\n')
		.replace(/<\/h\d>/gi, '\n')
		.replace(/<\/p>/gi, '\n\n')
		.replace(/<\/li>/gi, '\n')
		.replace(/<\/td>/gi, '\n')
		.replace(/<\/tr>/gi, '\n')
		.replace(/<hr[^>]*>/gmi, '\n_______________________________\n\n')
		.replace(/<img [^>]*>/gmi, '')
		.replace(/<div[^>]*>(.|[\s\S\r\n]*)<\/div>/gmi, convertDivs)
		.replace(/<blockquote[^>]*>/gmi, '\n__bq__start__\n')
		.replace(/<\/blockquote>/gmi, '\n__bq__end__\n')
		.replace(/<a [^>]*>(.|[\s\S\r\n]*)<\/a>/gmi, convertLinks)
		.replace(/&nbsp;/gi, ' ')
		.replace(/<[^>]*>/gm, '')
		.replace(/&gt;/gi, '>')
		.replace(/&lt;/gi, '<')
		.replace(/&amp;/gi, '&')
		.replace(/&\w{2,6};/gi, '')
	;

	return sText
		.replace(/\n[ \t]+/gm, '\n')
		.replace(/[\n]{3,}/gm, '\n\n')
		.replace(/__bq__start__(.|[\s\S\r\n]*)__bq__end__/gm, convertBlockquote)
		.replace(/__bq__start__/gm, '')
		.replace(/__bq__end__/gm, '')
	;
};

/**
 * @param {string} sPlain
 * @return {string}
 */
Utils.plainToHtml = function (sPlain)
{
	return sPlain.toString()
		.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;')
		.replace(/\r/g, '').replace(/\n/g, '<br />');
};

Utils.resizeAndCrop = function (sUrl, iValue, fCallback)
{
	var oTempImg = new window.Image();
    oTempImg.onload = function() {

		var
			aDiff = [0, 0],
			oCanvas = document.createElement('canvas'),
			oCtx = oCanvas.getContext('2d')
		;

		oCanvas.width = iValue;
		oCanvas.height = iValue;

		if (this.width > this.height)
		{
			aDiff = [this.width - this.height, 0];
		}
		else
		{
			aDiff = [0, this.height - this.width];
		}

		oCtx.fillStyle = '#fff';
		oCtx.fillRect(0, 0, iValue, iValue);
		oCtx.drawImage(this, aDiff[0] / 2, aDiff[1] / 2, this.width - aDiff[0], this.height - aDiff[1], 0, 0, iValue, iValue);
			
		fCallback(oCanvas.toDataURL('image/jpeg'));
	};

    oTempImg.src = sUrl;
};

Utils.computedPagenatorHelper = function (koCurrentPage, koPageCount)
{
	return function() {
		var
			iPrev = 0,
			iNext = 0,
			iLimit = 2,
			aResult = [],
			iCurrentPage = koCurrentPage(),
			iPageCount = koPageCount(),

			/**
			 * @param {number} iIndex
			 * @param {boolean=} bPush
			 * @param {string=} sCustomName
			 */
			fAdd = function (iIndex, bPush, sCustomName) {

				var oData = {
					'current': iIndex === iCurrentPage,
					'name': Utils.isUnd(sCustomName) ? iIndex.toString() : sCustomName.toString(),
					'custom': Utils.isUnd(sCustomName) ? false : true,
					'title': Utils.isUnd(sCustomName) ? '' : iIndex.toString(),
					'value': iIndex.toString()
				};

				if (Utils.isUnd(bPush) ? true : !!bPush)
				{
					aResult.push(oData);
				}
				else
				{
					aResult.unshift(oData);
				}
			}
		;

		if (1 < iPageCount || (0 < iPageCount && iPageCount < iCurrentPage))
//		if (0 < iPageCount && 0 < iCurrentPage)
		{
			if (iPageCount < iCurrentPage)
			{
				fAdd(iPageCount);
				iPrev = iPageCount;
				iNext = iPageCount;
			}
			else
			{
				if (3 >= iCurrentPage || iPageCount - 2 <= iCurrentPage)
				{
					iLimit += 2;
				}

				fAdd(iCurrentPage);
				iPrev = iCurrentPage;
				iNext = iCurrentPage;
			}

			while (0 < iLimit) {

				iPrev -= 1;
				iNext += 1;

				if (0 < iPrev)
				{
					fAdd(iPrev, false);
					iLimit--;
				}

				if (iPageCount >= iNext)
				{
					fAdd(iNext, true);
					iLimit--;
				}
				else if (0 >= iPrev)
				{
					break;
				}
			}

			if (3 === iPrev)
			{
				fAdd(2, false);
			}
			else if (3 < iPrev)
			{
				fAdd(Math.round((iPrev - 1) / 2), false, '...');
			}

			if (iPageCount - 2 === iNext)
			{
				fAdd(iPageCount - 1, true);
			}
			else if (iPageCount - 2 > iNext)
			{
				fAdd(Math.round((iPageCount + iNext) / 2), true, '...');
			}

			// first and last
			if (1 < iPrev)
			{
				fAdd(1, false);
			}

			if (iPageCount > iNext)
			{
				fAdd(iPageCount, true);
			}
		}

		return aResult;
	};
};

Utils.selectElement = function (element)
{
	/* jshint onevar: false */
	if (window.getSelection)
	{
		var sel = window.getSelection();
		sel.removeAllRanges();
		var range = document.createRange();
		range.selectNodeContents(element);
		sel.addRange(range);
	}
	else if (document.selection)
	{
		var textRange = document.body.createTextRange();
		textRange.moveToElementText(element);
		textRange.select();
	}
	/* jshint onevar: true */
};

Utils.disableKeyFilter = function ()
{
	if (window.key)
	{
		key.filter = function () {
			return RL.data().useKeyboardShortcuts();
		};
	}
};

Utils.restoreKeyFilter = function ()
{
	if (window.key)
	{
		key.filter = function (event) {

			if (RL.data().useKeyboardShortcuts())
			{
				var
					element = event.target || event.srcElement,
					tagName = element ? element.tagName : ''
				;

				tagName = tagName.toUpperCase();
				return !(tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA' ||
					(element && tagName === 'DIV' && 'editorHtmlArea' === element.className && element.contentEditable)
				);
			}

			return false;
		};
	}
};

Utils.detectDropdownVisibility = _.debounce(function () {
	Globals.dropdownVisibility(!!_.find(BootstrapDropdowns, function (oItem) {
		return oItem.hasClass('open');
	}));
}, 50);
// Base64 encode / decode
// http://www.webtoolkit.info/
 
Base64 = {
 
	// private property
	_keyStr : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
	
	// public method for urlsafe encoding
	urlsafe_encode : function (input) {
		return Base64.encode(input).replace(/[+]/g, '-').replace(/[\/]/g, '_').replace(/[=]/g, '.');
	},
 
	// public method for encoding
	encode : function (input) {
		var
			output = '',
			chr1, chr2, chr3, enc1, enc2, enc3, enc4,
			i = 0
		;
 
		input = Base64._utf8_encode(input);
 
		while (i < input.length)
		{
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);
 
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;
 
			if (isNaN(chr2))
			{
				enc3 = enc4 = 64;
			}
			else if (isNaN(chr3))
			{
				enc4 = 64;
			}
 
			output = output +
				this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
				this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
		}
 
		return output;
	},
 
	// public method for decoding
	decode : function (input) {
		var 
			output = '',
			chr1, chr2, chr3, enc1, enc2, enc3, enc4,
			i = 0
		;
 
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
 
		while (i < input.length)
		{
			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));
 
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
 
			output = output + String.fromCharCode(chr1);
 
			if (enc3 !== 64)
			{
				output = output + String.fromCharCode(chr2);
			}
			
			if (enc4 !== 64)
			{
				output = output + String.fromCharCode(chr3);
			}
		}
 
		return Base64._utf8_decode(output);
	},
 
	// private method for UTF-8 encoding
	_utf8_encode : function (string) {
		
		string = string.replace(/\r\n/g, "\n");
		
		var 
			utftext = '',
			n = 0,
			l = string.length,
			c = 0
		;
 
		for (; n < l; n++) {
 
			c = string.charCodeAt(n);
 
			if (c < 128)
			{
				utftext += String.fromCharCode(c);
			}
			else if ((c > 127) && (c < 2048)) 
			{
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else
			{
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
		}
 
		return utftext;
	},
 
	// private method for UTF-8 decoding
	_utf8_decode : function (utftext) {
		var	
			string = '',
			i = 0,
			c = 0,
			c2 = 0,
			c3 = 0
		;
 
		while ( i < utftext.length )
		{
			c = utftext.charCodeAt(i);
 
			if (c < 128)
			{
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224))
			{
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else
			{
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
		}
 
		return string;
	}
};

/*jslint bitwise: false*/
ko.bindingHandlers.tooltip = {
	'init': function (oElement, fValueAccessor) {
		if (!Globals.bMobileDevice)
		{
			var
				$oEl = $(oElement),
				sClass = $oEl.data('tooltip-class') || '',
				sPlacement = $oEl.data('tooltip-placement') || 'top'
			;

			$oEl.tooltip({
				'delay': {
					'show': 500,
					'hide': 100
				},
				'html': true,
				'container': 'body',
				'placement': sPlacement,
				'trigger': 'hover',
				'title': function () {
					return $oEl.is('.disabled') || Globals.dropdownVisibility() ? '' : '<span class="tooltip-class ' + sClass + '">' +
						Utils.i18n(ko.utils.unwrapObservable(fValueAccessor())) + '</span>';
				}
			}).click(function () {
				$oEl.tooltip('hide');
			});

			Globals.dropdownVisibility.subscribe(function (bValue) {
				if (bValue)
				{
					$oEl.tooltip('hide');
				}
			});
		}
	}
};

ko.bindingHandlers.tooltip2 = {
	'init': function (oElement, fValueAccessor) {
		var
			$oEl = $(oElement),
			sClass = $oEl.data('tooltip-class') || '',
			sPlacement = $oEl.data('tooltip-placement') || 'top'
		;

		$oEl.tooltip({
			'delay': {
				'show': 500,
				'hide': 100
			},
			'html': true,
			'container': 'body',
			'placement': sPlacement,
			'title': function () {
				return $oEl.is('.disabled') || Globals.dropdownVisibility() ? '' :
					'<span class="tooltip-class ' + sClass + '">' + fValueAccessor()() + '</span>';
			}
		}).click(function () {
			$oEl.tooltip('hide');
		});

		Globals.dropdownVisibility.subscribe(function (bValue) {
			if (bValue)
			{
				$oEl.tooltip('hide');
			}
		});
	}
};

ko.bindingHandlers.registrateBootstrapDropdown = {
	'init': function (oElement) {
		BootstrapDropdowns.push($(oElement));
	}
};

ko.bindingHandlers.openDropdownTrigger = {
	'update': function (oElement, fValueAccessor) {
		if (ko.utils.unwrapObservable(fValueAccessor()))
		{
			var $el = $(oElement);
			if (!$el.hasClass('open'))
			{
				$el.find('.dropdown-toggle').dropdown('toggle');
				Utils.detectDropdownVisibility();
			}
			
			fValueAccessor()(false);
		}
	}
};

ko.bindingHandlers.dropdownCloser = {
	'init': function (oElement) {
		$(oElement).closest('.dropdown').on('click', '.e-item', function () {
			$(oElement).dropdown('toggle');
		});
	}
};

ko.bindingHandlers.popover = {
	'init': function (oElement, fValueAccessor) {
		$(oElement).popover(ko.utils.unwrapObservable(fValueAccessor()));
	}
};

ko.bindingHandlers.csstext = {
	'init': function (oElement, fValueAccessor) {
		if (oElement && oElement.styleSheet && !Utils.isUnd(oElement.styleSheet.cssText))
		{
			oElement.styleSheet.cssText = ko.utils.unwrapObservable(fValueAccessor());
		}
		else
		{
			$(oElement).text(ko.utils.unwrapObservable(fValueAccessor()));
		}
	},
	'update': function (oElement, fValueAccessor) {
		if (oElement && oElement.styleSheet && !Utils.isUnd(oElement.styleSheet.cssText))
		{
			oElement.styleSheet.cssText = ko.utils.unwrapObservable(fValueAccessor());
		}
		else
		{
			$(oElement).text(ko.utils.unwrapObservable(fValueAccessor()));
		}
	}
};

ko.bindingHandlers.resizecrop = {
	'init': function (oElement) {
		$(oElement).addClass('resizecrop').resizecrop({
			'width': '100',
			'height': '100',
			'wrapperCSS': {
				'border-radius': '10px'
			}
		});
	},
	'update': function (oElement, fValueAccessor) {
		fValueAccessor()();
		$(oElement).resizecrop({
			'width': '100',
			'height': '100'
		});
	}
};

ko.bindingHandlers.onEnter = {
	'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
		$(oElement).on('keypress',  function (oEvent) {
			if (oEvent && 13 === window.parseInt(oEvent.keyCode, 10))
			{
				$(oElement).trigger('change');
				fValueAccessor().call(oViewModel);
			}
		});
	}
};

ko.bindingHandlers.onEsc = {
	'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
		$(oElement).on('keypress', function (oEvent) {
			if (oEvent && 27 === window.parseInt(oEvent.keyCode, 10))
			{
				$(oElement).trigger('change');
				fValueAccessor().call(oViewModel);
			}
		});
	}
};

ko.bindingHandlers.clickOnTrue = {
	'update': function (oElement, fValueAccessor) {
		if (ko.utils.unwrapObservable(fValueAccessor()))
		{
			$(oElement).click();
		}
	}
};

ko.bindingHandlers.modal = {
	'init': function (oElement, fValueAccessor) {
		
		$(oElement).toggleClass('fade', !Globals.bMobileDevice).modal({
			'keyboard': false,
			'show': ko.utils.unwrapObservable(fValueAccessor())
		})
		.on('shown', function () {
			Utils.windowResize();
		})
		.find('.close').click(function () {
			fValueAccessor()(false);
		});
	},
	'update': function (oElement, fValueAccessor) {
		$(oElement).modal(ko.utils.unwrapObservable(fValueAccessor()) ? 'show' : 'hide');
	}
};

ko.bindingHandlers.i18nInit = {
	'init': function (oElement) {
		Utils.i18nToNode(oElement);
	}
};

ko.bindingHandlers.i18nUpdate = {
	'update': function (oElement, fValueAccessor) {
		ko.utils.unwrapObservable(fValueAccessor());
		Utils.i18nToNode(oElement);
	}
};

ko.bindingHandlers.link = {
	'update': function (oElement, fValueAccessor) {
		$(oElement).attr('href', ko.utils.unwrapObservable(fValueAccessor()));
	}
};

ko.bindingHandlers.title = {
	'update': function (oElement, fValueAccessor) {
		$(oElement).attr('title', ko.utils.unwrapObservable(fValueAccessor()));
	}
};

ko.bindingHandlers.textF = {
	'init': function (oElement, fValueAccessor) {
		$(oElement).text(ko.utils.unwrapObservable(fValueAccessor()));
	}
};

ko.bindingHandlers.initDom = {
	'init': function (oElement, fValueAccessor) {
		fValueAccessor()(oElement);
	}
};

ko.bindingHandlers.initResizeTrigger = {
	'init': function (oElement, fValueAccessor) {
		var aValues = ko.utils.unwrapObservable(fValueAccessor());
		$(oElement).css({
			'height': aValues[1],
			'min-height': aValues[1]
		});
	},
	'update': function (oElement, fValueAccessor) {
		var
			aValues = ko.utils.unwrapObservable(fValueAccessor()),
			iValue = Utils.pInt(aValues[1]),
			iSize = 0,
			iOffset = $(oElement).offset().top
		;

		if (0 < iOffset)
		{
			iOffset += Utils.pInt(aValues[2]);
			iSize = $window.height() - iOffset;

			if (iValue < iSize)
			{
				iValue = iSize;
			}

			$(oElement).css({
				'height': iValue,
				'min-height': iValue
			});
		}
	}
};

ko.bindingHandlers.appendDom = {
	'update': function (oElement, fValueAccessor) {
		$(oElement).hide().empty().append(ko.utils.unwrapObservable(fValueAccessor())).show();
	}
};

ko.bindingHandlers.draggable = {
	'init': function (oElement, fValueAccessor, fAllBindingsAccessor) {

		if (!Globals.bMobileDevice)
		{
			var
				iTriggerZone = 100,
				iScrollSpeed = 3,
				fAllValueFunc = fAllBindingsAccessor(),
				sDroppableSelector = fAllValueFunc && fAllValueFunc['droppableSelector'] ? fAllValueFunc['droppableSelector'] : '',
				oConf = {
					'distance': 20,
					'handle': '.dragHandle',
					'cursorAt': {'top': 22, 'left': 3},
					'refreshPositions': true,
					'scroll': true
				}
			;

			if (sDroppableSelector)
			{
				oConf['drag'] = function (oEvent) {

					$(sDroppableSelector).each(function () {
						var
							moveUp = null,
							moveDown = null,
							$this = $(this),
							oOffset = $this.offset(),
							bottomPos = oOffset.top + $this.height()
						;

						window.clearInterval($this.data('timerScroll'));
						$this.data('timerScroll', false);

						if (oEvent.pageX >= oOffset.left && oEvent.pageX <= oOffset.left + $this.width())
						{
							if (oEvent.pageY >= bottomPos - iTriggerZone && oEvent.pageY <= bottomPos)
							{
								moveUp = function() {
									$this.scrollTop($this.scrollTop() + iScrollSpeed);
									Utils.windowResize();
								};

								$this.data('timerScroll', window.setInterval(moveUp, 10));
								moveUp();
							}

							if (oEvent.pageY >= oOffset.top && oEvent.pageY <= oOffset.top + iTriggerZone)
							{
								moveDown = function() {
									$this.scrollTop($this.scrollTop() - iScrollSpeed);
									Utils.windowResize();
								};

								$this.data('timerScroll', window.setInterval(moveDown, 10));
								moveDown();
							}
						}
					});
				};

				oConf['stop'] =	function() {
					$(sDroppableSelector).each(function () {
						window.clearInterval($(this).data('timerScroll'));
						$(this).data('timerScroll', false);
					});
				};
			}

			oConf['helper'] = function (oEvent) {
				return fValueAccessor()(oEvent && oEvent.target ? ko.dataFor(oEvent.target) : null, !!oEvent.shiftKey);
			};

			$(oElement).draggable(oConf).on('mousedown', function () {
				Utils.removeInFocus();
			});
		}
	}
};

ko.bindingHandlers.droppable = {
	'init': function (oElement, fValueAccessor, fAllBindingsAccessor) {

		if (!Globals.bMobileDevice)
		{
			var
				fValueFunc = fValueAccessor(),
				fAllValueFunc = fAllBindingsAccessor(),
				fOverCallback = fAllValueFunc && fAllValueFunc['droppableOver'] ? fAllValueFunc['droppableOver'] : null,
				fOutCallback = fAllValueFunc && fAllValueFunc['droppableOut'] ? fAllValueFunc['droppableOut'] : null,
				oConf = {
					'tolerance': 'pointer',
					'hoverClass': 'droppableHover'
				}
			;

			if (fValueFunc)
			{
				oConf['drop'] = function (oEvent, oUi) {
					fValueFunc(oEvent, oUi);
				};

				if (fOverCallback)
				{
					oConf['over'] = function (oEvent, oUi) {
						fOverCallback(oEvent, oUi);
					};
				}

				if (fOutCallback)
				{
					oConf['out'] = function (oEvent, oUi) {
						fOutCallback(oEvent, oUi);
					};
				}

				$(oElement).droppable(oConf);
			}
		}
	}
};

ko.bindingHandlers.nano = {
	'init': function (oElement) {
		if (!Globals.bDisableNanoScroll)
		{
			$(oElement)
				.addClass('nano')
				.nanoScroller({
					'iOSNativeScrolling': false,
					'preventPageScrolling': true
				})
			;
		}
	}
};

ko.bindingHandlers.saveTrigger = {
	'init': function (oElement) {

		var $oEl = $(oElement);

		$oEl.data('save-trigger-type', $oEl.is('input[type=text],input[type=email],input[type=password],select,textarea') ? 'input' : 'custom');

		if ('custom' === $oEl.data('save-trigger-type'))
		{
			$oEl.append(
				'&nbsp;&nbsp;<i class="icon-spinner animated"></i><i class="icon-remove error"></i><i class="icon-ok success"></i>'
			).addClass('settings-saved-trigger');
		}
		else
		{
			$oEl.addClass('settings-saved-trigger-input');
		}
	},
	'update': function (oElement, fValueAccessor) {
		var
			mValue = ko.utils.unwrapObservable(fValueAccessor()),
			$oEl = $(oElement)
		;

		if ('custom' === $oEl.data('save-trigger-type'))
		{
			switch (mValue.toString())
			{
				case '1':
					$oEl
						.find('.animated,.error').hide().removeClass('visible')
						.end()
						.find('.success').show().addClass('visible')
					;
					break;
				case '0':
					$oEl
						.find('.animated,.success').hide().removeClass('visible')
						.end()
						.find('.error').show().addClass('visible')
					;
					break;
				case '-2':
					$oEl
						.find('.error,.success').hide().removeClass('visible')
						.end()
						.find('.animated').show().addClass('visible')
					;
					break;
				default:
					$oEl
						.find('.animated').hide()
						.end()
						.find('.error,.success').removeClass('visible')
					;
					break;
			}
		}
		else
		{
			switch (mValue.toString())
			{
				case '1':
					$oEl.addClass('success').removeClass('error');
					break;
				case '0':
					$oEl.addClass('error').removeClass('success');
					break;
				case '-2':
//					$oEl;
					break;
				default:
					$oEl.removeClass('error success');
					break;
			}
		}
	}
};

ko.bindingHandlers.emailsTags = {
    'init': function(oElement, fValueAccessor) {
		var
			$oEl = $(oElement),
			fValue = fValueAccessor()
		;

		$oEl.inputosaurus({
			'parseOnBlur': true,
			'inputDelimiters': [',', ';'],
			'autoCompleteSource': function (oData, fResponse) {
				RL.getAutocomplete(oData.term, function (aData) {
					fResponse(_.map(aData, function (oEmailItem) {
						return oEmailItem.toLine(false);
					}));
				});
			},
			'parseHook': function (aInput) {
				return _.map(aInput, function (sInputValue) {
					
					var
						sValue = Utils.trim(sInputValue),
						oEmail = null
					;
					
					if ('' !== sValue)
					{
						oEmail = new EmailModel();
						oEmail.mailsoParse(sValue);
						oEmail.clearDuplicateName();
						return [oEmail.toLine(false), oEmail];
					}

					return [sValue, null];

				});
			},
			'change': _.bind(function (oEvent) {
				$oEl.data('EmailsTagsValue', oEvent.target.value);
				fValue(oEvent.target.value);
			}, this)
		});

		fValue.subscribe(function (sValue) {
			if ($oEl.data('EmailsTagsValue') !== sValue)
			{
				$oEl.val(sValue);
				$oEl.data('EmailsTagsValue', sValue);
				$oEl.inputosaurus('refresh');
			}
		});

		if (fValue.focusTrigger)
		{
			fValue.focusTrigger.subscribe(function () {
				$oEl.inputosaurus('focus');
			});
		}
	}
};

ko.bindingHandlers.command = {
	'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
		var
			jqElement = $(oElement),
			oCommand = fValueAccessor()
		;

		if (!oCommand || !oCommand.enabled || !oCommand.canExecute)
		{
			throw new Error('You are not using command function');
		}

		jqElement.addClass('command');
		ko.bindingHandlers[jqElement.is('form') ? 'submit' : 'click'].init.apply(oViewModel, arguments);
	},

	'update': function (oElement, fValueAccessor) {

		var
			bResult = true,
			jqElement = $(oElement),
			oCommand = fValueAccessor()
		;

		bResult = oCommand.enabled();
		jqElement.toggleClass('command-not-enabled', !bResult);

		if (bResult)
		{
			bResult = oCommand.canExecute();
			jqElement.toggleClass('command-can-not-be-execute', !bResult);
		}

		jqElement.toggleClass('command-disabled disable disabled', !bResult).toggleClass('no-disabled', !!bResult);

		if (jqElement.is('input') || jqElement.is('button'))
		{
			jqElement.prop('disabled', !bResult);
		}
	}
};

ko.extenders.trimmer = function (oTarget)
{
	var oResult = ko.computed({
		'read': oTarget,
		'write': function (sNewValue) {
			oTarget(Utils.trim(sNewValue.toString()));
		},
		'owner': this
	});

	oResult(oTarget());
	return oResult;
};

ko.extenders.reversible = function (oTarget)
{
	var mValue = oTarget();

	oTarget.commit = function ()
	{
		mValue = oTarget();
	};

	oTarget.reverse = function ()
	{
		oTarget(mValue);
	};

	oTarget.commitedValue = function ()
	{
		return mValue;
	};

	return oTarget;
};

ko.extenders.toggleSubscribe = function (oTarget, oOptions)
{
	oTarget.subscribe(oOptions[1], oOptions[0], 'beforeChange');
	oTarget.subscribe(oOptions[2], oOptions[0]);

	return oTarget;
};

ko.extenders.falseTimeout = function (oTarget, iOption)
{
	oTarget.iTimeout = 0;
	oTarget.subscribe(function (bValue) {
		if (bValue)
		{
			window.clearTimeout(oTarget.iTimeout);
			oTarget.iTimeout = window.setTimeout(function () {
				oTarget(false);
				oTarget.iTimeout = 0;
			}, Utils.pInt(iOption));
		}
	});

	return oTarget;
};

ko.observable.fn.validateNone = function ()
{
	this.hasError = ko.observable(false);
	return this;
};

ko.observable.fn.validateEmail = function ()
{
	this.hasError = ko.observable(false);

	this.subscribe(function (sValue) {
		sValue = Utils.trim(sValue);
		this.hasError('' !== sValue && !(/^[^@\s]+@[^@\s]+$/.test(sValue)));
	}, this);

	this.valueHasMutated();
	return this;
};

ko.observable.fn.validateSimpleEmail = function ()
{
	this.hasError = ko.observable(false);

	this.subscribe(function (sValue) {
		sValue = Utils.trim(sValue);
		this.hasError('' !== sValue && !(/^.+@.+$/.test(sValue)));
	}, this);

	this.valueHasMutated();
	return this;
};

ko.observable.fn.validateFunc = function (fFunc)
{
	this.hasFuncError = ko.observable(false);

	if (Utils.isFunc(fFunc))
	{
		this.subscribe(function (sValue) {
			this.hasFuncError(!fFunc(sValue));
		}, this);
		
		this.valueHasMutated();
	}

	return this;
};


/**
 * @constructor
 */
function LinkBuilder()
{
	this.sBase = '#/';
	this.sCdnStaticDomain = RL.settingsGet('CdnStaticDomain');
	this.sVersion = RL.settingsGet('Version');
	this.sSpecSuffix = RL.settingsGet('AuthAccountHash') || '0';

	this.sServer = (RL.settingsGet('IndexFile') || './') + '?';
	this.sCdnStaticDomain = '' === this.sCdnStaticDomain ? this.sCdnStaticDomain :
		('/' === this.sCdnStaticDomain.substr(-1) ? this.sCdnStaticDomain : this.sCdnStaticDomain + '/');
}

/**
 * @return {string}
 */
LinkBuilder.prototype.root = function ()
{
	return this.sBase;
};

/**
 * @param {string} sDownload
 * @return {string}
 */
LinkBuilder.prototype.attachmentDownload = function (sDownload)
{
	return this.sServer + '/Raw/' + this.sSpecSuffix + '/Download/' + sDownload;
};

/**
 * @param {string} sDownload
 * @return {string}
 */
LinkBuilder.prototype.attachmentPreview = function (sDownload)
{
	return this.sServer + '/Raw/' + this.sSpecSuffix + '/View/' + sDownload;
};

/**
 * @param {string} sDownload
 * @return {string}
 */
LinkBuilder.prototype.attachmentPreviewAsPlain = function (sDownload)
{
	return this.sServer + '/Raw/' + this.sSpecSuffix + '/ViewAsPlain/' + sDownload;
};

/**
 * @return {string}
 */
LinkBuilder.prototype.upload = function ()
{
	return this.sServer + '/Upload/' + this.sSpecSuffix + '/';
};

/**
 * @return {string}
 */
LinkBuilder.prototype.uploadContacts = function ()
{
	return this.sServer + '/UploadContacts/' + this.sSpecSuffix + '/';
};

/**
 * @return {string}
 */
LinkBuilder.prototype.uploadBackground = function ()
{
	return this.sServer + '/UploadBackground/' + this.sSpecSuffix + '/';
};

/**
 * @return {string}
 */
LinkBuilder.prototype.append = function ()
{
	return this.sServer + '/Append/' + this.sSpecSuffix + '/';
};

/**
 * @param {string} sEmail
 * @return {string}
 */
LinkBuilder.prototype.change = function (sEmail)
{
	return this.sServer + '/Change/' + this.sSpecSuffix + '/' + window.encodeURIComponent(sEmail) + '/';
};

/**
 * @param {string=} sAdd
 * @return {string}
 */
LinkBuilder.prototype.ajax = function (sAdd)
{
	return this.sServer + '/Ajax/' + this.sSpecSuffix + '/' + sAdd;
};

/**
 * @param {string} sRequestHash
 * @return {string}
 */
LinkBuilder.prototype.messageViewLink = function (sRequestHash)
{
	return this.sServer + '/Raw/' + this.sSpecSuffix + '/ViewAsPlain/' + sRequestHash;
};

/**
 * @param {string} sRequestHash
 * @return {string}
 */
LinkBuilder.prototype.messageDownloadLink = function (sRequestHash)
{
	return this.sServer + '/Raw/' + this.sSpecSuffix + '/Download/' + sRequestHash;
};

/**
 * @return {string}
 */
LinkBuilder.prototype.inbox = function ()
{
	return this.sBase + 'mailbox/Inbox';
};

/**
 * @return {string}
 */
LinkBuilder.prototype.messagePreview = function ()
{
	return this.sBase + 'mailbox/message-preview';
};

/**
 * @param {string=} sScreenName
 * @return {string}
 */
LinkBuilder.prototype.settings = function (sScreenName)
{
	var sResult = this.sBase + 'settings';
	if (!Utils.isUnd(sScreenName) && '' !== sScreenName)
	{
		sResult += '/' + sScreenName;
	}

	return sResult;
};

/**
 * @param {string} sScreenName
 * @return {string}
 */
LinkBuilder.prototype.admin = function (sScreenName)
{
	var sResult = this.sBase;
	switch (sScreenName) {
	case 'AdminDomains':
		sResult += 'domains';
		break;
	case 'AdminSecurity':
		sResult += 'security';
		break;
	case 'AdminLicensing':
		sResult += 'licensing';
		break;
	}

	return sResult;
};

/**
 * @param {string} sFolder
 * @param {number=} iPage = 1
 * @param {string=} sSearch = ''
 * @return {string}
 */
LinkBuilder.prototype.mailBox = function (sFolder, iPage, sSearch)
{
	iPage = Utils.isNormal(iPage) ? Utils.pInt(iPage) : 1;
	sSearch = Utils.pString(sSearch);

	var sResult = this.sBase + 'mailbox/';
	if ('' !== sFolder)
	{
		sResult += encodeURI(sFolder);
	}
	if (1 < iPage)
	{
		sResult = sResult.replace(/[\/]+$/, '');
		sResult += '/p' + iPage;
	}
	if ('' !== sSearch)
	{
		sResult = sResult.replace(/[\/]+$/, '');
		sResult += '/' + encodeURI(sSearch);
	}

	return sResult;
};

/**
 * @return {string}
 */
LinkBuilder.prototype.phpInfo = function ()
{
	return this.sServer + 'Info';
};

/**
 * @param {string} sLang
 * @return {string}
 */
LinkBuilder.prototype.langLink = function (sLang)
{
	return this.sServer + '/Lang/0/' + encodeURI(sLang) + '/' + this.sVersion + '/';
};

/**
 * @param {string} sHash
 * @return {string}
 */
LinkBuilder.prototype.getUserPicUrlFromHash = function (sHash)
{
	return this.sServer + '/Raw/' + this.sSpecSuffix + '/UserPic/' + sHash + '/' + this.sVersion + '/';
};

/**
 * @return {string}
 */
LinkBuilder.prototype.emptyContactPic = function ()
{
	return ('' === this.sCdnStaticDomain ? 'rainloop/v/' : this.sCdnStaticDomain) +
		this.sVersion + '/static/css/images/empty-contact.png';
};

/**
 * @param {string} sFileName
 * @return {string}
 */
LinkBuilder.prototype.sound = function (sFileName)
{
	return ('' === this.sCdnStaticDomain ? 'rainloop/v/' : this.sCdnStaticDomain) +
		this.sVersion + '/static/sounds/' + sFileName;
};

/**
 * @param {string} sTheme
 * @return {string}
 */
LinkBuilder.prototype.themePreviewLink = function (sTheme)
{
	return ('' === this.sCdnStaticDomain ? 'rainloop/v/' : this.sCdnStaticDomain) +
		this.sVersion + '/themes/' + encodeURI(sTheme) + '/images/preview.png';
};

/**
 * @return {string}
 */
LinkBuilder.prototype.notificationMailIcon = function ()
{
	return ('' === this.sCdnStaticDomain ? 'rainloop/v/' : this.sCdnStaticDomain) +
		this.sVersion + '/static/css/images/icom-message-notification.png';
};

/**
 * @return {string}
 */
LinkBuilder.prototype.openPgpJs = function ()
{
	return ('' === this.sCdnStaticDomain ? 'rainloop/v/' : this.sCdnStaticDomain) +
		this.sVersion + '/static/js/openpgp.js';
};

/**
 * @return {string}
 */
LinkBuilder.prototype.socialGoogle = function ()
{
	return this.sServer + 'SocialGoogle' + ('' !== this.sSpecSuffix ? '/' + this.sSpecSuffix + '/' : '');
};

/**
 * @return {string}
 */
LinkBuilder.prototype.socialTwitter = function ()
{
	return this.sServer + 'SocialTwitter' + ('' !== this.sSpecSuffix ? '/' + this.sSpecSuffix + '/' : '');
};

/**
 * @return {string}
 */
LinkBuilder.prototype.socialFacebook = function ()
{
	return this.sServer + 'SocialFacebook' + ('' !== this.sSpecSuffix ? '/' + this.sSpecSuffix + '/' : '');
};

/**
 * @type {Object}
 */
Plugins.oViewModelsHooks = {};

/**
 * @type {Object}
 */
Plugins.oSimpleHooks = {};

/**
 * @param {string} sName
 * @param {Function} ViewModel
 */
Plugins.regViewModelHook = function (sName, ViewModel)
{
	if (ViewModel)
	{
		ViewModel.__hookName = sName;
	}
};

/**
 * @param {string} sName
 * @param {Function} fCallback
 */
Plugins.addHook = function (sName, fCallback)
{
	if (Utils.isFunc(fCallback))
	{
		if (!Utils.isArray(Plugins.oSimpleHooks[sName]))
		{
			Plugins.oSimpleHooks[sName] = [];
		}
		
		Plugins.oSimpleHooks[sName].push(fCallback);
	}
};

/**
 * @param {string} sName
 * @param {Array=} aArguments
 */
Plugins.runHook = function (sName, aArguments)
{
	if (Utils.isArray(Plugins.oSimpleHooks[sName]))
	{
		aArguments = aArguments || [];
		
		_.each(Plugins.oSimpleHooks[sName], function (fCallback) {
			fCallback.apply(null, aArguments);
		});
	}
};

/**
 * @param {string} sName
 * @return {?}
 */
Plugins.mainSettingsGet = function (sName)
{
	return RL ? RL.settingsGet(sName) : null;
};

/**
 * @param {Function} fCallback
 * @param {string} sAction
 * @param {Object=} oParameters
 * @param {?number=} iTimeout
 * @param {string=} sGetAdd = ''
 * @param {Array=} aAbortActions = []
 */
Plugins.remoteRequest = function (fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions)
{
	if (RL)
	{
		RL.remote().defaultRequest(fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions);
	}
};

/**
 * @param {string} sPluginSection
 * @param {string} sName
 * @return {?}
 */
Plugins.settingsGet = function (sPluginSection, sName)
{
	var oPlugin = Plugins.mainSettingsGet('Plugins');
	oPlugin = oPlugin && Utils.isUnd(oPlugin[sPluginSection]) ? null : oPlugin[sPluginSection];
	return oPlugin ? (Utils.isUnd(oPlugin[sName]) ? null : oPlugin[sName]) : null;
};



/**
 * @constructor
 */
function CookieDriver()
{

}

CookieDriver.supported = function ()
{
	return true;
};

/**
 * @param {string} sKey
 * @param {*} mData
 * @returns {boolean}
 */
CookieDriver.prototype.set = function (sKey, mData)
{
	var
		mCokieValue = $.cookie(Consts.Values.ClientSideCookieIndexName),
		bResult = false,
		mResult = null
	;

	try
	{
		mResult = null === mCokieValue ? null : JSON.parse(mCokieValue);
		if (!mResult)
		{
			mResult = {};
		}

		mResult[sKey] = mData;
		$.cookie(Consts.Values.ClientSideCookieIndexName, JSON.stringify(mResult), {
			'expires': 30
		});

		bResult = true;
	}
	catch (oException) {}

	return bResult;
};

/**
 * @param {string} sKey
 * @returns {*}
 */
CookieDriver.prototype.get = function (sKey)
{
	var
		mCokieValue = $.cookie(Consts.Values.ClientSideCookieIndexName),
		mResult = null
	;

	try
	{
		mResult = null === mCokieValue ? null : JSON.parse(mCokieValue);
		if (mResult && !Utils.isUnd(mResult[sKey]))
		{
			mResult = mResult[sKey];
		}
		else
		{
			mResult = null;
		}
	}
	catch (oException) {}

	return mResult;
};

/**
 * @constructor
 */
function LocalStorageDriver()
{
}

LocalStorageDriver.supported = function ()
{
	return !!window.localStorage;
};

/**
 * @param {string} sKey
 * @param {*} mData
 * @returns {boolean}
 */
LocalStorageDriver.prototype.set = function (sKey, mData)
{
	var
		mCookieValue = window.localStorage[Consts.Values.ClientSideCookieIndexName] || null,
		bResult = false,
		mResult = null
	;

	try
	{
		mResult = null === mCookieValue ? null : JSON.parse(mCookieValue);
		if (!mResult)
		{
			mResult = {};
		}

		mResult[sKey] = mData;
		window.localStorage[Consts.Values.ClientSideCookieIndexName] = JSON.stringify(mResult);

		bResult = true;
	}
	catch (oException) {}

	return bResult;
};

/**
 * @param {string} sKey
 * @returns {*}
 */
LocalStorageDriver.prototype.get = function (sKey)
{
	var
		mCokieValue = window.localStorage[Consts.Values.ClientSideCookieIndexName] || null,
		mResult = null
	;

	try
	{
		mResult = null === mCokieValue ? null : JSON.parse(mCokieValue);
		if (mResult && !Utils.isUnd(mResult[sKey]))
		{
			mResult = mResult[sKey];
		}
		else
		{
			mResult = null;
		}
	}
	catch (oException) {}

	return mResult;
};

/**
 * @constructor
 */
function LocalStorage()
{
	var
		sStorages = [
			LocalStorageDriver,
			CookieDriver
		],
		NextStorageDriver = _.find(sStorages, function (NextStorageDriver) {
			return NextStorageDriver.supported();
		})
	;

	if (NextStorageDriver)
	{
		NextStorageDriver = /** @type {?Function} */ NextStorageDriver;
		this.oDriver = new NextStorageDriver();
	}
}

LocalStorage.prototype.oDriver = null;

/**
 * @param {number} iKey
 * @param {*} mData
 * @return {boolean}
 */
LocalStorage.prototype.set = function (iKey, mData)
{
	return this.oDriver ? this.oDriver.set('p' + iKey, mData) : false;
};

/**
 * @param {number} iKey
 * @return {*}
 */
LocalStorage.prototype.get = function (iKey)
{
	return this.oDriver ? this.oDriver.get('p' + iKey) : null;
};

/**
 * @constructor
 */
function KnoinAbstractBoot()
{

}

KnoinAbstractBoot.prototype.bootstart = function ()
{

};

/**
 * @param {string=} sPosition = ''
 * @param {string=} sTemplate = ''
 * @constructor
 */
function KnoinAbstractViewModel(sPosition, sTemplate)
{
	this.bDisabeCloseOnEsc = false;
	this.sPosition = Utils.pString(sPosition);
	this.sTemplate = Utils.pString(sTemplate);

	this.sDefaultKeyScope = Enums.KeyState.None;
	this.sCurrentKeyScope = this.sDefaultKeyScope;

	this.viewModelName = '';
	this.viewModelVisibility = ko.observable(false);
	this.modalVisibility = ko.observable(false).extend({'rateLimit': 0});
	
	this.viewModelDom = null;
}

/**
 * @type {string}
 */
KnoinAbstractViewModel.prototype.sPosition = '';

/**
 * @type {string}
 */
KnoinAbstractViewModel.prototype.sTemplate = '';

/**
 * @type {string}
 */
KnoinAbstractViewModel.prototype.viewModelName = '';

/**
 * @type {?}
 */
KnoinAbstractViewModel.prototype.viewModelDom = null;

/**
 * @return {string}
 */
KnoinAbstractViewModel.prototype.viewModelTemplate = function ()
{
	return this.sTemplate;
};

/**
 * @return {string}
 */
KnoinAbstractViewModel.prototype.viewModelPosition = function ()
{
	return this.sPosition;
};

KnoinAbstractViewModel.prototype.cancelCommand = KnoinAbstractViewModel.prototype.closeCommand = function ()
{
};

KnoinAbstractViewModel.prototype.storeAndSetKeyScope = function ()
{
	this.sCurrentKeyScope = RL.data().keyScope();
	RL.data().keyScope(this.sDefaultKeyScope);
};

KnoinAbstractViewModel.prototype.restoreKeyScope = function ()
{
	RL.data().keyScope(this.sCurrentKeyScope);
};

KnoinAbstractViewModel.prototype.registerPopupEscapeKey = function ()
{
	var self = this;
	$window.on('keydown', function (oEvent) {
		if (oEvent && Enums.EventKeyCode.Esc === oEvent.keyCode && self.modalVisibility && self.modalVisibility())
		{
			Utils.delegateRun(self, 'cancelCommand');
			return false;
		}

		return true;
	});
};

/**
 * @param {string} sScreenName
 * @param {?=} aViewModels = []
 * @constructor
 */
function KnoinAbstractScreen(sScreenName, aViewModels)
{
	this.sScreenName = sScreenName;
	this.aViewModels = Utils.isArray(aViewModels) ? aViewModels : [];
}

/**
 * @type {Array}
 */
KnoinAbstractScreen.prototype.oCross = null;

/**
 * @type {string}
 */
KnoinAbstractScreen.prototype.sScreenName = '';

/**
 * @type {Array}
 */
KnoinAbstractScreen.prototype.aViewModels = [];

/**
 * @return {Array}
 */
KnoinAbstractScreen.prototype.viewModels = function ()
{
	return this.aViewModels;
};

/**
 * @return {string}
 */
KnoinAbstractScreen.prototype.screenName = function ()
{
	return this.sScreenName;
};

KnoinAbstractScreen.prototype.routes = function ()
{
	return null;
};

/**
 * @return {?Object}
 */
KnoinAbstractScreen.prototype.__cross = function ()
{
	return this.oCross;
};

KnoinAbstractScreen.prototype.__start = function ()
{
	var
		aRoutes = this.routes(),
		oRoute = null,
		fMatcher = null
	;

	if (Utils.isNonEmptyArray(aRoutes))
	{
		fMatcher = _.bind(this.onRoute || Utils.emptyFunction, this);
		oRoute = crossroads.create();

		_.each(aRoutes, function (aItem) {
			oRoute.addRoute(aItem[0], fMatcher).rules = aItem[1];
		});

		this.oCross = oRoute;
	}
};

/**
 * @constructor
 */
function Knoin()
{
	this.sDefaultScreenName = '';
	this.oScreens = {};
	this.oBoot = null;
	this.oCurrentScreen = null;
}

/**
 * @param {Object} thisObject
 */
Knoin.constructorEnd = function (thisObject)
{
	if (Utils.isFunc(thisObject['__constructor_end']))
	{
		thisObject['__constructor_end'].call(thisObject);
	}
};

Knoin.prototype.sDefaultScreenName = '';
Knoin.prototype.oScreens = {};
Knoin.prototype.oBoot = null;
Knoin.prototype.oCurrentScreen = null;

Knoin.prototype.hideLoading = function ()
{
	$('#rl-loading').hide();
};

Knoin.prototype.routeOff = function ()
{
	hasher.changed.active = false;
};

Knoin.prototype.routeOn = function ()
{
	hasher.changed.active = true;
};

/**
 * @param {Object} oBoot
 * @return {Knoin}
 */
Knoin.prototype.setBoot = function (oBoot)
{
	if (Utils.isNormal(oBoot))
	{
		this.oBoot = oBoot;
	}

	return this;
};

/**
 * @param {string} sScreenName
 * @return {?Object}
 */
Knoin.prototype.screen = function (sScreenName)
{
	return ('' !== sScreenName && !Utils.isUnd(this.oScreens[sScreenName])) ? this.oScreens[sScreenName] : null;
};

/**
 * @param {Function} ViewModelClass
 * @param {Object=} oScreen
 */
Knoin.prototype.buildViewModel = function (ViewModelClass, oScreen)
{
	if (ViewModelClass && !ViewModelClass.__builded)
	{
		var
			oViewModel = new ViewModelClass(oScreen),
			sPosition = oViewModel.viewModelPosition(),
			oViewModelPlace = $('#rl-content #rl-' + sPosition.toLowerCase()),
			oViewModelDom = null
		;

		ViewModelClass.__builded = true;
		ViewModelClass.__vm = oViewModel;
		oViewModel.data = RL.data();
		
		oViewModel.viewModelName = ViewModelClass.__name;

		if (oViewModelPlace && 1 === oViewModelPlace.length)
		{
			oViewModelDom = $('<div>').addClass('rl-view-model').addClass('RL-' + oViewModel.viewModelTemplate()).hide().attr('data-bind',
				'template: {name: "' + oViewModel.viewModelTemplate() + '"}, i18nInit: true');

			oViewModelDom.appendTo(oViewModelPlace);
			oViewModel.viewModelDom = oViewModelDom;
			ViewModelClass.__dom = oViewModelDom;

			if ('Popups' === sPosition)
			{
				oViewModel.cancelCommand = oViewModel.closeCommand = Utils.createCommand(oViewModel, function () {
					kn.hideScreenPopup(ViewModelClass);
				});

				oViewModel.modalVisibility.subscribe(function (bValue) {

					var self = this;
					if (bValue)
					{
						this.viewModelDom.show();
						this.storeAndSetKeyScope();

						RL.popupVisibilityNames.push(this.viewModelName);

						Utils.delegateRun(this, 'onFocus', [], 500);
					}
					else
					{
						Utils.delegateRun(this, 'onHide');
						this.restoreKeyScope();

						RL.popupVisibilityNames.remove(this.viewModelName);

						_.delay(function () {
							self.viewModelDom.hide();
						}, 300);
					}
					
				}, oViewModel);
			}
		
			Plugins.runHook('view-model-pre-build', [ViewModelClass.__name, oViewModel, oViewModelDom]);

			ko.applyBindings(oViewModel, oViewModelDom[0]);
			Utils.delegateRun(oViewModel, 'onBuild', [oViewModelDom]);
			if (oViewModel && 'Popups' === sPosition && !oViewModel.bDisabeCloseOnEsc)
			{
				oViewModel.registerPopupEscapeKey();
			}
			
			Plugins.runHook('view-model-post-build', [ViewModelClass.__name, oViewModel, oViewModelDom]);
		}
		else
		{
			Utils.log('Cannot find view model position: ' + sPosition);
		}
	}

	return ViewModelClass ? ViewModelClass.__vm : null;
};

/**
 * @param {Object} oViewModel
 * @param {Object} oViewModelDom
 */
Knoin.prototype.applyExternal = function (oViewModel, oViewModelDom)
{
	if (oViewModel && oViewModelDom)
	{
		ko.applyBindings(oViewModel, oViewModelDom);
	}
};

/**
 * @param {Function} ViewModelClassToHide
 */
Knoin.prototype.hideScreenPopup = function (ViewModelClassToHide)
{
	if (ViewModelClassToHide && ViewModelClassToHide.__vm && ViewModelClassToHide.__dom)
	{
		ViewModelClassToHide.__vm.modalVisibility(false);
		Plugins.runHook('view-model-on-hide', [ViewModelClassToHide.__name, ViewModelClassToHide.__vm]);
	}
};

/**
 * @param {Function} ViewModelClassToShow
 * @param {Array=} aParameters
 */
Knoin.prototype.showScreenPopup = function (ViewModelClassToShow, aParameters)
{
	if (ViewModelClassToShow)
	{
		this.buildViewModel(ViewModelClassToShow);

		if (ViewModelClassToShow.__vm && ViewModelClassToShow.__dom)
		{
			ViewModelClassToShow.__vm.modalVisibility(true);
			Utils.delegateRun(ViewModelClassToShow.__vm, 'onShow', aParameters || []);
			Plugins.runHook('view-model-on-show', [ViewModelClassToShow.__name, ViewModelClassToShow.__vm, aParameters || []]);
		}
	}
};

/**
 * @param {string} sScreenName
 * @param {string} sSubPart
 */
Knoin.prototype.screenOnRoute = function (sScreenName, sSubPart)
{
	var
		self = this,
		oScreen = null,
		oCross = null
	;

	if ('' === Utils.pString(sScreenName))
	{
		sScreenName = this.sDefaultScreenName;
	}

	if ('' !== sScreenName)
	{
		oScreen = this.screen(sScreenName);
		if (!oScreen)
		{
			oScreen = this.screen(this.sDefaultScreenName);
			if (oScreen)
			{
				sSubPart = sScreenName + '/' + sSubPart;
				sScreenName = this.sDefaultScreenName;
			}
		}

		if (oScreen && oScreen.__started)
		{
			if (!oScreen.__builded)
			{
				oScreen.__builded = true;

				if (Utils.isNonEmptyArray(oScreen.viewModels()))
				{
					_.each(oScreen.viewModels(), function (ViewModelClass) {
						this.buildViewModel(ViewModelClass, oScreen);
					}, this);
				}

				Utils.delegateRun(oScreen, 'onBuild');
			}

			_.defer(function () {
				
				// hide screen
				if (self.oCurrentScreen)
				{
					Utils.delegateRun(self.oCurrentScreen, 'onHide');

					if (Utils.isNonEmptyArray(self.oCurrentScreen.viewModels()))
					{
						_.each(self.oCurrentScreen.viewModels(), function (ViewModelClass) {

							if (ViewModelClass.__vm && ViewModelClass.__dom &&
								'Popups' !== ViewModelClass.__vm.viewModelPosition())
							{
								ViewModelClass.__dom.hide();
								ViewModelClass.__vm.viewModelVisibility(false);
								Utils.delegateRun(ViewModelClass.__vm, 'onHide');
							}

						});
					}
				}
				// --

				self.oCurrentScreen = oScreen;

				// show screen
				if (self.oCurrentScreen)
				{
					Utils.delegateRun(self.oCurrentScreen, 'onShow');

					Plugins.runHook('screen-on-show', [self.oCurrentScreen.screenName(), self.oCurrentScreen]);

					if (Utils.isNonEmptyArray(self.oCurrentScreen.viewModels()))
					{
						_.each(self.oCurrentScreen.viewModels(), function (ViewModelClass) {

							if (ViewModelClass.__vm && ViewModelClass.__dom &&
								'Popups' !== ViewModelClass.__vm.viewModelPosition())
							{
								ViewModelClass.__dom.show();
								ViewModelClass.__vm.viewModelVisibility(true);
								Utils.delegateRun(ViewModelClass.__vm, 'onShow');
								Utils.delegateRun(ViewModelClass.__vm, 'onFocus', [], 200);

								Plugins.runHook('view-model-on-show', [ViewModelClass.__name, ViewModelClass.__vm]);
							}

						}, self);
					}
				}
				// --

				oCross = oScreen.__cross();
				if (oCross)
				{
					oCross.parse(sSubPart);
				}
			});
		}
	}
};

/**
 * @param {Array} aScreensClasses
 */
Knoin.prototype.startScreens = function (aScreensClasses)
{
	$('#rl-content').css({
		'visibility': 'hidden'
	});

	_.each(aScreensClasses, function (CScreen) {

			var
				oScreen = new CScreen(),
				sScreenName = oScreen ? oScreen.screenName() : ''
			;

			if (oScreen && '' !== sScreenName)
			{
				if ('' === this.sDefaultScreenName)
				{
					this.sDefaultScreenName = sScreenName;
				}

				this.oScreens[sScreenName] = oScreen;
			}

		}, this);


	_.each(this.oScreens, function (oScreen) {
		if (oScreen && !oScreen.__started && oScreen.__start)
		{
			oScreen.__started = true;
			oScreen.__start();
			
			Plugins.runHook('screen-pre-start', [oScreen.screenName(), oScreen]);
			Utils.delegateRun(oScreen, 'onStart');
			Plugins.runHook('screen-post-start', [oScreen.screenName(), oScreen]);
		}
	}, this);

	var oCross = crossroads.create();
	oCross.addRoute(/^([a-zA-Z0-9\-]*)\/?(.*)$/, _.bind(this.screenOnRoute, this));

	hasher.initialized.add(oCross.parse, oCross);
	hasher.changed.add(oCross.parse, oCross);
	hasher.init();

	$('#rl-content').css({
		'visibility': 'visible'
	});

	_.delay(function () {
		$html.removeClass('rl-started-trigger').addClass('rl-started');
	}, 50);
};

/**
 * @param {string} sHash
 * @param {boolean=} bSilence = false
 * @param {boolean=} bReplace = false
 */
Knoin.prototype.setHash = function (sHash, bSilence, bReplace)
{
	sHash = '#' === sHash.substr(0, 1) ? sHash.substr(1) : sHash;
	sHash = '/' === sHash.substr(0, 1) ? sHash.substr(1) : sHash;

	bReplace = Utils.isUnd(bReplace) ? false : !!bReplace;

	if (Utils.isUnd(bSilence) ? false : !!bSilence)
	{
		hasher.changed.active = false;
		hasher[bReplace ? 'replaceHash' : 'setHash'](sHash);
		hasher.changed.active = true;
	}
	else
	{
		hasher.changed.active = true;
		hasher[bReplace ? 'replaceHash' : 'setHash'](sHash);
		hasher.setHash(sHash);
	}
};

/**
 * @return {Knoin}
 */
Knoin.prototype.bootstart = function ()
{
	if (this.oBoot && this.oBoot.bootstart)
	{
		this.oBoot.bootstart();
	}

	return this;
};

kn = new Knoin();

/**
 * @param {string=} sEmail
 * @param {string=} sName
 *
 * @constructor
 */
function EmailModel(sEmail, sName)
{
	this.email = sEmail || '';
	this.name = sName || '';
	this.privateType = null;

	this.clearDuplicateName();
}

/**
 * @static
 * @param {AjaxJsonEmail} oJsonEmail
 * @return {?EmailModel}
 */
EmailModel.newInstanceFromJson = function (oJsonEmail)
{
	var oEmailModel = new EmailModel();
	return oEmailModel.initByJson(oJsonEmail) ? oEmailModel : null;
};

/**
 * @type {string}
 */
EmailModel.prototype.name = '';

/**
 * @type {string}
 */
EmailModel.prototype.email = '';

/**
 * @type {(number|null)}
 */
EmailModel.prototype.privateType = null;

EmailModel.prototype.clear = function ()
{
	this.email = '';
	this.name = '';
	this.privateType = null;
};

/**
 * @returns {boolean}
 */
EmailModel.prototype.validate = function ()
{
	return '' !== this.name || '' !== this.email;
};

/**
 * @param {boolean} bWithoutName = false
 * @return {string}
 */
EmailModel.prototype.hash = function (bWithoutName)
{
	return '#' + (bWithoutName ? '' : this.name) + '#' + this.email + '#';
};

EmailModel.prototype.clearDuplicateName = function ()
{
	if (this.name === this.email)
	{
		this.name = '';
	}
};

/**
 * @return {number}
 */
EmailModel.prototype.type = function ()
{
	if (null === this.privateType)
	{
		if (this.email && '@facebook.com' === this.email.substr(-13))
		{
			this.privateType = Enums.EmailType.Facebook;
		}

		if (null === this.privateType)
		{
			this.privateType = Enums.EmailType.Default;
		}
	}
	
	return this.privateType;
};

/**
 * @param {string} sQuery
 * @return {boolean}
 */
EmailModel.prototype.search = function (sQuery)
{
	return -1 < (this.name + ' ' + this.email).toLowerCase().indexOf(sQuery.toLowerCase());
};

/**
 * @param {string} sString
 */
EmailModel.prototype.parse = function (sString)
{
	this.clear();

	sString = Utils.trim(sString);

	var
		mRegex = /(?:"([^"]+)")? ?<?(.*?@[^>,]+)>?,? ?/g,
		mMatch = mRegex.exec(sString)
	;

	if (mMatch)
	{
		this.name = mMatch[1] || '';
		this.email = mMatch[2] || '';

		this.clearDuplicateName();
	}
	else if ((/^[^@]+@[^@]+$/).test(sString))
	{
		this.name = '';
		this.email = sString;
	}
};

/**
 * @param {AjaxJsonEmail} oJsonEmail
 * @return {boolean}
 */
EmailModel.prototype.initByJson = function (oJsonEmail)
{
	var bResult = false;
	if (oJsonEmail && 'Object/Email' === oJsonEmail['@Object'])
	{
		this.name = Utils.trim(oJsonEmail.Name);
		this.email = Utils.trim(oJsonEmail.Email);

		bResult = '' !== this.email;
		this.clearDuplicateName();
	}

	return bResult;
};

/**
 * @param {boolean} bFriendlyView
 * @param {boolean=} bWrapWithLink = false
 * @param {boolean=} bEncodeHtml = false
 * @return {string}
 */
EmailModel.prototype.toLine = function (bFriendlyView, bWrapWithLink, bEncodeHtml)
{
	var sResult = '';
	if ('' !== this.email)
	{
		bWrapWithLink = Utils.isUnd(bWrapWithLink) ? false : !!bWrapWithLink;
		bEncodeHtml = Utils.isUnd(bEncodeHtml) ? false : !!bEncodeHtml;
		
		if (bFriendlyView && '' !== this.name)
		{
			sResult = bWrapWithLink ? '<a href="mailto:' + Utils.encodeHtml('"' + this.name + '" <' + this.email + '>') +
				'" target="_blank" tabindex="-1">' + Utils.encodeHtml(this.name) + '</a>' : 
					(bEncodeHtml ? Utils.encodeHtml(this.name) : this.name);
		}
		else
		{
			sResult = this.email;
			if ('' !== this.name)
			{
				if (bWrapWithLink)
				{
					sResult = Utils.encodeHtml('"' + this.name + '" <') +
						'<a href="mailto:' + Utils.encodeHtml('"' + this.name + '" <' + this.email + '>') + '" target="_blank" tabindex="-1">' + Utils.encodeHtml(sResult) + '</a>' + Utils.encodeHtml('>');
				}
				else
				{
					sResult = '"' + this.name + '" <' + sResult + '>';
					if (bEncodeHtml)
					{
						sResult = Utils.encodeHtml(sResult);
					}
				}
			}
			else if (bWrapWithLink)
			{
				sResult = '<a href="mailto:' + Utils.encodeHtml(this.email) + '" target="_blank" tabindex="-1">' + Utils.encodeHtml(this.email) + '</a>';
			}
		}
	}

	return sResult;
};

/**
 * @param {string} $sEmailAddress
 * @return {boolean}
 */
EmailModel.prototype.mailsoParse = function ($sEmailAddress)
{
	$sEmailAddress = Utils.trim($sEmailAddress);
	if ('' === $sEmailAddress)
	{
		return false;
	}

	var
		substr = function (str, start, len) {
			str += '';
			var	end = str.length;

			if (start < 0) {
				start += end;
			}
			
			end = typeof len === 'undefined' ? end : (len < 0 ? len + end : len + start);
			
			return start >= str.length || start < 0 || start > end ? false : str.slice(start, end);
		},
				
		substr_replace = function (str, replace, start, length) {
			if (start < 0) {
				start = start + str.length;
			}
			length = length !== undefined ? length : str.length;
			if (length < 0) {
				length = length + str.length - start;
			}
			return str.slice(0, start) + replace.substr(0, length) + replace.slice(length) + str.slice(start + length);
		},
		
		$sName = '',
		$sEmail = '',
		$sComment = '',

		$bInName = false,
		$bInAddress = false,
		$bInComment = false,

		$aRegs = null,

		$iStartIndex = 0,
		$iEndIndex = 0,
		$iCurrentIndex = 0
	;

	while ($iCurrentIndex < $sEmailAddress.length)
	{
		switch ($sEmailAddress.substr($iCurrentIndex, 1))
		{
			case '"':
				if ((!$bInName) && (!$bInAddress) && (!$bInComment))
				{
					$bInName = true;
					$iStartIndex = $iCurrentIndex;
				}
				else if ((!$bInAddress) && (!$bInComment))
				{
					$iEndIndex = $iCurrentIndex;
					$sName = substr($sEmailAddress, $iStartIndex + 1, $iEndIndex - $iStartIndex - 1);
					$sEmailAddress = substr_replace($sEmailAddress, '', $iStartIndex, $iEndIndex - $iStartIndex + 1);
					$iEndIndex = 0;
					$iCurrentIndex = 0;
					$iStartIndex = 0;
					$bInName = false;
				}
				break;
			case '<':
				if ((!$bInName) && (!$bInAddress) && (!$bInComment))
				{
					if ($iCurrentIndex > 0 && $sName.length === 0)
					{
						$sName = substr($sEmailAddress, 0, $iCurrentIndex);
					}

					$bInAddress = true;
					$iStartIndex = $iCurrentIndex;
				}
				break;
			case '>':
				if ($bInAddress)
				{
					$iEndIndex = $iCurrentIndex;
					$sEmail = substr($sEmailAddress, $iStartIndex + 1, $iEndIndex - $iStartIndex - 1);
					$sEmailAddress = substr_replace($sEmailAddress, '', $iStartIndex, $iEndIndex - $iStartIndex + 1);
					$iEndIndex = 0;
					$iCurrentIndex = 0;
					$iStartIndex = 0;
					$bInAddress = false;
				}
				break;
			case '(':
				if ((!$bInName) && (!$bInAddress) && (!$bInComment))
				{
					$bInComment = true;
					$iStartIndex = $iCurrentIndex;
				}
				break;
			case ')':
				if ($bInComment)
				{
					$iEndIndex = $iCurrentIndex;
					$sComment = substr($sEmailAddress, $iStartIndex + 1, $iEndIndex - $iStartIndex - 1);
					$sEmailAddress = substr_replace($sEmailAddress, '', $iStartIndex, $iEndIndex - $iStartIndex + 1);
					$iEndIndex = 0;
					$iCurrentIndex = 0;
					$iStartIndex = 0;
					$bInComment = false;
				}
				break;
			case '\\':
				$iCurrentIndex++;
				break;
		}

		$iCurrentIndex++;
	}

	if ($sEmail.length === 0)
	{
		$aRegs = $sEmailAddress.match(/[^@\s]+@\S+/i);
		if ($aRegs && $aRegs[0])
		{
			$sEmail = $aRegs[0];
		}
		else
		{
			$sName = $sEmailAddress;
		}
	}

	if ($sEmail.length > 0 && $sName.length === 0 && $sComment.length === 0)
	{
		$sName = $sEmailAddress.replace($sEmail, '');
	}

	$sEmail = Utils.trim($sEmail).replace(/^[<]+/, '').replace(/[>]+$/, '');
	$sName = Utils.trim($sName).replace(/^["']+/, '').replace(/["']+$/, '');
	$sComment = Utils.trim($sComment).replace(/^[(]+/, '').replace(/[)]+$/, '');

	// Remove backslash
	$sName = $sName.replace(/\\\\(.)/, '$1');
	$sComment = $sComment.replace(/\\\\(.)/, '$1');

	this.name = $sName;
	this.email = $sEmail;

	this.clearDuplicateName();
	return true;
};

/**
 * @return {string}
 */
EmailModel.prototype.inputoTagLine = function ()
{
	return 0 < this.name.length ? this.name + ' (' + this.email + ')' : this.email;
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsDomainViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsDomain');
	
	this.edit = ko.observable(false);
	this.saving = ko.observable(false);
	this.savingError = ko.observable('');
	this.whiteListPage = ko.observable(false);

	this.testing = ko.observable(false);
	this.testingDone = ko.observable(false);
	this.testingImapError = ko.observable(false);
	this.testingSmtpError = ko.observable(false);

	this.imapServerFocus = ko.observable(false);
	this.smtpServerFocus = ko.observable(false);

	this.name = ko.observable('');
	this.name.focused = ko.observable(false);

	this.imapServer = ko.observable('');
	this.imapPort = ko.observable(Consts.Values.ImapDefaulPort);
	this.imapSecure = ko.observable(Enums.ServerSecure.None);
	this.imapShortLogin = ko.observable(false);
	this.smtpServer = ko.observable('');
	this.smtpPort = ko.observable(Consts.Values.SmtpDefaulPort);
	this.smtpSecure = ko.observable(Enums.ServerSecure.None);
	this.smtpShortLogin = ko.observable(false);
	this.smtpAuth = ko.observable(true);
	this.whiteList = ko.observable('');

	this.imapServerFocus.subscribe(function (bValue) {
		if (bValue && '' !== this.name() && '' === this.imapServer())
		{
			this.imapServer(this.name().replace(/[.]?[*][.]?/g, ''));
		}
	}, this);

	this.smtpServerFocus.subscribe(function (bValue) {
		if (bValue && '' !== this.imapServer() && '' === this.smtpServer())
		{
			this.smtpServer(this.imapServer().replace(/imap/ig, 'smtp'));
		}
	}, this);

	this.headerText = ko.computed(function () {
		var sName = this.name();
		return this.edit() ? 'Edit Domain "' + sName + '"' :
			'Add Domain' + ('' === sName ? '' : ' "' + sName + '"');
	}, this);

	this.domainIsComputed = ko.computed(function () {
		return '' !== this.name() &&
			'' !== this.imapServer() &&
			'' !== this.imapPort() &&
			'' !== this.smtpServer() &&
			'' !== this.smtpPort();
	}, this);

	this.canBeTested = ko.computed(function () {
		return !this.testing() && this.domainIsComputed();
	}, this);

	this.canBeSaved = ko.computed(function () {
		return !this.saving() && this.domainIsComputed();
	}, this);

	this.createOrAddCommand = Utils.createCommand(this, function () {
		this.saving(true);
		RL.remote().createOrUpdateDomain(
			_.bind(this.onDomainCreateOrSaveResponse, this),
			!this.edit(),
			this.name(),
			this.imapServer(),
			this.imapPort(),
			this.imapSecure(),
			this.imapShortLogin(),
			this.smtpServer(),
			this.smtpPort(),
			this.smtpSecure(),
			this.smtpShortLogin(),
			this.smtpAuth(),
			this.whiteList()
		);
	}, this.canBeSaved);

	this.testConnectionCommand = Utils.createCommand(this, function () {
		this.whiteListPage(false);
		this.testingDone(false);
		this.testingImapError(false);
		this.testingSmtpError(false);
		this.testing(true);
		RL.remote().testConnectionForDomain(
			_.bind(this.onTestConnectionResponse, this),
			this.imapServer(),
			this.imapPort(),
			this.imapSecure(),
			this.smtpServer(),
			this.smtpPort(),
			this.smtpSecure(),
			this.smtpAuth()
		);
	}, this.canBeTested);

	this.whiteListCommand = Utils.createCommand(this, function () {
		this.whiteListPage(!this.whiteListPage());
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsDomainViewModel', PopupsDomainViewModel);

PopupsDomainViewModel.prototype.onTestConnectionResponse = function (sResult, oData)
{
	this.testing(false);
	if (Enums.StorageResultType.Success === sResult && oData.Result)
	{
		this.testingDone(true);
		this.testingImapError(false === oData.Result.Imap);
		this.testingSmtpError(false === oData.Result.Smtp);
	}
	else
	{
		this.testingImapError(true);
		this.testingSmtpError(true);
	}
};

PopupsDomainViewModel.prototype.onDomainCreateOrSaveResponse = function (sResult, oData)
{
	this.saving(false);
	if (Enums.StorageResultType.Success === sResult && oData)
	{
		if (oData.Result)
		{
			RL.reloadDomainList();
			this.closeCommand();
		}
		else if (Enums.Notification.DomainAlreadyExists === oData.ErrorCode)
		{
			this.savingError('Domain already exists');
		}
	}
	else
	{
		this.savingError('Unknown error');
	}
};

PopupsDomainViewModel.prototype.onHide = function ()
{
	this.whiteListPage(false);
};

PopupsDomainViewModel.prototype.onShow = function (oDomain)
{
	this.saving(false);
	this.whiteListPage(false);

	this.testing(false);
	this.testingDone(false);
	this.testingImapError(false);
	this.testingSmtpError(false);

	this.clearForm();
	if (oDomain)
	{
		this.edit(true);

		this.name(Utils.trim(oDomain.Name));
		this.imapServer(Utils.trim(oDomain.IncHost));
		this.imapPort(Utils.pInt(oDomain.IncPort));
		this.imapSecure(Utils.trim(oDomain.IncSecure));
		this.imapShortLogin(!!oDomain.IncShortLogin);
		this.smtpServer(Utils.trim(oDomain.OutHost));
		this.smtpPort(Utils.pInt(oDomain.OutPort));
		this.smtpSecure(Utils.trim(oDomain.OutSecure));
		this.smtpShortLogin(!!oDomain.OutShortLogin);
		this.smtpAuth(!!oDomain.OutAuth);
		this.whiteList(Utils.trim(oDomain.WhiteList));
	}
};

PopupsDomainViewModel.prototype.onFocus = function ()
{
	if ('' === this.name())
	{
		this.name.focused(true);
	}
};

PopupsDomainViewModel.prototype.clearForm = function ()
{
	this.edit(false);
	this.whiteListPage(false);
	
	this.savingError('');

	this.name('');
	this.name.focused(false);

	this.imapServer('');
	this.imapPort(Consts.Values.ImapDefaulPort);
	this.imapSecure(Enums.ServerSecure.None);
	this.imapShortLogin(false);
	this.smtpServer('');
	this.smtpPort(Consts.Values.SmtpDefaulPort);
	this.smtpSecure(Enums.ServerSecure.None);
	this.smtpShortLogin(false);
	this.smtpAuth(true);
	this.whiteList('');
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsPluginViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsPlugin');

	var self = this;
	
	this.onPluginSettingsUpdateResponse = _.bind(this.onPluginSettingsUpdateResponse, this);
	
	this.saveError = ko.observable('');
	
	this.name = ko.observable('');
	this.readme = ko.observable('');
	
	this.configures = ko.observableArray([]);

	this.hasReadme = ko.computed(function () {
		return '' !== this.readme();
	}, this);
	
	this.hasConfiguration = ko.computed(function () {
		return 0 < this.configures().length;
	}, this);

	this.readmePopoverConf = {
		'placement': 'top',
		'trigger': 'hover',
		'title': 'About',
		'content': function () {
			return self.readme();
		}
	};
	
	this.saveCommand = Utils.createCommand(this, function () {
		
		var oList = {};
		
		oList['Name'] = this.name();
		
		_.each(this.configures(), function (oItem) {
			
			var mValue = oItem.value();
			if (false === mValue || true === mValue)
			{
				mValue = mValue ? '1' : '0';
			}
			
			oList['_' + oItem['Name']] = mValue;
			
		}, this);
		
		this.saveError('');
		RL.remote().pluginSettingsUpdate(this.onPluginSettingsUpdateResponse, oList);
		
	}, this.hasConfiguration);

	this.bDisabeCloseOnEsc = true;
	this.sDefaultKeyScope = Enums.KeyState.All;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsPluginViewModel', PopupsPluginViewModel);

PopupsPluginViewModel.prototype.onPluginSettingsUpdateResponse = function (sResult, oData)
{
	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		this.cancelCommand();
	}
	else
	{
		this.saveError('');
		if (oData && oData.ErrorCode)
		{
			this.saveError(Utils.getNotification(oData.ErrorCode));
		}
		else
		{
			this.saveError(Utils.getNotification(Enums.Notification.CantSavePluginSettings));
		}
	}
};

PopupsPluginViewModel.prototype.onShow = function (oPlugin)
{
	this.name();
	this.readme();
	this.configures([]);
	
	if (oPlugin)
	{
		this.name(oPlugin['Name']);
		this.readme(oPlugin['Readme']);
		
		var aConfig = oPlugin['Config'];
		if (Utils.isNonEmptyArray(aConfig))
		{
			this.configures(_.map(aConfig, function (aItem) {
				return {
					'value': ko.observable(aItem[0]),
					'Name': aItem[1],
					'Type': aItem[2],
					'Label': aItem[3],
					'Default': aItem[4],
					'Desc': aItem[5]
				};
			}));
		}
	}
};

PopupsPluginViewModel.prototype.tryToClosePopup = function ()
{
	var self = this;
	kn.showScreenPopup(PopupsAskViewModel, [Utils.i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'), function () {
		if (self.modalVisibility())
		{
			Utils.delegateRun(self, 'cancelCommand');
		}
	}]);
};

PopupsPluginViewModel.prototype.onBuild = function ()
{
	key('esc', Enums.KeyState.All, _.bind(function () {
		if (this.modalVisibility())
		{
			this.tryToClosePopup();
			return false;
		}
	}, this));
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsActivateViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsActivate');

	var self = this;

	this.domain = ko.observable('');
	this.key = ko.observable('');
	this.key.focus = ko.observable(false);
	this.activationSuccessed = ko.observable(false);

	this.licenseTrigger = RL.data().licenseTrigger;
	
	this.activateProcess = ko.observable(false);
	this.activateText = ko.observable('');
	this.activateText.isError = ko.observable(false);

	this.key.subscribe(function () {
		this.activateText('');
		this.activateText.isError(false);
	}, this);

	this.activationSuccessed.subscribe(function (bValue) {
		if (bValue)
		{
			this.licenseTrigger(!this.licenseTrigger());
		}
	}, this);

	this.activateCommand = Utils.createCommand(this, function () {

		this.activateProcess(true);
		if (this.validateSubscriptionKey())
		{
			RL.remote().licensingActivate(function (sResult, oData) {

				self.activateProcess(false);
				if (Enums.StorageResultType.Success === sResult && oData.Result)
				{
					if (true === oData.Result)
					{
						self.activationSuccessed(true);
						self.activateText('Subscription Key Activated Successfully');
						self.activateText.isError(false);
					}
					else
					{
						self.activateText(oData.Result);
						self.activateText.isError(true);
						self.key.focus(true);
					}
				}
				else if (oData.ErrorCode)
				{
					self.activateText(Utils.getNotification(oData.ErrorCode));
					self.activateText.isError(true);
					self.key.focus(true);
				}
				else
				{
					self.activateText(Utils.getNotification(Enums.Notification.UnknownError));
					self.activateText.isError(true);
					self.key.focus(true);
				}

			}, this.domain(), this.key());
		}
		else
		{
			this.activateProcess(false);
			this.activateText('Invalid Subscription Key');
			this.activateText.isError(true);
			this.key.focus(true);
		}

	}, function () {
		return !this.activateProcess() && '' !== this.domain() && '' !== this.key() && !this.activationSuccessed();
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsActivateViewModel', PopupsActivateViewModel);

PopupsActivateViewModel.prototype.onShow = function ()
{
	this.domain(RL.settingsGet('AdminDomain'));
	if (!this.activateProcess())
	{
		this.key('');
		this.activateText('');
		this.activateText.isError(false);
		this.activationSuccessed(false);
	}
};

PopupsActivateViewModel.prototype.onFocus = function ()
{
	if (!this.activateProcess())
	{
		this.key.focus(true);
	}
};

/**
 * @returns {boolean}
 */
PopupsActivateViewModel.prototype.validateSubscriptionKey = function ()
{
	var sValue = this.key();
	return '' === sValue || !!/^RL[\d]+-[A-Z0-9\-]+Z$/.test(Utils.trim(sValue));
};
/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsLanguagesViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsLanguages');

	this.exp = ko.observable(false);

	this.languages = ko.computed(function () {
		return _.map(RL.data().languages(), function (sLanguage) {
			return {
				'key': sLanguage,
				'selected': ko.observable(false),
				'fullName': Utils.convertLangName(sLanguage)
			};
		});
	});

	RL.data().mainLanguage.subscribe(function () {
		this.resetMainLanguage();
	}, this);

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsLanguagesViewModel', PopupsLanguagesViewModel);

PopupsLanguagesViewModel.prototype.languageEnName = function (sLanguage)
{
	return Utils.convertLangName(sLanguage, true);
};

PopupsLanguagesViewModel.prototype.resetMainLanguage = function ()
{
	var sCurrent = RL.data().mainLanguage();
	_.each(this.languages(), function (oItem) {
		oItem['selected'](oItem['key'] === sCurrent);
	});
};

PopupsLanguagesViewModel.prototype.onShow = function ()
{
	this.exp(true);

	this.resetMainLanguage();
};

PopupsLanguagesViewModel.prototype.onHide = function ()
{
	this.exp(false);
};

PopupsLanguagesViewModel.prototype.changeLanguage = function (sLang)
{
	RL.data().mainLanguage(sLang);
	this.cancelCommand();
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsAskViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAsk');

	this.askDesc = ko.observable('');
	this.yesButton = ko.observable('');
	this.noButton = ko.observable('');

	this.yesFocus = ko.observable(false);
	this.noFocus = ko.observable(false);

	this.fYesAction = null;
	this.fNoAction = null;

	this.bDisabeCloseOnEsc = true;
	this.sDefaultKeyScope = Enums.KeyState.PopupAsk;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsAskViewModel', PopupsAskViewModel);

PopupsAskViewModel.prototype.clearPopup = function ()
{
	this.askDesc('');
	this.yesButton(Utils.i18n('POPUPS_ASK/BUTTON_YES'));
	this.noButton(Utils.i18n('POPUPS_ASK/BUTTON_NO'));

	this.yesFocus(false);
	this.noFocus(false);

	this.fYesAction = null;
	this.fNoAction = null;
};

PopupsAskViewModel.prototype.yesClick = function ()
{
	this.cancelCommand();

	if (Utils.isFunc(this.fYesAction))
	{
		this.fYesAction.call(null);
	}
};

PopupsAskViewModel.prototype.noClick = function ()
{
	this.cancelCommand();

	if (Utils.isFunc(this.fNoAction))
	{
		this.fNoAction.call(null);
	}
};

/**
 * @param {string} sAskDesc
 * @param {Function=} fYesFunc
 * @param {Function=} fNoFunc
 * @param {string=} sYesButton
 * @param {string=} sNoButton
 */
PopupsAskViewModel.prototype.onShow = function (sAskDesc, fYesFunc, fNoFunc, sYesButton, sNoButton)
{
	this.clearPopup();
	
	this.fYesAction = fYesFunc || null;
	this.fNoAction = fNoFunc || null;

	this.askDesc(sAskDesc || '');
	if (sYesButton)
	{
		this.yesButton(sYesButton);
	}

	if (sYesButton)
	{
		this.yesButton(sNoButton);
	}
};

PopupsAskViewModel.prototype.onFocus = function ()
{
	this.yesFocus(true);
};

PopupsAskViewModel.prototype.onBuild = function ()
{
	key('tab, shift+tab, right, left', Enums.KeyState.PopupAsk, _.bind(function () {
		if (this.yesFocus())
		{
			this.noFocus(true);
		}
		else
		{
			this.yesFocus(true);
		}
		return false;
	}, this));
};


/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function AdminLoginViewModel()
{
	KnoinAbstractViewModel.call(this, 'Center', 'AdminLogin');

	this.login = ko.observable('');
	this.password = ko.observable('');

	this.loginError = ko.observable(false);
	this.passwordError = ko.observable(false);

	this.loginFocus = ko.observable(false);

	this.login.subscribe(function () {
		this.loginError(false);
	}, this);

	this.password.subscribe(function () {
		this.passwordError(false);
	}, this);
	
	this.submitRequest = ko.observable(false);
	this.submitError = ko.observable('');

	this.submitCommand = Utils.createCommand(this, function () {
		
		this.loginError('' === Utils.trim(this.login()));
		this.passwordError('' === Utils.trim(this.password()));

		if (this.loginError() || this.passwordError())
		{
			return false;
		}

		this.submitRequest(true);

		RL.remote().adminLogin(_.bind(function (sResult, oData) {

			if (Enums.StorageResultType.Success === sResult && oData && 'AdminLogin' === oData.Action)
			{
				if (oData.Result)
				{
					RL.loginAndLogoutReload();
				}
				else if (oData.ErrorCode)
				{
					this.submitRequest(false);
					this.submitError(Utils.getNotification(oData.ErrorCode));
				}
			}
			else
			{
				this.submitRequest(false);
				this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
			}

		}, this), this.login(), this.password());

		return true;
		
	}, function () {
		return !this.submitRequest();
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('AdminLoginViewModel', AdminLoginViewModel);

AdminLoginViewModel.prototype.onShow = function ()
{
	kn.routeOff();

	_.delay(_.bind(function () {
		this.loginFocus(true);
	}, this), 100);

};

AdminLoginViewModel.prototype.onHide = function ()
{
	this.loginFocus(false);
};

/**
 * @param {?} oScreen
 *
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function AdminMenuViewModel(oScreen)
{
	KnoinAbstractViewModel.call(this, 'Left', 'AdminMenu');

	this.menu = oScreen.menu;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('AdminMenuViewModel', AdminMenuViewModel);

AdminMenuViewModel.prototype.link = function (sRoute)
{
	return '#/' + sRoute;
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function AdminPaneViewModel()
{
	KnoinAbstractViewModel.call(this, 'Right', 'AdminPane');

	this.adminDomain = ko.observable(RL.settingsGet('AdminDomain'));
	this.version = ko.observable(RL.settingsGet('Version'));

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('AdminPaneViewModel', AdminPaneViewModel);

AdminPaneViewModel.prototype.logoutClick = function ()
{
	RL.remote().adminLogout(function () {
		RL.loginAndLogoutReload();
	});
};
/**
 * @constructor
 */
function AdminGeneral()
{
	var oData = RL.data();
	
	this.mainLanguage = oData.mainLanguage;
	this.mainTheme = oData.mainTheme;

	this.language = oData.language;
	this.theme = oData.theme;

	this.allowThemes = oData.allowThemes;
	this.allowCustomTheme = oData.allowCustomTheme;
	this.allowLanguagesOnSettings = oData.allowLanguagesOnSettings;
	this.allowAdditionalAccounts = oData.allowAdditionalAccounts;
	this.allowIdentities = oData.allowIdentities;
	
	this.themesOptions = ko.computed(function () {
		return _.map(oData.themes(), function (sTheme) {
			return {
				'optValue': sTheme,
				'optText': Utils.convertThemeName(sTheme)
			};
		});
	});

	this.mainLanguageFullName = ko.computed(function () {
		return Utils.convertLangName(this.mainLanguage());
	}, this);
	
	this.weakPassword = !!RL.settingsGet('WeakPassword');
	
	this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.themeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
}

Utils.addSettingsViewModel(AdminGeneral, 'AdminSettingsGeneral', 'General', 'general', true);

AdminGeneral.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var
			f2 = Utils.settingsSaveHelperSimpleFunction(self.languageTrigger, self),
			f3 = Utils.settingsSaveHelperSimpleFunction(self.themeTrigger, self)
		;

		self.language.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f2, {
				'Language': Utils.trim(sValue)
			});
		});

		self.theme.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f3, {
				'Theme': Utils.trim(sValue)
			});
		});
		
		self.allowCustomTheme.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowCustomTheme': bValue ? '1' : '0'
			});
		});
		
		self.allowAdditionalAccounts.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowAdditionalAccounts': bValue ? '1' : '0'
			});
		});

		self.allowIdentities.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowIdentities': bValue ? '1' : '0'
			});
		});

		self.allowThemes.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowThemes': bValue ? '1' : '0'
			});
		});

		self.allowLanguagesOnSettings.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowLanguagesOnSettings': bValue ? '1' : '0'
			});
		});

	}, 50);
};

AdminGeneral.prototype.selectLanguage = function ()
{
	kn.showScreenPopup(PopupsLanguagesViewModel);
};

/**
 * @constructor
 */
function AdminLogin()
{
	var oData = RL.data();
	
	this.allowCustomLogin = oData.allowCustomLogin;
	this.determineUserLanguage = oData.determineUserLanguage;
	
	this.defaultDomain = ko.observable(RL.settingsGet('LoginDefaultDomain'));

	this.allowLanguagesOnLogin = oData.allowLanguagesOnLogin;
	this.defaultDomainTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
}

Utils.addSettingsViewModel(AdminLogin, 'AdminSettingsLogin', 'Login', 'login');

AdminLogin.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var f1 = Utils.settingsSaveHelperSimpleFunction(self.defaultDomainTrigger, self);

		self.determineUserLanguage.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'DetermineUserLanguage': bValue ? '1' : '0'
			});
		});
		
		self.allowCustomLogin.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowCustomLogin': bValue ? '1' : '0'
			});
		});

		self.allowLanguagesOnLogin.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'AllowLanguagesOnLogin': bValue ? '1' : '0'
			});
		});

		self.defaultDomain.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f1, {
				'LoginDefaultDomain': Utils.trim(sValue)
			});
		});

	}, 50);
};

/**
 * @constructor
 */
function AdminBranding()
{
	this.title = ko.observable(RL.settingsGet('Title'));
	this.title.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.loadingDesc = ko.observable(RL.settingsGet('LoadingDescription'));
	this.loadingDesc.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.loginLogo = ko.observable(RL.settingsGet('LoginLogo'));
	this.loginLogo.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.loginDescription = ko.observable(RL.settingsGet('LoginDescription'));
	this.loginDescription.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.loginCss = ko.observable(RL.settingsGet('LoginCss'));
	this.loginCss.trigger = ko.observable(Enums.SaveSettingsStep.Idle);
}

Utils.addSettingsViewModel(AdminBranding, 'AdminSettingsBranding', 'Branding', 'branding');

AdminBranding.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var
			f1 = Utils.settingsSaveHelperSimpleFunction(self.title.trigger, self),
			f2 = Utils.settingsSaveHelperSimpleFunction(self.loadingDesc.trigger, self),
			f3 = Utils.settingsSaveHelperSimpleFunction(self.loginLogo.trigger, self),
			f4 = Utils.settingsSaveHelperSimpleFunction(self.loginDescription.trigger, self),
			f5 = Utils.settingsSaveHelperSimpleFunction(self.loginCss.trigger, self)
		;

		self.title.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f1, {
				'Title': Utils.trim(sValue)
			});
		});

		self.loadingDesc.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f2, {
				'LoadingDescription': Utils.trim(sValue)
			});
		});

		self.loginLogo.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f3, {
				'LoginLogo': Utils.trim(sValue)
			});
		});

		self.loginDescription.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f4, {
				'LoginDescription': Utils.trim(sValue)
			});
		});

		self.loginCss.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f5, {
				'LoginCss': Utils.trim(sValue)
			});
		});

	}, 50);
};

/**
 * @constructor
 */
function AdminContacts()
{
//	var oData = RL.data();

	this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;
	this.enableContacts = ko.observable(!!RL.settingsGet('ContactsEnable'));
	this.contactsSharing = ko.observable(!!RL.settingsGet('ContactsSharing'));
	this.contactsSync = ko.observable(!!RL.settingsGet('ContactsSync'));

	var
		aTypes = ['sqlite', 'mysql', 'pgsql'],
		aSupportedTypes = [],
		getTypeName = function(sName) {
			switch (sName)
			{
				case 'sqlite':
					sName = 'SQLite';
					break;
				case 'mysql':
					sName = 'MySQL';
					break;
				case 'pgsql':
					sName = 'PostgreSQL';
					break;
			}

			return sName;
		}
	;

	if (!!RL.settingsGet('SQLiteIsSupported'))
	{
		aSupportedTypes.push('sqlite');
	}
	if (!!RL.settingsGet('MySqlIsSupported'))
	{
		aSupportedTypes.push('mysql');
	}
	if (!!RL.settingsGet('PostgreSqlIsSupported'))
	{
		aSupportedTypes.push('pgsql');
	}
	
	this.contactsSupported = 0 < aSupportedTypes.length;

	this.contactsTypes = ko.observableArray([]);
	this.contactsTypesOptions = this.contactsTypes.map(function (sValue) {
		var bDisabled = -1 === Utils.inArray(sValue, aSupportedTypes);
		return {
			'id': sValue,
			'name': getTypeName(sValue) + (bDisabled ? ' (not supported)' : ''),
			'disabled': bDisabled
		};
	});

	this.contactsTypes(aTypes);
	this.contactsType = ko.observable('');

	this.mainContactsType = ko.computed({
		'owner': this,
		'read': this.contactsType,
		'write': function (sValue) {
			if (sValue !== this.contactsType())
			{
				if (-1 < Utils.inArray(sValue, aSupportedTypes))
				{
					this.contactsType(sValue);
				}
				else if (0 < aSupportedTypes.length)
				{
					this.contactsType('');
				}
			}
			else
			{
				this.contactsType.valueHasMutated();
			}
		}
	});
	
	this.contactsType.subscribe(function () {
		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');
	}, this);

	this.pdoDsn = ko.observable(RL.settingsGet('ContactsPdoDsn'));
	this.pdoUser = ko.observable(RL.settingsGet('ContactsPdoUser'));
	this.pdoPassword = ko.observable(RL.settingsGet('ContactsPdoPassword'));

	this.pdoDsnTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.pdoUserTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.pdoPasswordTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.contactsTypeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.testing = ko.observable(false);
	this.testContactsSuccess = ko.observable(false);
	this.testContactsError = ko.observable(false);
	this.testContactsErrorMessage = ko.observable('');

	this.testContactsCommand = Utils.createCommand(this, function () {

		this.testContactsSuccess(false);
		this.testContactsError(false);
		this.testContactsErrorMessage('');
		this.testing(true);

		RL.remote().testContacts(this.onTestContactsResponse, {
			'ContactsPdoType': this.contactsType(),
			'ContactsPdoDsn': this.pdoDsn(),
			'ContactsPdoUser': this.pdoUser(),
			'ContactsPdoPassword': this.pdoPassword()
		});

	}, function () {
		return '' !== this.pdoDsn() && '' !== this.pdoUser();
	});

	this.contactsType(RL.settingsGet('ContactsPdoType'));

	this.onTestContactsResponse = _.bind(this.onTestContactsResponse, this);
}

Utils.addSettingsViewModel(AdminContacts, 'AdminSettingsContacts', 'Contacts', 'contacts');

AdminContacts.prototype.onTestContactsResponse = function (sResult, oData)
{
	this.testContactsSuccess(false);
	this.testContactsError(false);
	this.testContactsErrorMessage('');

	if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result.Result)
	{
		this.testContactsSuccess(true);
	}
	else
	{
		this.testContactsError(true);
		if (oData && oData.Result)
		{
			this.testContactsErrorMessage(oData.Result.Message || '');
		}
		else
		{
			this.testContactsErrorMessage('');
		}
	}

	this.testing(false);
};

AdminContacts.prototype.onShow = function ()
{
	this.testContactsSuccess(false);
	this.testContactsError(false);
	this.testContactsErrorMessage('');
};

AdminContacts.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var
			f1 = Utils.settingsSaveHelperSimpleFunction(self.pdoDsnTrigger, self),
			f3 = Utils.settingsSaveHelperSimpleFunction(self.pdoUserTrigger, self),
			f4 = Utils.settingsSaveHelperSimpleFunction(self.pdoPasswordTrigger, self),
			f5 = Utils.settingsSaveHelperSimpleFunction(self.contactsTypeTrigger, self)
		;

		self.enableContacts.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'ContactsEnable': bValue ? '1' : '0'
			});
		});

		self.contactsSharing.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'ContactsSharing': bValue ? '1' : '0'
			});
		});

		self.contactsSync.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(null, {
				'ContactsSync': bValue ? '1' : '0'
			});
		});
		
		self.contactsType.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f5, {
				'ContactsPdoType': sValue
			});
		});
		
		self.pdoDsn.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f1, {
				'ContactsPdoDsn': Utils.trim(sValue)
			});
		});

		self.pdoUser.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f3, {
				'ContactsPdoUser': Utils.trim(sValue)
			});
		});

		self.pdoPassword.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f4, {
				'ContactsPdoPassword': Utils.trim(sValue)
			});
		});

		self.contactsType(RL.settingsGet('ContactsPdoType'));

	}, 50);
};

/**
 * @constructor
 */
function AdminDomains()
{
	var oData = RL.data();
	
	this.domains = oData.domains;
	this.domainsLoading = oData.domainsLoading;
	
	this.iDomainForDeletionTimeout = 0;

	this.visibility = ko.computed(function () {
		return oData.domainsLoading() ? 'visible' : 'hidden';
	}, this);

	this.domainForDeletion = ko.observable(null).extend({'toggleSubscribe': [this,
		function (oPrev) {
			if (oPrev)
			{
				oPrev.deleteAccess(false);
			}
		}, function (oNext) {
			if (oNext)
			{
				oNext.deleteAccess(true);
				this.startDomainForDeletionTimeout();
			}
		}
	]});
}

Utils.addSettingsViewModel(AdminDomains, 'AdminSettingsDomains', 'Domains', 'domains');

AdminDomains.prototype.startDomainForDeletionTimeout = function ()
{
	var self = this;
	window.clearInterval(this.iDomainForDeletionTimeout);
	this.iDomainForDeletionTimeout = window.setTimeout(function () {
		self.domainForDeletion(null);
	}, 1000 * 3);
};

AdminDomains.prototype.createDomain = function ()
{
	kn.showScreenPopup(PopupsDomainViewModel);
};

AdminDomains.prototype.deleteDomain = function (oDomain)
{
	this.domains.remove(oDomain);
	RL.remote().domainDelete(_.bind(this.onDomainListChangeRequest, this), oDomain.name);
};

AdminDomains.prototype.disableDomain = function (oDomain)
{
	oDomain.disabled(!oDomain.disabled());
	RL.remote().domainDisable(_.bind(this.onDomainListChangeRequest, this), oDomain.name, oDomain.disabled());
};

AdminDomains.prototype.onBuild = function (oDom)
{
	var self = this;
	oDom
		.on('click', '.b-admin-domains-list-table .e-item .e-action', function () {
			var oDomainItem = ko.dataFor(this);
			if (oDomainItem)
			{
				RL.remote().domain(_.bind(self.onDomainLoadRequest, self), oDomainItem.name);
			}
		})
	;
	
	RL.reloadDomainList();
};

AdminDomains.prototype.onDomainLoadRequest = function (sResult, oData)
{
	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		kn.showScreenPopup(PopupsDomainViewModel, [oData.Result]);
	}
};

AdminDomains.prototype.onDomainListChangeRequest = function ()
{
	RL.reloadDomainList();
};

/**
 * @constructor
 */
function AdminSecurity()
{
	this.csrfProtection = ko.observable(!!RL.settingsGet('UseTokenProtection'));
	this.openPGP = ko.observable(!!RL.settingsGet('OpenPGP'));
	this.allowTwoFactorAuth = ko.observable(!!RL.settingsGet('AllowTwoFactorAuth'));

	this.adminLogin = ko.observable(RL.settingsGet('AdminLogin'));
	this.adminPassword = ko.observable('');
	this.adminPasswordNew = ko.observable('');

	this.adminPasswordUpdateError = ko.observable(false);
	this.adminPasswordUpdateSuccess = ko.observable(false);

	this.adminPassword.subscribe(function () {
		this.adminPasswordUpdateError(false);
		this.adminPasswordUpdateSuccess(false);
	}, this);

	this.adminPasswordNew.subscribe(function () {
		this.adminPasswordUpdateError(false);
		this.adminPasswordUpdateSuccess(false);
	}, this);
	
	this.saveNewAdminPasswordCommand = Utils.createCommand(this, function () {

		this.adminPasswordUpdateError(false);
		this.adminPasswordUpdateSuccess(false);

		RL.remote().saveNewAdminPassword(this.onNewAdminPasswordResponse, {
			'Password': this.adminPassword(),
			'NewPassword': this.adminPasswordNew()
		});

	}, function () {
		return '' !== this.adminPassword() && '' !== this.adminPasswordNew();
	});

	this.onNewAdminPasswordResponse = _.bind(this.onNewAdminPasswordResponse, this);
}

Utils.addSettingsViewModel(AdminSecurity, 'AdminSettingsSecurity', 'Security', 'security');

AdminSecurity.prototype.onNewAdminPasswordResponse = function (sResult, oData)
{
	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		this.adminPassword('');
		this.adminPasswordNew('');

		this.adminPasswordUpdateSuccess(true);
	}
	else
	{
		this.adminPasswordUpdateError(true);
	}
};

AdminSecurity.prototype.onBuild = function ()
{
	this.csrfProtection.subscribe(function (bValue) {
		RL.remote().saveAdminConfig(Utils.emptyFunction, {
			'TokenProtection': bValue ? '1' : '0'
		});
	});

	this.openPGP.subscribe(function (bValue) {
		RL.remote().saveAdminConfig(Utils.emptyFunction, {
			'OpenPGP': bValue ? '1' : '0'
		});
	});

	this.allowTwoFactorAuth.subscribe(function (bValue) {
		RL.remote().saveAdminConfig(Utils.emptyFunction, {
			'AllowTwoFactorAuth': bValue ? '1' : '0'
		});
	});
};

AdminSecurity.prototype.onHide = function ()
{
	this.adminPassword('');
	this.adminPasswordNew('');
};

/**
 * @return {string}
 */
AdminSecurity.prototype.phpInfoLink = function ()
{
	return RL.link().phpInfo();
};

/**
 * @constructor
 */
function AdminSocial()
{
	var oData = RL.data();
	
	this.googleEnable = oData.googleEnable;
	this.googleClientID = oData.googleClientID;
	this.googleClientSecret = oData.googleClientSecret;
	this.googleTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
	this.googleTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);

	this.facebookEnable = oData.facebookEnable;
	this.facebookAppID = oData.facebookAppID;
	this.facebookAppSecret = oData.facebookAppSecret;
	this.facebookTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
	this.facebookTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);
	
	this.twitterEnable = oData.twitterEnable;
	this.twitterConsumerKey = oData.twitterConsumerKey;
	this.twitterConsumerSecret = oData.twitterConsumerSecret;
	this.twitterTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
	this.twitterTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);

	this.dropboxEnable = oData.dropboxEnable;
	this.dropboxApiKey = oData.dropboxApiKey;
	this.dropboxTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
}

Utils.addSettingsViewModel(AdminSocial, 'AdminSettingsSocial', 'Social', 'social');

AdminSocial.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var
			f1 = Utils.settingsSaveHelperSimpleFunction(self.facebookTrigger1, self),
			f2 = Utils.settingsSaveHelperSimpleFunction(self.facebookTrigger2, self),
			f3 = Utils.settingsSaveHelperSimpleFunction(self.twitterTrigger1, self),
			f4 = Utils.settingsSaveHelperSimpleFunction(self.twitterTrigger2, self),
			f5 = Utils.settingsSaveHelperSimpleFunction(self.googleTrigger1, self),
			f6 = Utils.settingsSaveHelperSimpleFunction(self.googleTrigger2, self),
			f7 = Utils.settingsSaveHelperSimpleFunction(self.dropboxTrigger1, self)
		;

		self.facebookEnable.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(Utils.emptyFunction, {
				'FacebookEnable': bValue ? '1' : '0'
			});
		});

		self.facebookAppID.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f1, {
				'FacebookAppID': Utils.trim(sValue)
			});
		});

		self.facebookAppSecret.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f2, {
				'FacebookAppSecret': Utils.trim(sValue)
			});
		});

		self.twitterEnable.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(Utils.emptyFunction, {
				'TwitterEnable': bValue ? '1' : '0'
			});
		});

		self.twitterConsumerKey.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f3, {
				'TwitterConsumerKey': Utils.trim(sValue)
			});
		});

		self.twitterConsumerSecret.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f4, {
				'TwitterConsumerSecret': Utils.trim(sValue)
			});
		});
		
		self.googleEnable.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(Utils.emptyFunction, {
				'GoogleEnable': bValue ? '1' : '0'
			});
		});

		self.googleClientID.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f5, {
				'GoogleClientID': Utils.trim(sValue)
			});
		});

		self.googleClientSecret.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f6, {
				'GoogleClientSecret': Utils.trim(sValue)
			});
		});
		
		self.dropboxEnable.subscribe(function (bValue) {
			RL.remote().saveAdminConfig(Utils.emptyFunction, {
				'DropboxEnable': bValue ? '1' : '0'
			});
		});

		self.dropboxApiKey.subscribe(function (sValue) {
			RL.remote().saveAdminConfig(f7, {
				'DropboxApiKey': Utils.trim(sValue)
			});
		});

	}, 50);
};

/**
 * @constructor
 */
function AdminPlugins()
{
	var oData = RL.data();
	
	this.enabledPlugins = ko.observable(!!RL.settingsGet('EnabledPlugins'));

	this.pluginsError = ko.observable('');
	
	this.plugins = oData.plugins;
	this.pluginsLoading = oData.pluginsLoading;
	
	this.visibility = ko.computed(function () {
		return oData.pluginsLoading() ? 'visible' : 'hidden';
	}, this);
	
	this.onPluginLoadRequest = _.bind(this.onPluginLoadRequest, this);
	this.onPluginDisableRequest = _.bind(this.onPluginDisableRequest, this);
}

Utils.addSettingsViewModel(AdminPlugins, 'AdminSettingsPlugins', 'Plugins', 'plugins');

AdminPlugins.prototype.disablePlugin = function (oPlugin)
{
	oPlugin.disabled(!oPlugin.disabled());
	RL.remote().pluginDisable(this.onPluginDisableRequest, oPlugin.name, oPlugin.disabled());
};

AdminPlugins.prototype.configurePlugin = function (oPlugin)
{
	RL.remote().plugin(this.onPluginLoadRequest, oPlugin.name);
};

AdminPlugins.prototype.onBuild = function (oDom)
{
	var self = this;
	
	oDom
		.on('click', '.e-item .configure-plugin-action', function () {
			var oPlugin = ko.dataFor(this);
			if (oPlugin)
			{
				self.configurePlugin(oPlugin);
			}
		})
		.on('click', '.e-item .disabled-plugin', function () {
			var oPlugin = ko.dataFor(this);
			if (oPlugin)
			{
				self.disablePlugin(oPlugin);
			}
		})
	;

	this.enabledPlugins.subscribe(function (bValue) {
		RL.remote().saveAdminConfig(Utils.emptyFunction, {
			'EnabledPlugins': bValue ? '1' : '0'
		});
	});
};

AdminPlugins.prototype.onShow = function ()
{
	this.pluginsError('');
	RL.reloadPluginList();
};

AdminPlugins.prototype.onPluginLoadRequest = function (sResult, oData)
{
	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		kn.showScreenPopup(PopupsPluginViewModel, [oData.Result]);
	}
};

AdminPlugins.prototype.onPluginDisableRequest = function (sResult, oData)
{
	if (Enums.StorageResultType.Success === sResult && oData)
	{
		if (!oData.Result && oData.ErrorCode)
		{
			if (Enums.Notification.UnsupportedPluginPackage === oData.ErrorCode && oData.ErrorMessage && '' !== oData.ErrorMessage)
			{
				this.pluginsError(oData.ErrorMessage);
			}
			else
			{
				this.pluginsError(Utils.getNotification(oData.ErrorCode));
			}
		}
	}

	RL.reloadPluginList();
};

/**
 * @constructor
 */
function AdminPackages()
{
	var oData = RL.data();
	
	this.packagesError = ko.observable('');
	
	this.packages = oData.packages;
	this.packagesLoading = oData.packagesLoading;
	this.packagesReal = oData.packagesReal;
	this.packagesMainUpdatable = oData.packagesMainUpdatable;

	this.packagesCurrent = this.packages.filter(function (oItem) {
		return oItem && '' !== oItem['installed'] && !oItem['compare'];
	});

	this.packagesAvailableForUpdate = this.packages.filter(function (oItem) {
		return oItem && '' !== oItem['installed'] && !!oItem['compare'];
	});

	this.packagesAvailableForInstallation = this.packages.filter(function (oItem) {
		return oItem && '' === oItem['installed'];
	});
	
	this.visibility = ko.computed(function () {
		return oData.packagesLoading() ? 'visible' : 'hidden';
	}, this);
}

Utils.addSettingsViewModel(AdminPackages, 'AdminSettingsPackages', 'Packages', 'packages');

AdminPackages.prototype.onShow = function ()
{
	this.packagesError('');
};

AdminPackages.prototype.onBuild = function ()
{
	RL.reloadPackagesList();
};

AdminPackages.prototype.requestHelper = function (oPackage, bInstall)
{
	var self = this;
	return function (sResult, oData) {
		
		if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
		{
			if (oData && oData.ErrorCode)
			{
				self.packagesError(Utils.getNotification(oData.ErrorCode));
			}
			else
			{
				self.packagesError(Utils.getNotification(
					bInstall ? Enums.Notification.CantInstallPackage : Enums.Notification.CantDeletePackage));
			}
		}
		
		_.each(RL.data().packages(), function (oItem) {
			if (oItem && oPackage && oItem['loading']() && oPackage['file'] === oItem['file'])
			{
				oPackage['loading'](false);
				oItem['loading'](false);
			}
		});

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result['Reload'])
		{
			window.location.reload();
		}
		else
		{
			RL.reloadPackagesList();
		}
	};
};

AdminPackages.prototype.deletePackage = function (oPackage)
{
	if (oPackage)
	{
		oPackage['loading'](true);
		RL.remote().packageDelete(this.requestHelper(oPackage, false), oPackage);
	}
};

AdminPackages.prototype.installPackage = function (oPackage)
{
	if (oPackage)
	{
		oPackage['loading'](true);
		RL.remote().packageInstall(this.requestHelper(oPackage, true), oPackage);
	}
};

/**
 * @constructor
 */
function AdminLicensing()
{
	this.licensing = RL.data().licensing;
	this.licensingProcess = RL.data().licensingProcess;
	this.licenseValid = RL.data().licenseValid;
	this.licenseExpired = RL.data().licenseExpired;
	this.licenseError = RL.data().licenseError;
	this.licenseTrigger = RL.data().licenseTrigger;

	this.adminDomain = ko.observable('');
	this.subscriptionEnabled = ko.observable(!!RL.settingsGet('SubscriptionEnabled'));

	this.licenseTrigger.subscribe(function () {
		if (this.subscriptionEnabled())
		{
			RL.reloadLicensing(true);
		}
	}, this);
}

Utils.addSettingsViewModel(AdminLicensing, 'AdminSettingsLicensing', 'Licensing', 'licensing');

AdminLicensing.prototype.onBuild = function ()
{
	if (this.subscriptionEnabled())
	{
		RL.reloadLicensing(false);
	}
};

AdminLicensing.prototype.onShow = function ()
{
	this.adminDomain(RL.settingsGet('AdminDomain'));
};

AdminLicensing.prototype.showActivationForm = function ()
{
	kn.showScreenPopup(PopupsActivateViewModel);
};

/**
 * @returns {string}
 */
AdminLicensing.prototype.licenseExpiredMomentValue = function ()
{
	var oDate = moment.unix(this.licenseExpired());
	return oDate.format('LL') + ' (' + oDate.from(moment()) + ')';
};
/**
 * @constructor
 */
function AbstractData()
{
	this.useKeyboardShortcuts = ko.observable(true);
	
	this.keyScopeReal = ko.observable(Enums.KeyState.All);
	this.keyScopeFake = ko.observable(Enums.KeyState.All);
	
	this.keyScope = ko.computed({
		'owner': this,
		'read': function () {
			return this.keyScopeFake();
		},
		'write': function (sValue) {

			if (Enums.KeyState.Menu !== sValue)
			{
				if (Enums.KeyState.Compose === sValue)
				{
					Utils.disableKeyFilter();
				}
				else
				{
					Utils.restoreKeyFilter();
				}

				this.keyScopeFake(sValue);
				if (Globals.dropdownVisibility())
				{
					sValue = Enums.KeyState.Menu;
				}
			}
			
			this.keyScopeReal(sValue);
		}
	});
	
	this.keyScopeReal.subscribe(function (sValue) {
//		window.console.log(sValue);
		key.setScope(sValue);
	});

	Globals.dropdownVisibility.subscribe(function (bValue) {
		if (bValue)
		{
			this.keyScope(Enums.KeyState.Menu);
		}
		else if (Enums.KeyState.Menu === key.getScope())
		{
			this.keyScope(this.keyScopeFake());
		}
	}, this);

	Utils.initDataConstructorBySettings(this);
}

AbstractData.prototype.populateDataOnStart = function()
{
	var
		mLayout = Utils.pInt(RL.settingsGet('Layout')),
		aLanguages = RL.settingsGet('Languages'),
		aThemes = RL.settingsGet('Themes')
	;

	if (Utils.isArray(aLanguages))
	{
		this.languages(aLanguages);
	}

	if (Utils.isArray(aThemes))
	{
		this.themes(aThemes);
	}

	this.mainLanguage(RL.settingsGet('Language'));
	this.mainTheme(RL.settingsGet('Theme'));

	this.allowCustomTheme(!!RL.settingsGet('AllowCustomTheme'));
	this.allowAdditionalAccounts(!!RL.settingsGet('AllowAdditionalAccounts'));
	this.allowIdentities(!!RL.settingsGet('AllowIdentities'));
	this.determineUserLanguage(!!RL.settingsGet('DetermineUserLanguage'));
	
	this.allowThemes(!!RL.settingsGet('AllowThemes'));
	this.allowCustomLogin(!!RL.settingsGet('AllowCustomLogin'));
	this.allowLanguagesOnLogin(!!RL.settingsGet('AllowLanguagesOnLogin'));
	this.allowLanguagesOnSettings(!!RL.settingsGet('AllowLanguagesOnSettings'));

	this.editorDefaultType(RL.settingsGet('EditorDefaultType'));
	this.showImages(!!RL.settingsGet('ShowImages'));
	this.contactsAutosave(!!RL.settingsGet('ContactsAutosave'));
	this.interfaceAnimation(RL.settingsGet('InterfaceAnimation'));

	this.mainMessagesPerPage(RL.settingsGet('MPP'));

	this.desktopNotifications(!!RL.settingsGet('DesktopNotifications'));
	this.useThreads(!!RL.settingsGet('UseThreads'));
	this.replySameFolder(!!RL.settingsGet('ReplySameFolder'));
	this.useCheckboxesInList(!!RL.settingsGet('UseCheckboxesInList'));
	
	this.layout(Enums.Layout.SidePreview);
	if (-1 < Utils.inArray(mLayout, [Enums.Layout.NoPreview, Enums.Layout.SidePreview, Enums.Layout.BottomPreview]))
	{
		this.layout(mLayout);
	}

	this.facebookEnable(!!RL.settingsGet('AllowFacebookSocial'));
	this.facebookAppID(RL.settingsGet('FacebookAppID'));
	this.facebookAppSecret(RL.settingsGet('FacebookAppSecret'));

	this.twitterEnable(!!RL.settingsGet('AllowTwitterSocial'));
	this.twitterConsumerKey(RL.settingsGet('TwitterConsumerKey'));
	this.twitterConsumerSecret(RL.settingsGet('TwitterConsumerSecret'));

	this.googleEnable(!!RL.settingsGet('AllowGoogleSocial'));
	this.googleClientID(RL.settingsGet('GoogleClientID'));
	this.googleClientSecret(RL.settingsGet('GoogleClientSecret'));

	this.dropboxEnable(!!RL.settingsGet('AllowDropboxSocial'));
	this.dropboxApiKey(RL.settingsGet('DropboxApiKey'));

	this.contactsIsAllowed(!!RL.settingsGet('ContactsIsAllowed'));
};

/**
 * @constructor
 * @extends AbstractData
 */
function AdminDataStorage()
{
	AbstractData.call(this);
	
	this.domainsLoading = ko.observable(false).extend({'throttle': 100});
	this.domains = ko.observableArray([]);
	
	this.pluginsLoading = ko.observable(false).extend({'throttle': 100});
	this.plugins = ko.observableArray([]);
	
	this.packagesReal = ko.observable(true);
	this.packagesMainUpdatable = ko.observable(true);
	this.packagesLoading = ko.observable(false).extend({'throttle': 100});
	this.packages = ko.observableArray([]);
	
	this.licensing = ko.observable(false);
	this.licensingProcess = ko.observable(false);
	this.licenseValid = ko.observable(false);
	this.licenseExpired = ko.observable(0);
	this.licenseError = ko.observable('');
	
	this.licenseTrigger = ko.observable(false);
}

_.extend(AdminDataStorage.prototype, AbstractData.prototype);

AdminDataStorage.prototype.populateDataOnStart = function()
{
	AbstractData.prototype.populateDataOnStart.call(this);
};
/**
 * @constructor
 */
function AbstractAjaxRemoteStorage()
{
	this.oRequests = {};
}

AbstractAjaxRemoteStorage.prototype.oRequests = {};

/**
 * @param {?Function} fCallback
 * @param {string} sRequestAction
 * @param {string} sType
 * @param {?AjaxJsonDefaultResponse} oData
 * @param {boolean} bCached
 * @param {*=} oRequestParameters
 */
AbstractAjaxRemoteStorage.prototype.defaultResponse = function (fCallback, sRequestAction, sType, oData, bCached, oRequestParameters)
{
	var
		fCall = function () {
			if (Enums.StorageResultType.Success !== sType && Globals.bUnload)
			{
				sType = Enums.StorageResultType.Unload;
			}

			if (Enums.StorageResultType.Success === sType && oData && !oData.Result)
			{
				if (oData && -1 < Utils.inArray(oData.ErrorCode, [
					Enums.Notification.AuthError, Enums.Notification.AccessError,
					Enums.Notification.ConnectionError, Enums.Notification.DomainNotAllowed, Enums.Notification.AccountNotAllowed,
					Enums.Notification.MailServerError,	Enums.Notification.UnknownNotification, Enums.Notification.UnknownError
				]))
				{
					Globals.iAjaxErrorCount++;
				}
				
				if (oData && Enums.Notification.InvalidToken === oData.ErrorCode)
				{
					Globals.iTokenErrorCount++;
				}

				if (Consts.Values.TokenErrorLimit < Globals.iTokenErrorCount)
				{
					RL.loginAndLogoutReload(true);
				}

				if (oData.Logout || Consts.Values.AjaxErrorLimit < Globals.iAjaxErrorCount)
				{
					if (window.__rlah_clear)
					{
						window.__rlah_clear();
					}

					RL.loginAndLogoutReload(true);
				}
			}
			else if (Enums.StorageResultType.Success === sType && oData && oData.Result)
			{
				Globals.iAjaxErrorCount = 0;
				Globals.iTokenErrorCount = 0;
			}
			
			if (fCallback)
			{
				Plugins.runHook('ajax-default-response', [sRequestAction, Enums.StorageResultType.Success === sType ? oData : null, sType, bCached, oRequestParameters]);

				fCallback(
					sType,
					Enums.StorageResultType.Success === sType ? oData : null,
					bCached,
					sRequestAction,
					oRequestParameters
				);
			}
		}
	;

	switch (sType)
	{
		case 'success':
			sType = Enums.StorageResultType.Success;
			break;
		case 'abort':
			sType = Enums.StorageResultType.Abort;
			break;
		default:
			sType = Enums.StorageResultType.Error;
			break;
	}

	if (Enums.StorageResultType.Error === sType)
	{
		_.delay(fCall, 300);
	}
	else
	{
		fCall();
	}
};

/**
 * @param {?Function} fResultCallback
 * @param {Object} oParameters
 * @param {?number=} iTimeOut = 20000
 * @param {string=} sGetAdd = ''
 * @param {Array=} aAbortActions = []
 * @return {jQuery.jqXHR}
 */
AbstractAjaxRemoteStorage.prototype.ajaxRequest = function (fResultCallback, oParameters, iTimeOut, sGetAdd, aAbortActions)
{
	var
		self = this,
		bPost = '' === sGetAdd,
		oHeaders = {},
		iStart = (new window.Date()).getTime(),
		oDefAjax = null,
		sAction = ''
	;

	oParameters = oParameters || {};
	iTimeOut = Utils.isNormal(iTimeOut) ? iTimeOut : 20000;
	sGetAdd = Utils.isUnd(sGetAdd) ? '' : Utils.pString(sGetAdd);
	aAbortActions = Utils.isArray(aAbortActions) ? aAbortActions : [];

	sAction = oParameters.Action || '';

	if (sAction && 0 < aAbortActions.length)
	{
		_.each(aAbortActions, function (sActionToAbort) {
			if (self.oRequests[sActionToAbort])
			{
				self.oRequests[sActionToAbort].__aborted = true;
				if (self.oRequests[sActionToAbort].abort)
				{
					self.oRequests[sActionToAbort].abort();
				}
				self.oRequests[sActionToAbort] = null;
			}
		});
	}

	if (bPost)
	{
		oParameters['XToken'] = RL.settingsGet('Token');
	}

	oDefAjax = $.ajax({
		'type': bPost ? 'POST' : 'GET',
		'url': RL.link().ajax(sGetAdd) ,
		'async': true,
		'dataType': 'json',
		'data': bPost ? oParameters : {},
		'headers': oHeaders,
		'timeout': iTimeOut,
		'global': true
	});

	oDefAjax.always(function (oData, sType) {

		var bCached = false;
		if (oData && oData['Time'])
		{
			bCached = Utils.pInt(oData['Time']) > (new window.Date()).getTime() - iStart;
		}

		if (sAction && self.oRequests[sAction])
		{
			if (self.oRequests[sAction].__aborted)
			{
				sType = 'abort';
			}

			self.oRequests[sAction] = null;
		}

		self.defaultResponse(fResultCallback, sAction, sType, oData, bCached, oParameters);
	});

	if (sAction && 0 < aAbortActions.length && -1 < Utils.inArray(sAction, aAbortActions))
	{
		if (this.oRequests[sAction])
		{
			this.oRequests[sAction].__aborted = true;
			if (this.oRequests[sAction].abort)
			{
				this.oRequests[sAction].abort();
			}
			this.oRequests[sAction] = null;
		}

		this.oRequests[sAction] = oDefAjax;
	}

	return oDefAjax;
};

/**
 * @param {?Function} fCallback
 * @param {string} sAction
 * @param {Object=} oParameters
 * @param {?number=} iTimeout
 * @param {string=} sGetAdd = ''
 * @param {Array=} aAbortActions = []
 */
AbstractAjaxRemoteStorage.prototype.defaultRequest = function (fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions)
{
	oParameters = oParameters || {};
	oParameters.Action = sAction;

	sGetAdd = Utils.pString(sGetAdd);

	Plugins.runHook('ajax-default-request', [sAction, oParameters, sGetAdd]);

	this.ajaxRequest(fCallback, oParameters,
		Utils.isUnd(iTimeout) ? Consts.Defaults.DefaultAjaxTimeout : Utils.pInt(iTimeout), sGetAdd, aAbortActions);
};

/**
 * @param {?Function} fCallback
 */
AbstractAjaxRemoteStorage.prototype.noop = function (fCallback)
{
	this.defaultRequest(fCallback, 'Noop');
};

/**
 * @param {?Function} fCallback
 * @param {string} sMessage
 * @param {string} sFileName
 * @param {number} iLineNo
 * @param {string} sLocation
 * @param {string} sHtmlCapa
 * @param {number} iTime
 */
AbstractAjaxRemoteStorage.prototype.jsError = function (fCallback, sMessage, sFileName, iLineNo, sLocation, sHtmlCapa, iTime)
{
	this.defaultRequest(fCallback, 'JsError', {
		'Message': sMessage,
		'FileName': sFileName,
		'LineNo': iLineNo,
		'Location': sLocation,
		'HtmlCapa': sHtmlCapa,
		'TimeOnPage': iTime
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sType
 * @param {Array=} mData = null
 * @param {boolean=} bIsError = false
 */
AbstractAjaxRemoteStorage.prototype.jsInfo = function (fCallback, sType, mData, bIsError)
{
	this.defaultRequest(fCallback, 'JsInfo', {
		'Type': sType,
		'Data': mData,
		'IsError': (Utils.isUnd(bIsError) ? false : !!bIsError) ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sVersion
 */
AbstractAjaxRemoteStorage.prototype.jsVersion = function (fCallback, sVersion)
{
	this.defaultRequest(fCallback, 'Version', {
		'Version': sVersion
	});
};

/**
 * @constructor
 * @extends AbstractAjaxRemoteStorage
 */
function AdminAjaxRemoteStorage()
{
	AbstractAjaxRemoteStorage.call(this);
	
	this.oRequests = {};
}

_.extend(AdminAjaxRemoteStorage.prototype, AbstractAjaxRemoteStorage.prototype);

/**
 * @param {?Function} fCallback
 * @param {string} sLogin
 * @param {string} sPassword
 */
AdminAjaxRemoteStorage.prototype.adminLogin = function (fCallback, sLogin, sPassword)
{
	this.defaultRequest(fCallback, 'AdminLogin', {
		'Login': sLogin,
		'Password': sPassword
	});
};

/**
 * @param {?Function} fCallback
 */
AdminAjaxRemoteStorage.prototype.adminLogout = function (fCallback)
{
	this.defaultRequest(fCallback, 'AdminLogout');
};

/**
 * @param {?Function} fCallback
 * @param {?} oData
 */
AdminAjaxRemoteStorage.prototype.saveAdminConfig = function (fCallback, oData)
{
	this.defaultRequest(fCallback, 'AdminSettingsUpdate', oData);
};

/**
 * @param {?Function} fCallback
 */
AdminAjaxRemoteStorage.prototype.domainList = function (fCallback)
{
	this.defaultRequest(fCallback, 'AdminDomainList');
};

/**
 * @param {?Function} fCallback
 */
AdminAjaxRemoteStorage.prototype.pluginList = function (fCallback)
{
	this.defaultRequest(fCallback, 'AdminPluginList');
};

/**
 * @param {?Function} fCallback
 */
AdminAjaxRemoteStorage.prototype.packagesList = function (fCallback)
{
	this.defaultRequest(fCallback, 'AdminPackagesList');
};

/**
 * @param {?Function} fCallback
 * @param {Object} oPackage
 */
AdminAjaxRemoteStorage.prototype.packageInstall = function (fCallback, oPackage)
{
	this.defaultRequest(fCallback, 'AdminPackageInstall', {
		'Id': oPackage.id,
		'Type': oPackage.type,
		'File': oPackage.file
	}, 60000);
};

/**
 * @param {?Function} fCallback
 * @param {Object} oPackage
 */
AdminAjaxRemoteStorage.prototype.packageDelete = function (fCallback, oPackage)
{
	this.defaultRequest(fCallback, 'AdminPackageDelete', {
		'Id': oPackage.id
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sName
 */
AdminAjaxRemoteStorage.prototype.domain = function (fCallback, sName)
{
	this.defaultRequest(fCallback, 'AdminDomainLoad', {
		'Name': sName
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sName
 */
AdminAjaxRemoteStorage.prototype.plugin = function (fCallback, sName)
{
	this.defaultRequest(fCallback, 'AdminPluginLoad', {
		'Name': sName
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sName
 */
AdminAjaxRemoteStorage.prototype.domainDelete = function (fCallback, sName)
{
	this.defaultRequest(fCallback, 'AdminDomainDelete', {
		'Name': sName
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sName
 * @param {boolean} bDisabled
 */
AdminAjaxRemoteStorage.prototype.domainDisable = function (fCallback, sName, bDisabled)
{
	return this.defaultRequest(fCallback, 'AdminDomainDisable', {
		'Name': sName,
		'Disabled': !!bDisabled ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {Object} oConfig
 */
AdminAjaxRemoteStorage.prototype.pluginSettingsUpdate = function (fCallback, oConfig)
{
	return this.defaultRequest(fCallback, 'AdminPluginSettingsUpdate', oConfig);
};

/**
 * @param {?Function} fCallback
 * @param {boolean} bForce
 */
AdminAjaxRemoteStorage.prototype.licensing = function (fCallback, bForce)
{
	return this.defaultRequest(fCallback, 'AdminLicensing', {
		'Force' : bForce ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sDomain
 * @param {string} sKey
 */
AdminAjaxRemoteStorage.prototype.licensingActivate = function (fCallback, sDomain, sKey)
{
	return this.defaultRequest(fCallback, 'AdminLicensingActivate', {
		'Domain' : sDomain,
		'Key' : sKey
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sName
 * @param {boolean} bDisabled
 */
AdminAjaxRemoteStorage.prototype.pluginDisable = function (fCallback, sName, bDisabled)
{
	return this.defaultRequest(fCallback, 'AdminPluginDisable', {
		'Name': sName,
		'Disabled': !!bDisabled ? '1' : '0'
	});
};

AdminAjaxRemoteStorage.prototype.createOrUpdateDomain = function (fCallback,
	bCreate, sName, sIncHost, iIncPort, sIncSecure, bIncShortLogin,
	sOutHost, iOutPort, sOutSecure, bOutShortLogin, bOutAuth, sWhiteList)
{
	this.defaultRequest(fCallback, 'AdminDomainSave', {
		'Create': bCreate ? '1' : '0',
		'Name': sName,
		'IncHost': sIncHost,
		'IncPort': iIncPort,
		'IncSecure': sIncSecure,
		'IncShortLogin': bIncShortLogin ? '1' : '0',
		'OutHost': sOutHost,
		'OutPort': iOutPort,
		'OutSecure': sOutSecure,
		'OutShortLogin': bOutShortLogin ? '1' : '0',
		'OutAuth': bOutAuth ? '1' : '0',
		'WhiteList': sWhiteList
	});
};

AdminAjaxRemoteStorage.prototype.testConnectionForDomain = function (fCallback,
	sIncHost, iIncPort, sIncSecure,
	sOutHost, iOutPort, sOutSecure, bOutAuth)
{
	this.defaultRequest(fCallback, 'AdminDomainTest', {
		'IncHost': sIncHost,
		'IncPort': iIncPort,
		'IncSecure': sIncSecure,
		'OutHost': sOutHost,
		'OutPort': iOutPort,
		'OutSecure': sOutSecure,
		'OutAuth': bOutAuth ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {?} oData
 */
AdminAjaxRemoteStorage.prototype.testContacts = function (fCallback, oData)
{
	this.defaultRequest(fCallback, 'AdminContactsTest', oData);
};

/**
 * @param {?Function} fCallback
 * @param {?} oData
 */
AdminAjaxRemoteStorage.prototype.saveNewAdminPassword = function (fCallback, oData)
{
	this.defaultRequest(fCallback, 'AdminPasswordUpdate', oData);
};

/**
 * @param {?Function} fCallback
 */
AdminAjaxRemoteStorage.prototype.adminPing = function (fCallback)
{
	this.defaultRequest(fCallback, 'AdminPing');
};

/**
 * @constructor
 */
function AbstractCacheStorage()
{
	this.oEmailsPicsHashes = {};
	this.oServices = {};
}
/**
 * @type {Object}
 */
AbstractCacheStorage.prototype.oEmailsPicsHashes = {};

/**
 * @type {Object}
 */
AbstractCacheStorage.prototype.oServices = {};

AbstractCacheStorage.prototype.clear = function ()
{
	this.oServices = {};
	this.oEmailsPicsHashes = {};
};

/**
 * @param {string} sEmail
 * @return {string}
 */
AbstractCacheStorage.prototype.getUserPic = function (sEmail)
{
	var
		sUrl = '',
		sService = '',
		sEmailLower = sEmail.toLowerCase(),
		sPicHash = Utils.isUnd(this.oEmailsPicsHashes[sEmail]) ? '' : this.oEmailsPicsHashes[sEmail]
	;
	
	if ('' === sPicHash)
	{
		sService = sEmailLower.substr(sEmail.indexOf('@') + 1);
		sUrl = '' !== sService && this.oServices[sService] ? this.oServices[sService] : '';
	}
	else
	{
		sUrl = RL.link().getUserPicUrlFromHash(sPicHash);
	}
	
	return sUrl;
};

/**
 * @param {Object} oData
 */
AbstractCacheStorage.prototype.setServicesData = function (oData)
{
	this.oServices = oData;
};

/**
 * @param {Object} oData
 */
AbstractCacheStorage.prototype.setEmailsPicsHashesData = function (oData)
{
	this.oEmailsPicsHashes = oData;
};

/**
 * @constructor
 * @extends AbstractCacheStorage
 */
function AdminCacheStorage()
{
	AbstractCacheStorage.call(this);
}

_.extend(AdminCacheStorage.prototype, AbstractCacheStorage.prototype);

/**
 * @param {Array} aViewModels
 * @constructor
 * @extends KnoinAbstractScreen
 */
function AbstractSettings(aViewModels)
{
	KnoinAbstractScreen.call(this, 'settings', aViewModels);
	
	this.menu = ko.observableArray([]);

	this.oCurrentSubScreen = null;
	this.oViewModelPlace = null;
}

_.extend(AbstractSettings.prototype, KnoinAbstractScreen.prototype);

AbstractSettings.prototype.onRoute = function (sSubName)
{
	var
		self = this,
		oSettingsScreen = null,
		RoutedSettingsViewModel = null,
		oViewModelPlace = null,
		oViewModelDom = null
	;

	RoutedSettingsViewModel = _.find(ViewModels['settings'], function (SettingsViewModel) {
		return SettingsViewModel && SettingsViewModel.__rlSettingsData &&
			sSubName === SettingsViewModel.__rlSettingsData.Route;
	});

	if (RoutedSettingsViewModel)
	{
		if (_.find(ViewModels['settings-removed'], function (DisabledSettingsViewModel) {
			return DisabledSettingsViewModel && DisabledSettingsViewModel === RoutedSettingsViewModel;
		}))
		{
			RoutedSettingsViewModel = null;
		}
		
		if (RoutedSettingsViewModel && _.find(ViewModels['settings-disabled'], function (DisabledSettingsViewModel) {
			return DisabledSettingsViewModel && DisabledSettingsViewModel === RoutedSettingsViewModel;
		}))
		{
			RoutedSettingsViewModel = null;
		}
	}

	if (RoutedSettingsViewModel)
	{
		if (RoutedSettingsViewModel.__builded && RoutedSettingsViewModel.__vm)
		{
			oSettingsScreen = RoutedSettingsViewModel.__vm;
		}
		else
		{
			oViewModelPlace = this.oViewModelPlace;
			if (oViewModelPlace && 1 === oViewModelPlace.length)
			{
				RoutedSettingsViewModel = /** @type {?Function} */ RoutedSettingsViewModel;
				oSettingsScreen = new RoutedSettingsViewModel();

				oViewModelDom = $('<div></div>').addClass('rl-settings-view-model').hide().attr('data-bind',
					'template: {name: "' + RoutedSettingsViewModel.__rlSettingsData.Template + '"}, i18nInit: true');

				oViewModelDom.appendTo(oViewModelPlace);
				
				oSettingsScreen.data = RL.data();
				oSettingsScreen.viewModelDom = oViewModelDom;
				
				oSettingsScreen.__rlSettingsData = RoutedSettingsViewModel.__rlSettingsData;
				
				RoutedSettingsViewModel.__dom = oViewModelDom;
				RoutedSettingsViewModel.__builded = true;
				RoutedSettingsViewModel.__vm = oSettingsScreen;
				
				ko.applyBindings(oSettingsScreen, oViewModelDom[0]);
				Utils.delegateRun(oSettingsScreen, 'onBuild', [oViewModelDom]);
			}
			else
			{
				Utils.log('Cannot find sub settings view model position: SettingsSubScreen');
			}
		}
		
		if (oSettingsScreen)
		{
			_.defer(function () {
				// hide
				if (self.oCurrentSubScreen)
				{
					Utils.delegateRun(self.oCurrentSubScreen, 'onHide');
					self.oCurrentSubScreen.viewModelDom.hide();
				}
				// --

				self.oCurrentSubScreen = oSettingsScreen;

				// show
				if (self.oCurrentSubScreen)
				{
					self.oCurrentSubScreen.viewModelDom.show();
					Utils.delegateRun(self.oCurrentSubScreen, 'onShow');
					Utils.delegateRun(self.oCurrentSubScreen, 'onFocus', [], 200);

					_.each(self.menu(), function (oItem) {
						oItem.selected(oSettingsScreen && oSettingsScreen.__rlSettingsData && oItem.route === oSettingsScreen.__rlSettingsData.Route);
					});

					$('#rl-content .b-settings .b-content .content').scrollTop(0);
				}
				// --

				Utils.windowResize();
			});
		}
	}
	else
	{
		kn.setHash(RL.link().settings(), false, true);
	}
};

AbstractSettings.prototype.onHide = function ()
{
	if (this.oCurrentSubScreen && this.oCurrentSubScreen.viewModelDom)
	{
		Utils.delegateRun(this.oCurrentSubScreen, 'onHide');
		this.oCurrentSubScreen.viewModelDom.hide();
	}
};

AbstractSettings.prototype.onBuild = function ()
{
	_.each(ViewModels['settings'], function (SettingsViewModel) {
		if (SettingsViewModel && SettingsViewModel.__rlSettingsData &&
			!_.find(ViewModels['settings-removed'], function (RemoveSettingsViewModel) {
				return RemoveSettingsViewModel && RemoveSettingsViewModel === SettingsViewModel;
			}))
		{
			this.menu.push({
				'route': SettingsViewModel.__rlSettingsData.Route,
				'label': SettingsViewModel.__rlSettingsData.Label,
				'selected': ko.observable(false),
				'disabled': !!_.find(ViewModels['settings-disabled'], function (DisabledSettingsViewModel) {
					return DisabledSettingsViewModel && DisabledSettingsViewModel === SettingsViewModel;
				})
			});
		}
	}, this);

	this.oViewModelPlace = $('#rl-content #rl-settings-subscreen');
};

AbstractSettings.prototype.routes = function ()
{
	var
		DefaultViewModel = _.find(ViewModels['settings'], function (SettingsViewModel) {
			return SettingsViewModel && SettingsViewModel.__rlSettingsData && SettingsViewModel.__rlSettingsData['IsDefault'];
		}),
		sDefaultRoute = DefaultViewModel ? DefaultViewModel.__rlSettingsData['Route'] : 'general',
		oRules = {
			'subname': /^(.*)$/,
			'normalize_': function (oRequest, oVals) {
				oVals.subname = Utils.isUnd(oVals.subname) ? sDefaultRoute : Utils.pString(oVals.subname);
				return [oVals.subname];
			}
		}
	;

	return [
		['{subname}/', oRules],
		['{subname}', oRules],
		['', oRules]
	];
};

/**
 * @constructor
 * @extends KnoinAbstractScreen
 */
function AdminLoginScreen()
{
	KnoinAbstractScreen.call(this, 'login', [AdminLoginViewModel]);
}

_.extend(AdminLoginScreen.prototype, KnoinAbstractScreen.prototype);

AdminLoginScreen.prototype.onShow = function ()
{
	RL.setTitle('');
};
/**
 * @constructor
 * @extends AbstractSettings
 */
function AdminSettingsScreen()
{
	AbstractSettings.call(this, [
		AdminMenuViewModel,
		AdminPaneViewModel
	]);
}

_.extend(AdminSettingsScreen.prototype, AbstractSettings.prototype);

AdminSettingsScreen.prototype.onShow = function ()
{
//	AbstractSettings.prototype.onShow.call(this);
	
	RL.setTitle('');
};
/**
 * @constructor
 * @extends KnoinAbstractBoot
 */
function AbstractApp()
{
	KnoinAbstractBoot.call(this);
	
	this.oSettings = null;
	this.oPlugins = null;
	this.oLocal = null;
	this.oLink = null;
	this.oSubs = {};
	
	this.isLocalAutocomplete = true;

	this.popupVisibilityNames = ko.observableArray([]);

	this.popupVisibility = ko.computed(function () {
		return 0 < this.popupVisibilityNames().length;
	}, this);

	this.iframe = $('<iframe style="display:none" src="javascript:;" />').appendTo('body');

	$window.on('error', function (oEvent) {
		if (RL && oEvent && oEvent.originalEvent && oEvent.originalEvent.message &&
			-1 === Utils.inArray(oEvent.originalEvent.message, [
				'Script error.', 'Uncaught Error: Error calling method on NPObject.'
			]))
		{
			RL.remote().jsError(
				Utils.emptyFunction,
				oEvent.originalEvent.message,
				oEvent.originalEvent.filename,
				oEvent.originalEvent.lineno,
				location && location.toString ? location.toString() : '',
				$html.attr('class'),
				Utils.microtime() - Globals.now
			);
		}
	});
}

_.extend(AbstractApp.prototype, KnoinAbstractBoot.prototype);

AbstractApp.prototype.oSettings = null;
AbstractApp.prototype.oPlugins = null;
AbstractApp.prototype.oLocal = null;
AbstractApp.prototype.oLink = null;
AbstractApp.prototype.oSubs = {};

/**
 * @param {string} sLink
 * @return {boolean}
 */
AbstractApp.prototype.download = function (sLink)
{
	var 
		oLink = null,
		oE = null,
		sUserAgent = navigator.userAgent.toLowerCase()
	;
	
	if (sUserAgent && (sUserAgent.indexOf('chrome') > -1 || sUserAgent.indexOf('chrome') > -1))
	{
		oLink = document.createElement('a');
		oLink['href'] = sLink;

		if (document['createEvent'])
		{
			oE = document['createEvent']('MouseEvents');
			if (oE && oE['initEvent'] && oLink['dispatchEvent'])
			{
				oE['initEvent']('click', true, true);
				oLink['dispatchEvent'](oE);
				return true;
			}
		}
	}

	if (Globals.bMobileDevice)
	{
		window.open(sLink, '_self');
		window.focus();
	}
	else
	{
		this.iframe.attr('src', sLink);
//		window.document.location.href = sLink;
	}
	
	return true;
};

/**
 * @return {LinkBuilder}
 */
AbstractApp.prototype.link = function ()
{
	if (null === this.oLink)
	{
		this.oLink = new LinkBuilder();
	}

	return this.oLink;
};

/**
 * @return {LocalStorage}
 */
AbstractApp.prototype.local = function ()
{
	if (null === this.oLocal)
	{
		this.oLocal = new LocalStorage();
	}

	return this.oLocal;
};

/**
 * @param {string} sName
 * @return {?}
 */
AbstractApp.prototype.settingsGet = function (sName)
{
	if (null === this.oSettings)
	{
		this.oSettings = Utils.isNormal(AppData) ? AppData : {};
	}

	return Utils.isUnd(this.oSettings[sName]) ? null : this.oSettings[sName];
};

/**
 * @param {string} sName
 * @param {?} mValue
 */
AbstractApp.prototype.settingsSet = function (sName, mValue)
{
	if (null === this.oSettings)
	{
		this.oSettings = Utils.isNormal(AppData) ? AppData : {};
	}

	this.oSettings[sName] = mValue;
};

AbstractApp.prototype.setTitle = function (sTitle)
{
	sTitle = ((Utils.isNormal(sTitle) && 0 < sTitle.length) ? sTitle + ' - ' : '') +
		RL.settingsGet('Title') || '';

	window.document.title = '_';
	window.document.title = sTitle;
};

/**
 * @param {boolean=} bLogout = false
 * @param {boolean=} bClose = false
 */
AbstractApp.prototype.loginAndLogoutReload = function (bLogout, bClose)
{
	var
		sCustomLogoutLink = Utils.pString(RL.settingsGet('CustomLogoutLink')),
		bInIframe = !!RL.settingsGet('InIframe')
	;

	bLogout = Utils.isUnd(bLogout) ? false : !!bLogout;
	bClose = Utils.isUnd(bClose) ? false : !!bClose;
	
	if (bLogout && bClose && window.close)
	{
		window.close();
	}
	
	if (bLogout && '' !== sCustomLogoutLink && window.location.href !== sCustomLogoutLink)
	{
		_.delay(function () {
			if (bInIframe && window.parent)
			{
				window.parent.location.href = sCustomLogoutLink;
			}
			else
			{
				window.location.href = sCustomLogoutLink;
			}
		}, 100);
	}
	else
	{
		kn.routeOff();
		kn.setHash(RL.link().root(), true);
		kn.routeOff();

		_.delay(function () {
			if (bInIframe && window.parent)
			{
				window.parent.location.reload();
			}
			else
			{
				window.location.reload();
			}
		}, 100);
	}
};

AbstractApp.prototype.historyBack = function ()
{
	window.history.back();
};

/**
 * @param {string} sQuery
 * @param {Function} fCallback
 */
AbstractApp.prototype.getAutocomplete = function (sQuery, fCallback)
{
	fCallback([], sQuery);
};

/**
 * @param {string} sName
 * @param {Function} fFunc
 * @param {Object=} oContext
 * @return {AbstractApp}
 */
AbstractApp.prototype.sub = function (sName, fFunc, oContext)
{
	if (Utils.isUnd(this.oSubs[sName]))
	{
		this.oSubs[sName] = [];
	}

	this.oSubs[sName].push([fFunc, oContext]);

	return this;
};

/**
 * @param {string} sName
 * @param {Array=} aArgs
 * @return {AbstractApp}
 */
AbstractApp.prototype.pub = function (sName, aArgs)
{
	Plugins.runHook('rl-pub', [sName, aArgs]);
	if (!Utils.isUnd(this.oSubs[sName]))
	{
		_.each(this.oSubs[sName], function (aItem) {
			if (aItem[0])
			{
				aItem[0].apply(aItem[1] || null, aArgs || []);
			}
		});
	}

	return this;
};

AbstractApp.prototype.bootstart = function ()
{
	Utils.initOnStartOrLangChange(function () {
		Utils.initNotificationLanguage();
	}, null);

	_.delay(function () {
		Utils.windowResize();
	}, 1000);

	ssm.addState({
		'id': 'mobile',
		'maxWidth': 767,
		'onEnter': function() {
			$html.addClass('ssm-state-mobile');
		},
		'onLeave': function() {
			$html.removeClass('ssm-state-mobile');
		}
	});

	ssm.addState({
		'id': 'tablet',
		'minWidth': 768,
		'maxWidth': 999,
		'onEnter': function() {
			$html.addClass('ssm-state-tablet');
		},
		'onLeave': function() {
			$html.removeClass('ssm-state-tablet');
		}
	});

	ssm.addState({
		'id': 'desktop',
		'minWidth': 1000,
		'maxWidth': 1400,
		'onEnter': function() {
			$html.addClass('ssm-state-desktop');
		},
		'onLeave': function() {
			$html.removeClass('ssm-state-desktop');
		}
	});
	
	ssm.addState({
		'id': 'desktop-large',
		'minWidth': 1400,
		'onEnter': function() {
			$html.addClass('ssm-state-desktop-large');
		},
		'onLeave': function() {
			$html.removeClass('ssm-state-desktop-large');
		}
	});

	ssm.ready();
};

/**
 * @constructor
 * @extends AbstractApp
 */
function AdminApp()
{
	AbstractApp.call(this);

	this.oData = null;
	this.oRemote = null;
	this.oCache = null;
}

_.extend(AdminApp.prototype, AbstractApp.prototype);

AdminApp.prototype.oData = null;
AdminApp.prototype.oRemote = null;
AdminApp.prototype.oCache = null;

/**
 * @return {AdminDataStorage}
 */
AdminApp.prototype.data = function ()
{
	if (null === this.oData)
	{
		this.oData = new AdminDataStorage();
	}

	return this.oData;
};

/**
 * @return {AdminAjaxRemoteStorage}
 */
AdminApp.prototype.remote = function ()
{
	if (null === this.oRemote)
	{
		this.oRemote = new AdminAjaxRemoteStorage();
	}

	return this.oRemote;
};

/**
 * @return {AdminCacheStorage}
 */
AdminApp.prototype.cache = function ()
{
	if (null === this.oCache)
	{
		this.oCache = new AdminCacheStorage();
	}

	return this.oCache;
};

AdminApp.prototype.reloadDomainList = function ()
{
	RL.data().domainsLoading(true);
	RL.remote().domainList(function (sResult, oData) {
		RL.data().domainsLoading(false);
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			var aList = _.map(oData.Result, function (bEnabled, sName) {
				return {
					'name': sName,
					'disabled': ko.observable(!bEnabled),
					'deleteAccess': ko.observable(false)
				};
			}, this);

			RL.data().domains(aList);
		}
	});
};

AdminApp.prototype.reloadPluginList = function ()
{
	RL.data().pluginsLoading(true);
	RL.remote().pluginList(function (sResult, oData) {
		RL.data().pluginsLoading(false);
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			var aList = _.map(oData.Result, function (oItem) {
				return {
					'name': oItem['Name'],
					'disabled': ko.observable(!oItem['Enabled']),
					'configured': ko.observable(!!oItem['Configured'])
				};
			}, this);

			RL.data().plugins(aList);
		}
	});
};

AdminApp.prototype.reloadPackagesList = function ()
{
	RL.data().packagesLoading(true);
	RL.data().packagesReal(true);
	
	RL.remote().packagesList(function (sResult, oData) {
		
		RL.data().packagesLoading(false);
		
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			RL.data().packagesReal(!!oData.Result.Real);
			RL.data().packagesMainUpdatable(!!oData.Result.MainUpdatable);
			
			var 
				aList = [],
				aLoading = {}
			;
			
			_.each(RL.data().packages(), function (oItem) {
				if (oItem && oItem['loading']())
				{
					aLoading[oItem['file']] = oItem;
				}
			});
			
			if (Utils.isArray(oData.Result.List))
			{
				aList = _.compact(_.map(oData.Result.List, function (oItem) {
					if (oItem)
					{
						oItem['loading'] = ko.observable(!Utils.isUnd(aLoading[oItem['file']]));
						return 'core' === oItem['type'] && !oItem['canBeInstalled'] ? null : oItem;
					}
					return null;
				}));
			}

			RL.data().packages(aList);
		}
		else
		{
			RL.data().packagesReal(false);
		}
	});
};

/**
 *
 * @param {boolean=} bForce = false
 */
AdminApp.prototype.reloadLicensing = function (bForce)
{
	bForce = Utils.isUnd(bForce) ? false : !!bForce;

	RL.data().licensingProcess(true);
	RL.data().licenseError('');

	RL.remote().licensing(function (sResult, oData) {
		RL.data().licensingProcess(false);
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result && Utils.isNormal(oData.Result['Expired']))
		{
			RL.data().licenseValid(true);
			RL.data().licenseExpired(Utils.pInt(oData.Result['Expired']));
			RL.data().licenseError('');
			
			RL.data().licensing(true);
		}
		else
		{
			if (oData && oData.ErrorCode && -1 < Utils.inArray(Utils.pInt(oData.ErrorCode), [
				Enums.Notification.LicensingServerIsUnavailable,
				Enums.Notification.LicensingExpired
			]))
			{
				RL.data().licenseError(Utils.getNotification(Utils.pInt(oData.ErrorCode)));
				RL.data().licensing(true);
			}
			else
			{
				if (Enums.StorageResultType.Abort === sResult)
				{
					RL.data().licenseError(Utils.getNotification(Enums.Notification.LicensingServerIsUnavailable));
					RL.data().licensing(true);
				}
				else
				{
					RL.data().licensing(false);
				}
			}
		}
	}, bForce);
};

AdminApp.prototype.bootstart = function ()
{
	AbstractApp.prototype.bootstart.call(this);

	RL.data().populateDataOnStart();

	kn.hideLoading();

	if (!RL.settingsGet('AllowAdminPanel'))
	{
		kn.routeOff();
		kn.setHash(RL.link().root(), true);
		kn.routeOff();

		_.defer(function () {
			window.location.href = '/';
		});
	}
	else
	{
		if (!!RL.settingsGet('Auth'))
		{
// TODO
//			if (!RL.settingsGet('AllowPackages') && AdminPackages)
//			{
//				Utils.disableSettingsViewModel(AdminPackages);
//			}

			kn.startScreens([AdminSettingsScreen]);
		}
		else
		{
			kn.startScreens([AdminLoginScreen]);
		}
	}

	if (window.SimplePace)
	{
		window.SimplePace.set(100);
	}
};

/**
 * @type {AdminApp}
 */
RL = new AdminApp();

$html.addClass(Globals.bMobileDevice ? 'mobile' : 'no-mobile');

$window.keydown(Utils.killCtrlAandS).keyup(Utils.killCtrlAandS);
$window.unload(function () {
	Globals.bUnload = true;
});

$html.on('click.dropdown.data-api', function () {
	Utils.detectDropdownVisibility();
});

// export
window['rl'] = window['rl'] || {};
window['rl']['addHook'] = Plugins.addHook;
window['rl']['settingsGet'] = Plugins.mainSettingsGet;
window['rl']['remoteRequest'] = Plugins.remoteRequest;
window['rl']['pluginSettingsGet'] = Plugins.settingsGet;
window['rl']['addSettingsViewModel'] = Utils.addSettingsViewModel;
window['rl']['createCommand'] = Utils.createCommand;

window['rl']['EmailModel'] = EmailModel;
window['rl']['Enums'] = Enums;

window['__RLBOOT'] = function (fCall) {

	// boot
	$(function () {

		if (window['rainloopTEMPLATES'] && window['rainloopTEMPLATES'][0])
		{
			$('#rl-templates').html(window['rainloopTEMPLATES'][0]);

			_.delay(function () {
				window['rainloopAppData'] = {};
				window['rainloopI18N'] = {};
				window['rainloopTEMPLATES'] = {};

				kn.setBoot(RL).bootstart();
				$html.removeClass('no-js rl-booted-trigger').addClass('rl-booted');
				
			}, 50);
		}
		else
		{
			fCall(false);
		}

		window['__RLBOOT'] = null;
	});
};

if (window.SimplePace) {
	window.SimplePace.add(10);
}

}(window, jQuery, ko, crossroads, hasher, _));