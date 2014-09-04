/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	var parentJsonpFunction = window["webpackJsonp"];
/******/ 	window["webpackJsonp"] = function webpackJsonpCallback(chunkIds, moreModules) {
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, callbacks = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId])
/******/ 				callbacks.push.apply(callbacks, installedChunks[chunkId]);
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			modules[moduleId] = moreModules[moduleId];
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(chunkIds, moreModules);
/******/ 		while(callbacks.length)
/******/ 			callbacks.shift().call(null, __webpack_require__);
/******/ 		if(moreModules[0]) {
/******/ 			installedModules[0] = 0;
/******/ 			__webpack_require__(0);
/******/ 		}
/******/ 	};
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// "0" means "already loaded"
/******/ 	// Array means "loading", array contains callbacks
/******/ 	var installedChunks = {
/******/ 		1:0
/******/ 	};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId, callback) {
/******/ 		// "0" is the signal for "already loaded"
/******/ 		if(installedChunks[chunkId] === 0)
/******/ 			return callback.call(null, __webpack_require__);
/******/
/******/ 		// an array means "currently loading".
/******/ 		if(installedChunks[chunkId] !== undefined) {
/******/ 			installedChunks[chunkId].push(callback);
/******/ 		} else {
/******/ 			// start chunk loading
/******/ 			installedChunks[chunkId] = [callback];
/******/ 			var head = document.getElementsByTagName('head')[0];
/******/ 			var script = document.createElement('script');
/******/ 			script.type = 'text/javascript';
/******/ 			script.charset = 'utf-8';
/******/ 			script.src = __webpack_require__.p + "" + {"0":"701a517c70faed82fff3","2":"16ff7c35c340aa129a8c","3":"9970c7a3777d831f5c93"}[chunkId] + ".chunk.js";
/******/ 			head.appendChild(script);
/******/ 		}
/******/ 	};
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "rainloop/v/0.0.0/static/js/";
/******/ })
/************************************************************************/
/******/ ({

/***/ 1:
/*!*****************************!*\
  !*** ./dev/Common/Utils.js ***!
  \*****************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			Utils = {},

			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Globals = __webpack_require__(/*! Common/Globals */ 7)
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
					EmailModel = __webpack_require__(/*! Model:Email */ 23)
				;

				oEmailModel = new EmailModel();
				oEmailModel.parse(window.decodeURIComponent(sEmail));

				if (oEmailModel && oEmailModel.email)
				{
					oParams = Utils.simpleQueryParser(sQueryString);

					__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(PopupComposeVoreModel, [Enums.ComposeType.Empty, null, [oEmailModel],
						Utils.isUnd(oParams.subject) ? null : Utils.pString(oParams.subject),
						Utils.isUnd(oParams.body) ? null : Utils.plainToHtml(Utils.pString(oParams.body))
					]);
				}

				return true;
			}

			return false;
		};

		/**
		 * @param {string} sValue
		 * @param {string} sHash
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
				sPart = null,
				aParts = sPath.split('.'),
				oCur = oObjectToExportTo || window
			;

			for (; aParts.length && (sPart = aParts.shift());)
			{
				if (!aParts.length && !Utils.isUnd(oObject))
				{
					oCur[sPart] = oObject;
				}
				else if (oCur[sPart])
				{
					oCur = oCur[sPart];
				}
				else
				{
					oCur = oCur[sPart] = {};
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

				Utils.i18nToNode(Globals.$doc);

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

					if (fResult && fResult.canExecute && fResult.canExecute())
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
				sHtml = Globals.$div.html(sHtml.replace(/&amp;/ig, 'amp_amp_12345_amp_amp'))
					.linkify()
					.find('.linkified').removeClass('linkified').end()
					.html()
					.replace(/amp_amp_12345_amp_amp/g, '&amp;')
				;
			}

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
		Utils.folderListOptionsBuilder = function (aSystem, aList, aDisabled, aHeaderLines, iUnDeep, fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible)
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
				if (oItem.subScribed() || !oItem.existen)
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

		module.exports = Utils;

	}());

/***/ },

/***/ 2:
/*!********************!*\
  !*** external "_" ***!
  \********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = _;

/***/ },

