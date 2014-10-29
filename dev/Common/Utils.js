
(function () {

	'use strict';

	var
		oEncryptObject = null,

		Utils = {},

		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		Autolinker = require('Autolinker'),
		JSEncrypt = require('JSEncrypt'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),
		Globals = require('Common/Globals')
	;

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
			Globals.$win.resize();
		}
		else
		{
			window.setTimeout(function () {
				Globals.$win.resize();
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
	 * @param {string} sComponent
	 * @return {string}
	 */
	Utils.encodeURIComponent = function (sComponent)
	{
		return window.encodeURIComponent(sComponent);
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
	 * @return {*|null}
	 */
	Utils.notificationClass = function ()
	{
		return window.Notification && window.Notification.requestPermission ? window.Notification : null;
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
	 * @param {string} sMailToUrl
	 * @param {Function} PopupComposeVoreModel
	 * @returns {boolean}
	 */
	Utils.mailToHelper = function (sMailToUrl, PopupComposeVoreModel)
	{
		if (sMailToUrl && 'mailto:' === sMailToUrl.toString().substr(0, 7).toLowerCase())
		{
			sMailToUrl = sMailToUrl.toString().substr(7);

			var
				oParams = {},
				oEmailModel = null,
				sEmail = sMailToUrl.replace(/\?.+$/, ''),
				sQueryString = sMailToUrl.replace(/^[^\?]*\?/, ''),
				EmailModel = require('Model/Email')
			;

			oEmailModel = new EmailModel();
			oEmailModel.parse(window.decodeURIComponent(sEmail));

			if (oEmailModel && oEmailModel.email)
			{
				oParams = Utils.simpleQueryParser(sQueryString);

				require('Knoin/Knoin').showScreenPopup(PopupComposeVoreModel, [Enums.ComposeType.Empty, null, [oEmailModel],
					Utils.isUnd(oParams.subject) ? null : Utils.pString(oParams.subject),
					Utils.isUnd(oParams.body) ? null : Utils.plainToHtml(Utils.pString(oParams.body))
				]);
			}

			return true;
		}

		return false;
	};

	/**
	 * @param {string} sPublicKey
	 * @return {JSEncrypt}
	 */
	Utils.rsaObject = function (sPublicKey)
	{
		if (JSEncrypt && sPublicKey && (null === oEncryptObject || (oEncryptObject && oEncryptObject.__sPublicKey !== sPublicKey)) &&
			window.crypto && window.crypto.getRandomValues)
		{
			oEncryptObject = new JSEncrypt();
			oEncryptObject.setPublicKey(sPublicKey);
			oEncryptObject.__sPublicKey = sPublicKey;
		}
		else
		{
			oEncryptObject = false;
		}

		return oEncryptObject;
	};

	/**
	 * @param {string} sValue
	 * @param {string} sPublicKey
	 * @return {string}
	 */
	Utils.rsaEncode = function (sValue, sPublicKey)
	{
		if (window.crypto && window.crypto.getRandomValues && sPublicKey)
		{
			var
				sResultValue = false,
				oEncrypt = Utils.rsaObject(sPublicKey)
			;

			if (oEncrypt)
			{
				sResultValue = oEncrypt.encrypt(Utils.fakeMd5() + ':' + sValue + ':' + Utils.fakeMd5());
				if (false !== sResultValue && Utils.isNormal(sResultValue))
				{
					return 'rsa:xxx:' + sResultValue;
				}
			}
		}

		return sValue;
	};

	Utils.rsaEncode.supported = !!(window.crypto && window.crypto.getRandomValues && JSEncrypt);

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
	 * @param {boolean=} bAnimate = false
	 */
	Utils.i18nToNode = function (oElement, bAnimate)
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

			if (bAnimate)
			{
				$('.i18n-animation.i18n', oElement).letterfx({
					'fx': 'fall fade', 'backwards': false, 'timing': 50, 'fx_duration': '50ms', 'letter_end': 'restore', 'element_end': 'restore'
				});
			}
		});
	};

	Utils.i18nReload = function ()
	{
		if (window['rainloopI18N'])
		{
			Globals.oI18N = window['rainloopI18N'] || {};

			Utils.i18nToNode(Globals.$doc, true);

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
		if (window.document.activeElement)
		{
			if (Utils.isUnd(window.document.activeElement.__inFocusCache))
			{
				window.document.activeElement.__inFocusCache = $(window.document.activeElement).is('input,textarea,iframe,.cke_editable');
			}

			return !!window.document.activeElement.__inFocusCache;
		}

		return false;
	};

	Utils.removeInFocus = function ()
	{
		if (window.document && window.document.activeElement && window.document.activeElement.blur)
		{
			var oA = $(window.document.activeElement);
			if (oA.is('input,textarea'))
			{
				window.document.activeElement.blur();
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
		else if (window.document && window.document.selection && window.document.selection.empty)
		{
			window.document.selection.empty();
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
		sSubject = Utils.trim(sSubject.replace(/[\s]+/g, ' '));

		var
			bDrop = false,
			aSubject = [],
			bRe = 'RE' === sPrefix,
			bFwd = 'FWD' === sPrefix,
			bPrefixIsRe = !bFwd
		;

		if ('' !== sSubject)
		{
			_.each(sSubject.split(':'), function (sPart) {
				var sTrimmedPart = Utils.trim(sPart);
				if (!bDrop && (/^(RE|FWD)$/i.test(sTrimmedPart) || /^(RE|FWD)[\[\(][\d]+[\]\)]$/i.test(sTrimmedPart)))
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
					aSubject.push(sPart);
					bDrop = true;
				}
			});
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
			Utils.trim(aSubject.join(':'))
		);
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
		oN[Enums.Notification.AccountDoesNotExist] = Utils.i18n('NOTIFICATIONS/ACCOUNT_DOES_NOT_EXIST');

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
			fNonEmpty = function () {
				if (fResult && fResult.canExecute && fResult.canExecute())
				{
					fExecute.apply(oContext, Array.prototype.slice.call(arguments));
				}
				return false;
			},
			fResult = fExecute ? fNonEmpty : Utils.emptyFunction
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
				Globals.$html.removeClass('rl-anim rl-anim-full').addClass('no-rl-anim');

				Globals.sAnimationType = Enums.InterfaceAnimation.None;
			}
			else
			{
				switch (sValue)
				{
					case Enums.InterfaceAnimation.Full:
						Globals.$html.removeClass('no-rl-anim').addClass('rl-anim rl-anim-full');
						Globals.sAnimationType = sValue;
						break;
					case Enums.InterfaceAnimation.Normal:
						Globals.$html.removeClass('no-rl-anim rl-anim-full').addClass('rl-anim');
						Globals.sAnimationType = sValue;
						break;
				}
			}
		});

		oData.interfaceAnimation.valueHasMutated();

		oData.desktopNotificationsPermisions = ko.computed(function () {

			oData.desktopNotifications();

			var
				NotificationClass = Utils.notificationClass(),
				iResult = Enums.DesktopNotifications.NotSupported
			;

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
					var
						NotificationClass = Utils.notificationClass(),
						iPermission = oData.desktopNotificationsPermisions()
					;

					if (NotificationClass && Enums.DesktopNotifications.Allowed === iPermission)
					{
						oData.desktopNotifications(true);
					}
					else if (NotificationClass && Enums.DesktopNotifications.NotAllowed === iPermission)
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

		oData.weakPassword = ko.observable(false);

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
		oData.googleEnable.auth = ko.observable(false);
		oData.googleEnable.drive = ko.observable(false);
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
	 * @param {string} sTheme
	 * @return {string}
	 */
	Utils.convertThemeName = function (sTheme)
	{
		if ('@custom' === sTheme.substr(-7))
		{
			sTheme = Utils.trim(sTheme.substring(0, sTheme.length - 7));
		}

		return Utils.trim(sTheme.replace(/[^a-zA-Z0-9]+/g, ' ').replace(/([A-Z])/g, ' $1').replace(/[\s]+/g, ' '));
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
	 * @return {number}
	 */
	Utils.timestamp = function ()
	{
		return window.Math.round(Utils.microtime() / 1000);
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
			sLanguage.toUpperCase().replace(/[^a-zA-Z0-9]+/g, '_'), null, sLanguage);
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

	/**
	 * @param {string} sPlain
	 * @return {string}
	 */
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

	Utils.defautOptionsAfterRender = function (oDomOption, oItem)
	{
		if (oItem && !Utils.isUnd(oItem.disabled) && oDomOption)
		{
			$(oDomOption)
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

				if (oViewModel && $('#rl-content', oBody)[0])
				{
					ko.applyBindings(oViewModel, $('#rl-content', oBody)[0]);
				}

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

	/**
	 * @param {Function} fCallback
	 * @param {?} koTrigger
	 * @param {?} oContext = null
	 * @param {number=} iTimer = 1000
	 * @return {Function}
	 */
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

	Utils.settingsSaveHelperSubscribeFunction = function (oRemote, sSettingName, sType, fTriggerFunction)
	{
		return function (mValue) {

			if (oRemote)
			{
				switch (sType)
				{
					default:
						mValue = Utils.pString(mValue);
						break;
					case 'bool':
					case 'boolean':
						mValue = mValue ? '1' : '0';
						break;
					case 'int':
					case 'integer':
					case 'number':
						mValue = Utils.pInt(mValue);
						break;
					case 'trim':
						mValue = Utils.trim(mValue);
						break;
				}

				var oData = {};
				oData[sSettingName] = mValue;

				if (oRemote.saveAdminConfig)
				{
					oRemote.saveAdminConfig(fTriggerFunction || null, oData);
				}
				else if (oRemote.saveSettings)
				{
					oRemote.saveSettings(fTriggerFunction || null, oData);
				}
			}
		};
	};

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
					return (arguments && 2 < arguments.length) ? arguments[1] + $.trim(arguments[2].replace(/[\s]/g, '')) + ' ' : '';
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

		sText = Globals.$div.html(sText).text();

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
	 * @param {boolean} bFindEmailAndLinks = false
	 * @return {string}
	 */
	Utils.plainToHtml = function (sPlain, bFindEmailAndLinks)
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
					if ('' !== sLine)
					{
						bIn = false;
						aNextText.push('~~~/blockquote~~~');
						aNextText.push(sLine);
					}
					else
					{
						aNextText.push(sLine);
					}
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
//			.replace(/~~~\/blockquote~~~\n~~~blockquote~~~/g, '\n')
			.replace(/&/g, '&amp;')
			.replace(/>/g, '&gt;').replace(/</g, '&lt;')
			.replace(/~~~blockquote~~~[\s]*/g, '<blockquote>')
			.replace(/[\s]*~~~\/blockquote~~~/g, '</blockquote>')
			.replace(/ /g, '&nbsp;')
			.replace(/\n/g, '<br />')
		;

		return bFindEmailAndLinks ? Utils.findEmailAndLinks(sPlain) : sPlain;
	};

	window.rainloop_Utils_htmlToPlain = Utils.htmlToPlain;
	window.rainloop_Utils_plainToHtml = Utils.plainToHtml;

	/**
	 * @param {string} sHtml
	 * @return {string}
	 */
	Utils.findEmailAndLinks = function (sHtml)
	{
		sHtml = Autolinker.link(sHtml, {
			'newWindow': true,
			'stripPrefix': false,
			'urls': true,
			'email': true,
			'twitter': false,
			'replaceFn': function (autolinker, match) {
				return !(autolinker && match && 'url' === match.getType() && match.matchedText && 0 !== match.matchedText.indexOf('http'));
			}
		});

		return sHtml;
	};

	/**
	 * @param {string} sUrl
	 * @param {number} iValue
	 * @param {Function} fCallback
	 */
	Utils.resizeAndCrop = function (sUrl, iValue, fCallback)
	{
		var oTempImg = new window.Image();
		oTempImg.onload = function() {

			var
				aDiff = [0, 0],
				oCanvas = window.document.createElement('canvas'),
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
	Utils.folderListOptionsBuilder = function (aSystem, aList, aDisabled, aHeaderLines,
		iUnDeep, fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible)
	{
		var
			/**
			 * @type {?FolderModel}
			 */
			oItem = null,
			bSep = false,
			iIndex = 0,
			iLen = 0,
			sDeepPrefix = '\u00A0\u00A0\u00A0',
			aResult = []
		;

		bBuildUnvisible = Utils.isUnd(bBuildUnvisible) ? false : !!bBuildUnvisible;
		bSystem = !Utils.isNormal(bSystem) ? 0 < aSystem.length : bSystem;
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
				'system': false,
				'seporator': false,
				'disabled': false
			});
		}

		bSep = true;
		for (iIndex = 0, iLen = aSystem.length; iIndex < iLen; iIndex++)
		{
			oItem = aSystem[iIndex];
			if (fVisibleCallback ? fVisibleCallback.call(null, oItem) : true)
			{
				if (bSep && 0 < aResult.length)
				{
					aResult.push({
						'id': '---',
						'name': '---',
						'system': false,
						'seporator': true,
						'disabled': true
					});
				}

				bSep = false;
				aResult.push({
					'id': oItem.fullNameRaw,
					'name': fRenameCallback ? fRenameCallback.call(null, oItem) : oItem.name(),
					'system': true,
					'seporator': false,
					'disabled': !oItem.selectable || -1 < Utils.inArray(oItem.fullNameRaw, aDisabled) ||
						(fDisableCallback ? fDisableCallback.call(null, oItem) : false)
				});
			}
		}

		bSep = true;
		for (iIndex = 0, iLen = aList.length; iIndex < iLen; iIndex++)
		{
			oItem = aList[iIndex];
			if (oItem.subScribed() || !oItem.existen || bBuildUnvisible)
			{
				if (fVisibleCallback ? fVisibleCallback.call(null, oItem) : true)
				{
					if (Enums.FolderType.User === oItem.type() || !bSystem || 0 < oItem.subFolders().length)
					{
						if (bSep && 0 < aResult.length)
						{
							aResult.push({
								'id': '---',
								'name': '---',
								'system': false,
								'seporator': true,
								'disabled': true
							});
						}

						bSep = false;
						aResult.push({
							'id': oItem.fullNameRaw,
							'name': (new window.Array(oItem.deep + 1 - iUnDeep)).join(sDeepPrefix) +
								(fRenameCallback ? fRenameCallback.call(null, oItem) : oItem.name()),
							'system': false,
							'seporator': false,
							'disabled': !oItem.selectable || -1 < Utils.inArray(oItem.fullNameRaw, aDisabled) ||
								(fDisableCallback ? fDisableCallback.call(null, oItem) : false)
						});
					}
				}
			}

			if (oItem.subScribed() && 0 < oItem.subFolders().length)
			{
				aResult = aResult.concat(Utils.folderListOptionsBuilder([], oItem.subFolders(), aDisabled, [],
					iUnDeep, fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible));
			}
		}

		return aResult;
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
				 * @param {boolean=} bPush = true
				 * @param {string=} sCustomName = ''
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
		var sel, range;
		if (window.getSelection)
		{
			sel = window.getSelection();
			sel.removeAllRanges();
			range = window.document.createRange();
			range.selectNodeContents(element);
			sel.addRange(range);
		}
		else if (window.document.selection)
		{
			range = window.document.body.createTextRange();
			range.moveToElementText(element);
			range.select();
		}
	};

	Utils.detectDropdownVisibility = _.debounce(function () {
		Globals.dropdownVisibility(!!_.find(Globals.aBootstrapDropdowns, function (oItem) {
			return oItem.hasClass('open');
		}));
	}, 50);

	/**
	 * @param {boolean=} bDelay = false
	 */
	Utils.triggerAutocompleteInputChange = function (bDelay) {

		var fFunc = function () {
			$('.checkAutocomplete').trigger('change');
		};

		if (Utils.isUnd(bDelay) ? false : !!bDelay)
		{
			_.delay(fFunc, 100);
		}
		else
		{
			fFunc();
		}
	};

	/**
	 * @param {string} sLanguage
	 * @param {Function=} fDone
	 * @param {Function=} fFail
	 */
	Utils.reloadLanguage = function (sLanguage, fDone, fFail)
	{
		var iStart = Utils.microtime();

		Globals.$html.addClass('rl-changing-language');

		$.ajax({
				'url': require('Common/Links').langLink(sLanguage),
				'dataType': 'script',
				'cache': true
			})
			.fail(fFail || Utils.emptyFunction)
			.done(function () {
				_.delay(function () {
					Utils.i18nReload();
					(fDone || Utils.emptyFunction)();
					Globals.$html.removeClass('rl-changing-language');
				}, 500 < Utils.microtime() - iStart ? 1 : 500);
			})
		;
	};

	/**
	 * @param {Object} oParams
	 */
	Utils.setHeadViewport = function (oParams)
	{
		var aContent = [];
		_.each(oParams, function (sKey, sValue) {
			aContent.push('' + sKey + '=' + sValue);
		});

		$('#rl-head-viewport').attr('content', aContent.join(', '));
	};

	/**
	 * @param {mixed} mPropOrValue
	 * @param {mixed} mValue
	 */
	Utils.disposeOne = function (mPropOrValue, mValue)
	{
		var mDisposable = mValue || mPropOrValue;
        if (mDisposable && typeof mDisposable.dispose === 'function')
		{
            mDisposable.dispose();
        }
	};

	/**
	 * @param {Object} oObject
	 */
	Utils.disposeObject = function (oObject)
	{
		if (oObject)
		{
			if (Utils.isArray(oObject.disposables))
			{
				_.each(oObject.disposables, Utils.disposeOne);
			}

			ko.utils.objectForEach(oObject, Utils.disposeOne);
		}
	};

	/**
	 * @param {Object|Array} mObjectOrObjects
	 */
	Utils.delegateRunOnDestroy = function (mObjectOrObjects)
	{
		if (mObjectOrObjects)
		{
			if (Utils.isArray(mObjectOrObjects))
			{
				_.each(mObjectOrObjects, function (oItem) {
					Utils.delegateRunOnDestroy(oItem);
				});
			}
			else if (mObjectOrObjects && mObjectOrObjects.onDestroy)
			{
				mObjectOrObjects.onDestroy();
			}
		}
	};

	Utils.__themeTimer = 0;
	Utils.__themeAjax = null;

	Utils.changeTheme = function (sValue, themeTrigger)
	{
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
			sUrl = sUrl.toString().replace(/\/Css\/[^\/]+\/User\//, '/Css/0/User/');

			if ('Json/' !== sUrl.substring(sUrl.length - 5, sUrl.length))
			{
				sUrl += 'Json/';
			}

			window.clearTimeout(Utils.__themeTimer);
			themeTrigger(Enums.SaveSettingsStep.Animate);

			if (Utils.__themeAjax && Utils.__themeAjax.abort)
			{
				Utils.__themeAjax.abort();
			}

			Utils.__themeAjax = $.ajax({
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

					themeTrigger(Enums.SaveSettingsStep.TrueResult);
				}

			}).always(function() {

				Utils.__themeTimer = window.setTimeout(function () {
					themeTrigger(Enums.SaveSettingsStep.Idle);
				}, 1000);

				Utils.__themeAjax = null;
			});
		}
	};

	module.exports = Utils;

}());