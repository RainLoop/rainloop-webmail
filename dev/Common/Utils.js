import ko from 'ko';

import { $win, dropdownVisibility, data as GlobalsData } from 'Common/Globals';
import { ComposeType, SaveSettingsStep, FolderType } from 'Common/Enums';
import { Mime } from 'Common/Mime';

const
	$ = jQuery,
	$div = $('<div></div>'),
	isArray = Array.isArray,
	htmlmap = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;'
	},
	htmlspecialchars = str => (''+str).replace(/[&<>"']/g, m => htmlmap[m]);

/**
 * @param {*} value
 * @returns {boolean}
 */
export function isNormal(value) {
	return undefined !== value && null !== value;
}

/**
 * @param {(string|number)} value
 * @param {boolean=} includeZero = true
 * @returns {boolean}
 */
export function isPosNumeric(value, includeZero = true) {
	return !isNormal(value)
		? false
		: includeZero
		? /^[0-9]*$/.test(value.toString())
		: /^[1-9]+[0-9]*$/.test(value.toString());
}

/**
 * @param {*} value
 * @param {number=} defaultValur = 0
 * @returns {number}
 */
export function pInt(value, defaultValur = 0) {
	const result = isNormal(value) && value ? parseInt(value, 10) : defaultValur;
	return isNaN(result) ? defaultValur : result;
}

/**
 * @param {*} value
 * @returns {string}
 */
export function pString(value) {
	return isNormal(value) ? '' + value : '';
}

/**
 * @param {*} values
 * @returns {boolean}
 */
export function isNonEmptyArray(values) {
	return isArray(values) && values.length;
}

/**
 * @param {string} queryString
 * @returns {Object}
 */
export function simpleQueryParser(queryString) {
	const queries = queryString.split('&'),
		params = {};

	queries.forEach(temp => {
		temp = temp.split('=');
		params[decodeURIComponent(temp[0])] = decodeURIComponent(temp[1]);
	});

	return params;
}

/**
 * @param {number=} len = 32
 * @returns {string}
 */
export function fakeMd5(len = 32) {
	const line = '0123456789abcdefghijklmnopqrstuvwxyz';

	len = pInt(len);

	let result = '';
	while (len--)
		result += line.substr(Math.round(Math.random() * 36), 1);

	return result;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function encodeHtml(text) {
	return isNormal(text) ? htmlspecialchars(text.toString()) : '';
}

/**
 * @param {string} text
 * @param {number=} len = 100
 * @returns {string}
 */
export function splitPlainText(text, len = 100) {
	let prefix = '',
		subText = '',
		result = text,
		spacePos = 0,
		newLinePos = 0;

	while (result.length > len) {
		subText = result.substring(0, len);
		spacePos = subText.lastIndexOf(' ');
		newLinePos = subText.lastIndexOf('\n');

		if (-1 !== newLinePos) {
			spacePos = newLinePos;
		}

		if (-1 === spacePos) {
			spacePos = len;
		}

		prefix += subText.substring(0, spacePos) + '\n';
		result = result.substring(spacePos + 1);
	}

	return prefix + result;
}

const timeOutAction = (() => {
	const timeOuts = {};
	return (action, fFunction, timeOut) => {
		timeOuts[action] = undefined === timeOuts[action] ? 0 : timeOuts[action];
		clearTimeout(timeOuts[action]);
		timeOuts[action] = setTimeout(fFunction, timeOut);
	};
})();

export { timeOutAction };

/**
 * @param {any} m
 * @returns {any}
 */
export function deModule(m) {
	return (m && m.default ? m.default : m) || '';
}

/**
 * @returns {boolean}
 */
export function inFocus() {
	try {
		if (document.activeElement) {
			if (undefined === document.activeElement.__inFocusCache) {
				document.activeElement.__inFocusCache = $(document.activeElement).is(
					'input,textarea,iframe,.cke_editable'
				);
			}

			return !!document.activeElement.__inFocusCache;
		}
	} catch (e) {} // eslint-disable-line no-empty

	return false;
}

/**
 * @param {boolean} force
 * @returns {void}
 */
export function removeInFocus(force) {
	if (document.activeElement && document.activeElement.blur) {
		try {
			const activeEl = $(document.activeElement);
			if (force || (activeEl && activeEl.is('input,textarea'))) {
				document.activeElement.blur();
			}
		} catch (e) {} // eslint-disable-line no-empty
	}
}

/**
 * @returns {void}
 */
export function removeSelection() {
	try {
		getSelection().removeAllRanges();
	} catch (e) {} // eslint-disable-line no-empty
}

/**
 * @param {string} prefix
 * @param {string} subject
 * @returns {string}
 */
export function replySubjectAdd(prefix, subject) {
	prefix = prefix.toUpperCase().trim();
	subject = subject.replace(/[\s]+/g, ' ').trim();

	let drop = false,
		re = 'RE' === prefix,
		fwd = 'FWD' === prefix;

	const parts = [],
		prefixIsRe = !fwd;

	if (subject) {
		subject.split(':').forEach(part => {
			const trimmedPart = part.trim();
			if (!drop && (/^(RE|FWD)$/i.test(trimmedPart) || /^(RE|FWD)[[(][\d]+[\])]$/i.test(trimmedPart))) {
				if (!re) {
					re = !!/^RE/i.test(trimmedPart);
				}

				if (!fwd) {
					fwd = !!/^FWD/i.test(trimmedPart);
				}
			} else {
				parts.push(part);
				drop = true;
			}
		});
	}

	if (prefixIsRe) {
		re = false;
	} else {
		fwd = false;
	}

	return ((prefixIsRe ? 'Re: ' : 'Fwd: ') + (re ? 'Re: ' : '') + (fwd ? 'Fwd: ' : '') + parts.join(':').trim()).trim();
}

/**
 * @param {number} num
 * @param {number} dec
 * @returns {number}
 */
export function roundNumber(num, dec) {
	return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

/**
 * @param {(number|string)} sizeInBytes
 * @returns {string}
 */
export function friendlySize(sizeInBytes) {
	sizeInBytes = pInt(sizeInBytes);

	switch (true) {
		case 1073741824 <= sizeInBytes:
			return roundNumber(sizeInBytes / 1073741824, 1) + 'GB';
		case 1048576 <= sizeInBytes:
			return roundNumber(sizeInBytes / 1048576, 1) + 'MB';
		case 1024 <= sizeInBytes:
			return roundNumber(sizeInBytes / 1024, 0) + 'KB';
		// no default
	}

	return sizeInBytes + 'B';
}

/**
 * @param {?} object
 * @param {string} methodName
 * @param {Array=} params
 * @param {number=} delay = 0
 */
export function delegateRun(object, methodName, params, delay = 0) {
	if (object && object[methodName]) {
		delay = pInt(delay);
		params = isArray(params) ? params : [];

		if (0 >= delay) {
			object[methodName](...params);
		} else {
			setTimeout(() => {
				object[methodName](...params);
			}, delay);
		}
	}
}

/**
 * @param {(Object|null|undefined)} context
 * @param {Function} fExecute
 * @param {(Function|boolean|null)=} fCanExecute = true
 * @returns {Function}
 */
export function createCommandLegacy(context, fExecute, fCanExecute = true) {
	let fResult = null;
	const fNonEmpty = (...args) => {
		if (fResult && fResult.canExecute && fResult.canExecute()) {
			fExecute.apply(context, args);
		}
		return false;
	};

	fResult = fExecute ? fNonEmpty : ()=>{};
	fResult.enabled = ko.observable(true);
	fResult.isCommand = true;

	if (typeof fCanExecute === 'function') {
		fResult.canExecute = ko.computed(() => fResult && fResult.enabled() && fCanExecute.call(context));
	} else {
		fResult.canExecute = ko.computed(() => fResult && fResult.enabled() && !!fCanExecute);
	}

	return fResult;
}

/**
 * @param {string} theme
 * @returns {string}
 */
export const convertThemeName = theme => {
	if ('@custom' === theme.substr(-7)) {
		theme = theme.substring(0, theme.length - 7).trim();
	}

	return theme
			.replace(/[^a-zA-Z0-9]+/g, ' ')
			.replace(/([A-Z])/g, ' $1')
			.replace(/\s+/g, ' ')
			.trim();
};

/**
 *
 * @param {string} language
 * @param {boolean=} isEng = false
 * @returns {string}
 */
export function convertLangName(language, isEng = false) {
	return require('Common/Translator').i18n(
		'LANGS_NAMES' + (true === isEng ? '_EN' : '') + '/LANG_' + language.toUpperCase().replace(/[^a-zA-Z0-9]+/g, '_'),
		null,
		language
	);
}

/**
 * @returns {object}
 */
export function draggablePlace() {
	return $(
		'<div class="draggablePlace">' +
			'<span class="text"></span>&nbsp;' +
			'<i class="icon-copy icon-white visible-on-ctrl"></i>' +
			'<i class="icon-mail icon-white hidden-on-ctrl"></i>' +
			'</div>'
	).appendTo('#rl-hidden');
}

/**
 * @param {object} domOption
 * @param {object} item
 * @returns {void}
 */
export function defautOptionsAfterRender(domItem, item) {
	if (item && undefined !== item.disabled && domItem) {
		$(domItem)
			.toggleClass('disabled', item.disabled)
			.prop('disabled', item.disabled);
	}
}

/**
 * @param {string} title
 * @param {Object} body
 * @param {boolean} isHtml
 * @param {boolean} print
 */
export function clearBqSwitcher(body) {
	body.find('blockquote.rl-bq-switcher').removeClass('rl-bq-switcher hidden-bq');
	body
		.find('.rlBlockquoteSwitcher')
		.off('.rlBlockquoteSwitcher')
		.remove();
	body.find('[data-html-editor-font-wrapper]').removeAttr('data-html-editor-font-wrapper');
}

/**
 * @param {object} messageData
 * @param {Object} body
 * @param {boolean} isHtml
 * @param {boolean} print
 * @returns {void}
 */
export function previewMessage(
	{ title, subject, date, fromCreds, toCreds, toLabel, ccClass, ccCreds, ccLabel },
	body,
	isHtml,
	print
) {
	const win = open(''),
		doc = win.document,
		bodyClone = body.clone(),
		bodyClass = isHtml ? 'html' : 'plain';

	clearBqSwitcher(bodyClone);

	const html = bodyClone ? bodyClone.html() : '';

	doc.write(
		deModule(require('Html/PreviewMessage.html'))
			.replace('{{title}}', encodeHtml(title))
			.replace('{{subject}}', encodeHtml(subject))
			.replace('{{date}}', encodeHtml(date))
			.replace('{{fromCreds}}', encodeHtml(fromCreds))
			.replace('{{toCreds}}', encodeHtml(toCreds))
			.replace('{{toLabel}}', encodeHtml(toLabel))
			.replace('{{ccClass}}', encodeHtml(ccClass))
			.replace('{{ccCreds}}', encodeHtml(ccCreds))
			.replace('{{ccLabel}}', encodeHtml(ccLabel))
			.replace('{{bodyClass}}', bodyClass)
			.replace('{{html}}', html)
	);

	doc.close();

	if (print) {
		setTimeout(() => win.print(), 100);
	}
}

/**
 * @param {Function} fCallback
 * @param {?} koTrigger
 * @param {?} context = null
 * @param {number=} timer = 1000
 * @returns {Function}
 */
export function settingsSaveHelperFunction(fCallback, koTrigger, context = null, timer = 1000) {
	timer = pInt(timer);
	return (type, data, cached, requestAction, requestParameters) => {
		koTrigger.call(context, data && data.Result ? SaveSettingsStep.TrueResult : SaveSettingsStep.FalseResult);
		if (fCallback) {
			fCallback.call(context, type, data, cached, requestAction, requestParameters);
		}
		setTimeout(() => {
			koTrigger.call(context, SaveSettingsStep.Idle);
		}, timer);
	};
}

/**
 * @param {object} koTrigger
 * @param {mixed} context
 * @returns {mixed}
 */
export function settingsSaveHelperSimpleFunction(koTrigger, context) {
	return settingsSaveHelperFunction(null, koTrigger, context, 1000);
}

/**
 * @param {object} remote
 * @param {string} settingName
 * @param {string} type
 * @param {function} fTriggerFunction
 * @returns {function}
 */
export function settingsSaveHelperSubscribeFunction(remote, settingName, type, fTriggerFunction) {
	return (value) => {
		if (remote) {
			switch (type) {
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
					value = value.trim();
					break;
				default:
					value = pString(value);
					break;
			}

			const data = {};
			data[settingName] = value;

			if (remote.saveAdminConfig) {
				remote.saveAdminConfig(fTriggerFunction || null, data);
			} else if (remote.saveSettings) {
				remote.saveSettings(fTriggerFunction || null, data);
			}
		}
	};
}

/**
 * @param {string} html
 * @returns {string}
 */
export function findEmailAndLinks(html) {
	return window.Autolinker
		? window.Autolinker.link(html, {
				newWindow: true,
				stripPrefix: false,
				urls: true,
				email: true,
				mention: false,
				phone: false,
				hashtag: false,
				replaceFn: function(match) {
					return !(match && 'url' === match.getType() && match.matchedText && 0 !== match.matchedText.indexOf('http'));
				}
		  })
		: html;
}

/**
 * @param {string} html
 * @returns {string}
 */
export function htmlToPlain(html) {
	let pos = 0,
		limit = 0,
		iP1 = 0,
		iP2 = 0,
		iP3 = 0,
		text = '';

	const convertBlockquote = (blockquoteText) => {
		blockquoteText = '> ' + blockquoteText.trim().replace(/\n/gm, '\n> ');
		return blockquoteText.replace(/(^|\n)([> ]+)/gm, (...args) =>
			args && 2 < args.length ? args[1] + args[2].replace(/[\s]/g, '').trim() + ' ' : ''
		);
	};

	const convertDivs = (...args) => {
		if (args && 1 < args.length) {
			let divText = args[1].trim();
			if (divText.length) {
				divText = divText.replace(/<div[^>]*>([\s\S\r\n]*)<\/div>/gim, convertDivs);
				divText = '\n' + divText.trim() + '\n';
			}

			return divText;
		}

		return '';
	};

	const convertPre = (...args) =>
			args && 1 < args.length
				? args[1]
						.toString()
						.replace(/[\n]/gm, '<br />')
						.replace(/[\r]/gm, '')
				: '',
		fixAttibuteValue = (...args) => (args && 1 < args.length ? '' + args[1] + htmlspecialchars(args[2]) : ''),
		convertLinks = (...args) => (args && 1 < args.length ? args[1].trim() : '');

	text = html
		.replace(/<p[^>]*><\/p>/gi, '')
		.replace(/<pre[^>]*>([\s\S\r\n\t]*)<\/pre>/gim, convertPre)
		.replace(/[\s]+/gm, ' ')
		.replace(/((?:href|data)\s?=\s?)("[^"]+?"|'[^']+?')/gim, fixAttibuteValue)
		.replace(/<br[^>]*>/gim, '\n')
		.replace(/<\/h[\d]>/gi, '\n')
		.replace(/<\/p>/gi, '\n\n')
		.replace(/<ul[^>]*>/gim, '\n')
		.replace(/<\/ul>/gi, '\n')
		.replace(/<li[^>]*>/gim, ' * ')
		.replace(/<\/li>/gi, '\n')
		.replace(/<\/td>/gi, '\n')
		.replace(/<\/tr>/gi, '\n')
		.replace(/<hr[^>]*>/gim, '\n_______________________________\n\n')
		.replace(/<div[^>]*>([\s\S\r\n]*)<\/div>/gim, convertDivs)
		.replace(/<blockquote[^>]*>/gim, '\n__bq__start__\n')
		.replace(/<\/blockquote>/gim, '\n__bq__end__\n')
		.replace(/<a [^>]*>([\s\S\r\n]*?)<\/a>/gim, convertLinks)
		.replace(/<\/div>/gi, '\n')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&quot;/gi, '"')
		.replace(/<[^>]*>/gm, '');

	text = $div.html(text).text();

	text = text
		.replace(/\n[ \t]+/gm, '\n')
		.replace(/[\n]{3,}/gm, '\n\n')
		.replace(/&gt;/gi, '>')
		.replace(/&lt;/gi, '<')
		.replace(/&amp;/gi, '&');

	text = splitPlainText(text);

	pos = 0;
	limit = 800;

	while (0 < limit) {
		limit -= 1;
		iP1 = text.indexOf('__bq__start__', pos);
		if (-1 < iP1) {
			iP2 = text.indexOf('__bq__start__', iP1 + 5);
			iP3 = text.indexOf('__bq__end__', iP1 + 5);

			if ((-1 === iP2 || iP3 < iP2) && iP1 < iP3) {
				text = text.substring(0, iP1) + convertBlockquote(text.substring(iP1 + 13, iP3)) + text.substring(iP3 + 11);

				pos = 0;
			} else if (-1 < iP2 && iP2 < iP3) {
				pos = iP2 - 1;
			} else {
				pos = 0;
			}
		} else {
			break;
		}
	}

	text = text.replace(/__bq__start__/gm, '').replace(/__bq__end__/gm, '');

	return text;
}

/**
 * @param {string} plain
 * @param {boolean} findEmailAndLinksInText = false
 * @returns {string}
 */
export function plainToHtml(plain, findEmailAndLinksInText = false) {
	plain = plain.toString().replace(/\r/g, '');
	plain = plain.replace(/^>[> ]>+/gm, ([match]) => (match ? match.replace(/[ ]+/g, '') : match));

	let bIn = false,
		bDo = true,
		bStart = true,
		aNextText = [],
		aText = plain.split('\n');

	do {
		bDo = false;
		aNextText = [];
		aText.forEach(sLine => {
			bStart = '>' === sLine.substr(0, 1);
			if (bStart && !bIn) {
				bDo = true;
				bIn = true;
				aNextText.push('~~~blockquote~~~');
				aNextText.push(sLine.substr(1));
			} else if (!bStart && bIn) {
				if (sLine) {
					bIn = false;
					aNextText.push('~~~/blockquote~~~');
					aNextText.push(sLine);
				} else {
					aNextText.push(sLine);
				}
			} else if (bStart && bIn) {
				aNextText.push(sLine.substr(1));
			} else {
				aNextText.push(sLine);
			}
		});

		if (bIn) {
			bIn = false;
			aNextText.push('~~~/blockquote~~~');
		}

		aText = aNextText;
	} while (bDo);

	plain = aText.join('\n');

	plain = plain
		// .replace(/~~~\/blockquote~~~\n~~~blockquote~~~/g, '\n')
		.replace(/&/g, '&amp;')
		.replace(/>/g, '&gt;')
		.replace(/</g, '&lt;')
		.replace(/~~~blockquote~~~[\s]*/g, '<blockquote>')
		.replace(/[\s]*~~~\/blockquote~~~/g, '</blockquote>')
		.replace(/\n/g, '<br />');

	return findEmailAndLinksInText ? findEmailAndLinks(plain) : plain;
}

window['rainloop_Utils_htmlToPlain'] = htmlToPlain; // eslint-disable-line dot-notation
window['rainloop_Utils_plainToHtml'] = plainToHtml; // eslint-disable-line dot-notation

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
 * @returns {Array}
 */
export function folderListOptionsBuilder(
	aSystem,
	aList,
	aDisabled,
	aHeaderLines,
	iUnDeep,
	fDisableCallback,
	fVisibleCallback,
	fRenameCallback,
	bSystem,
	bBuildUnvisible
) {
	let /**
		 * @type {?FolderModel}
		 */
		bSep = false,
		aResult = [];

	const sDeepPrefix = '\u00A0\u00A0\u00A0';

	bBuildUnvisible = undefined === bBuildUnvisible ? false : !!bBuildUnvisible;
	bSystem = !isNormal(bSystem) ? 0 < aSystem.length : bSystem;
	iUnDeep = !isNormal(iUnDeep) ? 0 : iUnDeep;
	fDisableCallback = isNormal(fDisableCallback) ? fDisableCallback : null;
	fVisibleCallback = isNormal(fVisibleCallback) ? fVisibleCallback : null;
	fRenameCallback = isNormal(fRenameCallback) ? fRenameCallback : null;

	if (!isArray(aDisabled)) {
		aDisabled = [];
	}

	if (!isArray(aHeaderLines)) {
		aHeaderLines = [];
	}

	aHeaderLines.forEach(line => {
		aResult.push({
			id: line[0],
			name: line[1],
			system: false,
			seporator: false,
			disabled: false
		});
	});

	bSep = true;
	aSystem.forEach(oItem => {
		if (fVisibleCallback ? fVisibleCallback(oItem) : true) {
			if (bSep && aResult.length) {
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
				name: fRenameCallback ? fRenameCallback(oItem) : oItem.name(),
				system: true,
				seporator: false,
				disabled:
					!oItem.selectable ||
					aDisabled.includes(oItem.fullNameRaw) ||
					(fDisableCallback ? fDisableCallback(oItem) : false)
			});
		}
	});

	bSep = true;
	aList.forEach(oItem => {
		// if (oItem.subScribed() || !oItem.existen || bBuildUnvisible)
		if (
			(oItem.subScribed() || !oItem.existen || bBuildUnvisible) &&
			(oItem.selectable || oItem.hasSubScribedSubfolders())
		) {
			if (fVisibleCallback ? fVisibleCallback(oItem) : true) {
				if (FolderType.User === oItem.type() || !bSystem || oItem.hasSubScribedSubfolders()) {
					if (bSep && aResult.length) {
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
						name:
							new Array(oItem.deep + 1 - iUnDeep).join(sDeepPrefix) +
							(fRenameCallback ? fRenameCallback(oItem) : oItem.name()),
						system: false,
						seporator: false,
						disabled:
							!oItem.selectable ||
							aDisabled.includes(oItem.fullNameRaw) ||
							(fDisableCallback ? fDisableCallback(oItem) : false)
					});
				}
			}
		}

		if (oItem.subScribed() && oItem.subFolders().length) {
			aResult = aResult.concat(
				folderListOptionsBuilder(
					[],
					oItem.subFolders(),
					aDisabled,
					[],
					iUnDeep,
					fDisableCallback,
					fVisibleCallback,
					fRenameCallback,
					bSystem,
					bBuildUnvisible
				)
			);
		}
	});

	return aResult;
}

/**
 * @param {object} element
 * @returns {void}
 */
export function selectElement(element) {
	let sel = getSelection(),
		range = document.createRange();
	sel.removeAllRanges();
	range.selectNodeContents(element);
	sel.addRange(range);
}

var dv;
export const detectDropdownVisibility = ()=>{
	// leading debounce
	dv && clearTimeout(dv);
	dv = setTimeout(()=>
		dropdownVisibility(!!GlobalsData.aBootstrapDropdowns.find(item => item.hasClass('open')))
	, 50);
};

/**
 * @param {boolean=} delay = false
 */
export function triggerAutocompleteInputChange(delay = false) {
	const fFunc = () => {
		$('.checkAutocomplete').trigger('change');
	};

	if (delay) {
		setTimeout(fFunc, 100);
	} else {
		fFunc();
	}
}

const configurationScriptTagCache = {};

/**
 * @param {string} configuration
 * @returns {object}
 */
export function getConfigurationFromScriptTag(configuration) {
	if (!configurationScriptTagCache[configuration]) {
		configurationScriptTagCache[configuration] = $(
			'script[type="application/json"][data-configuration="' + configuration + '"]'
		);
	}

	try {
		return JSON.parse(configurationScriptTagCache[configuration].text());
	} catch (e) {} // eslint-disable-line no-empty

	return {};
}

/**
 * @param {Object|Array} objectOrObjects
 * @returns {void}
 */
export function delegateRunOnDestroy(objectOrObjects) {
	if (objectOrObjects) {
		if (isArray(objectOrObjects)) {
			objectOrObjects.forEach(item => {
				delegateRunOnDestroy(item);
			});
		} else if (objectOrObjects && objectOrObjects.onDestroy) {
			objectOrObjects.onDestroy();
		}
	}
}

/**
 * @param {object} $styleTag
 * @param {string} css
 * @returns {boolean}
 */
export function appendStyles($styleTag, css) {
	if ($styleTag && $styleTag[0]) {
		if ($styleTag[0].styleSheet && undefined !== $styleTag[0].styleSheet.cssText) {
			$styleTag[0].styleSheet.cssText = css;
		} else {
			$styleTag.text(css);
		}

		return true;
	}

	return false;
}

let __themeTimer = 0,
	__themeAjax = null;

/**
 * @param {string} value
 * @param {function=} themeTrigger = noop
 * @returns {void}
 */
export function changeTheme(value, themeTrigger = ()=>{}) {
	const themeLink = $('#app-theme-link'),
		clearTimer = () => {
			__themeTimer = setTimeout(() => themeTrigger(SaveSettingsStep.Idle), 1000);
			__themeAjax = null;
		};

	let themeStyle = $('#app-theme-style'),
		url = themeLink.attr('href');

	if (!url) {
		url = themeStyle.attr('data-href');
	}

	if (url) {
		url = url.toString().replace(/\/-\/[^/]+\/-\//, '/-/' + value + '/-/');
		url = url.replace(/\/Css\/[^/]+\/User\//, '/Css/0/User/');
		url = url.replace(/\/Hash\/[^/]+\//, '/Hash/-/');

		if ('Json/' !== url.substring(url.length - 5, url.length)) {
			url += 'Json/';
		}

		clearTimeout(__themeTimer);

		themeTrigger(SaveSettingsStep.Animate);

		if (__themeAjax) {
			__themeAjax.abort();
		}
		let init = {};
		if (window.AbortController) {
			__themeAjax = new AbortController();
			init.signal = __themeAjax.signal;
		}
		fetch(url, init)
			.then(response => response.json())
			.then(data => {
				if (data && isArray(data) && 2 === data.length) {
					if (themeLink && themeLink[0] && (!themeStyle || !themeStyle[0])) {
						themeStyle = $('<style id="app-theme-style"></style>');
						themeLink.after(themeStyle);
						themeLink.remove();
					}

					if (themeStyle && themeStyle[0]) {
						if (appendStyles(themeStyle, data[1])) {
							themeStyle.attr('data-href', url).attr('data-theme', data[0]);
						}
					}

					themeTrigger(SaveSettingsStep.TrueResult);
				}
			})
			.then(clearTimer, clearTimer);
	}
}

/**
 * @returns {function}
 */
export function computedPagenatorHelper(koCurrentPage, koPageCount) {
	return () => {
		const currentPage = koCurrentPage(),
			pageCount = koPageCount(),
			result = [],
			fAdd = (index, push = true, customName = '') => {
				const data = {
					current: index === currentPage,
					name: customName ? customName.toString() : index.toString(),
					custom: !!customName,
					title: customName ? index.toString() : '',
					value: index.toString()
				};

				if (push) {
					result.push(data);
				} else {
					result.unshift(data);
				}
			};

		let prev = 0,
			next = 0,
			limit = 2;

		if (1 < pageCount || (0 < pageCount && pageCount < currentPage)) {
			if (pageCount < currentPage) {
				fAdd(pageCount);
				prev = pageCount;
				next = pageCount;
			} else {
				if (3 >= currentPage || pageCount - 2 <= currentPage) {
					limit += 2;
				}

				fAdd(currentPage);
				prev = currentPage;
				next = currentPage;
			}

			while (0 < limit) {
				prev -= 1;
				next += 1;

				if (0 < prev) {
					fAdd(prev, false);
					limit -= 1;
				}

				if (pageCount >= next) {
					fAdd(next, true);
					limit -= 1;
				} else if (0 >= prev) {
					break;
				}
			}

			if (3 === prev) {
				fAdd(2, false);
			} else if (3 < prev) {
				fAdd(Math.round((prev - 1) / 2), false, '...');
			}

			if (pageCount - 2 === next) {
				fAdd(pageCount - 1, true);
			} else if (pageCount - 2 > next) {
				fAdd(Math.round((pageCount + next) / 2), true, '...');
			}

			// first and last
			if (1 < prev) {
				fAdd(1, false);
			}

			if (pageCount > next) {
				fAdd(pageCount, true);
			}
		}

		return result;
	};
}

/**
 * @param {string} fileName
 * @returns {string}
 */
export function getFileExtension(fileName) {
	fileName = fileName.toLowerCase().trim();

	const result = fileName.split('.').pop();
	return result === fileName ? '' : result;
}

/**
 * @param {string} fileName
 * @returns {string}
 */
export function mimeContentType(fileName) {
	let ext = '',
		result = 'application/octet-stream';

	fileName = fileName.toLowerCase().trim();

	if ('winmail.dat' === fileName) {
		return 'application/ms-tnef';
	}

	ext = getFileExtension(fileName);
	if (ext && ext.length && undefined !== Mime[ext]) {
		result = Mime[ext];
	}

	return result;
}

/**
 * @param {string} color
 * @returns {boolean}
 */
export function isTransparent(color) {
	return 'rgba(0, 0, 0, 0)' === color || 'transparent' === color;
}

/**
 * @param {string} url
 * @param {number} value
 * @param {Function} fCallback
 */
export function resizeAndCrop(url, value, fCallback) {
	const img = new Image();
	img.onload = function() {
		let diff = [0, 0];

		const canvas = document.createElement('canvas'),
			ctx = canvas.getContext('2d');

		canvas.width = value;
		canvas.height = value;

		if (this.width > this.height) {
			diff = [this.width - this.height, 0];
		} else {
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
 * @param {string} mailToUrl
 * @param {Function} PopupComposeViewModel
 * @returns {boolean}
 */
export function mailToHelper(mailToUrl, PopupComposeViewModel) {
	if (
		mailToUrl &&
		'mailto:' ===
			mailToUrl
				.toString()
				.substr(0, 7)
				.toLowerCase()
	) {
		if (!PopupComposeViewModel) {
			return true;
		}

		mailToUrl = mailToUrl.toString().substr(7);

		let to = [],
			cc = null,
			bcc = null,
			params = {};

		const email = mailToUrl.replace(/\?.+$/, ''),
			query = mailToUrl.replace(/^[^?]*\?/, ''),
			EmailModel = require('Model/Email').default;

		params = simpleQueryParser(query);

		if (undefined !== params.to) {
			to = EmailModel.parseEmailLine(decodeURIComponent(email + ',' + params.to));
			to = Object.values(
				to.reduce((result, value) => {
					if (value) {
						if (result[value.email]) {
							if (!result[value.email].name) {
								result[value.email] = value;
							}
						} else {
							result[value.email] = value;
						}
					}
					return result;
				}, {})
			);
		} else {
			to = EmailModel.parseEmailLine(email);
		}

		if (undefined !== params.cc) {
			cc = EmailModel.parseEmailLine(decodeURIComponent(params.cc));
		}

		if (undefined !== params.bcc) {
			bcc = EmailModel.parseEmailLine(decodeURIComponent(params.bcc));
		}

		require('Knoin/Knoin').showScreenPopup(PopupComposeViewModel, [
			ComposeType.Empty,
			null,
			to,
			cc,
			bcc,
			undefined === params.subject ? null : pString(decodeURIComponent(params.subject)),
			undefined === params.body ? null : plainToHtml(pString(decodeURIComponent(params.body)))
		]);

		return true;
	}

	return false;
}

var wr;
export const windowResize = timeout => {
	wr && clearTimeout(wr);
	if (undefined === timeout || null === timeout) {
		$win.trigger('resize');
	} else {
		wr = setTimeout(()=>$win.trigger('resize'), timeout);
	}
};

/**
 * @returns {void}
 */
export function windowResizeCallback() {
	windowResize();
}

let substr = String.substr;
if ('b' !== 'ab'.substr(-1)) {
	substr = (str, start, length) => {
		start = 0 > start ? str.length + start : start;
		return str.substr(start, length);
	};

	String.substr = substr;
}