/***/ 3:
/*!****************************!*\
  !*** ./dev/External/ko.js ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function (module, ko) {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14)
		;

		ko.bindingHandlers.tooltip = {
			'init': function (oElement, fValueAccessor) {

				var
					Globals = __webpack_require__(/*! Common/Globals */ 7),
					Utils = __webpack_require__(/*! Common/Utils */ 1)
				;

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

					Globals.tooltipTrigger.subscribe(function () {
						$oEl.tooltip('hide');
					});
				}
			}
		};

		ko.bindingHandlers.tooltip2 = {
			'init': function (oElement, fValueAccessor) {
				var
					Globals = __webpack_require__(/*! Common/Globals */ 7),
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

				Globals.tooltipTrigger.subscribe(function () {
					$oEl.tooltip('hide');
				});
			}
		};

		ko.bindingHandlers.tooltip3 = {
			'init': function (oElement) {

				var
					$oEl = $(oElement),
					Globals = __webpack_require__(/*! Common/Globals */ 7)
				;

				$oEl.tooltip({
					'container': 'body',
					'trigger': 'hover manual',
					'title': function () {
						return $oEl.data('tooltip3-data') || '';
					}
				});

				$(window.document).click(function () {
					$oEl.tooltip('hide');
				});

				Globals.tooltipTrigger.subscribe(function () {
					$oEl.tooltip('hide');
				});
			},
			'update': function (oElement, fValueAccessor) {
				var sValue = ko.utils.unwrapObservable(fValueAccessor());
				if ('' === sValue)
				{
					$(oElement).data('tooltip3-data', '').tooltip('hide');
				}
				else
				{
					$(oElement).data('tooltip3-data', sValue).tooltip('show');
				}
			}
		};

		ko.bindingHandlers.registrateBootstrapDropdown = {
			'init': function (oElement) {
				var Globals = __webpack_require__(/*! Common/Globals */ 7);
				Globals.aBootstrapDropdowns.push($(oElement));
			}
		};

		ko.bindingHandlers.openDropdownTrigger = {
			'update': function (oElement, fValueAccessor) {
				if (ko.utils.unwrapObservable(fValueAccessor()))
				{
					var
						$el = $(oElement),
						Utils = __webpack_require__(/*! Common/Utils */ 1)
					;

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
				var Utils = __webpack_require__(/*! Common/Utils */ 1);
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
				var Utils = __webpack_require__(/*! Common/Utils */ 1);
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

				var
					Globals = __webpack_require__(/*! Common/Globals */ 7),
					Utils = __webpack_require__(/*! Common/Utils */ 1)
				;

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
				var Utils = __webpack_require__(/*! Common/Utils */ 1);
				Utils.i18nToNode(oElement);
			}
		};

		ko.bindingHandlers.i18nUpdate = {
			'update': function (oElement, fValueAccessor) {
				var Utils = __webpack_require__(/*! Common/Utils */ 1);
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
					Utils = __webpack_require__(/*! Common/Utils */ 1),
					Globals = __webpack_require__(/*! Common/Globals */ 7),
					aValues = ko.utils.unwrapObservable(fValueAccessor()),
					iValue = Utils.pInt(aValues[1]),
					iSize = 0,
					iOffset = $(oElement).offset().top
				;

				if (0 < iOffset)
				{
					iOffset += Utils.pInt(aValues[2]);
					iSize = Globals.$win.height() - iOffset;

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
				var
					Globals = __webpack_require__(/*! Common/Globals */ 7),
					Utils = __webpack_require__(/*! Common/Utils */ 1)
				;
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
						return fValueAccessor()(oEvent && oEvent.target ? ko.dataFor(oEvent.target) : null);
					};

					$(oElement).draggable(oConf).on('mousedown', function () {
						Utils.removeInFocus();
					});
				}
			}
		};

		ko.bindingHandlers.droppable = {
			'init': function (oElement, fValueAccessor, fAllBindingsAccessor) {
				var Globals = __webpack_require__(/*! Common/Globals */ 7);
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
				var Globals = __webpack_require__(/*! Common/Globals */ 7);
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
			'init': function(oElement, fValueAccessor, fAllBindingsAccessor) {

				var
					Utils = __webpack_require__(/*! Common/Utils */ 1),
					EmailModel = __webpack_require__(/*! Model:Email */ 23),

					$oEl = $(oElement),
					fValue = fValueAccessor(),
					fAllBindings = fAllBindingsAccessor(),
					fAutoCompleteSource = fAllBindings['autoCompleteSource'] || null,
					fFocusCallback = function (bValue) {
						if (fValue && fValue.focusTrigger)
						{
							fValue.focusTrigger(bValue);
						}
					}
				;

				$oEl.inputosaurus({
					'parseOnBlur': true,
					'allowDragAndDrop': true,
					'focusCallback': fFocusCallback,
					'inputDelimiters': [',', ';'],
					'autoCompleteSource': fAutoCompleteSource,
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
			},
			'update': function (oElement, fValueAccessor, fAllBindingsAccessor) {

				var
					$oEl = $(oElement),
					fAllValueFunc = fAllBindingsAccessor(),
					fEmailsTagsFilter = fAllValueFunc['emailsTagsFilter'] || null,
					sValue = ko.utils.unwrapObservable(fValueAccessor())
				;

				if ($oEl.data('EmailsTagsValue') !== sValue)
				{
					$oEl.val(sValue);
					$oEl.data('EmailsTagsValue', sValue);
					$oEl.inputosaurus('refresh');
				}

				if (fEmailsTagsFilter && ko.utils.unwrapObservable(fEmailsTagsFilter))
				{
					$oEl.inputosaurus('focus');
				}
			}
		};

		ko.bindingHandlers.contactTags = {
			'init': function(oElement, fValueAccessor, fAllBindingsAccessor) {

				var
					Utils = __webpack_require__(/*! Common/Utils */ 1),
					ContactTagModel = __webpack_require__(/*! Model:ContactTag */ 37),

					$oEl = $(oElement),
					fValue = fValueAccessor(),
					fAllBindings = fAllBindingsAccessor(),
					fAutoCompleteSource = fAllBindings['autoCompleteSource'] || null,
					fFocusCallback = function (bValue) {
						if (fValue && fValue.focusTrigger)
						{
							fValue.focusTrigger(bValue);
						}
					}
				;

				$oEl.inputosaurus({
					'parseOnBlur': true,
					'allowDragAndDrop': false,
					'focusCallback': fFocusCallback,
					'inputDelimiters': [',', ';'],
					'outputDelimiter': ',',
					'autoCompleteSource': fAutoCompleteSource,
					'parseHook': function (aInput) {
						return _.map(aInput, function (sInputValue) {

							var
								sValue = Utils.trim(sInputValue),
								oTag = null
							;

							if ('' !== sValue)
							{
								oTag = new ContactTagModel();
								oTag.name(sValue);
								return [oTag.toLine(false), oTag];
							}

							return [sValue, null];

						});
					},
					'change': _.bind(function (oEvent) {
						$oEl.data('ContactTagsValue', oEvent.target.value);
						fValue(oEvent.target.value);
					}, this)
				});
			},
			'update': function (oElement, fValueAccessor, fAllBindingsAccessor) {

				var
					$oEl = $(oElement),
					fAllValueFunc = fAllBindingsAccessor(),
					fContactTagsFilter = fAllValueFunc['contactTagsFilter'] || null,
					sValue = ko.utils.unwrapObservable(fValueAccessor())
				;

				if ($oEl.data('ContactTagsValue') !== sValue)
				{
					$oEl.val(sValue);
					$oEl.data('ContactTagsValue', sValue);
					$oEl.inputosaurus('refresh');
				}

				if (fContactTagsFilter && ko.utils.unwrapObservable(fContactTagsFilter))
				{
					$oEl.inputosaurus('focus');
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
			var
				Utils = __webpack_require__(/*! Common/Utils */ 1),
				oResult = ko.computed({
					'read': oTarget,
					'write': function (sNewValue) {
						oTarget(Utils.trim(sNewValue.toString()));
					},
					'owner': this
				})
			;

			oResult(oTarget());
			return oResult;
		};

		ko.extenders.posInterer = function (oTarget, iDefault)
		{
			var
				Utils = __webpack_require__(/*! Common/Utils */ 1),
				oResult = ko.computed({
					'read': oTarget,
					'write': function (sNewValue) {
						var iNew = Utils.pInt(sNewValue.toString(), iDefault);
						if (0 >= iNew)
						{
							iNew = iDefault;
						}

						if (iNew === oTarget() && '' + iNew !== '' + sNewValue)
						{
							oTarget(iNew + 1);
						}

						oTarget(iNew);
					}
				})
			;

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
			var Utils = __webpack_require__(/*! Common/Utils */ 1);

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
			var Utils = __webpack_require__(/*! Common/Utils */ 1);

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
			var Utils = __webpack_require__(/*! Common/Utils */ 1);

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
			var Utils = __webpack_require__(/*! Common/Utils */ 1);

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

		module.exports = ko;

	}(module, ko));


/***/ },

/***/ 5:
/*!****************************!*\
  !*** ./dev/Knoin/Knoin.js ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),
			hasher = __webpack_require__(/*! hasher */ 115),
			crossroads = __webpack_require__(/*! crossroads */ 48),

			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Plugins = __webpack_require__(/*! Common/Plugins */ 26),
			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @constructor
		 */
		function Knoin()
		{
			this.oScreens = {};
			this.sDefaultScreenName = '';
			this.oCurrentScreen = null;
		}

		Knoin.prototype.oScreens = {};
		Knoin.prototype.sDefaultScreenName = '';
		Knoin.prototype.oCurrentScreen = null;

		Knoin.prototype.hideLoading = function ()
		{
			$('#rl-loading').hide();
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
		 * @param {string|Array} mName
		 * @param {Function} ViewModelClass
		 */
		Knoin.prototype.extendAsViewModel = function (mName, ViewModelClass)
		{
			if (ViewModelClass)
			{
				if (Utils.isArray(mName))
				{
					ViewModelClass.__names = mName;
				}
				else
				{
					ViewModelClass.__names = [mName];
				}

				ViewModelClass.__name = ViewModelClass.__names[0];
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
				oViewModel.viewModelNames = ViewModelClass.__names;

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
								this.storeAndSetKeyScope();

								Globals.popupVisibilityNames.push(this.viewModelName);
								oViewModel.viewModelDom.css('z-index', 3000 + Globals.popupVisibilityNames().length + 10);

								Utils.delegateRun(this, 'onFocus', [], 500);
							}
							else
							{
								Utils.delegateRun(this, 'onHide');
								this.restoreKeyScope();

								_.each(this.viewModelNames, function (sName) {
									Plugins.runHook('view-model-on-hide', [sName, self]);
								});

								Globals.popupVisibilityNames.remove(this.viewModelName);
								oViewModel.viewModelDom.css('z-index', 2000);

								Globals.tooltipTrigger(!Globals.tooltipTrigger());

								_.delay(function () {
									self.viewModelDom.hide();
								}, 300);
							}

						}, oViewModel);
					}

					_.each(ViewModelClass.__names, function (sName) {
						Plugins.runHook('view-model-pre-build', [sName, oViewModel, oViewModelDom]);
					});

					ko.applyBindingAccessorsToNode(oViewModelDom[0], {
						'i18nInit': true,
						'template': function () { return {'name': oViewModel.viewModelTemplate()};}
					}, oViewModel);

					Utils.delegateRun(oViewModel, 'onBuild', [oViewModelDom]);
					if (oViewModel && 'Popups' === sPosition)
					{
						oViewModel.registerPopupKeyDown();
					}

					_.each(ViewModelClass.__names, function (sName) {
						Plugins.runHook('view-model-post-build', [sName, oViewModel, oViewModelDom]);
					});
				}
				else
				{
					Utils.log('Cannot find view model position: ' + sPosition);
				}
			}

			return ViewModelClass ? ViewModelClass.__vm : null;
		};

		/**
		 * @param {Function} ViewModelClassToHide
		 */
		Knoin.prototype.hideScreenPopup = function (ViewModelClassToHide)
		{
			if (ViewModelClassToHide && ViewModelClassToHide.__vm && ViewModelClassToHide.__dom)
			{
				ViewModelClassToHide.__vm.modalVisibility(false);
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

					_.each(ViewModelClassToShow.__names, function (sName) {
						Plugins.runHook('view-model-on-show', [sName, ViewModelClassToShow.__vm, aParameters || []]);
					});
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

										_.each(ViewModelClass.__names, function (sName) {
											Plugins.runHook('view-model-on-show', [sName, ViewModelClass.__vm]);
										});
									}

								}, self);
							}
						}
						// --

						oCross = oScreen.__cross ? oScreen.__cross() : null;
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
				Globals.$html.removeClass('rl-started-trigger').addClass('rl-started');
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

		module.exports = new Knoin();

	}());

