
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

		Mime = require('Common/Mime'),

		Enums = require('Common/Enums'),
		Globals = require('Common/Globals')
	;

	Utils.trim = $.trim;
	Utils.inArray = $.inArray;
	Utils.isArray = _.isArray;
	Utils.isObject = _.isObject;
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

	Utils.windowResizeCallback = function () {
		Utils.windowResize();
	};

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
	 * @param {*} mValue
	 * @return {boolean}
	 */
	Utils.pBool = function (mValue)
	{
		return !!mValue;
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
	 * @return {boolean}
	 */
	Utils.mailToHelper = function (sMailToUrl, PopupComposeVoreModel)
	{
		if (sMailToUrl && 'mailto:' === sMailToUrl.toString().substr(0, 7).toLowerCase())
		{
			if (!PopupComposeVoreModel)
			{
				return true;
			}

			sMailToUrl = sMailToUrl.toString().substr(7);

			var
				aTo = [],
				aCc = null,
				aBcc = null,
				oParams = {},
				EmailModel = require('Model/Email'),
				sEmail = sMailToUrl.replace(/\?.+$/, ''),
				sQueryString = sMailToUrl.replace(/^[^\?]*\?/, ''),
				fParseEmailLine = function (sLine) {
					return sLine ? _.compact(_.map(window.decodeURIComponent(sLine).split(/[,]/), function (sItem) {
						var oEmailModel = new EmailModel();
						oEmailModel.mailsoParse(sItem);
						return '' !== oEmailModel.email ? oEmailModel : null;
					})) : null;
				}
			;

			aTo = fParseEmailLine(sEmail);

			oParams = Utils.simpleQueryParser(sQueryString);

			if (!Utils.isUnd(oParams.cc))
			{
				aCc = fParseEmailLine(window.decodeURIComponent(oParams.cc));
			}

			if (!Utils.isUnd(oParams.bcc))
			{
				aBcc = fParseEmailLine(window.decodeURIComponent(oParams.bcc));
			}

			require('Knoin/Knoin').showScreenPopup(PopupComposeVoreModel, [Enums.ComposeType.Empty, null,
				aTo, aCc, aBcc,
				Utils.isUnd(oParams.subject) ? null :
					Utils.pString(window.decodeURIComponent(oParams.subject)),
				Utils.isUnd(oParams.body) ? null :
					Utils.plainToHtml(Utils.pString(window.decodeURIComponent(oParams.body)))
			]);

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

	Utils.rsaEncode.supported = !!(window.crypto && window.crypto.getRandomValues && false && JSEncrypt);

	/**
	 * @param {string} sText
	 * @return {string}
	 */
	Utils.encodeHtml = function (sText)
	{
		return Utils.isNormal(sText) ? _.escape(sText.toString()) : '';
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
	Utils.kill_CtrlA_CtrlS = function (oEvent)
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
			else if (iKey === Enums.EventKeyCode.A)
			{
				if (oSender && ('true' === '' + oSender.contentEditable ||
					(oSender.tagName && oSender.tagName.match(/INPUT|TEXTAREA/i))))
				{
					return;
				}

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
	 * @param {string} sTheme
	 * @return {string}
	 */
	Utils.convertThemeName = _.memoize(function (sTheme)
	{
		if ('@custom' === sTheme.substr(-7))
		{
			sTheme = Utils.trim(sTheme.substring(0, sTheme.length - 7));
		}

		return Utils.trim(sTheme.replace(/[^a-zA-Z0-9]+/g, ' ').replace(/([A-Z])/g, ' $1').replace(/[\s]+/g, ' '));
	});

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
		return (new window.Date()).getTime();
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
		return require('Common/Translator').i18n('LANGS_NAMES' + (true === bEng ? '_EN' : '') + '/LANG_' +
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

	Utils.draggablePlace = function ()
	{
		return $('<div class="draggablePlace">' +
			'<span class="text"></span>&nbsp;' +
			'<i class="icon-copy icon-white visible-on-ctrl"></i><i class="icon-mail icon-white hidden-on-ctrl"></i></div>').appendTo('#rl-hidden');
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

				require('Common/Translator').i18nToNodes(oBody);

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

			convertBlockquote = function (sText) {
				sText = Utils.trim(sText);
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
				return (arguments && 1 < arguments.length) ?
					arguments[1].toString()
						.replace(/[\n]/gm, '<br />')
						.replace(/[\r]/gm, '')
					: '';
			},

			fixAttibuteValue = function () {
				return (arguments && 1 < arguments.length) ?
					'' + arguments[1] + _.escape(arguments[2]) : '';
			},

			convertLinks = function () {
				return (arguments && 1 < arguments.length) ? $.trim(arguments[1]) : '';
			}
		;

		sText = sHtml
			.replace(/\u0002([\s\S]*)\u0002/gm, '\u200C$1\u200C')
			.replace(/<p[^>]*><\/p>/gi, '')
			.replace(/<pre[^>]*>([\s\S\r\n\t]*)<\/pre>/gmi, convertPre)
			.replace(/[\s]+/gm, ' ')
			.replace(/((?:href|data)\s?=\s?)("[^"]+?"|'[^']+?')/gmi, fixAttibuteValue)
			.replace(/<br[^>]*>/gmi, '\n')
			.replace(/<\/h[\d]>/gi, '\n')
			.replace(/<\/p>/gi, '\n\n')
			.replace(/<ul[^>]*>/gmi, '\n')
			.replace(/<\/ul>/gi, '\n')
			.replace(/<li[^>]*>/gmi, ' * ')
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

		sText = Utils.splitPlainText(Utils.trim(sText));

		iPos = 0;
		iLimit = 800;

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

		bFindEmailAndLinks = Utils.isUnd(bFindEmailAndLinks) ? false : !!bFindEmailAndLinks;

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
			.replace(/\u200C([\s\S]*)\u200C/g, '\u0002$1\u0002')
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
//		return sHtml;
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
//			if (oItem.subScribed() || !oItem.existen || bBuildUnvisible)
			if ((oItem.subScribed() || !oItem.existen || bBuildUnvisible) && (oItem.selectable || oItem.hasSubScribedSubfolders()))
			{
				if (fVisibleCallback ? fVisibleCallback.call(null, oItem) : true)
				{
					if (Enums.FolderType.User === oItem.type() || !bSystem || oItem.hasSubScribedSubfolders())
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
	 * @param {string} sFileName
	 * @return {string}
	 */
	Utils.getFileExtension = function (sFileName)
	{
		sFileName = Utils.trim(sFileName).toLowerCase();

		var sResult = sFileName.split('.').pop();
		return (sResult === sFileName) ? '' : sResult;
	};

	/**
	 * @param {string} sFileName
	 * @return {string}
	 */
	Utils.mimeContentType = function (sFileName)
	{
		var
			sExt = '',
			sResult = 'application/octet-stream'
		;

		sFileName = Utils.trim(sFileName).toLowerCase();

		if ('winmail.dat' === sFileName)
		{
			return 'application/ms-tnef';
		}

		sExt = Utils.getFileExtension(sFileName);
		if (sExt && 0 < sExt.length && !Utils.isUnd(Mime[sExt]))
		{
			sResult = Mime[sExt];
		}

		return sResult;
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
			sUrl = sUrl.toString().replace(/\/Hash\/[^\/]+\//, '/Hash/-/');

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
						if (oThemeStyle[0].styleSheet && !Utils.isUnd(oThemeStyle[0].styleSheet.cssText))
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

	Utils.substr = window.String.substr;
	if ('ab'.substr(-1) !== 'b')
	{
		Utils.substr = function(sStr, iStart, iLength)
		{
			if (iStart < 0)
			{
				iStart = sStr.length + iStart;
			}

			return sStr.substr(iStart, iLength);
		};
	}

	module.exports = Utils;

}());