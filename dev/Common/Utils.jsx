
import window from 'window';
import $ from '$';
import _ from '_';
import ko from 'ko';
import {$win, $div, dropdownVisibility, data as GlobalsData} from 'Common/Globals';
import {ComposeType, EventKeyCode, SaveSettingsStep, FolderType} from 'Common/Enums';
import {Mime} from 'Common/Mime';

import JSEncrypt from 'JSEncrypt';
import Autolinker from 'Autolinker';

const trim = $.trim;
const inArray = $.inArray;
const isArray = _.isArray;
const isObject = _.isObject;
const isFunc = _.isFunction;
const isUnd = _.isUndefined;
const isNull = _.isNull;
const has = _.has;
const bind = _.bind;
const noop = () => {};
const noopTrue = () => true;
const noopFalse = () => false;

export {trim, inArray, isArray, isObject, isFunc, isUnd, isNull, has, bind, noop, noopTrue, noopFalse};

/**
 * @param {Function} callback
 */
export function silentTryCatch(callback)
{
	try {
		callback();
	} catch (e) {/* eslint-disable-line no-empty */}
}

/**
 * @param {*} value
 * @return {boolean}
 */
export function isNormal(value)
{
	return !isUnd(value) && !isNull(value);
}

/**
 * @param {(string|number)} value
 * @param {boolean=} includeZero = true
 * @return {boolean}
 */
export function isPosNumeric(value, includeZero = true)
{
	return !isNormal(value) ? false :
		(includeZero ? (/^[0-9]*$/).test(value.toString()) : (/^[1-9]+[0-9]*$/).test(value.toString()));
}

/**
 * @param {*} value
 * @param {number=} defaultValur = 0
 * @return {number}
 */
export function pInt(value, defaultValur = 0)
{
	const result = isNormal(value) && '' !== value ? window.parseInt(value, 10) : defaultValur;
	return window.isNaN(result) ? defaultValur : result;
}

/**
 * @param {*} value
 * @return {string}
 */
export function pString(value)
{
	return isNormal(value) ? '' + value : '';
}

/**
 * @param {*} value
 * @return {boolean}
 */
export function pBool(value)
{
	return !!value;
}

/**
 * @param {*} values
 * @return {boolean}
 */
export function isNonEmptyArray(values)
{
	return isArray(values) && 0 < values.length;
}

/**
 * @param {string} component
 * @return {string}
 */
export function encodeURIComponent(component)
{
	return window.encodeURIComponent(component);
}

/**
 * @param {string} component
 * @return {string}
 */
export function decodeURIComponent(component)
{
	return window.decodeURIComponent(component);
}

/**
 * @param {string} queryString
 * @return {Object}
 */
export function simpleQueryParser(queryString)
{
	let
		params = {},
		queries = [],
		temp = [],
		index = 0,
		len = 0
	;

	queries = queryString.split('&');
	for (index = 0, len = queries.length; index < len; index++)
	{
		temp = queries[index].split('=');
		params[decodeURIComponent(temp[0])] = decodeURIComponent(temp[1]);
	}

	return params;
}

/**
 * @param {number=} len = 32
 * @return {string}
 */
export function fakeMd5(len = 32)
{
	const
		line = '0123456789abcdefghijklmnopqrstuvwxyz',
		lineLen = line.length
	;

	len = pInt(len);

	let result = '';
	while (result.length < len)
	{
		result += line.substr(window.Math.round(window.Math.random() * lineLen), 1);
	}

	return result;
}

let encryptObject = null;

/**
 * @param {constructor} JSEncryptClass
 * @param {string} publicKey
 * @return {JSEncrypt|boolean}
 */
const rsaObject = (JSEncryptClass, publicKey) => {

	if (JSEncryptClass && publicKey && (null === encryptObject || (encryptObject && encryptObject.__publicKey !== publicKey)) &&
		window.crypto && window.crypto.getRandomValues)
	{
		encryptObject = new JSEncryptClass();
		encryptObject.setPublicKey(publicKey);
		encryptObject.__publicKey = publicKey;
	}
	else
	{
		encryptObject = false;
	}

	return encryptObject;
};

/**
 * @param {string} value
 * @param {string} publicKey
 * @return {string}
 */
