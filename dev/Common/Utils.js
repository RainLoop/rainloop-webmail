import { ComposeType, SaveSettingsStep, FolderType } from 'Common/Enums';

const
	doc = document,
	tpl = doc.createElement('template'),
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
 * @param {(string|number)} value
 * @param {boolean=} includeZero = true
 * @returns {boolean}
 */
export function isPosNumeric(value, includeZero = true) {
	return null != value && (includeZero ? /^[0-9]*$/ : /^[1-9]+[0-9]*$/).test(value.toString());
}

/**
 * @param {*} value
 * @param {number=} defaultValue = 0
 * @returns {number}
 */
export function pInt(value, defaultValue = 0) {
	value = parseInt(value, 10);
	return isNaN(value) || !isFinite(value) ? defaultValue : value;
}

/**
 * @param {*} value
 * @returns {string}
 */
export function pString(value) {
	return null != value ? '' + value : '';
}

/**
 * @param {string} text
 * @returns {string}
 */
export function encodeHtml(text) {
	return null != text ? htmlspecialchars(text.toString()) : '';
}

/**
 * @param {string} text
 * @param {number=} len = 100
 * @returns {string}
 */
function splitPlainText(text, len = 100) {
	let prefix = '',
		subText = '',
		result = text,
		spacePos = 0,
		newLinePos = 0;

	while (result.length > len) {
		subText = result.substr(0, len);
		spacePos = subText.lastIndexOf(' ');
		newLinePos = subText.lastIndexOf('\n');

		if (-1 !== newLinePos) {
			spacePos = newLinePos;
		}

		if (-1 === spacePos) {
			spacePos = len;
		}

		prefix += subText.substr(0, spacePos) + '\n';
		result = result.substr(spacePos + 1);
	}

	return prefix + result;
}

/**
 * @returns {boolean}
 */
export function inFocus() {
	try {
		if (doc.activeElement) {
			if (undefined === doc.activeElement.__inFocusCache) {
				doc.activeElement.__inFocusCache = doc.activeElement.matches(
					'input,textarea,iframe,.cke_editable'
				);
			}

			return !!doc.activeElement.__inFocusCache;
		}
	} catch (e) {} // eslint-disable-line no-empty

	return false;
}

/**
 * @param {(number|string)} sizeInBytes
 * @returns {string}
 */
export function friendlySize(sizeInBytes) {
	sizeInBytes = pInt(sizeInBytes);
	const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'], i = pInt(Math.floor(Math.log(sizeInBytes) / Math.log(1024)));
	return (sizeInBytes / Math.pow(1024, i)).toFixed(2>i ? 0 : 1) + sizes[i];
}

/**
 * @param {string} theme
 * @returns {string}
 */