/***/ },

/***/ 6:
/*!*****************************!*\
  !*** ./dev/Common/Enums.js ***!
  \*****************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

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
			'Forward': 'Forward'
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

	}());

/***/ },

/***/ 7:
/*!*******************************!*\
  !*** ./dev/Common/Globals.js ***!
  \*******************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			Globals = {},

			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),
			key = __webpack_require__(/*! key */ 19),

			Enums = __webpack_require__(/*! Common/Enums */ 6)
		;

		Globals.$win = $(window);
		Globals.$doc = $(window.document);
		Globals.$html = $('html');
		Globals.$div = $('<div></div>');

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
		Globals.bAnimationSupported = !Globals.bMobileDevice && Globals.$html.hasClass('csstransitions');

		/**
		 * @type {boolean}
		 */
		Globals.bXMLHttpRequestSupported = !!window.XMLHttpRequest;

		/**
		 * @type {string}
		 */
		Globals.sAnimationType = '';

		/**
		 * @type {*}
		 */
		Globals.__APP = null;

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
			'ja': 'ja',
			'ja-jp': 'ja',
			'ko': 'ko',
			'ko-kr': 'ko',
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
			'tr': 'tr',
			'ua': 'ru',
			'zh': 'zh',
			'zh-cn': 'zh-cn'
		};

		if (Globals.bAllowPdfPreview && window.navigator && window.navigator.mimeTypes)
		{
			Globals.bAllowPdfPreview = !!_.find(window.navigator.mimeTypes, function (oType) {
				return oType && 'application/pdf' === oType.type;
			});
		}

		Globals.oI18N = window['rainloopI18N'] || {};

		Globals.oNotificationI18N = {};

		Globals.aBootstrapDropdowns = [];

		Globals.aViewModels = {
			'settings': [],
			'settings-removed': [],
			'settings-disabled': []
		};

		Globals.leftPanelDisabled = ko.observable(false);

		// popups
		Globals.popupVisibilityNames = ko.observableArray([]);

		Globals.popupVisibility = ko.computed(function () {
			return 0 < Globals.popupVisibilityNames().length;
		}, this);

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
									(oElement && sTagName === 'DIV' && 'editorHtmlArea' === oElement.className && oElement.contentEditable)
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
	//		window.console.log(sValue);
			key.setScope(sValue);
		});

		Globals.dropdownVisibility.subscribe(function (bValue) {
			if (bValue)
			{
				Globals.tooltipTrigger(!Globals.tooltipTrigger());
				Globals.keyScope(Enums.KeyState.Menu);
			}
			else if (Enums.KeyState.Menu === key.getScope())
			{
				Globals.keyScope(Globals.keyScopeFake());
			}
		});

		module.exports = Globals;

	}());