const rsaEncode = (value, publicKey) => {

	if (window.crypto && window.crypto.getRandomValues && publicKey)
	{
		let
			resultValue = false,
			encrypt = rsaObject(JSEncrypt, publicKey)
		;

		if (encrypt)
		{
			resultValue = encrypt.encrypt(fakeMd5() + ':' + value + ':' + fakeMd5());
			if (false !== resultValue && isNormal(resultValue))
			{
				return 'rsa:xxx:' + resultValue;
			}
		}
	}

	return value;
};

rsaEncode.supported = !!(window.crypto && window.crypto.getRandomValues && false && JSEncrypt);

export {rsaEncode};

/**
 * @param {string} text
 * @return {string}
 */
export function encodeHtml(text)
{
	return isNormal(text) ? _.escape(text.toString()) : '';
}

/**
 * @param {string} text
 * @param {number=} iLen = 100
 * @return {string}
 */
export function splitPlainText(text, len = 100)
{
	let
		prefix = '',
		subText = '',
		result = text,
		spacePos = 0,
		newLinePos = 0
	;

	while (result.length > len)
	{
		subText = result.substring(0, len);
		spacePos = subText.lastIndexOf(' ');
		newLinePos = subText.lastIndexOf('\n');

		if (-1 !== newLinePos)
		{
			spacePos = newLinePos;
		}

		if (-1 === spacePos)
		{
			spacePos = len;
		}

		prefix += subText.substring(0, spacePos) + '\n';
		result = result.substring(spacePos + 1);
	}

	return prefix + result;
}

const timeOutAction = (function () {
	let timeOuts = {};
	return (action, fFunction, timeOut) => {
		timeOuts[action] = isUnd(timeOuts[action]) ? 0 : timeOuts[action];
		window.clearTimeout(timeOuts[action]);
		timeOuts[action] = window.setTimeout(fFunction, timeOut);
	};
}());

const timeOutActionSecond = (function () {
	let timeOuts = {};
	return (action, fFunction, timeOut) => {
		if (!timeOuts[action])
		{
			timeOuts[action] = window.setTimeout(() => {
				fFunction();
				timeOuts[action] = 0;
			}, timeOut);
		}
	};
}());

export {timeOutAction, timeOutActionSecond};

/**
 * @return {boolean}
 */
export function inFocus()
{
	if (window.document.activeElement)
	{
		if (isUnd(window.document.activeElement.__inFocusCache))
		{
			window.document.activeElement.__inFocusCache = $(window.document.activeElement).is('input,textarea,iframe,.cke_editable');
		}

		return !!window.document.activeElement.__inFocusCache;
	}

	return false;
}

export function removeInFocus(force)
{
	if (window.document && window.document.activeElement && window.document.activeElement.blur)
	{
		try {
			const activeEl = $(window.document.activeElement);
			if (activeEl && activeEl.is('input,textarea'))
			{
				window.document.activeElement.blur();
			}
			else if (force)
			{
					window.document.activeElement.blur();
			}
		} catch (e) {/* eslint-disable-line no-empty */}
	}
}

export function removeSelection()
{
	try {
		if (window && window.getSelection)
		{
			const sel = window.getSelection();
			if (sel && sel.removeAllRanges)
			{
				sel.removeAllRanges();
			}
		}
		else if (window.document && window.document.selection && window.document.selection.empty)
		{
			window.document.selection.empty();
		}
	} catch (e) {/* eslint-disable-line no-empty */}
}

/**
 * @param {string} prefix
 * @param {string} subject
 * @return {string}
 */
export function replySubjectAdd(prefix, subject)
{
	prefix = trim(prefix.toUpperCase());
	subject = trim(subject.replace(/[\s]+/g, ' '));

	let
		drop = false,
		parts = [],
		re = 'RE' === prefix,
		fwd = 'FWD' === prefix,
		prefixIsRe = !fwd
	;

	if ('' !== subject)
	{
		_.each(subject.split(':'), (part) => {
			const trimmedPart = trim(part);
			if (!drop && (/^(RE|FWD)$/i.test(trimmedPart) || /^(RE|FWD)[\[\(][\d]+[\]\)]$/i.test(trimmedPart)))
			{
				if (!re)
				{
					re = !!(/^RE/i.test(trimmedPart));
				}

				if (!fwd)
				{
					fwd = !!(/^FWD/i.test(trimmedPart));
				}
			}
			else
			{
				parts.push(part);
				drop = true;
			}
		});
	}

	if (prefixIsRe)
	{
		re = false;
	}
	else
	{
		fwd = false;
	}

	return trim(
		(prefixIsRe ? 'Re: ' : 'Fwd: ') +
		(re ? 'Re: ' : '') +
		(fwd ? 'Fwd: ' : '') +
		trim(parts.join(':'))
	);
}