export const convertThemeName = theme => {
	if ('@custom' === theme.substr(-7)) {
		theme = theme.substr(0, theme.length - 7).trim();
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
 * @param {object} domOption
 * @param {object} item
 * @returns {void}
 */
export function defautOptionsAfterRender(domItem, item) {
	if (item && undefined !== item.disabled && domItem) {
		domItem.classList.toggle('disabled', domItem.disabled = item.disabled);
	}
}

/**
 * @param {object} koTrigger
 * @param {mixed} context
 * @returns {mixed}
 */
export function settingsSaveHelperSimpleFunction(koTrigger, context) {
	return (type, data) => {
		koTrigger.call(context, data && data.Result ? SaveSettingsStep.TrueResult : SaveSettingsStep.FalseResult);
		setTimeout(() => koTrigger.call(context, SaveSettingsStep.Idle), 1000);
	};
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

	tpl.innerHTML = html
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
		.replace(/&nbsp;/gi, ' ')
		.replace(/&quot;/gi, '"')
		.replace(/<[^>]*>/gm, '');

	text = splitPlainText(tpl.innerText
		.replace(/\n[ \t]+/gm, '\n')
		.replace(/[\n]{3,}/gm, '\n\n')
		.replace(/&gt;/gi, '>')
		.replace(/&lt;/gi, '<')
		.replace(/&amp;/gi, '&')
	);

	pos = 0;
	limit = 800;

	while (0 < limit) {
		--limit;
		iP1 = text.indexOf('__bq__start__', pos);
		if (-1 < iP1) {
			iP2 = text.indexOf('__bq__start__', iP1 + 5);
			iP3 = text.indexOf('__bq__end__', iP1 + 5);

			if ((-1 === iP2 || iP3 < iP2) && iP1 < iP3) {
				text = text.substr(0, iP1) + convertBlockquote(text.substring(iP1 + 13, iP3)) + text.substr(iP3 + 11);
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

	return text.replace(/__bq__start__|__bq__end__/gm, '').trim();
}

/**
 * @param {string} plain
 * @param {boolean} findEmailAndLinksInText = false
 * @returns {string}
 */
export function plainToHtml(plain) {
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

	return aText.join('\n')
		// .replace(/~~~\/blockquote~~~\n~~~blockquote~~~/g, '\n')
		.replace(/&/g, '&amp;')
		.replace(/>/g, '&gt;')
		.replace(/</g, '&lt;')
		.replace(/~~~blockquote~~~[\s]*/g, '<blockquote>')
		.replace(/[\s]*~~~\/blockquote~~~/g, '</blockquote>')
		.replace(/\n/g, '<br />');
}

rl.Utils = {
	htmlToPlain: htmlToPlain,
	plainToHtml: plainToHtml
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
	bSystem = null == bSystem ? 0 < aSystem.length : bSystem;
	iUnDeep = null == iUnDeep ? 0 : iUnDeep;
	fDisableCallback = null != fDisableCallback ? fDisableCallback : null;
	fVisibleCallback = null != fVisibleCallback ? fVisibleCallback : null;
	fRenameCallback = null != fRenameCallback ? fRenameCallback : null;

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
 * @param {Object|Array} objectOrObjects
 * @returns {void}
 */
export function delegateRunOnDestroy(objectOrObjects) {
	if (objectOrObjects) {
		if (isArray(objectOrObjects)) {
			objectOrObjects.forEach(item => delegateRunOnDestroy(item));
		} else {
			objectOrObjects.onDestroy && objectOrObjects.onDestroy();
		}
	}
}

let __themeTimer = 0,
	__themeAjax = null;

/**
 * @param {string} value
 * @param {function=} themeTrigger = noop
 * @returns {void}
 */
export function changeTheme(value, themeTrigger = ()=>{}) {
	const themeLink = doc.getElementById('app-theme-link'),
		clearTimer = () => {
			__themeTimer = setTimeout(() => themeTrigger(SaveSettingsStep.Idle), 1000);
			__themeAjax = null;
		};

	let themeStyle = doc.getElementById('app-theme-style'),
		url = (themeLink && themeLink.href) || (themeStyle && themeStyle.dataset.href);

	if (url) {
		url = url.toString()
			.replace(/\/-\/[^/]+\/-\//, '/-/' + value + '/-/')
			.replace(/\/Css\/[^/]+\/User\//, '/Css/0/User/')
			.replace(/\/Hash\/[^/]+\//, '/Hash/-/');

		if ('Json/' !== url.substr(-5)) {
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
		rl.fetchJSON(url, init)
			.then(data => {
				if (data && isArray(data) && 2 === data.length) {
					if (themeLink && !themeStyle) {
						themeStyle = doc.createElement('style');
						themeStyle.id = 'app-theme-style';
						themeLink.after(themeStyle);
						themeLink.remove();
					}

					if (themeStyle) {
						themeStyle.textContent = data[1];
						themeStyle.dataset.href = url;
						themeStyle.dataset.theme = data[0];
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
				--prev;
				++next;

				if (0 < prev) {
					fAdd(prev, false);
					--limit;
				}

				if (pageCount >= next) {
					fAdd(next, true);
					--limit;
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
 * @param {string} color
 * @returns {boolean}
 */
export function isTransparent(color) {
	return 'rgba(0, 0, 0, 0)' === color || 'transparent' === color;
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

		query.split('&').forEach(temp => {
			temp = temp.split('=');
			params[decodeURIComponent(temp[0])] = decodeURIComponent(temp[1]);
		});

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
			null == params.subject ? null : pString(decodeURIComponent(params.subject)),
			null == params.body ? null : plainToHtml(pString(decodeURIComponent(params.body)))
		]);

		return true;
	}

	return false;
}