/***/ },

/***/ 9:
/*!*********************************************!*\
  !*** ./dev/Knoin/KnoinAbstractViewModel.js ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Globals = __webpack_require__(/*! Common/Globals */ 7)
		;

		/**
		 * @constructor
		 * @param {string=} sPosition = ''
		 * @param {string=} sTemplate = ''
		 */
		function KnoinAbstractViewModel(sPosition, sTemplate)
		{
			this.bDisabeCloseOnEsc = false;
			this.sPosition = Utils.pString(sPosition);
			this.sTemplate = Utils.pString(sTemplate);

			this.sDefaultKeyScope = Enums.KeyState.None;
			this.sCurrentKeyScope = this.sDefaultKeyScope;

			this.viewModelVisibility = ko.observable(false);
			this.modalVisibility = ko.observable(false).extend({'rateLimit': 0});

			this.viewModelName = '';
			this.viewModelNames = [];
			this.viewModelDom = null;
		}

		/**
		 * @type {boolean}
		 */
		KnoinAbstractViewModel.prototype.bDisabeCloseOnEsc = false;

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
		KnoinAbstractViewModel.prototype.sDefaultKeyScope = Enums.KeyState.None;

		/**
		 * @type {string}
		 */
		KnoinAbstractViewModel.prototype.sCurrentKeyScope = Enums.KeyState.None;

		/**
		 * @type {string}
		 */
		KnoinAbstractViewModel.prototype.viewModelName = '';

		/**
		 * @type {Array}
		 */
		KnoinAbstractViewModel.prototype.viewModelNames = [];

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

		KnoinAbstractViewModel.prototype.cancelCommand = function () {};
		KnoinAbstractViewModel.prototype.closeCommand = function () {};

		KnoinAbstractViewModel.prototype.storeAndSetKeyScope = function ()
		{
			this.sCurrentKeyScope = Globals.keyScope();
			Globals.keyScope(this.sDefaultKeyScope);
		};

		KnoinAbstractViewModel.prototype.restoreKeyScope = function ()
		{
			Globals.keyScope(this.sCurrentKeyScope);
		};

		KnoinAbstractViewModel.prototype.registerPopupKeyDown = function ()
		{
			var self = this;

			Globals.$win.on('keydown', function (oEvent) {
				if (oEvent && self.modalVisibility && self.modalVisibility())
				{
					if (!this.bDisabeCloseOnEsc && Enums.EventKeyCode.Esc === oEvent.keyCode)
					{
						Utils.delegateRun(self, 'cancelCommand');
						return false;
					}
					else if (Enums.EventKeyCode.Backspace === oEvent.keyCode && !Utils.inFocus())
					{
						return false;
					}
				}

				return true;
			});
		};

		module.exports = KnoinAbstractViewModel;

	}());

/***/ },

/***/ 10:
/*!*****************************************!*\
  !*** ./dev/Storages/SettingsStorage.js ***!
  \*****************************************/
/***/ function(module, exports, __webpack_require__) {

	/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			
			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @constructor
		 */
		function SettingsStorage()
		{
			this.oSettings = window['rainloopAppData'] || {};
			this.oSettings = Utils.isNormal(this.oSettings) ? this.oSettings : {};
		}

		SettingsStorage.prototype.oSettings = null;

		/**
		 * @param {string} sName
		 * @return {?}
		 */
		SettingsStorage.prototype.settingsGet = function (sName)
		{
			return Utils.isUnd(this.oSettings[sName]) ? null : this.oSettings[sName];
		};

		/**
		 * @param {string} sName
		 * @param {?} mValue
		 */
		SettingsStorage.prototype.settingsSet = function (sName, mValue)
		{
			this.oSettings[sName] = mValue;
		};

		/**
		 * @param {string} sName
		 * @return {boolean}
		 */
		SettingsStorage.prototype.capa = function (sName)
		{
			var mCapa = this.settingsGet('Capa');
			return Utils.isArray(mCapa) && Utils.isNormal(sName) && -1 < Utils.inArray(sName, mCapa);
		};


		module.exports = new SettingsStorage();

	}());