/**
 * @param {number} num
 * @param {number} dec
 * @return {number}
 */
export function roundNumber(num, dec)
{
	return window.Math.round(num * window.Math.pow(10, dec)) / window.Math.pow(10, dec);
}

/**
 * @param {(number|string)} sizeInBytes
 * @return {string}
 */
export function friendlySize(sizeInBytes)
{
	sizeInBytes = pInt(sizeInBytes);

	if (sizeInBytes >= 1073741824)
	{
		return roundNumber(sizeInBytes / 1073741824, 1) + 'GB';
	}
	else if (sizeInBytes >= 1048576)
	{
		return roundNumber(sizeInBytes / 1048576, 1) + 'MB';
	}
	else if (sizeInBytes >= 1024)
	{
		return roundNumber(sizeInBytes / 1024, 0) + 'KB';
	}

	return sizeInBytes + 'B';
}

/**
 * @param {string} desc
 */
export function log(desc)
{
	if (window.console && window.console.log)
	{
		window.console.log(desc);
	}
}

/**
 * @param {?} object
 * @param {string} methodName
 * @param {Array=} params
 * @param {number=} delay = 0
 */
export function delegateRun(object, methodName, params, delay = 0)
{
	if (object && object[methodName])
	{
		delay = pInt(delay);
		if (0 >= delay)
		{
			object[methodName].apply(object, isArray(params) ? params : []);
		}
		else
		{
			_.delay(() => {
				object[methodName].apply(object, isArray(params) ? params : []);
			}, delay);
		}
	}
}

/**
 * @param {?} event
 */
export function kill_CtrlA_CtrlS(event)
{
	event = event || window.event;
	if (event && event.ctrlKey && !event.shiftKey && !event.altKey)
	{
		const key = event.keyCode || event.which;
		if (key === EventKeyCode.S)
		{
			event.preventDefault();
			return;
		}
		else if (key === EventKeyCode.A)
		{
			const sender = event.target || event.srcElement;
			if (sender && ('true' === '' + sender.contentEditable ||
				(sender.tagName && sender.tagName.match(/INPUT|TEXTAREA/i))))
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

			event.preventDefault();
		}
	}
}

/**
 * @param {(Object|null|undefined)} context
 * @param {Function} fExecute
 * @param {(Function|boolean|null)=} fCanExecute = true
 * @return {Function}
 */
export function createCommand(context, fExecute, fCanExecute = true)
{

	let
		fResult = null,
		fNonEmpty = (...args) => {
			if (fResult && fResult.canExecute && fResult.canExecute())
			{
				fExecute.apply(context, args);
			}
			return false;
		}
	;

	fResult = fExecute ? fNonEmpty : noop;
	fResult.enabled = ko.observable(true);

	if (isFunc(fCanExecute))
	{
		fResult.canExecute = ko.computed(() => {
			return fResult.enabled() && fCanExecute.call(context);
		});
	}
	else
	{
		fResult.canExecute = ko.computed(() => {
			return fResult.enabled() && !!fCanExecute;
		});
	}

	return fResult;
}

/**
 * @param {string} theme
 * @return {string}
 */
export const convertThemeName = _.memoize((theme) => {

	if ('@custom' === theme.substr(-7))
	{
		theme = trim(theme.substring(0, theme.length - 7));
	}

	return trim(theme.replace(/[^a-zA-Z0-9]+/g, ' ').replace(/([A-Z])/g, ' $1').replace(/[\s]+/g, ' '));
});

/**
 * @param {string} name
 * @return {string}
 */
