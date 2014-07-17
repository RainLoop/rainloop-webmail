/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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
	var
		oMatch = null,
		sResult = Utils.trim(sSubject)
	;

	if (null !== (oMatch = (new window.RegExp('^' + sPrefix + '[\\s]?\\:(.*)$', 'gi')).exec(sSubject)) && !Utils.isUnd(oMatch[1]) ||
		null !== (oMatch = (new window.RegExp('^' + sPrefix + '[\\s]?[\\[\\(][\\d]+[\\]\\)][\\s]?\\:(.*)$', 'gi')).exec(sSubject)) && !Utils.isUnd(oMatch[1]))
	{
		sResult = sPrefix + ': ' + Utils.trim(oMatch[1]);
	}
	else
	{
		sResult = sPrefix + ': ' + sSubject;
	}

	return sResult.replace(/[\s]+/g, ' ');
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

	NotificationI18N[Enums.Notification.CouldNotSaveNewPassword] = Utils.i18n('NOTIFICATIONS/COULD_NOT_SAVE_NEW_PASSWORD');
	NotificationI18N[Enums.Notification.CurrentPasswordIncorrect] = Utils.i18n('NOTIFICATIONS/CURRENT_PASSWORD_INCORRECT');
	NotificationI18N[Enums.Notification.NewPasswordShort] = Utils.i18n('NOTIFICATIONS/NEW_PASSWORD_SHORT');
	NotificationI18N[Enums.Notification.NewPasswordWeak] = Utils.i18n('NOTIFICATIONS/NEW_PASSWORD_WEAK');
	NotificationI18N[Enums.Notification.NewPasswordForbidden] = Utils.i18n('NOTIFICATIONS/NEW_PASSWORD_FORBIDDENT');

	NotificationI18N[Enums.Notification.ContactsSyncError] = Utils.i18n('NOTIFICATIONS/CONTACTS_SYNC_ERROR');

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
	NotificationI18N[Enums.Notification.InvalidInputArgument] = Utils.i18n('NOTIFICATIONS/INVALID_INPUT_ARGUMENT');
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
		iDisabledWidth = 60,
		iMinWidth = 155,
		oLeft = $(sLeft),
		oRight = $(sRight),

		mLeftWidth = RL.local().get(sClientSideKeyName) || null,

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
				var iWidth = Utils.pInt(RL.local().get(sClientSideKeyName)) || iMinWidth;
				fSetWidth(iWidth > iMinWidth ? iWidth : iMinWidth);
			}
		},

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
		sResult += sLine.substr(Math.round(Math.random() * sLine.length), 1);
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