/***/ },

/***/ 11:
/*!***********************************!*\
  !*** ./dev/Common/LinkBuilder.js ***!
  \***********************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @constructor
		 */
		function LinkBuilder()
		{
			var Settings = __webpack_require__(/*! Storage:Settings */ 10);

			this.sBase = '#/';
			this.sServer = './?';
			this.sVersion = Settings.settingsGet('Version');
			this.sSpecSuffix = Settings.settingsGet('AuthAccountHash') || '0';
			this.sStaticPrefix = Settings.settingsGet('StaticPrefix') || 'rainloop/v/' + this.sVersion + '/static/';
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
			return this.sServer + '/Change/' + this.sSpecSuffix + '/' + Utils.encodeURIComponent(sEmail) + '/';
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
			return this.sServer + '/Raw/0/Avatar/' + Utils.encodeURIComponent(sEmail) + '/';
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
		 * @return {string}
		 */
		LinkBuilder.prototype.about = function ()
		{
			return this.sBase + 'about';
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
			return  this.sStaticPrefix + 'js/min/openpgp.js';
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

	}());

/***/ },

/***/ 12:
/*!*************************!*\
  !*** external "window" ***!
  \*************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = window;

/***/ },

/***/ 14:
/*!*************************!*\
  !*** external "jQuery" ***!
  \*************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = jQuery;

/***/ },

/***/ 17:
/*!******************************!*\
  !*** ./dev/Common/Consts.js ***!
  \******************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var Consts = {};

		Consts.Values = {};
		Consts.DataImages = {};
		Consts.Defaults = {};

		/**
		 * @const
		 * @type {number}
		 */
		Consts.Defaults.MessagesPerPage = 20;

		/**
		 * @const
		 * @type {number}
		 */
		Consts.Defaults.ContactsPerPage = 50;

		/**
		 * @const
		 * @type {Array}
		 */
		Consts.Defaults.MessagesPerPageArray = [10, 20, 30, 50, 100/*, 150, 200, 300*/];

		/**
		 * @const
		 * @type {number}
		 */
		Consts.Defaults.DefaultAjaxTimeout = 30000;

		/**
		 * @const
		 * @type {number}
		 */
		Consts.Defaults.SearchAjaxTimeout = 300000;

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
		 * @type {number}
		 */
		Consts.Defaults.ContactsSyncAjaxTimeout = 200000;

		/**
		 * @const
		 * @type {string}
		 */
		Consts.Values.UnuseOptionValue = '__UNUSE__';

		/**
		 * @const
		 * @type {string}
		 */
		Consts.Values.ClientSideStorageIndexName = 'rlcsc';

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

		module.exports = Consts;

	}(module));

/***/ },

/***/ 19:
/*!**********************!*\
  !*** external "key" ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = key;

/***/ },

/***/ 22:
/*!******************************!*\
  !*** ./dev/Common/Events.js ***!
  \******************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),

			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Plugins = __webpack_require__(/*! Common/Plugins */ 26)
		;

		/**
		 * @constructor
		 */
		function Events()
		{
			this.oSubs = {};
		}

		Events.prototype.oSubs = {};

		/**
		 * @param {string} sName
		 * @param {Function} fFunc
		 * @param {Object=} oContext
		 * @return {Events}
		 */
		Events.prototype.sub = function (sName, fFunc, oContext)
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
		 * @return {Events}
		 */
		Events.prototype.pub = function (sName, aArgs)
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

		module.exports = new Events();

	}());

/***/ },

/***/ 23:
/*!**********************************!*\
  !*** ./dev/Models/EmailModel.js ***!
  \**********************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			Utils = __webpack_require__(/*! Common/Utils */ 1)
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

		EmailModel.prototype.clear = function ()
		{
			this.email = '';
			this.name = '';
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
			$sName = $sName.replace(/\\\\(.)/g, '$1');
			$sComment = $sComment.replace(/\\\\(.)/g, '$1');

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

	}());

/***/ },

/***/ 24:
/*!******************************************!*\
  !*** ./dev/Knoin/KnoinAbstractScreen.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			crossroads = __webpack_require__(/*! crossroads */ 48),

			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

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

		module.exports = KnoinAbstractScreen;

	}());

/***/ },

/***/ 25:
/*!*************************!*\
  !*** external "moment" ***!
  \*************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = moment;

/***/ },