export function quoteName(name)
{
	return name.replace(/["]/g, '\\"');
}

/**
 * @return {number}
 */
export function microtime()
{
	return (new window.Date()).getTime();
}

/**
 * @return {number}
 */
export function timestamp()
{
	return window.Math.round(microtime() / 1000);
}

/**
 *
 * @param {string} language
 * @param {boolean=} isEng = false
 * @return {string}
 */
export function convertLangName(language, isEng = false)
{
	return require('Common/Translator').i18n('LANGS_NAMES' + (true === isEng ? '_EN' : '') + '/LANG_' +
		language.toUpperCase().replace(/[^a-zA-Z0-9]+/g, '_'), null, language);
}

export function draggablePlace()
{
	return $('<div class="draggablePlace">' +
		'<span class="text"></span>&nbsp;' +
		'<i class="icon-copy icon-white visible-on-ctrl"></i>' +
		'<i class="icon-mail icon-white hidden-on-ctrl"></i></div>').appendTo('#rl-hidden');
}

export function defautOptionsAfterRender(domOption, item)
{
	if (item && !isUnd(item.disabled) && domOption)
	{
		$(domOption)
			.toggleClass('disabled', item.disabled)
			.prop('disabled', item.disabled)
		;
	}
}

/**
 * @param {string} title
 * @param {Object} body
 * @param {boolean} isHtml
 * @param {boolean} print
 */
export function clearBqSwitcher(body)
{
	body.find('blockquote.rl-bq-switcher').removeClass('rl-bq-switcher hidden-bq');
	body.find('.rlBlockquoteSwitcher').off('.rlBlockquoteSwitcher').remove();
	body.find('[data-html-editor-font-wrapper]').removeAttr('data-html-editor-font-wrapper');
}

/**
 * @param {string} title
 * @param {Object} body
 * @param {boolean} isHtml
 * @param {boolean} print
 */
export function previewMessage(title, body, isHtml, print)
{
	const
		win = window.open(''),
		doc = win.document,
		bodyClone = body.clone(),
		bodyClass = isHtml ? 'html' : 'plain'
	;

	clearBqSwitcher(bodyClone);

	const html = bodyClone ? bodyClone.html() : '';

	title = encodeHtml(title);

	doc.write(`<html>
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="user-scalable=no" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="robots" content="noindex, nofollow, noodp" />
	<title>${title}</title>
	<style>
html, body {
	background-color: #fff;
	font-size: 13px;
	font-family: arial, sans-serif;
}

a {color: blue; text-decoration: underline}
a:visited {color: #609}
a:active {color: red}
blockquote {border-left: 2px solid black; margin: 0; padding: 0px 10px}

pre {
	margin: 0px;
	padding: 0px;
	font-family: Monaco, Menlo, Consolas, 'Courier New', monospace;
	background: #fff;
	border: none;
	white-space: pre-wrap;
	word-wrap: break-word;
	word-break: break-all;
}

body.html pre {
	font-family: Monaco, Menlo, Consolas, 'Courier New', monospace;
	white-space: pre-wrap;
	word-wrap: break-word;
	word-break: normal;
}

body.plain {

	padding: 15px;
	white-space: pre-wrap;
	font-family: Monaco, Menlo, Consolas, 'Courier New', monospace;
}

body.plain pre {
	margin: 0px;
	padding: 0px;
	background: #fff;
	border: none;
	font-family: Monaco, Menlo, Consolas, 'Courier New', monospace;
	white-space: pre-wrap;
	word-wrap: break-word;
	word-break: normal;
}

body.plain blockquote {
	border-left: 2px solid blue;
	color: blue;
}

body.plain blockquote blockquote {
	border-left: 2px solid green;
	color: green;
}

body.plain blockquote blockquote blockquote {
	border-left: 2px solid red;
	color: red;
}
	</style>
</head>
<body class="${bodyClass}">${html}</body>
</html>`);

	doc.close();

	if (print)
	{
		window.setTimeout(() => win.print(), 100);
	}
}

/**
 * @param {Object} viewModel
 * @param {string} templateID
 * @param {string} title
 * @param {Function=} fCallback = null
 */
export function windowPopupKnockout(viewModel, templateID, title, fCallback = null)
{
	const
		win = window.open(''),
		doc = win.document,
		func = 'openerApplyBindingsUid' + fakeMd5(),
		template = $('#' + templateID)
	;

	window[func] = () => {

		if (win && doc && doc.body && template && template[0])
		{
			const body = $(doc.body);

			$('#rl-content', body).html(template.html());
			$('html', doc).addClass('external ' + $('html').attr('class'));

			require('Common/Translator').i18nToNodes(body);

			if (viewModel && $('#rl-content', body)[0])
			{
				ko.applyBindings(viewModel, $('#rl-content', body)[0]);
			}

			window[func] = null;

			if (fCallback)
			{
				fCallback(win);
			}
		}
	};

	doc.open();
	doc.write(trim(`
<html>
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="user-scalable=no" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="robots" content="noindex, nofollow, noodp" />
	<title>${encodeHtml(title)}</title>
</head>
<body><div id="rl-content"></div></body>
</html>
`));
	doc.close();

	const script = doc.createElement('script');
	script.type = 'text/javascript';
	script.innerHTML = `if(window&&window.opener&&window.opener['${func}']){window.opener['${func}']();}`;

	doc.getElementsByTagName('head')[0].appendChild(script);
}

/**
 * @param {Function} fCallback
 * @param {?} koTrigger
 * @param {?} context = null
 * @param {number=} timer = 1000
 * @return {Function}
 */
export function settingsSaveHelperFunction(fCallback, koTrigger, context = null, timer = 1000)
{
	timer = pInt(timer);
	return (type, data, cached, requestAction, requestParameters) => {
		koTrigger.call(context, data && data.Result ? SaveSettingsStep.TrueResult : SaveSettingsStep.FalseResult);
		if (fCallback)
		{
			fCallback.call(context, type, data, cached, requestAction, requestParameters);
		}
		_.delay(() => {
			koTrigger.call(context, SaveSettingsStep.Idle);
		}, timer);
	};
}

export function settingsSaveHelperSimpleFunction(koTrigger, context)
{
	return settingsSaveHelperFunction(null, koTrigger, context, 1000);
}

export function settingsSaveHelperSubscribeFunction(remote, settingName, type, fTriggerFunction)
{
	return (value) => {

		if (remote)
		{
			switch (type)
			{
				default:
					value = pString(value);
					break;
				case 'bool':
				case 'boolean':
					value = value ? '1' : '0';
					break;
				case 'int':
				case 'integer':
				case 'number':
					value = pInt(value);
					break;
				case 'trim':
					value = trim(value);
					break;
			}

			let data = {};
			data[settingName] = value;

			if (remote.saveAdminConfig)
			{
				remote.saveAdminConfig(fTriggerFunction || null, data);
			}
			else if (remote.saveSettings)
			{
				remote.saveSettings(fTriggerFunction || null, data);
			}
		}
	};
}

/**
 * @param {string} html
 * @return {string}
 */
export function findEmailAndLinks(html)
{
//	return html;
	return Autolinker.link(html, {
		newWindow: true,
		stripPrefix: false,
		urls: true,
		email: true,
		twitter: false,
		replaceFn: function (autolinker, match) {
			return !(autolinker && match && 'url' === match.getType() && match.matchedText && 0 !== match.matchedText.indexOf('http'));
		}
	});
}

/**
 * @param {string} html
 * @return {string}
 */
export function htmlToPlain(html)
{
	let
		iPos = 0,
		iP1 = 0,
		iP2 = 0,
		iP3 = 0,
		iLimit = 0,

		text = '',

		convertBlockquote = (blockquoteText) => {
			blockquoteText = '> ' + trim(blockquoteText).replace(/\n/gm, '\n> ');
			return blockquoteText.replace(/(^|\n)([> ]+)/gm, (...args) => {
				return (args && 2 < args.length) ? args[1] + trim(args[2].replace(/[\s]/g, '')) + ' ' : '';
			});
		},

		convertDivs = (...args) => {
			if (args && 1 < args.length)
			{
				let divText = trim(args[1]);
				if (0 < divText.length)
				{
					divText = divText.replace(/<div[^>]*>([\s\S\r\n]*)<\/div>/gmi, convertDivs);
					divText = '\n' + trim(divText) + '\n';
				}

				return divText;
			}

			return '';
		},

		convertPre = (...args) => {
			return (args && 1 < args.length) ?
				args[1].toString()
					.replace(/[\n]/gm, '<br />')
					.replace(/[\r]/gm, '')
				: '';
		},

		fixAttibuteValue = (...args) => {
			return (args && 1 < args.length) ? '' + args[1] + _.escape(args[2]) : '';
		},

		convertLinks = (...args) => {
			return (args && 1 < args.length) ? trim(args[1]) : '';
		}
	;

	text = html
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

	text = $div.html(text).text();

	text = text
		.replace(/\n[ \t]+/gm, '\n')
		.replace(/[\n]{3,}/gm, '\n\n')
		.replace(/&gt;/gi, '>')
		.replace(/&lt;/gi, '<')
		.replace(/&amp;/gi, '&')
	;

	text = splitPlainText(trim(text));

	iPos = 0;
	iLimit = 800;

	while (0 < iLimit)
	{
		iLimit--;
		iP1 = text.indexOf('__bq__start__', iPos);
		if (-1 < iP1)
		{
			iP2 = text.indexOf('__bq__start__', iP1 + 5);
			iP3 = text.indexOf('__bq__end__', iP1 + 5);

			if ((-1 === iP2 || iP3 < iP2) && iP1 < iP3)
			{
				text = text.substring(0, iP1) +
					convertBlockquote(text.substring(iP1 + 13, iP3)) +
					text.substring(iP3 + 11);

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

	text = text
		.replace(/__bq__start__/gm, '')
		.replace(/__bq__end__/gm, '')
	;

	return text;
}

/**
 * @param {string} plain
 * @param {boolean} findEmailAndLinksInText = false
 * @return {string}
 */
export function plainToHtml(plain, findEmailAndLinksInText = false)
{
	plain = plain.toString().replace(/\r/g, '');

	let
		bIn = false,
		bDo = true,
		bStart = true,
		aNextText = [],
		sLine = '',
		iIndex = 0,
		aText = plain.split('\n')
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

	plain = aText.join('\n');

	plain = plain
//			.replace(/~~~\/blockquote~~~\n~~~blockquote~~~/g, '\n')
		.replace(/&/g, '&amp;')
		.replace(/>/g, '&gt;').replace(/</g, '&lt;')
		.replace(/~~~blockquote~~~[\s]*/g, '<blockquote>')
		.replace(/[\s]*~~~\/blockquote~~~/g, '</blockquote>')
		.replace(/\u200C([\s\S]*)\u200C/g, '\u0002$1\u0002')
		.replace(/\n/g, '<br />')
	;

	return findEmailAndLinksInText ? findEmailAndLinks(plain) : plain;
}

window.rainloop_Utils_htmlToPlain = htmlToPlain;
window.rainloop_Utils_plainToHtml = plainToHtml;


/**
 * @param {string} url
 * @param {number} value
 * @param {Function} fCallback
 */
export function resizeAndCrop(url, value, fCallback)
{
	const img = new window.Image();
	img.onload = function() {

		let
			diff = [0, 0],
			canvas = window.document.createElement('canvas'),
			ctx = canvas.getContext('2d')
		;

		canvas.width = value;
		canvas.height = value;

		if (this.width > this.height)
		{
			diff = [this.width - this.height, 0];
		}
		else
		{
			diff = [0, this.height - this.width];
		}

		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, value, value);
		ctx.drawImage(this, diff[0] / 2, diff[1] / 2, this.width - diff[0], this.height - diff[1], 0, 0, value, value);

		fCallback(canvas.toDataURL('image/jpeg'));
	};

	img.src = url;
}

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
export function folderListOptionsBuilder(aSystem, aList, aDisabled, aHeaderLines,
	iUnDeep, fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible)
{
	let
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

	bBuildUnvisible = isUnd(bBuildUnvisible) ? false : !!bBuildUnvisible;
	bSystem = !isNormal(bSystem) ? 0 < aSystem.length : bSystem;
	iUnDeep = !isNormal(iUnDeep) ? 0 : iUnDeep;
	fDisableCallback = isNormal(fDisableCallback) ? fDisableCallback : null;
	fVisibleCallback = isNormal(fVisibleCallback) ? fVisibleCallback : null;
	fRenameCallback = isNormal(fRenameCallback) ? fRenameCallback : null;

	if (!isArray(aDisabled))
	{
		aDisabled = [];
	}

	if (!isArray(aHeaderLines))
	{
		aHeaderLines = [];
	}

	for (iIndex = 0, iLen = aHeaderLines.length; iIndex < iLen; iIndex++)
	{
		aResult.push({
			id: aHeaderLines[iIndex][0],
			name: aHeaderLines[iIndex][1],
			system: false,
			seporator: false,
			disabled: false
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
					id: '---',
					name: '---',
					system: false,
					seporator: true,
					disabled: true
				});
			}

			bSep = false;
			aResult.push({
				id: oItem.fullNameRaw,
				name: fRenameCallback ? fRenameCallback.call(null, oItem) : oItem.name(),
				system: true,
				seporator: false,
				disabled: !oItem.selectable || -1 < inArray(oItem.fullNameRaw, aDisabled) ||
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
				if (FolderType.User === oItem.type() || !bSystem || oItem.hasSubScribedSubfolders())
				{
					if (bSep && 0 < aResult.length)
					{
						aResult.push({
							id: '---',
							name: '---',
							system: false,
							seporator: true,
							disabled: true
						});
					}

					bSep = false;
					aResult.push({
						id: oItem.fullNameRaw,
						name: (new window.Array(oItem.deep + 1 - iUnDeep)).join(sDeepPrefix) +
							(fRenameCallback ? fRenameCallback.call(null, oItem) : oItem.name()),
						system: false,
						seporator: false,
						disabled: !oItem.selectable || -1 < inArray(oItem.fullNameRaw, aDisabled) ||
							(fDisableCallback ? fDisableCallback.call(null, oItem) : false)
					});
				}
			}
		}

		if (oItem.subScribed() && 0 < oItem.subFolders().length)
		{
			aResult = aResult.concat(folderListOptionsBuilder([], oItem.subFolders(), aDisabled, [],
				iUnDeep, fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible));
		}
	}

	return aResult;
}

export function computedPagenatorHelper(koCurrentPage, koPageCount)
{
	return () => {

		let
			iPrev = 0,
			iNext = 0,
			iLimit = 2,
			result = [],
			iCurrentPage = koCurrentPage(),
			iPageCount = koPageCount(),

			/**
			 * @param {number} index
			 * @param {boolean=} push = true
			 * @param {string=} customName = ''
			 */
			fAdd = (index, push = true, customName = '') => {

				const data = {
					current: index === iCurrentPage,
					name: isUnd(customName) || '' === customName ? index.toString() : customName.toString(),
					custom: isUnd(customName) || '' === customName ? false : true,
					title: isUnd(customName) || '' === customName ? '' : index.toString(),
					value: index.toString()
				};

				if (push)
				{
					result.push(data);
				}
				else
				{
					result.unshift(data);
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

		return result;
	};
}

export function selectElement(element)
{
	let sel, range;
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
}

export const detectDropdownVisibility = _.debounce(() => {
	dropdownVisibility(!!_.find(GlobalsData.aBootstrapDropdowns, (item) => {
		return item.hasClass('open');
	}));
}, 50);

/**
 * @param {boolean=} delay = false
 */
export function triggerAutocompleteInputChange(delay = false) {

	const fFunc = () => {
		$('.checkAutocomplete').trigger('change');
	};

	if (delay)
	{
		_.delay(fFunc, 100);
	}
	else
	{
		fFunc();
	}
}

/**
 * @param {string} fileName
 * @return {string}
 */
export function getFileExtension(fileName)
{
	fileName = trim(fileName).toLowerCase();

	const result = fileName.split('.').pop();
	return (result === fileName) ? '' : result;
}

let configurationScriptTagCache = {};

/**
 * @param {string} configuration
 * @return {object}
 */
export function getConfigurationFromScriptTag(configuration)
{
	let result = {};

	if (!configurationScriptTagCache[configuration])
	{
		configurationScriptTagCache[configuration] = $('script[type="application/json"][data-configuration="' + configuration + '"]');
	}

	try {
		result = JSON.parse(configurationScriptTagCache[configuration].text());
	} catch (e) {/* eslint-disable-line no-empty */}

	return result;
}

/**
 * @param {string} fileName
 * @return {string}
 */
export function mimeContentType(fileName)
{
	let
		ext = '',
		result = 'application/octet-stream'
	;

	fileName = trim(fileName).toLowerCase();

	if ('winmail.dat' === fileName)
	{
		return 'application/ms-tnef';
	}

	ext = getFileExtension(fileName);
	if (ext && 0 < ext.length && !isUnd(Mime[ext]))
	{
		result = Mime[ext];
	}

	return result;
}

/**
 * @param {mixed} mPropOrValue
 * @param {mixed} value
 */
export function disposeOne(propOrValue, value)
{
	const disposable = value || propOrValue;
	if (disposable && typeof disposable.dispose === 'function')
	{
		disposable.dispose();
	}
}

/**
 * @param {Object} object
 */
export function disposeObject(object)
{
	if (object)
	{
		if (isArray(object.disposables))
		{
			_.each(object.disposables, disposeOne);
		}

		ko.utils.objectForEach(object, disposeOne);
	}
}

/**
 * @param {Object|Array} objectOrObjects
 */
export function delegateRunOnDestroy(objectOrObjects)
{
	if (objectOrObjects)
	{
		if (isArray(objectOrObjects))
		{
			_.each(objectOrObjects, (item) => {
				delegateRunOnDestroy(item);
			});
		}
		else if (objectOrObjects && objectOrObjects.onDestroy)
		{
			objectOrObjects.onDestroy();
		}
	}
}

export function appendStyles($styleTag, css)
{
	if ($styleTag && $styleTag[0])
	{
		if ($styleTag[0].styleSheet && !isUnd($styleTag[0].styleSheet.cssText))
		{
			$styleTag[0].styleSheet.cssText = css;
		}
		else
		{
			$styleTag.text(css);
		}

		return true;
	}

	return false;
}

let
	__themeTimer = 0,
	__themeAjax = null
;

export function changeTheme(value, themeTrigger)
{
	let
		themeLink = $('#app-theme-link'),
		themeStyle = $('#app-theme-style'),
		url = themeLink.attr('href')
	;

	if (!url)
	{
		url = themeStyle.attr('data-href');
	}

	if (url)
	{
		url = url.toString().replace(/\/-\/[^\/]+\/\-\//, '/-/' + value + '/-/');
		url = url.toString().replace(/\/Css\/[^\/]+\/User\//, '/Css/0/User/');
		url = url.toString().replace(/\/Hash\/[^\/]+\//, '/Hash/-/');

		if ('Json/' !== url.substring(url.length - 5, url.length))
		{
			url += 'Json/';
		}

		window.clearTimeout(__themeTimer);
		themeTrigger(SaveSettingsStep.Animate);

		if (__themeAjax && __themeAjax.abort)
		{
			__themeAjax.abort();
		}

		__themeAjax = $.ajax({
			url: url,
			dataType: 'json'
		}).done((data) => {

			if (data && isArray(data) && 2 === data.length)
			{
				if (themeLink && themeLink[0] && (!themeStyle || !themeStyle[0]))
				{
					themeStyle = $('<style id="app-theme-style"></style>');
					themeLink.after(themeStyle);
					themeLink.remove();
				}

				if (themeStyle && themeStyle[0])
				{
					if (appendStyles(themeStyle, data[1]))
					{
						themeStyle.attr('data-href', url).attr('data-theme', data[0]);
					}
				}

				themeTrigger(SaveSettingsStep.TrueResult);
			}

		}).always(() => {

			__themeTimer = window.setTimeout(() => {
				themeTrigger(SaveSettingsStep.Idle);
			}, 1000);

			__themeAjax = null;
		});
	}
}

let substr = window.String.substr;
if ('ab'.substr(-1) !== 'b')
{
	substr = (str, start, length) => {
		start = start < 0 ? str.length + start : start;
		return str.substr(start, length);
	};
}

export {substr};

/**
 * @param {string} mailToUrl
 * @param {Function} PopupComposeVoreModel
 * @return {boolean}
 */
export function mailToHelper(mailToUrl, PopupComposeVoreModel)
{
	if (mailToUrl && 'mailto:' === mailToUrl.toString().substr(0, 7).toLowerCase())
	{
		if (!PopupComposeVoreModel)
		{
			return true;
		}

		mailToUrl = mailToUrl.toString().substr(7);

		let
			to = [],
			cc = null,
			bcc = null,
			params = {},
			EmailModel = require('Model/Email'),
			email = mailToUrl.replace(/\?.+$/, ''),
			queryString = mailToUrl.replace(/^[^\?]*\?/, ''),
			fParseEmailLine = (line) => {
				return line ? _.compact(_.map(decodeURIComponent(line).split(/[,]/), (item) => {
					const emailObj = new EmailModel();
					emailObj.mailsoParse(item);
					return '' !== emailObj.email ? emailObj : null;
				})) : null;
			}
		;

		to = fParseEmailLine(email);

		params = simpleQueryParser(queryString);

		if (!isUnd(params.cc))
		{
			cc = fParseEmailLine(decodeURIComponent(params.cc));
		}

		if (!isUnd(params.bcc))
		{
			bcc = fParseEmailLine(decodeURIComponent(params.bcc));
		}

		require('Knoin/Knoin').showScreenPopup(PopupComposeVoreModel, [
			ComposeType.Empty, null, to, cc, bcc,
			isUnd(params.subject) ? null : pString(decodeURIComponent(params.subject)),
			isUnd(params.body) ? null : plainToHtml(pString(decodeURIComponent(params.body)))
		]);

		return true;
	}

	return false;
}

export const windowResize = _.debounce((timeout) => {
	if (isUnd(timeout) || isNull(timeout))
	{
		$win.resize();
	}
	else
	{
		window.setTimeout(() => {
			$win.resize();
		}, timeout);
	}
}, 50);

export function windowResizeCallback()
{
	windowResize();
}
