/*! RainLoop Webmail Admin Module (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
(function (window, $, ko, crossroads, hasher, _) {
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		Globals = {},
		window = require('../External/window.js'),
		ko = require('../External/ko.js'),
		$html = require('../External/$html.js')
	;

	/**
	 * @type {?}
	 */
	Globals.now = (new window.Date()).getTime();

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
	Globals.tooltipTrigger = ko.observable(false).extend({'rateLimit': 0});

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
	Globals.sUserAgent = (window.navigator.userAgent || '').toLowerCase();

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
	 * @type {boolean}
	 */
	Globals.bXMLHttpRequestSupported = !!window.XMLHttpRequest;

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
		'removeDialogTabs': 'link:advanced;link:target;image:advanced;images:advanced',

		'extraPlugins': 'plain',

		'allowedContent': true,
		'autoParagraph': false,

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

	if (Globals.bAllowPdfPreview && window.navigator && window.navigator.mimeTypes)
	{
		Globals.bAllowPdfPreview = !!_.find(window.navigator.mimeTypes, function (oType) {
			return oType && 'application/pdf' === oType.type;
		});
	}

	Globals.oI18N = {},
	
	Globals.oNotificationI18N = {},
	
	Globals.aBootstrapDropdowns = [],
	
	Globals.aViewModels = {
		'settings': [],
		'settings-removed': [],
		'settings-disabled': []
	};
	
	module.exports = Globals;

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var Enums = {};

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
	Enums.Capa = {
		'Prem': 'PREM',
		'TwoFactor': 'TWO_FACTOR',
		'OpenPGP': 'OPEN_PGP',
		'Prefetch': 'PREFETCH',
		'Gravatar': 'GRAVATAR',
		'Themes': 'THEMES',
		'Filters': 'FILTERS',
		'AdditionalAccounts': 'ADDITIONAL_ACCOUNTS',
		'AdditionalIdentities': 'ADDITIONAL_IDENTITIES'
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
		'NotSpam': 80,
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
	 * @enum {string}
	 */
	Enums.FilterConditionField = {
		'From': 'From',
		'To': 'To',
		'Recipient': 'Recipient',
		'Subject': 'Subject'
	};

	/**
	 * @enum {string}
	 */
	Enums.FilterConditionType = {
		'Contains': 'Contains',
		'NotContains': 'NotContains',
		'EqualTo': 'EqualTo',
		'NotEqualTo': 'NotEqualTo'
	};

	/**
	 * @enum {string}
	 */
	Enums.FiltersAction = {
		'None': 'None',
		'Move': 'Move',
		'Discard': 'Discard',
		'Forward': 'Forward',
	};

	/**
	 * @enum {string}
	 */
	Enums.FilterRulesType = {
		'And': 'And',
		'Or': 'Or'
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

		'Email': 30,
		'Phone': 31,
		'Web': 32,

		'Birthday': 40,

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

		'CouldNotSaveNewPassword': 130,
		'CurrentPasswordIncorrect': 131,
		'NewPasswordShort': 132,
		'NewPasswordWeak': 133,
		'NewPasswordForbidden': 134,

		'ContactsSyncError': 140,

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
		'InvalidInputArgument': 903,
		'UnknownNotification': 999,
		'UnknownError': 999
	};

	module.exports = Enums;

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {
	
	'use strict';

	var
		Utils = {},
		
		$ = require('../External/jquery.js'),
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),
		key = require('../External/key.js'),
		window = require('../External/window.js'),
		$window = require('../External/$window.js'),
		$doc = require('../External/$doc.js'),
		NotificationClass = require('../External/NotificationClass.js'),

		LocalStorage = require('../Storages/LocalStorage.js'),

		kn = require('../Knoin/Knoin.js'),

		Enums = require('./Enums.js'),
		Globals = require('./Globals.js')
	;

	window.console.log('---');
	window.console.log(_);

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
	 * @param {number=} iDefault = 0
	 * @return {number}
	 */
	Utils.pInt = function (iValue, iDefault)
	{
		var iResult = Utils.isNormal(iValue) && '' !== iValue ? window.parseInt(iValue, 10) : (iDefault || 0);
		return window.isNaN(iResult) ? (iDefault || 0) : iResult;
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
	 * @param {string} sQueryString
	 * @return {Object}
	 */
	Utils.simpleQueryParser = function (sQueryString)
	{
		var
			oParams = {},
			aQueries = [],
			aTemp = [],
			iIndex = 0,
			iLen = 0
		;

		aQueries = sQueryString.split('&');
		for (iIndex = 0, iLen = aQueries.length; iIndex < iLen; iIndex++)
		{
			aTemp = aQueries[iIndex].split('=');
			oParams[window.decodeURIComponent(aTemp[0])] = window.decodeURIComponent(aTemp[1]);
		}

		return oParams;
	};

	/**
	 * @param {string} aValue
	 * @param {string} sKey
	 * @param {string} sLongKey
	 * @return {string|boolean}
	 */
	Utils.rsaEncode = function (sValue, sHash, sKey, sLongKey)
	{
		if (window.crypto && window.crypto.getRandomValues && window.RSAKey && sHash && sKey && sLongKey)
		{
			var oRsa = new window.RSAKey();
			oRsa.setPublic(sLongKey, sKey);

			sValue = oRsa.encrypt(Utils.fakeMd5() + ':' + sValue + ':' + Utils.fakeMd5());
			if (false !== sValue)
			{
				return 'rsa:' + sHash + ':' + sValue;
			}
		}

		return false;
	};

	Utils.rsaEncode.supported = !!(window.crypto && window.crypto.getRandomValues && window.RSAKey);

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
		return oObject && window.Object && window.Object.hasOwnProperty ? window.Object.hasOwnProperty.call(oObject, sProp) : false;
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
			sResult = Utils.isUnd(Globals.oI18N[sKey]) ? (Utils.isUnd(sDefaulValue) ? sKey : sDefaulValue) : Globals.oI18N[sKey]
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

	Utils.i18nReload = function ()
	{
		if (window['rainloopI18N'])
		{
			Globals.oI18N = window['rainloopI18N'] || {};
			
			Utils.i18nToNode($doc);
			
			Globals.langChangeTrigger(!Globals.langChangeTrigger());
		}

		window['rainloopI18N'] = null;
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
		if (document.activeElement)
		{
			if (Utils.isUnd(document.activeElement.__inFocusCache))
			{
				document.activeElement.__inFocusCache = $(document.activeElement).is('input,textarea,iframe,.cke_editable');
			}

			return !!document.activeElement.__inFocusCache;
		}

		return false;
	};

	Utils.removeInFocus = function ()
	{
		if (document && document.activeElement && document.activeElement.blur)
		{
			var oA = $(document.activeElement);
			if (oA.is('input,textarea'))
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
	 * @return {string}
	 */
	Utils.replySubjectAdd = function (sPrefix, sSubject)
	{
		sPrefix = Utils.trim(sPrefix.toUpperCase());
		sSubject = Utils.trim(sSubject.replace(/[\s]+/, ' '));

		var
			iIndex = 0,
			sResult = '',
			bDrop = false,
			sTrimmedPart = '',
			aSubject = [],
			aParts = [],
			bRe = 'RE' === sPrefix,
			bFwd = 'FWD' === sPrefix,
			bPrefixIsRe = !bFwd
		;

		if ('' !== sSubject)
		{
			bDrop = false;

			aParts = sSubject.split(':');
			for (iIndex = 0; iIndex < aParts.length; iIndex++)
			{
				sTrimmedPart = Utils.trim(aParts[iIndex]);
				if (!bDrop &&
						(/^(RE|FWD)$/i.test(sTrimmedPart) || /^(RE|FWD)[\[\(][\d]+[\]\)]$/i.test(sTrimmedPart))
					)
				{
					if (!bRe)
					{
						bRe = !!(/^RE/i.test(sTrimmedPart));
					}

					if (!bFwd)
					{
						bFwd = !!(/^FWD/i.test(sTrimmedPart));
					}
				}
				else
				{
					aSubject.push(aParts[iIndex]);
					bDrop = true;
				}
			}

			if (0 < aSubject.length)
			{
				sResult = Utils.trim(aSubject.join(':'));
			}
		}

		if (bPrefixIsRe)
		{
			bRe = false;
		}
		else
		{
			bFwd = false;
		}

		return Utils.trim(
			(bPrefixIsRe ? 'Re: ' : 'Fwd: ') +
			(bRe ? 'Re: ' : '') +
			(bFwd ? 'Fwd: ' : '') +
			sResult
		);
	};


	/**
	 * @param {string} sSubject
	 * @return {string}
	 */
	Utils.fixLongSubject = function (sSubject)
	{
		var
			iLimit = 30,
			mReg = /^Re([\[\(]([\d]+)[\]\)]|):[\s]{0,3}Re([\[\(]([\d]+)[\]\)]|):/ig,
			oMatch = null
		;

		sSubject = Utils.trim(sSubject.replace(/[\s]+/, ' '));

		do
		{
			iLimit--;

			oMatch = mReg.exec(sSubject);
			if (!oMatch || Utils.isUnd(oMatch[0]))
			{
				oMatch = null;
			}

			if (oMatch)
			{
				sSubject = sSubject.replace(mReg, 'Re:');
			}
		}
		while (oMatch || 0 < iLimit);

		return sSubject.replace(/[\s]+/, ' ');
	};

	/**
	 * @deprecated
	 * @param {string} sPrefix
	 * @param {string} sSubject
	 * @param {boolean=} bFixLongSubject = true
	 * @return {string}
	 */
	Utils._replySubjectAdd_ = function (sPrefix, sSubject, bFixLongSubject)
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
	 * @deprecated
	 * @param {string} sSubject
	 * @return {string}
	 */
	Utils._fixLongSubject_ = function (sSubject)
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
		return window.Math.round(iNum * window.Math.pow(10, iDec)) / window.Math.pow(10, iDec);
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

		return Utils.isUnd(Globals.oNotificationI18N[iCode]) ? '' : Globals.oNotificationI18N[iCode];
	};

	Utils.initNotificationLanguage = function ()
	{
		var oN = Globals.oNotificationI18N || {};
		oN[Enums.Notification.InvalidToken] = Utils.i18n('NOTIFICATIONS/INVALID_TOKEN');
		oN[Enums.Notification.AuthError] = Utils.i18n('NOTIFICATIONS/AUTH_ERROR');
		oN[Enums.Notification.AccessError] = Utils.i18n('NOTIFICATIONS/ACCESS_ERROR');
		oN[Enums.Notification.ConnectionError] = Utils.i18n('NOTIFICATIONS/CONNECTION_ERROR');
		oN[Enums.Notification.CaptchaError] = Utils.i18n('NOTIFICATIONS/CAPTCHA_ERROR');
		oN[Enums.Notification.SocialFacebookLoginAccessDisable] = Utils.i18n('NOTIFICATIONS/SOCIAL_FACEBOOK_LOGIN_ACCESS_DISABLE');
		oN[Enums.Notification.SocialTwitterLoginAccessDisable] = Utils.i18n('NOTIFICATIONS/SOCIAL_TWITTER_LOGIN_ACCESS_DISABLE');
		oN[Enums.Notification.SocialGoogleLoginAccessDisable] = Utils.i18n('NOTIFICATIONS/SOCIAL_GOOGLE_LOGIN_ACCESS_DISABLE');
		oN[Enums.Notification.DomainNotAllowed] = Utils.i18n('NOTIFICATIONS/DOMAIN_NOT_ALLOWED');
		oN[Enums.Notification.AccountNotAllowed] = Utils.i18n('NOTIFICATIONS/ACCOUNT_NOT_ALLOWED');

		oN[Enums.Notification.AccountTwoFactorAuthRequired] = Utils.i18n('NOTIFICATIONS/ACCOUNT_TWO_FACTOR_AUTH_REQUIRED');
		oN[Enums.Notification.AccountTwoFactorAuthError] = Utils.i18n('NOTIFICATIONS/ACCOUNT_TWO_FACTOR_AUTH_ERROR');

		oN[Enums.Notification.CouldNotSaveNewPassword] = Utils.i18n('NOTIFICATIONS/COULD_NOT_SAVE_NEW_PASSWORD');
		oN[Enums.Notification.CurrentPasswordIncorrect] = Utils.i18n('NOTIFICATIONS/CURRENT_PASSWORD_INCORRECT');
		oN[Enums.Notification.NewPasswordShort] = Utils.i18n('NOTIFICATIONS/NEW_PASSWORD_SHORT');
		oN[Enums.Notification.NewPasswordWeak] = Utils.i18n('NOTIFICATIONS/NEW_PASSWORD_WEAK');
		oN[Enums.Notification.NewPasswordForbidden] = Utils.i18n('NOTIFICATIONS/NEW_PASSWORD_FORBIDDENT');

		oN[Enums.Notification.ContactsSyncError] = Utils.i18n('NOTIFICATIONS/CONTACTS_SYNC_ERROR');

		oN[Enums.Notification.CantGetMessageList] = Utils.i18n('NOTIFICATIONS/CANT_GET_MESSAGE_LIST');
		oN[Enums.Notification.CantGetMessage] = Utils.i18n('NOTIFICATIONS/CANT_GET_MESSAGE');
		oN[Enums.Notification.CantDeleteMessage] = Utils.i18n('NOTIFICATIONS/CANT_DELETE_MESSAGE');
		oN[Enums.Notification.CantMoveMessage] = Utils.i18n('NOTIFICATIONS/CANT_MOVE_MESSAGE');
		oN[Enums.Notification.CantCopyMessage] = Utils.i18n('NOTIFICATIONS/CANT_MOVE_MESSAGE');

		oN[Enums.Notification.CantSaveMessage] = Utils.i18n('NOTIFICATIONS/CANT_SAVE_MESSAGE');
		oN[Enums.Notification.CantSendMessage] = Utils.i18n('NOTIFICATIONS/CANT_SEND_MESSAGE');
		oN[Enums.Notification.InvalidRecipients] = Utils.i18n('NOTIFICATIONS/INVALID_RECIPIENTS');

		oN[Enums.Notification.CantCreateFolder] = Utils.i18n('NOTIFICATIONS/CANT_CREATE_FOLDER');
		oN[Enums.Notification.CantRenameFolder] = Utils.i18n('NOTIFICATIONS/CANT_RENAME_FOLDER');
		oN[Enums.Notification.CantDeleteFolder] = Utils.i18n('NOTIFICATIONS/CANT_DELETE_FOLDER');
		oN[Enums.Notification.CantDeleteNonEmptyFolder] = Utils.i18n('NOTIFICATIONS/CANT_DELETE_NON_EMPTY_FOLDER');
		oN[Enums.Notification.CantSubscribeFolder] = Utils.i18n('NOTIFICATIONS/CANT_SUBSCRIBE_FOLDER');
		oN[Enums.Notification.CantUnsubscribeFolder] = Utils.i18n('NOTIFICATIONS/CANT_UNSUBSCRIBE_FOLDER');

		oN[Enums.Notification.CantSaveSettings] = Utils.i18n('NOTIFICATIONS/CANT_SAVE_SETTINGS');
		oN[Enums.Notification.CantSavePluginSettings] = Utils.i18n('NOTIFICATIONS/CANT_SAVE_PLUGIN_SETTINGS');

		oN[Enums.Notification.DomainAlreadyExists] = Utils.i18n('NOTIFICATIONS/DOMAIN_ALREADY_EXISTS');

		oN[Enums.Notification.CantInstallPackage] = Utils.i18n('NOTIFICATIONS/CANT_INSTALL_PACKAGE');
		oN[Enums.Notification.CantDeletePackage] = Utils.i18n('NOTIFICATIONS/CANT_DELETE_PACKAGE');
		oN[Enums.Notification.InvalidPluginPackage] = Utils.i18n('NOTIFICATIONS/INVALID_PLUGIN_PACKAGE');
		oN[Enums.Notification.UnsupportedPluginPackage] = Utils.i18n('NOTIFICATIONS/UNSUPPORTED_PLUGIN_PACKAGE');

		oN[Enums.Notification.LicensingServerIsUnavailable] = Utils.i18n('NOTIFICATIONS/LICENSING_SERVER_IS_UNAVAILABLE');
		oN[Enums.Notification.LicensingExpired] = Utils.i18n('NOTIFICATIONS/LICENSING_EXPIRED');
		oN[Enums.Notification.LicensingBanned] = Utils.i18n('NOTIFICATIONS/LICENSING_BANNED');

		oN[Enums.Notification.DemoSendMessageError] = Utils.i18n('NOTIFICATIONS/DEMO_SEND_MESSAGE_ERROR');

		oN[Enums.Notification.AccountAlreadyExists] = Utils.i18n('NOTIFICATIONS/ACCOUNT_ALREADY_EXISTS');

		oN[Enums.Notification.MailServerError] = Utils.i18n('NOTIFICATIONS/MAIL_SERVER_ERROR');
		oN[Enums.Notification.InvalidInputArgument] = Utils.i18n('NOTIFICATIONS/INVALID_INPUT_ARGUMENT');
		oN[Enums.Notification.UnknownNotification] = Utils.i18n('NOTIFICATIONS/UNKNOWN_ERROR');
		oN[Enums.Notification.UnknownError] = Utils.i18n('NOTIFICATIONS/UNKNOWN_ERROR');
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

		oData.capaThemes = ko.observable(false);
		oData.allowLanguagesOnSettings = ko.observable(true);
		oData.allowLanguagesOnLogin = ko.observable(true);

		oData.useLocalProxyForExternalImages = ko.observable(false);

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

		oData.capaAdditionalAccounts = ko.observable(false);
		oData.capaAdditionalIdentities = ko.observable(false);
		oData.capaGravatar = ko.observable(false);
		oData.determineUserLanguage = ko.observable(false);
		oData.determineUserDomain = ko.observable(false);

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

		oData.facebookSupported = ko.observable(false);
		oData.facebookEnable = ko.observable(false);
		oData.facebookAppID = ko.observable('');
		oData.facebookAppSecret = ko.observable('');

		oData.twitterEnable = ko.observable(false);
		oData.twitterConsumerKey = ko.observable('');
		oData.twitterConsumerSecret = ko.observable('');

		oData.googleEnable = ko.observable(false);
		oData.googleClientID = ko.observable('');
		oData.googleClientSecret = ko.observable('');
		oData.googleApiKey = ko.observable('');

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
			var oMoment = this.moment();
			return 1970 === oMoment.year() ? '' : oMoment.fromNow();
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

			if (1970 === oMoment.year())
			{
				sResult = '';
			}
			else if (4 >= oMomentNow.diff(oMoment, 'hours'))
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
		var aExpandedList = /** @type {Array|null} */ LocalStorage.get(Enums.ClientSideKeyName.ExpandedFolders);
		return _.isArray(aExpandedList) && -1 !== _.indexOf(aExpandedList, sFullNameHash);
	};

	/**
	 * @param {string} sFullNameHash
	 * @param {boolean} bExpanded
	 */
	Utils.setExpandedFolder = function (sFullNameHash, bExpanded)
	{
		var aExpandedList = /** @type {Array|null} */ LocalStorage.get(Enums.ClientSideKeyName.ExpandedFolders);
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

		LocalStorage.set(Enums.ClientSideKeyName.ExpandedFolders, aExpandedList);
	};

	Utils.initLayoutResizer = function (sLeft, sRight, sClientSideKeyName)
	{
		var
			iDisabledWidth = 60,
			iMinWidth = 155,
			oLeft = $(sLeft),
			oRight = $(sRight),

			mLeftWidth = LocalStorage.get(sClientSideKeyName) || null,

			fSetWidth = function (iWidth) {
				if (iWidth)
				{
					oLeft.css({
						'width': '' + iWidth + 'px'
					});

					oRight.css({
						'left': '' + iWidth + 'px'
					});
				}
			},

			fDisable = function (bDisable) {
				if (bDisable)
				{
					oLeft.resizable('disable');
					fSetWidth(iDisabledWidth);
				}
				else
				{
					oLeft.resizable('enable');
					var iWidth = Utils.pInt(LocalStorage.get(sClientSideKeyName)) || iMinWidth;
					fSetWidth(iWidth > iMinWidth ? iWidth : iMinWidth);
				}
			},

			fResizeFunction = function (oEvent, oObject) {
				if (oObject && oObject.size && oObject.size.width)
				{
					LocalStorage.set(sClientSideKeyName, oObject.size.width);

					oRight.css({
						'left': '' + oObject.size.width + 'px'
					});
				}
			}
		;

		if (null !== mLeftWidth)
		{
			fSetWidth(mLeftWidth > iMinWidth ? mLeftWidth : iMinWidth);
		}

		oLeft.resizable({
			'helper': 'ui-resizable-helper',
			'minWidth': iMinWidth,
			'maxWidth': 350,
			'handles': 'e',
			'stop': fResizeFunction
		});

		RL.sub('left-panel.off', function () {
			fDisable(true);
		});

		RL.sub('left-panel.on', function () {
			fDisable(false);
		});
	};

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

	Utils.convertThemeName = function (sTheme)
	{
		if ('@custom' === sTheme.substr(-7))
		{
			sTheme = Utils.trim(sTheme.substring(0, sTheme.length - 7));
		}

		return Utils.trim(sTheme.replace(/[^a-zA-Z]+/g, ' ').replace(/([A-Z])/g, ' $1').replace(/[\s]+/g, ' '));
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
			sResult += sLine.substr(window.Math.round(window.Math.random() * sLine.length), 1);
		}

		return sResult;
	};

	/* jshint ignore:start */

	/**
	 * @param {string} s
	 * @return {string}
	 */
	Utils.md5 = function(s){function L(k,d){return(k<<d)|(k>>>(32-d))}function K(G,k){var I,d,F,H,x;F=(G&2147483648);H=(k&2147483648);I=(G&1073741824);d=(k&1073741824);x=(G&1073741823)+(k&1073741823);if(I&d){return(x^2147483648^F^H)}if(I|d){if(x&1073741824){return(x^3221225472^F^H)}else{return(x^1073741824^F^H)}}else{return(x^F^H)}}function r(d,F,k){return(d&F)|((~d)&k)}function q(d,F,k){return(d&k)|(F&(~k))}function p(d,F,k){return(d^F^k)}function n(d,F,k){return(F^(d|(~k)))}function u(G,F,aa,Z,k,H,I){G=K(G,K(K(r(F,aa,Z),k),I));return K(L(G,H),F)}function f(G,F,aa,Z,k,H,I){G=K(G,K(K(q(F,aa,Z),k),I));return K(L(G,H),F)}function D(G,F,aa,Z,k,H,I){G=K(G,K(K(p(F,aa,Z),k),I));return K(L(G,H),F)}function t(G,F,aa,Z,k,H,I){G=K(G,K(K(n(F,aa,Z),k),I));return K(L(G,H),F)}function e(G){var Z;var F=G.length;var x=F+8;var k=(x-(x%64))/64;var I=(k+1)*16;var aa=Array(I-1);var d=0;var H=0;while(H<F){Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=(aa[Z]|(G.charCodeAt(H)<<d));H++}Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=aa[Z]|(128<<d);aa[I-2]=F<<3;aa[I-1]=F>>>29;return aa}function B(x){var k="",F="",G,d;for(d=0;d<=3;d++){G=(x>>>(d*8))&255;F="0"+G.toString(16);k=k+F.substr(F.length-2,2)}return k}function J(k){k=k.replace(/rn/g,"n");var d="";for(var F=0;F<k.length;F++){var x=k.charCodeAt(F);if(x<128){d+=String.fromCharCode(x)}else{if((x>127)&&(x<2048)){d+=String.fromCharCode((x>>6)|192);d+=String.fromCharCode((x&63)|128)}else{d+=String.fromCharCode((x>>12)|224);d+=String.fromCharCode(((x>>6)&63)|128);d+=String.fromCharCode((x&63)|128)}}}return d}var C=Array();var P,h,E,v,g,Y,X,W,V;var S=7,Q=12,N=17,M=22;var A=5,z=9,y=14,w=20;var o=4,m=11,l=16,j=23;var U=6,T=10,R=15,O=21;s=J(s);C=e(s);Y=1732584193;X=4023233417;W=2562383102;V=271733878;for(P=0;P<C.length;P+=16){h=Y;E=X;v=W;g=V;Y=u(Y,X,W,V,C[P+0],S,3614090360);V=u(V,Y,X,W,C[P+1],Q,3905402710);W=u(W,V,Y,X,C[P+2],N,606105819);X=u(X,W,V,Y,C[P+3],M,3250441966);Y=u(Y,X,W,V,C[P+4],S,4118548399);V=u(V,Y,X,W,C[P+5],Q,1200080426);W=u(W,V,Y,X,C[P+6],N,2821735955);X=u(X,W,V,Y,C[P+7],M,4249261313);Y=u(Y,X,W,V,C[P+8],S,1770035416);V=u(V,Y,X,W,C[P+9],Q,2336552879);W=u(W,V,Y,X,C[P+10],N,4294925233);X=u(X,W,V,Y,C[P+11],M,2304563134);Y=u(Y,X,W,V,C[P+12],S,1804603682);V=u(V,Y,X,W,C[P+13],Q,4254626195);W=u(W,V,Y,X,C[P+14],N,2792965006);X=u(X,W,V,Y,C[P+15],M,1236535329);Y=f(Y,X,W,V,C[P+1],A,4129170786);V=f(V,Y,X,W,C[P+6],z,3225465664);W=f(W,V,Y,X,C[P+11],y,643717713);X=f(X,W,V,Y,C[P+0],w,3921069994);Y=f(Y,X,W,V,C[P+5],A,3593408605);V=f(V,Y,X,W,C[P+10],z,38016083);W=f(W,V,Y,X,C[P+15],y,3634488961);X=f(X,W,V,Y,C[P+4],w,3889429448);Y=f(Y,X,W,V,C[P+9],A,568446438);V=f(V,Y,X,W,C[P+14],z,3275163606);W=f(W,V,Y,X,C[P+3],y,4107603335);X=f(X,W,V,Y,C[P+8],w,1163531501);Y=f(Y,X,W,V,C[P+13],A,2850285829);V=f(V,Y,X,W,C[P+2],z,4243563512);W=f(W,V,Y,X,C[P+7],y,1735328473);X=f(X,W,V,Y,C[P+12],w,2368359562);Y=D(Y,X,W,V,C[P+5],o,4294588738);V=D(V,Y,X,W,C[P+8],m,2272392833);W=D(W,V,Y,X,C[P+11],l,1839030562);X=D(X,W,V,Y,C[P+14],j,4259657740);Y=D(Y,X,W,V,C[P+1],o,2763975236);V=D(V,Y,X,W,C[P+4],m,1272893353);W=D(W,V,Y,X,C[P+7],l,4139469664);X=D(X,W,V,Y,C[P+10],j,3200236656);Y=D(Y,X,W,V,C[P+13],o,681279174);V=D(V,Y,X,W,C[P+0],m,3936430074);W=D(W,V,Y,X,C[P+3],l,3572445317);X=D(X,W,V,Y,C[P+6],j,76029189);Y=D(Y,X,W,V,C[P+9],o,3654602809);V=D(V,Y,X,W,C[P+12],m,3873151461);W=D(W,V,Y,X,C[P+15],l,530742520);X=D(X,W,V,Y,C[P+2],j,3299628645);Y=t(Y,X,W,V,C[P+0],U,4096336452);V=t(V,Y,X,W,C[P+7],T,1126891415);W=t(W,V,Y,X,C[P+14],R,2878612391);X=t(X,W,V,Y,C[P+5],O,4237533241);Y=t(Y,X,W,V,C[P+12],U,1700485571);V=t(V,Y,X,W,C[P+3],T,2399980690);W=t(W,V,Y,X,C[P+10],R,4293915773);X=t(X,W,V,Y,C[P+1],O,2240044497);Y=t(Y,X,W,V,C[P+8],U,1873313359);V=t(V,Y,X,W,C[P+15],T,4264355552);W=t(W,V,Y,X,C[P+6],R,2734768916);X=t(X,W,V,Y,C[P+13],O,1309151649);Y=t(Y,X,W,V,C[P+4],U,4149444226);V=t(V,Y,X,W,C[P+11],T,3174756917);W=t(W,V,Y,X,C[P+2],R,718787259);X=t(X,W,V,Y,C[P+9],O,3951481745);Y=K(Y,h);X=K(X,E);W=K(W,v);V=K(V,g)}var i=B(Y)+B(X)+B(W)+B(V);return i.toLowerCase()};
	/* jshint ignore:end */

	Utils.convertPlainTextToHtml = function (sPlain)
	{
		return sPlain.toString()
			.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;')
			.replace(/\r/g, '').replace(/\n/g, '<br />');
	};

	Utils.draggeblePlace = function ()
	{
		return $('<div class="draggablePlace"><span class="text"></span>&nbsp;<i class="icon-copy icon-white visible-on-ctrl"></i><i class="icon-mail icon-white hidden-on-ctrl"></i></div>').appendTo('#rl-hidden');
	};

	Utils.defautOptionsAfterRender = function (oOption, oItem)
	{
		if (oItem && !Utils.isUnd(oItem.disabled) && oOption)
		{
			$(oOption)
				.toggleClass('disabled', oItem.disabled)
				.prop('disabled', oItem.disabled)
			;
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

				kn.applyExternal(oViewModel, $('#rl-content', oBody)[0]);

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

	Utils.$div = $('<div></div>');

	/**
	 * @param {string} sHtml
	 * @return {string}
	 */
	Utils.htmlToPlain = function (sHtml)
	{
		var
			iPos = 0,
			iP1 = 0,
			iP2 = 0,
			iP3 = 0,
			iLimit = 0,

			sText = '',

			splitPlainText = function (sText)
			{
				var
					iLen = 100,
					sPrefix = '',
					sSubText = '',
					sResult = sText,
					iSpacePos = 0,
					iNewLinePos = 0
				;

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
			},

			convertBlockquote = function (sText) {
				sText = splitPlainText($.trim(sText));
				sText = '> ' + sText.replace(/\n/gm, '\n> ');
				return sText.replace(/(^|\n)([> ]+)/gm, function () {
					return (arguments && 2 < arguments.length) ? arguments[1] + $.trim(arguments[2].replace(/[\s]/, '')) + ' ' : '';
				});
			},

			convertDivs = function () {
				if (arguments && 1 < arguments.length)
				{
					var sText = $.trim(arguments[1]);
					if (0 < sText.length)
					{
						sText = sText.replace(/<div[^>]*>([\s\S\r\n]*)<\/div>/gmi, convertDivs);
						sText = '\n' + $.trim(sText) + '\n';
					}

					return sText;
				}

				return '';
			},

			convertPre = function () {
				return (arguments && 1 < arguments.length) ? arguments[1].toString().replace(/[\n]/gm, '<br />') : '';
			},

			fixAttibuteValue = function () {
				return (arguments && 1 < arguments.length) ?
					'' + arguments[1] + arguments[2].replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
			},

			convertLinks = function () {
				return (arguments && 1 < arguments.length) ? $.trim(arguments[1]) : '';
			}
		;

		sText = sHtml
			.replace(/<pre[^>]*>([\s\S\r\n]*)<\/pre>/gmi, convertPre)
			.replace(/[\s]+/gm, ' ')
			.replace(/((?:href|data)\s?=\s?)("[^"]+?"|'[^']+?')/gmi, fixAttibuteValue)
			.replace(/<br[^>]*>/gmi, '\n')
			.replace(/<\/h[\d]>/gi, '\n')
			.replace(/<\/p>/gi, '\n\n')
			.replace(/<\/li>/gi, '\n')
			.replace(/<\/td>/gi, '\n')
			.replace(/<\/tr>/gi, '\n')
			.replace(/<hr[^>]*>/gmi, '\n_______________________________\n\n')
			.replace(/<div[^>]*>([\s\S\r\n]*)<\/div>/gmi, convertDivs)
			.replace(/<blockquote[^>]*>/gmi, '\n__bq__start__\n')
			.replace(/<\/blockquote>/gmi, '\n__bq__end__\n')
			.replace(/<a [^>]*>([\s\S\r\n]*?)<\/a>/gmi, convertLinks)
			.replace(/<\/div>/gi, '\n')
			.replace(/&nbsp;/gi, ' ')
			.replace(/&quot;/gi, '"')
			.replace(/<[^>]*>/gm, '')
		;

		sText = Utils.$div.html(sText).text();

		sText = sText
			.replace(/\n[ \t]+/gm, '\n')
			.replace(/[\n]{3,}/gm, '\n\n')
			.replace(/&gt;/gi, '>')
			.replace(/&lt;/gi, '<')
			.replace(/&amp;/gi, '&')
		;

		iPos = 0;
		iLimit = 100;

		while (0 < iLimit)
		{
			iLimit--;
			iP1 = sText.indexOf('__bq__start__', iPos);
			if (-1 < iP1)
			{
				iP2 = sText.indexOf('__bq__start__', iP1 + 5);
				iP3 = sText.indexOf('__bq__end__', iP1 + 5);

				if ((-1 === iP2 || iP3 < iP2) && iP1 < iP3)
				{
					sText = sText.substring(0, iP1) +
						convertBlockquote(sText.substring(iP1 + 13, iP3)) +
						sText.substring(iP3 + 11);

					iPos = 0;
				}
				else if (-1 < iP2 && iP2 < iP3)
				{
					iPos = iP2 - 1;
				}
				else
				{
					iPos = 0;
				}
			}
			else
			{
				break;
			}
		}

		sText = sText
			.replace(/__bq__start__/gm, '')
			.replace(/__bq__end__/gm, '')
		;

		return sText;
	};

	/**
	 * @param {string} sPlain
	 * @param {boolean} bLinkify = false
	 * @return {string}
	 */
	Utils.plainToHtml = function (sPlain, bLinkify)
	{
		sPlain = sPlain.toString().replace(/\r/g, '');

		var
			bIn = false,
			bDo = true,
			bStart = true,
			aNextText = [],
			sLine = '',
			iIndex = 0,
			aText = sPlain.split("\n")
		;

		do
		{
			bDo = false;
			aNextText = [];
			for (iIndex = 0; iIndex < aText.length; iIndex++)
			{
				sLine = aText[iIndex];
				bStart = '>' === sLine.substr(0, 1);
				if (bStart && !bIn)
				{
					bDo = true;
					bIn = true;
					aNextText.push('~~~blockquote~~~');
					aNextText.push(sLine.substr(1));
				}
				else if (!bStart && bIn)
				{
					bIn = false;
					aNextText.push('~~~/blockquote~~~');
					aNextText.push(sLine);
				}
				else if (bStart && bIn)
				{
					aNextText.push(sLine.substr(1));
				}
				else
				{
					aNextText.push(sLine);
				}
			}

			if (bIn)
			{
				bIn = false;
				aNextText.push('~~~/blockquote~~~');
			}

			aText = aNextText;
		}
		while (bDo);

		sPlain = aText.join("\n");

		sPlain = sPlain
			.replace(/&/g, '&amp;')
			.replace(/>/g, '&gt;').replace(/</g, '&lt;')
			.replace(/~~~blockquote~~~[\s]*/g, '<blockquote>')
			.replace(/[\s]*~~~\/blockquote~~~/g, '</blockquote>')
			.replace(/[\-_~]{10,}/g, '<hr />')
			.replace(/\n/g, '<br />');

		return bLinkify ? Utils.linkify(sPlain) : sPlain;
	};

	window.rainloop_Utils_htmlToPlain = Utils.htmlToPlain;
	window.rainloop_Utils_plainToHtml = Utils.plainToHtml;

	/**
	 * @param {string} sHtml
	 * @return {string}
	 */
	Utils.linkify = function (sHtml)
	{
		if ($.fn && $.fn.linkify)
		{
			sHtml = Utils.$div.html(sHtml.replace(/&amp;/ig, 'amp_amp_12345_amp_amp'))
				.linkify()
				.find('.linkified').removeClass('linkified').end()
				.html()
				.replace(/amp_amp_12345_amp_amp/g, '&amp;')
			;
		}

		return sHtml;
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
					fAdd(window.Math.round((iPrev - 1) / 2), false, '...');
				}

				if (iPageCount - 2 === iNext)
				{
					fAdd(iPageCount - 1, true);
				}
				else if (iPageCount - 2 > iNext)
				{
					fAdd(window.Math.round((iPageCount + iNext) / 2), true, '...');
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
			var range = window.document.createRange();
			range.selectNodeContents(element);
			sel.addRange(range);
		}
		else if (window.document.selection)
		{
			var textRange = window.document.body.createTextRange();
			textRange.moveToElementText(element);
			textRange.select();
		}
		/* jshint onevar: true */
	};

	Utils.disableKeyFilter = function (Data)
	{
		if (window.key)
		{
			key.filter = function () {
				return Data.useKeyboardShortcuts();
			};
		}
	};

	Utils.restoreKeyFilter = function (Data)
	{
		if (window.key)
		{
			key.filter = function (event) {

				if (Data.useKeyboardShortcuts())
				{
					var
						oElement = event.target || event.srcElement,
						sTagName = oElement ? oElement.tagName : ''
					;

					sTagName = sTagName.toUpperCase();
					return !(sTagName === 'INPUT' || sTagName === 'SELECT' || sTagName === 'TEXTAREA' ||
						(oElement && sTagName === 'DIV' && 'editorHtmlArea' === oElement.className && oElement.contentEditable)
					);
				}

				return false;
			};
		}
	};

	Utils.detectDropdownVisibility = _.debounce(function () {
		Globals.dropdownVisibility(!!_.find(Globals.aBootstrapDropdowns, function (oItem) {
			return oItem.hasClass('open');
		}));
	}, 50);

	Utils.triggerAutocompleteInputChange = function (bDelay) {

		var fFunc = function () {
			$('.checkAutocomplete').trigger('change');
		};

		if (bDelay)
		{
			_.delay(fFunc, 100);
		}
		else
		{
			fFunc();
		}
	};

	module.exports = Utils;

}(module));
// Base64 encode / decode
// http://www.webtoolkit.info/

(function (module) {

	'use strict';

	/*jslint bitwise: true*/
	var Base64 = {

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

	module.exports = Base64;
	/*jslint bitwise: false*/

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../External/window.js'),
		Utils = require('./Utils.js')
	;
	
	/**
	 * @constructor
	 */
	function LinkBuilder()
	{
		this.sBase = '#/';
		this.sServer = './?';
		this.sVersion = RL.settingsGet('Version');
		this.sSpecSuffix = RL.settingsGet('AuthAccountHash') || '0';
		this.sStaticPrefix = RL.settingsGet('StaticPrefix') || 'rainloop/v/' + this.sVersion + '/static/';
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
	 * @param {string} sEmail
	 * @return {string}
	 */
	LinkBuilder.prototype.avatarLink = function (sEmail)
	{
		return this.sServer + '/Raw/0/Avatar/' + window.encodeURIComponent(sEmail) + '/';
	//	return '//secure.gravatar.com/avatar/' + Utils.md5(sEmail.toLowerCase()) + '.jpg?s=80&d=mm';
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
	 * @return {string}
	 */
	LinkBuilder.prototype.exportContactsVcf = function ()
	{
		return this.sServer + '/Raw/' + this.sSpecSuffix + '/ContactsVcf/';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.exportContactsCsv = function ()
	{
		return this.sServer + '/Raw/' + this.sSpecSuffix + '/ContactsCsv/';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.emptyContactPic = function ()
	{
		return this.sStaticPrefix + 'css/images/empty-contact.png';
	};

	/**
	 * @param {string} sFileName
	 * @return {string}
	 */
	LinkBuilder.prototype.sound = function (sFileName)
	{
		return  this.sStaticPrefix + 'sounds/' + sFileName;
	};

	/**
	 * @param {string} sTheme
	 * @return {string}
	 */
	LinkBuilder.prototype.themePreviewLink = function (sTheme)
	{
		var sPrefix = 'rainloop/v/' + this.sVersion + '/';
		if ('@custom' === sTheme.substr(-7))
		{
			sTheme = Utils.trim(sTheme.substring(0, sTheme.length - 7));
			sPrefix  = '';
		}

		return sPrefix + 'themes/' + encodeURI(sTheme) + '/images/preview.png';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.notificationMailIcon = function ()
	{
		return  this.sStaticPrefix + 'css/images/icom-message-notification.png';
	};

	/**
	 * @return {string}
	 */
	LinkBuilder.prototype.openPgpJs = function ()
	{
		return  this.sStaticPrefix + 'js/openpgp.min.js';
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

	module.exports = new LinkBuilder();

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		Plugins = {
			__boot: null,
			__remote: null,
			__data: null
		},
		_ = require('../External/underscore.js'),
		Utils = require('./Utils.js')
	;

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
		if (Plugins.__boot)
		{
			return Plugins.__boot.settingsGet(sName);
		}

		return null;
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
		if (Plugins.__remote)
		{
			Plugins.__remote.defaultRequest(fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions);
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

	module.exports = Plugins;

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		$ = require('../../External/jquery.js'),
		JSON = require('../../External/JSON.js'),
		Consts = require('../../Common/Consts.js'),
		Utils = require('../../Common/Utils.js')
	;

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

	module.exports = CookieDriver;

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../../External/window.js'),
		JSON = require('../../External/JSON.js'),
		Consts = require('../../Common/Consts.js'),
		Utils = require('../../Common/Utils.js')
	;

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
	
	module.exports = LocalStorageDriver;

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),
		CookieDriver = require('./LocalStorages/CookieDriver.js'),
		LocalStorageDriver = require('./LocalStorages/LocalStorageDriver.js')
	;

	/**
	 * @constructor
	 */
	function LocalStorage()
	{
		var
			NextStorageDriver = _.find([LocalStorageDriver, CookieDriver], function (NextStorageDriver) {
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

	module.exports = new LocalStorage();

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../External/window.js'),
		$ = require('../External/jquery.js'),
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),
		hasher = require('../External/hasher.js'),
		crossroads = require('../External/crossroads.js'),
		$window = require('../External/$window.js'),
		$html = require('../External/$html.js'),
		
		Globals = require('../Common/Globals.js'),
		Plugins = require('../Common/Plugins.js'),
		Utils = require('../Common/Utils.js'),

		RL = require('../RL.js'),

		KnoinAbstractViewModel = require('../Knoin/KnoinAbstractViewModel.js')
	;

	/**
	 * @constructor
	 */
	function Knoin()
	{
		this.sDefaultScreenName = '';
		this.oScreens = {};
		this.oBoot = null;
		this.oRemote = null;
		this.oData = null;
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
	Knoin.prototype.oRemote = null;
	Knoin.prototype.oData = null;
	Knoin.prototype.oCurrentScreen = null;

	Knoin.prototype.hideLoading = function ()
	{
		$('#rl-loading').hide();
	};

	Knoin.prototype.rl = function ()
	{
		return this.oBoot;
	};

	Knoin.prototype.remote = function ()
	{
		return this.oRemote;
	};

	Knoin.prototype.data = function ()
	{
		return this.oData;
	};

	/**
	 * @param {Object} thisObject
	 */
	Knoin.prototype.constructorEnd = function (thisObject)
	{
		if (Utils.isFunc(thisObject['__constructor_end']))
		{
			thisObject['__constructor_end'].call(thisObject);
		}
	};

	/**
	 * @param {string} sName
	 * @param {Function} ViewModelClass
	 * @param {Function=} AbstractViewModel = KnoinAbstractViewModel
	 */
	Knoin.prototype.extendAsViewModel = function (sName, ViewModelClass, AbstractViewModel)
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
	Knoin.prototype.addSettingsViewModel = function (SettingsViewModelClass, sTemplate, sLabelName, sRoute, bDefault)
	{
		SettingsViewModelClass.__rlSettingsData = {
			'Label':  sLabelName,
			'Template':  sTemplate,
			'Route':  sRoute,
			'IsDefault':  !!bDefault
		};

		Globals.aViewModels['settings'].push(SettingsViewModelClass);
	};

	/**
	 * @param {Function} SettingsViewModelClass
	 */
	Knoin.prototype.removeSettingsViewModel = function (SettingsViewModelClass)
	{
		Globals.aViewModels['settings-removed'].push(SettingsViewModelClass);
	};

	/**
	 * @param {Function} SettingsViewModelClass
	 */
	Knoin.prototype.disableSettingsViewModel = function (SettingsViewModelClass)
	{
		Globals.aViewModels['settings-disabled'].push(SettingsViewModelClass);
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
				kn = this,
				oViewModel = new ViewModelClass(oScreen),
				sPosition = oViewModel.viewModelPosition(),
				oViewModelPlace = $('#rl-content #rl-' + sPosition.toLowerCase()),
				oViewModelDom = null
			;

			ViewModelClass.__builded = true;
			ViewModelClass.__vm = oViewModel;

			oViewModel.viewModelName = ViewModelClass.__name;

			if (oViewModelPlace && 1 === oViewModelPlace.length)
			{
				oViewModelDom = $('<div></div>').addClass('rl-view-model').addClass('RL-' + oViewModel.viewModelTemplate()).hide();
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
							this.storeAndSetKeyScope(kn.data());

							RL.popupVisibilityNames.push(this.viewModelName); // TODO cjs
							oViewModel.viewModelDom.css('z-index', 3000 + RL.popupVisibilityNames().length + 10); // TODO cjs

							Utils.delegateRun(this, 'onFocus', [], 500);
						}
						else
						{
							Utils.delegateRun(this, 'onHide');
							this.restoreKeyScope(kn.data());

							RL.popupVisibilityNames.remove(this.viewModelName); // TODO cjs
							oViewModel.viewModelDom.css('z-index', 2000);

							Globals.tooltipTrigger(!Globals.tooltipTrigger());

							_.delay(function () {
								self.viewModelDom.hide();
							}, 300);
						}

					}, oViewModel);
				}

				Plugins.runHook('view-model-pre-build', [ViewModelClass.__name, oViewModel, oViewModelDom]); // TODO cjs

				ko.applyBindingAccessorsToNode(oViewModelDom[0], {
					'i18nInit': true,
					'template': function () { return {'name': oViewModel.viewModelTemplate()};}
				}, oViewModel);

				Utils.delegateRun(oViewModel, 'onBuild', [oViewModelDom]);
				if (oViewModel && 'Popups' === sPosition)
				{
					oViewModel.registerPopupKeyDown();
				}

				Plugins.runHook('view-model-post-build', [ViewModelClass.__name, oViewModel, oViewModelDom]); // TODO cjs
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
			Plugins.runHook('view-model-on-hide', [ViewModelClassToHide.__name, ViewModelClassToHide.__vm]); // TODO cjs
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
				Plugins.runHook('view-model-on-show', [ViewModelClassToShow.__name, ViewModelClassToShow.__vm, aParameters || []]); // TODO cjs
			}
		}
	};

	/**
	 * @param {Function} ViewModelClassToShow
	 * @return {boolean}
	 */
	Knoin.prototype.isPopupVisible = function (ViewModelClassToShow)
	{
		return ViewModelClassToShow && ViewModelClassToShow.__vm ? ViewModelClassToShow.__vm.modalVisibility() : false;
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

						Plugins.runHook('screen-on-show', [self.oCurrentScreen.screenName(), self.oCurrentScreen]); // TODO cjs

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

									Plugins.runHook('view-model-on-show', [ViewModelClass.__name, ViewModelClass.__vm]); // TODO cjs
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

				Plugins.runHook('screen-pre-start', [oScreen.screenName(), oScreen]); // TODO cjs
				Utils.delegateRun(oScreen, 'onStart');
				Plugins.runHook('screen-post-start', [oScreen.screenName(), oScreen]); // TODO cjs
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
	Knoin.prototype.bootstart = function (RL, Remote, Data)
	{
		this.oBoot = RL;
		this.oData = Data;
		this.oRemote = Remote;
		
		Plugins.__boot = this.oBoot;
		Plugins.__data = this.oData;
		Plugins.__remote = this.oRemote;

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
		window['rl']['addSettingsViewModel'] = _.bind(this.addSettingsViewModel, this);
		window['rl']['createCommand'] = Utils.createCommand;

		window['rl']['EmailModel'] = require('../Models/EmailModel.js');
		window['rl']['Enums'] = require('../Common/Enums.js');

		window['__RLBOOT'] = function (fCall) {

			// boot
			$(function () {

				if (window['rainloopTEMPLATES'] && window['rainloopTEMPLATES'][0])
				{
					$('#rl-templates').html(window['rainloopTEMPLATES'][0]);

					_.delay(function () {
						
						RL.bootstart();
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
	};

	module.exports = new Knoin();

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js')
	;

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

	module.exports = EmailModel;

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../External/ko.js'),
		Utils = require('../Common/Utils.js')
	;

	/**
	 * @constructor
	 */
	function ContactTagModel()
	{
		this.idContactTag = 0;
		this.name = ko.observable('');
		this.readOnly = false;
	}

	ContactTagModel.prototype.parse = function (oItem)
	{
		var bResult = false;
		if (oItem && 'Object/Tag' === oItem['@Object'])
		{
			this.idContact = Utils.pInt(oItem['IdContactTag']);
			this.name(Utils.pString(oItem['Name']));
			this.readOnly = !!oItem['ReadOnly'];

			bResult = true;
		}

		return bResult;
	};

	/**
	 * @param {string} sSearch
	 * @return {boolean}
	 */
	ContactTagModel.prototype.filterHelper = function (sSearch)
	{
		return this.name().toLowerCase().indexOf(sSearch.toLowerCase()) !== -1;
	};

	/**
	 * @param {boolean=} bEncodeHtml = false
	 * @return {string}
	 */
	ContactTagModel.prototype.toLine = function (bEncodeHtml)
	{
		return (Utils.isUnd(bEncodeHtml) ? false : !!bEncodeHtml) ?
			Utils.encodeHtml(this.name()) : this.name();
	};

	module.exports = ContactTagModel;

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../../External/underscore.js'),
		ko = require('../../External/ko.js'),
		
		Enums = require('../../Common/Enums.js'),
		Consts = require('../../Common/Consts.js'),
		Utils = require('../../Common/Utils.js'),

		Remote = require('../../Storages/AdminAjaxRemoteStorage.js'),

		kn = require('../../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../../Knoin/KnoinAbstractViewModel.js')
	;

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
		this.testingImapErrorDesc = ko.observable('');
		this.testingSmtpErrorDesc = ko.observable('');

		this.testingImapError.subscribe(function (bValue) {
			if (!bValue)
			{
				this.testingImapErrorDesc('');
			}
		}, this);

		this.testingSmtpError.subscribe(function (bValue) {
			if (!bValue)
			{
				this.testingSmtpErrorDesc('');
			}
		}, this);

		this.testingImapErrorDesc = ko.observable('');
		this.testingSmtpErrorDesc = ko.observable('');

		this.imapServerFocus = ko.observable(false);
		this.smtpServerFocus = ko.observable(false);

		this.name = ko.observable('');
		this.name.focused = ko.observable(false);

		this.imapServer = ko.observable('');
		this.imapPort = ko.observable('' + Consts.Values.ImapDefaulPort);
		this.imapSecure = ko.observable(Enums.ServerSecure.None);
		this.imapShortLogin = ko.observable(false);
		this.smtpServer = ko.observable('');
		this.smtpPort = ko.observable('' + Consts.Values.SmtpDefaulPort);
		this.smtpSecure = ko.observable(Enums.ServerSecure.None);
		this.smtpShortLogin = ko.observable(false);
		this.smtpAuth = ko.observable(true);
		this.whiteList = ko.observable('');

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
			Remote.createOrUpdateDomain(
				_.bind(this.onDomainCreateOrSaveResponse, this),
				!this.edit(),
				this.name(),
				this.imapServer(),
				Utils.pInt(this.imapPort()),
				this.imapSecure(),
				this.imapShortLogin(),
				this.smtpServer(),
				Utils.pInt(this.smtpPort()),
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
			Remote.testConnectionForDomain(
				_.bind(this.onTestConnectionResponse, this),
				this.name(),
				this.imapServer(),
				Utils.pInt(this.imapPort()),
				this.imapSecure(),
				this.smtpServer(),
				Utils.pInt(this.smtpPort()),
				this.smtpSecure(),
				this.smtpAuth()
			);
		}, this.canBeTested);

		this.whiteListCommand = Utils.createCommand(this, function () {
			this.whiteListPage(!this.whiteListPage());
		});

		// smart form improvements
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

		this.imapSecure.subscribe(function (sValue) {
			var iPort = Utils.pInt(this.imapPort());
			sValue = Utils.pString(sValue);
			switch (sValue)
			{
				case '0':
					if (993 === iPort)
					{
						this.imapPort('143');
					}
					break;
				case '1':
					if (143 === iPort)
					{
						this.imapPort('993');
					}
					break;
			}
		}, this);

		this.smtpSecure.subscribe(function (sValue) {
			var iPort = Utils.pInt(this.smtpPort());
			sValue = Utils.pString(sValue);
			switch (sValue)
			{
				case '0':
					if (465 === iPort || 587 === iPort)
					{
						this.smtpPort('25');
					}
					break;
				case '1':
					if (25 === iPort || 587 === iPort)
					{
						this.smtpPort('465');
					}
					break;
				case '2':
					if (25 === iPort || 465 === iPort)
					{
						this.smtpPort('587');
					}
					break;
			}
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsDomainViewModel', PopupsDomainViewModel);

	PopupsDomainViewModel.prototype.onTestConnectionResponse = function (sResult, oData)
	{
		this.testing(false);
		if (Enums.StorageResultType.Success === sResult && oData.Result)
		{
			this.testingDone(true);
			this.testingImapError(true !== oData.Result.Imap);
			this.testingSmtpError(true !== oData.Result.Smtp);

			if (this.testingImapError() && oData.Result.Imap)
			{
				this.testingImapErrorDesc(oData.Result.Imap);
			}

			if (this.testingSmtpError() && oData.Result.Smtp)
			{
				this.testingSmtpErrorDesc(oData.Result.Smtp);
			}
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
			this.imapPort('' + Utils.pInt(oDomain.IncPort));
			this.imapSecure(Utils.trim(oDomain.IncSecure));
			this.imapShortLogin(!!oDomain.IncShortLogin);
			this.smtpServer(Utils.trim(oDomain.OutHost));
			this.smtpPort('' + Utils.pInt(oDomain.OutPort));
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
		this.imapPort('' + Consts.Values.ImapDefaulPort);
		this.imapSecure(Enums.ServerSecure.None);
		this.imapShortLogin(false);
		this.smtpServer('');
		this.smtpPort('' + Consts.Values.SmtpDefaulPort);
		this.smtpSecure(Enums.ServerSecure.None);
		this.smtpShortLogin(false);
		this.smtpAuth(true);
		this.whiteList('');
	};

	module.exports = new PopupsDomainViewModel();

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../../External/underscore.js'),
		ko = require('../../External/ko.js'),
		key = require('../../External/key.js'),
		
		Enums = require('../../Common/Enums.js'),
		Utils = require('../../Common/Utils.js'),

		Remote = require('../../Storages/AdminAjaxRemoteStorage.js'),

		kn = require('../../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../../Knoin/KnoinAbstractViewModel.js')
	;

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
			Remote.pluginSettingsUpdate(this.onPluginSettingsUpdateResponse, oList);

		}, this.hasConfiguration);

		this.bDisabeCloseOnEsc = true;
		this.sDefaultKeyScope = Enums.KeyState.All;

		this.tryToClosePopup = _.debounce(_.bind(this.tryToClosePopup, this), 200);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsPluginViewModel', PopupsPluginViewModel);

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
		if (!kn.isPopupVisible(PopupsAskViewModel))
		{
			kn.showScreenPopup(PopupsAskViewModel, [Utils.i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'), function () {
				if (self.modalVisibility())
				{
					Utils.delegateRun(self, 'cancelCommand');
				}
			}]);
		}
	};

	PopupsPluginViewModel.prototype.onBuild = function ()
	{
		key('esc', Enums.KeyState.All, _.bind(function () {
			if (this.modalVisibility())
			{
				this.tryToClosePopup();
			}
			return false;
		}, this));
	};

	module.exports = new PopupsPluginViewModel();

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../../External/ko.js'),
		Enums = require('../../Common/Enums.js'),
		Utils = require('../../Common/Utils.js'),

		Data = require('../../Storages/AdminDataStorage.js'),
		Remote = require('../../Storages/AdminAjaxRemoteStorage.js'),
		
		kn = require('../../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../../Knoin/KnoinAbstractViewModel.js')
	;

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

		this.licenseTrigger = Data.licenseTrigger;

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
				Remote.licensingActivate(function (sResult, oData) {

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

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsActivateViewModel', PopupsActivateViewModel);

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
	
	module.exports = new PopupsActivateViewModel();

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../../External/underscore.js'),
		ko = require('../../External/ko.js'),
		
		Utils = require('../../Common/Utils.js'),

		Data = require('../../Storages/WebMailDataStorage.js'),

		kn = require('../../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../../Knoin/KnoinAbstractViewModel.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsLanguagesViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsLanguages');

		this.exp = ko.observable(false);

		this.languages = ko.computed(function () {
			return _.map(Data.languages(), function (sLanguage) {
				return {
					'key': sLanguage,
					'selected': ko.observable(false),
					'fullName': Utils.convertLangName(sLanguage)
				};
			});
		});

		Data.mainLanguage.subscribe(function () {
			this.resetMainLanguage();
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsLanguagesViewModel', PopupsLanguagesViewModel);

	PopupsLanguagesViewModel.prototype.languageEnName = function (sLanguage)
	{
		return Utils.convertLangName(sLanguage, true);
	};

	PopupsLanguagesViewModel.prototype.resetMainLanguage = function ()
	{
		var sCurrent = Data.mainLanguage();
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
		Data.mainLanguage(sLang);
		this.cancelCommand();
	};

	module.exports = new PopupsLanguagesViewModel();

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../../External/ko.js'),
		key = require('../../External/key.js'),
		Enums = require('../../Common/Enums.js'),
		Utils = require('../../Common/Utils.js'),
		kn = require('../../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../../Knoin/KnoinAbstractViewModel.js')
	;

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

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsAskViewModel', PopupsAskViewModel);

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

		key('esc', Enums.KeyState.PopupAsk, _.bind(function () {
			this.noClick();
			return false;
		}, this));
	};

	module.exports = new PopupsAskViewModel();

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),
		
		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js'),

		Remote = require('../Storages/AdminAjaxRemoteStorage.js'),
		
		kn = require('../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../Knoin/KnoinAbstractViewModel.js')
	;

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

			Utils.triggerAutocompleteInputChange();

			this.loginError('' === Utils.trim(this.login()));
			this.passwordError('' === Utils.trim(this.password()));

			if (this.loginError() || this.passwordError())
			{
				return false;
			}

			this.submitRequest(true);

			Remote.adminLogin(_.bind(function (sResult, oData) {

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

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('AdminLoginViewModel', AdminLoginViewModel);

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

	AdminLoginViewModel.prototype.onBuild = function ()
	{
		Utils.triggerAutocompleteInputChange(true);
	};

	AdminLoginViewModel.prototype.submitForm = function ()
	{
		this.submitCommand();
	};

	module.exports = new AdminLoginViewModel();

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		kn = require('../Knoin/Knoin.js'),
		Data = require('../Storages/AdminDataStorage.js'),
		KnoinAbstractViewModel = require('../Knoin/KnoinAbstractViewModel.js')
	;
	
	/**
	 * @param {?} oScreen
	 *
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AdminMenuViewModel(oScreen)
	{
		KnoinAbstractViewModel.call(this, 'Left', 'AdminMenu');

		this.leftPanelDisabled = Data.leftPanelDisabled;

		this.menu = oScreen.menu;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('AdminMenuViewModel', AdminMenuViewModel);

	AdminMenuViewModel.prototype.link = function (sRoute)
	{
		return '#/' + sRoute;
	};

	module.exports = new AdminMenuViewModel();

}(module));

/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../External/ko.js'),

		Data = require('../Storages/AdminDataStorage.js'),
		Remote = require('../Storages/AdminAjaxRemoteStorage.js'),
		
		RL = require('../RL.js'),

		kn = require('../Knoin/Knoin.js'),
		KnoinAbstractViewModel = require('../Knoin/KnoinAbstractViewModel.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function AdminPaneViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Right', 'AdminPane');

		this.adminDomain = ko.observable(RL().settingsGet('AdminDomain'));
		this.version = ko.observable(RL().settingsGet('Version'));

		this.adminManLoadingVisibility = Data.adminManLoadingVisibility;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('AdminPaneViewModel', AdminPaneViewModel);

	AdminPaneViewModel.prototype.logoutClick = function ()
	{
		Remote.adminLogout(function () {
			RL().loginAndLogoutReload();
		});
	};

	module.exports = new AdminPaneViewModel();

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../External/ko.js'),
		key = require('../External/key.js'),

		Enums = require('../Common/Enums.js'),
		Globals = require('../Common/Globals.js'),
		Utils = require('../Common/Utils.js'),

		RL = require('../RL.js')
	;
	
	/**
	 * @constructor
	 */
	function AbstractData()
	{
		var self = this;
		
		this.leftPanelDisabled = ko.observable(false);
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
						Utils.disableKeyFilter(self);
					}
					else
					{
						Utils.restoreKeyFilter(self);
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

		this.leftPanelDisabled.subscribe(function (bValue) {
			RL().pub('left-panel.' + (bValue ? 'off' : 'on'));
		});

		Globals.dropdownVisibility.subscribe(function (bValue) {
			if (bValue)
			{
				Globals.tooltipTrigger(!Globals.tooltipTrigger());
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
			mLayout = Utils.pInt(RL().settingsGet('Layout')), // TODO cjs
			aLanguages = RL().settingsGet('Languages'),
			aThemes = RL().settingsGet('Themes')
		;

		if (Utils.isArray(aLanguages))
		{
			this.languages(aLanguages);
		}

		if (Utils.isArray(aThemes))
		{
			this.themes(aThemes);
		}

		this.mainLanguage(RL().settingsGet('Language'));
		this.mainTheme(RL().settingsGet('Theme'));

		this.capaAdditionalAccounts(RL().capa(Enums.Capa.AdditionalAccounts));
		this.capaAdditionalIdentities(RL().capa(Enums.Capa.AdditionalIdentities));
		this.capaGravatar(RL().capa(Enums.Capa.Gravatar));
		this.determineUserLanguage(!!RL().settingsGet('DetermineUserLanguage'));
		this.determineUserDomain(!!RL().settingsGet('DetermineUserDomain'));

		this.capaThemes(RL().capa(Enums.Capa.Themes));
		this.allowLanguagesOnLogin(!!RL().settingsGet('AllowLanguagesOnLogin'));
		this.allowLanguagesOnSettings(!!RL().settingsGet('AllowLanguagesOnSettings'));
		this.useLocalProxyForExternalImages(!!RL().settingsGet('UseLocalProxyForExternalImages'));

		this.editorDefaultType(RL().settingsGet('EditorDefaultType'));
		this.showImages(!!RL().settingsGet('ShowImages'));
		this.contactsAutosave(!!RL().settingsGet('ContactsAutosave'));
		this.interfaceAnimation(RL().settingsGet('InterfaceAnimation'));

		this.mainMessagesPerPage(RL().settingsGet('MPP'));

		this.desktopNotifications(!!RL().settingsGet('DesktopNotifications'));
		this.useThreads(!!RL().settingsGet('UseThreads'));
		this.replySameFolder(!!RL().settingsGet('ReplySameFolder'));
		this.useCheckboxesInList(!!RL().settingsGet('UseCheckboxesInList'));

		this.layout(Enums.Layout.SidePreview);
		if (-1 < Utils.inArray(mLayout, [Enums.Layout.NoPreview, Enums.Layout.SidePreview, Enums.Layout.BottomPreview]))
		{
			this.layout(mLayout);
		}
		this.facebookSupported(!!RL().settingsGet('SupportedFacebookSocial'));
		this.facebookEnable(!!RL().settingsGet('AllowFacebookSocial'));
		this.facebookAppID(RL().settingsGet('FacebookAppID'));
		this.facebookAppSecret(RL().settingsGet('FacebookAppSecret'));

		this.twitterEnable(!!RL().settingsGet('AllowTwitterSocial'));
		this.twitterConsumerKey(RL().settingsGet('TwitterConsumerKey'));
		this.twitterConsumerSecret(RL().settingsGet('TwitterConsumerSecret'));

		this.googleEnable(!!RL().settingsGet('AllowGoogleSocial'));
		this.googleClientID(RL().settingsGet('GoogleClientID'));
		this.googleClientSecret(RL().settingsGet('GoogleClientSecret'));
		this.googleApiKey(RL().settingsGet('GoogleApiKey'));

		this.dropboxEnable(!!RL().settingsGet('AllowDropboxSocial'));
		this.dropboxApiKey(RL().settingsGet('DropboxApiKey'));

		this.contactsIsAllowed(!!RL().settingsGet('ContactsIsAllowed'));
	};

	module.exports = AbstractData;

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		$ = require('../External/jquery.js'),
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),
		
		Globals = require('../Common/Globals.js'),
		Utils = require('../Common/Utils.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		kn = require('../Knoin/Knoin.js'),
		KnoinAbstractScreen = require('../Knoin/KnoinAbstractScreen.js')
	;

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

		RoutedSettingsViewModel = _.find(Globals.aViewModels['settings'], function (SettingsViewModel) {
			return SettingsViewModel && SettingsViewModel.__rlSettingsData &&
				sSubName === SettingsViewModel.__rlSettingsData.Route;
		});

		if (RoutedSettingsViewModel)
		{
			if (_.find(Globals.aViewModels['settings-removed'], function (DisabledSettingsViewModel) {
				return DisabledSettingsViewModel && DisabledSettingsViewModel === RoutedSettingsViewModel;
			}))
			{
				RoutedSettingsViewModel = null;
			}

			if (RoutedSettingsViewModel && _.find(Globals.aViewModels['settings-disabled'], function (DisabledSettingsViewModel) {
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

					oViewModelDom = $('<div></div>').addClass('rl-settings-view-model').hide();
					oViewModelDom.appendTo(oViewModelPlace);

					oSettingsScreen.viewModelDom = oViewModelDom;

					oSettingsScreen.__rlSettingsData = RoutedSettingsViewModel.__rlSettingsData;

					RoutedSettingsViewModel.__dom = oViewModelDom;
					RoutedSettingsViewModel.__builded = true;
					RoutedSettingsViewModel.__vm = oSettingsScreen;

					ko.applyBindingAccessorsToNode(oViewModelDom[0], {
						'i18nInit': true,
						'template': function () { return {'name': RoutedSettingsViewModel.__rlSettingsData.Template}; }
					}, oSettingsScreen);

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
			kn.setHash(LinkBuilder.settings(), false, true); // TODO cjs
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
		_.each(Globals.aViewModels['settings'], function (SettingsViewModel) {
			if (SettingsViewModel && SettingsViewModel.__rlSettingsData &&
				!_.find(Globals.aViewModels['settings-removed'], function (RemoveSettingsViewModel) {
					return RemoveSettingsViewModel && RemoveSettingsViewModel === SettingsViewModel;
				}))
			{
				this.menu.push({
					'route': SettingsViewModel.__rlSettingsData.Route,
					'label': SettingsViewModel.__rlSettingsData.Label,
					'selected': ko.observable(false),
					'disabled': !!_.find(Globals.aViewModels['settings-disabled'], function (DisabledSettingsViewModel) {
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
			DefaultViewModel = _.find(Globals.aViewModels['settings'], function (SettingsViewModel) {
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

	module.exports = AbstractSettings;

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),
		KnoinAbstractScreen = require('../Knoin/KnoinAbstractScreen.js'),
		AdminLoginViewModel = require('../ViewModels/AdminLoginViewModel.js')
	;
	
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
		RL.setTitle(''); // TODO cjs
	};

	module.exports = AdminLoginScreen;

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		_ = require('../External/underscore.js'),
		AbstractSettings = require('./AbstractSettings.js'),
		AdminMenuViewModel = require('../ViewModels/AdminMenuViewModel.js'),
		AdminPaneViewModel = require('../ViewModels/AdminPaneViewModel.js')
	;

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
		RL.setTitle(''); // TODO cjs
	};

	module.exports = AdminSettingsScreen;

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		$ = require('../External/jquery.js'),
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),
		window = require('../External/window.js'),
		$html = require('../External/$html.js'),
		$window = require('../External/$window.js'),
		$doc = require('../External/$doc.js'),
		AppData = require('../External/AppData.js'),

		Globals = require('../Common/Globals.js'),
		Utils = require('../Common/Utils.js'),
		Plugins = require('../Common/Plugins.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		kn = require('../Knoin/Knoin.js'),
		KnoinAbstractBoot = require('../Knoin/KnoinAbstractBoot.js')
	;

	/**
	 * @param {*} Remote
	 * @constructor
	 * @extends KnoinAbstractBoot
	 */
	function AbstractApp(Remote)
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
			if (oEvent && oEvent.originalEvent && oEvent.originalEvent.message &&
				-1 === Utils.inArray(oEvent.originalEvent.message, [
					'Script error.', 'Uncaught Error: Error calling method on NPObject.'
				]))
			{
				Remote.jsError(
					Utils.emptyFunction,
					oEvent.originalEvent.message,
					oEvent.originalEvent.filename,
					oEvent.originalEvent.lineno,
					window.location && window.location.toString ? window.location.toString() : '',
					$html.attr('class'),
					Utils.microtime() - Globals.now
				);
			}
		});

		$doc.on('keydown', function (oEvent) {
			if (oEvent && oEvent.ctrlKey)
			{
				$html.addClass('rl-ctrl-key-pressed');
			}
		}).on('keyup', function (oEvent) {
			if (oEvent && !oEvent.ctrlKey)
			{
				$html.removeClass('rl-ctrl-key-pressed');
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
			oE = null,
			oLink = null,
			sUserAgent = window.navigator.userAgent.toLowerCase()
		;

		if (sUserAgent && (sUserAgent.indexOf('chrome') > -1 || sUserAgent.indexOf('chrome') > -1))
		{
			oLink = window.document.createElement('a');
			oLink['href'] = sLink;

			if (window.document['createEvent'])
			{
				oE = window.document['createEvent']('MouseEvents');
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
			this.settingsGet('Title') || '';

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
			sCustomLogoutLink = Utils.pString(this.settingsGet('CustomLogoutLink')),
			bInIframe = !!this.settingsGet('InIframe')
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
			kn.setHash(LinkBuilder.root(), true);
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

	/**
	 * @param {string} sName
	 * @return {boolean}
	 */
	AbstractApp.prototype.capa = function (sName)
	{
		var mCapa = this.settingsGet('Capa');
		return Utils.isArray(mCapa) && Utils.isNormal(sName) && -1 < Utils.inArray(sName, mCapa);
	};

	AbstractApp.prototype.bootstart = function (Data)
	{
		var
			self = this,
			ssm = require('../External/ssm.js')
		;

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
				self.pub('ssm.mobile-enter');
			},
			'onLeave': function() {
				$html.removeClass('ssm-state-mobile');
				self.pub('ssm.mobile-leave');
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

		this.sub('ssm.mobile-enter', function () {
			Data.leftPanelDisabled(true);
		});

		this.sub('ssm.mobile-leave', function () {
			Data.leftPanelDisabled(false);
		});

		Data.leftPanelDisabled.subscribe(function (bValue) {
			$html.toggleClass('rl-left-panel-disabled', bValue);
		});

		ssm.ready();
	};

	module.exports = AbstractApp;

}(module));
/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		ko = require('../External/ko.js'),
		_ = require('../External/underscore.js'),
		window = require('../External/window.js'),
		
		Enums = require('../Common/Enums.js'),
		Utils = require('../Common/Utils.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		kn = require('../Knoin/Knoin.js'),

		Data = require('../Storages/AdminDataStorage.js'),
		Remote = require('../Storages/AdminAjaxRemoteStorage.js'),

		AbstractApp = require('./AbstractApp.js')
	;

	/**
	 * @constructor
	 * @extends AbstractApp
	 */
	function AdminApp()
	{
		AbstractApp.call(this, Remote);

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
			this.oData = new AdminDataStorage(); // TODO cjs
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
			this.oRemote = new AdminAjaxRemoteStorage(); // TODO cjs
		}

		return this.oRemote;
	};

	AdminApp.prototype.reloadDomainList = function ()
	{
		// TODO cjs
		Data.domainsLoading(true);
		Remote.domainList(function (sResult, oData) {
			Data.domainsLoading(false);
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				var aList = _.map(oData.Result, function (bEnabled, sName) {
					return {
						'name': sName,
						'disabled': ko.observable(!bEnabled),
						'deleteAccess': ko.observable(false)
					};
				}, this);

				Data.domains(aList);
			}
		});
	};

	AdminApp.prototype.reloadPluginList = function ()
	{
		// TODO cjs
		Data.pluginsLoading(true);
		Remote.pluginList(function (sResult, oData) {
			Data.pluginsLoading(false);
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				var aList = _.map(oData.Result, function (oItem) {
					return {
						'name': oItem['Name'],
						'disabled': ko.observable(!oItem['Enabled']),
						'configured': ko.observable(!!oItem['Configured'])
					};
				}, this);

				Data.plugins(aList);
			}
		});
	};

	AdminApp.prototype.reloadPackagesList = function ()
	{
		// TODO cjs
		Data.packagesLoading(true);
		Data.packagesReal(true);

		Remote.packagesList(function (sResult, oData) {

			Data.packagesLoading(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				Data.packagesReal(!!oData.Result.Real);
				Data.packagesMainUpdatable(!!oData.Result.MainUpdatable);

				var
					aList = [],
					aLoading = {}
				;

				_.each(Data.packages(), function (oItem) {
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

				Data.packages(aList);
			}
			else
			{
				Data.packagesReal(false);
			}
		});
	};

	AdminApp.prototype.updateCoreData = function ()
	{
		Data.coreUpdating(true);
		Remote.updateCoreData(function (sResult, oData) {

			Data.coreUpdating(false);
			Data.coreRemoteVersion('');
			Data.coreRemoteRelease('');
			Data.coreVersionCompare(-2);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				Data.coreReal(true);
				window.location.reload();
			}
			else
			{
				Data.coreReal(false);
			}
		});

	};

	AdminApp.prototype.reloadCoreData = function ()
	{
		Data.coreChecking(true);
		Data.coreReal(true);

		Remote.coreData(function (sResult, oData) {

			Data.coreChecking(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				Data.coreReal(!!oData.Result.Real);
				Data.coreUpdatable(!!oData.Result.Updatable);
				Data.coreAccess(!!oData.Result.Access);
				Data.coreRemoteVersion(oData.Result.RemoteVersion || '');
				Data.coreRemoteRelease(oData.Result.RemoteRelease || '');
				Data.coreVersionCompare(Utils.pInt(oData.Result.VersionCompare));
			}
			else
			{
				Data.coreReal(false);
				Data.coreRemoteVersion('');
				Data.coreRemoteRelease('');
				Data.coreVersionCompare(-2);
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

		// TODO cjs
		Data.licensingProcess(true);
		Data.licenseError('');

		Remote.licensing(function (sResult, oData) {
			Data.licensingProcess(false);
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result && Utils.isNormal(oData.Result['Expired']))
			{
				Data.licenseValid(true);
				Data.licenseExpired(Utils.pInt(oData.Result['Expired']));
				Data.licenseError('');

				Data.licensing(true);
			}
			else
			{
				if (oData && oData.ErrorCode && -1 < Utils.inArray(Utils.pInt(oData.ErrorCode), [
					Enums.Notification.LicensingServerIsUnavailable,
					Enums.Notification.LicensingExpired
				]))
				{
					Data.licenseError(Utils.getNotification(Utils.pInt(oData.ErrorCode)));
					Data.licensing(true);
				}
				else
				{
					if (Enums.StorageResultType.Abort === sResult)
					{
						Data.licenseError(Utils.getNotification(Enums.Notification.LicensingServerIsUnavailable));
						Data.licensing(true);
					}
					else
					{
						Data.licensing(false);
					}
				}
			}
		}, bForce);
	};

	AdminApp.prototype.bootstart = function ()
	{
		AbstractApp.prototype.bootstart.call(this, Data);

		Data.populateDataOnStart();

		kn.hideLoading();

		if (!RL.settingsGet('AllowAdminPanel'))
		{
			kn.routeOff();
			kn.setHash(LinkBuilder.root(), true);
			kn.routeOff();

			_.defer(function () {
				window.location.href = '/';
			});
		}
		else
		{
	//		kn.removeSettingsViewModel(AdminAbout);

			if (!RL.capa(Enums.Capa.Prem))
			{
				kn.removeSettingsViewModel(AdminBranding);
			}

			if (!!RL.settingsGet('Auth'))
			{
	// TODO
	//			if (!RL.settingsGet('AllowPackages') && AdminPackages)
	//			{
	//				kn.disableSettingsViewModel(AdminPackages);
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

	module.exports = new AdminApp();

}(module));

}(window, jQuery, ko, crossroads, hasher, _));