/***/ 26:
/*!*******************************!*\
  !*** ./dev/Common/Plugins.js ***!
  \*******************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),

			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @constructor
		 */
		function Plugins()
		{
			this.__boot = null;
			this.__data = null;
			this.__remote = null;

			this.oSettings = __webpack_require__(/*! Storage:Settings */ 10);

			this.oViewModelsHooks = {};
			this.oSimpleHooks = {};
		}

		Plugins.prototype.__boot = null;
		Plugins.prototype.__data = null;
		Plugins.prototype.__remote = null;

		/**
		 * @type {Object}
		 */
		Plugins.prototype.oViewModelsHooks = {};

		/**
		 * @type {Object}
		 */
		Plugins.prototype.oSimpleHooks = {};

		/**
		 * @param {string} sName
		 * @param {Function} fCallback
		 */
		Plugins.prototype.addHook = function (sName, fCallback)
		{
			if (Utils.isFunc(fCallback))
			{
				if (!Utils.isArray(this.oSimpleHooks[sName]))
				{
					this.oSimpleHooks[sName] = [];
				}

				this.oSimpleHooks[sName].push(fCallback);
			}
		};

		/**
		 * @param {string} sName
		 * @param {Array=} aArguments
		 */
		Plugins.prototype.runHook = function (sName, aArguments)
		{
			if (Utils.isArray(this.oSimpleHooks[sName]))
			{
				aArguments = aArguments || [];

				_.each(this.oSimpleHooks[sName], function (fCallback) {
					fCallback.apply(null, aArguments);
				});
			}
		};

		/**
		 * @param {string} sName
		 * @return {?}
		 */
		Plugins.prototype.mainSettingsGet = function (sName)
		{
			return this.oSettings.settingsGet(sName);
		};

		/**
		 * @param {Function} fCallback
		 * @param {string} sAction
		 * @param {Object=} oParameters
		 * @param {?number=} iTimeout
		 * @param {string=} sGetAdd = ''
		 * @param {Array=} aAbortActions = []
		 */
		Plugins.prototype.remoteRequest = function (fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions)
		{
			if (this.__remote)
			{
				this.__remote.defaultRequest(fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions);
			}
		};

		/**
		 * @param {string} sPluginSection
		 * @param {string} sName
		 * @return {?}
		 */
		Plugins.prototype.settingsGet = function (sPluginSection, sName)
		{
			var oPlugin = this.oSettings.settingsGet('Plugins');
			oPlugin = oPlugin && !Utils.isUnd(oPlugin[sPluginSection]) ? oPlugin[sPluginSection] : null;
			return oPlugin ? (Utils.isUnd(oPlugin[sName]) ? null : oPlugin[sName]) : null;
		};

		module.exports = new Plugins();

	}());

/***/ },

/***/ 31:
/*!*****************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsAskViewModel.js ***!
  \*****************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),
			key = __webpack_require__(/*! key */ 19),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
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

		kn.extendAsViewModel(['View:Popup:Ask', 'PopupsAskViewModel'], PopupsAskViewModel);
		_.extend(PopupsAskViewModel.prototype, KnoinAbstractViewModel.prototype);

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

		module.exports = PopupsAskViewModel;

	}());

/***/ },

/***/ 32:
/*!***********************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsLanguagesViewModel.js ***!
  \***********************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Globals = __webpack_require__(/*! Common/Globals */ 7),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsLanguagesViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsLanguages');

			this.Data = Globals.__APP.data(); // TODO

			this.exp = ko.observable(false);

			this.languages = ko.computed(function () {
				return _.map(this.Data.languages(), function (sLanguage) {
					return {
						'key': sLanguage,
						'selected': ko.observable(false),
						'fullName': Utils.convertLangName(sLanguage)
					};
				});
			}, this);

			this.Data.mainLanguage.subscribe(function () {
				this.resetMainLanguage();
			}, this);

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:Languages', 'PopupsLanguagesViewModel'], PopupsLanguagesViewModel);
		_.extend(PopupsLanguagesViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsLanguagesViewModel.prototype.languageEnName = function (sLanguage)
		{
			return Utils.convertLangName(sLanguage, true);
		};

		PopupsLanguagesViewModel.prototype.resetMainLanguage = function ()
		{
			var sCurrent = this.Data.mainLanguage();
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
			this.Data.mainLanguage(sLang);
			this.cancelCommand();
		};

		module.exports = PopupsLanguagesViewModel;

	}());

/***/ },

/***/ 34:
/*!*********************************!*\
  !*** ./dev/Apps/AbstractApp.js ***!
  \*********************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),

			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),
			Events = __webpack_require__(/*! Common/Events */ 22),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),

			KnoinAbstractBoot = __webpack_require__(/*! Knoin:AbstractBoot */ 50)
		;

		/**
		 * @constructor
		 * @param {RemoteStorage|AdminRemoteStorage} Remote
		 * @extends KnoinAbstractBoot
		 */
		function AbstractApp(Remote)
		{
			KnoinAbstractBoot.call(this);

			this.isLocalAutocomplete = true;

			this.iframe = $('<iframe style="display:none" src="javascript:;" />').appendTo('body');

			Globals.$win.on('error', function (oEvent) {
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
						Globals.$html.attr('class'),
						Utils.microtime() - Globals.now
					);
				}
			});

			Globals.$doc.on('keydown', function (oEvent) {
				if (oEvent && oEvent.ctrlKey)
				{
					Globals.$html.addClass('rl-ctrl-key-pressed');
				}
			}).on('keyup', function (oEvent) {
				if (oEvent && !oEvent.ctrlKey)
				{
					Globals.$html.removeClass('rl-ctrl-key-pressed');
				}
			});
		}

		_.extend(AbstractApp.prototype, KnoinAbstractBoot.prototype);

		AbstractApp.prototype.remote = function ()
		{
			return null;
		};

		AbstractApp.prototype.data = function ()
		{
			return null;
		};

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
		 * @param {string} sTitle
		 */
		AbstractApp.prototype.setTitle = function (sTitle)
		{
			sTitle = ((Utils.isNormal(sTitle) && 0 < sTitle.length) ? sTitle + ' - ' : '') +
				Settings.settingsGet('Title') || '';

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
				kn = __webpack_require__(/*! App:Knoin */ 5),
				sCustomLogoutLink = Utils.pString(Settings.settingsGet('CustomLogoutLink')),
				bInIframe = !!Settings.settingsGet('InIframe')
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

		AbstractApp.prototype.bootstart = function ()
		{
			Events.pub('rl.bootstart');

			var ssm = __webpack_require__(/*! ssm */ 117);

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
					Globals.$html.addClass('ssm-state-mobile');
					Events.pub('ssm.mobile-enter');
				},
				'onLeave': function() {
					Globals.$html.removeClass('ssm-state-mobile');
					Events.pub('ssm.mobile-leave');
				}
			});

			ssm.addState({
				'id': 'tablet',
				'minWidth': 768,
				'maxWidth': 999,
				'onEnter': function() {
					Globals.$html.addClass('ssm-state-tablet');
				},
				'onLeave': function() {
					Globals.$html.removeClass('ssm-state-tablet');
				}
			});

			ssm.addState({
				'id': 'desktop',
				'minWidth': 1000,
				'maxWidth': 1400,
				'onEnter': function() {
					Globals.$html.addClass('ssm-state-desktop');
				},
				'onLeave': function() {
					Globals.$html.removeClass('ssm-state-desktop');
				}
			});

			ssm.addState({
				'id': 'desktop-large',
				'minWidth': 1400,
				'onEnter': function() {
					Globals.$html.addClass('ssm-state-desktop-large');
				},
				'onLeave': function() {
					Globals.$html.removeClass('ssm-state-desktop-large');
				}
			});

			Events.sub('ssm.mobile-enter', function () {
				Globals.leftPanelDisabled(true);
			});

			Events.sub('ssm.mobile-leave', function () {
				Globals.leftPanelDisabled(false);
			});

			Globals.leftPanelDisabled.subscribe(function (bValue) {
				Globals.$html.toggleClass('rl-left-panel-disabled', bValue);
			});

			ssm.ready();
		};

		module.exports = AbstractApp;

	}());

