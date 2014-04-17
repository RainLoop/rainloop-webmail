/*! RainLoop Webmail Main Module (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
(function (window, $, ko, crossroads, hasher, moment, Jua, _, ifvisible, key) {

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
 * @type {?RainLoopApp}
 */
var
	RL = null,
			
	$proxyDiv = $('<div></div>')
;
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



function NewHtmlEditorWrapper(oElement, fOnBlur, fOnReady, fOnModeChange)
{
	var self = this;
	self.editor = null;
	self.iBlurTimer = 0;
	self.fOnBlur = fOnBlur || null;
	self.fOnReady = fOnReady || null;
	self.fOnModeChange = fOnModeChange || null;
	
	self.$element = $(oElement);

	self.init();
}

NewHtmlEditorWrapper.prototype.blurTrigger = function ()
{
	if (this.fOnBlur)
	{
		var self = this;
		window.clearTimeout(self.iBlurTimer);
		self.iBlurTimer = window.setTimeout(function () {
			self.fOnBlur();
		}, 200);
	}
};

NewHtmlEditorWrapper.prototype.focusTrigger = function ()
{
	if (this.fOnBlur)
	{
		window.clearTimeout(this.iBlurTimer);
	}
};

/**
 * @return {boolean}
 */
NewHtmlEditorWrapper.prototype.isHtml = function ()
{
	return this.editor ? 'wysiwyg' === this.editor.mode : false;
};

/**
 * @return {boolean}
 */
NewHtmlEditorWrapper.prototype.checkDirty = function ()
{
	return this.editor ? this.editor.checkDirty() : false;
};

NewHtmlEditorWrapper.prototype.resetDirty = function ()
{
	if (this.editor)
	{
		this.editor.resetDirty();
	}
};

/**
 * @return {string}
 */
NewHtmlEditorWrapper.prototype.getData = function ()
{
	if (this.editor)
	{
		if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain)
		{
			return this.editor.__plain.getRawData();
		}

		return this.editor.getData();
	}

	return '';
};

NewHtmlEditorWrapper.prototype.modeToggle = function (bPlain)
{
	if (this.editor)
	{
		if (bPlain)
		{
			if ('plain' === this.editor.mode)
			{
				this.editor.setMode('wysiwyg');
			}
		}
		else
		{
			if ('wysiwyg' === this.editor.mode)
			{
				this.editor.setMode('plain');
			}
		}
	}
};

NewHtmlEditorWrapper.prototype.setHtml = function (sHtml, bFocus)
{
	if (this.editor)
	{
		this.modeToggle(true);
		this.editor.setData(sHtml);

		if (bFocus)
		{
			this.focus();
		}
	}
};

NewHtmlEditorWrapper.prototype.setPlain = function (sPlain, bFocus)
{
	if (this.editor)
	{
		this.modeToggle(false);
		if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain)
		{
			return this.editor.__plain.setRawData(sPlain);
		}
		else
		{
			this.editor.setData(sPlain);
		}

		if (bFocus)
		{
			this.focus();
		}
	}
};

NewHtmlEditorWrapper.prototype.init = function ()
{
	if (this.$element && this.$element[0])
	{
		var
			self = this,
			oConfig = Globals.oHtmlEditorDefaultConfig,
			sLanguage = RL.settingsGet('Language'),
			bSource = !!RL.settingsGet('AllowHtmlEditorSourceButton')
		;
		
		if (bSource && oConfig.toolbarGroups && !oConfig.toolbarGroups.__SourceInited)
		{
			oConfig.toolbarGroups.__SourceInited = true;
			oConfig.toolbarGroups.push({name: 'document', groups: ['mode', 'document', 'doctools']});
		}

		oConfig.language = Globals.oHtmlEditorLangsMap[sLanguage] || 'en';
		self.editor = window.CKEDITOR.appendTo(self.$element[0], oConfig);
		
		self.editor.on('key', function(oEvent) {
			if (oEvent && oEvent.data && 9 === oEvent.data.keyCode)
			{
				return false;
			}
		});

		self.editor.on('blur', function() {
			self.blurTrigger();
		});

		self.editor.on('mode', function() {
			self.blurTrigger();

			if (self.fOnModeChange)
			{
				self.fOnModeChange('plain' !== self.editor.mode);
			}
		});

		self.editor.on('focus', function() {
			self.focusTrigger();
		});

		if (self.fOnReady)
		{
			self.editor.on('instanceReady', function () {

				self.editor.setKeystroke(window.CKEDITOR.CTRL + 65 /* A */, 'selectAll');

				self.fOnReady();
				self.__resizable = true;
				self.resize();
			});
		}
	}
};

NewHtmlEditorWrapper.prototype.focus = function ()
{
	if (this.editor)
	{
		this.editor.focus();
	}
};

NewHtmlEditorWrapper.prototype.blur = function ()
{
	if (this.editor)
	{
		this.editor.focusManager.blur(true);
	}
};

NewHtmlEditorWrapper.prototype.resize = function ()
{
	if (this.editor && this.__resizable)
	{
		this.editor.resize(this.$element.width(), this.$element.innerHeight());
	}
};

NewHtmlEditorWrapper.prototype.clear = function (bFocus)
{
	this.setHtml('', bFocus);
};


/**
 * @constructor
 * @param {koProperty} oKoList
 * @param {koProperty} oKoSelectedItem
 * @param {string} sItemSelector
 * @param {string} sItemSelectedSelector
 * @param {string} sItemCheckedSelector
 * @param {string} sItemFocusedSelector
 */
function Selector(oKoList, oKoSelectedItem,
	sItemSelector, sItemSelectedSelector, sItemCheckedSelector, sItemFocusedSelector)
{
	this.list = oKoList;
	
	this.listChecked = ko.computed(function () {
		return _.filter(this.list(), function (oItem) {
			return oItem.checked();
		});
	}, this).extend({'rateLimit': 0});

	this.isListChecked = ko.computed(function () {
		return 0 < this.listChecked().length;
	}, this);
	
	this.focusedItem = ko.observable(null);
	this.selectedItem = oKoSelectedItem;
	this.selectedItemUseCallback = true;
	
	this.itemSelectedThrottle = _.debounce(_.bind(this.itemSelected, this), 300);

	this.listChecked.subscribe(function (aItems) {
		if (0 < aItems.length)
		{
			if (null === this.selectedItem())
			{
				this.selectedItem.valueHasMutated();
			}
			else
			{
				this.selectedItem(null);
			}
		}
		else if (this.bAutoSelect && this.focusedItem())
		{
			this.selectedItem(this.focusedItem());
		}
	}, this);
	
	this.selectedItem.subscribe(function (oItem) {

		if (oItem)
		{
			if (this.isListChecked())
			{
				_.each(this.listChecked(), function (oSubItem) {
					oSubItem.checked(false);
				});
			}

			if (this.selectedItemUseCallback)
			{
				this.itemSelectedThrottle(oItem);
			}
		}
		else if (this.selectedItemUseCallback)
		{
			this.itemSelected(null);
		}

	}, this);

	this.selectedItem.extend({'toggleSubscribe': [null,
		function (oPrev) {
			if (oPrev)
			{
				oPrev.selected(false);
			}
		}, function (oNext) {
			if (oNext)
			{
				oNext.selected(true);
			}
		}
	]});

	this.focusedItem.extend({'toggleSubscribe': [null,
		function (oPrev) {
			if (oPrev)
			{
				oPrev.focused(false);
			}
		}, function (oNext) {
			if (oNext)
			{
				oNext.focused(true);
			}
		}
	]});

	this.oContentVisible = null;
	this.oContentScrollable = null;
	
	this.sItemSelector = sItemSelector;
	this.sItemSelectedSelector = sItemSelectedSelector;
	this.sItemCheckedSelector = sItemCheckedSelector;
	this.sItemFocusedSelector = sItemFocusedSelector;
	
	this.sLastUid = '';
	this.bAutoSelect = true;
	this.oCallbacks = {};

	this.emptyFunction = function () {};

	this.focusedItem.subscribe(function (oItem) {
		if (oItem)
		{
			this.sLastUid = this.getItemUid(oItem);
		}
	}, this);

	var
		aCache = [],
		aCheckedCache = [],
		mFocused = null,
		mSelected = null
	;
	
	this.list.subscribe(function (aItems) {

		var self = this;
		if (Utils.isArray(aItems))
		{
			_.each(aItems, function (oItem) {
				if (oItem)
				{
					var sUid = self.getItemUid(oItem);
					
					aCache.push(sUid);
					if (oItem.checked())
					{
						aCheckedCache.push(sUid);
					}
					if (null === mFocused && oItem.focused())
					{
						mFocused = sUid;
					}
					if (null === mSelected && oItem.selected())
					{
						mSelected = sUid;
					}
				}
			});
		}
	}, this, 'beforeChange');
	
	this.list.subscribe(function (aItems) {
		
		var
			self = this,
			oTemp = null,
			bGetNext = false,
			aUids = [],
			mNextFocused = mFocused,
			bChecked = false,
			bSelected = false,
			iLen = 0
		;
		
		this.selectedItemUseCallback = false;

		this.focusedItem(null);
		this.selectedItem(null);

		if (Utils.isArray(aItems))
		{
			iLen = aCheckedCache.length;

			_.each(aItems, function (oItem) {

				var sUid = self.getItemUid(oItem);
				aUids.push(sUid);

				if (null !== mFocused && mFocused === sUid)
				{
					self.focusedItem(oItem);
					mFocused = null;
				}

				if (0 < iLen && -1 < Utils.inArray(sUid, aCheckedCache))
				{
					bChecked = true;
					oItem.checked(true);
					iLen--;
				}

				if (!bChecked && null !== mSelected && mSelected === sUid)
				{
					bSelected = true;
					self.selectedItem(oItem);
					mSelected = null;
				}
			});

			this.selectedItemUseCallback = true;

			if (!bChecked && !bSelected && this.bAutoSelect)
			{
				if (self.focusedItem())
				{
					self.selectedItem(self.focusedItem());
				}
				else if (0 < aItems.length)
				{
					if (null !== mNextFocused)
					{
						bGetNext = false;
						mNextFocused = _.find(aCache, function (sUid) {
							if (bGetNext && -1 < Utils.inArray(sUid, aUids))
							{
								return sUid;
							}
							else if (mNextFocused === sUid)
							{
								bGetNext = true;
							}
							return false;
						});

						if (mNextFocused)
						{
							oTemp = _.find(aItems, function (oItem) {
								return mNextFocused === self.getItemUid(oItem);
							});
						}
					}

					self.selectedItem(oTemp || null);
					self.focusedItem(self.selectedItem());
				}
			}
		}

		aCache = [];
		aCheckedCache = [];
		mFocused = null;
		mSelected = null;
		
	}, this);
}

Selector.prototype.itemSelected = function (oItem)
{
	if (this.isListChecked())
	{
		if (!oItem)
		{
			(this.oCallbacks['onItemSelect'] || this.emptyFunction)(oItem || null);
		}
	}
	else
	{
		if (oItem)
		{
			(this.oCallbacks['onItemSelect'] || this.emptyFunction)(oItem);
		}
	}
};

Selector.prototype.goDown = function (bForceSelect)
{
	this.newSelectPosition(Enums.EventKeyCode.Down, false, bForceSelect);
};

Selector.prototype.goUp = function (bForceSelect)
{
	this.newSelectPosition(Enums.EventKeyCode.Up, false, bForceSelect);
};

Selector.prototype.init = function (oContentVisible, oContentScrollable, sKeyScope)
{
	this.oContentVisible = oContentVisible;
	this.oContentScrollable = oContentScrollable;

	sKeyScope = sKeyScope || 'all';
	
	if (this.oContentVisible && this.oContentScrollable)
	{
		var 
			self = this
		;
		
		$(this.oContentVisible)
			.on('selectstart', function (oEvent) {
				if (oEvent && oEvent.preventDefault)
				{
					oEvent.preventDefault();
				}
			})
			.on('click', this.sItemSelector, function (oEvent) {
				self.actionClick(ko.dataFor(this), oEvent);
			})
			.on('click', this.sItemCheckedSelector, function (oEvent) {
				var oItem = ko.dataFor(this);
				if (oItem)
				{
					if (oEvent && oEvent.shiftKey)
					{
						self.actionClick(oItem, oEvent);
					}
					else
					{
						self.focusedItem(oItem);
						oItem.checked(!oItem.checked());
					}
				}
			})
		;

		key('enter', sKeyScope, function () {
			if (self.focusedItem())
			{
				self.actionClick(self.focusedItem());
			}

			return false;
		});

		key('ctrl+up, command+up, ctrl+down, command+down', sKeyScope, function () {
			return false;
		});

		key('up, shift+up, down, shift+down, home, end, pageup, pagedown, insert, space', sKeyScope, function (event, handler) {
			if (event && handler && handler.shortcut)
			{
				// TODO
				var iKey = 0;
				switch (handler.shortcut)
				{
					case 'up':
					case 'shift+up':
						iKey = Enums.EventKeyCode.Up;
						break;
					case 'down':
					case 'shift+down':
						iKey = Enums.EventKeyCode.Down;
						break;
					case 'insert':
						iKey = Enums.EventKeyCode.Insert;
						break;
					case 'space':
						iKey = Enums.EventKeyCode.Space;
						break;
					case 'home':
						iKey = Enums.EventKeyCode.Home;
						break;
					case 'end':
						iKey = Enums.EventKeyCode.End;
						break;
					case 'pageup':
						iKey = Enums.EventKeyCode.PageUp;
						break;
					case 'pagedown':
						iKey = Enums.EventKeyCode.PageDown;
						break;
				}

				if (0 < iKey)
				{
					self.newSelectPosition(iKey, key.shift);
					return false;
				}
			}
		});
	}
};

Selector.prototype.autoSelect = function (bValue)
{
	this.bAutoSelect = !!bValue;
};

/**
 * @param {Object} oItem
 * @returns {string}
 */
Selector.prototype.getItemUid = function (oItem)
{
	var
		sUid = '',
		fGetItemUidCallback = this.oCallbacks['onItemGetUid'] || null
	;

	if (fGetItemUidCallback && oItem)
	{
		sUid = fGetItemUidCallback(oItem);
	}

	return sUid.toString();
};

/**
 * @param {number} iEventKeyCode
 * @param {boolean} bShiftKey
 * @param {boolean=} bForceSelect = false
 */
Selector.prototype.newSelectPosition = function (iEventKeyCode, bShiftKey, bForceSelect)
{
	var
		iIndex = 0,
		iPageStep = 10,
		bNext = false,
		bStop = false,
		oResult = null,
		aList = this.list(),
		iListLen = aList ? aList.length : 0,
		oFocused = this.focusedItem()
	;

	if (0 < iListLen)
	{
		if (!oFocused)
		{
			if (Enums.EventKeyCode.Down === iEventKeyCode || Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode || Enums.EventKeyCode.Home === iEventKeyCode || Enums.EventKeyCode.PageUp === iEventKeyCode)
			{
				oResult = aList[0];
			}
			else if (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.End === iEventKeyCode || Enums.EventKeyCode.PageDown === iEventKeyCode)
			{
				oResult = aList[aList.length - 1];
			}
		}
		else if (oFocused)
		{
			if (Enums.EventKeyCode.Down === iEventKeyCode || Enums.EventKeyCode.Up === iEventKeyCode ||  Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
			{
				_.each(aList, function (oItem) {
					if (!bStop)
					{
						switch (iEventKeyCode) {
						case Enums.EventKeyCode.Up:
							if (oFocused === oItem)
							{
								bStop = true;
							}
							else
							{
								oResult = oItem;
							}
							break;
						case Enums.EventKeyCode.Down:
						case Enums.EventKeyCode.Insert:
							if (bNext)
							{
								oResult = oItem;
								bStop = true;
							}
							else if (oFocused === oItem)
							{
								bNext = true;
							}
							break;
						}
					}
				});
			}
			else if (Enums.EventKeyCode.Home === iEventKeyCode || Enums.EventKeyCode.End === iEventKeyCode)
			{
				if (Enums.EventKeyCode.Home === iEventKeyCode)
				{
					oResult = aList[0];
				}
				else if (Enums.EventKeyCode.End === iEventKeyCode)
				{
					oResult = aList[aList.length - 1];
				}
			}
			else if (Enums.EventKeyCode.PageDown === iEventKeyCode)
			{
				for (; iIndex < iListLen; iIndex++)
				{
					if (oFocused === aList[iIndex])
					{
						iIndex += iPageStep;
						iIndex = iListLen - 1 < iIndex ? iListLen - 1 : iIndex;
						oResult = aList[iIndex];
						break;
					}
				}
			}
			else if (Enums.EventKeyCode.PageUp === iEventKeyCode)
			{
				for (iIndex = iListLen; iIndex >= 0; iIndex--)
				{
					if (oFocused === aList[iIndex])
					{
						iIndex -= iPageStep;
						iIndex = 0 > iIndex ? 0 : iIndex;
						oResult = aList[iIndex];
						break;
					}
				}
			}
		}
	}

	if (oResult)
	{
		this.focusedItem(oResult);

		if (oFocused)
		{
			if (bShiftKey)
			{
				if (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.Down === iEventKeyCode)
				{
					oFocused.checked(!oFocused.checked());
				}
			}
			else if (Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
			{
				oFocused.checked(!oFocused.checked());
			}
		}

		if ((this.bAutoSelect || !!bForceSelect) &&
			!this.isListChecked() && Enums.EventKeyCode.Space !== iEventKeyCode)
		{
			this.selectedItem(oResult);
		}

		this.scrollToFocused();
	}
	else if (oFocused)
	{
		if (bShiftKey && (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.Down === iEventKeyCode))
		{
			oFocused.checked(!oFocused.checked());
		}
		else if (Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
		{
			oFocused.checked(!oFocused.checked());
		}

		this.focusedItem(oFocused);
	}
};

/**
 * @return {boolean}
 */
Selector.prototype.scrollToFocused = function ()
{
	if (!this.oContentVisible || !this.oContentScrollable)
	{
		return false;
	}

	var
		iOffset = 20,
		oFocused = $(this.sItemFocusedSelector, this.oContentScrollable),
		oPos = oFocused.position(),
		iVisibleHeight = this.oContentVisible.height(),
		iFocusedHeight = oFocused.outerHeight()
	;

	if (oPos && (oPos.top < 0 || oPos.top + iFocusedHeight > iVisibleHeight))
	{
		if (oPos.top < 0)
		{
			this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iOffset);
		}
		else
		{
			this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iVisibleHeight + iFocusedHeight + iOffset);
		}

		return true;
	}

	return false;
};

Selector.prototype.eventClickFunction = function (oItem, oEvent)
{
	var
		sUid = this.getItemUid(oItem),
		iIndex = 0,
		iLength = 0,
		oListItem = null,
		sLineUid = '',
		bChangeRange = false,
		bIsInRange = false,
		aList = [],
		bChecked = false
	;

	if (oEvent && oEvent.shiftKey)
	{
		if ('' !== sUid && '' !== this.sLastUid && sUid !== this.sLastUid)
		{
			aList = this.list();
			bChecked = oItem.checked();

			for (iIndex = 0, iLength = aList.length; iIndex < iLength; iIndex++)
			{
				oListItem = aList[iIndex];
				sLineUid = this.getItemUid(oListItem);

				bChangeRange = false;
				if (sLineUid === this.sLastUid || sLineUid === sUid)
				{
					bChangeRange = true;
				}

				if (bChangeRange)
				{
					bIsInRange = !bIsInRange;
				}

				if (bIsInRange || bChangeRange)
				{
					oListItem.checked(bChecked);
				}
			}
		}
	}

	this.sLastUid = '' === sUid ? '' : sUid;
};

/**
 * @param {Object} oItem
 * @param {Object=} oEvent
 */
Selector.prototype.actionClick = function (oItem, oEvent)
{
	if (oItem)
	{
		var
			bClick = true,
			sUid = this.getItemUid(oItem)
		;
		
		if (oEvent)
		{
			if (oEvent.shiftKey && !oEvent.ctrlKey && !oEvent.altKey)
			{
				bClick = false;
				if ('' === this.sLastUid)
				{
					this.sLastUid = sUid;
				}

				oItem.checked(!oItem.checked());
				this.eventClickFunction(oItem, oEvent);
				
				this.focusedItem(oItem);
			}
			else if (oEvent.ctrlKey && !oEvent.shiftKey && !oEvent.altKey)
			{
				bClick = false;
				this.focusedItem(oItem);

				if (this.selectedItem() && oItem !== this.selectedItem())
				{
					this.selectedItem().checked(true);
				}

				oItem.checked(!oItem.checked());
			}
		}

		if (bClick)
		{
			this.focusedItem(oItem);
			this.selectedItem(oItem);
		}
	}
};

Selector.prototype.on = function (sEventName, fCallback)
{
	this.oCallbacks[sEventName] = fCallback;
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
function OpenPgpLocalStorageDriver()
{
}

/*
 * Declare the localstore itemname
 */
OpenPgpLocalStorageDriver.prototype.item = 'armoredRainLoopKeys';

/**
 * Load the keyring from HTML5 local storage and initializes this instance.
 * @return {Array<module:key~Key>} array of keys retrieved from localstore
 */
OpenPgpLocalStorageDriver.prototype.load = function ()
{
	var
		iIndex = 0,
		iLen = 0,
		aKeys = [],
		aArmoredKeys = JSON.parse(window.localStorage.getItem(this.item))
	;

	if (aArmoredKeys && 0 < aArmoredKeys.length)
	{
		for (iLen = aArmoredKeys.length; iIndex < iLen; iIndex++)
		{
			aKeys.push(
				window.openpgp.key.readArmored(aArmoredKeys[iIndex]).keys[0]
			);
		}
	}
	
	return aKeys;
};

/**
 * Saves the current state of the keyring to HTML5 local storage.
 * The privateKeys array and publicKeys array gets Stringified using JSON
 * @param {Array<module:key~Key>} aKeys array of keys to save in localstore
 */
OpenPgpLocalStorageDriver.prototype.store = function (aKeys)
{
	var
		iIndex = 0,
		iLen = aKeys.length,
		aArmoredKeys = []
	;
	
	for (; iIndex < iLen; iIndex++)
	{
		aArmoredKeys.push(aKeys[iIndex].armor());
	}
	
	window.localStorage.setItem(this.item, JSON.stringify(aArmoredKeys));
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
 */
function ContactModel()
{
	this.idContact = 0;
	this.idContactStr = '';
	this.display = '';
	this.properties = [];
	this.readOnly = false;
	this.scopeType = Enums.ContactScopeType.Default;

	this.focused = ko.observable(false);
	this.selected = ko.observable(false);
	this.checked = ko.observable(false);
	this.deleted = ko.observable(false);
	this.shared = ko.observable(false);
}

/**
 * @return {Array|null}
 */
ContactModel.prototype.getNameAndEmailHelper = function ()
{
	var 
		sName = '',
		sEmail = ''
	;
	
	if (Utils.isNonEmptyArray(this.properties))
	{
		_.each(this.properties, function (aProperty) {
			if (aProperty)
			{
				if ('' === sName && Enums.ContactPropertyType.FullName === aProperty[0])
				{
					sName = aProperty[1];
				}
				else if ('' === sEmail && -1 < Utils.inArray(aProperty[0], [
					Enums.ContactPropertyType.EmailPersonal,
					Enums.ContactPropertyType.EmailBussines,
					Enums.ContactPropertyType.EmailOther
				]))
				{
					sEmail = aProperty[1];
				}
			}
		}, this);
	}

	return '' === sEmail ? null : [sEmail, sName];
};

ContactModel.prototype.parse = function (oItem)
{
	var bResult = false;
	if (oItem && 'Object/Contact' === oItem['@Object'])
	{
		this.idContact = Utils.pInt(oItem['IdContact']);
		this.idContactStr = Utils.pString(oItem['IdContactStr']);
		this.display = Utils.pString(oItem['Display']);
		this.readOnly = !!oItem['ReadOnly'];
		this.scopeType = Utils.pInt(oItem['ScopeType']);

		if (Utils.isNonEmptyArray(oItem['Properties']))
		{
			_.each(oItem['Properties'], function (oProperty) {
				if (oProperty && oProperty['Type'] && Utils.isNormal(oProperty['Value']))
				{
					this.properties.push([Utils.pInt(oProperty['Type']), Utils.pString(oProperty['Value'])]);
				}
			}, this);
		}

		this.shared(Enums.ContactScopeType.ShareAll === this.scopeType);
		bResult = true;
	}

	return bResult;
};

/**
 * @return {string}
 */
ContactModel.prototype.srcAttr = function ()
{
	return RL.link().emptyContactPic();
};

/**
 * @return {string}
 */
ContactModel.prototype.generateUid = function ()
{
	return '' + this.idContact;
};

/**
 * @return string
 */
ContactModel.prototype.lineAsCcc = function ()
{
	var aResult = [];
	if (this.deleted())
	{
		aResult.push('deleted');
	}
	if (this.selected())
	{
		aResult.push('selected');
	}
	if (this.checked())
	{
		aResult.push('checked');
	}
	if (this.shared())
	{
		aResult.push('shared');
	}
	if (this.focused())
	{
		aResult.push('focused');
	}

	return aResult.join(' ');
};

/**
 * @param {number=} iType = Enums.ContactPropertyType.Unknown
 * @param {string=} sValue = ''
 * @param {boolean=} bFocused = false
 * @param {string=} sPlaceholder = ''
 *
 * @constructor
 */
function ContactPropertyModel(iType, sValue, bFocused, sPlaceholder)
{
	this.type = ko.observable(Utils.isUnd(iType) ? Enums.ContactPropertyType.Unknown : iType);
	this.focused = ko.observable(Utils.isUnd(bFocused) ? false : !!bFocused);
	this.value = ko.observable(Utils.pString(sValue));

	this.placeholder = ko.observable(sPlaceholder || '');

	this.placeholderValue = ko.computed(function () {
		var sPlaceholder = this.placeholder();
		return sPlaceholder ? Utils.i18n(sPlaceholder) : '';
	}, this);
}

/**
 * @constructor
 */
function AttachmentModel()
{
	this.mimeType = '';
	this.fileName = '';
	this.estimatedSize = 0;
	this.friendlySize = '';
	this.isInline = false;
	this.isLinked = false;
	this.cid = '';
	this.cidWithOutTags = '';
	this.contentLocation = '';
	this.download = '';
	this.folder = '';
	this.uid = '';
	this.mimeIndex = '';
}

/**
 * @static
 * @param {AjaxJsonAttachment} oJsonAttachment
 * @return {?AttachmentModel}
 */
AttachmentModel.newInstanceFromJson = function (oJsonAttachment)
{
	var oAttachmentModel = new AttachmentModel();
	return oAttachmentModel.initByJson(oJsonAttachment) ? oAttachmentModel : null;
};

AttachmentModel.prototype.mimeType = '';
AttachmentModel.prototype.fileName = '';
AttachmentModel.prototype.estimatedSize = 0;
AttachmentModel.prototype.friendlySize = '';
AttachmentModel.prototype.isInline = false;
AttachmentModel.prototype.isLinked = false;
AttachmentModel.prototype.cid = '';
AttachmentModel.prototype.cidWithOutTags = '';
AttachmentModel.prototype.contentLocation = '';
AttachmentModel.prototype.download = '';
AttachmentModel.prototype.folder = '';
AttachmentModel.prototype.uid = '';
AttachmentModel.prototype.mimeIndex = '';

/**
 * @param {AjaxJsonAttachment} oJsonAttachment
 */
AttachmentModel.prototype.initByJson = function (oJsonAttachment)
{
	var bResult = false;
	if (oJsonAttachment && 'Object/Attachment' === oJsonAttachment['@Object'])
	{
		this.mimeType = (oJsonAttachment.MimeType || '').toLowerCase();
		this.fileName = oJsonAttachment.FileName;
		this.estimatedSize = Utils.pInt(oJsonAttachment.EstimatedSize);
		this.isInline = !!oJsonAttachment.IsInline;
		this.isLinked = !!oJsonAttachment.IsLinked;
		this.cid = oJsonAttachment.CID;
		this.contentLocation = oJsonAttachment.ContentLocation;
		this.download = oJsonAttachment.Download;

		this.folder = oJsonAttachment.Folder;
		this.uid = oJsonAttachment.Uid;
		this.mimeIndex = oJsonAttachment.MimeIndex;

		this.friendlySize = Utils.friendlySize(this.estimatedSize);
		this.cidWithOutTags = this.cid.replace(/^<+/, '').replace(/>+$/, '');

		bResult = true;
	}

	return bResult;
};

/**
 * @return {boolean}
 */
AttachmentModel.prototype.isImage = function ()
{
	return -1 < Utils.inArray(this.mimeType.toLowerCase(),
		['image/png', 'image/jpg', 'image/jpeg', 'image/gif']
	);
};

/**
 * @return {boolean}
 */
AttachmentModel.prototype.isText = function ()
{
	return 'text/' === this.mimeType.substr(0, 5) &&
		-1 === Utils.inArray(this.mimeType, ['text/html']);
};

/**
 * @return {boolean}
 */
AttachmentModel.prototype.isPdf = function ()
{
	return Globals.bAllowPdfPreview && 'application/pdf' === this.mimeType;
};

/**
 * @return {string}
 */
AttachmentModel.prototype.linkDownload = function ()
{
	return RL.link().attachmentDownload(this.download);
};

/**
 * @return {string}
 */
AttachmentModel.prototype.linkPreview = function ()
{
	return RL.link().attachmentPreview(this.download);
};

/**
 * @return {string}
 */
AttachmentModel.prototype.linkPreviewAsPlain = function ()
{
	return RL.link().attachmentPreviewAsPlain(this.download);
};

/**
 * @return {string}
 */
AttachmentModel.prototype.generateTransferDownloadUrl = function ()
{
	var	sLink = this.linkDownload();
	if ('http' !== sLink.substr(0, 4))
	{
		sLink = window.location.protocol + '//' + window.location.host + window.location.pathname + sLink;
	}

	return this.mimeType + ':' + this.fileName + ':' + sLink;
};

/**
 * @param {AttachmentModel} oAttachment
 * @param {*} oEvent
 * @return {boolean}
 */
AttachmentModel.prototype.eventDragStart = function (oAttachment, oEvent)
{
	var	oLocalEvent = oEvent.originalEvent || oEvent;
	if (oAttachment && oLocalEvent && oLocalEvent.dataTransfer && oLocalEvent.dataTransfer.setData)
	{
		oLocalEvent.dataTransfer.setData('DownloadURL', this.generateTransferDownloadUrl());
	}

	return true;
};

AttachmentModel.prototype.iconClass = function ()
{
	var
		aParts = this.mimeType.toLocaleString().split('/'),
		sClass = 'icon-file'
	;

	if (aParts && aParts[1])
	{
		if ('image' === aParts[0])
		{
			sClass = 'icon-file-image';
		}
		else if ('text' === aParts[0])
		{
			sClass = 'icon-file-text';
		}
		else if ('audio' === aParts[0])
		{
			sClass = 'icon-file-music';
		}
		else if ('video' === aParts[0])
		{
			sClass = 'icon-file-movie';
		}
		else if (-1 < Utils.inArray(aParts[1],
			['zip', '7z', 'tar', 'rar', 'gzip', 'bzip', 'bzip2', 'x-zip', 'x-7z', 'x-rar', 'x-tar', 'x-gzip', 'x-bzip', 'x-bzip2', 'x-zip-compressed', 'x-7z-compressed', 'x-rar-compressed']))
		{
			sClass = 'icon-file-zip';
		}
//		else if (-1 < Utils.inArray(aParts[1],
//			['pdf', 'x-pdf']))
//		{
//			sClass = 'icon-file-pdf';
//		}
//		else if (-1 < Utils.inArray(aParts[1], [
//			'exe', 'x-exe', 'x-winexe', 'bat'
//		]))
//		{
//			sClass = 'icon-console';
//		}
		else if (-1 < Utils.inArray(aParts[1], [
			'rtf', 'msword', 'vnd.msword', 'vnd.openxmlformats-officedocument.wordprocessingml.document',
			'vnd.openxmlformats-officedocument.wordprocessingml.template',
			'vnd.ms-word.document.macroEnabled.12',
			'vnd.ms-word.template.macroEnabled.12'
		]))
		{
			sClass = 'icon-file-text';
		}
		else if (-1 < Utils.inArray(aParts[1], [
			'excel', 'ms-excel', 'vnd.ms-excel',
			'vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'vnd.openxmlformats-officedocument.spreadsheetml.template',
			'vnd.ms-excel.sheet.macroEnabled.12',
			'vnd.ms-excel.template.macroEnabled.12',
			'vnd.ms-excel.addin.macroEnabled.12',
			'vnd.ms-excel.sheet.binary.macroEnabled.12'
		]))
		{
			sClass = 'icon-file-excel';
		}
		else if (-1 < Utils.inArray(aParts[1], [
			'powerpoint', 'ms-powerpoint', 'vnd.ms-powerpoint',
			'vnd.openxmlformats-officedocument.presentationml.presentation',
			'vnd.openxmlformats-officedocument.presentationml.template',
			'vnd.openxmlformats-officedocument.presentationml.slideshow',
			'vnd.ms-powerpoint.addin.macroEnabled.12',
			'vnd.ms-powerpoint.presentation.macroEnabled.12',
			'vnd.ms-powerpoint.template.macroEnabled.12',
			'vnd.ms-powerpoint.slideshow.macroEnabled.12'
		]))
		{
			sClass = 'icon-file-chart-graph';
		}
	}

	return sClass;
};

/**
 * @constructor
 * @param {string} sId
 * @param {string} sFileName
 * @param {?number=} nSize
 * @param {boolean=} bInline
 * @param {boolean=} bLinked
 * @param {string=} sCID
 * @param {string=} sContentLocation
 */
function ComposeAttachmentModel(sId, sFileName, nSize, bInline, bLinked, sCID, sContentLocation)
{
	this.id = sId;
	this.isInline = Utils.isUnd(bInline) ? false : !!bInline;
	this.isLinked = Utils.isUnd(bLinked) ? false : !!bLinked;
	this.CID = Utils.isUnd(sCID) ? '' : sCID;
	this.contentLocation = Utils.isUnd(sContentLocation) ? '' : sContentLocation;
	this.fromMessage = false;

	this.fileName = ko.observable(sFileName);
	this.size = ko.observable(Utils.isUnd(nSize) ? null : nSize);
	this.tempName = ko.observable('');

	this.progress = ko.observable('');
	this.error = ko.observable('');
	this.waiting = ko.observable(true);
	this.uploading = ko.observable(false);
	this.enabled = ko.observable(true);

	this.friendlySize = ko.computed(function () {
		var mSize = this.size();
		return null === mSize ? '' : Utils.friendlySize(this.size());
	}, this);
}

ComposeAttachmentModel.prototype.id = '';
ComposeAttachmentModel.prototype.isInline = false;
ComposeAttachmentModel.prototype.isLinked = false;
ComposeAttachmentModel.prototype.CID = '';
ComposeAttachmentModel.prototype.contentLocation = '';
ComposeAttachmentModel.prototype.fromMessage = false;
ComposeAttachmentModel.prototype.cancel = Utils.emptyFunction;

/**
 * @param {AjaxJsonComposeAttachment} oJsonAttachment
 */
ComposeAttachmentModel.prototype.initByUploadJson = function (oJsonAttachment)
{
	var bResult = false;
	if (oJsonAttachment)
	{
		this.fileName(oJsonAttachment.Name);
		this.size(Utils.isUnd(oJsonAttachment.Size) ? 0 : Utils.pInt(oJsonAttachment.Size));
		this.tempName(Utils.isUnd(oJsonAttachment.TempName) ? '' : oJsonAttachment.TempName);
		this.isInline = false;

		bResult = true;
	}

	return bResult;
};
/**
 * @constructor
 */
function MessageModel()
{
	this.folderFullNameRaw = '';
	this.uid = '';
	this.hash = '';
	this.requestHash = '';
	this.subject = ko.observable('');
	this.size = ko.observable(0);
	this.dateTimeStampInUTC = ko.observable(0);
	this.priority = ko.observable(Enums.MessagePriority.Normal);

	this.fromEmailString = ko.observable('');
	this.toEmailsString = ko.observable('');
	this.senderEmailsString = ko.observable('');

	this.emails = [];

	this.from = [];
	this.to = [];
	this.cc = [];
	this.bcc = [];
	this.replyTo = [];

	this.newForAnimation = ko.observable(false);

	this.deleted = ko.observable(false);
	this.unseen = ko.observable(false);
	this.flagged = ko.observable(false);
	this.answered = ko.observable(false);
	this.forwarded = ko.observable(false);
	this.isReadReceipt = ko.observable(false);

	this.focused = ko.observable(false);
	this.selected = ko.observable(false);
	this.checked = ko.observable(false);
	this.hasAttachments = ko.observable(false);
	this.attachmentsMainType = ko.observable('');

	this.moment = ko.observable(moment());

	this.attachmentIconClass = ko.computed(function () {
		var sClass = '';
		if (this.hasAttachments())
		{
			sClass = 'icon-attachment';
			switch (this.attachmentsMainType())
			{
				case 'image':
					sClass = 'icon-image';
					break;
				case 'archive':
					sClass = 'icon-file-zip';
					break;
				case 'doc':
					sClass = 'icon-file-text';
					break;
//				case 'pdf':
//					sClass = 'icon-file-pdf';
//					break;
			}
		}
		return sClass;
	}, this);
	
	this.fullFormatDateValue = ko.computed(function () {
		return MessageModel.calculateFullFromatDateValue(this.dateTimeStampInUTC());
	}, this);

	this.fullFormatDateValue = ko.computed(function () {
		return MessageModel.calculateFullFromatDateValue(this.dateTimeStampInUTC());
	}, this);

	this.momentDate = Utils.createMomentDate(this);
	this.momentShortDate = Utils.createMomentShortDate(this);

	this.dateTimeStampInUTC.subscribe(function (iValue) {
		var iNow = moment().unix();
		this.moment(moment.unix(iNow < iValue ? iNow : iValue));
	}, this);

	this.body = null;
	this.plainRaw = '';
	this.isRtl = ko.observable(false);
	this.isHtml = ko.observable(false);
	this.hasImages = ko.observable(false);
	this.attachments = ko.observableArray([]);

	this.isPgpSigned = ko.observable(false);
	this.isPgpEncrypted = ko.observable(false);
	this.pgpSignedVerifyStatus = ko.observable(Enums.SignedVerifyStatus.None);
	this.pgpSignedVerifyUser = ko.observable('');

	this.priority = ko.observable(Enums.MessagePriority.Normal);
	this.readReceipt = ko.observable('');

	this.aDraftInfo = [];
	this.sMessageId = '';
	this.sInReplyTo = '';
	this.sReferences = '';
	
	this.parentUid = ko.observable(0);
	this.threads = ko.observableArray([]);
	this.threadsLen = ko.observable(0);
	this.hasUnseenSubMessage = ko.observable(false);
	this.hasFlaggedSubMessage = ko.observable(false);

	this.lastInCollapsedThread = ko.observable(false);
	this.lastInCollapsedThreadLoading = ko.observable(false);
	
	this.threadsLenResult = ko.computed(function () {
		var iCount = this.threadsLen();
		return 0 === this.parentUid() && 0 < iCount ? iCount + 1 : '';
	}, this);
}

/**
 * @static
 * @param {AjaxJsonMessage} oJsonMessage
 * @return {?MessageModel}
 */
MessageModel.newInstanceFromJson = function (oJsonMessage)
{
	var oMessageModel = new MessageModel();
	return oMessageModel.initByJson(oJsonMessage) ? oMessageModel : null;
};

/**
 * @static
 * @param {number} iTimeStampInUTC
 * @return {string}
 */
MessageModel.calculateFullFromatDateValue = function (iTimeStampInUTC)
{
	return moment.unix(iTimeStampInUTC).format('LLL');
};

/**
 * @static
 * @param {Array} aEmail
 * @param {boolean=} bFriendlyView
 * @param {boolean=} bWrapWithLink = false
 * @return {string}
 */
MessageModel.emailsToLine = function (aEmail, bFriendlyView, bWrapWithLink)
{
	var
		aResult = [],
		iIndex = 0,
		iLen = 0
	;

	if (Utils.isNonEmptyArray(aEmail))
	{
		for (iIndex = 0, iLen = aEmail.length; iIndex < iLen; iIndex++)
		{
			aResult.push(aEmail[iIndex].toLine(bFriendlyView, bWrapWithLink));
		}
	}

	return aResult.join(', ');
};

/**
 * @static
 * @param {?Array} aJsonEmails
 * @return {Array}
 */
MessageModel.initEmailsFromJson = function (aJsonEmails)
{
	var
		iIndex = 0,
		iLen = 0,
		oEmailModel = null,
		aResult = []
	;

	if (Utils.isNonEmptyArray(aJsonEmails))
	{
		for (iIndex = 0, iLen = aJsonEmails.length; iIndex < iLen; iIndex++)
		{
			oEmailModel = EmailModel.newInstanceFromJson(aJsonEmails[iIndex]);
			if (oEmailModel)
			{
				aResult.push(oEmailModel);
			}
		}
	}

	return aResult;
};

/**
 * @static
 * @param {Array.<EmailModel>} aMessageEmails
 * @param {Object} oLocalUnic
 * @param {Array} aLocalEmails
 */
MessageModel.replyHelper = function (aMessageEmails, oLocalUnic, aLocalEmails)
{
	if (aMessageEmails && 0 < aMessageEmails.length)
	{
		var
			iIndex = 0,
			iLen = aMessageEmails.length
		;

		for (; iIndex < iLen; iIndex++)
		{
			if (Utils.isUnd(oLocalUnic[aMessageEmails[iIndex].email]))
			{
				oLocalUnic[aMessageEmails[iIndex].email] = true;
				aLocalEmails.push(aMessageEmails[iIndex]);
			}
		}
	}
};

MessageModel.prototype.clear = function ()
{
	this.folderFullNameRaw = '';
	this.uid = '';
	this.hash = '';
	this.requestHash = '';
	this.subject('');
	this.size(0);
	this.dateTimeStampInUTC(0);
	this.priority(Enums.MessagePriority.Normal);

	this.fromEmailString('');
	this.toEmailsString('');
	this.senderEmailsString('');

	this.emails = [];

	this.from = [];
	this.to = [];
	this.cc = [];
	this.bcc = [];
	this.replyTo = [];

	this.newForAnimation(false);

	this.deleted(false);
	this.unseen(false);
	this.flagged(false);
	this.answered(false);
	this.forwarded(false);
	this.isReadReceipt(false);

	this.selected(false);
	this.checked(false);
	this.hasAttachments(false);
	this.attachmentsMainType('');

	this.body = null;
	this.isRtl(false);
	this.isHtml(false);
	this.hasImages(false);
	this.attachments([]);
	
	this.isPgpSigned(false);
	this.isPgpEncrypted(false);
	this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.None);
	this.pgpSignedVerifyUser('');

	this.priority(Enums.MessagePriority.Normal);
	this.readReceipt('');
	this.aDraftInfo = [];
	this.sMessageId = '';
	this.sInReplyTo = '';
	this.sReferences = '';

	this.parentUid(0);
	this.threads([]);
	this.threadsLen(0);
	this.hasUnseenSubMessage(false);
	this.hasFlaggedSubMessage(false);

	this.lastInCollapsedThread(false);
	this.lastInCollapsedThreadLoading(false);
};

MessageModel.prototype.computeSenderEmail = function ()
{
	var
		sSent = RL.data().sentFolder(),
		sDraft = RL.data().draftFolder()
	;

	this.senderEmailsString(this.folderFullNameRaw === sSent || this.folderFullNameRaw === sDraft ?
		this.toEmailsString() : this.fromEmailString());
};

/**
 * @param {AjaxJsonMessage} oJsonMessage
 * @return {boolean}
 */
MessageModel.prototype.initByJson = function (oJsonMessage)
{
	var bResult = false;
	if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
	{
		this.folderFullNameRaw = oJsonMessage.Folder;
		this.uid = oJsonMessage.Uid;
		this.hash = oJsonMessage.Hash;
		this.requestHash = oJsonMessage.RequestHash;
		
		this.size(Utils.pInt(oJsonMessage.Size));

		this.from = MessageModel.initEmailsFromJson(oJsonMessage.From);
		this.to = MessageModel.initEmailsFromJson(oJsonMessage.To);
		this.cc = MessageModel.initEmailsFromJson(oJsonMessage.Cc);
		this.bcc = MessageModel.initEmailsFromJson(oJsonMessage.Bcc);
		this.replyTo = MessageModel.initEmailsFromJson(oJsonMessage.ReplyTo);

		this.subject(oJsonMessage.Subject);
		this.dateTimeStampInUTC(Utils.pInt(oJsonMessage.DateTimeStampInUTC));
		this.hasAttachments(!!oJsonMessage.HasAttachments);
		this.attachmentsMainType(oJsonMessage.AttachmentsMainType);

		this.fromEmailString(MessageModel.emailsToLine(this.from, true));
		this.toEmailsString(MessageModel.emailsToLine(this.to, true));

		this.parentUid(Utils.pInt(oJsonMessage.ParentThread));
		this.threads(Utils.isArray(oJsonMessage.Threads) ? oJsonMessage.Threads : []);
		this.threadsLen(Utils.pInt(oJsonMessage.ThreadsLen));

		this.initFlagsByJson(oJsonMessage);
		this.computeSenderEmail();
		
		bResult = true;
	}

	return bResult;
};

/**
 * @param {AjaxJsonMessage} oJsonMessage
 * @return {boolean}
 */
MessageModel.prototype.initUpdateByMessageJson = function (oJsonMessage)
{
	var
		bResult = false,
		iPriority = Enums.MessagePriority.Normal
	;

	if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
	{
		iPriority = Utils.pInt(oJsonMessage.Priority);
		this.priority(-1 < Utils.inArray(iPriority, [Enums.MessagePriority.High, Enums.MessagePriority.Low]) ?
			iPriority : Enums.MessagePriority.Normal);

		this.aDraftInfo = oJsonMessage.DraftInfo;

		this.sMessageId = oJsonMessage.MessageId;
		this.sInReplyTo = oJsonMessage.InReplyTo;
		this.sReferences = oJsonMessage.References;

		if (RL.data().allowOpenPGP())
		{
			this.isPgpSigned(!!oJsonMessage.PgpSigned);
			this.isPgpEncrypted(!!oJsonMessage.PgpEncrypted);
		}

		this.hasAttachments(!!oJsonMessage.HasAttachments);
		this.attachmentsMainType(oJsonMessage.AttachmentsMainType);

		this.foundedCIDs = Utils.isArray(oJsonMessage.FoundedCIDs) ? oJsonMessage.FoundedCIDs : [];
		this.attachments(this.initAttachmentsFromJson(oJsonMessage.Attachments));

		this.readReceipt(oJsonMessage.ReadReceipt || '');

		this.computeSenderEmail();

		bResult = true;
	}

	return bResult;
};

/**
 * @param {(AjaxJsonAttachment|null)} oJsonAttachments
 * @return {Array}
 */
MessageModel.prototype.initAttachmentsFromJson = function (oJsonAttachments)
{
	var
		iIndex = 0,
		iLen = 0,
		oAttachmentModel = null,
		aResult = []
	;

	if (oJsonAttachments && 'Collection/AttachmentCollection' === oJsonAttachments['@Object'] &&
		Utils.isNonEmptyArray(oJsonAttachments['@Collection']))
	{
		for (iIndex = 0, iLen = oJsonAttachments['@Collection'].length; iIndex < iLen; iIndex++)
		{
			oAttachmentModel = AttachmentModel.newInstanceFromJson(oJsonAttachments['@Collection'][iIndex]);
			if (oAttachmentModel)
			{
				if ('' !== oAttachmentModel.cidWithOutTags && 0 < this.foundedCIDs.length &&
					0 <= Utils.inArray(oAttachmentModel.cidWithOutTags, this.foundedCIDs))
				{
					oAttachmentModel.isLinked = true;
				}

				aResult.push(oAttachmentModel);
			}
		}
	}

	return aResult;
};

/**
 * @param {AjaxJsonMessage} oJsonMessage
 * @return {boolean}
 */
MessageModel.prototype.initFlagsByJson = function (oJsonMessage)
{
	var bResult = false;

	if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
	{
		this.unseen(!oJsonMessage.IsSeen);
		this.flagged(!!oJsonMessage.IsFlagged);
		this.answered(!!oJsonMessage.IsAnswered);
		this.forwarded(!!oJsonMessage.IsForwarded);
		this.isReadReceipt(!!oJsonMessage.IsReadReceipt);

		bResult = true;
	}

	return bResult;
};

/**
 * @param {boolean} bFriendlyView
 * @param {boolean=} bWrapWithLink = false
 * @return {string}
 */
MessageModel.prototype.fromToLine = function (bFriendlyView, bWrapWithLink)
{
	return MessageModel.emailsToLine(this.from, bFriendlyView, bWrapWithLink);
};

/**
 * @param {boolean} bFriendlyView
 * @param {boolean=} bWrapWithLink = false
 * @return {string}
 */
MessageModel.prototype.toToLine = function (bFriendlyView, bWrapWithLink)
{
	return MessageModel.emailsToLine(this.to, bFriendlyView, bWrapWithLink);
};

/**
 * @param {boolean} bFriendlyView
 * @param {boolean=} bWrapWithLink = false
 * @return {string}
 */
MessageModel.prototype.ccToLine = function (bFriendlyView, bWrapWithLink)
{
	return MessageModel.emailsToLine(this.cc, bFriendlyView, bWrapWithLink);
};

/**
 * @param {boolean} bFriendlyView
 * @param {boolean=} bWrapWithLink = false
 * @return {string}
 */
MessageModel.prototype.bccToLine = function (bFriendlyView, bWrapWithLink)
{
	return MessageModel.emailsToLine(this.bcc, bFriendlyView, bWrapWithLink);
};

/**
 * @return string
 */
MessageModel.prototype.lineAsCcc = function ()
{
	var aResult = [];
	if (this.deleted())
	{
		aResult.push('deleted');
	}
	if (this.selected())
	{
		aResult.push('selected');
	}
	if (this.checked())
	{
		aResult.push('checked');
	}
	if (this.flagged())
	{
		aResult.push('flagged');
	}
	if (this.unseen())
	{
		aResult.push('unseen');
	}
	if (this.answered())
	{
		aResult.push('answered');
	}
	if (this.forwarded())
	{
		aResult.push('forwarded');
	}
	if (this.focused())
	{
		aResult.push('focused');
	}
	if (this.hasAttachments())
	{
		aResult.push('withAttachments');
		switch (this.attachmentsMainType())
		{
			case 'image':
				aResult.push('imageOnlyAttachments');
				break;
			case 'archive':
				aResult.push('archiveOnlyAttachments');
				break;
		}
	}
	if (this.newForAnimation())
	{
		aResult.push('new');
	}
	if ('' === this.subject())
	{
		aResult.push('emptySubject');
	}
	if (0 < this.parentUid())
	{
		aResult.push('hasParentMessage');
	}
	if (0 < this.threadsLen() && 0 === this.parentUid())
	{
		aResult.push('hasChildrenMessage');
	}
	if (this.hasUnseenSubMessage())
	{
		aResult.push('hasUnseenSubMessage');
	}
	if (this.hasFlaggedSubMessage())
	{
		aResult.push('hasFlaggedSubMessage');
	}

	return aResult.join(' ');
};

/**
 * @return {boolean}
 */
MessageModel.prototype.hasVisibleAttachments = function ()
{
	return !!_.find(this.attachments(), function (oAttachment) {
		return !oAttachment.isLinked;
	});
//	return 0 < this.attachments().length;
};

/**
 * @param {string} sCid
 * @return {*}
 */
MessageModel.prototype.findAttachmentByCid = function (sCid)
{
	var
		oResult = null,
		aAttachments = this.attachments()
	;

	if (Utils.isNonEmptyArray(aAttachments))
	{
		sCid = sCid.replace(/^<+/, '').replace(/>+$/, '');
		oResult = _.find(aAttachments, function (oAttachment) {
			return sCid === oAttachment.cidWithOutTags;
		});
	}

	return oResult || null;
};

/**
 * @param {string} sContentLocation
 * @return {*}
 */
MessageModel.prototype.findAttachmentByContentLocation = function (sContentLocation)
{
	var
		oResult = null,
		aAttachments = this.attachments()
	;

	if (Utils.isNonEmptyArray(aAttachments))
	{
		oResult = _.find(aAttachments, function (oAttachment) {
			return sContentLocation === oAttachment.contentLocation;
		});
	}

	return oResult || null;
};


/**
 * @return {string}
 */
MessageModel.prototype.messageId = function ()
{
	return this.sMessageId;
};

/**
 * @return {string}
 */
MessageModel.prototype.inReplyTo = function ()
{
	return this.sInReplyTo;
};

/**
 * @return {string}
 */
MessageModel.prototype.references = function ()
{
	return this.sReferences;
};

/**
 * @return {string}
 */
MessageModel.prototype.fromAsSingleEmail = function ()
{
	return Utils.isArray(this.from) && this.from[0] ? this.from[0].email : '';
};

/**
 * @return {string}
 */
MessageModel.prototype.viewLink = function ()
{
	return RL.link().messageViewLink(this.requestHash);
};

/**
 * @return {string}
 */
MessageModel.prototype.downloadLink = function ()
{
	return RL.link().messageDownloadLink(this.requestHash);
};

/**
 * @param {Object} oExcludeEmails
 * @return {Array}
 */
MessageModel.prototype.replyEmails = function (oExcludeEmails)
{
	var
		aResult = [],
		oUnic = Utils.isUnd(oExcludeEmails) ? {} : oExcludeEmails
	;

	MessageModel.replyHelper(this.replyTo, oUnic, aResult);
	if (0 === aResult.length)
	{
		MessageModel.replyHelper(this.from, oUnic, aResult);
	}

	return aResult;
};

/**
 * @param {Object} oExcludeEmails
 * @return {Array.<Array>}
 */
MessageModel.prototype.replyAllEmails = function (oExcludeEmails)
{
	var
		aToResult = [],
		aCcResult = [],
		oUnic = Utils.isUnd(oExcludeEmails) ? {} : oExcludeEmails
	;

	MessageModel.replyHelper(this.replyTo, oUnic, aToResult);
	if (0 === aToResult.length)
	{
		MessageModel.replyHelper(this.from, oUnic, aToResult);
	}

	MessageModel.replyHelper(this.to, oUnic, aToResult);
	MessageModel.replyHelper(this.cc, oUnic, aCcResult);

	return [aToResult, aCcResult];
};

/**
 * @return {string}
 */
MessageModel.prototype.textBodyToString = function ()
{
	return this.body ? this.body.html() : '';
};

/**
 * @return {string}
 */
MessageModel.prototype.attachmentsToStringLine = function ()
{
	var aAttachLines = _.map(this.attachments(), function (oItem) {
		return oItem.fileName + ' (' + oItem.friendlySize + ')';
	});

	return aAttachLines && 0 < aAttachLines.length ? aAttachLines.join(', ') : '';
};

/**
 * @return {Object}
 */
MessageModel.prototype.getDataForWindowPopup = function ()
{
	return {
		'popupFrom': this.fromToLine(false),
		'popupTo': this.toToLine(false),
		'popupCc': this.ccToLine(false),
		'popupBcc': this.bccToLine(false),
		'popupSubject': this.subject(),
		'popupDate': this.fullFormatDateValue(),
		'popupAttachments': this.attachmentsToStringLine(),
		'popupBody': this.textBodyToString()
	};
};

/**
 * @param {boolean=} bPrint = false
 */
MessageModel.prototype.viewPopupMessage = function (bPrint)
{
	Utils.windowPopupKnockout(this.getDataForWindowPopup(), 'PopupsWindowSimpleMessage', this.subject(), function (oPopupWin) {
		if (oPopupWin && oPopupWin.document && oPopupWin.document.body)
		{
			$('img.lazy', oPopupWin.document.body).each(function (iIndex, oImg) {

				var
					$oImg = $(oImg),
					sOrig = $oImg.data('original'),
					sSrc = $oImg.attr('src')
				;

				if (0 <= iIndex && sOrig && !sSrc)
				{
					$oImg.attr('src', sOrig);
				}
			});

			if (bPrint)
			{
				window.setTimeout(function () {
					oPopupWin.print();
				}, 100);
			}
		}
	});
};

MessageModel.prototype.printMessage = function ()
{
	this.viewPopupMessage(true);
};

/**
 * @returns {string}
 */
MessageModel.prototype.generateUid = function ()
{
	return this.folderFullNameRaw + '/' + this.uid;
};

/**
 * @param {MessageModel} oMessage
 * @return {MessageModel}
 */
MessageModel.prototype.populateByMessageListItem = function (oMessage)
{
	this.folderFullNameRaw = oMessage.folderFullNameRaw;
	this.uid = oMessage.uid;
	this.hash = oMessage.hash;
	this.requestHash = oMessage.requestHash;
	this.subject(oMessage.subject());
	this.size(oMessage.size());
	this.dateTimeStampInUTC(oMessage.dateTimeStampInUTC());
	this.priority(oMessage.priority());

	this.fromEmailString(oMessage.fromEmailString());
	this.toEmailsString(oMessage.toEmailsString());

	this.emails = oMessage.emails;

	this.from = oMessage.from;
	this.to = oMessage.to;
	this.cc = oMessage.cc;
	this.bcc = oMessage.bcc;
	this.replyTo = oMessage.replyTo;

	this.unseen(oMessage.unseen());
	this.flagged(oMessage.flagged());
	this.answered(oMessage.answered());
	this.forwarded(oMessage.forwarded());
	this.isReadReceipt(oMessage.isReadReceipt());

	this.selected(oMessage.selected());
	this.checked(oMessage.checked());
	this.hasAttachments(oMessage.hasAttachments());
	this.attachmentsMainType(oMessage.attachmentsMainType());

	this.moment(oMessage.moment());

	this.body = null;
//	this.isRtl(oMessage.isRtl());
//	this.isHtml(false);
//	this.hasImages(false);
//	this.attachments([]);

//	this.isPgpSigned(false);
//	this.isPgpEncrypted(false);

	this.priority(Enums.MessagePriority.Normal);
	this.aDraftInfo = [];
	this.sMessageId = '';
	this.sInReplyTo = '';
	this.sReferences = '';

	this.parentUid(oMessage.parentUid());
	this.threads(oMessage.threads());
	this.threadsLen(oMessage.threadsLen());

	this.computeSenderEmail();

	return this;
};

MessageModel.prototype.showExternalImages = function (bLazy)
{
	if (this.body && this.body.data('rl-has-images'))
	{
		bLazy = Utils.isUnd(bLazy) ? false : bLazy;

		this.hasImages(false);
		this.body.data('rl-has-images', false);

		$('[data-x-src]', this.body).each(function () {
			if (bLazy && $(this).is('img'))
			{
				$(this)
					.addClass('lazy')
					.attr('data-original', $(this).attr('data-x-src'))
					.removeAttr('data-x-src')
				;
			}
			else
			{
				$(this).attr('src', $(this).attr('data-x-src')).removeAttr('data-x-src');
			}
		});

		$('[data-x-style-url]', this.body).each(function () {
			var sStyle = Utils.trim($(this).attr('style'));
			sStyle = '' === sStyle ? '' : (';' === sStyle.substr(-1) ? sStyle + ' ' : sStyle + '; ');
			$(this).attr('style', sStyle + $(this).attr('data-x-style-url')).removeAttr('data-x-style-url');
		});

		if (bLazy)
		{
			$('img.lazy', this.body).addClass('lazy-inited').lazyload({
				'threshold' : 400,
				'effect' : 'fadeIn',
				'skip_invisible' : false,
				'container': $('.RL-MailMessageView .messageView .messageItem .content')[0]
			});

			$window.resize();
		}

		Utils.windowResize(500);
	}
};

MessageModel.prototype.showInternalImages = function (bLazy)
{
	if (this.body && !this.body.data('rl-init-internal-images'))
	{
		this.body.data('rl-init-internal-images', true);

		bLazy = Utils.isUnd(bLazy) ? false : bLazy;

		var self = this;
		
		$('[data-x-src-cid]', this.body).each(function () {

			var oAttachment = self.findAttachmentByCid($(this).attr('data-x-src-cid'));
			if (oAttachment && oAttachment.download)
			{
				if (bLazy && $(this).is('img'))
				{
					$(this)
						.addClass('lazy')
						.attr('data-original', oAttachment.linkPreview());
				}
				else
				{
					$(this).attr('src', oAttachment.linkPreview());
				}
			}
		});
		
		$('[data-x-src-location]', this.body).each(function () {

			var oAttachment = self.findAttachmentByContentLocation($(this).attr('data-x-src-location'));
			if (!oAttachment)
			{
				oAttachment = self.findAttachmentByCid($(this).attr('data-x-src-location'));
			}
			
			if (oAttachment && oAttachment.download)
			{
				if (bLazy && $(this).is('img'))
				{
					$(this)
						.addClass('lazy')
						.attr('data-original', oAttachment.linkPreview());
				}
				else
				{
					$(this).attr('src', oAttachment.linkPreview());
				}
			}
		});

		$('[data-x-style-cid]', this.body).each(function () {

			var
				sStyle = '',
				sName = '',
				oAttachment = self.findAttachmentByCid($(this).attr('data-x-style-cid'))
			;

			if (oAttachment && oAttachment.linkPreview)
			{
				sName = $(this).attr('data-x-style-cid-name');
				if ('' !== sName)
				{
					sStyle = Utils.trim($(this).attr('style'));
					sStyle = '' === sStyle ? '' : (';' === sStyle.substr(-1) ? sStyle + ' ' : sStyle + '; ');
					$(this).attr('style', sStyle + sName + ': url(\'' + oAttachment.linkPreview() + '\')');
				}
			}
		});

		if (bLazy)
		{
			(function ($oImg, oContainer) {
				_.delay(function () {
					$oImg.addClass('lazy-inited').lazyload({
						'threshold' : 400,
						'effect' : 'fadeIn',
						'skip_invisible' : false,
						'container': oContainer
					});
				}, 300);
			}($('img.lazy', self.body), $('.RL-MailMessageView .messageView .messageItem .content')[0]));
		}

		Utils.windowResize(500);
	}
};

MessageModel.prototype.storeDataToDom = function ()
{
	if (this.body)
	{
		this.body.data('rl-is-rtl', !!this.isRtl());
		this.body.data('rl-is-html', !!this.isHtml());
		this.body.data('rl-has-images', !!this.hasImages());

		this.body.data('rl-plain-raw', this.plainRaw);

		if (RL.data().allowOpenPGP())
		{
			this.body.data('rl-plain-pgp-signed', !!this.isPgpSigned());
			this.body.data('rl-plain-pgp-encrypted', !!this.isPgpEncrypted());
			this.body.data('rl-pgp-verify-status', this.pgpSignedVerifyStatus());
			this.body.data('rl-pgp-verify-user', this.pgpSignedVerifyUser());
		}
	}
};

MessageModel.prototype.storePgpVerifyDataToDom = function ()
{
	if (this.body && RL.data().allowOpenPGP())
	{
		this.body.data('rl-pgp-verify-status', this.pgpSignedVerifyStatus());
		this.body.data('rl-pgp-verify-user', this.pgpSignedVerifyUser());
	}
};

MessageModel.prototype.fetchDataToDom = function ()
{
	if (this.body)
	{
		this.isRtl(!!this.body.data('rl-is-rtl'));
		this.isHtml(!!this.body.data('rl-is-html'));
		this.hasImages(!!this.body.data('rl-has-images'));
		
		this.plainRaw = Utils.pString(this.body.data('rl-plain-raw'));

		if (RL.data().allowOpenPGP())
		{
			this.isPgpSigned(!!this.body.data('rl-plain-pgp-signed'));
			this.isPgpEncrypted(!!this.body.data('rl-plain-pgp-encrypted'));
			this.pgpSignedVerifyStatus(this.body.data('rl-pgp-verify-status'));
			this.pgpSignedVerifyUser(this.body.data('rl-pgp-verify-user'));
		}
		else
		{
			this.isPgpSigned(false);
			this.isPgpEncrypted(false);
			this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.None);
			this.pgpSignedVerifyUser('');
		}
	}
};

MessageModel.prototype.verifyPgpSignedClearMessage = function ()
{
	if (this.isPgpSigned())
	{
		var
			aRes = [],
			mPgpMessage = null,
			sFrom = this.from && this.from[0] && this.from[0].email ? this.from[0].email : '',
			aPublicKeys = RL.data().findPublicKeysByEmail(sFrom),
			oValidKey = null,
			oValidSysKey = null,
			sPlain = ''
		;

		this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Error);
		this.pgpSignedVerifyUser('');

		try
		{
			mPgpMessage = window.openpgp.cleartext.readArmored(this.plainRaw);
			if (mPgpMessage && mPgpMessage.getText)
			{
				this.pgpSignedVerifyStatus(
					aPublicKeys.length ? Enums.SignedVerifyStatus.Unverified : Enums.SignedVerifyStatus.UnknownPublicKeys);

				aRes = mPgpMessage.verify(aPublicKeys);
				if (aRes && 0 < aRes.length)
				{
					oValidKey = _.find(aRes, function (oItem) {
						return oItem && oItem.keyid && oItem.valid;
					});

					if (oValidKey)
					{
						oValidSysKey = RL.data().findPublicKeyByHex(oValidKey.keyid.toHex());
						if (oValidSysKey)
						{
							sPlain = mPgpMessage.getText();
							
							this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Success);
							this.pgpSignedVerifyUser(oValidSysKey.user);

							sPlain =
								$proxyDiv.empty().append(
									$('<pre class="b-plain-openpgp signed verified"></pre>').text(sPlain)
								).html()
							;

							$proxyDiv.empty();

							this.replacePlaneTextBody(sPlain);
						}
					}
				}
			}
		}
		catch (oExc) {}

		this.storePgpVerifyDataToDom();
	}
};

MessageModel.prototype.decryptPgpEncryptedMessage = function (sPassword)
{
	if (this.isPgpEncrypted())
	{
		var
			aRes = [],
			mPgpMessage = null,
			mPgpMessageDecrypted = null,
			sFrom = this.from && this.from[0] && this.from[0].email ? this.from[0].email : '',
			aPublicKey = RL.data().findPublicKeysByEmail(sFrom),
			oPrivateKey = RL.data().findSelfPrivateKey(sPassword),
			oValidKey = null,
			oValidSysKey = null,
			sPlain = ''
		;

		this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Error);
		this.pgpSignedVerifyUser('');

		if (!oPrivateKey)
		{
			this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.UnknownPrivateKey);
		}

		try
		{
			mPgpMessage = window.openpgp.message.readArmored(this.plainRaw);
			if (mPgpMessage && oPrivateKey && mPgpMessage.decrypt)
			{
				this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Unverified);

				mPgpMessageDecrypted = mPgpMessage.decrypt(oPrivateKey);
				if (mPgpMessageDecrypted)
				{
					aRes = mPgpMessageDecrypted.verify(aPublicKey);
					if (aRes && 0 < aRes.length)
					{
						oValidKey = _.find(aRes, function (oItem) {
							return oItem && oItem.keyid && oItem.valid;
						});

						if (oValidKey)
						{
							oValidSysKey = RL.data().findPublicKeyByHex(oValidKey.keyid.toHex());
							if (oValidSysKey)
							{
								this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Success);
								this.pgpSignedVerifyUser(oValidSysKey.user);
							}
						}
					}

					sPlain = mPgpMessageDecrypted.getText();

					sPlain =
						$proxyDiv.empty().append(
							$('<pre class="b-plain-openpgp signed verified"></pre>').text(sPlain)
						).html()
					;

					$proxyDiv.empty();

					this.replacePlaneTextBody(sPlain);
				}
			}
		}
		catch (oExc) {}

		this.storePgpVerifyDataToDom();
	}
};

MessageModel.prototype.replacePlaneTextBody = function (sPlain)
{
	if (this.body)
	{
		this.body.html(sPlain).addClass('b-text-part plain');
	}
};

/**
 * @return {string}
 */
MessageModel.prototype.flagHash = function ()
{
	return [this.deleted(), this.unseen(), this.flagged(), this.answered(), this.forwarded(),
		this.isReadReceipt()].join('');
};

/**
 * @constructor
 */
function FolderModel()
{
	this.name = ko.observable('');
	this.fullName = '';
	this.fullNameRaw = '';
	this.fullNameHash = '';
	this.delimiter = '';
	this.namespace = '';
	this.deep = 0;

	this.selectable = false;
	this.existen = true;

	this.isNamespaceFolder = false;
	this.isGmailFolder = false;
	this.isUnpaddigFolder = false;

	this.interval = 0;

	this.type = ko.observable(Enums.FolderType.User);

	this.focused = ko.observable(false);
	this.selected = ko.observable(false);
	this.edited = ko.observable(false);
	this.collapsed = ko.observable(true);
	this.subScribed = ko.observable(true);
	this.subFolders = ko.observableArray([]);
	this.deleteAccess = ko.observable(false);
	this.actionBlink = ko.observable(false).extend({'falseTimeout': 1000});
	
	this.nameForEdit = ko.observable('');
	
	this.name.subscribe(function (sValue) {
		this.nameForEdit(sValue);
	}, this);
	
	this.edited.subscribe(function (bValue) {
		if (bValue)
		{
			this.nameForEdit(this.name());
		}
	}, this);
	
	this.privateMessageCountAll = ko.observable(0);
	this.privateMessageCountUnread = ko.observable(0);

	this.collapsedPrivate = ko.observable(true);
}

/**
 * @static
 * @param {AjaxJsonFolder} oJsonFolder
 * @return {?FolderModel}
 */
FolderModel.newInstanceFromJson = function (oJsonFolder)
{
	var oFolderModel = new FolderModel();
	return oFolderModel.initByJson(oJsonFolder) ? oFolderModel.initComputed() : null;
};

/**
 * @return {FolderModel}
 */
FolderModel.prototype.initComputed = function ()
{
	this.hasSubScribedSubfolders = ko.computed(function () {
		return !!_.find(this.subFolders(), function (oFolder) {
			return oFolder.subScribed();
		});
	}, this);

	this.canBeEdited = ko.computed(function () {
		return Enums.FolderType.User === this.type() && this.existen && this.selectable;
	}, this);

	this.visible = ko.computed(function () {
		var
			bSubScribed = this.subScribed(),
			bSubFolders = this.hasSubScribedSubfolders()
		;

		return (bSubScribed || (bSubFolders && (!this.existen || !this.selectable)));
	}, this);

	this.isSystemFolder = ko.computed(function () {
		return Enums.FolderType.User !== this.type();
	}, this);

	this.hidden = ko.computed(function () {
		var
			bSystem = this.isSystemFolder(),
			bSubFolders = this.hasSubScribedSubfolders()
		;

		return this.isGmailFolder || (bSystem && this.isNamespaceFolder) || (bSystem && !bSubFolders);
	}, this);

	this.selectableForFolderList = ko.computed(function () {
		return !this.isSystemFolder() && this.selectable;
	}, this);

	this.messageCountAll = ko.computed({
		'read': this.privateMessageCountAll,
		'write': function (iValue) {
			if (Utils.isPosNumeric(iValue, true))
			{
				this.privateMessageCountAll(iValue);
			}
			else
			{
				this.privateMessageCountAll.valueHasMutated();
			}
		},
		'owner': this
	});

	this.messageCountUnread = ko.computed({
		'read': this.privateMessageCountUnread,
		'write': function (iValue) {
			if (Utils.isPosNumeric(iValue, true))
			{
				this.privateMessageCountUnread(iValue);
			}
			else
			{
				this.privateMessageCountUnread.valueHasMutated();
			}
		},
		'owner': this
	});

	this.printableUnreadCount = ko.computed(function () {
		var 
			iCount = this.messageCountAll(),
			iUnread = this.messageCountUnread(),
			iType = this.type()
		;

		if (Enums.FolderType.Inbox === iType)
		{
			RL.data().foldersInboxUnreadCount(iUnread);
		}

		if (0 < iCount)
		{
			if (Enums.FolderType.Draft === iType)
			{
				return '' + iCount;
			}
			else if (0 < iUnread && Enums.FolderType.Trash !== iType && Enums.FolderType.Archive !== iType && Enums.FolderType.SentItems !== iType)
			{
				return '' + iUnread;
			}
		}

		return '';

	}, this);

	this.canBeDeleted = ko.computed(function () {
		var
			bSystem = this.isSystemFolder()
		;
		return !bSystem && 0 === this.subFolders().length && 'INBOX' !== this.fullNameRaw;
	}, this);

	this.canBeSubScribed = ko.computed(function () {
		return !this.isSystemFolder() && this.selectable && 'INBOX' !== this.fullNameRaw;
	}, this);

	this.visible.subscribe(function () {
		Utils.timeOutAction('folder-list-folder-visibility-change', function () {
			$window.trigger('folder-list-folder-visibility-change');
		}, 100);
	});

	this.localName = ko.computed(function () {

		Globals.langChangeTrigger();

		var
			iType = this.type(),
			sName = this.name()
		;

		if (this.isSystemFolder())
		{
			switch (iType)
			{
				case Enums.FolderType.Inbox:
					sName = Utils.i18n('FOLDER_LIST/INBOX_NAME');
					break;
				case Enums.FolderType.SentItems:
					sName = Utils.i18n('FOLDER_LIST/SENT_NAME');
					break;
				case Enums.FolderType.Draft:
					sName = Utils.i18n('FOLDER_LIST/DRAFTS_NAME');
					break;
				case Enums.FolderType.Spam:
					sName = Utils.i18n('FOLDER_LIST/SPAM_NAME');
					break;
				case Enums.FolderType.Trash:
					sName = Utils.i18n('FOLDER_LIST/TRASH_NAME');
					break;
				case Enums.FolderType.Archive:
					sName = Utils.i18n('FOLDER_LIST/ARCHIVE_NAME');
					break;
			}
		}

		return sName;
		
	}, this);

	this.manageFolderSystemName = ko.computed(function () {

		Globals.langChangeTrigger();
		
		var
			sSuffix = '',
			iType = this.type(),
			sName = this.name()
		;

		if (this.isSystemFolder())
		{
			switch (iType)
			{
				case Enums.FolderType.Inbox:
					sSuffix = '(' + Utils.i18n('FOLDER_LIST/INBOX_NAME') + ')';
					break;
				case Enums.FolderType.SentItems:
					sSuffix = '(' + Utils.i18n('FOLDER_LIST/SENT_NAME') + ')';
					break;
				case Enums.FolderType.Draft:
					sSuffix = '(' + Utils.i18n('FOLDER_LIST/DRAFTS_NAME') + ')';
					break;
				case Enums.FolderType.Spam:
					sSuffix = '(' + Utils.i18n('FOLDER_LIST/SPAM_NAME') + ')';
					break;
				case Enums.FolderType.Trash:
					sSuffix = '(' + Utils.i18n('FOLDER_LIST/TRASH_NAME') + ')';
					break;
				case Enums.FolderType.Archive:
					sSuffix = '(' + Utils.i18n('FOLDER_LIST/ARCHIVE_NAME') + ')';
					break;
			}
		}

		if ('' !== sSuffix && '(' + sName + ')' === sSuffix || '(inbox)' === sSuffix.toLowerCase())
		{
			sSuffix = '';
		}

		return sSuffix;
		
	}, this);

	this.collapsed = ko.computed({
		'read': function () {
			return !this.hidden() && this.collapsedPrivate();
		},
		'write': function (mValue) {
			this.collapsedPrivate(mValue);
		},
		'owner': this
	});

	this.hasUnreadMessages = ko.computed(function () {
		return 0 < this.messageCountUnread();
	}, this);

	this.hasSubScribedUnreadMessagesSubfolders = ko.computed(function () {
		return !!_.find(this.subFolders(), function (oFolder) {
			return oFolder.hasUnreadMessages() || oFolder.hasSubScribedUnreadMessagesSubfolders();
		});
	}, this);

	return this;
};

FolderModel.prototype.fullName = '';
FolderModel.prototype.fullNameRaw = '';
FolderModel.prototype.fullNameHash = '';
FolderModel.prototype.delimiter = '';
FolderModel.prototype.namespace = '';
FolderModel.prototype.deep = 0;
FolderModel.prototype.interval = 0;

FolderModel.prototype.isNamespaceFolder = false;
FolderModel.prototype.isGmailFolder = false;
FolderModel.prototype.isUnpaddigFolder = false;

/**
 * @return {string}
 */
FolderModel.prototype.collapsedCss = function ()
{
	return this.hasSubScribedSubfolders() ? 
		(this.collapsed() ? 'icon-right-mini e-collapsed-sign' : 'icon-down-mini e-collapsed-sign') : 'icon-none e-collapsed-sign';
};

/**
 * @param {AjaxJsonFolder} oJsonFolder
 * @return {boolean}
 */
FolderModel.prototype.initByJson = function (oJsonFolder)
{
	var bResult = false;
	if (oJsonFolder && 'Object/Folder' === oJsonFolder['@Object'])
	{
		this.name(oJsonFolder.Name);
		this.delimiter = oJsonFolder.Delimiter;
		this.fullName = oJsonFolder.FullName;
		this.fullNameRaw = oJsonFolder.FullNameRaw;
		this.fullNameHash = oJsonFolder.FullNameHash;
		this.deep = oJsonFolder.FullNameRaw.split(this.delimiter).length - 1;
		this.selectable = !!oJsonFolder.IsSelectable;
		this.existen = !!oJsonFolder.IsExisten;

		this.subScribed(!!oJsonFolder.IsSubscribed);
		this.type('INBOX' === this.fullNameRaw ? Enums.FolderType.Inbox : Enums.FolderType.User);

		bResult = true;
	}

	return bResult;
};

/**
 * @return {string}
 */
FolderModel.prototype.printableFullName = function ()
{
	return this.fullName.split(this.delimiter).join(' / ');
};

/**
 * @param {string} sEmail
 * @param {boolean=} bCanBeDelete = true
 * @constructor
 */
function AccountModel(sEmail, bCanBeDelete)
{
	this.email = sEmail;
	this.deleteAccess = ko.observable(false);
	this.canBeDalete = ko.observable(bCanBeDelete);
}

AccountModel.prototype.email = '';

/**
 * @return {string}
 */
AccountModel.prototype.changeAccountLink = function ()
{
	return RL.link().change(this.email);
};
/**
 * @param {string} sId
 * @param {string} sEmail
 * @param {boolean=} bCanBeDelete = true
 * @constructor
 */
function IdentityModel(sId, sEmail, bCanBeDelete)
{
	this.id = sId;
	this.email = ko.observable(sEmail);
	this.name = ko.observable('');
	this.replyTo = ko.observable('');
	this.bcc = ko.observable('');

	this.deleteAccess = ko.observable(false);
	this.canBeDalete = ko.observable(bCanBeDelete);
}

IdentityModel.prototype.formattedName = function ()
{
	var sName = this.name();
	return '' === sName ? this.email() : sName + ' <' + this.email() + '>';
};

IdentityModel.prototype.formattedNameForCompose = function ()
{
	var sName = this.name();
	return '' === sName ? this.email() : sName + ' (' + this.email() + ')';
};

IdentityModel.prototype.formattedNameForEmail = function ()
{
	var sName = this.name();
	return '' === sName ? this.email() : '"' + Utils.quoteName(sName) + '" <' + this.email() + '>';
};

/**
 * @param {string} iIndex
 * @param {string} sGuID
 * @param {string} sID
 * @param {string} sUserID
 * @param {string} sEmail
 * @param {boolean} bIsPrivate
 * @param {string} sArmor
 * @constructor
 */
function OpenPgpKeyModel(iIndex, sGuID, sID, sUserID, sEmail, bIsPrivate, sArmor)
{
	this.index = iIndex;
	this.id = sID;
	this.guid = sGuID;
	this.user = sUserID;
	this.email = sEmail;
	this.armor = sArmor;
	this.isPrivate = !!bIsPrivate;
	
	this.deleteAccess = ko.observable(false);
}

OpenPgpKeyModel.prototype.index = 0;
OpenPgpKeyModel.prototype.id = '';
OpenPgpKeyModel.prototype.guid = '';
OpenPgpKeyModel.prototype.user = '';
OpenPgpKeyModel.prototype.email = '';
OpenPgpKeyModel.prototype.armor = '';
OpenPgpKeyModel.prototype.isPrivate = false;

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsFolderClearViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderClear');
	
	this.selectedFolder = ko.observable(null);
	this.clearingProcess = ko.observable(false);
	this.clearingError = ko.observable('');

	this.folderFullNameForClear = ko.computed(function () {
		var oFolder = this.selectedFolder();
		return oFolder ? oFolder.printableFullName() : '';
	}, this);

	this.folderNameForClear = ko.computed(function () {
		var oFolder = this.selectedFolder();
		return oFolder ? oFolder.localName() : '';
	}, this);
	
	this.dangerDescHtml = ko.computed(function () {
		return Utils.i18n('POPUPS_CLEAR_FOLDER/DANGER_DESC_HTML_1', {
			'FOLDER': this.folderNameForClear()
		});
	}, this);

	this.clearCommand = Utils.createCommand(this, function () {

		var
			self = this,
			oFolderToClear = this.selectedFolder()
		;

		if (oFolderToClear)
		{
			RL.data().message(null);
			RL.data().messageList([]);

			this.clearingProcess(true);

			RL.cache().setFolderHash(oFolderToClear.fullNameRaw, '');
			RL.remote().folderClear(function (sResult, oData) {
				
				self.clearingProcess(false);
				if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
				{
					RL.reloadMessageList(true);
					self.cancelCommand();
				}
				else
				{
					if (oData && oData.ErrorCode)
					{
						self.clearingError(Utils.getNotification(oData.ErrorCode));
					}
					else
					{
						self.clearingError(Utils.getNotification(Enums.Notification.MailServerError));
					}
				}
			}, oFolderToClear.fullNameRaw);
		}

	}, function () {

		var
			oFolder = this.selectedFolder(),
			bIsClearing = this.clearingProcess()
		;

		return !bIsClearing && null !== oFolder;

	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsFolderClearViewModel', PopupsFolderClearViewModel);

PopupsFolderClearViewModel.prototype.clearPopup = function ()
{
	this.clearingProcess(false);
	this.selectedFolder(null);
};

PopupsFolderClearViewModel.prototype.onShow = function (oFolder)
{
	this.clearPopup();
	if (oFolder)
	{
		this.selectedFolder(oFolder);
	}
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsFolderCreateViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderCreate');

	Utils.initOnStartOrLangChange(function () {
		this.sNoParentText = Utils.i18n('POPUPS_CREATE_FOLDER/SELECT_NO_PARENT');
	}, this);

	this.folderName = ko.observable('');
	this.folderName.focused = ko.observable(false);

	this.selectedParentValue = ko.observable(Consts.Values.UnuseOptionValue);

	this.parentFolderSelectList = ko.computed(function () {

		var
			oData = RL.data(),
			aTop = [],
			fDisableCallback = null,
			fVisibleCallback = null,
			aList = oData.folderList(),
			fRenameCallback = function (oItem) {
				return oItem ? (oItem.isSystemFolder() ? oItem.name() + ' ' + oItem.manageFolderSystemName() : oItem.name()) : '';
			}
		;

		aTop.push(['', this.sNoParentText]);
		
		if ('' !== oData.namespace)
		{
			fDisableCallback = function (oItem)
			{
				return oData.namespace !== oItem.fullNameRaw.substr(0, oData.namespace.length);
			};
		}

		return RL.folderListOptionsBuilder([], aList, [], aTop, null, fDisableCallback, fVisibleCallback, fRenameCallback);

	}, this);
	
	// commands
	this.createFolder = Utils.createCommand(this, function () {

		var 
			oData = RL.data(),
			sParentFolderName = this.selectedParentValue()
		;
		
		if ('' === sParentFolderName && 1 < oData.namespace.length)
		{
			sParentFolderName = oData.namespace.substr(0, oData.namespace.length - 1);
		}

		oData.foldersCreating(true);
		RL.remote().folderCreate(function (sResult, oData) {
			
			RL.data().foldersCreating(false);
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				RL.folders();
			}
			else
			{
				RL.data().foldersListError(
					oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_CREATE_FOLDER'));
			}
			
		},	this.folderName(), sParentFolderName);
		
		this.cancelCommand();

	}, function () {
		return this.simpleFolderNameValidation(this.folderName());
	});

	this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsFolderCreateViewModel', PopupsFolderCreateViewModel);

PopupsFolderCreateViewModel.prototype.sNoParentText = '';

PopupsFolderCreateViewModel.prototype.simpleFolderNameValidation = function (sName)
{
	return (/^[^\\\/]+$/g).test(Utils.trim(sName));
};

PopupsFolderCreateViewModel.prototype.clearPopup = function ()
{
	this.folderName('');
	this.selectedParentValue('');
	this.folderName.focused(false);
};

PopupsFolderCreateViewModel.prototype.onShow = function ()
{
	this.clearPopup();
};

PopupsFolderCreateViewModel.prototype.onFocus = function ()
{
	this.folderName.focused(true);
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsFolderSystemViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderSystem');

	Utils.initOnStartOrLangChange(function () {
		this.sChooseOnText = Utils.i18n('POPUPS_SYSTEM_FOLDERS/SELECT_CHOOSE_ONE');
		this.sUnuseText = Utils.i18n('POPUPS_SYSTEM_FOLDERS/SELECT_UNUSE_NAME');
	}, this);

	this.notification = ko.observable('');

	this.folderSelectList = ko.computed(function () {
		return RL.folderListOptionsBuilder([], RL.data().folderList(), RL.data().folderListSystemNames(), [
			['', this.sChooseOnText],
			[Consts.Values.UnuseOptionValue, this.sUnuseText]
		]);
	}, this);
	
	var
		oData = RL.data(),
		self = this,
		fSaveSystemFolders = null,
		fCallback = null
	;
		
	this.sentFolder = oData.sentFolder;
	this.draftFolder = oData.draftFolder;
	this.spamFolder = oData.spamFolder;
	this.trashFolder = oData.trashFolder;
	this.archiveFolder = oData.archiveFolder;
	
	fSaveSystemFolders = _.debounce(function () {

		RL.settingsSet('SentFolder', self.sentFolder());
		RL.settingsSet('DraftFolder', self.draftFolder());
		RL.settingsSet('SpamFolder', self.spamFolder());
		RL.settingsSet('TrashFolder', self.trashFolder());
		RL.settingsSet('ArchiveFolder', self.archiveFolder());

		RL.remote().saveSystemFolders(Utils.emptyFunction, {
			'SentFolder': self.sentFolder(),
			'DraftFolder': self.draftFolder(),
			'SpamFolder': self.spamFolder(),
			'TrashFolder': self.trashFolder(),
			'ArchiveFolder': self.archiveFolder(),
			'NullFolder': 'NullFolder'
		});
		
	}, 1000);

	fCallback = function () {

		RL.settingsSet('SentFolder', self.sentFolder());
		RL.settingsSet('DraftFolder', self.draftFolder());
		RL.settingsSet('SpamFolder', self.spamFolder());
		RL.settingsSet('TrashFolder', self.trashFolder());
		RL.settingsSet('ArchiveFolder', self.archiveFolder());

		fSaveSystemFolders();
	};

	this.sentFolder.subscribe(fCallback);
	this.draftFolder.subscribe(fCallback);
	this.spamFolder.subscribe(fCallback);
	this.trashFolder.subscribe(fCallback);
	this.archiveFolder.subscribe(fCallback);

	this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsFolderSystemViewModel', PopupsFolderSystemViewModel);

PopupsFolderSystemViewModel.prototype.sChooseOnText = '';
PopupsFolderSystemViewModel.prototype.sUnuseText = '';

/**
 * @param {number=} iNotificationType = Enums.SetSystemFoldersNotification.None
 */
PopupsFolderSystemViewModel.prototype.onShow = function (iNotificationType)
{
	var sNotification = '';

	iNotificationType = Utils.isUnd(iNotificationType) ? Enums.SetSystemFoldersNotification.None : iNotificationType;

	switch (iNotificationType)
	{
		case Enums.SetSystemFoldersNotification.Sent:
			sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SENT');
			break;
		case Enums.SetSystemFoldersNotification.Draft:
			sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_DRAFTS');
			break;
		case Enums.SetSystemFoldersNotification.Spam:
			sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SPAM');
			break;
		case Enums.SetSystemFoldersNotification.Trash:
			sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_TRASH');
			break;
		case Enums.SetSystemFoldersNotification.Archive:
			sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_ARCHIVE');
			break;
	}

	this.notification(sNotification);
};


/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsComposeViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsCompose');

	this.oEditor = null;
	this.aDraftInfo = null;
	this.sInReplyTo = '';
	this.bFromDraft = false;
	this.bSkipNext = false;
	this.sReferences = '';
	
	this.bAllowIdentities = RL.settingsGet('AllowIdentities');

	var
		self = this,
		oRainLoopData = RL.data(),
		fCcAndBccCheckHelper = function (aValue) {
			if (false === self.showCcAndBcc() && 0 < aValue.length)
			{
				self.showCcAndBcc(true);
			}
		}
	;

	this.allowOpenPGP = oRainLoopData.allowOpenPGP;

	this.resizer = ko.observable(false).extend({'throttle': 50});

	this.identitiesDropdownTrigger = ko.observable(false);

	this.to = ko.observable('');
	this.to.focusTrigger = ko.observable(false);
	this.cc = ko.observable('');
	this.bcc = ko.observable('');

	this.replyTo = ko.observable('');
	this.subject = ko.observable('');
	this.isHtml = ko.observable(false);

	this.requestReadReceipt = ko.observable(false);

	this.sendError = ko.observable(false);
	this.sendSuccessButSaveError = ko.observable(false);
	this.savedError = ko.observable(false);

	this.savedTime = ko.observable(0);
	this.savedOrSendingText = ko.observable('');

	this.emptyToError = ko.observable(false);
	this.showCcAndBcc = ko.observable(false);

	this.cc.subscribe(fCcAndBccCheckHelper, this);
	this.bcc.subscribe(fCcAndBccCheckHelper, this);

	this.draftFolder = ko.observable('');
	this.draftUid = ko.observable('');
	this.sending = ko.observable(false);
	this.saving = ko.observable(false);
	this.attachments = ko.observableArray([]);

	this.attachmentsInProcess = this.attachments.filter(function (oItem) {
		return oItem && '' === oItem.tempName();
	});

	this.attachmentsInReady = this.attachments.filter(function (oItem) {
		return oItem && '' !== oItem.tempName();
	});

	this.attachments.subscribe(function () {
		this.triggerForResize();
	}, this);

	this.isDraftFolderMessage = ko.computed(function () {
		return '' !== this.draftFolder() && '' !== this.draftUid();
	}, this);

	this.composeUploaderButton = ko.observable(null);
	this.composeUploaderDropPlace = ko.observable(null);
	this.dragAndDropEnabled = ko.observable(false);
	this.dragAndDropOver = ko.observable(false).extend({'throttle': 1});
	this.dragAndDropVisible = ko.observable(false).extend({'throttle': 1});
	this.attacheMultipleAllowed = ko.observable(false);
	this.addAttachmentEnabled = ko.observable(false);

	this.composeEditorArea = ko.observable(null);

	this.identities = RL.data().identities;

	this.currentIdentityID = ko.observable('');
	
	this.currentIdentityString = ko.observable('');
	this.currentIdentityResultEmail = ko.observable('');

	this.identitiesOptions = ko.computed(function () {
		
		var aList = [{
			'optValue': oRainLoopData.accountEmail(),
			'optText': this.formattedFrom(false)
		}];

		_.each(oRainLoopData.identities(), function (oItem) {
			aList.push({
				'optValue': oItem.id,
				'optText': oItem.formattedNameForCompose()
			});
		});

		return aList;
		
	}, this);
	
	ko.computed(function () {
		
		var
			sResult = '',
			sResultEmail = '',
			oItem = null,
			aList = this.identities(),
			sID = this.currentIdentityID()
		;

		if (this.bAllowIdentities && sID && sID !== RL.data().accountEmail())
		{
			oItem = _.find(aList, function (oItem) {
				return oItem && sID === oItem['id'];
			});

			sResult = oItem ? oItem.formattedNameForCompose() : '';
			sResultEmail = oItem ? oItem.formattedNameForEmail() : '';

			if ('' === sResult && aList[0])
			{
				this.currentIdentityID(aList[0]['id']);
				return '';
			}
		}

		if ('' === sResult)
		{
			sResult = this.formattedFrom(false);
			sResultEmail = this.formattedFrom(true);
		}

		this.currentIdentityString(sResult);
		this.currentIdentityResultEmail(sResultEmail);
		
		return sResult;

	}, this);

	this.to.subscribe(function (sValue) {
		if (this.emptyToError() && 0 < sValue.length)
		{
			this.emptyToError(false);
		}
	}, this);

	this.editorResizeThrottle = _.throttle(_.bind(this.editorResize, this), 100);

	this.resizer.subscribe(function () {
		this.editorResizeThrottle();
	}, this);
	
	this.canBeSended = ko.computed(function () {
		return !this.sending() &&
			!this.saving() &&
			0 === this.attachmentsInProcess().length &&
			0 < this.to().length
		;
	}, this);

	this.canBeSendedOrSaved = ko.computed(function () {
		return !this.sending() && !this.saving();
	}, this);

	this.deleteCommand = Utils.createCommand(this, function () {
		
		RL.deleteMessagesFromFolderWithoutCheck(this.draftFolder(), [this.draftUid()]);
		kn.hideScreenPopup(PopupsComposeViewModel);
		
	}, function () {
		return this.isDraftFolderMessage();
	});

	this.sendMessageResponse = _.bind(this.sendMessageResponse, this);
	this.saveMessageResponse = _.bind(this.saveMessageResponse, this);

	this.sendCommand = Utils.createCommand(this, function () {
		var
			sTo = Utils.trim(this.to()),
			sSentFolder = RL.data().sentFolder(),
			aFlagsCache = []
		;

		if (0 === sTo.length)
		{
			this.emptyToError(true);
		}
		else
		{
			if (RL.data().replySameFolder())
			{
				if (Utils.isArray(this.aDraftInfo) && 3 === this.aDraftInfo.length && Utils.isNormal(this.aDraftInfo[2]) && 0 < this.aDraftInfo[2].length)
				{
					sSentFolder = this.aDraftInfo[2];
				}
			}

			if ('' === sSentFolder)
			{
				kn.showScreenPopup(PopupsFolderSystemViewModel, [Enums.SetSystemFoldersNotification.Sent]);
			}
			else
			{
				this.sendError(false);
				this.sending(true);

				if (Utils.isArray(this.aDraftInfo) && 3 === this.aDraftInfo.length)
				{
					aFlagsCache = RL.cache().getMessageFlagsFromCache(this.aDraftInfo[2], this.aDraftInfo[1]);
					if (aFlagsCache)
					{
						if ('forward' === this.aDraftInfo[0])
						{
							aFlagsCache[3] = true;
						}
						else
						{
							aFlagsCache[2] = true;
						}

						RL.cache().setMessageFlagsToCache(this.aDraftInfo[2], this.aDraftInfo[1], aFlagsCache);
						RL.reloadFlagsCurrentMessageListAndMessageFromCache();
						RL.cache().setFolderHash(this.aDraftInfo[2], '');
					}
				}

				sSentFolder = Consts.Values.UnuseOptionValue === sSentFolder ? '' : sSentFolder;

				RL.cache().setFolderHash(this.draftFolder(), '');
				RL.cache().setFolderHash(sSentFolder, '');

				RL.remote().sendMessage(
					this.sendMessageResponse,
					this.draftFolder(),
					this.draftUid(),
					sSentFolder,
					this.currentIdentityResultEmail(),
					sTo,
					this.cc(),
					this.bcc(),
					this.subject(),
					this.oEditor ? this.oEditor.isHtml() : false,
					this.oEditor ? this.oEditor.getData() : '',
					this.prepearAttachmentsForSendOrSave(),
					this.aDraftInfo,
					this.sInReplyTo,
					this.sReferences,
					this.requestReadReceipt()
				);
			}
		}
	}, this.canBeSendedOrSaved);

	this.saveCommand = Utils.createCommand(this, function () {

		if (RL.data().draftFolderNotEnabled())
		{
			kn.showScreenPopup(PopupsFolderSystemViewModel, [Enums.SetSystemFoldersNotification.Draft]);
		}
		else
		{
			this.savedError(false);
			this.saving(true);

			this.bSkipNext = true;

			RL.cache().setFolderHash(RL.data().draftFolder(), '');

			RL.remote().saveMessage(
				this.saveMessageResponse,
				this.draftFolder(),
				this.draftUid(),
				RL.data().draftFolder(),
				this.currentIdentityResultEmail(),
				this.to(),
				this.cc(),
				this.bcc(),
				this.subject(),
				this.oEditor ? this.oEditor.isHtml() : false,
				this.oEditor ? this.oEditor.getData() : '',
				this.prepearAttachmentsForSendOrSave(),
				this.aDraftInfo,
				this.sInReplyTo,
				this.sReferences
			);
		}

	}, this.canBeSendedOrSaved);

	RL.sub('interval.1m', function () {
		if (this.modalVisibility() && !RL.data().draftFolderNotEnabled() && !this.isEmptyForm(false) &&
			!this.bSkipNext && !this.saving() && !this.sending() && !this.savedError())
		{
			this.bSkipNext = false;
			this.saveCommand();
		}
	}, this);

	this.showCcAndBcc.subscribe(function () {
		this.triggerForResize();
	}, this);

	this.dropboxEnabled = ko.observable(RL.settingsGet('DropboxApiKey') ? true : false);

	this.dropboxCommand = Utils.createCommand(this, function () {

		if (window.Dropbox)
		{
			window.Dropbox.choose({
				//'iframe': true,
				'success': function(aFiles) {

					if (aFiles && aFiles[0] && aFiles[0]['link'])
					{
						self.addDropboxAttachment(aFiles[0]);
					}
				},
				'linkType': "direct",
				'multiselect': false
			});
		}
		
		return true;

	}, function () {
		return this.dropboxEnabled();
	});
	
	this.driveEnabled = ko.observable(false);

	this.driveCommand = Utils.createCommand(this, function () {

//		this.driveOpenPopup();
		return true;

	}, function () {
		return this.driveEnabled();
	});

//	this.driveCallback = _.bind(this.driveCallback, this);

	this.bDisabeCloseOnEsc = true;
	this.sDefaultKeyScope = Enums.KeyState.Compose;
	
	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsComposeViewModel', PopupsComposeViewModel);

PopupsComposeViewModel.prototype.openOpenPgpPopup = function ()
{
	if (this.allowOpenPGP() && this.oEditor && !this.oEditor.isHtml())
	{
		var self = this;
		kn.showScreenPopup(PopupsComposeOpenPgpViewModel, [
			function (sResult) {
				self.editor(function (oEditor) {
					oEditor.setPlain(sResult);
				});
			},
			this.oEditor.getData(),
			this.currentIdentityResultEmail(),
			this.to(),
			this.cc(),
			this.bcc()
		]);
	}
};

PopupsComposeViewModel.prototype.reloadDraftFolder = function ()
{
	var sDraftFolder = RL.data().draftFolder();
	if ('' !== sDraftFolder)
	{
		RL.cache().setFolderHash(sDraftFolder, '');
		if (RL.data().currentFolderFullNameRaw() === sDraftFolder)
		{
			RL.reloadMessageList(true);
		}
		else
		{
			RL.folderInformation(sDraftFolder);
		}
	}
};

PopupsComposeViewModel.prototype.findIdentityIdByMessage = function (sComposeType, oMessage)
{
	var
		oIDs = {},
		sResult = '',
		fFindHelper = function (oItem) {
			if (oItem && oItem.email && oIDs[oItem.email])
			{
				sResult = oIDs[oItem.email];
				return true;
			}

			return false;
		}
	;

	if (this.bAllowIdentities)
	{
		_.each(this.identities(), function (oItem) {
			oIDs[oItem.email()] = oItem['id'];
		});
	}
	
	oIDs[RL.data().accountEmail()] = RL.data().accountEmail();

	if (oMessage)
	{
		switch (sComposeType)
		{
			case Enums.ComposeType.Empty:
				sResult = RL.data().accountEmail();
				break;
			case Enums.ComposeType.Reply:
			case Enums.ComposeType.ReplyAll:
			case Enums.ComposeType.Forward:
			case Enums.ComposeType.ForwardAsAttachment:
				_.find(_.union(oMessage.to, oMessage.cc, oMessage.bcc), fFindHelper);
				break;
			case Enums.ComposeType.Draft:
				_.find(_.union(oMessage.from, oMessage.replyTo), fFindHelper);
				break;
		}
	}
	else
	{
		sResult = RL.data().accountEmail();
	}

	return sResult;
};

PopupsComposeViewModel.prototype.selectIdentity = function (oIdentity)
{
	if (oIdentity)
	{
		this.currentIdentityID(oIdentity.optValue);
	}
};

/**
 *
 * @param {boolean=} bHeaderResult = false
 * @returns {string}
 */
PopupsComposeViewModel.prototype.formattedFrom = function (bHeaderResult)
{
	var
		sDisplayName = RL.data().displayName(),
		sEmail = RL.data().accountEmail()
	;

	return '' === sDisplayName ? sEmail :
		((Utils.isUnd(bHeaderResult) ? false : !!bHeaderResult) ?
			'"' + Utils.quoteName(sDisplayName) + '" <' + sEmail + '>' :
			sDisplayName + ' (' + sEmail + ')')
	;
};

PopupsComposeViewModel.prototype.sendMessageResponse = function (sResult, oData)
{
	var 
		bResult = false,
		sMessage = ''
	;

	this.sending(false);

	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		bResult = true;
		if (this.modalVisibility())
		{
			Utils.delegateRun(this, 'closeCommand');
		}
	}
	
	if (this.modalVisibility() && !bResult)
	{
		if (oData && Enums.Notification.CantSaveMessage === oData.ErrorCode)
		{
			this.sendSuccessButSaveError(true);
			window.alert(Utils.trim(Utils.i18n('COMPOSE/SAVED_ERROR_ON_SEND')));
		}
		else
		{
			sMessage = Utils.getNotification(oData && oData.ErrorCode ? oData.ErrorCode : Enums.Notification.CantSendMessage,
				oData && oData.ErrorMessage ? oData.ErrorMessage : '');

			this.sendError(true);
			window.alert(sMessage || Utils.getNotification(Enums.Notification.CantSendMessage));
		}
	}

	this.reloadDraftFolder();
};

PopupsComposeViewModel.prototype.saveMessageResponse = function (sResult, oData)
{
	var
		bResult = false,
		oMessage = null
	;

	this.saving(false);

	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		if (oData.Result.NewFolder && oData.Result.NewUid)
		{
			if (this.bFromDraft)
			{
				oMessage = RL.data().message();
				if (oMessage && this.draftFolder() === oMessage.folderFullNameRaw && this.draftUid() === oMessage.uid)
				{
					RL.data().message(null);
				}
			}

			this.draftFolder(oData.Result.NewFolder);
			this.draftUid(oData.Result.NewUid);

			if (this.modalVisibility())
			{
				this.savedTime(Math.round((new window.Date()).getTime() / 1000));

				this.savedOrSendingText(
					0 < this.savedTime() ? Utils.i18n('COMPOSE/SAVED_TIME', {
						'TIME': moment.unix(this.savedTime() - 1).format('LT')
					}) : ''
				);

				bResult = true;

				if (this.bFromDraft)
				{
					RL.cache().setFolderHash(this.draftFolder(), '');
				}
			}
		}
	}

	if (!this.modalVisibility() && !bResult)
	{
		this.savedError(true);
		this.savedOrSendingText(Utils.getNotification(Enums.Notification.CantSaveMessage));
	}

	this.reloadDraftFolder();
};

PopupsComposeViewModel.prototype.onHide = function ()
{
	this.reset();
	kn.routeOn();
};

/**
 * @param {string} sSignature
 * @param {string=} sFrom
 * @return {string}
 */
PopupsComposeViewModel.prototype.convertSignature = function (sSignature, sFrom)
{
	if ('' !== sSignature)
	{
		var bHtml = false;
		if (':HTML:' === sSignature.substr(0, 6))
		{
			bHtml = true;
			sSignature = sSignature.substr(6);
		}

		sSignature = sSignature.replace(/[\r]/, '');

		sFrom = Utils.pString(sFrom);
		if ('' !== sFrom)
		{
			sSignature = sSignature.replace(/{{FROM}}/, sFrom);
		}
		else
		{
			sSignature = sSignature.replace(/{{IF:FROM}}[\s\S]+{{\/IF:FROM}}[\n]?/gm, '');
		}

		sSignature = sSignature.replace(/{{FROM}}[\n]?/, '').replace(/{{IF:FROM}}[\n]?/, '').replace(/{{\/IF:FROM}}[\n]?/, '');

		if (!bHtml)
		{
			sSignature = Utils.convertPlainTextToHtml(sSignature);
		}
	}

	return sSignature;
};

PopupsComposeViewModel.prototype.editor = function (fOnInit)
{
	if (fOnInit)
	{
		var self = this;
		if (!this.oEditor && this.composeEditorArea())
		{
			_.delay(function () {
				self.oEditor = new NewHtmlEditorWrapper(self.composeEditorArea(), null, function () {
					fOnInit(self.oEditor);
				}, function (bHtml) {
					self.isHtml(!!bHtml);
				});
			}, 300);
		}
		else if (this.oEditor)
		{
			fOnInit(this.oEditor);
		}
	}
};

/**
 * @param {string=} sType = Enums.ComposeType.Empty
 * @param {?MessageModel|Array=} oMessageOrArray = null
 * @param {Array=} aToEmails = null
 */
PopupsComposeViewModel.prototype.onShow = function (sType, oMessageOrArray, aToEmails)
{
	kn.routeOff();
	
	var
		self = this,
		sFrom = '',
		sTo = '',
		sCc = '',
		sDate = '',
		sSubject = '',
		oText = null,
		sText = '',
		sReplyTitle = '',
		aResplyAllParts = [],
		oExcludeEmail = {},
		mEmail = RL.data().accountEmail(),
		sSignature = RL.data().signature(),
		bSignatureToAll = RL.data().signatureToAll(),
		aDownloads = [],
		aDraftInfo = null,
		oMessage = null,
		sComposeType = sType || Enums.ComposeType.Empty,
		fEmailArrayToStringLineHelper = function (aList, bFriendly) {

			var
				iIndex = 0,
				iLen = aList.length,
				aResult = []
			;

			for (; iIndex < iLen; iIndex++)
			{
				aResult.push(aList[iIndex].toLine(!!bFriendly));
			}

			return aResult.join(', ');
		}
	;

	oMessageOrArray = oMessageOrArray || null;
	if (oMessageOrArray && Utils.isNormal(oMessageOrArray))
	{
		oMessage = Utils.isArray(oMessageOrArray) && 1 === oMessageOrArray.length ? oMessageOrArray[0] :
			(!Utils.isArray(oMessageOrArray) ? oMessageOrArray : null);
	}

	if (null !== mEmail)
	{
		oExcludeEmail[mEmail] = true;
		this.currentIdentityID(this.findIdentityIdByMessage(sComposeType, oMessage));
	}

	this.reset();

	if (Utils.isNonEmptyArray(aToEmails))
	{
		this.to(fEmailArrayToStringLineHelper(aToEmails));
	}

	if ('' !== sComposeType && oMessage)
	{
		sDate = oMessage.fullFormatDateValue();
		sSubject = oMessage.subject();
		aDraftInfo = oMessage.aDraftInfo;

		oText = $(oMessage.body).clone();
		Utils.removeBlockquoteSwitcher(oText);
		sText = oText.html();

		switch (sComposeType)
		{
			case Enums.ComposeType.Empty:
				break;
				
			case Enums.ComposeType.Reply:
				this.to(fEmailArrayToStringLineHelper(oMessage.replyEmails(oExcludeEmail)));
				this.subject(Utils.replySubjectAdd('Re', sSubject));
				this.prepearMessageAttachments(oMessage, sComposeType);
				this.aDraftInfo = ['reply', oMessage.uid, oMessage.folderFullNameRaw];
				this.sInReplyTo = oMessage.sMessageId;
				this.sReferences = Utils.trim(this.sInReplyTo + ' ' + oMessage.sReferences);
				break;

			case Enums.ComposeType.ReplyAll:
				aResplyAllParts = oMessage.replyAllEmails(oExcludeEmail);
				this.to(fEmailArrayToStringLineHelper(aResplyAllParts[0]));
				this.cc(fEmailArrayToStringLineHelper(aResplyAllParts[1]));
				this.subject(Utils.replySubjectAdd('Re', sSubject));
				this.prepearMessageAttachments(oMessage, sComposeType);
				this.aDraftInfo = ['reply', oMessage.uid, oMessage.folderFullNameRaw];
				this.sInReplyTo = oMessage.sMessageId;
				this.sReferences = Utils.trim(this.sInReplyTo + ' ' + oMessage.references());
				break;

			case Enums.ComposeType.Forward:
				this.subject(Utils.replySubjectAdd('Fwd', sSubject));
				this.prepearMessageAttachments(oMessage, sComposeType);
				this.aDraftInfo = ['forward', oMessage.uid, oMessage.folderFullNameRaw];
				this.sInReplyTo = oMessage.sMessageId;
				this.sReferences = Utils.trim(this.sInReplyTo + ' ' + oMessage.sReferences);
				break;

			case Enums.ComposeType.ForwardAsAttachment:
				this.subject(Utils.replySubjectAdd('Fwd', sSubject));
				this.prepearMessageAttachments(oMessage, sComposeType);
				this.aDraftInfo = ['forward', oMessage.uid, oMessage.folderFullNameRaw];
				this.sInReplyTo = oMessage.sMessageId;
				this.sReferences = Utils.trim(this.sInReplyTo + ' ' + oMessage.sReferences);
				break;

			case Enums.ComposeType.Draft:
				this.to(fEmailArrayToStringLineHelper(oMessage.to));
				this.cc(fEmailArrayToStringLineHelper(oMessage.cc));
				this.bcc(fEmailArrayToStringLineHelper(oMessage.bcc));

				this.bFromDraft = true;

				this.draftFolder(oMessage.folderFullNameRaw);
				this.draftUid(oMessage.uid);

				this.subject(sSubject);
				this.prepearMessageAttachments(oMessage, sComposeType);

				this.aDraftInfo = Utils.isNonEmptyArray(aDraftInfo) && 3 === aDraftInfo.length ? aDraftInfo : null;
				this.sInReplyTo = oMessage.sInReplyTo;
				this.sReferences = oMessage.sReferences;
				break;

			case Enums.ComposeType.EditAsNew:
				this.to(fEmailArrayToStringLineHelper(oMessage.to));
				this.cc(fEmailArrayToStringLineHelper(oMessage.cc));
				this.bcc(fEmailArrayToStringLineHelper(oMessage.bcc));

				this.subject(sSubject);
				this.prepearMessageAttachments(oMessage, sComposeType);

				this.aDraftInfo = Utils.isNonEmptyArray(aDraftInfo) && 3 === aDraftInfo.length ? aDraftInfo : null;
				this.sInReplyTo = oMessage.sInReplyTo;
				this.sReferences = oMessage.sReferences;
				break;
		}

		switch (sComposeType)
		{
			case Enums.ComposeType.Reply:
			case Enums.ComposeType.ReplyAll:
				sFrom = oMessage.fromToLine(false, true);
				sReplyTitle = Utils.i18n('COMPOSE/REPLY_MESSAGE_TITLE', {
					'DATETIME': sDate,
					'EMAIL': sFrom
				});

				sText = '<br /><br />' + sReplyTitle + ':' +
					'<blockquote><p>' + sText + '</p></blockquote>';

				break;

			case Enums.ComposeType.Forward:
				sFrom = oMessage.fromToLine(false, true);
				sTo = oMessage.toToLine(false, true);
				sCc = oMessage.ccToLine(false, true);
				sText = '<br /><br /><br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_TITLE') +
						'<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_FROM') + ': ' + sFrom +
						'<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_TO') + ': ' + sTo +
						(0 < sCc.length ? '<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_CC') + ': ' + sCc : '') +
						'<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_SENT') + ': ' + Utils.encodeHtml(sDate) +
						'<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_SUBJECT') + ': ' + Utils.encodeHtml(sSubject) +
						'<br /><br />' + sText;
				break;
			case Enums.ComposeType.ForwardAsAttachment:
				sText = '';
				break;
		}

		if (bSignatureToAll && '' !== sSignature &&
			Enums.ComposeType.EditAsNew !== sComposeType && Enums.ComposeType.Draft !== sComposeType)
		{
			sText = this.convertSignature(sSignature, fEmailArrayToStringLineHelper(oMessage.from, true)) + '<br />' + sText;
		}

		this.editor(function (oEditor) {
			oEditor.setHtml(sText, false);
			if (!oMessage.isHtml())
			{
				oEditor.modeToggle(false);
			}
		});
	}
	else if (Enums.ComposeType.Empty === sComposeType)
	{
		sText = this.convertSignature(sSignature);
		this.editor(function (oEditor) {
			oEditor.setHtml(sText, false);
			if (Enums.EditorDefaultType.Html !== RL.data().editorDefaultType())
			{
				oEditor.modeToggle(false);
			}
		});
	}
	else if (Utils.isNonEmptyArray(oMessageOrArray))
	{
		_.each(oMessageOrArray, function (oMessage) {
			self.addMessageAsAttachment(oMessage);
		});
	}

	aDownloads = this.getAttachmentsDownloadsForUpload();
	if (Utils.isNonEmptyArray(aDownloads))
	{
		RL.remote().messageUploadAttachments(function (sResult, oData) {

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				var
					oAttachment = null,
					sTempName = ''
				;

				if (!self.viewModelVisibility())
				{
					for (sTempName in oData.Result)
					{
						if (oData.Result.hasOwnProperty(sTempName))
						{
							oAttachment = self.getAttachmentById(oData.Result[sTempName]);
							if (oAttachment)
							{
								oAttachment.tempName(sTempName);
							}
						}
					}
				}
			}
			else
			{
				self.setMessageAttachmentFailedDowbloadText();
			}

		}, aDownloads);
	}

	this.triggerForResize();
};

PopupsComposeViewModel.prototype.onFocus = function ()
{
	if ('' === this.to())
	{
		this.to.focusTrigger(!this.to.focusTrigger());
	}
	else if (this.oEditor)
	{
		this.oEditor.focus();
	}
	
	this.triggerForResize();
};

PopupsComposeViewModel.prototype.editorResize = function ()
{
	if (this.oEditor)
	{
		this.oEditor.resize();
	}
};

PopupsComposeViewModel.prototype.tryToClosePopup = function ()
{
	var self = this;
	kn.showScreenPopup(PopupsAskViewModel, [Utils.i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'), function () {
		if (self.modalVisibility())
		{
			Utils.delegateRun(self, 'closeCommand');
		}
	}]);
};

PopupsComposeViewModel.prototype.onBuild = function ()
{
	this.initUploader();

	var 
		self = this,
		oScript = null
	;

	key('ctrl+q, command+q', Enums.KeyState.Compose, function () {
		self.identitiesDropdownTrigger(true);
		return false;
	});

	key('ctrl+s, command+s', Enums.KeyState.Compose, function () {
		self.saveCommand();
		return false;
	});

	key('ctrl+enter, command+enter', Enums.KeyState.Compose, function () {
		self.sendCommand();
		return false;
	});
	
	key('esc', Enums.KeyState.Compose, function () {
		self.tryToClosePopup();
		return false;
	});

	$window.on('resize', function () {
		self.triggerForResize();
	});

	if (this.dropboxEnabled())
	{
		oScript = document.createElement('script');
		oScript.type = 'text/javascript';
		oScript.src = 'https://www.dropbox.com/static/api/1/dropins.js';
		$(oScript).attr('id', 'dropboxjs').attr('data-app-key', RL.settingsGet('DropboxApiKey'));
		
		document.body.appendChild(oScript);
	}

// TODO (Google Drive)
//	if (false)
//	{
//		$.getScript('http://www.google.com/jsapi', function () {
//			if (window.google)
//			{
//				window.google.load('picker', '1', {
//					'callback': Utils.emptyFunction
//				});
//			}
//		});
//	}
};

//PopupsComposeViewModel.prototype.driveCallback = function (oData)
//{
//	if (oData && window.google && oData['action'] === window.google.picker.Action.PICKED)
//	{
//	}
//};
//
//PopupsComposeViewModel.prototype.driveOpenPopup = function ()
//{
//	if (window.google)
//	{
//		var
//			oPicker = new window.google.picker.PickerBuilder()
//				.enableFeature(window.google.picker.Feature.NAV_HIDDEN)
//				.addView(new window.google.picker.View(window.google.picker.ViewId.DOCS))
//				.setCallback(this.driveCallback).build()
//		;
//
//		oPicker.setVisible(true);
//	}
//};

/**
 * @param {string} sId
 * @return {?Object}
 */
PopupsComposeViewModel.prototype.getAttachmentById = function (sId)
{
	var
		aAttachments = this.attachments(),
		iIndex = 0,
		iLen = aAttachments.length
	;

	for (; iIndex < iLen; iIndex++)
	{
		if (aAttachments[iIndex] && sId === aAttachments[iIndex].id)
		{
			return aAttachments[iIndex];
		}
	}

	return null;
};

PopupsComposeViewModel.prototype.initUploader = function ()
{
	if (this.composeUploaderButton())
	{
		var
			oUploadCache = {},
			iAttachmentSizeLimit = Utils.pInt(RL.settingsGet('AttachmentLimit')),
			oJua = new Jua({
				'action': RL.link().upload(),
				'name': 'uploader',
				'queueSize': 2,
				'multipleSizeLimit': 50,
				'disableFolderDragAndDrop': false,
				'clickElement': this.composeUploaderButton(),
				'dragAndDropElement': this.composeUploaderDropPlace()
			})
		;

		if (oJua)
		{
			oJua
//				.on('onLimitReached', function (iLimit) {
//					alert(iLimit);
//				})
				.on('onDragEnter', _.bind(function () {
					this.dragAndDropOver(true);
				}, this))
				.on('onDragLeave', _.bind(function () {
					this.dragAndDropOver(false);
				}, this))
				.on('onBodyDragEnter', _.bind(function () {
					this.dragAndDropVisible(true);
				}, this))
				.on('onBodyDragLeave', _.bind(function () {
					this.dragAndDropVisible(false);
				}, this))
				.on('onProgress', _.bind(function (sId, iLoaded, iTotal) {
					var oItem = null;
					if (Utils.isUnd(oUploadCache[sId]))
					{
						oItem = this.getAttachmentById(sId);
						if (oItem)
						{
							oUploadCache[sId] = oItem;
						}
					}
					else
					{
						oItem = oUploadCache[sId];
					}

					if (oItem)
					{
						oItem.progress(' - ' + Math.floor(iLoaded / iTotal * 100) + '%');
					}

				}, this))
				.on('onSelect', _.bind(function (sId, oData) {

					this.dragAndDropOver(false);

					var
						that = this,
						sFileName = Utils.isUnd(oData.FileName) ? '' : oData.FileName.toString(),
						mSize = Utils.isNormal(oData.Size) ? Utils.pInt(oData.Size) : null,
						oAttachment = new ComposeAttachmentModel(sId, sFileName, mSize)
					;

					oAttachment.cancel = (function (sId) {

						return function () {
							that.attachments.remove(function (oItem) {
								return oItem && oItem.id === sId;
							});

							if (oJua)
							{
								oJua.cancel(sId);
							}
						};

					}(sId));

					this.attachments.push(oAttachment);

					if (0 < mSize && 0 < iAttachmentSizeLimit && iAttachmentSizeLimit < mSize)
					{
						oAttachment.error(Utils.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG'));
						return false;
					}

					return true;

				}, this))
				.on('onStart', _.bind(function (sId) {

					var
						oItem = null
					;

					if (Utils.isUnd(oUploadCache[sId]))
					{
						oItem = this.getAttachmentById(sId);
						if (oItem)
						{
							oUploadCache[sId] = oItem;
						}
					}
					else
					{
						oItem = oUploadCache[sId];
					}

					if (oItem)
					{
						oItem.waiting(false);
						oItem.uploading(true);
					}

				}, this))
				.on('onComplete', _.bind(function (sId, bResult, oData) {

					var
						sError = '',
						mErrorCode = null,
						oAttachmentJson = null,
						oAttachment = this.getAttachmentById(sId)
					;

					oAttachmentJson = bResult && oData && oData.Result && oData.Result.Attachment ? oData.Result.Attachment : null;
					mErrorCode = oData && oData.Result && oData.Result.ErrorCode ? oData.Result.ErrorCode : null;

					if (null !== mErrorCode)
					{
						sError = Utils.getUploadErrorDescByCode(mErrorCode);
					}
					else if (!oAttachmentJson)
					{
						sError = Utils.i18n('UPLOAD/ERROR_UNKNOWN');
					}

					if (oAttachment)
					{
						if ('' !== sError && 0 < sError.length)
						{
							oAttachment
								.waiting(false)
								.uploading(false)
								.error(sError)
							;
						}
						else if (oAttachmentJson)
						{
							oAttachment
								.waiting(false)
								.uploading(false)
							;

							oAttachment.initByUploadJson(oAttachmentJson);
						}

						if (Utils.isUnd(oUploadCache[sId]))
						{
							delete (oUploadCache[sId]);
						}
					}

				}, this))
			;

			this
				.addAttachmentEnabled(true)
				.dragAndDropEnabled(oJua.isDragAndDropSupported())
			;
		}
		else
		{
			this
				.addAttachmentEnabled(false)
				.dragAndDropEnabled(false)
			;
		}
	}
};

/**
 * @return {Object}
 */
PopupsComposeViewModel.prototype.prepearAttachmentsForSendOrSave = function ()
{
	var oResult = {};
	_.each(this.attachmentsInReady(), function (oItem) {
		if (oItem && '' !== oItem.tempName() && oItem.enabled())
		{
			oResult[oItem.tempName()] = [
				oItem.fileName(),
				oItem.isInline ? '1' : '0',
				oItem.CID,
				oItem.contentLocation
			];
		}
	});

	return oResult;
};

/**
 * @param {MessageModel} oMessage
 */
PopupsComposeViewModel.prototype.addMessageAsAttachment = function (oMessage)
{
	if (oMessage)
	{
		var
			self = this,
			oAttachment = null,
			sTemp = oMessage.subject(),
			fCancelFunc = function (sId) {
				return function () {
					self.attachments.remove(function (oItem) {
						return oItem && oItem.id === sId;
					});
				};
			}
		;

		sTemp = '.eml' === sTemp.substr(-4).toLowerCase() ? sTemp : sTemp + '.eml';
		oAttachment = new ComposeAttachmentModel(
			oMessage.requestHash, sTemp, oMessage.size()
		);

		oAttachment.fromMessage = true;
		oAttachment.cancel = fCancelFunc(oMessage.requestHash);
		oAttachment.waiting(false).uploading(true);

		this.attachments.push(oAttachment);
	}
};

/**
 * @param {Object} oDropboxFile
 * @return {boolean}
 */
PopupsComposeViewModel.prototype.addDropboxAttachment = function (oDropboxFile)
{
	var
		self = this,
		fCancelFunc = function (sId) {
			return function () {
				self.attachments.remove(function (oItem) {
					return oItem && oItem.id === sId;
				});
			};
		},
		iAttachmentSizeLimit = Utils.pInt(RL.settingsGet('AttachmentLimit')),
		oAttachment = null,
		mSize = oDropboxFile['bytes']
	;

	oAttachment = new ComposeAttachmentModel(
		oDropboxFile['link'], oDropboxFile['name'], mSize
	);

	oAttachment.fromMessage = false;
	oAttachment.cancel = fCancelFunc(oDropboxFile['link']);
	oAttachment.waiting(false).uploading(true);

	this.attachments.push(oAttachment);

	if (0 < mSize && 0 < iAttachmentSizeLimit && iAttachmentSizeLimit < mSize)
	{
		oAttachment.uploading(false);
		oAttachment.error(Utils.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG'));
		return false;
	}

	RL.remote().composeUploadExternals(function (sResult, oData) {

		var bResult = false;
		oAttachment.uploading(false);
		
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			if (oData.Result[oAttachment.id])
			{
				bResult = true;
				oAttachment.tempName(oData.Result[oAttachment.id]);
			}
		}

		if (!bResult)
		{
			oAttachment.error(Utils.getUploadErrorDescByCode(Enums.UploadErrorCode.FileNoUploaded));
		}

	}, [oDropboxFile['link']]);

	return true;
};

/**
 * @param {MessageModel} oMessage
 * @param {string} sType
 */
PopupsComposeViewModel.prototype.prepearMessageAttachments = function (oMessage, sType)
{
	if (oMessage)
	{
		var
			self = this,
			aAttachments = Utils.isNonEmptyArray(oMessage.attachments()) ? oMessage.attachments() : [],
			iIndex = 0,
			iLen = aAttachments.length,
			oAttachment = null,
			oItem = null,
			bAdd = false,
			fCancelFunc = function (sId) {
				return function () {
					self.attachments.remove(function (oItem) {
						return oItem && oItem.id === sId;
					});
				};
			}
		;

		if (Enums.ComposeType.ForwardAsAttachment === sType)
		{
			this.addMessageAsAttachment(oMessage);
		}
		else
		{
			for (; iIndex < iLen; iIndex++)
			{
				oItem = aAttachments[iIndex];

				bAdd = false;
				switch (sType) {
				case Enums.ComposeType.Reply:
				case Enums.ComposeType.ReplyAll:
					bAdd = oItem.isLinked;
					break;

				case Enums.ComposeType.Forward:
				case Enums.ComposeType.Draft:
				case Enums.ComposeType.EditAsNew:
					bAdd = true;
					break;
				}

				bAdd = true;
				if (bAdd)
				{
					oAttachment = new ComposeAttachmentModel(
						oItem.download, oItem.fileName, oItem.estimatedSize,
						oItem.isInline, oItem.isLinked, oItem.cid, oItem.contentLocation
					);

					oAttachment.fromMessage = true;
					oAttachment.cancel = fCancelFunc(oItem.download);
					oAttachment.waiting(false).uploading(true);

					this.attachments.push(oAttachment);
				}
			}
		}
	}
};

PopupsComposeViewModel.prototype.removeLinkedAttachments = function ()
{
	this.attachments.remove(function (oItem) {
		return oItem && oItem.isLinked;
	});
};

PopupsComposeViewModel.prototype.setMessageAttachmentFailedDowbloadText = function ()
{
	_.each(this.attachments(), function(oAttachment) {
		if (oAttachment && oAttachment.fromMessage)
		{
			oAttachment
				.waiting(false)
				.uploading(false)
				.error(Utils.getUploadErrorDescByCode(Enums.UploadErrorCode.FileNoUploaded))
			;
		}
	}, this);
};

/**
 * @param {boolean=} bIncludeAttachmentInProgress = true
 * @return {boolean}
 */
PopupsComposeViewModel.prototype.isEmptyForm = function (bIncludeAttachmentInProgress)
{
	bIncludeAttachmentInProgress = Utils.isUnd(bIncludeAttachmentInProgress) ? true : !!bIncludeAttachmentInProgress;
	var bAttach = bIncludeAttachmentInProgress ?
		0 === this.attachments().length : 0 === this.attachmentsInReady().length;

	return 0 === this.to().length &&
		0 === this.cc().length &&
		0 === this.bcc().length &&
		0 === this.subject().length &&
		bAttach &&
		(!this.oEditor || '' === this.oEditor.getData())
	;
};

PopupsComposeViewModel.prototype.reset = function ()
{
	this.to('');
	this.cc('');
	this.bcc('');
	this.replyTo('');
	this.subject('');

	this.requestReadReceipt(false);

	this.aDraftInfo = null;
	this.sInReplyTo = '';
	this.bFromDraft = false;
	this.sReferences = '';

	this.sendError(false);
	this.sendSuccessButSaveError(false);
	this.savedError(false);
	this.savedTime(0);
	this.savedOrSendingText('');
	this.emptyToError(false);
	this.showCcAndBcc(false);

	this.attachments([]);
	this.dragAndDropOver(false);
	this.dragAndDropVisible(false);

	this.draftFolder('');
	this.draftUid('');

	this.sending(false);
	this.saving(false);

	if (this.oEditor)
	{
		this.oEditor.clear(false);
	}
};

/**
 * @return {Array}
 */
PopupsComposeViewModel.prototype.getAttachmentsDownloadsForUpload = function ()
{
	return _.map(_.filter(this.attachments(), function (oItem) {
		return oItem && '' === oItem.tempName();
	}), function (oItem) {
		return oItem.id;
	});
};

PopupsComposeViewModel.prototype.triggerForResize = function ()
{
	this.resizer(!this.resizer());
	this.editorResizeThrottle();
};


/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsContactsViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsContacts');

	var
		self = this,
		oT = Enums.ContactPropertyType,
		aNameTypes = [oT.FirstName, oT.LastName],
		aEmailTypes = [oT.EmailPersonal, oT.EmailBussines, oT.EmailOther],
		aPhonesTypes = [
			oT.PhonePersonal, oT.PhoneBussines, oT.PhoneOther,
			oT.MobilePersonal, oT.MobileBussines, oT.MobileOther,
			oT.FaxPesonal, oT.FaxBussines, oT.FaxOther
		],
		aOtherTypes = [
			oT.Facebook, oT.Skype, oT.GitHub
		],
		fFastClearEmptyListHelper = function (aList) {
			if (aList && 0 < aList.length) {
				self.viewProperties.removeAll(aList);
			}
		}
	;

	this.search = ko.observable('');
	this.contactsCount = ko.observable(0);
	this.contacts = ko.observableArray([]);
	this.contacts.loading = ko.observable(false).extend({'throttle': 200});
	this.contacts.importing = ko.observable(false).extend({'throttle': 200});
	
	this.currentContact = ko.observable(null);

	this.importUploaderButton = ko.observable(null);

	this.contactsSharingIsAllowed = !!RL.settingsGet('ContactsSharingIsAllowed');

	this.contactsPage = ko.observable(1);
	this.contactsPageCount = ko.computed(function () {
		var iPage = Math.ceil(this.contactsCount() / Consts.Defaults.ContactsPerPage);
		return 0 >= iPage ? 1 : iPage;
	}, this);

	this.contactsPagenator = ko.computed(Utils.computedPagenatorHelper(this.contactsPage, this.contactsPageCount));

	this.emptySelection = ko.observable(true);
	this.viewClearSearch = ko.observable(false);

	this.viewID = ko.observable('');
	this.viewIDStr = ko.observable('');
	this.viewReadOnly = ko.observable(false);
	this.viewScopeType = ko.observable(Enums.ContactScopeType.Default);
	this.viewProperties = ko.observableArray([]);

	this.viewSaveTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.viewPropertiesNames = this.viewProperties.filter(function(oProperty) {
		return -1 < Utils.inArray(oProperty.type(), aNameTypes);
	});
	
	this.viewPropertiesEmails = this.viewProperties.filter(function(oProperty) {
		return -1 < Utils.inArray(oProperty.type(), aEmailTypes);
	});

	this.shareIcon = ko.computed(function() {
		return Enums.ContactScopeType.ShareAll === this.viewScopeType() ? 'icon-earth' : 'icon-share';
	}, this);

	this.shareToNone = ko.computed(function() {
		return Enums.ContactScopeType.ShareAll !== this.viewScopeType();
	}, this);

	this.shareToAll = ko.computed(function() {
		return Enums.ContactScopeType.ShareAll === this.viewScopeType();
	}, this);

	this.viewHasNonEmptyRequaredProperties = ko.computed(function() {
		
		var
			aNames = this.viewPropertiesNames(),
			aEmail = this.viewPropertiesEmails(),
			fHelper = function (oProperty) {
				return '' !== Utils.trim(oProperty.value());
			}
		;
		
		return !!(_.find(aNames, fHelper) || _.find(aEmail, fHelper));
	}, this);

	this.viewPropertiesPhones = this.viewProperties.filter(function(oProperty) {
		return -1 < Utils.inArray(oProperty.type(), aPhonesTypes);
	});

	this.viewPropertiesOther = this.viewProperties.filter(function(oProperty) {
		return -1 < Utils.inArray(oProperty.type(), aOtherTypes);
	});

	this.viewPropertiesEmailsNonEmpty = this.viewPropertiesNames.filter(function(oProperty) {
		return '' !== Utils.trim(oProperty.value());
	});

	this.viewPropertiesEmailsEmptyAndOnFocused = this.viewPropertiesEmails.filter(function(oProperty) {
		var bF = oProperty.focused();
		return '' === Utils.trim(oProperty.value()) && !bF;
	});

	this.viewPropertiesPhonesEmptyAndOnFocused = this.viewPropertiesPhones.filter(function(oProperty) {
		var bF = oProperty.focused();
		return '' === Utils.trim(oProperty.value()) && !bF;
	});

	this.viewPropertiesEmailsEmptyAndOnFocused.subscribe(function(aList) {
		fFastClearEmptyListHelper(aList);
	});

	this.viewPropertiesPhonesEmptyAndOnFocused.subscribe(function(aList) {
		fFastClearEmptyListHelper(aList);
	});

	this.viewSaving = ko.observable(false);

	this.useCheckboxesInList = RL.data().useCheckboxesInList;

	this.search.subscribe(function () {
		this.reloadContactList();
	}, this);

	this.contacts.subscribe(function () {
		Utils.windowResize();
	}, this);

	this.viewProperties.subscribe(function () {
		Utils.windowResize();
	}, this);

	this.contactsChecked = ko.computed(function () {
		return _.filter(this.contacts(), function (oItem) {
			return oItem.checked();
		});
	}, this);

	this.contactsCheckedOrSelected = ko.computed(function () {

		var
			aChecked = this.contactsChecked(),
			oSelected = this.currentContact()
		;

		return _.union(aChecked, oSelected ? [oSelected] : []);

	}, this);

	this.contactsCheckedOrSelectedUids = ko.computed(function () {
		return _.map(this.contactsCheckedOrSelected(), function (oContact) {
			return oContact.idContact;
		});
	}, this);

	this.selector = new Selector(this.contacts, this.currentContact,
		'.e-contact-item .actionHandle', '.e-contact-item.selected', '.e-contact-item .checkboxItem',
			'.e-contact-item.focused');

	this.selector.on('onItemSelect', _.bind(function (oContact) {
		this.populateViewContact(oContact ? oContact : null);
	}, this));

	this.selector.on('onItemGetUid', function (oContact) {
		return oContact ? oContact.generateUid() : '';
	});

	this.newCommand = Utils.createCommand(this, function () {
		this.populateViewContact(null);
		this.currentContact(null);
	});
	
	this.deleteCommand = Utils.createCommand(this, function () {
		this.deleteSelectedContacts();
		this.emptySelection(true);
	}, function () {
		return 0 < this.contactsCheckedOrSelected().length;
	});

	this.newMessageCommand = Utils.createCommand(this, function () {
		var aC = this.contactsCheckedOrSelected(), aE = [];
		if (Utils.isNonEmptyArray(aC))
		{
			aE = _.map(aC, function (oItem) {
				if (oItem)
				{
					var 
						aData = oItem.getNameAndEmailHelper(),
						oEmail = aData ? new EmailModel(aData[0], aData[1]) : null
					;

					if (oEmail && oEmail.validate())
					{
						return oEmail;
					}
				}

				return null;
			});

			aE = _.compact(aE);
		}

		if (Utils.isNonEmptyArray(aE))
		{
			kn.hideScreenPopup(PopupsContactsViewModel);
			kn.showScreenPopup(PopupsComposeViewModel, [Enums.ComposeType.Empty, null, aE]);
		}
		
	}, function () {
		return 0 < this.contactsCheckedOrSelected().length;
	});

	this.clearCommand = Utils.createCommand(this, function () {
		this.search('');
	});

	this.saveCommand = Utils.createCommand(this, function () {
		
		this.viewSaving(true);
		this.viewSaveTrigger(Enums.SaveSettingsStep.Animate);

		var 
			sRequestUid = Utils.fakeMd5(),
			aProperties = []
		;

		_.each(this.viewProperties(), function (oItem) {
			if (oItem.type() && '' !== Utils.trim(oItem.value()))
			{
				aProperties.push([oItem.type(), oItem.value()]);
			}
		});

		RL.remote().contactSave(function (sResult, oData) {

			var bRes = false;
			self.viewSaving(false);
			
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result &&
				oData.Result.RequestUid === sRequestUid && 0 < Utils.pInt(oData.Result.ResultID))
			{
				if ('' === self.viewID())
				{
					self.viewID(Utils.pInt(oData.Result.ResultID));
				}

				if ('' === self.viewIDStr())
				{
					self.viewIDStr(Utils.pString(oData.Result.ResultIDStr));
				}

				self.reloadContactList();
				bRes = true;
			}

			_.delay(function () {
				self.viewSaveTrigger(bRes ? Enums.SaveSettingsStep.TrueResult : Enums.SaveSettingsStep.FalseResult);
			}, 300);

			if (bRes)
			{
				self.watchDirty(false);

				_.delay(function () {
					self.viewSaveTrigger(Enums.SaveSettingsStep.Idle);
				}, 1000);
			}
			
		}, sRequestUid, this.viewID(), this.viewIDStr(), this.viewScopeType(), aProperties);
		
	}, function () {
		var 
			bV = this.viewHasNonEmptyRequaredProperties(),
			bReadOnly = this.viewReadOnly()
		;
		return !this.viewSaving() && bV && !bReadOnly;
	});

	this.bDropPageAfterDelete = false;

	this.watchDirty = ko.observable(false);
	this.watchHash = ko.observable(false);
	
	this.viewHash = ko.computed(function () {
		return '' + self.viewScopeType() + ' - ' + _.map(self.viewProperties(), function (oItem) {
			return oItem.value();
		}).join('');
	});

//	this.saveCommandDebounce = _.debounce(_.bind(this.saveCommand, this), 1000);

	this.viewHash.subscribe(function () {
		if (this.watchHash() && !this.viewReadOnly() && !this.watchDirty())
		{
			this.watchDirty(true);
		}
	}, this);

	this.sDefaultKeyScope = Enums.KeyState.ContactList;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsContactsViewModel', PopupsContactsViewModel);

PopupsContactsViewModel.prototype.setShareToNone = function ()
{
	this.viewScopeType(Enums.ContactScopeType.Default);
};

PopupsContactsViewModel.prototype.setShareToAll = function ()
{
	this.viewScopeType(Enums.ContactScopeType.ShareAll);
};

PopupsContactsViewModel.prototype.addNewProperty = function (sType)
{
	var oItem = new ContactPropertyModel(sType, '');
	oItem.focused(true);
	this.viewProperties.push(oItem);
};

PopupsContactsViewModel.prototype.addNewEmail = function ()
{
	this.addNewProperty(Enums.ContactPropertyType.EmailPersonal);
};

PopupsContactsViewModel.prototype.addNewPhone = function ()
{
	this.addNewProperty(Enums.ContactPropertyType.MobilePersonal);
};

PopupsContactsViewModel.prototype.initUploader = function ()
{
	if (this.importUploaderButton())
	{
		var
			oJua = new Jua({
				'action': RL.link().uploadContacts(),
				'name': 'uploader',
				'queueSize': 1,
				'multipleSizeLimit': 1,
				'disableFolderDragAndDrop': true,
				'disableDragAndDrop': true,
				'disableMultiple': true,
				'disableDocumentDropPrevent': true,
				'clickElement': this.importUploaderButton()
			})
		;

		if (oJua)
		{
			oJua
				.on('onStart', _.bind(function () {
					this.contacts.importing(true);
				}, this))
				.on('onComplete', _.bind(function (sId, bResult, oData) {
					
					this.contacts.importing(false);
					this.reloadContactList();

					if (!sId || !bResult || !oData || !oData.Result)
					{
						window.alert(Utils.i18n('CONTACTS/ERROR_IMPORT_FILE'));
					}

				}, this))
			;
		}
	}
};

PopupsContactsViewModel.prototype.removeCheckedOrSelectedContactsFromList = function ()
{
	var
		self = this,
		oKoContacts = this.contacts,
		oCurrentContact = this.currentContact(),
		iCount = this.contacts().length,
		aContacts = this.contactsCheckedOrSelected()
	;
	
	if (0 < aContacts.length)
	{
		_.each(aContacts, function (oContact) {

			if (oCurrentContact && oCurrentContact.idContact === oContact.idContact)
			{
				oCurrentContact = null;
				self.currentContact(null);
			}

			oContact.deleted(true);
			iCount--;
		});

		if (iCount <= 0)
		{
			this.bDropPageAfterDelete = true;
		}

		_.delay(function () {
			
			_.each(aContacts, function (oContact) {
				oKoContacts.remove(oContact);
			});
			
		}, 500);
	}
};

PopupsContactsViewModel.prototype.deleteSelectedContacts = function ()
{
	if (0 < this.contactsCheckedOrSelected().length)
	{
		RL.remote().contactsDelete(
			_.bind(this.deleteResponse, this),
			this.contactsCheckedOrSelectedUids()
		);

		this.removeCheckedOrSelectedContactsFromList();
	}
};

/**
 * @param {string} sResult
 * @param {AjaxJsonDefaultResponse} oData
 */
PopupsContactsViewModel.prototype.deleteResponse = function (sResult, oData)
{
	if (500 < (Enums.StorageResultType.Success === sResult && oData && oData.Time ? Utils.pInt(oData.Time) : 0))
	{
		this.reloadContactList(this.bDropPageAfterDelete);
	}
	else
	{
		_.delay((function (self) {
			return function () {
				self.reloadContactList(self.bDropPageAfterDelete);
			};
		}(this)), 500);
	}
};

PopupsContactsViewModel.prototype.removeProperty = function (oProp)
{
	this.viewProperties.remove(oProp);
};

/**
 * @param {?ContactModel} oContact
 */
PopupsContactsViewModel.prototype.populateViewContact = function (oContact)
{
	var
		sId = '',
		sIdStr = '',
		sLastName = '',
		sFirstName = '',
		aList = []
	;

	this.watchHash(false);

	this.emptySelection(false);
	this.viewReadOnly(false);
	this.viewScopeType(Enums.ContactScopeType.Default);
	
	if (oContact)
	{
		sId = oContact.idContact;
		sIdStr = oContact.idContactStr;

		if (Utils.isNonEmptyArray(oContact.properties))
		{
			_.each(oContact.properties, function (aProperty) {
				if (aProperty && aProperty[0])
				{
					if (Enums.ContactPropertyType.LastName === aProperty[0])
					{
						sLastName = aProperty[1];
					}
					else if (Enums.ContactPropertyType.FirstName === aProperty[0])
					{
						sFirstName = aProperty[1];
					}
					else if (-1 === Utils.inArray(aProperty[0], [Enums.ContactPropertyType.FullName]))
					{
						aList.push(new ContactPropertyModel(aProperty[0], aProperty[1]));
					}
				}
			});
		}

		this.viewReadOnly(!!oContact.readOnly);
		this.viewScopeType(oContact.scopeType);
	}

	aList.unshift(new ContactPropertyModel(Enums.ContactPropertyType.LastName, sLastName, !oContact, 'CONTACTS/PLACEHOLDER_ENTER_LAST_NAME'));
	aList.unshift(new ContactPropertyModel(Enums.ContactPropertyType.FirstName, sFirstName, false, 'CONTACTS/PLACEHOLDER_ENTER_FIRST_NAME'));
	
	this.viewID(sId);
	this.viewIDStr(sIdStr);
	this.viewProperties([]);
	this.viewProperties(aList);

	this.watchDirty(false);
	this.watchHash(true);
};

/**
 * @param {boolean=} bDropPagePosition = false
 */
PopupsContactsViewModel.prototype.reloadContactList = function (bDropPagePosition)
{
	var
		self = this,
		iOffset = (this.contactsPage() - 1) * Consts.Defaults.ContactsPerPage
	;
	
	this.bDropPageAfterDelete = false;

	if (Utils.isUnd(bDropPagePosition) ? false : !!bDropPagePosition)
	{
		this.contactsPage(1);
		iOffset = 0;
	}

	this.contacts.loading(true);
	RL.remote().contacts(function (sResult, oData) {
		var
			iCount = 0,
			aList = []
		;
		
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result.List)
		{
			if (Utils.isNonEmptyArray(oData.Result.List))
			{
				aList = _.map(oData.Result.List, function (oItem) {
					var oContact = new ContactModel();
					return oContact.parse(oItem, self.contactsSharingIsAllowed) ? oContact : null;
				});

				aList = _.compact(aList);

				iCount = Utils.pInt(oData.Result.Count);
				iCount = 0 < iCount ? iCount : 0;
			}
		}

		self.contactsCount(iCount);
		
		self.contacts(aList);
		self.viewClearSearch('' !== self.search());
		self.contacts.loading(false);

//		if ('' !== self.viewID() && !self.currentContact() && self.contacts.setSelectedByUid)
//		{
//			self.contacts.setSelectedByUid('' + self.viewID());
//		}

	}, iOffset, Consts.Defaults.ContactsPerPage, this.search());
};

PopupsContactsViewModel.prototype.onBuild = function (oDom)
{
	this.oContentVisible = $('.b-list-content', oDom);
	this.oContentScrollable = $('.content', this.oContentVisible);

	this.selector.init(this.oContentVisible, this.oContentScrollable, Enums.KeyState.ContactList);

	var self = this;

	key('delete', Enums.KeyState.ContactList, function () {
		self.deleteCommand();
		return false;
	});

	oDom
		.on('click', '.e-pagenator .e-page', function () {
			var oPage = ko.dataFor(this);
			if (oPage)
			{
				self.contactsPage(Utils.pInt(oPage.value));
				self.reloadContactList();
			}
		})
	;

	this.initUploader();
};

PopupsContactsViewModel.prototype.onShow = function ()
{
	kn.routeOff();
	this.reloadContactList(true);
};

PopupsContactsViewModel.prototype.onHide = function ()
{
	kn.routeOn();
	this.currentContact(null);
	this.emptySelection(true);
	this.search('');

	_.each(this.contacts(), function (oItem) {
		oItem.checked(false);
	});
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsAdvancedSearchViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAdvancedSearch');

	this.fromFocus = ko.observable(false);
	
	this.from = ko.observable('');
	this.to = ko.observable('');
	this.subject = ko.observable('');
	this.text = ko.observable('');
	this.selectedDateValue = ko.observable(-1);

	this.hasAttachments = ko.observable(false);
	this.starred = ko.observable(false);
	this.unseen = ko.observable(false);

	this.searchCommand = Utils.createCommand(this, function () {
		
		var sSearch = this.buildSearchString();
		if ('' !== sSearch)
		{
			RL.data().mainMessageListSearch(sSearch);
		}
		
		this.cancelCommand();
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsAdvancedSearchViewModel', PopupsAdvancedSearchViewModel);

PopupsAdvancedSearchViewModel.prototype.buildSearchStringValue = function (sValue)
{
	if (-1 < sValue.indexOf(' '))
	{
		sValue = '"' + sValue + '"';
	}
	
	return sValue;
};

PopupsAdvancedSearchViewModel.prototype.buildSearchString = function ()
{
	var
		aResult = [],
		sFrom = Utils.trim(this.from()),
		sTo = Utils.trim(this.to()),
		sSubject = Utils.trim(this.subject()),
		sText = Utils.trim(this.text()),
		aHas = []
	;

	if (sFrom && '' !== sFrom)
	{
		aResult.push('from:' + this.buildSearchStringValue(sFrom));
	}
	
	if (sTo && '' !== sTo)
	{
		aResult.push('to:' + this.buildSearchStringValue(sTo));
	}

	if (sSubject && '' !== sSubject)
	{
		aResult.push('subject:' + this.buildSearchStringValue(sSubject));
	}
	
	if (this.hasAttachments())
	{
		aHas.push('attachments');
	}
	
	if (this.unseen())
	{
		aHas.push('unseen');
	}

	if (this.starred())
	{
		aHas.push('flag');
	}

	if (0 < aHas.length)
	{
		aResult.push('has:' + aHas.join(','));
	}

	if (-1 < this.selectedDateValue())
	{
		aResult.push('date:' + moment().subtract('days', this.selectedDateValue()).format('YYYY.MM.DD') + '/');
	}

	if (sText && '' !== sText)
	{
		aResult.push('text:' + this.buildSearchStringValue(sText));
	}

	return Utils.trim(aResult.join(' '));
};

PopupsAdvancedSearchViewModel.prototype.clearPopup = function ()
{
	this.from('');
	this.to('');
	this.subject('');
	this.text('');

	this.selectedDateValue(-1);
	this.hasAttachments(false);
	this.starred(false);
	this.unseen(false);

	this.fromFocus(true);
};

PopupsAdvancedSearchViewModel.prototype.onShow = function ()
{
	this.clearPopup();
};

PopupsAdvancedSearchViewModel.prototype.onFocus = function ()
{
	this.fromFocus(true);
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsAddAccountViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAddAccount');

	this.email = ko.observable('');
	this.login = ko.observable('');
	this.password = ko.observable('');

	this.emailError = ko.observable(false);
	this.loginError = ko.observable(false);
	this.passwordError = ko.observable(false);

	this.email.subscribe(function () {
		this.emailError(false);
	}, this);

	this.login.subscribe(function () {
		this.loginError(false);
	}, this);

	this.password.subscribe(function () {
		this.passwordError(false);
	}, this);

	this.allowCustomLogin = ko.observable(false);

	this.submitRequest = ko.observable(false);
	this.submitError = ko.observable('');

	this.emailFocus = ko.observable(false);
	this.loginFocus = ko.observable(false);

	this.addAccountCommand = Utils.createCommand(this, function () {

		this.emailError('' === Utils.trim(this.email()));
		this.passwordError('' === Utils.trim(this.password()));

		if (this.emailError() || this.passwordError())
		{
			return false;
		}

		this.submitRequest(true);

		RL.remote().accountAdd(_.bind(function (sResult, oData) {

			this.submitRequest(false);
			if (Enums.StorageResultType.Success === sResult && oData && 'AccountAdd' === oData.Action)
			{
				if (oData.Result)
				{
					RL.accountsAndIdentities();
					this.cancelCommand();
				}
				else if (oData.ErrorCode)
				{
					this.submitError(Utils.getNotification(oData.ErrorCode));
				}
			}
			else
			{
				this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
			}

		}, this), this.email(), this.login(), this.password());

		return true;

	}, function () {
		return !this.submitRequest();
	});

	this.loginFocus.subscribe(function (bValue) {
		if (bValue && '' === this.login() && '' !== this.email())
		{
			this.login(this.email());
		}
	}, this);

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsAddAccountViewModel', PopupsAddAccountViewModel);

PopupsAddAccountViewModel.prototype.clearPopup = function ()
{
	this.email('');
	this.login('');
	this.password('');

	this.emailError(false);
	this.loginError(false);
	this.passwordError(false);

	this.submitRequest(false);
	this.submitError('');
};

PopupsAddAccountViewModel.prototype.onShow = function ()
{
	this.clearPopup();
};

PopupsAddAccountViewModel.prototype.onFocus = function ()
{
	this.emailFocus(true);
};

PopupsAddAccountViewModel.prototype.onBuild = function ()
{
	this.allowCustomLogin(!!RL.settingsGet('AllowCustomLogin'));
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsAddOpenPgpKeyViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAddOpenPgpKey');

	this.key = ko.observable('');
	this.key.error = ko.observable(false);
	this.key.focus = ko.observable(false);

	this.key.subscribe(function () {
		this.key.error(false);
	}, this);

	this.addOpenPgpKeyCommand = Utils.createCommand(this, function () {

		var
			sKey = Utils.trim(this.key()),
			oOpenpgpKeyring = RL.data().openpgpKeyring
		;

		this.key.error('' === sKey);
		
		if (!oOpenpgpKeyring || this.key.error())
		{
			return false;
		}

		oOpenpgpKeyring.importKey(sKey);
		oOpenpgpKeyring.store();

		RL.reloadOpenPgpKeys();
		Utils.delegateRun(this, 'cancelCommand');
		
		return true;
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsAddOpenPgpKeyViewModel', PopupsAddOpenPgpKeyViewModel);

PopupsAddOpenPgpKeyViewModel.prototype.clearPopup = function ()
{
	this.key('');
	this.key.error(false);
};

PopupsAddOpenPgpKeyViewModel.prototype.onShow = function ()
{
	this.clearPopup();
};

PopupsAddOpenPgpKeyViewModel.prototype.onFocus = function ()
{
	this.key.focus(true);
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsViewOpenPgpKeyViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsViewOpenPgpKey');

	this.key = ko.observable('');
	this.keyDom = ko.observable(null);
	
	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsViewOpenPgpKeyViewModel', PopupsViewOpenPgpKeyViewModel);

PopupsViewOpenPgpKeyViewModel.prototype.clearPopup = function ()
{
	this.key('');
};

PopupsViewOpenPgpKeyViewModel.prototype.selectKey = function ()
{
	var oEl = this.keyDom();
	if (oEl)
	{
		Utils.selectElement(oEl);
	}
};

PopupsViewOpenPgpKeyViewModel.prototype.onShow = function (oOpenPgpKey)
{
	this.clearPopup();

	if (oOpenPgpKey)
	{
		this.key(oOpenPgpKey.armor);
	}
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsGenerateNewOpenPgpKeyViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsGenerateNewOpenPgpKey');

	this.email = ko.observable('');
	this.email.focus = ko.observable('');
	this.email.error = ko.observable(false);
	
	this.name = ko.observable('');
	this.password = ko.observable('');
	this.keyBitLength = ko.observable(2048);

	this.submitRequest = ko.observable(false);

	this.email.subscribe(function () {
		this.email.error(false);
	}, this);

	this.generateOpenPgpKeyCommand = Utils.createCommand(this, function () {

		var
			self = this,
			sUserID = '',
			mKeyPair = null,
			oOpenpgpKeyring = RL.data().openpgpKeyring
		;

		this.email.error('' === Utils.trim(this.email()));
		if (!oOpenpgpKeyring || this.email.error())
		{
			return false;
		}

		sUserID = this.email();
		if ('' !== this.name())
		{
			sUserID = this.name() + ' <' + sUserID + '>';
		}

		this.submitRequest(true);

		_.delay(function () {
			mKeyPair = window.openpgp.generateKeyPair(1, Utils.pInt(self.keyBitLength()), sUserID, Utils.trim(self.password()));
			if (mKeyPair && mKeyPair.privateKeyArmored)
			{
				oOpenpgpKeyring.importKey(mKeyPair.privateKeyArmored);
				oOpenpgpKeyring.importKey(mKeyPair.publicKeyArmored);
				oOpenpgpKeyring.store();

				RL.reloadOpenPgpKeys();
				Utils.delegateRun(self, 'cancelCommand');
			}

			self.submitRequest(false);
		}, 100);

		return true;
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsGenerateNewOpenPgpKeyViewModel', PopupsGenerateNewOpenPgpKeyViewModel);

PopupsGenerateNewOpenPgpKeyViewModel.prototype.clearPopup = function ()
{
	this.name('');
	this.password('');
	
	this.email('');
	this.email.error(false);
	this.keyBitLength(2048);
};

PopupsGenerateNewOpenPgpKeyViewModel.prototype.onShow = function ()
{
	this.clearPopup();
};

PopupsGenerateNewOpenPgpKeyViewModel.prototype.onFocus = function ()
{
	this.email.focus(true);
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsComposeOpenPgpViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsComposeOpenPgp');

	this.notification = ko.observable('');

	this.sign = ko.observable(true);
	this.encrypt = ko.observable(true);

	this.password = ko.observable('');
	this.password.focus = ko.observable(false);
	this.buttonFocus = ko.observable(false);

	this.from = ko.observable('');
	this.to = ko.observableArray([]);
	this.text = ko.observable('');

	this.resultCallback = null;
	
	this.submitRequest = ko.observable(false);

	// commands
	this.doCommand = Utils.createCommand(this, function () {

		var
			self = this,
			bResult = true,
			oData = RL.data(),
			oPrivateKey = null,
			aPublicKeys = []
		;

		this.submitRequest(true);

		if (bResult && this.sign() && '' === this.from())
		{
			this.notification(Utils.i18n('PGP_NOTIFICATIONS/SPECIFY_FROM_EMAIL'));
			bResult = false;
		}

		if (bResult && this.sign())
		{
			oPrivateKey = oData.findPrivateKeyByEmail(this.from(), this.password());
			if (!oPrivateKey)
			{
				this.notification(Utils.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND_FOR', {
					'EMAIL': this.from()
				}));
				
				bResult = false;
			}
		}

		if (bResult && this.encrypt() && 0 === this.to().length)
		{
			this.notification(Utils.i18n('PGP_NOTIFICATIONS/SPECIFY_AT_LEAST_ONE_RECIPIENT'));
			bResult = false;
		}

		if (bResult && this.encrypt())
		{
			aPublicKeys = [];
			_.each(this.to(), function (sEmail) {
				var aKeys = oData.findPublicKeysByEmail(sEmail);
				if (0 === aKeys.length && bResult)
				{
					this.notification(Utils.i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND_FOR', {
						'EMAIL': sEmail
					}));
					
					bResult = false;
				}

				aPublicKeys = aPublicKeys.concat(aKeys);
			});
			
			if (bResult && (0 === aPublicKeys.length || this.to().length !== aPublicKeys.length))
			{
				bResult = false;
			}
		}

		_.delay(function () {

			if (self.resultCallback && bResult)
			{
				try {

					if (oPrivateKey && 0 === aPublicKeys.length)
					{
						self.resultCallback(
							window.openpgp.signClearMessage([oPrivateKey], self.text())
						);
					}
					else if (oPrivateKey && 0 < aPublicKeys.length)
					{
						self.resultCallback(
							window.openpgp.signAndEncryptMessage(aPublicKeys, oPrivateKey, self.text())
						);
					}
					else if (!oPrivateKey && 0 < aPublicKeys.length)
					{
						self.resultCallback(
							window.openpgp.encryptMessage(aPublicKeys, self.text())
						);
					}
				}
				catch (e)
				{
					self.notification(Utils.i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
						'ERROR': '' + e
					}));

					bResult = false;
				}
			}

			if (bResult)
			{
				self.cancelCommand();
			}

			self.submitRequest(false);

		}, 10);

	}, function () {
		return !this.submitRequest() &&	(this.sign() || this.encrypt());
	});

	this.sDefaultKeyScope = Enums.KeyState.PopupComposeOpenPGP;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsComposeOpenPgpViewModel', PopupsComposeOpenPgpViewModel);

PopupsComposeOpenPgpViewModel.prototype.clearPopup = function ()
{
	this.notification('');

	this.password('');
	this.password.focus(false);
	this.buttonFocus(false);

	this.from('');
	this.to([]);
	this.text('');

	this.submitRequest(false);

	this.resultCallback = null;
};

PopupsComposeOpenPgpViewModel.prototype.onBuild = function ()
{
	key('tab,shift+tab', Enums.KeyState.PopupComposeOpenPGP, _.bind(function () {

		switch (true)
		{
			case this.password.focus():
				this.buttonFocus(true);
				break;
			case this.buttonFocus():
				this.password.focus(true);
				break;
		}

		return false;
		
	}, this));
};

PopupsComposeOpenPgpViewModel.prototype.onHide = function ()
{
	this.clearPopup();
};

PopupsComposeOpenPgpViewModel.prototype.onFocus = function ()
{
	if (this.sign())
	{
		this.password.focus(true);
	}
	else
	{
		this.buttonFocus(true);
	}
};

PopupsComposeOpenPgpViewModel.prototype.onShow = function (fCallback, sText, sFromEmail, sTo, sCc, sBcc)
{
	this.clearPopup();

	var
		oEmail = new EmailModel(),
		sResultFromEmail = '',
		aRec = []
	;

	this.resultCallback = fCallback;

	oEmail.clear();
	oEmail.mailsoParse(sFromEmail);
	if ('' !== oEmail.email)
	{
		sResultFromEmail = oEmail.email;
	}

	if ('' !== sTo)
	{
		aRec.push(sTo);
	}
	
	if ('' !== sCc)
	{
		aRec.push(sCc);
	}

	if ('' !== sBcc)
	{
		aRec.push(sBcc);
	}

	aRec = aRec.join(', ').split(',');
	aRec = _.compact(_.map(aRec, function (sValue) {
		oEmail.clear();
		oEmail.mailsoParse(Utils.trim(sValue));
		return '' === oEmail.email ? false : oEmail.email;
	}));

	this.from(sResultFromEmail);
	this.to(aRec);
	this.text(sText);
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsIdentityViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsIdentity');

	this.id = '';
	this.edit = ko.observable(false);
	this.owner = ko.observable(false);
	
	this.email = ko.observable('').validateEmail();
	this.email.focused = ko.observable(false);
	this.name = ko.observable('');
	this.name.focused = ko.observable(false);
	this.replyTo = ko.observable('').validateSimpleEmail();
	this.replyTo.focused = ko.observable(false);
	this.bcc = ko.observable('').validateSimpleEmail();
	this.bcc.focused = ko.observable(false);

//	this.email.subscribe(function () {
//		this.email.hasError(false);
//	}, this);

	this.submitRequest = ko.observable(false);
	this.submitError = ko.observable('');

	this.addOrEditIdentityCommand = Utils.createCommand(this, function () {

		if (!this.email.hasError())
		{
			this.email.hasError('' === Utils.trim(this.email()));
		}

		if (this.email.hasError())
		{
			if (!this.owner())
			{
				this.email.focused(true);
			}
			
			return false;
		}

		if (this.replyTo.hasError())
		{
			this.replyTo.focused(true);
			return false;
		}

		if (this.bcc.hasError())
		{
			this.bcc.focused(true);
			return false;
		}
		
		this.submitRequest(true);

		RL.remote().identityUpdate(_.bind(function (sResult, oData) {

			this.submitRequest(false);
			if (Enums.StorageResultType.Success === sResult && oData)
			{
				if (oData.Result)
				{
					RL.accountsAndIdentities();
					this.cancelCommand();
				}
				else if (oData.ErrorCode)
				{
					this.submitError(Utils.getNotification(oData.ErrorCode));
				}
			}
			else
			{
				this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
			}

		}, this), this.id, this.email(), this.name(), this.replyTo(), this.bcc());

		return true;

	}, function () {
		return !this.submitRequest();
	});

	this.label = ko.computed(function () {
		return Utils.i18n('POPUPS_IDENTITIES/' + (this.edit() ? 'TITLE_UPDATE_IDENTITY': 'TITLE_ADD_IDENTITY'));
	}, this);

	this.button = ko.computed(function () {
		return Utils.i18n('POPUPS_IDENTITIES/' + (this.edit() ? 'BUTTON_UPDATE_IDENTITY': 'BUTTON_ADD_IDENTITY'));
	}, this);

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsIdentityViewModel', PopupsIdentityViewModel);

PopupsIdentityViewModel.prototype.clearPopup = function ()
{
	this.id = '';
	this.edit(false);
	this.owner(false);

	this.name('');
	this.email('');
	this.replyTo('');
	this.bcc('');

	this.email.hasError(false);
	this.replyTo.hasError(false);
	this.bcc.hasError(false);

	this.submitRequest(false);
	this.submitError('');
};

/**
 * @param {?IdentityModel} oIdentity
 */
PopupsIdentityViewModel.prototype.onShow = function (oIdentity)
{
	this.clearPopup();

	if (oIdentity)
	{
		this.edit(true);

		this.id = oIdentity.id;
		this.name(oIdentity.name());
		this.email(oIdentity.email());
		this.replyTo(oIdentity.replyTo());
		this.bcc(oIdentity.bcc());
		
		this.owner(this.id === RL.data().accountEmail());
	}
};

PopupsIdentityViewModel.prototype.onFocus = function ()
{
	if (!this.owner())
	{
		this.email.focused(true);
	}
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
function PopupsTwoFactorTestViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsTwoFactorTest');

	var self = this;

	this.code = ko.observable('');
	this.code.focused = ko.observable(false);
	this.code.status = ko.observable(null);

	this.testing = ko.observable(false);
	
	// commands
	this.testCode = Utils.createCommand(this, function () {

		this.testing(true);
		RL.remote().testTwoFactor(function (sResult, oData) {
			
			self.testing(false);
			self.code.status(Enums.StorageResultType.Success === sResult && oData && oData.Result ? true : false);
			
		}, this.code());
		
	}, function () {
		return '' !== this.code() && !this.testing();
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsTwoFactorTestViewModel', PopupsTwoFactorTestViewModel);

PopupsTwoFactorTestViewModel.prototype.clearPopup = function ()
{
	this.code('');
	this.code.focused(false);
	this.code.status(null);
	this.testing(false);
};

PopupsTwoFactorTestViewModel.prototype.onShow = function ()
{
	this.clearPopup();
};

PopupsTwoFactorTestViewModel.prototype.onFocus = function ()
{
	this.code.focused(true);
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
function PopupsKeyboardShortcutsHelpViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsKeyboardShortcutsHelp');

	this.sDefaultKeyScope = Enums.KeyState.PopupKeyboardShortcutsHelp;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsKeyboardShortcutsHelpViewModel', PopupsKeyboardShortcutsHelpViewModel);

PopupsKeyboardShortcutsHelpViewModel.prototype.onBuild = function (oDom)
{
	key('tab, shift+tab', Enums.KeyState.PopupKeyboardShortcutsHelp, _.bind(function (event, handler) {
		if (event && handler)
		{
			var
				$tabs = oDom.find('.nav.nav-tabs > li'),
				bNext = handler && 'tab' === handler.shortcut,
				iIndex = $tabs.index($tabs.filter('.active'))
			;

			if (!bNext && iIndex > 0)
			{
				iIndex--;
			}
			else if (bNext && iIndex < $tabs.length - 1)
			{
				iIndex++;
			}
			else
			{
				iIndex = bNext ? 0 : $tabs.length - 1;
			}

			$tabs.eq(iIndex).find('a[data-toggle="tab"]').tab('show');
			return false;
		}
	}, this));
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function LoginViewModel()
{
	KnoinAbstractViewModel.call(this, 'Center', 'Login');

	var oData = RL.data();

	this.email = ko.observable('');
	this.login = ko.observable('');
	this.password = ko.observable('');
	this.signMe = ko.observable(false);

	this.additionalCode = ko.observable('');
	this.additionalCode.error = ko.observable(false);
	this.additionalCode.focused = ko.observable(false);
	this.additionalCode.visibility = ko.observable(false);
	this.additionalCodeSignMe = ko.observable(false);

	this.logoImg = Utils.trim(RL.settingsGet('LoginLogo'));
	this.loginDescription = Utils.trim(RL.settingsGet('LoginDescription'));
	this.logoCss = Utils.trim(RL.settingsGet('LoginCss'));

	this.emailError = ko.observable(false);
	this.loginError = ko.observable(false);
	this.passwordError = ko.observable(false);

	this.emailFocus = ko.observable(false);
	this.loginFocus = ko.observable(false);
	this.submitFocus = ko.observable(false);

	this.email.subscribe(function () {
		this.emailError(false);
		this.additionalCode('');
		this.additionalCode.visibility(false);
	}, this);

	this.login.subscribe(function () {
		this.loginError(false);
	}, this);

	this.password.subscribe(function () {
		this.passwordError(false);
	}, this);

	this.additionalCode.subscribe(function () {
		this.additionalCode.error(false);
	}, this);

	this.additionalCode.visibility.subscribe(function () {
		this.additionalCode.error(false);
	}, this);

	this.submitRequest = ko.observable(false);
	this.submitError = ko.observable('');

	this.allowCustomLogin = oData.allowCustomLogin;
	this.allowLanguagesOnLogin = oData.allowLanguagesOnLogin;

	this.langRequest = ko.observable(false);
	this.mainLanguage = oData.mainLanguage;
	this.bSendLanguage = false;

	this.mainLanguageFullName = ko.computed(function () {
		return Utils.convertLangName(this.mainLanguage());
	}, this);

	this.signMeType = ko.observable(Enums.LoginSignMeType.Unused);

	this.signMeType.subscribe(function (iValue) {
		this.signMe(Enums.LoginSignMeType.DefaultOn === iValue);
	}, this);

	this.signMeVisibility = ko.computed(function () {
		return Enums.LoginSignMeType.Unused !== this.signMeType();
	}, this);
	
	this.submitCommand = Utils.createCommand(this, function () {

		this.emailError('' === Utils.trim(this.email()));
		this.passwordError('' === Utils.trim(this.password()));

		if (this.additionalCode.visibility())
		{
			this.additionalCode.error('' === Utils.trim(this.additionalCode()));
		}

		if (this.emailError() || this.passwordError() || this.additionalCode.error())
		{
			return false;
		}

		this.submitRequest(true);

		RL.remote().login(_.bind(function (sResult, oData) {

			if (Enums.StorageResultType.Success === sResult && oData && 'Login' === oData.Action)
			{
				if (oData.Result)
				{
					if (oData.TwoFactorAuth)
					{
						this.additionalCode('');
						this.additionalCode.visibility(true);
						this.additionalCode.focused(true);
						
						this.submitRequest(false);
					}
					else
					{
						RL.loginAndLogoutReload();
					}
				}
				else if (oData.ErrorCode)
				{
					this.submitRequest(false);
					this.submitError(Utils.getNotification(oData.ErrorCode));

					if ('' === this.submitError())
					{
						this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
					}
				}
				else
				{
					this.submitRequest(false);
				}
			}
			else
			{
				this.submitRequest(false);
				this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
			}

		}, this), this.email(), this.login(), this.password(), !!this.signMe(),
			this.bSendLanguage ? this.mainLanguage() : '',
			this.additionalCode.visibility() ? this.additionalCode() : '',
			this.additionalCode.visibility() ? !!this.additionalCodeSignMe() : false
		);

		return true;

	}, function () {
		return !this.submitRequest();
	});

	this.facebookLoginEnabled = ko.observable(false);
	
	this.facebookCommand = Utils.createCommand(this, function () {

		window.open(RL.link().socialFacebook(), 'Facebook', 'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
		return true;

	}, function () {
		return !this.submitRequest() && this.facebookLoginEnabled();
	});

	this.googleLoginEnabled = ko.observable(false);

	this.googleCommand = Utils.createCommand(this, function () {

		window.open(RL.link().socialGoogle(), 'Google', 'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
		return true;

	}, function () {
		return !this.submitRequest() && this.googleLoginEnabled();
	});
	
	this.twitterLoginEnabled = ko.observable(false);

	this.twitterCommand = Utils.createCommand(this, function () {

		window.open(RL.link().socialTwitter(), 'Twitter', 'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
		return true;

	}, function () {
		return !this.submitRequest() && this.twitterLoginEnabled();
	});

	this.loginFocus.subscribe(function (bValue) {
		if (bValue && '' === this.login() && '' !== this.email())
		{
			this.login(this.email());
		}
	}, this);

	this.socialLoginEnabled = ko.computed(function () {
		
		var 
			bF = this.facebookLoginEnabled(),
			bG = this.googleLoginEnabled(),
			bT = this.twitterLoginEnabled()
		;

		return bF || bG || bT;
	}, this);

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('LoginViewModel', LoginViewModel);

LoginViewModel.prototype.onShow = function ()
{
	kn.routeOff();

	_.delay(_.bind(function () {
		if ('' !== this.email() && '' !== this.password())
		{
			this.submitFocus(true);
		}
		else
		{
			this.emailFocus(true);
		}

		if (RL.settingsGet('UserLanguage'))
		{
			$.cookie('rllang', RL.data().language(), {'expires': 30});
		}

	}, this), 100);
};

LoginViewModel.prototype.onHide = function ()
{
	this.submitFocus(false);
	this.emailFocus(false);
};

LoginViewModel.prototype.onBuild = function ()
{
	var
		self = this,
		sJsHash = RL.settingsGet('JsHash'),
		fSocial = function (iErrorCode) {
			iErrorCode = Utils.pInt(iErrorCode);
			if (0 === iErrorCode)
			{
				self.submitRequest(true);
				RL.loginAndLogoutReload();
			}
			else
			{
				self.submitError(Utils.getNotification(iErrorCode));
			}
		}
	;
	
	this.facebookLoginEnabled(!!RL.settingsGet('AllowFacebookSocial'));
	this.twitterLoginEnabled(!!RL.settingsGet('AllowTwitterSocial'));
	this.googleLoginEnabled(!!RL.settingsGet('AllowGoogleSocial'));

	switch ((RL.settingsGet('SignMe') || 'unused').toLowerCase())
	{
		case Enums.LoginSignMeTypeAsString.DefaultOff:
			this.signMeType(Enums.LoginSignMeType.DefaultOff);
			break;
		case Enums.LoginSignMeTypeAsString.DefaultOn:
			this.signMeType(Enums.LoginSignMeType.DefaultOn);
			break;
		default:
		case Enums.LoginSignMeTypeAsString.Unused:
			this.signMeType(Enums.LoginSignMeType.Unused);
			break;
	}

	this.email(RL.data().devEmail);
	this.login(RL.data().devLogin);
	this.password(RL.data().devPassword);

	if (this.googleLoginEnabled())
	{
		window['rl_' + sJsHash + '_google_login_service'] = fSocial;
	}
	
	if (this.facebookLoginEnabled())
	{
		window['rl_' + sJsHash + '_facebook_login_service'] = fSocial;
	}

	if (this.twitterLoginEnabled())
	{
		window['rl_' + sJsHash + '_twitter_login_service'] = fSocial;
	}

	_.delay(function () {
		RL.data().language.subscribe(function (sValue) {
			self.langRequest(true);
			$.ajax({
				'url': RL.link().langLink(sValue),
				'dataType': 'script',
				'cache': true
			}).done(function() {
				self.bSendLanguage = true;
				Utils.i18nToDoc();
				$.cookie('rllang', RL.data().language(), {'expires': 30});
			}).always(function() {
				self.langRequest(false);
			});
		});
	}, 50);
};

LoginViewModel.prototype.selectLanguage = function ()
{
	kn.showScreenPopup(PopupsLanguagesViewModel);
};


/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function AbstractSystemDropDownViewModel()
{
	KnoinAbstractViewModel.call(this, 'Right', 'SystemDropDown');

	var oData = RL.data();
	
	this.accounts = oData.accounts;
	this.accountEmail = oData.accountEmail;
	this.accountsLoading = oData.accountsLoading;

	this.accountMenuDropdownTrigger = ko.observable(false);

	this.allowAddAccount = RL.settingsGet('AllowAdditionalAccounts');

	this.loading = ko.computed(function () {
		return this.accountsLoading();
	}, this);

	this.accountClick = _.bind(this.accountClick, this);
}

_.extend(AbstractSystemDropDownViewModel.prototype, KnoinAbstractViewModel.prototype);

AbstractSystemDropDownViewModel.prototype.accountClick = function (oAccount, oEvent)
{
	if (oAccount && oEvent && !Utils.isUnd(oEvent.which) && 1 === oEvent.which)
	{
		var self = this;
		this.accountsLoading(true);
		_.delay(function () {
			self.accountsLoading(false);
		}, 1000);
	}
	
	return true;
};

AbstractSystemDropDownViewModel.prototype.emailTitle = function ()
{
	return RL.data().accountEmail();
};

AbstractSystemDropDownViewModel.prototype.settingsClick = function ()
{
	kn.setHash(RL.link().settings());
};

AbstractSystemDropDownViewModel.prototype.addAccountClick = function ()
{
	if (this.allowAddAccount)
	{
		kn.showScreenPopup(PopupsAddAccountViewModel);
	}
};

AbstractSystemDropDownViewModel.prototype.logoutClick = function ()
{
	RL.remote().logout(function () {
		if (window.__rlah_clear)
		{
			window.__rlah_clear();
		}

		RL.loginAndLogoutReload(true, RL.settingsGet('ParentEmail') && 0 < RL.settingsGet('ParentEmail').length);
	});
};

AbstractSystemDropDownViewModel.prototype.onBuild = function ()
{
	var self = this;
	key('`', [Enums.KeyState.MessageList, Enums.KeyState.MessageView, Enums.KeyState.Settings], function () {
		if (self.viewModelVisibility())
		{
			self.accountMenuDropdownTrigger(true);
		}
	});
};

/**
 * @constructor
 * @extends AbstractSystemDropDownViewModel
 */
function MailBoxSystemDropDownViewModel()
{
	AbstractSystemDropDownViewModel.call(this);
	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('MailBoxSystemDropDownViewModel', MailBoxSystemDropDownViewModel, AbstractSystemDropDownViewModel);

/**
 * @constructor
 * @extends AbstractSystemDropDownViewModel
 */
function SettingsSystemDropDownViewModel()
{
	AbstractSystemDropDownViewModel.call(this);
	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('SettingsSystemDropDownViewModel', SettingsSystemDropDownViewModel, AbstractSystemDropDownViewModel);

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function MailBoxFolderListViewModel()
{
	KnoinAbstractViewModel.call(this, 'Left', 'MailFolderList');

	var oData = RL.data();
	
	this.messageList = oData.messageList;
	this.folderList = oData.folderList;
	this.folderListSystem = oData.folderListSystem;
	this.foldersChanging = oData.foldersChanging;

	this.iDropOverTimer = 0;

	this.allowContacts = !!RL.settingsGet('ContactsIsAllowed');

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('MailBoxFolderListViewModel', MailBoxFolderListViewModel);

MailBoxFolderListViewModel.prototype.onBuild = function (oDom)
{
	var self = this;

	oDom
		.on('click', '.b-folders .e-item .e-link .e-collapsed-sign', function (oEvent) {

			var
				oFolder = ko.dataFor(this),
				bCollapsed = false
			;

			if (oFolder && oEvent)
			{
				bCollapsed = oFolder.collapsed();
				Utils.setExpandedFolder(oFolder.fullNameHash, bCollapsed);

				oFolder.collapsed(!bCollapsed);
				oEvent.preventDefault();
				oEvent.stopPropagation();
			}
		})
		.on('click', '.b-folders .e-item .e-link.selectable', function (oEvent) {

			oEvent.preventDefault();

			var
				oData = RL.data(),
				oFolder = ko.dataFor(this)
			;

			if (oFolder)
			{
				if (Enums.Layout.NoPreview === oData.layout())
				{
					oData.message(null);
				}
				
				if (oFolder.fullNameRaw === oData.currentFolderFullNameRaw())
				{
					RL.cache().setFolderHash(oFolder.fullNameRaw, '');
				}

				kn.setHash(RL.link().mailBox(oFolder.fullNameHash));
			}
		})
	;

	key('up, down', Enums.KeyState.FolderList, function (event, handler) {

		var
			iIndex = -1,
			iKeyCode = handler && 'up' === handler.shortcut ? 38 : 40,
			$items = $('.b-folders .e-item .e-link:not(.hidden):visible', oDom)
		;

		if (event && $items.length)
		{
			iIndex = $items.index($items.filter('.focused'));
			if (-1 < iIndex)
			{
				$items.eq(iIndex).removeClass('focused');
			}

			if (iKeyCode === 38 && iIndex > 0)
			{
				iIndex--;
			}
			else if (iKeyCode === 40 && iIndex < $items.length - 1)
			{
				iIndex++;
			}

			$items.eq(iIndex).addClass('focused');
		}
		
		return false;
	});

	key('enter', Enums.KeyState.FolderList, function () {
		var $items = $('.b-folders .e-item .e-link:not(.hidden).focused', oDom);
		if ($items.length && $items[0])
		{
			self.folderList.focused(false);
			$items.click();
		}

		return false;
	});

	key('esc, tab, shift+tab, right', Enums.KeyState.FolderList, function () {
		self.folderList.focused(false);
		return false;
	});

	self.folderList.focused.subscribe(function (bValue) {
		$('.b-folders .e-item .e-link.focused', oDom).removeClass('focused');
		if (bValue)
		{
			$('.b-folders .e-item .e-link.selected', oDom).addClass('focused');
		}
	});
};

MailBoxFolderListViewModel.prototype.messagesDropOver = function (oFolder)
{
	window.clearTimeout(this.iDropOverTimer);
	if (oFolder && oFolder.collapsed())
	{
		this.iDropOverTimer = window.setTimeout(function () {
			oFolder.collapsed(false);
			Utils.setExpandedFolder(oFolder.fullNameHash, true);
			Utils.windowResize();
		}, 500);
	}
};

MailBoxFolderListViewModel.prototype.messagesDropOut = function ()
{
	window.clearTimeout(this.iDropOverTimer);
};

/**
 *
 * @param {FolderModel} oToFolder
 * @param {{helper:jQuery}} oUi
 */
MailBoxFolderListViewModel.prototype.messagesDrop = function (oToFolder, oUi)
{
	if (oToFolder && oUi && oUi.helper)
	{
		var
			sFromFolderFullNameRaw = oUi.helper.data('rl-folder'),
			bCopy = '1' === oUi.helper.data('rl-copy'),
			aUids = oUi.helper.data('rl-uids')
		;

		if (Utils.isNormal(sFromFolderFullNameRaw) && '' !== sFromFolderFullNameRaw && Utils.isArray(aUids))
		{
			RL.moveMessagesToFolder(sFromFolderFullNameRaw, aUids, oToFolder.fullNameRaw, bCopy);
		}
	}
};

MailBoxFolderListViewModel.prototype.composeClick = function ()
{
	kn.showScreenPopup(PopupsComposeViewModel);
};

MailBoxFolderListViewModel.prototype.createFolder = function ()
{
	kn.showScreenPopup(PopupsFolderCreateViewModel);
};

MailBoxFolderListViewModel.prototype.configureFolders = function ()
{
	kn.setHash(RL.link().settings('folders'));
};

MailBoxFolderListViewModel.prototype.contactsClick = function ()
{
	if (this.allowContacts)
	{
		kn.showScreenPopup(PopupsContactsViewModel);
	}
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function MailBoxMessageListViewModel()
{
	KnoinAbstractViewModel.call(this, 'Right', 'MailMessageList');

	this.sLastUid = null;
	this.bPrefetch = false;
	this.emptySubjectValue = '';

	var oData = RL.data();

	this.popupVisibility = RL.popupVisibility;

	this.message = oData.message;
	this.messageList = oData.messageList;
	this.folderList = oData.folderList;
	this.currentMessage = oData.currentMessage;
	this.isMessageSelected = oData.isMessageSelected;
	this.messageListSearch = oData.messageListSearch;
	this.messageListError = oData.messageListError;
	this.folderMenuForMove = oData.folderMenuForMove;
	
	this.useCheckboxesInList = oData.useCheckboxesInList;

	this.mainMessageListSearch = oData.mainMessageListSearch;
	this.messageListEndFolder = oData.messageListEndFolder;

	this.messageListChecked = oData.messageListChecked;
	this.messageListCheckedOrSelected = oData.messageListCheckedOrSelected;
	this.messageListCheckedOrSelectedUidsWithSubMails = oData.messageListCheckedOrSelectedUidsWithSubMails;
	this.messageListCompleteLoadingThrottle = oData.messageListCompleteLoadingThrottle;

	Utils.initOnStartOrLangChange(function () {
		this.emptySubjectValue = Utils.i18n('MESSAGE_LIST/EMPTY_SUBJECT_TEXT');
	}, this);

	this.userQuota = oData.userQuota;
	this.userUsageSize = oData.userUsageSize;
	this.userUsageProc = oData.userUsageProc;

	this.moveDropdownTrigger = ko.observable(false);
	this.moreDropdownTrigger = ko.observable(false);

	// append drag and drop
	this.dragOver = ko.observable(false).extend({'throttle': 1});
	this.dragOverEnter = ko.observable(false).extend({'throttle': 1});
	this.dragOverArea = ko.observable(null);
	this.dragOverBodyArea = ko.observable(null);

	this.messageListItemTemplate = ko.computed(function () {
		return Enums.Layout.NoPreview !== oData.layout() ?
			'MailMessageListItem' : 'MailMessageListItemNoPreviewPane';
	});

	this.messageListSearchDesc = ko.computed(function () {
		var sValue = oData.messageListEndSearch();
		return '' === sValue ? '' : Utils.i18n('MESSAGE_LIST/SEARCH_RESULT_FOR', {'SEARCH': sValue});
	});

	this.messageListPagenator = ko.computed(Utils.computedPagenatorHelper(oData.messageListPage, oData.messageListPageCount));

	this.checkAll = ko.computed({
		'read': function () {
			return 0 < RL.data().messageListChecked().length;
		},

		'write': function (bValue) {
			bValue = !!bValue;
			_.each(RL.data().messageList(), function (oMessage) {
				oMessage.checked(bValue);
			});
		}
	});

	this.inputMessageListSearchFocus = ko.observable(false);

	this.sLastSearchValue = '';
	this.inputProxyMessageListSearch = ko.computed({
		'read': this.mainMessageListSearch,
		'write': function (sValue) {
			this.sLastSearchValue = sValue;
		},
		'owner': this
	});

	this.isIncompleteChecked = ko.computed(function () {
		var
			iM = RL.data().messageList().length,
			iC = RL.data().messageListChecked().length
		;
		return 0 < iM && 0 < iC && iM > iC;
	}, this);

	this.hasMessages = ko.computed(function () {
		return 0 < this.messageList().length;
	}, this);

	this.hasCheckedOrSelectedLines = ko.computed(function () {
		return 0 < this.messageListCheckedOrSelected().length;
	}, this);

	this.isSpamFolder = ko.computed(function () {
		return oData.spamFolder() === this.messageListEndFolder() &&
			'' !== oData.spamFolder();
	}, this);

	this.isSpamDisabled = ko.computed(function () {
		return Consts.Values.UnuseOptionValue === oData.spamFolder();
	}, this);

	this.isTrashFolder = ko.computed(function () {
		return oData.trashFolder() === this.messageListEndFolder() &&
			'' !== oData.trashFolder();
	}, this);

	this.isDraftFolder = ko.computed(function () {
		return oData.draftFolder() === this.messageListEndFolder() &&
			'' !== oData.draftFolder();
	}, this);

	this.isSentFolder = ko.computed(function () {
		return oData.sentFolder() === this.messageListEndFolder() &&
			'' !== oData.sentFolder();
	}, this);

	this.isArchiveFolder = ko.computed(function () {
		return oData.archiveFolder() === this.messageListEndFolder() &&
			'' !== oData.archiveFolder();
	}, this);

	this.isArchiveDisabled = ko.computed(function () {
		return Consts.Values.UnuseOptionValue === RL.data().archiveFolder();
	}, this);

	this.canBeMoved = this.hasCheckedOrSelectedLines;

	this.clearCommand = Utils.createCommand(this, function () {
		kn.showScreenPopup(PopupsFolderClearViewModel, [RL.data().currentFolder()]);
	});

	this.multyForwardCommand = Utils.createCommand(this, function () {
		kn.showScreenPopup(PopupsComposeViewModel, [Enums.ComposeType.ForwardAsAttachment, RL.data().messageListCheckedOrSelected()]);
	}, this.canBeMoved);
	
	this.deleteWithoutMoveCommand = Utils.createCommand(this, function () {
		RL.deleteMessagesFromFolder(Enums.FolderType.Trash,
			RL.data().currentFolderFullNameRaw(),
			RL.data().messageListCheckedOrSelectedUidsWithSubMails(), false);
	}, this.canBeMoved);

	this.deleteCommand = Utils.createCommand(this, function () {
		RL.deleteMessagesFromFolder(Enums.FolderType.Trash, 
			RL.data().currentFolderFullNameRaw(),
			RL.data().messageListCheckedOrSelectedUidsWithSubMails(), true);
	}, this.canBeMoved);

	this.archiveCommand = Utils.createCommand(this, function () {
		RL.deleteMessagesFromFolder(Enums.FolderType.Archive,
			RL.data().currentFolderFullNameRaw(),
			RL.data().messageListCheckedOrSelectedUidsWithSubMails(), true);
	}, this.canBeMoved);
	
	this.spamCommand = Utils.createCommand(this, function () {
		RL.deleteMessagesFromFolder(Enums.FolderType.Spam,
			RL.data().currentFolderFullNameRaw(),
			RL.data().messageListCheckedOrSelectedUidsWithSubMails(), true);
	}, this.canBeMoved);

	this.moveCommand = Utils.createCommand(this, Utils.emptyFunction, this.canBeMoved);

	this.reloadCommand = Utils.createCommand(this, function () {
		if (!RL.data().messageListCompleteLoadingThrottle())
		{
			RL.reloadMessageList(false, true);
		}
	});
	
	this.quotaTooltip = _.bind(this.quotaTooltip, this);
	
	this.selector = new Selector(this.messageList, this.currentMessage,
		'.messageListItem .actionHandle', '.messageListItem.selected', '.messageListItem .checkboxMessage',
			'.messageListItem.focused');

	this.selector.on('onItemSelect', _.bind(function (oMessage) {
		if (oMessage)
		{
			oData.message(oData.staticMessageList.populateByMessageListItem(oMessage));
			this.populateMessageBody(oData.message());

			if (Enums.Layout.NoPreview === oData.layout())
			{
				kn.setHash(RL.link().messagePreview(), true);
				oData.message.focused(true);
			}
		}
		else
		{
			oData.message(null);
		}
	}, this));

	this.selector.on('onItemGetUid', function (oMessage) {
		return oMessage ? oMessage.generateUid() : '';
	});

	oData.layout.subscribe(function (mValue) {
		this.selector.autoSelect(Enums.Layout.NoPreview !== mValue);
	}, this);

	oData.layout.valueHasMutated();

	RL
		.sub('mailbox.message-list.selector.go-down', function () {
			this.selector.goDown(true);
		}, this)
		.sub('mailbox.message-list.selector.go-up', function () {
			this.selector.goUp(true);
		}, this)
	;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('MailBoxMessageListViewModel', MailBoxMessageListViewModel);

/**
 * @type {string}
 */
MailBoxMessageListViewModel.prototype.emptySubjectValue = '';

MailBoxMessageListViewModel.prototype.searchEnterAction = function ()
{
	this.mainMessageListSearch(this.sLastSearchValue);
	this.inputMessageListSearchFocus(false);
};

/**
 * @returns {string}
 */
MailBoxMessageListViewModel.prototype.printableMessageCountForDeletion = function ()
{
	var iCnt = this.messageListCheckedOrSelectedUidsWithSubMails().length;
	return 1 < iCnt ? ' (' + (100 > iCnt ? iCnt : '99+') + ')' : '';
};

MailBoxMessageListViewModel.prototype.cancelSearch = function ()
{
	this.mainMessageListSearch('');
	this.inputMessageListSearchFocus(false);
};

/**
 * @param {string} sToFolderFullNameRaw
 * @return {boolean}
 */
MailBoxMessageListViewModel.prototype.moveSelectedMessagesToFolder = function (sToFolderFullNameRaw)
{
	if (this.canBeMoved())
	{
		RL.moveMessagesToFolder(
			RL.data().currentFolderFullNameRaw(),
			RL.data().messageListCheckedOrSelectedUidsWithSubMails(), sToFolderFullNameRaw);
	}

	return false;
};

MailBoxMessageListViewModel.prototype.dragAndDronHelper = function (oMessageListItem, bCopy)
{
	if (oMessageListItem)
	{
		oMessageListItem.checked(true);
	}

	var oEl = Utils.draggeblePlace();
	oEl.data('rl-folder', RL.data().currentFolderFullNameRaw());
	oEl.data('rl-uids', RL.data().messageListCheckedOrSelectedUidsWithSubMails());
	oEl.data('rl-copy', bCopy ? '1' : '0');
	oEl.find('.text').text((bCopy ? '+' : '') + '' + RL.data().messageListCheckedOrSelectedUidsWithSubMails().length);

	return oEl;
};

/**
 * @param {string} sResult
 * @param {AjaxJsonDefaultResponse} oData
 * @param {boolean} bCached
 */
MailBoxMessageListViewModel.prototype.onMessageResponse = function (sResult, oData, bCached)
{
	var oRainLoopData = RL.data();

	oRainLoopData.hideMessageBodies();
	oRainLoopData.messageLoading(false);
	
	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		oRainLoopData.setMessage(oData, bCached);
	}
	else if (Enums.StorageResultType.Unload === sResult)
	{
		oRainLoopData.message(null);
		oRainLoopData.messageError('');
	}
	else if (Enums.StorageResultType.Abort !== sResult)
	{
		oRainLoopData.message(null);
		oRainLoopData.messageError((oData && oData.ErrorCode ?
			Utils.getNotification(oData.ErrorCode) :
			Utils.getNotification(Enums.Notification.UnknownError)));
	}
};

MailBoxMessageListViewModel.prototype.populateMessageBody = function (oMessage)
{
	if (oMessage)
	{
		if (RL.remote().message(this.onMessageResponse, oMessage.folderFullNameRaw, oMessage.uid))
		{
			RL.data().messageLoading(true);
		}
		else
		{
			Utils.log('Error: Unknown message request: ' + oMessage.folderFullNameRaw + ' ~ ' + oMessage.uid + ' [e-101]');
		}
	}
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {number} iSetAction
 * @param {Array=} aMessages = null
 */
MailBoxMessageListViewModel.prototype.setAction = function (sFolderFullNameRaw, iSetAction, aMessages)
{
	var
		aUids = [],
		oFolder = null,
		oCache = RL.cache(),
		iAlreadyUnread = 0
	;

	if (Utils.isUnd(aMessages))
	{
		aMessages = RL.data().messageListChecked();
	}

	aUids = _.map(aMessages, function (oMessage) {
		return oMessage.uid;
	});

	if ('' !== sFolderFullNameRaw && 0 < aUids.length)
	{
		switch (iSetAction) {
		case Enums.MessageSetAction.SetSeen:
			_.each(aMessages, function (oMessage) {
				if (oMessage.unseen())
				{
					iAlreadyUnread++;
				}

				oMessage.unseen(false);
				oCache.storeMessageFlagsToCache(oMessage);
			});

			oFolder = oCache.getFolderFromCacheList(sFolderFullNameRaw);
			if (oFolder)
			{
				oFolder.messageCountUnread(oFolder.messageCountUnread() - iAlreadyUnread);
			}

			RL.remote().messageSetSeen(Utils.emptyFunction, sFolderFullNameRaw, aUids, true);
			break;
		case Enums.MessageSetAction.UnsetSeen:
			_.each(aMessages, function (oMessage) {
				if (oMessage.unseen())
				{
					iAlreadyUnread++;
				}

				oMessage.unseen(true);
				oCache.storeMessageFlagsToCache(oMessage);
			});

			oFolder = oCache.getFolderFromCacheList(sFolderFullNameRaw);
			if (oFolder)
			{
				oFolder.messageCountUnread(oFolder.messageCountUnread() - iAlreadyUnread + aUids.length);
			}
			RL.remote().messageSetSeen(Utils.emptyFunction, sFolderFullNameRaw, aUids, false);
			break;
		case Enums.MessageSetAction.SetFlag:
			_.each(aMessages, function (oMessage) {
				oMessage.flagged(true);
				oCache.storeMessageFlagsToCache(oMessage);
			});
			RL.remote().messageSetFlagged(Utils.emptyFunction, sFolderFullNameRaw, aUids, true);
			break;
		case Enums.MessageSetAction.UnsetFlag:
			_.each(aMessages, function (oMessage) {
				oMessage.flagged(false);
				oCache.storeMessageFlagsToCache(oMessage);
			});
			RL.remote().messageSetFlagged(Utils.emptyFunction, sFolderFullNameRaw, aUids, false);
			break;
		}

		RL.reloadFlagsCurrentMessageListAndMessageFromCache();
	}
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {number} iSetAction
 */
MailBoxMessageListViewModel.prototype.setActionForAll = function (sFolderFullNameRaw, iSetAction)
{
	var
		oFolder = null,
		aMessages = RL.data().messageList(),
		oCache = RL.cache()
	;

	if ('' !== sFolderFullNameRaw)
	{
		oFolder = oCache.getFolderFromCacheList(sFolderFullNameRaw);

		if (oFolder)
		{
			switch (iSetAction) {
			case Enums.MessageSetAction.SetSeen:
				oFolder = oCache.getFolderFromCacheList(sFolderFullNameRaw);
				if (oFolder)
				{
					_.each(aMessages, function (oMessage) {
						oMessage.unseen(false);
					});

					oFolder.messageCountUnread(0);
					oCache.clearMessageFlagsFromCacheByFolder(sFolderFullNameRaw);
				}

				RL.remote().messageSetSeenToAll(Utils.emptyFunction, sFolderFullNameRaw, true);
				break;
			case Enums.MessageSetAction.UnsetSeen:
				oFolder = oCache.getFolderFromCacheList(sFolderFullNameRaw);
				if (oFolder)
				{
					_.each(aMessages, function (oMessage) {
						oMessage.unseen(true);
					});

					oFolder.messageCountUnread(oFolder.messageCountAll());
					oCache.clearMessageFlagsFromCacheByFolder(sFolderFullNameRaw);
				}
				RL.remote().messageSetSeenToAll(Utils.emptyFunction, sFolderFullNameRaw, false);
				break;
			}

			RL.reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	}
};

MailBoxMessageListViewModel.prototype.listSetSeen = function ()
{
	this.setAction(RL.data().currentFolderFullNameRaw(), Enums.MessageSetAction.SetSeen, RL.data().messageListCheckedOrSelected());
};

MailBoxMessageListViewModel.prototype.listSetAllSeen = function ()
{
	this.setActionForAll(RL.data().currentFolderFullNameRaw(), Enums.MessageSetAction.SetSeen);
};

MailBoxMessageListViewModel.prototype.listUnsetSeen = function ()
{
	this.setAction(RL.data().currentFolderFullNameRaw(), Enums.MessageSetAction.UnsetSeen, RL.data().messageListCheckedOrSelected());
};

MailBoxMessageListViewModel.prototype.listSetFlags = function ()
{
	this.setAction(RL.data().currentFolderFullNameRaw(), Enums.MessageSetAction.SetFlag, RL.data().messageListCheckedOrSelected());
};

MailBoxMessageListViewModel.prototype.listUnsetFlags = function ()
{
	this.setAction(RL.data().currentFolderFullNameRaw(), Enums.MessageSetAction.UnsetFlag, RL.data().messageListCheckedOrSelected());
};

MailBoxMessageListViewModel.prototype.flagMessages = function (oCurrentMessage)
{
	var
		aChecked = this.messageListCheckedOrSelected(),
		aCheckedUids = []
	;

	if (oCurrentMessage)
	{
		if (0 < aChecked.length)
		{
			aCheckedUids = _.map(aChecked, function (oMessage) {
				return oMessage.uid;
			});
		}

		if (0 < aCheckedUids.length && -1 < Utils.inArray(oCurrentMessage.uid, aCheckedUids))
		{
			this.setAction(oCurrentMessage.folderFullNameRaw, oCurrentMessage.flagged() ?
				Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
		}
		else
		{
			this.setAction(oCurrentMessage.folderFullNameRaw, oCurrentMessage.flagged() ?
				Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, [oCurrentMessage]);
		}
	}
};

MailBoxMessageListViewModel.prototype.flagMessagesFast = function (bFlag)
{
	var
		aChecked = this.messageListCheckedOrSelected(),
		aFlagged = []
	;

	if (0 < aChecked.length)
	{
		aFlagged = _.filter(aChecked, function (oMessage) {
			return oMessage.flagged();
		});

		if (Utils.isUnd(bFlag))
		{
			this.setAction(aChecked[0].folderFullNameRaw,
				aChecked.length === aFlagged.length ? Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
		}
		else
		{
			this.setAction(aChecked[0].folderFullNameRaw,
				!bFlag ? Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
		}
	}
};

MailBoxMessageListViewModel.prototype.seenMessagesFast = function (bSeen)
{
	var
		aChecked = this.messageListCheckedOrSelected(),
		aUnseen = []
	;

	if (0 < aChecked.length)
	{
		aUnseen = _.filter(aChecked, function (oMessage) {
			return oMessage.unseen();
		});

		if (Utils.isUnd(bSeen))
		{
			this.setAction(aChecked[0].folderFullNameRaw,
				0 < aUnseen.length ? Enums.MessageSetAction.SetSeen : Enums.MessageSetAction.UnsetSeen, aChecked);
		}
		else
		{
			this.setAction(aChecked[0].folderFullNameRaw,
				bSeen ? Enums.MessageSetAction.SetSeen : Enums.MessageSetAction.UnsetSeen, aChecked);
		}
	}
};

MailBoxMessageListViewModel.prototype.onBuild = function (oDom)
{
	var 
		self = this,
		oData = RL.data()
	;

	this.oContentVisible = $('.b-content', oDom);
	this.oContentScrollable = $('.content', this.oContentVisible);

	this.oContentVisible.on('click', '.fullThreadHandle', function () {
		var
			aList = [],
			oMessage = ko.dataFor(this)
		;

		if (oMessage && !oMessage.lastInCollapsedThreadLoading())
		{
			RL.data().messageListThreadFolder(oMessage.folderFullNameRaw);

			aList = RL.data().messageListThreadUids();

			if (oMessage.lastInCollapsedThread())
			{
				aList.push(0 < oMessage.parentUid() ? oMessage.parentUid() : oMessage.uid);
			}
			else
			{
				aList = _.without(aList, 0 < oMessage.parentUid() ? oMessage.parentUid() : oMessage.uid);
			}

			RL.data().messageListThreadUids(_.uniq(aList));

			oMessage.lastInCollapsedThreadLoading(true);
			oMessage.lastInCollapsedThread(!oMessage.lastInCollapsedThread());
			RL.reloadMessageList();
		}

		return false;
	});

	this.selector.init(this.oContentVisible, this.oContentScrollable, Enums.KeyState.MessageList);

	oDom
		.on('click', '.messageList .b-message-list-wrapper', function () {
			if (self.message.focused())
			{
				self.message.focused(false);
			}
		})
		.on('click', '.e-pagenator .e-page', function () {
			var oPage = ko.dataFor(this);
			if (oPage)
			{
				kn.setHash(RL.link().mailBox(
					oData.currentFolderFullNameHash(),
					oPage.value,
					oData.messageListSearch()
				));
			}
		})
		.on('click', '.messageList .checkboxCkeckAll', function () {
			self.checkAll(!self.checkAll());
		})
		.on('click', '.messageList .messageListItem .flagParent', function () {
			self.flagMessages(ko.dataFor(this));
		})
	;

	this.initUploaderForAppend();
	this.initShortcuts();

	if (!Globals.bMobileDevice && !!RL.settingsGet('AllowPrefetch') && ifvisible)
	{
		ifvisible.setIdleDuration(10);

		ifvisible.idle(function () {
			self.prefetchNextTick();
		});
	}
};

MailBoxMessageListViewModel.prototype.initShortcuts = function ()
{
	var self = this;

	// disable print
	key('ctrl+p, command+p', Enums.KeyState.MessageList, function () {
		return false;
	});

	// TODO // more toggle
//	key('', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
//		self.moreDropdownTrigger(true);
//		return false;
//	});

	// archive (zip)
	key('z', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		self.archiveCommand();
		return false;
	});
	
	// delete
	key('delete, shift+delete', Enums.KeyState.MessageList, function (event, handler) {
		if (event)
		{
			if (0 < RL.data().messageListCheckedOrSelected().length)
			{
				if (handler && 'shift+delete' === handler.shortcut)
				{
					self.deleteWithoutMoveCommand();
				}
				else
				{
					self.deleteCommand();
				}
			}

			return false;
		}
	});

	// check all
	key('ctrl+a, command+a', Enums.KeyState.MessageList, function () {
		self.checkAll(!(self.checkAll() && !self.isIncompleteChecked()));
		return false;
	});

	// write/compose (open compose popup)
	key('w,c', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		kn.showScreenPopup(PopupsComposeViewModel);
		return false;
	});

	// important - star/flag messages
	key('i', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		self.flagMessagesFast();
		return false;
	});

	// move
	key('m', Enums.KeyState.MessageList, function () {
		self.moveDropdownTrigger(true);
		return false;
	});

	// read
	key('q', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		self.seenMessagesFast(true);
		return false;
	});

	// unread
	key('u', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		self.seenMessagesFast(false);
		return false;
	});

	// shortcuts help
	key('shift+/', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		kn.showScreenPopup(PopupsKeyboardShortcutsHelpViewModel);
		return false;
	});

	key('shift+f', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		self.multyForwardCommand();
		return false;
	});

	// search input focus
	key('/', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		self.inputMessageListSearchFocus(true);
		return false;
	});

	// cancel search
	key('esc', Enums.KeyState.MessageList, function () {
		if ('' !== self.messageListSearchDesc())
		{
			self.cancelSearch();
			return false;
		}
	});

	// change focused state
	key('tab, shift+tab, left, right', Enums.KeyState.MessageList, function (event, handler) {
		if (event && handler && 'shift+tab' === handler.shortcut || 'left' === handler.shortcut)
		{
			self.folderList.focused(true);
		}
		else if (self.message())
		{
			self.message.focused(true);
		}

		return false;
	});

	// TODO
	key('ctrl+left, command+left', Enums.KeyState.MessageView, function () {
		return false;
	});

	// TODO
	key('ctrl+right, command+right', Enums.KeyState.MessageView, function () {
		return false;
	});
};

MailBoxMessageListViewModel.prototype.prefetchNextTick = function ()
{
	if (!this.bPrefetch && !ifvisible.now() && this.viewModelVisibility())
	{
		var 
			self = this,
			oCache = RL.cache(),
			oMessage = _.find(this.messageList(), function (oMessage) {
				return oMessage &&
					!oCache.hasRequestedMessage(oMessage.folderFullNameRaw, oMessage.uid);
			})
		;
		
		if (oMessage)
		{
			this.bPrefetch = true;

			RL.cache().addRequestedMessage(oMessage.folderFullNameRaw, oMessage.uid);
			
			RL.remote().message(function (sResult, oData) {
				
				var bNext = !!(Enums.StorageResultType.Success === sResult && oData && oData.Result);
				
				_.delay(function () {
					self.bPrefetch = false;
					if (bNext)
					{
						self.prefetchNextTick();
					}
				}, 1000);
				
			}, oMessage.folderFullNameRaw, oMessage.uid);
		}
	}
};

MailBoxMessageListViewModel.prototype.composeClick = function ()
{
	kn.showScreenPopup(PopupsComposeViewModel);
};

MailBoxMessageListViewModel.prototype.advancedSearchClick = function ()
{
	kn.showScreenPopup(PopupsAdvancedSearchViewModel);
};

MailBoxMessageListViewModel.prototype.quotaTooltip = function ()
{
	return Utils.i18n('MESSAGE_LIST/QUOTA_SIZE', {
		'SIZE': Utils.friendlySize(this.userUsageSize()),
		'PROC': this.userUsageProc(),
		'LIMIT': Utils.friendlySize(this.userQuota())
	});
};

MailBoxMessageListViewModel.prototype.initUploaderForAppend = function ()
{
	if (!RL.settingsGet('AllowAppendMessage') || !this.dragOverArea())
	{
		return false;
	}

	var oJua = new Jua({
		'action': RL.link().append(),
		'name': 'AppendFile',
		'queueSize': 1,
		'multipleSizeLimit': 1,
		'disableFolderDragAndDrop': true,
		'hidden': {
			'Folder': function () {
				return RL.data().currentFolderFullNameRaw();
			}
		},
		'dragAndDropElement': this.dragOverArea(),
		'dragAndDropBodyElement': this.dragOverBodyArea()
	});

	oJua
		.on('onDragEnter', _.bind(function () {
			this.dragOverEnter(true);
		}, this))
		.on('onDragLeave', _.bind(function () {
			this.dragOverEnter(false);
		}, this))
		.on('onBodyDragEnter', _.bind(function () {
			this.dragOver(true);
		}, this))
		.on('onBodyDragLeave', _.bind(function () {
			this.dragOver(false);
		}, this))
		.on('onSelect', _.bind(function (sUid, oData) {
			if (sUid && oData && 'message/rfc822' === oData['Type'])
			{
				RL.data().messageListLoading(true);
				return true;
			}

			return false;
		}, this))
		.on('onComplete', _.bind(function () {
			RL.reloadMessageList(true, true);
		}, this))
	;

	return !!oJua;
};
/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function MailBoxMessageViewViewModel()
{
	KnoinAbstractViewModel.call(this, 'Right', 'MailMessageView');

	var
		sPic = '',
		oData = RL.data(),
		self = this,
		createCommandHelper = function (sType) {
			return Utils.createCommand(self, function () {
				this.replyOrforward(sType);
			}, self.canBeRepliedOrForwarded);
		}
	;

	this.oMessageScrollerDom = null;

	this.keyScope = oData.keyScope;
	this.message = oData.message;
	this.currentMessage = oData.currentMessage;
	this.messageListChecked = oData.messageListChecked;
	this.hasCheckedMessages = oData.hasCheckedMessages;
	this.messageLoading = oData.messageLoading;
	this.messageLoadingThrottle = oData.messageLoadingThrottle;
	this.messagesBodiesDom = oData.messagesBodiesDom;
	this.useThreads = oData.useThreads;
	this.replySameFolder = oData.replySameFolder;
	this.layout = oData.layout;
	this.usePreviewPane = oData.usePreviewPane;
	this.isMessageSelected = oData.isMessageSelected;
	this.messageActiveDom = oData.messageActiveDom;
	this.messageError = oData.messageError;

	this.fullScreenMode = oData.messageFullScreenMode;

	this.showFullInfo = ko.observable(false);
	this.moreDropdownTrigger = ko.observable(false);
	this.messageDomFocused = ko.observable(false).extend({'rateLimit': 0});

	this.messageVisibility = ko.computed(function () {
		return !this.messageLoadingThrottle() && !!this.message();
	}, this);

	this.message.subscribe(function (oMessage) {
		if (!oMessage)
		{
			this.currentMessage(null);
		}
	}, this);

	this.canBeRepliedOrForwarded = this.messageVisibility;

	// commands
	this.closeMessage = Utils.createCommand(this, function () {
		oData.message(null);
	});

	this.replyCommand = createCommandHelper(Enums.ComposeType.Reply);
	this.replyAllCommand = createCommandHelper(Enums.ComposeType.ReplyAll);
	this.forwardCommand = createCommandHelper(Enums.ComposeType.Forward);
	this.forwardAsAttachmentCommand = createCommandHelper(Enums.ComposeType.ForwardAsAttachment);
	this.editAsNewCommand = createCommandHelper(Enums.ComposeType.EditAsNew);
	
	this.messageVisibilityCommand = Utils.createCommand(this, Utils.emptyFunction, this.messageVisibility);
	
	this.messageEditCommand = Utils.createCommand(this, function () {
		this.editMessage();
	}, this.messageVisibility);

	this.deleteCommand = Utils.createCommand(this, function () {
		if (this.message())
		{
			RL.deleteMessagesFromFolder(Enums.FolderType.Trash,
				this.message().folderFullNameRaw,
				[this.message().uid], true);
		}
	}, this.messageVisibility);

	this.deleteWithoutMoveCommand = Utils.createCommand(this, function () {
		if (this.message())
		{
			RL.deleteMessagesFromFolder(Enums.FolderType.Trash,
				RL.data().currentFolderFullNameRaw(),
				RL.data().messageListCheckedOrSelectedUidsWithSubMails(), false);
		}
	}, this.messageVisibility);
	
	this.archiveCommand = Utils.createCommand(this, function () {
		if (this.message())
		{
			RL.deleteMessagesFromFolder(Enums.FolderType.Archive,
				this.message().folderFullNameRaw,
				[this.message().uid], true);
		}
	}, this.messageVisibility);
	
	this.spamCommand = Utils.createCommand(this, function () {
		if (this.message())
		{
			RL.deleteMessagesFromFolder(Enums.FolderType.Spam,
				this.message().folderFullNameRaw,
				[this.message().uid], true);
		}
	}, this.messageVisibility);

	// viewer
	this.viewSubject = ko.observable('');
	this.viewFromShort = ko.observable('');
	this.viewToShort = ko.observable('');
	this.viewFrom = ko.observable('');
	this.viewTo = ko.observable('');
	this.viewCc = ko.observable('');
	this.viewBcc = ko.observable('');
	this.viewDate = ko.observable('');
	this.viewMoment = ko.observable('');
	this.viewLineAsCcc = ko.observable('');
	this.viewViewLink = ko.observable('');
	this.viewDownloadLink = ko.observable('');
	this.viewUserPic = ko.observable(Consts.DataImages.UserDotPic);
	this.viewUserPicVisible = ko.observable(false);
	
	this.viewPgpPassword = ko.observable('');
	this.viewPgpSignedVerifyStatus = ko.computed(function () {
		return this.message() ? this.message().pgpSignedVerifyStatus() : Enums.SignedVerifyStatus.None;
	}, this);

	this.viewPgpSignedVerifyUser = ko.computed(function () {
		return this.message() ? this.message().pgpSignedVerifyUser() : '';
	}, this);
	
	this.message.subscribe(function (oMessage) {

		this.messageActiveDom(null);

		this.viewPgpPassword('');

		if (oMessage)
		{
			this.viewSubject(oMessage.subject());
			this.viewFromShort(oMessage.fromToLine(true, true));
			this.viewToShort(oMessage.toToLine(true, true));
			this.viewFrom(oMessage.fromToLine(false));
			this.viewTo(oMessage.toToLine(false));
			this.viewCc(oMessage.ccToLine(false));
			this.viewBcc(oMessage.bccToLine(false));
			this.viewDate(oMessage.fullFormatDateValue());
			this.viewMoment(oMessage.momentDate());
			this.viewLineAsCcc(oMessage.lineAsCcc());
			this.viewViewLink(oMessage.viewLink());
			this.viewDownloadLink(oMessage.downloadLink());

			sPic = RL.cache().getUserPic(oMessage.fromAsSingleEmail());
			if (sPic !== this.viewUserPic())
			{
				this.viewUserPicVisible(false);
				this.viewUserPic(Consts.DataImages.UserDotPic);
				if ('' !== sPic)
				{
					this.viewUserPicVisible(true);
					this.viewUserPic(sPic);
				}
			}
		}
		
	}, this);

	this.fullScreenMode.subscribe(function (bValue) {
		if (bValue)
		{
			$html.addClass('rl-message-fullscreen');
		}
		else
		{
			$html.removeClass('rl-message-fullscreen');
		}

		Utils.windowResize();
	});

	this.messageLoadingThrottle.subscribe(function (bV) {
		if (bV)
		{
			Utils.windowResize();
		}
	});

	this.messageActiveDom.subscribe(function () {
		this.scrollMessageToTop();
	}, this);

	this.goUpCommand = Utils.createCommand(this, function () {
		RL.pub('mailbox.message-list.selector.go-up');
	});
	
	this.goDownCommand = Utils.createCommand(this, function () {
		RL.pub('mailbox.message-list.selector.go-down');
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('MailBoxMessageViewViewModel', MailBoxMessageViewViewModel);

MailBoxMessageViewViewModel.prototype.isPgpActionVisible = function ()
{
	return Enums.SignedVerifyStatus.Success !== this.viewPgpSignedVerifyStatus();
};

MailBoxMessageViewViewModel.prototype.isPgpStatusVerifyVisible = function ()
{
	return Enums.SignedVerifyStatus.None !== this.viewPgpSignedVerifyStatus();
};

MailBoxMessageViewViewModel.prototype.isPgpStatusVerifySuccess = function ()
{
	return Enums.SignedVerifyStatus.Success === this.viewPgpSignedVerifyStatus();
};

MailBoxMessageViewViewModel.prototype.pgpStatusVerifyMessage = function ()
{
	var sResult = '';
	switch (this.viewPgpSignedVerifyStatus())
	{
		case Enums.SignedVerifyStatus.UnknownPublicKeys:
			sResult = Utils.i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND');
			break;
		case Enums.SignedVerifyStatus.UnknownPrivateKey:
			sResult = Utils.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND');
			break;
		case Enums.SignedVerifyStatus.Unverified:
			sResult = Utils.i18n('PGP_NOTIFICATIONS/UNVERIFIRED_SIGNATURE');
			break;
		case Enums.SignedVerifyStatus.Error:
			sResult = Utils.i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR');
			break;
		case Enums.SignedVerifyStatus.Success:
			sResult = Utils.i18n('PGP_NOTIFICATIONS/GOOD_SIGNATURE', {
				'USER': this.viewPgpSignedVerifyUser()
			});
			break;
	}

	return sResult;
};

MailBoxMessageViewViewModel.prototype.scrollToTop = function ()
{
	var oCont = $('.messageItem.nano .content', this.viewModelDom);
	if (oCont && oCont[0])
	{
//		oCont.animate({'scrollTop': 0}, 300);
		oCont.scrollTop(0);
	}
	else
	{
//		$('.messageItem', this.viewModelDom).animate({'scrollTop': 0}, 300);
		$('.messageItem', this.viewModelDom).scrollTop(0);
	}
	
	Utils.windowResize();
};

MailBoxMessageViewViewModel.prototype.fullScreen = function ()
{
	this.fullScreenMode(true);
	Utils.windowResize();
};

MailBoxMessageViewViewModel.prototype.unFullScreen = function ()
{
	this.fullScreenMode(false);
	Utils.windowResize();
};

MailBoxMessageViewViewModel.prototype.toggleFullScreen = function ()
{
	Utils.removeSelection();

	this.fullScreenMode(!this.fullScreenMode());
	Utils.windowResize();
};

/**
 * @param {string} sType
 */
MailBoxMessageViewViewModel.prototype.replyOrforward = function (sType)
{
	kn.showScreenPopup(PopupsComposeViewModel, [sType, RL.data().message()]);
};

MailBoxMessageViewViewModel.prototype.onBuild = function (oDom)
{
	var 
		self = this,
		oData = RL.data()
	;

	this.fullScreenMode.subscribe(function (bValue) {
		if (bValue)
		{
			self.message.focused(true);
		}
	}, this);
	
	$('.attachmentsPlace', oDom).magnificPopup({
		'delegate': '.magnificPopupImage:visible',
		'type': 'image',
		'gallery': {
			'enabled': true,
			'preload': [1, 1],
			'navigateByImgClick': true
		},
		'callbacks': {
			'open': function() {
				oData.useKeyboardShortcuts(false);
			},
			'close': function() {
				oData.useKeyboardShortcuts(true);
			}
		},
		'mainClass': 'mfp-fade',
		'removalDelay': 400
	});

	oDom
		.on('click', '.messageView .messageItem', function () {
			if (oData.useKeyboardShortcuts() && self.message())
			{
				self.message.focused(true);
			}
		})
		.on('mousedown', 'a', function (oEvent) {
			// setup maito protocol
			return !(oEvent && 3 !== oEvent['which'] && RL.mailToHelper($(this).attr('href')));
		})
		.on('click', '.attachmentsPlace .attachmentPreview', function (oEvent) {
			if (oEvent && oEvent.stopPropagation)
			{
				oEvent.stopPropagation();
			}
		})
		.on('click', '.attachmentsPlace .attachmentItem', function () {

			var
				oAttachment = ko.dataFor(this)
			;

			if (oAttachment && oAttachment.download)
			{
				RL.download(oAttachment.linkDownload());
			}
		})
	;

	this.message.focused.subscribe(function (bValue) {
		if (bValue && !Utils.inFocus()) {
			this.messageDomFocused(true);
		} else {
			this.messageDomFocused(false);
		}
	}, this);

	this.messageDomFocused.subscribe(function (bValue) {
		if (!bValue && Enums.KeyState.MessageView === this.keyScope())
		{
			this.message.focused(false);
		}
	}, this);

	this.keyScope.subscribe(function (sValue) {
		if (Enums.KeyState.MessageView === sValue && this.message.focused())
		{
			this.messageDomFocused(true);
		}
	}, this);

	this.oMessageScrollerDom = oDom.find('.messageItem .content');
	this.oMessageScrollerDom = this.oMessageScrollerDom && this.oMessageScrollerDom[0] ? this.oMessageScrollerDom : null;

	this.initShortcuts();
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.escShortcuts = function ()
{
	if (this.viewModelVisibility() && this.message())
	{
		if (this.fullScreenMode())
		{
			this.fullScreenMode(false);
		}
		else if (Enums.Layout.NoPreview === RL.data().layout())
		{
			this.message(null);
		}
		else
		{
			this.message.focused(false);
		}

		return false;
	}
};

MailBoxMessageViewViewModel.prototype.initShortcuts = function ()
{
	var
		self = this,
		oData = RL.data()
	;

	// exit fullscreen, back
	key('esc', Enums.KeyState.MessageView, _.bind(this.escShortcuts, this));

	// fullscreen
	key('enter', Enums.KeyState.MessageView, function () {
		self.toggleFullScreen();
		return false;
	});

	key('enter', Enums.KeyState.MessageList, function () {
		if (Enums.Layout.NoPreview !== oData.layout() && self.message())
		{
			self.toggleFullScreen();
			return false;
		}
	});

	// TODO // more toggle
//	key('', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
//		self.moreDropdownTrigger(true);
//		return false;
//	});

	// reply
	key('r', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		if (oData.message())
		{
			self.replyCommand();
			return false;
		}
	});

	// replaAll
	key('a', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		if (oData.message())
		{
			self.replyAllCommand();
			return false;
		}
	});

	// forward
	key('f', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		if (oData.message())
		{
			self.forwardCommand();
			return false;
		}
	});

	// message information
//	key('i', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
//		if (oData.message())
//		{
//			self.showFullInfo(!self.showFullInfo());
//			return false;
//		}
//	});

	// toggle message blockquotes
	key('b', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		if (oData.message() && oData.message().body)
		{
			Utils.toggleMessageBlockquote(oData.message().body);
			return false;
		}
	});

	key('ctrl+left, command+left, ctrl+up, command+up', Enums.KeyState.MessageView, function () {
		self.goUpCommand();
		return false;
	});

	key('ctrl+right, command+right, ctrl+down, command+down', Enums.KeyState.MessageView, function () {
		self.goDownCommand();
		return false;
	});

	// print
	key('ctrl+p, command+p', Enums.KeyState.MessageView, function () {
		if (self.message())
		{
			self.message().printMessage();
		}
		
		return false;
	});

	// delete
	key('delete, shift+delete', Enums.KeyState.MessageView, function (event, handler) {
		if (event)
		{
			if (handler && 'shift+delete' === handler.shortcut)
			{
				self.deleteWithoutMoveCommand();
			}
			else
			{
				self.deleteCommand();
			}
			
			return false;
		}
	});

	// change focused state
	key('tab, shift+tab, left', Enums.KeyState.MessageView, function () {
		if (!self.fullScreenMode() && self.message() && Enums.Layout.NoPreview !== oData.layout())
		{
			self.message.focused(false);
		}

		return false;
	});
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isDraftFolder = function ()
{
	return RL.data().message() && RL.data().draftFolder() === RL.data().message().folderFullNameRaw;
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isSentFolder = function ()
{
	return RL.data().message() && RL.data().sentFolder() === RL.data().message().folderFullNameRaw;
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isSpamFolder = function ()
{
	return RL.data().message() && RL.data().spamFolder() === RL.data().message().folderFullNameRaw;
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isSpamDisabled = function ()
{
	return RL.data().message() && RL.data().spamFolder() === Consts.Values.UnuseOptionValue;
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isArchiveFolder = function ()
{
	return RL.data().message() && RL.data().archiveFolder() === RL.data().message().folderFullNameRaw;
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isArchiveDisabled = function ()
{
	return RL.data().message() && RL.data().archiveFolder() === Consts.Values.UnuseOptionValue;
};

/**
 * @return {boolean}
 */
MailBoxMessageViewViewModel.prototype.isDraftOrSentFolder = function ()
{
	return this.isDraftFolder() || this.isSentFolder();
};

MailBoxMessageViewViewModel.prototype.composeClick = function ()
{
	kn.showScreenPopup(PopupsComposeViewModel);
};

MailBoxMessageViewViewModel.prototype.editMessage = function ()
{
	if (RL.data().message())
	{
		kn.showScreenPopup(PopupsComposeViewModel, [Enums.ComposeType.Draft, RL.data().message()]);
	}
};

MailBoxMessageViewViewModel.prototype.scrollMessageToTop = function ()
{
	if (this.oMessageScrollerDom)
	{
		this.oMessageScrollerDom.scrollTop(0);
	}
};

/**
 * @param {MessageModel} oMessage
 */
MailBoxMessageViewViewModel.prototype.showImages = function (oMessage)
{
	if (oMessage && oMessage.showExternalImages)
	{
		oMessage.showExternalImages(true);
	}
};

/**
 * @param {MessageModel} oMessage
 */
MailBoxMessageViewViewModel.prototype.verifyPgpSignedClearMessage = function (oMessage)
{
	if (oMessage)
	{
		oMessage.verifyPgpSignedClearMessage();
	}
};

/**
 * @param {MessageModel} oMessage
 */
MailBoxMessageViewViewModel.prototype.decryptPgpEncryptedMessage = function (oMessage)
{
	if (oMessage)
	{
		oMessage.decryptPgpEncryptedMessage(this.viewPgpPassword());
	}
};

/**
 * @param {MessageModel} oMessage
 */
MailBoxMessageViewViewModel.prototype.readReceipt = function (oMessage)
{
	if (oMessage && '' !== oMessage.readReceipt())
	{
		RL.remote().sendReadReceiptMessage(Utils.emptyFunction, oMessage.folderFullNameRaw, oMessage.uid,
			oMessage.readReceipt(), 
			Utils.i18n('READ_RECEIPT/SUBJECT', {'SUBJECT': oMessage.subject()}),
			Utils.i18n('READ_RECEIPT/BODY', {'READ-RECEIPT': oMessage.readReceipt()}));

		oMessage.isReadReceipt(true);

		RL.cache().storeMessageFlagsToCache(oMessage);
		RL.reloadFlagsCurrentMessageListAndMessageFromCache();
	}
};

/**
 * @param {?} oScreen
 * 
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function SettingsMenuViewModel(oScreen)
{
	KnoinAbstractViewModel.call(this, 'Left', 'SettingsMenu');

	this.menu = oScreen.menu;

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('SettingsMenuViewModel', SettingsMenuViewModel);

SettingsMenuViewModel.prototype.link = function (sRoute)
{
	return RL.link().settings(sRoute);
};

SettingsMenuViewModel.prototype.backToMailBoxClick = function ()
{
	kn.setHash(RL.link().inbox());
};

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function SettingsPaneViewModel()
{
	KnoinAbstractViewModel.call(this, 'Right', 'SettingsPane');

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('SettingsPaneViewModel', SettingsPaneViewModel);

SettingsPaneViewModel.prototype.onBuild = function ()
{
	var self = this;
	key('esc', Enums.KeyState.Settings, function () {
		self.backToMailBoxClick();
	});
};

SettingsPaneViewModel.prototype.onShow = function ()
{
	RL.data().message(null);
};

SettingsPaneViewModel.prototype.backToMailBoxClick = function ()
{
	kn.setHash(RL.link().inbox());
};

/**
 * @constructor
 */
function SettingsGeneral()
{
	var oData = RL.data();
	
	this.mainLanguage = oData.mainLanguage;
	this.mainMessagesPerPage = oData.mainMessagesPerPage;
	this.mainMessagesPerPageArray = Consts.Defaults.MessagesPerPageArray;
	this.editorDefaultType = oData.editorDefaultType;
	this.showImages = oData.showImages;
	this.interfaceAnimation = oData.interfaceAnimation;
	this.useDesktopNotifications = oData.useDesktopNotifications;	
	this.threading = oData.threading;
	this.useThreads = oData.useThreads;
	this.replySameFolder = oData.replySameFolder;
	this.layout = oData.layout;
	this.usePreviewPane = oData.usePreviewPane;
	this.useCheckboxesInList = oData.useCheckboxesInList;
	this.allowLanguagesOnSettings = oData.allowLanguagesOnSettings;

	this.isDesktopNotificationsSupported = ko.computed(function () {
		return Enums.DesktopNotifications.NotSupported !== oData.desktopNotificationsPermisions();
	});

	this.isDesktopNotificationsDenied = ko.computed(function () {
		return Enums.DesktopNotifications.NotSupported === oData.desktopNotificationsPermisions() ||
			Enums.DesktopNotifications.Denied === oData.desktopNotificationsPermisions();
	});

	this.mainLanguageFullName = ko.computed(function () {
		return Utils.convertLangName(this.mainLanguage());
	}, this);

	this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle).extend({'throttle': 100});
	this.mppTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.isAnimationSupported = Globals.bAnimationSupported;
}

Utils.addSettingsViewModel(SettingsGeneral, 'SettingsGeneral', 'SETTINGS_LABELS/LABEL_GENERAL_NAME', 'general', true);

SettingsGeneral.prototype.toggleLayout = function ()
{
	this.layout(Enums.Layout.NoPreview === this.layout() ? Enums.Layout.SidePreview : Enums.Layout.NoPreview);
};

SettingsGeneral.prototype.onBuild = function ()
{
	var self = this;

	_.delay(function () {

		var 
			oData = RL.data(),
			f1 = Utils.settingsSaveHelperSimpleFunction(self.mppTrigger, self)
		;

		oData.language.subscribe(function (sValue) {

			self.languageTrigger(Enums.SaveSettingsStep.Animate);
			
			$.ajax({
				'url': RL.link().langLink(sValue),
				'dataType': 'script',
				'cache': true
			}).done(function() {
				Utils.i18nToDoc();
				self.languageTrigger(Enums.SaveSettingsStep.TrueResult);
			}).fail(function() {
				self.languageTrigger(Enums.SaveSettingsStep.FalseResult);
			}).always(function() {
				_.delay(function () {
					self.languageTrigger(Enums.SaveSettingsStep.Idle);
				}, 1000);
			});

			RL.remote().saveSettings(Utils.emptyFunction, {
				'Language': sValue
			});
		});

		oData.editorDefaultType.subscribe(function (sValue) {
			RL.remote().saveSettings(Utils.emptyFunction, {
				'EditorDefaultType': sValue
			});
		});

		oData.messagesPerPage.subscribe(function (iValue) {
			RL.remote().saveSettings(f1, {
				'MPP': iValue
			});
		});

		oData.showImages.subscribe(function (bValue) {
			RL.remote().saveSettings(Utils.emptyFunction, {
				'ShowImages': bValue ? '1' : '0'
			});
		});

		oData.interfaceAnimation.subscribe(function (sValue) {
			RL.remote().saveSettings(Utils.emptyFunction, {
				'InterfaceAnimation': sValue
			});
		});

		oData.useDesktopNotifications.subscribe(function (bValue) {
			Utils.timeOutAction('SaveDesktopNotifications', function () {
				RL.remote().saveSettings(Utils.emptyFunction, {
					'DesktopNotifications': bValue ? '1' : '0'
				});
			}, 3000);
		});

		oData.replySameFolder.subscribe(function (bValue) {
			Utils.timeOutAction('SaveReplySameFolder', function () {
				RL.remote().saveSettings(Utils.emptyFunction, {
					'ReplySameFolder': bValue ? '1' : '0'
				});
			}, 3000);
		});

		oData.useThreads.subscribe(function (bValue) {

			oData.messageList([]);

			RL.remote().saveSettings(Utils.emptyFunction, {
				'UseThreads': bValue ? '1' : '0'
			});
		});

		oData.layout.subscribe(function (nValue) {

			oData.messageList([]);

			RL.remote().saveSettings(Utils.emptyFunction, {
				'Layout': nValue
			});
		});

		oData.useCheckboxesInList.subscribe(function (bValue) {
			RL.remote().saveSettings(Utils.emptyFunction, {
				'UseCheckboxesInList': bValue ? '1' : '0'
			});
		});
		
	}, 50);
};

SettingsGeneral.prototype.onShow = function ()
{
	RL.data().desktopNotifications.valueHasMutated();
};

SettingsGeneral.prototype.selectLanguage = function ()
{
	kn.showScreenPopup(PopupsLanguagesViewModel);
};

/**
 * @constructor
 */
function SettingsContacts()
{
	var oData = RL.data();
	
	this.contactsAutosave = oData.contactsAutosave;
	this.showPassword = ko.observable(false);

	this.allowContactsSync = !!RL.settingsGet('ContactsSyncIsAllowed');
	this.contactsSyncServer = RL.settingsGet('ContactsSyncServer');
	this.contactsSyncUser = RL.settingsGet('ContactsSyncUser');
	this.contactsSyncPass = RL.settingsGet('ContactsSyncPassword');
	this.contactsSyncPabUrl = RL.settingsGet('ContactsSyncPabUrl');
}

Utils.addSettingsViewModel(SettingsContacts, 'SettingsContacts', 'SETTINGS_LABELS/LABEL_CONTACTS_NAME', 'contacts');

SettingsContacts.prototype.toggleShowPassword = function ()
{
	this.showPassword(!this.showPassword());
};

SettingsContacts.prototype.onBuild = function ()
{
	RL.data().contactsAutosave.subscribe(function (bValue) {
		RL.remote().saveSettings(Utils.emptyFunction, {
			'ContactsAutosave': bValue ? '1' : '0'
		});
	});
};

SettingsContacts.prototype.onShow = function ()
{
	this.showPassword(false);
};

/**
 * @constructor
 */
function SettingsAccounts()
{
	var oData = RL.data();
	
	this.accounts = oData.accounts;
	
	this.processText = ko.computed(function () {
		return oData.accountsLoading() ? Utils.i18n('SETTINGS_ACCOUNTS/LOADING_PROCESS') : '';
	}, this);

	this.visibility = ko.computed(function () {
		return '' === this.processText() ? 'hidden' : 'visible';
	}, this);

	this.accountForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
		function (oPrev) {
			if (oPrev)
			{
				oPrev.deleteAccess(false);
			}
		}, function (oNext) {
			if (oNext)
			{
				oNext.deleteAccess(true);
			}
		}
	]});
}

Utils.addSettingsViewModel(SettingsAccounts, 'SettingsAccounts', 'SETTINGS_LABELS/LABEL_ACCOUNTS_NAME', 'accounts');

SettingsAccounts.prototype.addNewAccount = function ()
{
	kn.showScreenPopup(PopupsAddAccountViewModel);
};

/**
 * @param {AccountModel} oAccountToRemove
 */
SettingsAccounts.prototype.deleteAccount = function (oAccountToRemove)
{
	if (oAccountToRemove && oAccountToRemove.deleteAccess())
	{
		this.accountForDeletion(null);
		
		var
			fRemoveAccount = function (oAccount) {
				return oAccountToRemove === oAccount;
			}
		;

		if (oAccountToRemove)
		{
			this.accounts.remove(fRemoveAccount);
			
			RL.remote().accountDelete(function (sResult, oData) {

				if (Enums.StorageResultType.Success === sResult && oData &&
					oData.Result && oData.Reload)
				{
					kn.routeOff();
					kn.setHash(RL.link().root(), true);
					kn.routeOff();

					_.defer(function () {
						window.location.reload();
					});
				}
				else
				{
					RL.accountsAndIdentities();
				}
				
			}, oAccountToRemove.email);
		}
	}
};

/**
 * @constructor
 */
function SettingsIdentity()
{
	var oData = RL.data();

	this.editor = null;
	
	this.displayName = oData.displayName;
	this.signature = oData.signature;
	this.signatureToAll = oData.signatureToAll;
	this.replyTo = oData.replyTo;

	this.signatureDom = ko.observable(null);

	this.displayNameTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.replyTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.signatureTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
}

Utils.addSettingsViewModel(SettingsIdentity, 'SettingsIdentity', 'SETTINGS_LABELS/LABEL_IDENTITY_NAME', 'identity');

SettingsIdentity.prototype.onFocus = function ()
{
	if (!this.editor && this.signatureDom())
	{
		var
			self = this,
			sSignature = RL.data().signature()
		;

		this.editor = new NewHtmlEditorWrapper(self.signatureDom(), function () {
			RL.data().signature(
				(self.editor.isHtml() ? ':HTML:' : '') + self.editor.getData()
			);
		}, function () {
			if (':HTML:' === sSignature.substr(0, 6))
			{
				self.editor.setHtml(sSignature.substr(6), false);
			}
			else
			{
				self.editor.setPlain(sSignature, false);
			}
		});
	}
};

SettingsIdentity.prototype.onBuild = function ()
{
	var self = this;
	_.delay(function () {

		var 
			oData = RL.data(),
			f1 = Utils.settingsSaveHelperSimpleFunction(self.displayNameTrigger, self),
			f2 = Utils.settingsSaveHelperSimpleFunction(self.replyTrigger, self),
			f3 = Utils.settingsSaveHelperSimpleFunction(self.signatureTrigger, self)
		;

		oData.displayName.subscribe(function (sValue) {
			RL.remote().saveSettings(f1, {
				'DisplayName': sValue
			});
		});

		oData.replyTo.subscribe(function (sValue) {
			RL.remote().saveSettings(f2, {
				'ReplyTo': sValue
			});
		});

		oData.signature.subscribe(function (sValue) {
			RL.remote().saveSettings(f3, {
				'Signature': sValue
			});
		});

		oData.signatureToAll.subscribe(function (bValue) {
			RL.remote().saveSettings(null, {
				'SignatureToAll': bValue ? '1' : '0'
			});
		});
		
	}, 50);
};

/**
 * @constructor
 */
function SettingsIdentities()
{
	var oData = RL.data();
	
	this.editor = null;
	
	this.displayName = oData.displayName;
	this.signature = oData.signature;
	this.signatureToAll = oData.signatureToAll;
	this.replyTo = oData.replyTo;

	this.signatureDom = ko.observable(null);

	this.displayNameTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.replyTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
	this.signatureTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

	this.identities = oData.identities;

	this.processText = ko.computed(function () {
		return oData.identitiesLoading() ? Utils.i18n('SETTINGS_IDENTITIES/LOADING_PROCESS') : '';
	}, this);

	this.visibility = ko.computed(function () {
		return '' === this.processText() ? 'hidden' : 'visible';
	}, this);

	this.identityForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
		function (oPrev) {
			if (oPrev)
			{
				oPrev.deleteAccess(false);
			}
		}, function (oNext) {
			if (oNext)
			{
				oNext.deleteAccess(true);
			}
		}
	]});
}

Utils.addSettingsViewModel(SettingsIdentities, 'SettingsIdentities', 'SETTINGS_LABELS/LABEL_IDENTITIES_NAME', 'identities');

SettingsIdentities.prototype.addNewIdentity = function ()
{
	kn.showScreenPopup(PopupsIdentityViewModel);
};

SettingsIdentities.prototype.editIdentity = function (oIdentity)
{
	kn.showScreenPopup(PopupsIdentityViewModel, [oIdentity]);
};

/**
 * @param {IdentityModel} oIdentityToRemove
 */
SettingsIdentities.prototype.deleteIdentity = function (oIdentityToRemove)
{
	if (oIdentityToRemove && oIdentityToRemove.deleteAccess())
	{
		this.identityForDeletion(null);
		
		var
			fRemoveFolder = function (oIdentity) {
				return oIdentityToRemove === oIdentity;
			}
		;

		if (oIdentityToRemove)
		{
			this.identities.remove(fRemoveFolder);
			
			RL.remote().identityDelete(function () {
				RL.accountsAndIdentities();
			}, oIdentityToRemove.id);
		}
	}
};

SettingsIdentities.prototype.onFocus = function ()
{
	if (!this.editor && this.signatureDom())
	{
		var
			self = this,
			sSignature = RL.data().signature()
		;

		this.editor = new NewHtmlEditorWrapper(self.signatureDom(), function () {
			RL.data().signature(
				(self.editor.isHtml() ? ':HTML:' : '') + self.editor.getData()
			);
		}, function () {
			if (':HTML:' === sSignature.substr(0, 6))
			{
				self.editor.setHtml(sSignature.substr(6), false);
			}
			else
			{
				self.editor.setPlain(sSignature, false);
			}
		});
	}
};

SettingsIdentities.prototype.onBuild = function (oDom)
{
	var self = this;

	oDom
		.on('click', '.identity-item .e-action', function () {
			var oIdentityItem = ko.dataFor(this);
			if (oIdentityItem)
			{
				self.editIdentity(oIdentityItem);
			}
		})
	;	

	_.delay(function () {

		var
			oData = RL.data(),
			f1 = Utils.settingsSaveHelperSimpleFunction(self.displayNameTrigger, self),
			f2 = Utils.settingsSaveHelperSimpleFunction(self.replyTrigger, self),
			f3 = Utils.settingsSaveHelperSimpleFunction(self.signatureTrigger, self)
		;

		oData.displayName.subscribe(function (sValue) {
			RL.remote().saveSettings(f1, {
				'DisplayName': sValue
			});
		});

		oData.replyTo.subscribe(function (sValue) {
			RL.remote().saveSettings(f2, {
				'ReplyTo': sValue
			});
		});

		oData.signature.subscribe(function (sValue) {
			RL.remote().saveSettings(f3, {
				'Signature': sValue
			});
		});

		oData.signatureToAll.subscribe(function (bValue) {
			RL.remote().saveSettings(null, {
				'SignatureToAll': bValue ? '1' : '0'
			});
		});

	}, 50);
};
/**
 * @constructor
 */
function SettingsSecurity()
{
	this.processing = ko.observable(false);
	this.clearing = ko.observable(false);
	this.secreting = ko.observable(false);

	this.viewUser = ko.observable('');
	this.viewEnable = ko.observable(false);
	this.viewEnable.subs = true;
	this.twoFactorStatus = ko.observable(false);

	this.viewSecret = ko.observable('');
	this.viewBackupCodes = ko.observable('');
	this.viewUrl = ko.observable('');

	this.bFirst = true;

	this.viewTwoFactorStatus = ko.computed(function () {
		Globals.langChangeTrigger();
		return Utils.i18n(
			this.twoFactorStatus() ?
				'SETTINGS_SECURITY/TWO_FACTOR_SECRET_CONFIGURED_DESC' :
				'SETTINGS_SECURITY/TWO_FACTOR_SECRET_NOT_CONFIGURED_DESC'
		);
	}, this);
	
	this.onResult = _.bind(this.onResult, this);
	this.onSecretResult = _.bind(this.onSecretResult, this);
}

Utils.addSettingsViewModel(SettingsSecurity, 'SettingsSecurity', 'SETTINGS_LABELS/LABEL_SECURITY_NAME', 'security');

SettingsSecurity.prototype.showSecret = function ()
{
	this.secreting(true);
	RL.remote().showTwoFactorSecret(this.onSecretResult);
};

SettingsSecurity.prototype.hideSecret = function ()
{
	this.viewSecret('');
	this.viewBackupCodes('');
	this.viewUrl('');
};

SettingsSecurity.prototype.createTwoFactor = function ()
{
	this.processing(true);
	RL.remote().createTwoFactor(this.onResult);
};

SettingsSecurity.prototype.enableTwoFactor = function ()
{
	this.processing(true);
	RL.remote().enableTwoFactor(this.onResult, this.viewEnable());
};

SettingsSecurity.prototype.testTwoFactor = function ()
{
	kn.showScreenPopup(PopupsTwoFactorTestViewModel);
};

SettingsSecurity.prototype.clearTwoFactor = function ()
{
	this.viewSecret('');
	this.viewBackupCodes('');
	this.viewUrl('');
	
	this.clearing(true);
	RL.remote().clearTwoFactor(this.onResult);
};

SettingsSecurity.prototype.onShow = function ()
{
	this.viewSecret('');
	this.viewBackupCodes('');
	this.viewUrl('');
};

SettingsSecurity.prototype.onResult = function (sResult, oData)
{
	this.processing(false);
	this.clearing(false);

	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		this.viewUser(Utils.pString(oData.Result.User));
		this.viewEnable(!!oData.Result.Enable);
		this.twoFactorStatus(!!oData.Result.IsSet);

		this.viewSecret(Utils.pString(oData.Result.Secret));
		this.viewBackupCodes(Utils.pString(oData.Result.BackupCodes).replace(/[\s]+/g, '  '));
		this.viewUrl(Utils.pString(oData.Result.Url));
	}
	else
	{
		this.viewUser('');
		this.viewEnable(false);
		this.twoFactorStatus(false);

		this.viewSecret('');
		this.viewBackupCodes('');
		this.viewUrl('');
	}

	if (this.bFirst)
	{
		this.bFirst = false;
		var self = this;
		this.viewEnable.subscribe(function (bValue) {
			if (this.viewEnable.subs)
			{
				RL.remote().enableTwoFactor(function (sResult, oData) {
					if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
					{
						self.viewEnable.subs = false;
						self.viewEnable(false);
						self.viewEnable.subs = true;
					}
				}, bValue);
			}
		}, this);
	}
};

SettingsSecurity.prototype.onSecretResult = function (sResult, oData)
{
	this.secreting(false);

	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		this.viewSecret(Utils.pString(oData.Result.Secret));
		this.viewUrl(Utils.pString(oData.Result.Url));
	}
	else
	{
		this.viewSecret('');
		this.viewUrl('');
	}
};

SettingsSecurity.prototype.onBuild = function ()
{
	this.processing(true);
	RL.remote().getTwoFactor(this.onResult);
};

/**
 * @constructor
 */
function SettingsSocialScreen()
{
	var oData = RL.data();

	this.googleEnable = oData.googleEnable;

	this.googleActions = oData.googleActions;
	this.googleLoggined = oData.googleLoggined;
	this.googleUserName = oData.googleUserName;

	this.facebookEnable = oData.facebookEnable;
	
	this.facebookActions = oData.facebookActions;
	this.facebookLoggined = oData.facebookLoggined;
	this.facebookUserName = oData.facebookUserName;

	this.twitterEnable = oData.twitterEnable;

	this.twitterActions = oData.twitterActions;
	this.twitterLoggined = oData.twitterLoggined;
	this.twitterUserName = oData.twitterUserName;

	this.connectGoogle = Utils.createCommand(this, function () {
		if (!this.googleLoggined())
		{
			RL.googleConnect();
		}
	}, function () {
		return !this.googleLoggined() && !this.googleActions();
	});

	this.disconnectGoogle = Utils.createCommand(this, function () {
		RL.googleDisconnect();
	});

	this.connectFacebook = Utils.createCommand(this, function () {
		if (!this.facebookLoggined())
		{
			RL.facebookConnect();
		}
	}, function () {
		return !this.facebookLoggined() && !this.facebookActions();
	});

	this.disconnectFacebook = Utils.createCommand(this, function () {
		RL.facebookDisconnect();
	});

	this.connectTwitter = Utils.createCommand(this, function () {
		if (!this.twitterLoggined())
		{
			RL.twitterConnect();
		}
	}, function () {
		return !this.twitterLoggined() && !this.twitterActions();
	});

	this.disconnectTwitter = Utils.createCommand(this, function () {
		RL.twitterDisconnect();
	});
}

Utils.addSettingsViewModel(SettingsSocialScreen, 'SettingsSocial', 'SETTINGS_LABELS/LABEL_SOCIAL_NAME', 'social');

/**
 * @constructor
 */
function SettingsChangePasswordScreen()
{
	this.changeProcess = ko.observable(false);

	this.passwordUpdateError = ko.observable(false);
	this.passwordUpdateSuccess = ko.observable(false);
	
	this.currentPassword = ko.observable('');
	this.newPassword = ko.observable('');

	this.currentPassword.subscribe(function () {
		this.passwordUpdateError(false);
		this.passwordUpdateSuccess(false);
	}, this);

	this.newPassword.subscribe(function () {
		this.passwordUpdateError(false);
		this.passwordUpdateSuccess(false);
	}, this);

	this.saveNewPasswordCommand = Utils.createCommand(this, function () {

		this.changeProcess(true);
		
		this.passwordUpdateError(false);
		this.passwordUpdateSuccess(false);

		RL.remote().changePassword(this.onChangePasswordResponse, this.currentPassword(), this.newPassword());

	}, function () {
		return !this.changeProcess() && '' !== this.currentPassword() && '' !== this.newPassword();
	});

	this.onChangePasswordResponse = _.bind(this.onChangePasswordResponse, this);
}

Utils.addSettingsViewModel(SettingsChangePasswordScreen, 'SettingsChangePassword', 'SETTINGS_LABELS/LABEL_CHANGE_PASSWORD_NAME', 'change-password');

SettingsChangePasswordScreen.prototype.onHide = function ()
{
	this.changeProcess(false);
	this.currentPassword('');
	this.newPassword('');
};

SettingsChangePasswordScreen.prototype.onChangePasswordResponse = function (sResult, oData)
{
	this.changeProcess(false);
	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		this.currentPassword('');
		this.newPassword('');
		
		this.passwordUpdateSuccess(true);
	}
	else
	{
		this.passwordUpdateError(true);
	}
};

/**
 * @constructor
 */
function SettingsFolders()
{
	var oData = RL.data();
	
	this.foldersListError = oData.foldersListError;
	this.folderList = oData.folderList;
	
	this.processText = ko.computed(function () {

		var
			oData = RL.data(),
			bLoading = oData.foldersLoading(),
			bCreating = oData.foldersCreating(),
			bDeleting = oData.foldersDeleting(),
			bRenaming = oData.foldersRenaming()
		;

		if (bCreating)
		{
			return Utils.i18n('SETTINGS_FOLDERS/CREATING_PROCESS');
		}
		else if (bDeleting)
		{
			return Utils.i18n('SETTINGS_FOLDERS/DELETING_PROCESS');
		}
		else if (bRenaming)
		{
			return Utils.i18n('SETTINGS_FOLDERS/RENAMING_PROCESS');
		}
		else if (bLoading)
		{
			return Utils.i18n('SETTINGS_FOLDERS/LOADING_PROCESS');
		}

		return '';

	}, this);

	this.visibility = ko.computed(function () {
		return '' === this.processText() ? 'hidden' : 'visible';
	}, this);

	this.folderForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
		function (oPrev) {
			if (oPrev)
			{
				oPrev.deleteAccess(false);
			}
		}, function (oNext) {
			if (oNext)
			{
				oNext.deleteAccess(true);
			}
		}
	]});

	this.folderForEdit = ko.observable(null).extend({'toggleSubscribe': [this,
		function (oPrev) {
			if (oPrev)
			{
				oPrev.edited(false);
			}
		}, function (oNext) {
			if (oNext && oNext.canBeEdited())
			{
				oNext.edited(true);
			}
		}
	]});

	this.useImapSubscribe = !!RL.settingsGet('UseImapSubscribe');
}

Utils.addSettingsViewModel(SettingsFolders, 'SettingsFolders', 'SETTINGS_LABELS/LABEL_FOLDERS_NAME', 'folders');

SettingsFolders.prototype.folderEditOnEnter = function (oFolder)
{
	var sEditName = oFolder ? Utils.trim(oFolder.nameForEdit()) : '';
	if ('' !== sEditName && oFolder.name() !== sEditName)
	{
		RL.local().set(Enums.ClientSideKeyName.FoldersLashHash, '');

		RL.data().foldersRenaming(true);
		RL.remote().folderRename(function (sResult, oData) {

			RL.data().foldersRenaming(false);
			if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
			{
				RL.data().foldersListError(
					oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_RENAME_FOLDER'));
			}

			RL.folders();

		}, oFolder.fullNameRaw, sEditName);

		RL.cache().removeFolderFromCacheList(oFolder.fullNameRaw);
		
		oFolder.name(sEditName);
	}
	
	oFolder.edited(false);
};

SettingsFolders.prototype.folderEditOnEsc = function (oFolder)
{
	if (oFolder)
	{
		oFolder.edited(false);
	}
};

SettingsFolders.prototype.onShow = function ()
{
	RL.data().foldersListError('');
};

SettingsFolders.prototype.createFolder = function ()
{
	kn.showScreenPopup(PopupsFolderCreateViewModel);
};

SettingsFolders.prototype.systemFolder = function ()
{
	kn.showScreenPopup(PopupsFolderSystemViewModel);
};

SettingsFolders.prototype.deleteFolder = function (oFolderToRemove)
{
	if (oFolderToRemove && oFolderToRemove.canBeDeleted() && oFolderToRemove.deleteAccess() &&
		0 === oFolderToRemove.privateMessageCountAll())
	{
		this.folderForDeletion(null);
		
		var
			fRemoveFolder = function (oFolder) {
				
				if (oFolderToRemove === oFolder)
				{
					return true;
				}

				oFolder.subFolders.remove(fRemoveFolder);
				return false;
			}
		;

		if (oFolderToRemove)
		{
			RL.local().set(Enums.ClientSideKeyName.FoldersLashHash, '');

			RL.data().folderList.remove(fRemoveFolder);
			
			RL.data().foldersDeleting(true);
			RL.remote().folderDelete(function (sResult, oData) {
			
				RL.data().foldersDeleting(false);
				if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
				{
					RL.data().foldersListError(
						oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_DELETE_FOLDER'));
				}
				
				RL.folders();

			}, oFolderToRemove.fullNameRaw);
			
			RL.cache().removeFolderFromCacheList(oFolderToRemove.fullNameRaw);
		}
	}
	else if (0 < oFolderToRemove.privateMessageCountAll())
	{
		RL.data().foldersListError(Utils.getNotification(Enums.Notification.CantDeleteNonEmptyFolder));
	}
};

SettingsFolders.prototype.subscribeFolder = function (oFolder)
{
	RL.local().set(Enums.ClientSideKeyName.FoldersLashHash, '');
	RL.remote().folderSetSubscribe(Utils.emptyFunction, oFolder.fullNameRaw, true);
	
	oFolder.subScribed(true);
};

SettingsFolders.prototype.unSubscribeFolder = function (oFolder)
{
	RL.local().set(Enums.ClientSideKeyName.FoldersLashHash, '');
	RL.remote().folderSetSubscribe(Utils.emptyFunction, oFolder.fullNameRaw, false);
	
	oFolder.subScribed(false);
};

/**
 * @constructor
 */
function SettingsThemes()
{
	var
		self = this,
		oData = RL.data()
	;
	
	this.mainTheme = oData.mainTheme;
	this.customThemeType = ko.observable(RL.settingsGet('CustomThemeType'));
	this.customThemeImg = ko.observable(RL.settingsGet('CustomThemeImg'));

	this.themesObjects = ko.observableArray([]);

	this.customThemeUploaderProgress = ko.observable(false);
	this.customThemeUploaderButton = ko.observable(null);
	
	this.showCustomThemeConfig = ko.computed(function () {
		return 'Custom' === this.mainTheme();
	}, this);

	this.showCustomThemeConfig.subscribe(function () {
		Utils.windowResize();
	});

	this.themeTrigger = ko.observable(Enums.SaveSettingsStep.Idle).extend({'throttle': 100});

	this.oLastAjax = null;
	this.iTimer = 0;

	RL.data().theme.subscribe(function (sValue) {

		_.each(this.themesObjects(), function (oTheme) {
			oTheme.selected(sValue === oTheme.name);
		});

		var
			oThemeLink = $('#rlThemeLink'),
			oThemeStyle = $('#rlThemeStyle'),
			sUrl = oThemeLink.attr('href')
		;

		if (!sUrl)
		{
			sUrl = oThemeStyle.attr('data-href');
		}

		if (sUrl)
		{
			sUrl = sUrl.toString().replace(/\/-\/[^\/]+\/\-\//, '/-/' + sValue + '/-/');
			sUrl = sUrl.toString().replace(/\/Css\/[^\/]+\/User\//, '/Css/' + ('Custom' === sValue && window.__rlah ? window.__rlah() || '0' : '0') + '/User/');
			
			if ('Json/' !== sUrl.substring(sUrl.length - 5, sUrl.length))
			{
				sUrl += 'Json/';
			}

			window.clearTimeout(self.iTimer);
			self.themeTrigger(Enums.SaveSettingsStep.Animate);

			if (this.oLastAjax && this.oLastAjax.abort)
			{
				this.oLastAjax.abort();
			}

			this.oLastAjax = $.ajax({
				'url': sUrl,
				'dataType': 'json'
			}).done(function(aData) {
				if (aData && Utils.isArray(aData) && 2 === aData.length)
				{
					if (oThemeLink && oThemeLink[0] && (!oThemeStyle || !oThemeStyle[0]))
					{
						oThemeStyle = $('<style id="rlThemeStyle"></style>');
						oThemeLink.after(oThemeStyle);
						oThemeLink.remove();
					}

					if (oThemeStyle && oThemeStyle[0])
					{
						oThemeStyle.attr('data-href', sUrl).attr('data-theme', aData[0]);
						if (oThemeStyle && oThemeStyle[0] && oThemeStyle[0].styleSheet && !Utils.isUnd(oThemeStyle[0].styleSheet.cssText))
						{
							oThemeStyle[0].styleSheet.cssText = aData[1];
						}
						else
						{
							oThemeStyle.text(aData[1]);
						}
					}

					self.themeTrigger(Enums.SaveSettingsStep.TrueResult);
				}

			}).always(function() {

				self.iTimer = window.setTimeout(function () {
					self.themeTrigger(Enums.SaveSettingsStep.Idle);
				}, 1000);

				self.oLastAjax = null;
			});
		}

		RL.remote().saveSettings(null, {
			'Theme': sValue
		});

	}, this);
}

Utils.addSettingsViewModel(SettingsThemes, 'SettingsThemes', 'SETTINGS_LABELS/LABEL_THEMES_NAME', 'themes');

SettingsThemes.prototype.removeCustomThemeImg = function ()
{
	this.customThemeImg('');
};

SettingsThemes.prototype.onBuild = function ()
{
	var
		self = this,
		sCurrentTheme = RL.data().theme()
	;
	
	this.themesObjects(_.map(RL.data().themes(), function (sTheme) {
		return {
			'name': sTheme,
			'nameDisplay': Utils.convertThemeName(sTheme),
			'selected': ko.observable(sTheme === sCurrentTheme),
			'themePreviewSrc': RL.link().themePreviewLink(sTheme)
		};
	}));

	_.delay(function () {

		self.customThemeType.subscribe(function (sValue) {
			RL.remote().saveSettings(function () {
				RL.data().theme.valueHasMutated();
			}, {
				'CustomThemeType': sValue
			});
		});

		self.customThemeImg.subscribe(function (sValue) {
			RL.remote().saveSettings(function () {
				RL.data().theme.valueHasMutated();
			}, {
				'CustomThemeImg': sValue
			});
		});

	}, 50);

	this.initCustomThemeUploader();
};

SettingsThemes.prototype.initCustomThemeUploader = function ()
{
	if (this.customThemeUploaderButton())
	{
		var
			oJua = new Jua({
				'action': RL.link().uploadBackground(),
				'name': 'uploader',
				'queueSize': 1,
				'multipleSizeLimit': 1,
				'disableFolderDragAndDrop': true,
				'clickElement': this.customThemeUploaderButton()
			})
		;

		oJua
			.on('onSelect', _.bind(function (sId, oData) {

				var
					sFileName = Utils.isUnd(oData.FileName) ? '' : oData.FileName.toString(),
					sFileNameExt = sFileName.substring(sFileName.length - 4, sFileName.length),
					mSize = Utils.isNormal(oData.Size) ? Utils.pInt(oData.Size) : null
				;

				if (-1 === Utils.inArray(sFileNameExt, ['jpeg', '.jpg', '.png']))
				{
					window.alert(Utils.i18n('SETTINGS_THEMES/ERROR_FILE_TYPE_ERROR'));
					return false;
				}

				if (1024 * 1024 < mSize)
				{
					window.alert(Utils.i18n('SETTINGS_THEMES/ERROR_FILE_IS_TOO_BIG'));
					return false;
				}

				return true;

			}, this))
			.on('onStart', _.bind(function () {
				this.customThemeUploaderProgress(true);
			}, this))
			.on('onComplete', _.bind(function (sId, bResult, oData) {
				if (!bResult || !oData || !oData.Result)
				{
					window.alert(
						oData && oData.ErrorCode ? Utils.getUploadErrorDescByCode(oData.ErrorCode) : Utils.getUploadErrorDescByCode(Enums.UploadErrorCode.Unknown)
					);
				}
				else
				{
					this.customThemeImg(oData.Result);
				}

				this.customThemeUploaderProgress(false);
			}, this))
		;


		return !!oJua;
	}

	return false;
};


/**
 * @constructor
 */
function SettingsOpenPGP()
{
	this.openpgpkeys = RL.data().openpgpkeys;
	this.openpgpkeysPublic = RL.data().openpgpkeysPublic;
	this.openpgpkeysPrivate = RL.data().openpgpkeysPrivate;

	this.openPgpKeyForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
		function (oPrev) {
			if (oPrev)
			{
				oPrev.deleteAccess(false);
			}
		}, function (oNext) {
			if (oNext)
			{
				oNext.deleteAccess(true);
			}
		}
	]});
}

Utils.addSettingsViewModel(SettingsOpenPGP, 'SettingsOpenPGP', 'SETTINGS_LABELS/LABEL_OPEN_PGP_NAME', 'openpgp');

SettingsOpenPGP.prototype.addOpenPgpKey = function ()
{
	kn.showScreenPopup(PopupsAddOpenPgpKeyViewModel);
};

SettingsOpenPGP.prototype.generateOpenPgpKey = function ()
{
	kn.showScreenPopup(PopupsGenerateNewOpenPgpKeyViewModel);
};

SettingsOpenPGP.prototype.viewOpenPgpKey = function (oOpenPgpKey)
{
	if (oOpenPgpKey)
	{
		kn.showScreenPopup(PopupsViewOpenPgpKeyViewModel, [oOpenPgpKey]);
	}
};

/**
 * @param {OpenPgpKeyModel} oOpenPgpKeyToRemove
 */
SettingsOpenPGP.prototype.deleteOpenPgpKey = function (oOpenPgpKeyToRemove)
{
	if (oOpenPgpKeyToRemove && oOpenPgpKeyToRemove.deleteAccess())
	{
		this.openPgpKeyForDeletion(null);

		var
			iFindIndex = -1,
			oOpenpgpKeyring = RL.data().openpgpKeyring,
			fRemoveAccount = function (oOpenPgpKey) {
				return oOpenPgpKeyToRemove === oOpenPgpKey;
			}
		;

		if (oOpenPgpKeyToRemove && oOpenpgpKeyring)
		{
			this.openpgpkeys.remove(fRemoveAccount);

			_.each(oOpenpgpKeyring.keys, function (oKey, iIndex) {
				if (-1 === iFindIndex && oKey && oKey.primaryKey &&
					oOpenPgpKeyToRemove.guid === oKey.primaryKey.getFingerprint() &&
					oOpenPgpKeyToRemove.isPrivate === oKey.isPrivate())
				{
					iFindIndex = iIndex;
				}
			});

			if (0 <= iFindIndex)
			{
				oOpenpgpKeyring.removeKey(iFindIndex);
			}

			oOpenpgpKeyring.store();

			RL.reloadOpenPgpKeys();
		}
	}
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
function WebMailDataStorage()
{
	AbstractData.call(this);

	var
		fRemoveSystemFolderType = function (observable) {
			return function () {
				var oFolder = RL.cache().getFolderFromCacheList(observable());
				if (oFolder)
				{
					oFolder.type(Enums.FolderType.User);
				}
			};
		},
		fSetSystemFolderType = function (iType) {
			return function (sValue) {
				var oFolder = RL.cache().getFolderFromCacheList(sValue);
				if (oFolder)
				{
					oFolder.type(iType);
				}
			};
		}
	;

	this.devEmail = '';
	this.devLogin = '';
	this.devPassword = '';

	this.accountEmail = ko.observable('');
	this.accountIncLogin = ko.observable('');
	this.accountOutLogin = ko.observable('');
	this.projectHash = ko.observable('');
	this.threading = ko.observable(false);

	this.lastFoldersHash = '';
	this.remoteSuggestions = false;

	// system folders
	this.sentFolder = ko.observable('');
	this.draftFolder = ko.observable('');
	this.spamFolder = ko.observable('');
	this.trashFolder = ko.observable('');
	this.archiveFolder = ko.observable('');

	this.sentFolder.subscribe(fRemoveSystemFolderType(this.sentFolder), this, 'beforeChange');
	this.draftFolder.subscribe(fRemoveSystemFolderType(this.draftFolder), this, 'beforeChange');
	this.spamFolder.subscribe(fRemoveSystemFolderType(this.spamFolder), this, 'beforeChange');
	this.trashFolder.subscribe(fRemoveSystemFolderType(this.trashFolder), this, 'beforeChange');
	this.archiveFolder.subscribe(fRemoveSystemFolderType(this.archiveFolder), this, 'beforeChange');

	this.sentFolder.subscribe(fSetSystemFolderType(Enums.FolderType.SentItems), this);
	this.draftFolder.subscribe(fSetSystemFolderType(Enums.FolderType.Draft), this);
	this.spamFolder.subscribe(fSetSystemFolderType(Enums.FolderType.Spam), this);
	this.trashFolder.subscribe(fSetSystemFolderType(Enums.FolderType.Trash), this);
	this.archiveFolder.subscribe(fSetSystemFolderType(Enums.FolderType.Archive), this);

	this.draftFolderNotEnabled = ko.computed(function () {
		return '' === this.draftFolder() || Consts.Values.UnuseOptionValue === this.draftFolder();
	}, this);

	// personal
	this.displayName = ko.observable('');
	this.signature = ko.observable('');
	this.signatureToAll = ko.observable(false);
	this.replyTo = ko.observable('');

	// security
	this.enableTwoFactor = ko.observable(false);

	// accounts
	this.accounts = ko.observableArray([]);
	this.accountsLoading = ko.observable(false).extend({'throttle': 100});

	// identities
	this.identities = ko.observableArray([]);
	this.identitiesLoading = ko.observable(false).extend({'throttle': 100});

	// folders
	this.namespace = '';
	this.folderList = ko.observableArray([]);
	this.folderList.focused = ko.observable(false);

	this.foldersListError = ko.observable('');

	this.foldersLoading = ko.observable(false);
	this.foldersCreating = ko.observable(false);
	this.foldersDeleting = ko.observable(false);
	this.foldersRenaming = ko.observable(false);

	this.foldersChanging = ko.computed(function () {
		var
			bLoading = this.foldersLoading(),
			bCreating = this.foldersCreating(),
			bDeleting = this.foldersDeleting(),
			bRenaming = this.foldersRenaming()
		;
		return bLoading || bCreating || bDeleting || bRenaming;
	}, this);

	this.foldersInboxUnreadCount = ko.observable(0);

	this.currentFolder = ko.observable(null).extend({'toggleSubscribe': [null,
		function (oPrev) {
			if (oPrev)
			{
				oPrev.selected(false);
			}
		}, function (oNext) {
			if (oNext)
			{
				oNext.selected(true);
			}
		}
	]});

	this.currentFolderFullNameRaw = ko.computed(function () {
		return this.currentFolder() ? this.currentFolder().fullNameRaw : '';
	}, this);

	this.currentFolderFullName = ko.computed(function () {
		return this.currentFolder() ? this.currentFolder().fullName : '';
	}, this);

	this.currentFolderFullNameHash = ko.computed(function () {
		return this.currentFolder() ? this.currentFolder().fullNameHash : '';
	}, this);

	this.currentFolderName = ko.computed(function () {
		return this.currentFolder() ? this.currentFolder().name() : '';
	}, this);

	this.folderListSystemNames = ko.computed(function () {

		var
			aList = ['INBOX'],
			aFolders = this.folderList(),
			sSentFolder = this.sentFolder(),
			sDraftFolder = this.draftFolder(),
			sSpamFolder = this.spamFolder(),
			sTrashFolder = this.trashFolder(),
			sArchiveFolder = this.archiveFolder()
		;

		if (Utils.isArray(aFolders) && 0 < aFolders.length)
		{
			if ('' !== sSentFolder && Consts.Values.UnuseOptionValue !== sSentFolder)
			{
				aList.push(sSentFolder);
			}
			if ('' !== sDraftFolder && Consts.Values.UnuseOptionValue !== sDraftFolder)
			{
				aList.push(sDraftFolder);
			}
			if ('' !== sSpamFolder && Consts.Values.UnuseOptionValue !== sSpamFolder)
			{
				aList.push(sSpamFolder);
			}
			if ('' !== sTrashFolder && Consts.Values.UnuseOptionValue !== sTrashFolder)
			{
				aList.push(sTrashFolder);
			}
			if ('' !== sArchiveFolder && Consts.Values.UnuseOptionValue !== sArchiveFolder)
			{
				aList.push(sArchiveFolder);
			}
		}

		return aList;

	}, this);

	this.folderListSystem = ko.computed(function () {
		return _.compact(_.map(this.folderListSystemNames(), function (sName) {
			return RL.cache().getFolderFromCacheList(sName);
		}));
	}, this);

	this.folderMenuForMove = ko.computed(function () {
		return RL.folderListOptionsBuilder(this.folderListSystem(), this.folderList(), [
			this.currentFolderFullNameRaw()
		], null, null, null, null, function (oItem) {
			return oItem ? oItem.localName() : '';
		});
	}, this);

	// message list
	this.staticMessageList = [];

	this.messageList = ko.observableArray([]).extend({'rateLimit': 0});

	this.messageListCount = ko.observable(0);
	this.messageListSearch = ko.observable('');
	this.messageListPage = ko.observable(1);

	this.messageListThreadFolder = ko.observable('');
	this.messageListThreadUids = ko.observableArray([]);

	this.messageListThreadFolder.subscribe(function () {
		this.messageListThreadUids([]);
	}, this);

	this.messageListEndSearch = ko.observable('');
	this.messageListEndFolder = ko.observable('');
	
	this.messageListPageCount = ko.computed(function () {
		var iPage = Math.ceil(this.messageListCount() / this.messagesPerPage());
		return 0 >= iPage ? 1 : iPage;
	}, this);

	this.mainMessageListSearch = ko.computed({
		'read': this.messageListSearch,
		'write': function (sValue) {
			kn.setHash(RL.link().mailBox(
				this.currentFolderFullNameHash(), 1, Utils.trim(sValue.toString())
			));
		},
		'owner': this
	});

	this.messageListError = ko.observable('');

	this.messageListLoading = ko.observable(false);
	this.messageListIsNotCompleted = ko.observable(false);
	this.messageListCompleteLoadingThrottle = ko.observable(false).extend({'throttle': 200});

	this.messageListCompleteLoading = ko.computed(function () {
		var
			bOne = this.messageListLoading(),
			bTwo = this.messageListIsNotCompleted()
		;
		return bOne || bTwo;
	}, this);

	this.messageListCompleteLoading.subscribe(function (bValue) {
		this.messageListCompleteLoadingThrottle(bValue);
	}, this);
	
	this.messageList.subscribe(_.debounce(function (aList) {
		_.each(aList, function (oItem) {
			if (oItem.newForAnimation())
			{
				oItem.newForAnimation(false);
			}
		});
	}, 500));

	// message preview
	this.staticMessageList = new MessageModel();
	this.message = ko.observable(null);
	this.messageLoading = ko.observable(false);
	this.messageLoadingThrottle = ko.observable(false).extend({'throttle': 50});

	this.message.focused = ko.observable(false);
	
	this.message.subscribe(function (oMessage) {
		if (!oMessage)
		{
			this.message.focused(false);
			this.hideMessageBodies();

			if (Enums.Layout.NoPreview === RL.data().layout() &&
				-1 < window.location.hash.indexOf('message-preview'))
			{
				RL.historyBack();
			}
		}
		else if (Enums.Layout.NoPreview === this.layout())
		{
			this.message.focused(true);
		}
	}, this);

	this.message.focused.subscribe(function (bValue) {
		if (bValue)
		{
			RL.data().folderList.focused(false);
			RL.data().keyScope(Enums.KeyState.MessageView);
		}
		else if (Enums.KeyState.MessageView === RL.data().keyScope())
		{
			RL.data().keyScope(Enums.KeyState.MessageList);
		}
	});
	
	this.folderList.focused.subscribe(function (bValue) {
		if (bValue)
		{
			RL.data().keyScope(Enums.KeyState.FolderList);
		}
		else if (Enums.KeyState.FolderList === RL.data().keyScope())
		{
			RL.data().keyScope(Enums.KeyState.MessageList);
		}
	});
	
	this.messageLoading.subscribe(function (bValue) {
		this.messageLoadingThrottle(bValue);
	}, this);
	
	this.messageFullScreenMode = ko.observable(false);

	this.messageError = ko.observable('');

	this.messagesBodiesDom = ko.observable(null);

	this.messagesBodiesDom.subscribe(function (oDom) {
		if (oDom && !(oDom instanceof jQuery))
		{
			this.messagesBodiesDom($(oDom));
		}
	}, this);

	this.messageActiveDom = ko.observable(null);

	this.isMessageSelected = ko.computed(function () {
		return null !== this.message();
	}, this);

	this.currentMessage = ko.observable(null);
	
	this.messageListChecked = ko.computed(function () {
		return _.filter(this.messageList(), function (oItem) {
			return oItem.checked();
		});
	}, this).extend({'rateLimit': 0});
	
	this.hasCheckedMessages = ko.computed(function () {
		return 0 < this.messageListChecked().length;
	}, this).extend({'rateLimit': 0});

	this.messageListCheckedOrSelected = ko.computed(function () {

		var
			aChecked = this.messageListChecked(),
			oSelectedMessage = this.currentMessage()
		;

		return _.union(aChecked, oSelectedMessage ? [oSelectedMessage] : []);

	}, this);

	this.messageListCheckedOrSelectedUidsWithSubMails = ko.computed(function () {
		var aList = [];
		_.each(this.messageListCheckedOrSelected(), function (oMessage) {
			if (oMessage)
			{
				aList.push(oMessage.uid);
				if (0 < oMessage.threadsLen() && 0 === oMessage.parentUid() && oMessage.lastInCollapsedThread())
				{
					aList = _.union(aList, oMessage.threads());
				}
			}
		});
		return aList;
	}, this);

	// quota
	this.userQuota = ko.observable(0);
	this.userUsageSize = ko.observable(0);
	this.userUsageProc = ko.computed(function () {

		var
			iQuota = this.userQuota(),
			iUsed = this.userUsageSize()
		;

		return 0 < iQuota ? Math.ceil((iUsed / iQuota) * 100) : 0;

	}, this);

	// other
	this.allowOpenPGP = ko.observable(false);
	this.openpgpkeys = ko.observableArray([]);
	this.openpgpKeyring = null;

	this.openpgpkeysPublic = this.openpgpkeys.filter(function (oItem) {
		return !!(oItem && !oItem.isPrivate);
	});

	this.openpgpkeysPrivate = this.openpgpkeys.filter(function (oItem) {
		return !!(oItem && oItem.isPrivate);
	});

	// google
	this.googleActions = ko.observable(false);
	this.googleLoggined = ko.observable(false);
	this.googleUserName = ko.observable('');

	// facebook
	this.facebookActions = ko.observable(false);
	this.facebookLoggined = ko.observable(false);
	this.facebookUserName = ko.observable('');

	// twitter
	this.twitterActions = ko.observable(false);
	this.twitterLoggined = ko.observable(false);
	this.twitterUserName = ko.observable('');

	this.customThemeType = ko.observable(Enums.CustomThemeType.Light);

	this.purgeMessageBodyCacheThrottle = _.throttle(this.purgeMessageBodyCache, 1000 * 30);
}

_.extend(WebMailDataStorage.prototype, AbstractData.prototype);

WebMailDataStorage.prototype.purgeMessageBodyCache = function()
{
	var
		iCount = 0,
		oMessagesBodiesDom = null,
		iEnd = Globals.iMessageBodyCacheCount - Consts.Values.MessageBodyCacheLimit
	;
	
	if (0 < iEnd)
	{
		oMessagesBodiesDom = this.messagesBodiesDom();
		if (oMessagesBodiesDom)
		{
			oMessagesBodiesDom.find('.rl-cache-class').each(function () {
				var oItem = $(this);
				if (iEnd > oItem.data('rl-cache-count'))
				{
					oItem.addClass('rl-cache-purge');
					iCount++;
				}
			});

			if (0 < iCount)
			{
				_.delay(function () {
					oMessagesBodiesDom.find('.rl-cache-purge').remove();
				}, 300);
			}
		}
	}
};

WebMailDataStorage.prototype.populateDataOnStart = function()
{
	AbstractData.prototype.populateDataOnStart.call(this);

	this.accountEmail(RL.settingsGet('Email'));
	this.accountIncLogin(RL.settingsGet('IncLogin'));
	this.accountOutLogin(RL.settingsGet('OutLogin'));
	this.projectHash(RL.settingsGet('ProjectHash'));
	
	this.displayName(RL.settingsGet('DisplayName'));
	this.replyTo(RL.settingsGet('ReplyTo'));
	this.signature(RL.settingsGet('Signature'));
	this.signatureToAll(!!RL.settingsGet('SignatureToAll'));
	this.enableTwoFactor(!!RL.settingsGet('EnableTwoFactor'));

	this.lastFoldersHash = RL.local().get(Enums.ClientSideKeyName.FoldersLashHash) || '';

	this.remoteSuggestions = !!RL.settingsGet('RemoteSuggestions');

	this.devEmail = RL.settingsGet('DevEmail');
	this.devLogin = RL.settingsGet('DevLogin');
	this.devPassword = RL.settingsGet('DevPassword');
};

WebMailDataStorage.prototype.initUidNextAndNewMessages = function (sFolder, sUidNext, aNewMessages)
{
	if ('INBOX' === sFolder && Utils.isNormal(sUidNext) && sUidNext !== '')
	{
		if (Utils.isArray(aNewMessages) && 0 < aNewMessages.length)
		{
			var
				oCache = RL.cache(),
				iIndex = 0,
				iLen = aNewMessages.length,
				fNotificationHelper = function (sImageSrc, sTitle, sText)
				{
					var oNotification = null;
					if (NotificationClass && RL.data().useDesktopNotifications())
					{
						oNotification = new NotificationClass(sTitle, {
							'body': sText,
							'icon': sImageSrc
						});

						if (oNotification)
						{
							if (oNotification.show)
							{
								oNotification.show();
							}
							
							window.setTimeout((function (oLocalNotifications) {
								return function () {
									if (oLocalNotifications.cancel)
									{
										oLocalNotifications.cancel();
									}
									else if (oLocalNotifications.close)
									{
										oLocalNotifications.close();
									}
								};
							}(oNotification)), 7000);
						}
					}
				}
			;

			_.each(aNewMessages, function (oItem) {
				oCache.addNewMessageCache(sFolder, oItem.Uid);
			});

			if (3 < iLen)
			{
				fNotificationHelper(
					RL.link().notificationMailIcon(),
					RL.data().accountEmail(),
					Utils.i18n('MESSAGE_LIST/NEW_MESSAGE_NOTIFICATION', {
						'COUNT': iLen
					})
				);
			}
			else
			{
				for (; iIndex < iLen; iIndex++)
				{
					fNotificationHelper(
						RL.link().notificationMailIcon(),
						MessageModel.emailsToLine(MessageModel.initEmailsFromJson(aNewMessages[iIndex].From), false),
						aNewMessages[iIndex].Subject
					);
				}
			}
		}

		RL.cache().setFolderUidNext(sFolder, sUidNext);
	}
};

/**
 * @param {string} sNamespace
 * @param {Array} aFolders
 * @return {Array}
 */
WebMailDataStorage.prototype.folderResponseParseRec = function (sNamespace, aFolders)
{
	var
		iIndex = 0,
		iLen = 0,
		oFolder = null,
		oCacheFolder = null,
		sFolderFullNameRaw = '',
		aSubFolders = [],
		aList = []
	;

	for (iIndex = 0, iLen = aFolders.length; iIndex < iLen; iIndex++)
	{
		oFolder = aFolders[iIndex];
		if (oFolder)
		{
			sFolderFullNameRaw = oFolder.FullNameRaw;

			oCacheFolder = RL.cache().getFolderFromCacheList(sFolderFullNameRaw);
			if (!oCacheFolder)
			{
				oCacheFolder = FolderModel.newInstanceFromJson(oFolder);
				if (oCacheFolder)
				{
					RL.cache().setFolderToCacheList(sFolderFullNameRaw, oCacheFolder);
					RL.cache().setFolderFullNameRaw(oCacheFolder.fullNameHash, sFolderFullNameRaw);

					oCacheFolder.isGmailFolder = Consts.Values.GmailFolderName.toLowerCase() === sFolderFullNameRaw.toLowerCase();
					if ('' !== sNamespace && sNamespace === oCacheFolder.fullNameRaw + oCacheFolder.delimiter)
					{
						oCacheFolder.isNamespaceFolder = true;
					}

					if (oCacheFolder.isNamespaceFolder || oCacheFolder.isGmailFolder)
					{
						oCacheFolder.isUnpaddigFolder = true;
					}
				}
			}

			if (oCacheFolder)
			{
				oCacheFolder.collapsed(!Utils.isFolderExpanded(oCacheFolder.fullNameHash));

				if (oFolder.Extended)
				{
					if (oFolder.Extended.Hash)
					{
						RL.cache().setFolderHash(oCacheFolder.fullNameRaw, oFolder.Extended.Hash);
					}

					if (Utils.isNormal(oFolder.Extended.MessageCount))
					{
						oCacheFolder.messageCountAll(oFolder.Extended.MessageCount);
					}

					if (Utils.isNormal(oFolder.Extended.MessageUnseenCount))
					{
						oCacheFolder.messageCountUnread(oFolder.Extended.MessageUnseenCount);
					}
				}

				aSubFolders = oFolder['SubFolders'];
				if (aSubFolders && 'Collection/FolderCollection' === aSubFolders['@Object'] &&
					aSubFolders['@Collection'] && Utils.isArray(aSubFolders['@Collection']))
				{
					oCacheFolder.subFolders(
						this.folderResponseParseRec(sNamespace, aSubFolders['@Collection']));
				}

				aList.push(oCacheFolder);
			}
		}
	}

	return aList;
};

/**
 * @param {*} oData
 */
WebMailDataStorage.prototype.setFolders = function (oData)
{
	var
		aList = [],
		bUpdate = false,
		oRLData = RL.data(),
		fNormalizeFolder = function (sFolderFullNameRaw) {
			return ('' === sFolderFullNameRaw || Consts.Values.UnuseOptionValue === sFolderFullNameRaw ||
				null !== RL.cache().getFolderFromCacheList(sFolderFullNameRaw)) ? sFolderFullNameRaw : '';
		}
	;

	if (oData && oData.Result && 'Collection/FolderCollection' === oData.Result['@Object'] &&
		oData.Result['@Collection'] && Utils.isArray(oData.Result['@Collection']))
	{
		if (!Utils.isUnd(oData.Result.Namespace))
		{
			oRLData.namespace = oData.Result.Namespace;
		}

		this.threading(!!RL.settingsGet('UseImapThread') && oData.Result.IsThreadsSupported && true);

		aList = this.folderResponseParseRec(oRLData.namespace, oData.Result['@Collection']);
		oRLData.folderList(aList);

		if (oData.Result['SystemFolders'] &&
			'' === '' + RL.settingsGet('SentFolder') + RL.settingsGet('DraftFolder') +
			RL.settingsGet('SpamFolder') + RL.settingsGet('TrashFolder') + RL.settingsGet('ArchiveFolder') +
			RL.settingsGet('NullFolder'))
		{
			// TODO Magic Numbers
			RL.settingsSet('SentFolder', oData.Result['SystemFolders'][2] || null);
			RL.settingsSet('DraftFolder', oData.Result['SystemFolders'][3] || null);
			RL.settingsSet('SpamFolder', oData.Result['SystemFolders'][4] || null);
			RL.settingsSet('TrashFolder', oData.Result['SystemFolders'][5] || null);
			RL.settingsSet('ArchiveFolder', oData.Result['SystemFolders'][12] || null);

			bUpdate = true;
		}

		oRLData.sentFolder(fNormalizeFolder(RL.settingsGet('SentFolder')));
		oRLData.draftFolder(fNormalizeFolder(RL.settingsGet('DraftFolder')));
		oRLData.spamFolder(fNormalizeFolder(RL.settingsGet('SpamFolder')));
		oRLData.trashFolder(fNormalizeFolder(RL.settingsGet('TrashFolder')));
		oRLData.archiveFolder(fNormalizeFolder(RL.settingsGet('ArchiveFolder')));

		if (bUpdate)
		{
			RL.remote().saveSystemFolders(Utils.emptyFunction, {
				'SentFolder': oRLData.sentFolder(),
				'DraftFolder': oRLData.draftFolder(),
				'SpamFolder': oRLData.spamFolder(),
				'TrashFolder': oRLData.trashFolder(),
				'ArchiveFolder': oRLData.archiveFolder(),
				'NullFolder': 'NullFolder'
			});
		}

		RL.local().set(Enums.ClientSideKeyName.FoldersLashHash, oData.Result.FoldersHash);
	}
};

WebMailDataStorage.prototype.hideMessageBodies = function ()
{
	var oMessagesBodiesDom = this.messagesBodiesDom();
	if (oMessagesBodiesDom)
	{
		oMessagesBodiesDom.find('.b-text-part').hide();
	}
};

/**
 * @param {boolean=} bBoot = false
 * @returns {Array}
 */
WebMailDataStorage.prototype.getNextFolderNames = function (bBoot)
{
	bBoot = Utils.isUnd(bBoot) ? false : !!bBoot;
	
	var
		aResult = [],
		iLimit = 10,
		iUtc = moment().unix(),
		iTimeout = iUtc - 60 * 5,
		aTimeouts = [],
		fSearchFunction = function (aList) {
			_.each(aList, function (oFolder) {
				if (oFolder && 'INBOX' !== oFolder.fullNameRaw &&
					oFolder.selectable && oFolder.existen &&
					iTimeout > oFolder.interval &&
					(!bBoot || oFolder.subScribed()))
				{
					aTimeouts.push([oFolder.interval, oFolder.fullNameRaw]);
				}

				if (oFolder && 0 < oFolder.subFolders().length)
				{
					fSearchFunction(oFolder.subFolders());
				}
			});
		}
	;

	fSearchFunction(this.folderList());

	aTimeouts.sort(function(a, b) {
		if (a[0] < b[0])
		{
			return -1;
		}
		else if (a[0] > b[0])
		{
			return 1;
		}
		
		return 0;
	});
	
	_.find(aTimeouts, function (aItem) {
		var oFolder = RL.cache().getFolderFromCacheList(aItem[1]);
		if (oFolder)
		{
			oFolder.interval = iUtc;
			aResult.push(aItem[1]);
		}
		
		return iLimit <= aResult.length;
	});

	return _.uniq(aResult);
};

/**
 * @param {string} sFromFolderFullNameRaw
 * @param {Array} aUidForRemove
 * @param {string=} sToFolderFullNameRaw = ''
 * @param {bCopy=} bCopy = false
 */
WebMailDataStorage.prototype.removeMessagesFromList = function (
	sFromFolderFullNameRaw, aUidForRemove, sToFolderFullNameRaw, bCopy)
{
	sToFolderFullNameRaw = Utils.isNormal(sToFolderFullNameRaw) ? sToFolderFullNameRaw : '';
	bCopy = Utils.isUnd(bCopy) ? false : !!bCopy;
	
	aUidForRemove = _.map(aUidForRemove, function (mValue) {
		return Utils.pInt(mValue);
	});

	var
		iUnseenCount = 0,
		oData = RL.data(),
		oCache = RL.cache(),
		aMessageList = oData.messageList(),
		oFromFolder = RL.cache().getFolderFromCacheList(sFromFolderFullNameRaw),
		oToFolder = '' === sToFolderFullNameRaw ? null : oCache.getFolderFromCacheList(sToFolderFullNameRaw || ''),
		sCurrentFolderFullNameRaw = oData.currentFolderFullNameRaw(),
		oCurrentMessage = oData.message(),
		aMessages = sCurrentFolderFullNameRaw === sFromFolderFullNameRaw ? _.filter(aMessageList, function (oMessage) {
			return oMessage && -1 < Utils.inArray(Utils.pInt(oMessage.uid), aUidForRemove);
		}) : []
	;

	_.each(aMessages, function (oMessage) {
		if (oMessage && oMessage.unseen())
		{
			iUnseenCount++;
		}
	});

	if (oFromFolder && !bCopy)
	{
		oFromFolder.messageCountAll(0 <= oFromFolder.messageCountAll() - aUidForRemove.length ?
			oFromFolder.messageCountAll() - aUidForRemove.length : 0);

		if (0 < iUnseenCount)
		{
			oFromFolder.messageCountUnread(0 <= oFromFolder.messageCountUnread() - iUnseenCount ?
				oFromFolder.messageCountUnread() - iUnseenCount : 0);
		}
	}

	if (oToFolder)
	{
		oToFolder.messageCountAll(oToFolder.messageCountAll() + aUidForRemove.length);
		if (0 < iUnseenCount)
		{
			oToFolder.messageCountUnread(oToFolder.messageCountUnread() + iUnseenCount);
		}

		oToFolder.actionBlink(true);
	}

	if (0 < aMessages.length)
	{
		if (bCopy)
		{
			_.each(aMessages, function (oMessage) {
				oMessage.checked(false);
			});
		}
		else
		{
			oData.messageListIsNotCompleted(true);
			
			_.each(aMessages, function (oMessage) {
				if (oCurrentMessage && oCurrentMessage.hash === oMessage.hash)
				{
					oCurrentMessage = null;
					oData.message(null);
				}

				oMessage.deleted(true);
			});

			_.delay(function () {
				_.each(aMessages, function (oMessage) {
					oData.messageList.remove(oMessage);
				});
			}, 400);
		}
	}

	if ('' !== sFromFolderFullNameRaw)
	{
		oCache.setFolderHash(sFromFolderFullNameRaw, '');
	}

	if ('' !== sToFolderFullNameRaw)
	{
		oCache.setFolderHash(sToFolderFullNameRaw, '');
	}
};

WebMailDataStorage.prototype.setMessage = function (oData, bCached)
{
	var
		bIsHtml = false,
		bHasExternals = false,
		bHasInternals = false,
		oBody = null,
		oTextBody = null,
		sId = '',
		sPlain = '',
		bPgpSigned = false,
		bPgpEncrypted = false,
		oMessagesBodiesDom = this.messagesBodiesDom(),
		oMessage = this.message()
	;

	if (oData && oMessage && oData.Result && 'Object/Message' === oData.Result['@Object'] &&
		oMessage.folderFullNameRaw === oData.Result.Folder && oMessage.uid === oData.Result.Uid)
	{
		this.messageError('');

		oMessage.initUpdateByMessageJson(oData.Result);
		RL.cache().addRequestedMessage(oMessage.folderFullNameRaw, oMessage.uid);

		if (!bCached)
		{
			oMessage.initFlagsByJson(oData.Result);
		}

		oMessagesBodiesDom = oMessagesBodiesDom && oMessagesBodiesDom[0] ? oMessagesBodiesDom : null;
		if (oMessagesBodiesDom)
		{
			sId = 'rl-mgs-' + oMessage.hash.replace(/[^a-zA-Z0-9]/g, '');
			oTextBody = oMessagesBodiesDom.find('#' + sId);
			if (!oTextBody || !oTextBody[0])
			{
				bHasExternals = !!oData.Result.HasExternals;
				bHasInternals = !!oData.Result.HasInternals;

				oBody = $('<div id="' + sId + '" />').hide().addClass('rl-cache-class');
				oBody.data('rl-cache-count', ++Globals.iMessageBodyCacheCount);
				
				if (Utils.isNormal(oData.Result.Html) && '' !== oData.Result.Html)
				{
					bIsHtml = true;
					oBody.html(oData.Result.Html.toString()).addClass('b-text-part html');
				}
				else if (Utils.isNormal(oData.Result.Plain) && '' !== oData.Result.Plain)
				{
					bIsHtml = false;
					sPlain = oData.Result.Plain.toString();
					
					if ((oMessage.isPgpSigned() || oMessage.isPgpEncrypted()) &&
						RL.data().allowOpenPGP() &&
						Utils.isNormal(oData.Result.PlainRaw))
					{
						oMessage.plainRaw = Utils.pString(oData.Result.PlainRaw);

						bPgpEncrypted = /---BEGIN PGP MESSAGE---/.test(oMessage.plainRaw);
						if (!bPgpEncrypted)
						{
							bPgpSigned = /-----BEGIN PGP SIGNED MESSAGE-----/.test(oMessage.plainRaw) &&
								/-----BEGIN PGP SIGNATURE-----/.test(oMessage.plainRaw);
						}
						
						$proxyDiv.empty();
						if (bPgpSigned && oMessage.isPgpSigned())
						{
							sPlain =
								$proxyDiv.append(
									$('<pre class="b-plain-openpgp signed"></pre>').text(oMessage.plainRaw)
								).html()
							;
						}
						else if (bPgpEncrypted && oMessage.isPgpEncrypted())
						{
							sPlain = 
								$proxyDiv.append(
									$('<pre class="b-plain-openpgp encrypted"></pre>').text(oMessage.plainRaw)
								).html()
							;
						}

						$proxyDiv.empty();

						oMessage.isPgpSigned(bPgpSigned);
						oMessage.isPgpEncrypted(bPgpEncrypted);
					}

					oBody.html(sPlain).addClass('b-text-part plain');
				}
				else
				{
					bIsHtml = false;
				}

				oMessage.isHtml(!!bIsHtml);
				oMessage.hasImages(!!bHasExternals);
				oMessage.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.None);
				oMessage.pgpSignedVerifyUser('');

				if (oData.Result.Rtl)
				{
					this.isRtl(true);
					oBody.addClass('rtl-text-part');
				}

				oMessage.body = oBody;
				if (oMessage.body)
				{
					oMessagesBodiesDom.append(oMessage.body);
				}

				oMessage.storeDataToDom();

				if (bHasInternals)
				{
					oMessage.showInternalImages(true);
				}

				if (oMessage.hasImages() && this.showImages())
				{
					oMessage.showExternalImages(true);
				}

				this.purgeMessageBodyCacheThrottle();
			}
			else
			{
				oMessage.body = oTextBody;
				if (oMessage.body)
				{
					oMessage.body.data('rl-cache-count', ++Globals.iMessageBodyCacheCount);
					oMessage.fetchDataToDom();
				}
			}

			this.messageActiveDom(oMessage.body);

			this.hideMessageBodies();
			oMessage.body.show();

			if (oBody)
			{
				Utils.initBlockquoteSwitcher(oBody);
			}
		}

		RL.cache().initMessageFlagsFromCache(oMessage);
		if (oMessage.unseen())
		{
			RL.setMessageSeen(oMessage);
		}
		
		Utils.windowResize();
	}
};

/**
 * @param {Array} aList
 * @returns {string}
 */
WebMailDataStorage.prototype.calculateMessageListHash = function (aList)
{
	return _.map(aList, function (oMessage) {
		return '' + oMessage.hash + '_' + oMessage.threadsLen() + '_' + oMessage.flagHash();
	}).join('|');
};

WebMailDataStorage.prototype.setMessageList = function (oData, bCached)
{
	if (oData && oData.Result && 'Collection/MessageCollection' === oData.Result['@Object'] &&
		oData.Result['@Collection'] && Utils.isArray(oData.Result['@Collection']))
	{
		var
			oRainLoopData = RL.data(),
			oCache = RL.cache(),
			mLastCollapsedThreadUids = null,
			iIndex = 0,
			iLen = 0,
			iCount = 0,
			iOffset = 0,
			aList = [],
			iUtc = moment().unix(),
			aStaticList = oRainLoopData.staticMessageList,
			oJsonMessage = null,
			oMessage = null,
			oFolder = null,
			iNewCount = 0,
			bUnreadCountChange = false
		;

		iCount = Utils.pInt(oData.Result.MessageResultCount);
		iOffset = Utils.pInt(oData.Result.Offset);

		if (Utils.isNonEmptyArray(oData.Result.LastCollapsedThreadUids))
		{
			mLastCollapsedThreadUids = oData.Result.LastCollapsedThreadUids;
		}

		oFolder = RL.cache().getFolderFromCacheList(
			Utils.isNormal(oData.Result.Folder) ? oData.Result.Folder : '');

		if (oFolder && !bCached)
		{
			oFolder.interval = iUtc;
			
			RL.cache().setFolderHash(oData.Result.Folder, oData.Result.FolderHash);

			if (Utils.isNormal(oData.Result.MessageCount))
			{
				oFolder.messageCountAll(oData.Result.MessageCount);
			}

			if (Utils.isNormal(oData.Result.MessageUnseenCount))
			{
				if (Utils.pInt(oFolder.messageCountUnread()) !== Utils.pInt(oData.Result.MessageUnseenCount))
				{
					bUnreadCountChange = true;
				}

				oFolder.messageCountUnread(oData.Result.MessageUnseenCount);
			}

			this.initUidNextAndNewMessages(oFolder.fullNameRaw, oData.Result.UidNext, oData.Result.NewMessages);
		}

		if (bUnreadCountChange && oFolder)
		{
			RL.cache().clearMessageFlagsFromCacheByFolder(oFolder.fullNameRaw);
		}

		for (iIndex = 0, iLen = oData.Result['@Collection'].length; iIndex < iLen; iIndex++)
		{
			oJsonMessage = oData.Result['@Collection'][iIndex];
			if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
			{
				oMessage = aStaticList[iIndex];
				if (!oMessage || !oMessage.initByJson(oJsonMessage))
				{
					oMessage = MessageModel.newInstanceFromJson(oJsonMessage);
				}

				if (oMessage)
				{
					if (oCache.hasNewMessageAndRemoveFromCache(oMessage.folderFullNameRaw, oMessage.uid) && 5 >= iNewCount)
					{
						iNewCount++;
						oMessage.newForAnimation(true);
					}

					oMessage.deleted(false);

					if (bCached)
					{
						RL.cache().initMessageFlagsFromCache(oMessage);
					}
					else
					{
						RL.cache().storeMessageFlagsToCache(oMessage);
					}

					oMessage.lastInCollapsedThread(mLastCollapsedThreadUids && -1 < Utils.inArray(Utils.pInt(oMessage.uid), mLastCollapsedThreadUids) ? true : false);

					aList.push(oMessage);
				}
			}
		}

		oRainLoopData.messageListCount(iCount);
		oRainLoopData.messageListSearch(Utils.isNormal(oData.Result.Search) ? oData.Result.Search : '');
		oRainLoopData.messageListEndSearch(Utils.isNormal(oData.Result.Search) ? oData.Result.Search : '');
		oRainLoopData.messageListEndFolder(Utils.isNormal(oData.Result.Folder) ? oData.Result.Folder : '');
		oRainLoopData.messageListPage(Math.ceil((iOffset / oRainLoopData.messagesPerPage()) + 1));

		oRainLoopData.messageList(aList);
		oRainLoopData.messageListIsNotCompleted(false);

		if (aStaticList.length < aList.length)
		{
			oRainLoopData.staticMessageList = aList;
		}

		oCache.clearNewMessageCache();

		if (oFolder && (bCached || bUnreadCountChange || RL.data().useThreads()))
		{
			RL.folderInformation(oFolder.fullNameRaw, aList);
		}
	}
	else
	{
		RL.data().messageListCount(0);
		RL.data().messageList([]);
		RL.data().messageListError(Utils.getNotification(
			oData && oData.ErrorCode ? oData.ErrorCode : Enums.Notification.CantGetMessageList
		));
	}
};

WebMailDataStorage.prototype.findPublicKeyByHex = function (sHash)
{
	return _.find(this.openpgpkeysPublic(), function (oItem) {
		return oItem && sHash === oItem.id;
	});
};

WebMailDataStorage.prototype.findPublicKeysByEmail = function (sEmail)
{
	return _.compact(_.map(this.openpgpkeysPublic(), function (oItem) {

		var oKey = null;
		if (oItem && sEmail === oItem.email)
		{
			try
			{
				oKey = window.openpgp.key.readArmored(oItem.armor);
				if (oKey && !oKey.err && oKey.keys && oKey.keys[0])
				{
					return oKey.keys[0];
				}
			}
			catch (e) {}
		}

		return null;

	}));
};

/**
 * @param {string} sEmail
 * @param {string=} sPassword
 * @returns {?}
 */
WebMailDataStorage.prototype.findPrivateKeyByEmail = function (sEmail, sPassword)
{
	var
		oPrivateKey = null,
		oKey = _.find(this.openpgpkeysPrivate(), function (oItem) {
			return oItem && sEmail === oItem.email;
		})
	;

	if (oKey)
	{
		try
		{
			oPrivateKey = window.openpgp.key.readArmored(oKey.armor);
			if (oPrivateKey && !oPrivateKey.err && oPrivateKey.keys && oPrivateKey.keys[0])
			{
				oPrivateKey = oPrivateKey.keys[0];
				oPrivateKey.decrypt(Utils.pString(sPassword));
			}
			else
			{
				oPrivateKey = null;
			}
		}
		catch (e)
		{
			oPrivateKey = null;
		}
	}

	return oPrivateKey;
};

/**
 * @param {string=} sPassword
 * @returns {?}
 */
WebMailDataStorage.prototype.findSelfPrivateKey = function (sPassword)
{
	return this.findPrivateKeyByEmail(this.accountEmail(), sPassword);
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
function WebMailAjaxRemoteStorage()
{
	AbstractAjaxRemoteStorage.call(this);
	
	this.oRequests = {};
}

_.extend(WebMailAjaxRemoteStorage.prototype, AbstractAjaxRemoteStorage.prototype);

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.folders = function (fCallback)
{
	this.defaultRequest(fCallback, 'Folders', {
		'SentFolder': RL.settingsGet('SentFolder'),
		'DraftFolder': RL.settingsGet('DraftFolder'),
		'SpamFolder': RL.settingsGet('SpamFolder'),
		'TrashFolder': RL.settingsGet('TrashFolder'),
		'ArchiveFolder': RL.settingsGet('ArchiveFolder')
	}, null, '', ['Folders']);
};

/**
 * @param {?Function} fCallback
 * @param {string} sEmail
 * @param {string} sLogin
 * @param {string} sPassword
 * @param {boolean} bSignMe
 * @param {string=} sLanguage
 * @param {string=} sAdditionalCode
 * @param {boolean=} bAdditionalCodeSignMe
 */
WebMailAjaxRemoteStorage.prototype.login = function (fCallback, sEmail, sLogin, sPassword, bSignMe, sLanguage, sAdditionalCode, bAdditionalCodeSignMe)
{
	this.defaultRequest(fCallback, 'Login', {
		'Email': sEmail,
		'Login': sLogin,
		'Password': sPassword,
		'Language': sLanguage || '',
		'AdditionalCode': sAdditionalCode || '',
		'AdditionalCodeSignMe': bAdditionalCodeSignMe ? '1' : '0',
		'SignMe': bSignMe ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.getTwoFactor = function (fCallback)
{
	this.defaultRequest(fCallback, 'GetTwoFactorInfo');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.createTwoFactor = function (fCallback)
{
	this.defaultRequest(fCallback, 'CreateTwoFactorSecret');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.clearTwoFactor = function (fCallback)
{
	this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.showTwoFactorSecret = function (fCallback)
{
	this.defaultRequest(fCallback, 'ShowTwoFactorSecret');
};

/**
 * @param {?Function} fCallback
 * @param {string} sCode
 */
WebMailAjaxRemoteStorage.prototype.testTwoFactor = function (fCallback, sCode)
{
	this.defaultRequest(fCallback, 'TestTwoFactorInfo', {
		'Code': sCode
	});
};

/**
 * @param {?Function} fCallback
 * @param {boolean} bEnable
 */
WebMailAjaxRemoteStorage.prototype.enableTwoFactor = function (fCallback, bEnable)
{
	this.defaultRequest(fCallback, 'EnableTwoFactor', {
		'Enable': bEnable ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.clearTwoFactorInfo = function (fCallback)
{
	this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
};

/**
 * @param {?Function} fCallback
 * @param {string} sEmail
 * @param {string} sLogin
 * @param {string} sPassword
 */
WebMailAjaxRemoteStorage.prototype.accountAdd = function (fCallback, sEmail, sLogin, sPassword)
{
	this.defaultRequest(fCallback, 'AccountAdd', {
		'Email': sEmail,
		'Login': sLogin,
		'Password': sPassword
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sEmailToDelete
 */
WebMailAjaxRemoteStorage.prototype.accountDelete = function (fCallback, sEmailToDelete)
{
	this.defaultRequest(fCallback, 'AccountDelete', {
		'EmailToDelete': sEmailToDelete
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sId
 * @param {string} sEmail
 * @param {string} sName
 * @param {string} sReplyTo
 * @param {string} sBcc
 */
WebMailAjaxRemoteStorage.prototype.identityUpdate = function (fCallback, sId, sEmail, sName, sReplyTo, sBcc)
{
	this.defaultRequest(fCallback, 'IdentityUpdate', {
		'Id': sId,
		'Email': sEmail,
		'Name': sName,
		'ReplyTo': sReplyTo,
		'Bcc': sBcc
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sIdToDelete
 */
WebMailAjaxRemoteStorage.prototype.identityDelete = function (fCallback, sIdToDelete)
{
	this.defaultRequest(fCallback, 'IdentityDelete', {
		'IdToDelete': sIdToDelete
	});
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.accountsAndIdentities = function (fCallback)
{
	this.defaultRequest(fCallback, 'AccountsAndIdentities');
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 * @param {number=} iOffset = 0
 * @param {number=} iLimit = 20
 * @param {string=} sSearch = ''
 * @param {boolean=} bSilent = false
 */
WebMailAjaxRemoteStorage.prototype.messageList = function (fCallback, sFolderFullNameRaw, iOffset, iLimit, sSearch, bSilent)
{
	sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);

	var
		oData = RL.data(),
		sFolderHash = RL.cache().getFolderHash(sFolderFullNameRaw)
	;

	bSilent = Utils.isUnd(bSilent) ? false : !!bSilent;
	iOffset = Utils.isUnd(iOffset) ? 0 : Utils.pInt(iOffset);
	iLimit = Utils.isUnd(iOffset) ? 20 : Utils.pInt(iLimit);
	sSearch = Utils.pString(sSearch);

	if ('' !== sFolderHash && ('' === sSearch || -1 === sSearch.indexOf('has:')))
	{
		this.defaultRequest(fCallback, 'MessageList', {},
			'' === sSearch ? Consts.Defaults.DefaultAjaxTimeout : Consts.Defaults.SearchAjaxTimeout,
			'MessageList/' + Base64.urlsafe_encode([
				sFolderFullNameRaw,
				iOffset,
				iLimit,
				sSearch,
				oData.projectHash(),
				sFolderHash,
				'INBOX' === sFolderFullNameRaw ? RL.cache().getFolderUidNext(sFolderFullNameRaw) : '',
				oData.threading() && oData.useThreads() ? '1' : '0',
				oData.threading() && sFolderFullNameRaw === oData.messageListThreadFolder() ? oData.messageListThreadUids().join(',') : ''
			].join(String.fromCharCode(0))), bSilent ? [] : ['MessageList']);
	}
	else
	{
		this.defaultRequest(fCallback, 'MessageList', {
			'Folder': sFolderFullNameRaw,
			'Offset': iOffset,
			'Limit': iLimit,
			'Search': sSearch,
			'UidNext': 'INBOX' === sFolderFullNameRaw ? RL.cache().getFolderUidNext(sFolderFullNameRaw) : '',
			'UseThreads': RL.data().threading() && RL.data().useThreads() ? '1' : '0',
			'ExpandedThreadUid': oData.threading() && sFolderFullNameRaw === oData.messageListThreadFolder() ? oData.messageListThreadUids().join(',') : ''
		}, '' === sSearch ? Consts.Defaults.DefaultAjaxTimeout : Consts.Defaults.SearchAjaxTimeout, '', bSilent ? [] : ['MessageList']);
	}
};

/**
 * @param {?Function} fCallback
 * @param {Array} aDownloads
 */
WebMailAjaxRemoteStorage.prototype.messageUploadAttachments = function (fCallback, aDownloads)
{
	this.defaultRequest(fCallback, 'MessageUploadAttachments', {
		'Attachments': aDownloads
	}, 999000);
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 * @param {number} iUid
 * @return {boolean}
 */
WebMailAjaxRemoteStorage.prototype.message = function (fCallback, sFolderFullNameRaw, iUid)
{
	sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);
	iUid = Utils.pInt(iUid);

	if (RL.cache().getFolderFromCacheList(sFolderFullNameRaw) && 0 < iUid)
	{
		this.defaultRequest(fCallback, 'Message', {}, null,
			'Message/' + Base64.urlsafe_encode([
				sFolderFullNameRaw,
				iUid,
				RL.data().projectHash(),
				RL.data().threading() && RL.data().useThreads() ? '1' : '0'
			].join(String.fromCharCode(0))), ['Message']);

		return true;
	}

	return false;
};

/**
 * @param {?Function} fCallback
 * @param {Array} aExternals
 */
WebMailAjaxRemoteStorage.prototype.composeUploadExternals = function (fCallback, aExternals)
{
	this.defaultRequest(fCallback, 'ComposeUploadExternals', {
		'Externals': aExternals
	}, 999000);
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolder
 * @param {Array=} aList = []
 */
WebMailAjaxRemoteStorage.prototype.folderInformation = function (fCallback, sFolder, aList)
{
	var
		bRequest = true,
		oCache = RL.cache(),
		aUids = []
	;

	if (Utils.isArray(aList) && 0 < aList.length)
	{
		bRequest = false;
		_.each(aList, function (oMessageListItem) {
			if (!oCache.getMessageFlagsFromCache(oMessageListItem.folderFullNameRaw, oMessageListItem.uid))
			{
				aUids.push(oMessageListItem.uid);
			}

			if (0 < oMessageListItem.threads().length)
			{
				_.each(oMessageListItem.threads(), function (sUid) {
					if (!oCache.getMessageFlagsFromCache(oMessageListItem.folderFullNameRaw, sUid))
					{
						aUids.push(sUid);
					}
				});
			}
		});

		if (0 < aUids.length)
		{
			bRequest = true;
		}
	}

	if (bRequest)
	{
		this.defaultRequest(fCallback, 'FolderInformation', {
			'Folder': sFolder,
			'FlagsUids': Utils.isArray(aUids) ? aUids.join(',') : '',
			'UidNext': 'INBOX' === sFolder ? RL.cache().getFolderUidNext(sFolder) : ''
		});
	}
	else if (RL.data().useThreads())
	{
		RL.reloadFlagsCurrentMessageListAndMessageFromCache();
	}
};

/**
 * @param {?Function} fCallback
 * @param {Array} aFolders
 */
WebMailAjaxRemoteStorage.prototype.folderInformationMultiply = function (fCallback, aFolders)
{
	this.defaultRequest(fCallback, 'FolderInformationMultiply', {
		'Folders': aFolders
	});
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.logout = function (fCallback)
{
	this.defaultRequest(fCallback, 'Logout');
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 * @param {Array} aUids
 * @param {boolean} bSetFlagged
 */
WebMailAjaxRemoteStorage.prototype.messageSetFlagged = function (fCallback, sFolderFullNameRaw, aUids, bSetFlagged)
{
	this.defaultRequest(fCallback, 'MessageSetFlagged', {
		'Folder': sFolderFullNameRaw,
		'Uids': aUids.join(','),
		'SetAction': bSetFlagged ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 * @param {Array} aUids
 * @param {boolean} bSetSeen
 */
WebMailAjaxRemoteStorage.prototype.messageSetSeen = function (fCallback, sFolderFullNameRaw, aUids, bSetSeen)
{
	this.defaultRequest(fCallback, 'MessageSetSeen', {
		'Folder': sFolderFullNameRaw,
		'Uids': aUids.join(','),
		'SetAction': bSetSeen ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 * @param {boolean} bSetSeen
 */
WebMailAjaxRemoteStorage.prototype.messageSetSeenToAll = function (fCallback, sFolderFullNameRaw, bSetSeen)
{
	this.defaultRequest(fCallback, 'MessageSetSeenToAll', {
		'Folder': sFolderFullNameRaw,
		'SetAction': bSetSeen ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sMessageFolder
 * @param {string} sMessageUid
 * @param {string} sDraftFolder
 * @param {string} sFrom
 * @param {string} sTo
 * @param {string} sCc
 * @param {string} sBcc
 * @param {string} sSubject
 * @param {boolean} bTextIsHtml
 * @param {string} sText
 * @param {Array} aAttachments
 * @param {(Array|null)} aDraftInfo
 * @param {string} sInReplyTo
 * @param {string} sReferences
 */
WebMailAjaxRemoteStorage.prototype.saveMessage = function (fCallback, sMessageFolder, sMessageUid, sDraftFolder,
	sFrom, sTo, sCc, sBcc, sSubject, bTextIsHtml, sText, aAttachments, aDraftInfo, sInReplyTo, sReferences)
{
	this.defaultRequest(fCallback, 'SaveMessage', {
		'MessageFolder': sMessageFolder,
		'MessageUid': sMessageUid,
		'DraftFolder': sDraftFolder,
		'From': sFrom,
		'To': sTo,
		'Cc': sCc,
		'Bcc': sBcc,
		'Subject': sSubject,
		'TextIsHtml': bTextIsHtml ? '1' : '0',
		'Text': sText,
		'DraftInfo': aDraftInfo,
		'InReplyTo': sInReplyTo,
		'References': sReferences,
		'Attachments': aAttachments
	}, Consts.Defaults.SaveMessageAjaxTimeout);
};


/**
 * @param {?Function} fCallback
 * @param {string} sMessageFolder
 * @param {string} sMessageUid
 * @param {string} sReadReceipt
 * @param {string} sSubject
 * @param {string} sText
 */
WebMailAjaxRemoteStorage.prototype.sendReadReceiptMessage = function (fCallback, sMessageFolder, sMessageUid, sReadReceipt, sSubject, sText)
{
	this.defaultRequest(fCallback, 'SendReadReceiptMessage', {
		'MessageFolder': sMessageFolder,
		'MessageUid': sMessageUid,
		'ReadReceipt': sReadReceipt,
		'Subject': sSubject,
		'Text': sText
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sMessageFolder
 * @param {string} sMessageUid
 * @param {string} sSentFolder
 * @param {string} sFrom
 * @param {string} sTo
 * @param {string} sCc
 * @param {string} sBcc
 * @param {string} sSubject
 * @param {boolean} bTextIsHtml
 * @param {string} sText
 * @param {Array} aAttachments
 * @param {(Array|null)} aDraftInfo
 * @param {string} sInReplyTo
 * @param {string} sReferences
 * @param {boolean} bRequestReadReceipt
 */
WebMailAjaxRemoteStorage.prototype.sendMessage = function (fCallback, sMessageFolder, sMessageUid, sSentFolder,
	sFrom, sTo, sCc, sBcc, sSubject, bTextIsHtml, sText, aAttachments, aDraftInfo, sInReplyTo, sReferences, bRequestReadReceipt)
{
	this.defaultRequest(fCallback, 'SendMessage', {
		'MessageFolder': sMessageFolder,
		'MessageUid': sMessageUid,
		'SentFolder': sSentFolder,
		'From': sFrom,
		'To': sTo,
		'Cc': sCc,
		'Bcc': sBcc,
		'Subject': sSubject,
		'TextIsHtml': bTextIsHtml ? '1' : '0',
		'Text': sText,
		'DraftInfo': aDraftInfo,
		'InReplyTo': sInReplyTo,
		'References': sReferences,
		'ReadReceiptRequest': bRequestReadReceipt ? '1' : '0',
		'Attachments': aAttachments
	}, Consts.Defaults.SendMessageAjaxTimeout);
};

/**
 * @param {?Function} fCallback
 * @param {Object} oData
 */
WebMailAjaxRemoteStorage.prototype.saveSystemFolders = function (fCallback, oData)
{
	this.defaultRequest(fCallback, 'SystemFoldersUpdate', oData);
};

/**
 * @param {?Function} fCallback
 * @param {Object} oData
 */
WebMailAjaxRemoteStorage.prototype.saveSettings = function (fCallback, oData)
{
	this.defaultRequest(fCallback, 'SettingsUpdate', oData);
};

/**
 * @param {?Function} fCallback
 * @param {string} sPrevPassword
 * @param {string} sNewPassword
 */
WebMailAjaxRemoteStorage.prototype.changePassword = function (fCallback, sPrevPassword, sNewPassword)
{
	this.defaultRequest(fCallback, 'ChangePassword', {
		'PrevPassword': sPrevPassword,
		'NewPassword': sNewPassword
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sNewFolderName
 * @param {string} sParentName
 */
WebMailAjaxRemoteStorage.prototype.folderCreate = function (fCallback, sNewFolderName, sParentName)
{
	this.defaultRequest(fCallback, 'FolderCreate', {
		'Folder': sNewFolderName,
		'Parent': sParentName
	}, null, '', ['Folders']);
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 */
WebMailAjaxRemoteStorage.prototype.folderDelete = function (fCallback, sFolderFullNameRaw)
{
	this.defaultRequest(fCallback, 'FolderDelete', {
		'Folder': sFolderFullNameRaw
	}, null, '', ['Folders']);
};

/**
 * @param {?Function} fCallback
 * @param {string} sPrevFolderFullNameRaw
 * @param {string} sNewFolderName
 */
WebMailAjaxRemoteStorage.prototype.folderRename = function (fCallback, sPrevFolderFullNameRaw, sNewFolderName)
{
	this.defaultRequest(fCallback, 'FolderRename', {
		'Folder': sPrevFolderFullNameRaw,
		'NewFolderName': sNewFolderName
	}, null, '', ['Folders']);
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 */
WebMailAjaxRemoteStorage.prototype.folderClear = function (fCallback, sFolderFullNameRaw)
{
	this.defaultRequest(fCallback, 'FolderClear', {
		'Folder': sFolderFullNameRaw
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolderFullNameRaw
 * @param {boolean} bSubscribe
 */
WebMailAjaxRemoteStorage.prototype.folderSetSubscribe = function (fCallback, sFolderFullNameRaw, bSubscribe)
{
	this.defaultRequest(fCallback, 'FolderSubscribe', {
		'Folder': sFolderFullNameRaw,
		'Subscribe': bSubscribe ? '1' : '0'
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolder
 * @param {string} sToFolder
 * @param {Array} aUids
 */
WebMailAjaxRemoteStorage.prototype.messagesMove = function (fCallback, sFolder, sToFolder, aUids)
{
	this.defaultRequest(fCallback, 'MessageMove', {
		'FromFolder': sFolder,
		'ToFolder': sToFolder,
		'Uids': aUids.join(',')
	}, null, '', ['MessageList']);
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolder
 * @param {string} sToFolder
 * @param {Array} aUids
 */
WebMailAjaxRemoteStorage.prototype.messagesCopy = function (fCallback, sFolder, sToFolder, aUids)
{
	this.defaultRequest(fCallback, 'MessageCopy', {
		'FromFolder': sFolder,
		'ToFolder': sToFolder,
		'Uids': aUids.join(',')
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sFolder
 * @param {Array} aUids
 */
WebMailAjaxRemoteStorage.prototype.messagesDelete = function (fCallback, sFolder, aUids)
{
	this.defaultRequest(fCallback, 'MessageDelete', {
		'Folder': sFolder,
		'Uids': aUids.join(',')
	}, null, '', ['MessageList']);
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.appDelayStart = function (fCallback)
{
	this.defaultRequest(fCallback, 'AppDelayStart');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.quota = function (fCallback)
{
	this.defaultRequest(fCallback, 'Quota');
};

/**
 * @param {?Function} fCallback
 * @param {number} iOffset
 * @param {number} iLimit
 * @param {string} sSearch
 */
WebMailAjaxRemoteStorage.prototype.contacts = function (fCallback, iOffset, iLimit, sSearch)
{
	this.defaultRequest(fCallback, 'Contacts', {
		'Offset': iOffset,
		'Limit': iLimit,
		'Search': sSearch
	}, null, '', ['Contacts']);
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.contactSave = function (fCallback, sRequestUid, sUid, sUidStr, iScopeType, aProperties)
{
	this.defaultRequest(fCallback, 'ContactSave', {
		'RequestUid': sRequestUid,
		'Uid': Utils.trim(sUid),
		'UidStr': Utils.trim(sUidStr),
		'ScopeType': iScopeType,
		'Properties': aProperties
	});
};

/**
 * @param {?Function} fCallback
 * @param {Array} aUids
 */
WebMailAjaxRemoteStorage.prototype.contactsDelete = function (fCallback, aUids)
{
	this.defaultRequest(fCallback, 'ContactsDelete', {
		'Uids': aUids.join(',')
	});
};

/**
 * @param {?Function} fCallback
 * @param {string} sQuery
 * @param {number} iPage
 */
WebMailAjaxRemoteStorage.prototype.suggestions = function (fCallback, sQuery, iPage)
{
	this.defaultRequest(fCallback, 'Suggestions', {
		'Query': sQuery,
		'Page': iPage
	}, null, '', ['Suggestions']);
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.servicesPics = function (fCallback)
{
	this.defaultRequest(fCallback, 'ServicesPics');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.emailsPicsHashes = function (fCallback)
{
	this.defaultRequest(fCallback, 'EmailsPicsHashes');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.facebookUser = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialFacebookUserInformation');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.facebookDisconnect = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialFacebookDisconnect');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.twitterUser = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialTwitterUserInformation');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.twitterDisconnect = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialTwitterDisconnect');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.googleUser = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialGoogleUserInformation');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.googleDisconnect = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialGoogleDisconnect');
};

/**
 * @param {?Function} fCallback
 */
WebMailAjaxRemoteStorage.prototype.socialUsers = function (fCallback)
{
	this.defaultRequest(fCallback, 'SocialUsers');
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
function WebMailCacheStorage()
{
	AbstractCacheStorage.call(this);

	this.oFoldersCache = {};
	this.oFoldersNamesCache = {};
	this.oFolderHashCache = {};
	this.oFolderUidNextCache = {};
	this.oMessageListHashCache = {};
	this.oMessageFlagsCache = {};
	this.oNewMessage = {};
	this.oRequestedMessage = {};
}

_.extend(WebMailCacheStorage.prototype, AbstractCacheStorage.prototype);

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oFoldersCache = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oFoldersNamesCache = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oFolderHashCache = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oFolderUidNextCache = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oMessageListHashCache = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oMessageFlagsCache = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oBodies = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oNewMessage = {};

/**
 * @type {Object}
 */
WebMailCacheStorage.prototype.oRequestedMessage = {};

WebMailCacheStorage.prototype.clear = function ()
{
	AbstractCacheStorage.prototype.clear.call(this);
	
	this.oFoldersCache = {};
	this.oFoldersNamesCache = {};
	this.oFolderHashCache = {};
	this.oFolderUidNextCache = {};
	this.oMessageListHashCache = {};
	this.oMessageFlagsCache = {};
	this.oBodies = {};
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {string} sUid
 * @return {string}
 */
WebMailCacheStorage.prototype.getMessageKey = function (sFolderFullNameRaw, sUid)
{
	return sFolderFullNameRaw + '#' + sUid;
};

/**
 * @param {string} sFolder
 * @param {string} sUid
 */
WebMailCacheStorage.prototype.addRequestedMessage = function (sFolder, sUid)
{
	this.oRequestedMessage[this.getMessageKey(sFolder, sUid)] = true;
};

/**
 * @param {string} sFolder
 * @param {string} sUid
 * @return {boolean}
 */
WebMailCacheStorage.prototype.hasRequestedMessage = function (sFolder, sUid)
{
	return true === this.oRequestedMessage[this.getMessageKey(sFolder, sUid)];
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {string} sUid
 */
WebMailCacheStorage.prototype.addNewMessageCache = function (sFolderFullNameRaw, sUid)
{
	this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = true;
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {string} sUid
 */
WebMailCacheStorage.prototype.hasNewMessageAndRemoveFromCache = function (sFolderFullNameRaw, sUid)
{
	if (this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)])
	{
		this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = null;
		return true;
	}

	return false;
};

WebMailCacheStorage.prototype.clearNewMessageCache = function ()
{
	this.oNewMessage = {};
};

/**
 * @param {string} sFolderHash
 * @return {string}
 */
WebMailCacheStorage.prototype.getFolderFullNameRaw = function (sFolderHash)
{
	return '' !== sFolderHash && this.oFoldersNamesCache[sFolderHash] ? this.oFoldersNamesCache[sFolderHash] : '';
};

/**
 * @param {string} sFolderHash
 * @param {string} sFolderFullNameRaw
 */
WebMailCacheStorage.prototype.setFolderFullNameRaw = function (sFolderHash, sFolderFullNameRaw)
{
	this.oFoldersNamesCache[sFolderHash] = sFolderFullNameRaw;
};

/**
 * @param {string} sFolderFullNameRaw
 * @return {string}
 */
WebMailCacheStorage.prototype.getFolderHash = function (sFolderFullNameRaw)
{
	return '' !== sFolderFullNameRaw && this.oFolderHashCache[sFolderFullNameRaw] ? this.oFolderHashCache[sFolderFullNameRaw] : '';
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {string} sFolderHash
 */
WebMailCacheStorage.prototype.setFolderHash = function (sFolderFullNameRaw, sFolderHash)
{
	this.oFolderHashCache[sFolderFullNameRaw] = sFolderHash;
};

/**
 * @param {string} sFolderFullNameRaw
 * @return {string}
 */
WebMailCacheStorage.prototype.getFolderUidNext = function (sFolderFullNameRaw)
{
	return '' !== sFolderFullNameRaw && this.oFolderUidNextCache[sFolderFullNameRaw] ? this.oFolderUidNextCache[sFolderFullNameRaw] : '';
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {string} sUidNext
 */
WebMailCacheStorage.prototype.setFolderUidNext = function (sFolderFullNameRaw, sUidNext)
{
	this.oFolderUidNextCache[sFolderFullNameRaw] = sUidNext;
};

/**
 * @param {string} sFolderFullNameRaw
 * @return {?FolderModel}
 */
WebMailCacheStorage.prototype.getFolderFromCacheList = function (sFolderFullNameRaw)
{
	return '' !== sFolderFullNameRaw && this.oFoldersCache[sFolderFullNameRaw] ? this.oFoldersCache[sFolderFullNameRaw] : null;
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {?FolderModel} oFolder
 */
WebMailCacheStorage.prototype.setFolderToCacheList = function (sFolderFullNameRaw, oFolder)
{
	this.oFoldersCache[sFolderFullNameRaw] = oFolder;
};

/**
 * @param {string} sFolderFullNameRaw
 */
WebMailCacheStorage.prototype.removeFolderFromCacheList = function (sFolderFullNameRaw)
{
	this.setFolderToCacheList(sFolderFullNameRaw, null);
};

/**
 * @param {string} sFolderFullName
 * @param {string} sUid
 * @return {?Array}
 */
WebMailCacheStorage.prototype.getMessageFlagsFromCache = function (sFolderFullName, sUid)
{
	return this.oMessageFlagsCache[sFolderFullName] && this.oMessageFlagsCache[sFolderFullName][sUid] ?
		this.oMessageFlagsCache[sFolderFullName][sUid] : null;
};

/**
 * @param {string} sFolderFullName
 * @param {string} sUid
 * @param {Array} aFlagsCache
 */
WebMailCacheStorage.prototype.setMessageFlagsToCache = function (sFolderFullName, sUid, aFlagsCache)
{
	if (!this.oMessageFlagsCache[sFolderFullName])
	{
		this.oMessageFlagsCache[sFolderFullName] = {};
	}
	
	this.oMessageFlagsCache[sFolderFullName][sUid] = aFlagsCache;
};

/**
 * @param {string} sFolderFullName
 */
WebMailCacheStorage.prototype.clearMessageFlagsFromCacheByFolder = function (sFolderFullName)
{
	this.oMessageFlagsCache[sFolderFullName] = {};
};

/**
 * @param {(MessageModel|null)} oMessage
 */
WebMailCacheStorage.prototype.initMessageFlagsFromCache = function (oMessage)
{
	if (oMessage)
	{
		var
			self = this,
			aFlags = this.getMessageFlagsFromCache(oMessage.folderFullNameRaw, oMessage.uid),
			mUnseenSubUid = null,
			mFlaggedSubUid = null
		;

		if (aFlags && 0 < aFlags.length)
		{
			oMessage.unseen(!!aFlags[0]);
			oMessage.flagged(!!aFlags[1]);
			oMessage.answered(!!aFlags[2]);
			oMessage.forwarded(!!aFlags[3]);
			oMessage.isReadReceipt(!!aFlags[4]);
		}

		if (0 < oMessage.threads().length)
		{
			mUnseenSubUid = _.find(oMessage.threads(), function (iSubUid) {
				var aFlags = self.getMessageFlagsFromCache(oMessage.folderFullNameRaw, iSubUid);
				return aFlags && 0 < aFlags.length && !!aFlags[0];
			});

			mFlaggedSubUid = _.find(oMessage.threads(), function (iSubUid) {
				var aFlags = self.getMessageFlagsFromCache(oMessage.folderFullNameRaw, iSubUid);
				return aFlags && 0 < aFlags.length && !!aFlags[1];
			});

			oMessage.hasUnseenSubMessage(mUnseenSubUid && 0 < Utils.pInt(mUnseenSubUid));
			oMessage.hasFlaggedSubMessage(mFlaggedSubUid && 0 < Utils.pInt(mFlaggedSubUid));
		}
	}
};

/**
 * @param {(MessageModel|null)} oMessage
 */
WebMailCacheStorage.prototype.storeMessageFlagsToCache = function (oMessage)
{
	if (oMessage)
	{
		this.setMessageFlagsToCache(
			oMessage.folderFullNameRaw,
			oMessage.uid,
			[oMessage.unseen(), oMessage.flagged(), oMessage.answered(), oMessage.forwarded(), oMessage.isReadReceipt()]
		);
	}
};
/**
 * @param {string} sFolder
 * @param {string} sUid
 * @param {Array} aFlags
 */
WebMailCacheStorage.prototype.storeMessageFlagsToCacheByFolderAndUid = function (sFolder, sUid, aFlags)
{
	if (Utils.isArray(aFlags) && 0 < aFlags.length)
	{
		this.setMessageFlagsToCache(sFolder, sUid, aFlags);
	}
};

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
function LoginScreen()
{
	KnoinAbstractScreen.call(this, 'login', [LoginViewModel]);
}

_.extend(LoginScreen.prototype, KnoinAbstractScreen.prototype);

LoginScreen.prototype.onShow = function ()
{
	RL.setTitle('');
};
/**
 * @constructor
 * @extends KnoinAbstractScreen
 */
function MailBoxScreen()
{
	KnoinAbstractScreen.call(this, 'mailbox', [
		MailBoxSystemDropDownViewModel,
		MailBoxFolderListViewModel,
		MailBoxMessageListViewModel,
		MailBoxMessageViewViewModel
	]);

	this.oLastRoute = {};
}

_.extend(MailBoxScreen.prototype, KnoinAbstractScreen.prototype);

/**
 * @type {Object}
 */
MailBoxScreen.prototype.oLastRoute = {};

MailBoxScreen.prototype.setNewTitle  = function ()
{
	var
		sEmail = RL.data().accountEmail(),
		ifoldersInboxUnreadCount = RL.data().foldersInboxUnreadCount()
	;
	
	RL.setTitle(('' === sEmail ? '' :
		(0 < ifoldersInboxUnreadCount ? '(' + ifoldersInboxUnreadCount + ') ' : ' ') + sEmail + ' - ') + Utils.i18n('TITLES/MAILBOX'));
};

MailBoxScreen.prototype.onShow = function ()
{
	this.setNewTitle();
	RL.data().keyScope(Enums.KeyState.MessageList);
};

/**
 * @param {string} sFolderHash
 * @param {number} iPage
 * @param {string} sSearch
 * @param {boolean=} bPreview = false
 */
MailBoxScreen.prototype.onRoute = function (sFolderHash, iPage, sSearch, bPreview)
{
	if (Utils.isUnd(bPreview) ? false : !!bPreview)
	{
		if (Enums.Layout.NoPreview === RL.data().layout() && !RL.data().message())
		{
			RL.historyBack();
		}
	}
	else
	{
		var
			oData = RL.data(),
			sFolderFullNameRaw = RL.cache().getFolderFullNameRaw(sFolderHash),
			oFolder = RL.cache().getFolderFromCacheList(sFolderFullNameRaw)
		;

		if (oFolder)
		{
			oData
				.currentFolder(oFolder)
				.messageListPage(iPage)
				.messageListSearch(sSearch)
			;

			if (Enums.Layout.NoPreview === oData.layout() && oData.message())
			{
				oData.message(null);
				oData.messageFullScreenMode(false);
			}

			RL.reloadMessageList();
		}
	}
};

MailBoxScreen.prototype.onStart = function ()
{
	var
		oData = RL.data(),
		fResizeFunction = function () {
			Utils.windowResize();
		}
	;

	if (RL.settingsGet('AllowAdditionalAccounts') || RL.settingsGet('AllowIdentities'))
	{
		RL.accountsAndIdentities();
	}

	_.delay(function () {
		if ('INBOX' !== oData.currentFolderFullNameRaw())
		{
			RL.folderInformation('INBOX');
		}
	}, 1000);

	_.delay(function () {
		RL.quota();
	}, 5000);

	_.delay(function () {
		RL.remote().appDelayStart(Utils.emptyFunction);
	}, 35000);

	$html.toggleClass('rl-no-preview-pane', Enums.Layout.NoPreview === oData.layout());

	oData.folderList.subscribe(fResizeFunction);
	oData.messageList.subscribe(fResizeFunction);
	oData.message.subscribe(fResizeFunction);

	oData.layout.subscribe(function (nValue) {
		$html.toggleClass('rl-no-preview-pane', Enums.Layout.NoPreview === nValue);
	});
	
	oData.foldersInboxUnreadCount.subscribe(function () {
		this.setNewTitle();
	}, this);
};

/**
 * @return {Array}
 */
MailBoxScreen.prototype.routes = function ()
{
	var
		fNormP = function () {
			return ['Inbox', 1, '', true];
		},
		fNormS = function (oRequest, oVals) {
			oVals[0] = Utils.pString(oVals[0]);
			oVals[1] = Utils.pInt(oVals[1]);
			oVals[1] = 0 >= oVals[1] ? 1 : oVals[1];
			oVals[2] = Utils.pString(oVals[2]);

			if ('' === oRequest)
			{
				oVals[0] = 'Inbox';
				oVals[1] = 1;
			}

			return [decodeURI(oVals[0]), oVals[1], decodeURI(oVals[2]), false];
		},
		fNormD = function (oRequest, oVals) {
			oVals[0] = Utils.pString(oVals[0]);
			oVals[1] = Utils.pString(oVals[1]);

			if ('' === oRequest)
			{
				oVals[0] = 'Inbox';
			}

			return [decodeURI(oVals[0]), 1, decodeURI(oVals[1]), false];
		}
	;

	return [
		[/^([a-zA-Z0-9]+)\/p([1-9][0-9]*)\/(.+)\/?$/, {'normalize_': fNormS}],
		[/^([a-zA-Z0-9]+)\/p([1-9][0-9]*)$/, {'normalize_': fNormS}],
		[/^([a-zA-Z0-9]+)\/(.+)\/?$/, {'normalize_': fNormD}],
		[/^message-preview$/,  {'normalize_': fNormP}],
		[/^([^\/]*)$/,  {'normalize_': fNormS}]
	];
};

/**
 * @constructor
 * @extends AbstractSettings
 */
function SettingsScreen()
{
	AbstractSettings.call(this, [
		SettingsSystemDropDownViewModel,
		SettingsMenuViewModel,
		SettingsPaneViewModel
	]);

	Utils.initOnStartOrLangChange(function () {
		this.sSettingsTitle = Utils.i18n('TITLES/SETTINGS');
	}, this, function () {
		RL.setTitle(this.sSettingsTitle);
	});
}

_.extend(SettingsScreen.prototype, AbstractSettings.prototype);

SettingsScreen.prototype.onShow = function ()
{
//	AbstractSettings.prototype.onShow.call(this);

	RL.setTitle(this.sSettingsTitle);
	RL.data().keyScope(Enums.KeyState.Settings);
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
function RainLoopApp()
{
	AbstractApp.call(this);

	this.oData = null;
	this.oRemote = null;
	this.oCache = null;
	this.oMoveCache = {};
	
	this.quotaDebounce = _.debounce(this.quota, 1000 * 30);
	this.moveOrDeleteResponseHelper = _.bind(this.moveOrDeleteResponseHelper, this);

	this.messagesMoveTrigger = _.debounce(this.messagesMoveTrigger, 500);

	window.setInterval(function () {
		RL.pub('interval.30s');
	}, 30000);

	window.setInterval(function () {
		RL.pub('interval.1m');
	}, 60000);

	window.setInterval(function () {
		RL.pub('interval.2m');
	}, 60000 * 2);

	window.setInterval(function () {
		RL.pub('interval.3m');
	}, 60000 * 3);

	window.setInterval(function () {
		RL.pub('interval.5m');
	}, 60000 * 5);

	window.setInterval(function () {
		RL.pub('interval.10m');
	}, 60000 * 10);

	$.wakeUp(function () {
		RL.remote().jsVersion(function (sResult, oData) {
			if (Enums.StorageResultType.Success === sResult && oData && !oData.Result)
			{
				if (window.parent && !!RL.settingsGet('InIframe'))
				{
					window.parent.location.reload();
				}
				else
				{
					window.location.reload();
				}
			}
		}, RL.settingsGet('Version'));
	}, {}, 60 * 60 * 1000);
}

_.extend(RainLoopApp.prototype, AbstractApp.prototype);

RainLoopApp.prototype.oData = null;
RainLoopApp.prototype.oRemote = null;
RainLoopApp.prototype.oCache = null;

/**
 * @return {WebMailDataStorage}
 */
RainLoopApp.prototype.data = function ()
{
	if (null === this.oData)
	{
		this.oData = new WebMailDataStorage();
	}

	return this.oData;
};

/**
 * @return {WebMailAjaxRemoteStorage}
 */
RainLoopApp.prototype.remote = function ()
{
	if (null === this.oRemote)
	{
		this.oRemote = new WebMailAjaxRemoteStorage();
	}

	return this.oRemote;
};

/**
 * @return {WebMailCacheStorage}
 */
RainLoopApp.prototype.cache = function ()
{
	if (null === this.oCache)
	{
		this.oCache = new WebMailCacheStorage();
	}

	return this.oCache;
};

RainLoopApp.prototype.reloadFlagsCurrentMessageListAndMessageFromCache = function ()
{
	var oCache = RL.cache();
	_.each(RL.data().messageList(), function (oMessage) {
		oCache.initMessageFlagsFromCache(oMessage);
	});

	oCache.initMessageFlagsFromCache(RL.data().message());
};

/**
 * @param {boolean=} bDropPagePosition = false
 * @param {boolean=} bDropCurrenFolderCache = false
 */
RainLoopApp.prototype.reloadMessageList = function (bDropPagePosition, bDropCurrenFolderCache)
{
	var
		oRLData = RL.data(),
		iOffset = (oRLData.messageListPage() - 1) * oRLData.messagesPerPage()
	;

	if (Utils.isUnd(bDropCurrenFolderCache) ? false : !!bDropCurrenFolderCache)
	{
		RL.cache().setFolderHash(oRLData.currentFolderFullNameRaw(), '');
	}

	if (Utils.isUnd(bDropPagePosition) ? false : !!bDropPagePosition)
	{
		oRLData.messageListPage(1);
		iOffset = 0;
	}

	oRLData.messageListLoading(true);
	RL.remote().messageList(function (sResult, oData, bCached) {

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			oRLData.messageListError('');
			oRLData.messageListLoading(false);
			oRLData.setMessageList(oData, bCached);
		}
		else if (Enums.StorageResultType.Unload === sResult)
		{
			oRLData.messageListError('');
			oRLData.messageListLoading(false);
		}
		else if (Enums.StorageResultType.Abort !== sResult)
		{
			oRLData.messageList([]);
			oRLData.messageListLoading(false);
			oRLData.messageListError(oData && oData.ErrorCode ?
				Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_GET_MESSAGE_LIST')
			);
		}

	}, oRLData.currentFolderFullNameRaw(), iOffset, oRLData.messagesPerPage(), oRLData.messageListSearch());
};

RainLoopApp.prototype.recacheInboxMessageList = function ()
{
	RL.remote().messageList(Utils.emptyFunction, 'INBOX', 0, RL.data().messagesPerPage(), '', true);
};

RainLoopApp.prototype.reloadMessageListHelper = function (bEmptyList)
{
	RL.reloadMessageList(bEmptyList);
};

RainLoopApp.prototype.messagesMoveTrigger = function ()
{
	var self = this;
	
	_.each(this.oMoveCache, function (oItem) {
		RL.remote().messagesMove(self.moveOrDeleteResponseHelper, oItem['From'], oItem['To'], oItem['Uid']);
	});

	this.oMoveCache = {};
};

RainLoopApp.prototype.messagesMoveHelper = function (sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForMove)
{
	var sH = '$$' + sFromFolderFullNameRaw + '$$' + sToFolderFullNameRaw + '$$';
	if (!this.oMoveCache[sH])
	{
		this.oMoveCache[sH] = {
			'From': sFromFolderFullNameRaw,
			'To': sToFolderFullNameRaw,
			'Uid': []
		};
	}

	this.oMoveCache[sH]['Uid'] = _.union(this.oMoveCache[sH]['Uid'], aUidForMove);
	this.messagesMoveTrigger();
};

RainLoopApp.prototype.messagesCopyHelper = function (sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForCopy)
{
	RL.remote().messagesCopy(
		this.moveOrDeleteResponseHelper,
		sFromFolderFullNameRaw,
		sToFolderFullNameRaw,
		aUidForCopy
	);
};

RainLoopApp.prototype.messagesDeleteHelper = function (sFromFolderFullNameRaw, aUidForRemove)
{
	RL.remote().messagesDelete(
		this.moveOrDeleteResponseHelper,
		sFromFolderFullNameRaw,
		aUidForRemove
	);
};

RainLoopApp.prototype.moveOrDeleteResponseHelper = function (sResult, oData)
{
	if (Enums.StorageResultType.Success === sResult && RL.data().currentFolder())
	{
		if (oData && Utils.isArray(oData.Result) && 2 === oData.Result.length)
		{
			RL.cache().setFolderHash(oData.Result[0], oData.Result[1]);
		}
		else
		{
			RL.cache().setFolderHash(RL.data().currentFolderFullNameRaw(), '');
			
			if (oData && -1 < Utils.inArray(oData.ErrorCode,
				[Enums.Notification.CantMoveMessage, Enums.Notification.CantCopyMessage]))
			{
				window.alert(Utils.getNotification(oData.ErrorCode));
			}
		}

		RL.reloadMessageListHelper(0 === RL.data().messageList().length);
		RL.quotaDebounce();
	}
};

/**
 * @param {string} sFromFolderFullNameRaw
 * @param {Array} aUidForRemove
 */
RainLoopApp.prototype.deleteMessagesFromFolderWithoutCheck = function (sFromFolderFullNameRaw, aUidForRemove)
{
	this.messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove);
	RL.data().removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove);
};

/**
 * @param {number} iDeleteType
 * @param {string} sFromFolderFullNameRaw
 * @param {Array} aUidForRemove
 * @param {boolean=} bUseFolder = true
 */
RainLoopApp.prototype.deleteMessagesFromFolder = function (iDeleteType, sFromFolderFullNameRaw, aUidForRemove, bUseFolder)
{
	var
		self = this,
		oData = RL.data(),
		oCache = RL.cache(),
		oMoveFolder = null,
		nSetSystemFoldersNotification = null
	;

	switch (iDeleteType)
	{
		case Enums.FolderType.Spam:
			oMoveFolder = oCache.getFolderFromCacheList(oData.spamFolder());
			nSetSystemFoldersNotification = Enums.SetSystemFoldersNotification.Spam;
			break;
		case Enums.FolderType.Trash:
			oMoveFolder = oCache.getFolderFromCacheList(oData.trashFolder());
			nSetSystemFoldersNotification = Enums.SetSystemFoldersNotification.Trash;
			break;
		case Enums.FolderType.Archive:
			oMoveFolder = oCache.getFolderFromCacheList(oData.archiveFolder());
			nSetSystemFoldersNotification = Enums.SetSystemFoldersNotification.Archive;
			break;
	}

	bUseFolder = Utils.isUnd(bUseFolder) ? true : !!bUseFolder;
	if (bUseFolder)
	{
		if ((Enums.FolderType.Spam === iDeleteType && Consts.Values.UnuseOptionValue === oData.spamFolder()) ||
			(Enums.FolderType.Trash === iDeleteType && Consts.Values.UnuseOptionValue === oData.trashFolder()) ||
			(Enums.FolderType.Archive === iDeleteType && Consts.Values.UnuseOptionValue === oData.archiveFolder()))
		{
			bUseFolder = false;
		}
	}

	if (!oMoveFolder && bUseFolder)
	{
		kn.showScreenPopup(PopupsFolderSystemViewModel, [nSetSystemFoldersNotification]);
	}
	else if (!bUseFolder || (Enums.FolderType.Trash === iDeleteType && 
		(sFromFolderFullNameRaw === oData.spamFolder() || sFromFolderFullNameRaw === oData.trashFolder())))
	{
		kn.showScreenPopup(PopupsAskViewModel, [Utils.i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'), function () {

			self.messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove);
			oData.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove);
		
		}]);
	}
	else if (oMoveFolder)
	{
		this.messagesMoveHelper(sFromFolderFullNameRaw, oMoveFolder.fullNameRaw, aUidForRemove);
		oData.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove, oMoveFolder.fullNameRaw);
	}
};

/**
 * @param {string} sFromFolderFullNameRaw
 * @param {Array} aUidForMove
 * @param {string} sToFolderFullNameRaw
 * @param {boolean=} bCopy = false
 */
RainLoopApp.prototype.moveMessagesToFolder = function (sFromFolderFullNameRaw, aUidForMove, sToFolderFullNameRaw, bCopy)
{
	if (sFromFolderFullNameRaw !== sToFolderFullNameRaw && Utils.isArray(aUidForMove) && 0 < aUidForMove.length)
	{
		var
			oFromFolder = RL.cache().getFolderFromCacheList(sFromFolderFullNameRaw),
			oToFolder = RL.cache().getFolderFromCacheList(sToFolderFullNameRaw)
		;

		if (oFromFolder && oToFolder)
		{
			if (Utils.isUnd(bCopy) ? false : !!bCopy)
			{
				this.messagesCopyHelper(oFromFolder.fullNameRaw, oToFolder.fullNameRaw, aUidForMove);
			}
			else
			{
				this.messagesMoveHelper(oFromFolder.fullNameRaw, oToFolder.fullNameRaw, aUidForMove);
			}

			RL.data().removeMessagesFromList(oFromFolder.fullNameRaw, aUidForMove, oToFolder.fullNameRaw, bCopy);
			return true;
		}
	}

	return false;
};

/**
 * @param {Function=} fCallback
 */
RainLoopApp.prototype.folders = function (fCallback)
{
	this.data().foldersLoading(true);
	this.remote().folders(_.bind(function (sResult, oData) {

		RL.data().foldersLoading(false);
		if (Enums.StorageResultType.Success === sResult)
		{
			this.data().setFolders(oData);
			if (fCallback)
			{
				fCallback(true);
			}
		}
		else
		{
			if (fCallback)
			{
				fCallback(false);
			}
		}
	}, this));
};

RainLoopApp.prototype.reloadOpenPgpKeys = function ()
{
	if (RL.data().allowOpenPGP())
	{
		var
			aKeys = [],
			oEmail = new EmailModel(),
			oOpenpgpKeyring = RL.data().openpgpKeyring,
			oOpenpgpKeys = oOpenpgpKeyring ? oOpenpgpKeyring.keys : []
		;

		_.each(oOpenpgpKeys, function (oItem, iIndex) {
			if (oItem && oItem.primaryKey)
			{
				var

					oPrimaryUser = oItem.getPrimaryUser(),
					sUser = (oPrimaryUser && oPrimaryUser.user) ? oPrimaryUser.user.userId.userid
						: (oItem.users && oItem.users[0] ? oItem.users[0].userId.userid : '')
				;

				oEmail.clear();
				oEmail.mailsoParse(sUser);

				if (oEmail.validate())
				{
					aKeys.push(new OpenPgpKeyModel(
						iIndex,
						oItem.primaryKey.getFingerprint(),
						oItem.primaryKey.getKeyId().toHex().toLowerCase(),
						sUser,
						oEmail.email,
						oItem.isPrivate(),
						oItem.armor())
					);
				}
			}
		});

		RL.data().openpgpkeys(aKeys);
	}
};

RainLoopApp.prototype.accountsAndIdentities = function ()
{
	var oRainLoopData = RL.data();
	
	oRainLoopData.accountsLoading(true);
	oRainLoopData.identitiesLoading(true);

	RL.remote().accountsAndIdentities(function (sResult, oData) {

		oRainLoopData.accountsLoading(false);
		oRainLoopData.identitiesLoading(false);
		
		if (Enums.StorageResultType.Success === sResult && oData.Result)
		{
			var 
				sParentEmail = RL.settingsGet('ParentEmail'),
				sAccountEmail = oRainLoopData.accountEmail()
			;
			
			sParentEmail = '' === sParentEmail ? sAccountEmail : sParentEmail;

			if (Utils.isArray(oData.Result['Accounts']))
			{
				oRainLoopData.accounts(_.map(oData.Result['Accounts'], function (sValue) {
					return new AccountModel(sValue, sValue !== sParentEmail);
				}));
			}
			
			if (Utils.isArray(oData.Result['Identities']))
			{
				oRainLoopData.identities(_.map(oData.Result['Identities'], function (oIdentityData) {
					
					var 
						sId = Utils.pString(oIdentityData['Id']),
						sEmail = Utils.pString(oIdentityData['Email']),
						oIdentity = new IdentityModel(sId, sEmail, sId !== sAccountEmail)
					;
					
					oIdentity.name(Utils.pString(oIdentityData['Name']));
					oIdentity.replyTo(Utils.pString(oIdentityData['ReplyTo']));
					oIdentity.bcc(Utils.pString(oIdentityData['Bcc']));
					
					return oIdentity;
				}));
			}
		}
	});
};

RainLoopApp.prototype.quota = function ()
{
	this.remote().quota(function (sResult, oData) {
		if (Enums.StorageResultType.Success === sResult &&	oData && oData.Result && 
			Utils.isArray(oData.Result) && 1 < oData.Result.length &&
			Utils.isPosNumeric(oData.Result[0], true) && Utils.isPosNumeric(oData.Result[1], true))
		{
			RL.data().userQuota(Utils.pInt(oData.Result[1]) * 1024);
			RL.data().userUsageSize(Utils.pInt(oData.Result[0]) * 1024);
		}
	});
};

/**
 * @param {string} sFolder
 * @param {Array=} aList = []
 */
RainLoopApp.prototype.folderInformation = function (sFolder, aList)
{
	if ('' !== Utils.trim(sFolder))
	{
		this.remote().folderInformation(function (sResult, oData) {
			if (Enums.StorageResultType.Success === sResult)
			{
				if (oData && oData.Result && oData.Result.Hash && oData.Result.Folder)
				{
					var
						iUtc = moment().unix(),
						sHash = RL.cache().getFolderHash(oData.Result.Folder),
						oFolder = RL.cache().getFolderFromCacheList(oData.Result.Folder),
						bCheck = false,
						sUid = '',
						aList = [],
						bUnreadCountChange = false,
						oFlags = null
					;

					if (oFolder)
					{
						oFolder.interval = iUtc;
						
						if (oData.Result.Hash)
						{
							RL.cache().setFolderHash(oData.Result.Folder, oData.Result.Hash);
						}

						if (Utils.isNormal(oData.Result.MessageCount))
						{
							oFolder.messageCountAll(oData.Result.MessageCount);
						}

						if (Utils.isNormal(oData.Result.MessageUnseenCount))
						{
							if (Utils.pInt(oFolder.messageCountUnread()) !== Utils.pInt(oData.Result.MessageUnseenCount))
							{
								bUnreadCountChange = true;
							}

							oFolder.messageCountUnread(oData.Result.MessageUnseenCount);
						}

						if (bUnreadCountChange)
						{
							RL.cache().clearMessageFlagsFromCacheByFolder(oFolder.fullNameRaw);
						}

						if (oData.Result.Flags)
						{
							for (sUid in oData.Result.Flags)
							{
								if (oData.Result.Flags.hasOwnProperty(sUid))
								{
									bCheck = true;
									oFlags = oData.Result.Flags[sUid];
									RL.cache().storeMessageFlagsToCacheByFolderAndUid(oFolder.fullNameRaw, sUid.toString(), [
										!oFlags['IsSeen'], !!oFlags['IsFlagged'], !!oFlags['IsAnswered'], !!oFlags['IsForwarded'], !!oFlags['IsReadReceipt']
									]);
								}
							}

							if (bCheck)
							{
								RL.reloadFlagsCurrentMessageListAndMessageFromCache();
							}
						}

						RL.data().initUidNextAndNewMessages(oFolder.fullNameRaw, oData.Result.UidNext, oData.Result.NewMessages);

						if (oData.Result.Hash !== sHash || '' === sHash)
						{
							if (oFolder.fullNameRaw === RL.data().currentFolderFullNameRaw())
							{
								RL.reloadMessageList();
							}
							else if ('INBOX' === oFolder.fullNameRaw)
							{
								RL.recacheInboxMessageList();
							}
						}
						else if (bUnreadCountChange)
						{
							if (oFolder.fullNameRaw === RL.data().currentFolderFullNameRaw())
							{
								aList = RL.data().messageList();
								if (Utils.isNonEmptyArray(aList))
								{
									RL.folderInformation(oFolder.fullNameRaw, aList);
								}
							}
						}
					}
				}
			}
		}, sFolder, aList);
	}
};

/**
 * @param {boolean=} bBoot = false
 */
RainLoopApp.prototype.folderInformationMultiply = function (bBoot)
{
	bBoot = Utils.isUnd(bBoot) ? false : !!bBoot;

	var
		iUtc = moment().unix(),
		aFolders = RL.data().getNextFolderNames(bBoot)
	;

	if (Utils.isNonEmptyArray(aFolders))
	{
		this.remote().folderInformationMultiply(function (sResult, oData) {
			if (Enums.StorageResultType.Success === sResult)
			{
				if (oData && oData.Result && oData.Result.List && Utils.isNonEmptyArray(oData.Result.List))
				{
					_.each(oData.Result.List, function (oItem) {
						
						var
							aList = [],
							sHash = RL.cache().getFolderHash(oItem.Folder),
							oFolder = RL.cache().getFolderFromCacheList(oItem.Folder),
							bUnreadCountChange = false
						;

						if (oFolder)
						{
							oFolder.interval = iUtc;

							if (oItem.Hash)
							{
								RL.cache().setFolderHash(oItem.Folder, oItem.Hash);
							}

							if (Utils.isNormal(oItem.MessageCount))
							{
								oFolder.messageCountAll(oItem.MessageCount);
							}

							if (Utils.isNormal(oItem.MessageUnseenCount))
							{
								if (Utils.pInt(oFolder.messageCountUnread()) !== Utils.pInt(oItem.MessageUnseenCount))
								{
									bUnreadCountChange = true;
								}

								oFolder.messageCountUnread(oItem.MessageUnseenCount);
							}

							if (bUnreadCountChange)
							{
								RL.cache().clearMessageFlagsFromCacheByFolder(oFolder.fullNameRaw);
							}

							if (oItem.Hash !== sHash || '' === sHash)
							{
								if (oFolder.fullNameRaw === RL.data().currentFolderFullNameRaw())
								{
									RL.reloadMessageList();
								}
							}
							else if (bUnreadCountChange)
							{
								if (oFolder.fullNameRaw === RL.data().currentFolderFullNameRaw())
								{
									aList = RL.data().messageList();
									if (Utils.isNonEmptyArray(aList))
									{
										RL.folderInformation(oFolder.fullNameRaw, aList);
									}
								}
							}
						}
					});

					if (bBoot)
					{
						RL.folderInformationMultiply(true);
					}
				}
			}
		}, aFolders);
	}
};

RainLoopApp.prototype.setMessageSeen = function (oMessage)
{
	if (oMessage.unseen())
	{
		oMessage.unseen(false);

		var oFolder = RL.cache().getFolderFromCacheList(oMessage.folderFullNameRaw);
		if (oFolder)
		{
			oFolder.messageCountUnread(0 <= oFolder.messageCountUnread() - 1 ?
				oFolder.messageCountUnread() - 1 : 0);
		}

		RL.cache().storeMessageFlagsToCache(oMessage);
		RL.reloadFlagsCurrentMessageListAndMessageFromCache();
	}

	RL.remote().messageSetSeen(Utils.emptyFunction, oMessage.folderFullNameRaw, [oMessage.uid], true);
};

RainLoopApp.prototype.googleConnect = function ()
{
	window.open(RL.link().socialGoogle(), 'Google', 'left=200,top=100,width=650,height=600,menubar=no,status=no,resizable=yes,scrollbars=yes');
};

RainLoopApp.prototype.twitterConnect = function ()
{
	window.open(RL.link().socialTwitter(), 'Twitter', 'left=200,top=100,width=650,height=350,menubar=no,status=no,resizable=yes,scrollbars=yes');
};

RainLoopApp.prototype.facebookConnect = function ()
{
	window.open(RL.link().socialFacebook(), 'Facebook', 'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
};

/**
 * @param {boolean=} bFireAllActions
 */
RainLoopApp.prototype.socialUsers = function (bFireAllActions)
{
	var oRainLoopData = RL.data();

	if (bFireAllActions)
	{
		oRainLoopData.googleActions(true);
		oRainLoopData.facebookActions(true);
		oRainLoopData.twitterActions(true);
	}

	RL.remote().socialUsers(function (sResult, oData) {

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			oRainLoopData.googleUserName(oData.Result['Google'] || '');
			oRainLoopData.facebookUserName(oData.Result['Facebook'] || '');
			oRainLoopData.twitterUserName(oData.Result['Twitter'] || '');
		}
		else
		{
			oRainLoopData.googleUserName('');
			oRainLoopData.facebookUserName('');
			oRainLoopData.twitterUserName('');
		}

		oRainLoopData.googleLoggined('' !== oRainLoopData.googleUserName());
		oRainLoopData.facebookLoggined('' !== oRainLoopData.facebookUserName());
		oRainLoopData.twitterLoggined('' !== oRainLoopData.twitterUserName());

		oRainLoopData.googleActions(false);
		oRainLoopData.facebookActions(false);
		oRainLoopData.twitterActions(false);
	});
};

RainLoopApp.prototype.googleDisconnect = function ()
{
	RL.data().googleActions(true);
	RL.remote().googleDisconnect(function () {
		RL.socialUsers();
	});
};

RainLoopApp.prototype.facebookDisconnect = function ()
{
	RL.data().facebookActions(true);
	RL.remote().facebookDisconnect(function () {
		RL.socialUsers();
	});
};

RainLoopApp.prototype.twitterDisconnect = function ()
{
	RL.data().twitterActions(true);
	RL.remote().twitterDisconnect(function () {
		RL.socialUsers();
	});
};

/**
 * @param {Array} aSystem
 * @param {Array} aList
 * @param {Array=} aDisabled
 * @param {Array=} aHeaderLines
 * @param {?number=} iUnDeep
 * @param {Function=} fDisableCallback
 * @param {Function=} fVisibleCallback
 * @param {Function=} fRenameCallback
 * @param {boolean=} bSystem
 * @param {boolean=} bBuildUnvisible
 * @return {Array}
 */
RainLoopApp.prototype.folderListOptionsBuilder = function (aSystem, aList, aDisabled, aHeaderLines, iUnDeep, fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible)
{
	var
		iIndex = 0,
		iLen = 0,
		/**
		 * @type {?FolderModel}
		 */
		oItem = null,
		sDeepPrefix = '\u00A0\u00A0\u00A0',
		aResult = []
	;

	bSystem = !Utils.isNormal(bSystem) ? 0 < aSystem.length : bSystem;
	bBuildUnvisible = Utils.isUnd(bBuildUnvisible) ? false : !!bBuildUnvisible;
	iUnDeep = !Utils.isNormal(iUnDeep) ? 0 : iUnDeep;
	fDisableCallback = Utils.isNormal(fDisableCallback) ? fDisableCallback : null;
	fVisibleCallback = Utils.isNormal(fVisibleCallback) ? fVisibleCallback : null;
	fRenameCallback = Utils.isNormal(fRenameCallback) ? fRenameCallback : null;

	if (!Utils.isArray(aDisabled))
	{
		aDisabled = [];
	}

	if (!Utils.isArray(aHeaderLines))
	{
		aHeaderLines = [];
	}

	for (iIndex = 0, iLen = aHeaderLines.length; iIndex < iLen; iIndex++)
	{
		aResult.push({
			'id': aHeaderLines[iIndex][0],
			'name': aHeaderLines[iIndex][1],
			'disabled': false
		});
	}

	for (iIndex = 0, iLen = aSystem.length; iIndex < iLen; iIndex++)
	{
		oItem = aSystem[iIndex];
		if (fVisibleCallback ? fVisibleCallback.call(null, oItem) : true)
		{
			aResult.push({
				'id': oItem.fullNameRaw,
				'system': true,
				'name': fRenameCallback ? fRenameCallback.call(null, oItem) : oItem.name(),
				'disabled': !oItem.selectable || -1 < Utils.inArray(oItem.fullNameRaw, aDisabled) ||
					(fDisableCallback ? fDisableCallback.call(null, oItem) : false)
			});
		}
	}

	for (iIndex = 0, iLen = aList.length; iIndex < iLen; iIndex++)
	{
		oItem = aList[iIndex];
		if (!oItem.isGmailFolder && (oItem.subScribed() || !oItem.existen))
		{
			if (fVisibleCallback ? fVisibleCallback.call(null, oItem) : true)
			{
				if (Enums.FolderType.User === oItem.type() || !bSystem || (!oItem.isNamespaceFolder && 0 < oItem.subFolders().length))
				{
					aResult.push({
						'id': oItem.fullNameRaw,
						'system': false,
						'name': (new window.Array(oItem.deep + 1 - iUnDeep)).join(sDeepPrefix) + 
							(fRenameCallback ? fRenameCallback.call(null, oItem) : oItem.name()),
						'disabled': !oItem.selectable || -1 < Utils.inArray(oItem.fullNameRaw, aDisabled) ||
							(Enums.FolderType.User !== oItem.type()) ||
							(fDisableCallback ? fDisableCallback.call(null, oItem) : false)
					});
				}
			}
		}
		
		if (oItem.subScribed() && 0 < oItem.subFolders().length)
		{
			aResult = aResult.concat(RL.folderListOptionsBuilder([], oItem.subFolders(), aDisabled, [],
				oItem.isUnpaddigFolder ? iUnDeep + 1 : iUnDeep,
				fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible));
		}
	}

	return aResult;
};

/**
 * @param {string} sQuery
 * @param {Function} fCallback
 */
RainLoopApp.prototype.getAutocomplete = function (sQuery, fCallback)
{
	var
		aData = []
	;

	RL.remote().suggestions(function (sResult, oData) {
		if (Enums.StorageResultType.Success === sResult && oData && Utils.isArray(oData.Result))
		{
			aData = _.map(oData.Result, function (aItem) {
				return aItem && aItem[0] ? new EmailModel(aItem[0], aItem[1]) : null;
			});

			fCallback(_.compact(aData));
		}
		else if (Enums.StorageResultType.Abort !== sResult)
		{
			fCallback([]);
		}
		
	}, sQuery);
};

RainLoopApp.prototype.emailsPicsHashes = function ()
{
	RL.remote().emailsPicsHashes(function (sResult, oData) {
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			RL.cache().setEmailsPicsHashesData(oData.Result);
		}
	});
};

/**
 * @param {string} sMailToUrl
 * @returns {boolean}
 */
RainLoopApp.prototype.mailToHelper = function (sMailToUrl)
{
	if (sMailToUrl && 'mailto:' === sMailToUrl.toString().toLowerCase().substr(0, 7))
	{
		var oEmailModel = null;
		oEmailModel = new EmailModel();
		oEmailModel.parse(window.decodeURI(sMailToUrl.toString().substr(7).replace(/\?.+$/, '')));

		if (oEmailModel && oEmailModel.email)
		{
			kn.showScreenPopup(PopupsComposeViewModel, [Enums.ComposeType.Empty, null, [oEmailModel]]);
			return true;
		}
	}

	return false;
};

RainLoopApp.prototype.bootstart = function ()
{
	RL.pub('rl.bootstart');
	AbstractApp.prototype.bootstart.call(this);

	RL.data().populateDataOnStart();

	var
		sCustomLoginLink = '',
		sJsHash = RL.settingsGet('JsHash'),
		bGoogle = RL.settingsGet('AllowGoogleSocial'),
		bFacebook = RL.settingsGet('AllowFacebookSocial'),
		bTwitter = RL.settingsGet('AllowTwitterSocial')
	;
	
	if (!RL.settingsGet('ChangePasswordIsAllowed'))
	{
		Utils.removeSettingsViewModel(SettingsChangePasswordScreen);
	}

	if (!RL.settingsGet('ContactsIsAllowed'))
	{
		Utils.removeSettingsViewModel(SettingsContacts);
	}

	if (!RL.settingsGet('AllowAdditionalAccounts'))
	{
		Utils.removeSettingsViewModel(SettingsAccounts);
	}
	
	if (RL.settingsGet('AllowIdentities'))
	{
		Utils.removeSettingsViewModel(SettingsIdentity);
	}
	else
	{
		Utils.removeSettingsViewModel(SettingsIdentities);
	}
	
	if (!RL.settingsGet('OpenPGP'))
	{
		Utils.removeSettingsViewModel(SettingsOpenPGP);
	}

	if (!RL.settingsGet('AllowTwoFactorAuth'))
	{
		Utils.removeSettingsViewModel(SettingsSecurity);
	}

	if (!bGoogle && !bFacebook && !bTwitter)
	{
		Utils.removeSettingsViewModel(SettingsSocialScreen);
	}
	
	if (!RL.settingsGet('AllowThemes'))
	{
		Utils.removeSettingsViewModel(SettingsThemes);
	}
	
	Utils.initOnStartOrLangChange(function () {

		$.extend(true, $.magnificPopup.defaults, {
			'tClose': Utils.i18n('MAGNIFIC_POPUP/CLOSE'),
			'tLoading': Utils.i18n('MAGNIFIC_POPUP/LOADING'),
			'gallery': {
				'tPrev': Utils.i18n('MAGNIFIC_POPUP/GALLERY_PREV'),
				'tNext': Utils.i18n('MAGNIFIC_POPUP/GALLERY_NEXT'),
				'tCounter': Utils.i18n('MAGNIFIC_POPUP/GALLERY_COUNTER')
			},
			'image': {
				'tError': Utils.i18n('MAGNIFIC_POPUP/IMAGE_ERROR')
			},
			'ajax': {
				'tError': Utils.i18n('MAGNIFIC_POPUP/AJAX_ERROR')
			}
		});

	}, this);

	if (window.SimplePace)
	{
		window.SimplePace.set(70);
		window.SimplePace.sleep();
	}

	if (!!RL.settingsGet('Auth'))
	{
		this.setTitle(Utils.i18n('TITLES/LOADING'));

		this.folders(_.bind(function (bValue) {

			kn.hideLoading();

			if (bValue)
			{
				if (window.crypto && window.crypto.getRandomValues && RL.settingsGet('OpenPGP'))
				{
					$.ajax({
						'url': RL.link().openPgpJs(),
						'dataType': 'script',
						'cache': true,
						'success': function () {
							if (window.openpgp)
							{
								RL.data().openpgpKeyring = new window.openpgp.Keyring(new OpenPgpLocalStorageDriver());
								RL.data().allowOpenPGP(true);
								
								RL.pub('openpgp.init');
								
								RL.reloadOpenPgpKeys();
							}
						}
					});
				}
				else
				{
					RL.data().allowOpenPGP(false);
				}

				kn.startScreens([MailBoxScreen, SettingsScreen]);
				
				if (bGoogle || bFacebook || bTwitter)
				{
					RL.socialUsers(true);
				}

				RL.sub('interval.2m', function () {
					RL.folderInformation('INBOX');
				});
				
				RL.sub('interval.2m', function () {
					var sF = RL.data().currentFolderFullNameRaw();
					if ('INBOX' !== sF)
					{
						RL.folderInformation(sF);
					}
				});

				RL.sub('interval.3m', function () {
					RL.folderInformationMultiply();
				});

				RL.sub('interval.5m', function () {
					RL.quota();
				});

				RL.sub('interval.10m', function () {
					RL.folders();
				});

				_.delay(function () {
					RL.folderInformationMultiply(true);
				}, 500);

				_.delay(function () {

					RL.emailsPicsHashes();

					RL.remote().servicesPics(function (sResult, oData) {
						if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
						{
							RL.cache().setServicesData(oData.Result);
						}
					});

				}, 2000);

				Plugins.runHook('rl-start-user-screens');
				RL.pub('rl.bootstart-user-screens');

				if (!!RL.settingsGet('AccountSignMe') && window.navigator.registerProtocolHandler)
				{
					_.delay(function () {
						try {
							window.navigator.registerProtocolHandler('mailto',
								window.location.protocol + '//' + window.location.host + window.location.pathname + '?mailto&to=%s',
								'' + (RL.settingsGet('Title') || 'RainLoop'));
						} catch(e) {}

						if (RL.settingsGet('MailToEmail'))
						{
							RL.mailToHelper(RL.settingsGet('MailToEmail'));
						}
					}, 500);
				}
			}
			else
			{
				kn.startScreens([LoginScreen]);

				Plugins.runHook('rl-start-login-screens');
				RL.pub('rl.bootstart-login-screens');
			}

			if (window.SimplePace)
			{
				window.SimplePace.set(100);
			}

			if (!Globals.bMobileDevice)
			{
				_.defer(function () {
					Utils.initLayoutResizer('#rl-left', '#rl-right', Enums.ClientSideKeyName.FolderListSize);
				});
			}
			
		}, this));
	}
	else
	{
		sCustomLoginLink = Utils.pString(RL.settingsGet('CustomLoginLink'));
		if (!sCustomLoginLink)
		{
			kn.hideLoading();
			kn.startScreens([LoginScreen]);

			Plugins.runHook('rl-start-login-screens');
			RL.pub('rl.bootstart-login-screens');

			if (window.SimplePace)
			{
				window.SimplePace.set(100);
			}
		}
		else
		{
			kn.routeOff();
			kn.setHash(RL.link().root(), true);
			kn.routeOff();

			_.defer(function () {
				window.location.href = sCustomLoginLink;
			});
		}
	}

	if (bGoogle)
	{
		window['rl_' + sJsHash + '_google_service'] = function () {
			RL.data().googleActions(true);
			RL.socialUsers();
		};
	}

	if (bFacebook)
	{
		window['rl_' + sJsHash + '_facebook_service'] = function () {
			RL.data().facebookActions(true);
			RL.socialUsers();
		};
	}

	if (bTwitter)
	{
		window['rl_' + sJsHash + '_twitter_service'] = function () {
			RL.data().twitterActions(true);
			RL.socialUsers();
		};
	}

	RL.sub('interval.1m', function () {
		Globals.momentTrigger(!Globals.momentTrigger());
	});

	Plugins.runHook('rl-start-screens');
	RL.pub('rl.bootstart-end');
};

/**
 * @type {RainLoopApp}
 */
RL = new RainLoopApp();

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

}(window, jQuery, ko, crossroads, hasher, moment, Jua, _, ifvisible, key));