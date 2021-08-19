import { ComposeType/*, FolderType*/ } from 'Common/EnumsUser';
import { EmailModel } from 'Model/Email';
import { encodeHtml } from 'Common/Html';
import { isArray } from 'Common/Utils';
import { createElement } from 'Common/Globals';
import { FolderUserStore } from 'Stores/User/Folder';
import { SettingsUserStore } from 'Stores/User/Settings';

/**
 * @param {(string|number)} value
 * @param {boolean=} includeZero = true
 * @returns {boolean}
 */
export function isPosNumeric(value) {
	return null != value && /^[0-9]*$/.test(value.toString());
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

	const
		tpl = createElement('template'),
		convertPre = (...args) =>
			args && 1 < args.length
				? args[1]
						.toString()
						.replace(/[\n]/gm, '<br/>')
						.replace(/[\r]/gm, '')
				: '',
		fixAttibuteValue = (...args) => (args && 1 < args.length ? '' + args[1] + encodeHtml(args[2]) : ''),
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

	text = splitPlainText(tpl.content.textContent
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
		.replace(/\n/g, '<br/>');
}

rl.Utils = {
	htmlToPlain: htmlToPlain,
	plainToHtml: plainToHtml
};

/**
 * @param {Array} aSystem
 * @param {Array=} aDisabled
 * @param {Array=} aHeaderLines
 * @param {Function=} fDisableCallback
 * @param {Function=} fRenameCallback
 * @param {boolean=} bNoSelectSelectable Used in FolderCreatePopupView
 * @returns {Array}
 */
export function folderListOptionsBuilder(
	aSystem,
	aDisabled,
	aHeaderLines,
	fRenameCallback,
	fDisableCallback,
	bNoSelectSelectable
) {
	let /**
		 * @type {?FolderModel}
		 */
		bSep = false,
		aResult = [];

	const sDeepPrefix = '\u00A0\u00A0\u00A0',
		// FolderSystemPopupView should always be true
		showUnsubscribed = (aSystem.length || bNoSelectSelectable) ? !SettingsUserStore.hideUnsubscribed() : true;

	fDisableCallback = fDisableCallback || (() => false);
	fRenameCallback = fRenameCallback || (oItem => oItem.name());

	if (!isArray(aDisabled)) {
		aDisabled = [];
	}

	isArray(aHeaderLines) && aHeaderLines.forEach(line =>
		aResult.push({
			id: line[0],
			name: line[1],
			system: false,
			dividerbar: false,
			disabled: false
		})
	);

	bSep = true;
	aSystem.forEach(oItem => {
		aResult.push({
			id: oItem.fullNameRaw,
			name: fRenameCallback(oItem),
			system: true,
			dividerbar: bSep,
			disabled:
				!oItem.selectable ||
				aDisabled.includes(oItem.fullNameRaw) ||
				fDisableCallback(oItem)
		});
		bSep = false;
	});

	bSep = true;
	FolderUserStore.folderList().forEach(oItem => {
/*
		if ((oItem.subscribed() || !oItem.exists || bBuildUnvisible)
		 && (oItem.selectable || oItem.hasSubscribedSubfolders())
		 && (FolderType.User === oItem.type() || !bSystem || oItem.hasSubscribedSubfolders()) {
		) {
*/
		if (showUnsubscribed || oItem.subscribed() || !oItem.exists || oItem.hasSubscribedSubfolders()) {
			aResult.push({
				id: oItem.fullNameRaw,
				name:
					sDeepPrefix.repeat(oItem.deep) +
					fRenameCallback(oItem),
				system: false,
				dividerbar: bSep,
				disabled: !bNoSelectSelectable && (
					!oItem.selectable ||
					aDisabled.includes(oItem.fullNameRaw) ||
					fDisableCallback(oItem))
			});
			bSep = false;
		}

		if (oItem.subFolders.length) {
			aResult = aResult.concat(
				folderListOptionsBuilder(
					[],
					oItem.subFolders(),
					aDisabled,
					[],
					fDisableCallback,
					fRenameCallback,
					bNoSelectSelectable
				)
			);
		}
	});

	return aResult;
}

/**
 * Call the Model/CollectionModel onDestroy() to clear knockout functions/objects
 * @param {Object|Array} objectOrObjects
 * @returns {void}
 */
export function delegateRunOnDestroy(objectOrObjects) {
	objectOrObjects && (isArray(objectOrObjects) ? objectOrObjects : [objectOrObjects]).forEach(
		obj => obj.onDestroy && obj.onDestroy()
	);
}

/**
 * @returns {function}
 */
export function computedPaginatorHelper(koCurrentPage, koPageCount) {
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
				fAdd(Math.round((prev - 1) / 2), false, '…');
			}

			if (pageCount - 2 === next) {
				fAdd(pageCount - 1, true);
			} else if (pageCount - 2 > next) {
				fAdd(Math.round((pageCount + next) / 2), true, '…');
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
 * @param {string} mailToUrl
 * @returns {boolean}
 */
export function mailToHelper(mailToUrl) {
	if (
		mailToUrl &&
		'mailto:' ===
			mailToUrl
				.toString()
				.substr(0, 7)
				.toLowerCase()
	) {
		mailToUrl = mailToUrl.toString().substr(7);

		let to = [],
			params = {};

		const email = mailToUrl.replace(/\?.+$/, ''),
			query = mailToUrl.replace(/^[^?]*\?/, ''),
			toEmailModel = value => null != value ? EmailModel.parseEmailLine(decodeURIComponent(value)) : null;

		query.split('&').forEach(temp => {
			temp = temp.split('=');
			params[decodeURIComponent(temp[0])] = decodeURIComponent(temp[1]);
		});

		if (null != params.to) {
			to = Object.values(
				toEmailModel(email + ',' + params.to).reduce((result, value) => {
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

		showMessageComposer([
			ComposeType.Empty,
			null,
			to,
			toEmailModel(params.cc),
			toEmailModel(params.bcc),
			null == params.subject ? null : decodeURIComponent(params.subject),
			null == params.body ? null : plainToHtml(decodeURIComponent(params.body))
		]);

		return true;
	}

	return false;
}

export function showMessageComposer(params = [])
{
	rl.app.showMessageComposer(params);
}