/***/ },

/***/ 35:
/*!*********************!*\
  !*** ./dev/Boot.js ***!
  \*********************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		module.exports = function (App) {

			var
				window = __webpack_require__(/*! window */ 12),
				_ = __webpack_require__(/*! _ */ 2),
				$ = __webpack_require__(/*! $ */ 14),

				Globals = __webpack_require__(/*! Common/Globals */ 7),
				Plugins = __webpack_require__(/*! Common/Plugins */ 26),
				Utils = __webpack_require__(/*! Common/Utils */ 1),
				Enums = __webpack_require__(/*! Common/Enums */ 6),

				EmailModel = __webpack_require__(/*! Model:Email */ 23)
			;

			Globals.__APP = App;

			Plugins.__boot = App;
			Plugins.__remote = App.remote();
			Plugins.__data = App.data();

			Globals.$html.addClass(Globals.bMobileDevice ? 'mobile' : 'no-mobile');

			Globals.$win.keydown(Utils.killCtrlAandS).keyup(Utils.killCtrlAandS);

			Globals.$win.unload(function () {
				Globals.bUnload = true;
			});

			Globals.$html.on('click.dropdown.data-api', function () {
				Utils.detectDropdownVisibility();
			});

			// export
			window['rl'] = window['rl'] || {};
			window['rl']['addHook'] = _.bind(Plugins.addHook, Plugins);
			window['rl']['settingsGet'] = _.bind(Plugins.mainSettingsGet, Plugins);
			window['rl']['remoteRequest'] = _.bind(Plugins.remoteRequest, Plugins);
			window['rl']['pluginSettingsGet'] = _.bind(Plugins.settingsGet, Plugins);
			window['rl']['createCommand'] = Utils.createCommand;

			window['rl']['EmailModel'] = EmailModel;
			window['rl']['Enums'] = Enums;

			window['__APP_BOOT'] = function (fCall) {

				// boot
				$(function () {

					if (window['rainloopTEMPLATES'] && window['rainloopTEMPLATES'][0])
					{
						$('#rl-templates').html(window['rainloopTEMPLATES'][0]);

						_.delay(function () {

							App.bootstart();
							Globals.$html.removeClass('no-js rl-booted-trigger').addClass('rl-booted');

						}, 10);
					}
					else
					{
						fCall(false);
					}

					window['__APP_BOOT'] = null;
				});
			};

		};

	}());

/***/ },

/***/ 37:
/*!***************************************!*\
  !*** ./dev/Models/ContactTagModel.js ***!
  \***************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),

			Utils = __webpack_require__(/*! Common/Utils */ 1)
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

	}());

/***/ },

/***/ 39:
/*!**************************************!*\
  !*** ./dev/Storages/AbstractData.js ***!
  \**************************************/
/***/ function(module, exports, __webpack_require__) {

	/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

	(function () {

		'use strict';

		var
			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Settings = __webpack_require__(/*! Storage:Settings */ 10)
		;

		/**
		 * @constructor
		 */
		function AbstractData()
		{
			Utils.initDataConstructorBySettings(this);
		}

		AbstractData.prototype.populateDataOnStart = function()
		{
			var
				mLayout = Utils.pInt(Settings.settingsGet('Layout')),
				aLanguages = Settings.settingsGet('Languages'),
				aThemes = Settings.settingsGet('Themes')
			;

			if (Utils.isArray(aLanguages))
			{
				this.languages(aLanguages);
			}

			if (Utils.isArray(aThemes))
			{
				this.themes(aThemes);
			}

			this.mainLanguage(Settings.settingsGet('Language'));
			this.mainTheme(Settings.settingsGet('Theme'));

			this.capaAdditionalAccounts(Settings.capa(Enums.Capa.AdditionalAccounts));
			this.capaAdditionalIdentities(Settings.capa(Enums.Capa.AdditionalIdentities));
			this.capaGravatar(Settings.capa(Enums.Capa.Gravatar));
			this.determineUserLanguage(!!Settings.settingsGet('DetermineUserLanguage'));
			this.determineUserDomain(!!Settings.settingsGet('DetermineUserDomain'));

			this.capaThemes(Settings.capa(Enums.Capa.Themes));
			this.allowLanguagesOnLogin(!!Settings.settingsGet('AllowLanguagesOnLogin'));
			this.allowLanguagesOnSettings(!!Settings.settingsGet('AllowLanguagesOnSettings'));
			this.useLocalProxyForExternalImages(!!Settings.settingsGet('UseLocalProxyForExternalImages'));

			this.editorDefaultType(Settings.settingsGet('EditorDefaultType'));
			this.showImages(!!Settings.settingsGet('ShowImages'));
			this.contactsAutosave(!!Settings.settingsGet('ContactsAutosave'));
			this.interfaceAnimation(Settings.settingsGet('InterfaceAnimation'));

			this.mainMessagesPerPage(Settings.settingsGet('MPP'));

			this.desktopNotifications(!!Settings.settingsGet('DesktopNotifications'));
			this.useThreads(!!Settings.settingsGet('UseThreads'));
			this.replySameFolder(!!Settings.settingsGet('ReplySameFolder'));
			this.useCheckboxesInList(!!Settings.settingsGet('UseCheckboxesInList'));

			this.layout(Enums.Layout.SidePreview);
			if (-1 < Utils.inArray(mLayout, [Enums.Layout.NoPreview, Enums.Layout.SidePreview, Enums.Layout.BottomPreview]))
			{
				this.layout(mLayout);
			}
			this.facebookSupported(!!Settings.settingsGet('SupportedFacebookSocial'));
			this.facebookEnable(!!Settings.settingsGet('AllowFacebookSocial'));
			this.facebookAppID(Settings.settingsGet('FacebookAppID'));
			this.facebookAppSecret(Settings.settingsGet('FacebookAppSecret'));

			this.twitterEnable(!!Settings.settingsGet('AllowTwitterSocial'));
			this.twitterConsumerKey(Settings.settingsGet('TwitterConsumerKey'));
			this.twitterConsumerSecret(Settings.settingsGet('TwitterConsumerSecret'));

			this.googleEnable(!!Settings.settingsGet('AllowGoogleSocial'));
			this.googleClientID(Settings.settingsGet('GoogleClientID'));
			this.googleClientSecret(Settings.settingsGet('GoogleClientSecret'));
			this.googleApiKey(Settings.settingsGet('GoogleApiKey'));

			this.dropboxEnable(!!Settings.settingsGet('AllowDropboxSocial'));
			this.dropboxApiKey(Settings.settingsGet('DropboxApiKey'));

			this.contactsIsAllowed(!!Settings.settingsGet('ContactsIsAllowed'));
		};

		module.exports = AbstractData;

	}());

/***/ },

/***/ 40:
/*!***********************************************!*\
  !*** ./dev/Storages/AbstractRemoteStorage.js ***!
  \***********************************************/
/***/ function(module, exports, __webpack_require__) {

	/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),

			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Plugins = __webpack_require__(/*! Common/Plugins */ 26),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Settings = __webpack_require__(/*! Storage:Settings */ 10)
		;

		/**
		* @constructor
		*/
	   function AbstractRemoteStorage()
	   {
		   this.oRequests = {};
	   }

	   AbstractRemoteStorage.prototype.oRequests = {};

	   /**
		* @param {?Function} fCallback
		* @param {string} sRequestAction
		* @param {string} sType
		* @param {?AjaxJsonDefaultResponse} oData
		* @param {boolean} bCached
		* @param {*=} oRequestParameters
		*/
	   AbstractRemoteStorage.prototype.defaultResponse = function (fCallback, sRequestAction, sType, oData, bCached, oRequestParameters)
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
						   if (Globals.__APP)
						   {
								Globals.__APP.loginAndLogoutReload(true);
						   }
					   }

					   if (oData.Logout || Consts.Values.AjaxErrorLimit < Globals.iAjaxErrorCount)
					   {
						   if (window.__rlah_clear)
						   {
							   window.__rlah_clear();
						   }

						   if (Globals.__APP)
						   {
								Globals.__APP.loginAndLogoutReload(true);
						   }
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
	   AbstractRemoteStorage.prototype.ajaxRequest = function (fResultCallback, oParameters, iTimeOut, sGetAdd, aAbortActions)
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
			   oParameters['XToken'] = Settings.settingsGet('Token');
		   }

		   oDefAjax = $.ajax({
			   'type': bPost ? 'POST' : 'GET',
			   'url': LinkBuilder.ajax(sGetAdd),
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
	   AbstractRemoteStorage.prototype.defaultRequest = function (fCallback, sAction, oParameters, iTimeout, sGetAdd, aAbortActions)
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
	   AbstractRemoteStorage.prototype.noop = function (fCallback)
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
	   AbstractRemoteStorage.prototype.jsError = function (fCallback, sMessage, sFileName, iLineNo, sLocation, sHtmlCapa, iTime)
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
	   AbstractRemoteStorage.prototype.jsInfo = function (fCallback, sType, mData, bIsError)
	   {
		   this.defaultRequest(fCallback, 'JsInfo', {
			   'Type': sType,
			   'Data': mData,
			   'IsError': (Utils.isUnd(bIsError) ? false : !!bIsError) ? '1' : '0'
		   });
	   };

	   /**
		* @param {?Function} fCallback
		*/
	   AbstractRemoteStorage.prototype.getPublicKey = function (fCallback)
	   {
		   this.defaultRequest(fCallback, 'GetPublicKey');
	   };

	   /**
		* @param {?Function} fCallback
		* @param {string} sVersion
		*/
	   AbstractRemoteStorage.prototype.jsVersion = function (fCallback, sVersion)
	   {
		   this.defaultRequest(fCallback, 'Version', {
			   'Version': sVersion
		   });
	   };

		module.exports = AbstractRemoteStorage;

	}());

/***/ },

/***/ 48:
/*!*****************************!*\
  !*** external "crossroads" ***!
  \*****************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = crossroads;

/***/ },

/***/ 50:
/*!****************************************!*\
  !*** ./dev/Knoin/KnoinAbstractBoot.js ***!
  \****************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		/**
		 * @constructor
		 */
		function KnoinAbstractBoot()
		{

		}

		KnoinAbstractBoot.prototype.bootstart = function ()
		{

		};

		module.exports = KnoinAbstractBoot;

	}());

/***/ },

/***/ 115:
/*!*************************!*\
  !*** external "hasher" ***!
  \*************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = hasher;

/***/ },

/***/ 117:
/*!**********************!*\
  !*** external "ssm" ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = ssm;

/***/ }

/******/ })