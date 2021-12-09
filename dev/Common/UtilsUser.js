import { ComposeType/*, FolderType*/ } from 'Common/EnumsUser';
import { EmailModel } from 'Model/Email';
import { encodeHtml } from 'Common/Html';
import { isArray } from 'Common/Utils';
import { createElement } from 'Common/Globals';
import { FolderUserStore } from 'Stores/User/Folder';
import { SettingsUserStore } from 'Stores/User/Settings';
import * as Local from 'Storage/Client';

export const

sortFolders = folders => {
	try {
		let collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
		folders.sort((a, b) =>
			a.isInbox() ? -1 : (b.isInbox() ? 1 : collator.compare(a.fullName, b.fullName))
		);
	} catch (e) {
		console.error(e);
	}
},

/**
 * @param {string} html
 * @returns {string}
 */
htmlToPlain = (html) => {
	let pos = 0,
		limit = 800,
		iP1 = 0,
		iP2 = 0,
		iP3 = 0,
		text = '';

	const
		tpl = createElement('template'),

		convertBlockquote = (blockquoteText) => {
			blockquoteText = '> ' + blockquoteText.trim().replace(/\n/gm, '\n> ');
			return blockquoteText.replace(/(^|\n)([> ]+)/gm, (...args) =>
				args && 2 < args.length ? args[1] + args[2].replace(/[\s]/g, '').trim() + ' ' : ''
			);
		},

		convertDivs = (...args) => {
			let divText = 1 < args.length ? args[1].trim() : '';
			if (divText.length) {
				divText = '\n' + divText.replace(/<div[^>]*>([\s\S\r\n]*)<\/div>/gim, convertDivs).trim() + '\n';
			}

			return divText;
		},

		convertPre = (...args) =>
			1 < args.length
				? args[1]
						.toString()
						.replace(/[\n]/gm, '<br/>')
						.replace(/[\r]/gm, '')
				: '',
		fixAttibuteValue = (...args) => (1 < args.length ? args[1] + encodeHtml(args[2]) : ''),

		convertLinks = (...args) => (1 < args.length ? args[1].trim() : '');

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

	text = tpl.content.textContent;
	if (text) {
		text = text
		.replace(/\n[ \t]+/gm, '\n')
		.replace(/[\n]{3,}/gm, '\n\n')
		.replace(/&gt;/gi, '>')
		.replace(/&lt;/gi, '<')
		.replace(/&amp;/gi, '&')
		// wordwrap max line length 100
		.match(/.{1,100}(\s|$)|\S+?(\s|$)/g).join('\n');
	}

	while (0 < --limit) {
		iP1 = text.indexOf('__bq__start__', pos);
		if (0 > iP1) {
			break;
		}
		iP2 = text.indexOf('__bq__start__', iP1 + 5);
		iP3 = text.indexOf('__bq__end__', iP1 + 5);

		if ((-1 === iP2 || iP3 < iP2) && iP1 < iP3) {
			text = text.slice(0, iP1) + convertBlockquote(text.slice(iP1 + 13, iP3)) + text.slice(iP3 + 11);
			pos = 0;
		} else if (-1 < iP2 && iP2 < iP3) {
			pos = iP2 - 1;
		} else {
			pos = 0;
		}
	}

	return text.replace(/__bq__start__|__bq__end__/gm, '').trim();
},

/**
 * @param {string} plain
 * @param {boolean} findEmailAndLinksInText = false
 * @returns {string}
 */
plainToHtml = (plain) => {
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
			bStart = '>' === sLine.slice(0, 1);
			if (bStart && !bIn) {
				bDo = true;
				bIn = true;
				aNextText.push('~~~blockquote~~~');
				aNextText.push(sLine.slice(1));
			} else if (!bStart && bIn) {
				if (sLine) {
					bIn = false;
					aNextText.push('~~~/blockquote~~~');
					aNextText.push(sLine);
				} else {
					aNextText.push(sLine);
				}
			} else if (bStart && bIn) {
				aNextText.push(sLine.slice(1));
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
},

/**
 * @param {Array=} aDisabled
 * @param {Array=} aHeaderLines
 * @param {Function=} fDisableCallback
 * @param {Function=} fRenameCallback
 * @param {boolean=} bNoSelectSelectable Used in FolderCreatePopupView
 * @returns {Array}
 */
folderListOptionsBuilder = (
	aDisabled,
	aHeaderLines,
	fRenameCallback,
	fDisableCallback,
	bNoSelectSelectable,
	aList = FolderUserStore.folderList()
) => {
	const
		aResult = [],
		sDeepPrefix = '\u00A0\u00A0\u00A0',
		// FolderSystemPopupView should always be true
		showUnsubscribed = fRenameCallback ? !SettingsUserStore.hideUnsubscribed() : true,

		foldersWalk = folders => {
			folders.forEach(oItem => {
				if (showUnsubscribed || oItem.hasSubscriptions() || !oItem.exists) {
					aResult.push({
						id: oItem.fullName,
						name:
							sDeepPrefix.repeat(oItem.deep) +
							fRenameCallback(oItem),
						system: false,
						disabled: !bNoSelectSelectable && (
							!oItem.selectable() ||
							aDisabled.includes(oItem.fullName) ||
							fDisableCallback(oItem))
					});
				}

				if (oItem.subFolders.length) {
					foldersWalk(oItem.subFolders());
				}
			});
		};


	fDisableCallback = fDisableCallback || (() => false);
	fRenameCallback = fRenameCallback || (oItem => oItem.name());
	isArray(aDisabled) || (aDisabled = []);

	isArray(aHeaderLines) && aHeaderLines.forEach(line =>
		aResult.push({
			id: line[0],
			name: line[1],
			system: false,
			disabled: false
		})
	);

	foldersWalk(aList);

	return aResult;
},

/**
 * Call the Model/CollectionModel onDestroy() to clear knockout functions/objects
 * @param {Object|Array} objectOrObjects
 * @returns {void}
 */
delegateRunOnDestroy = (objectOrObjects) => {
	objectOrObjects && (isArray(objectOrObjects) ? objectOrObjects : [objectOrObjects]).forEach(
		obj => obj.onDestroy && obj.onDestroy()
	);
},

/**
 * @returns {function}
 */
computedPaginatorHelper = (koCurrentPage, koPageCount) => {
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
},

/**
 * @param {string} mailToUrl
 * @returns {boolean}
 */
mailToHelper = (mailToUrl) => {
	if (
		mailToUrl &&
		'mailto:' ===
			mailToUrl
				.toString()
				.slice(0, 7)
				.toLowerCase()
	) {
		mailToUrl = mailToUrl.toString().slice(7);

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
},

showMessageComposer = (params = []) =>
{
	rl.app.showMessageComposer(params);
},

initFullscreen = (el, fn) =>
{
	let event = 'fullscreenchange';
	if (!el.requestFullscreen && el.webkitRequestFullscreen) {
		el.requestFullscreen = el.webkitRequestFullscreen;
		event = 'webkit'+event;
	}
	if (el.requestFullscreen) {
		el.addEventListener(event, fn);
		return el;
	}
},

setLayoutResizer = (source, target, sClientSideKeyName, mode) =>
{
	if (source.layoutResizer && source.layoutResizer.mode != mode) {
		target.removeAttribute('style');
		source.removeAttribute('style');
	}
//	source.classList.toggle('resizable', mode);
	if (mode) {
		const length = Local.get(sClientSideKeyName+mode);
		if (!source.layoutResizer) {
			const resizer = createElement('div', {'class':'resizer'}),
				size = {},
				store = () => {
					if ('Width' == resizer.mode) {
						target.style.left = source.offsetWidth + 'px';
						Local.set(resizer.key+resizer.mode, source.offsetWidth);
					} else {
						target.style.top = (4 + source.offsetTop + source.offsetHeight) + 'px';
						Local.set(resizer.key+resizer.mode, source.offsetHeight);
					}
				},
				cssint = s => {
					let value = getComputedStyle(source, null)[s].replace('px', '');
					if (value.includes('%')) {
						value = source.parentElement['offset'+resizer.mode]
							* value.replace('%', '') / 100;
					}
					return parseFloat(value);
				};
			source.layoutResizer = resizer;
			source.append(resizer);
			resizer.addEventListener('mousedown', {
				handleEvent: function(e) {
					if ('mousedown' == e.type) {
						const lmode = resizer.mode.toLowerCase();
						e.preventDefault();
						size.pos = ('width' == lmode) ? e.pageX : e.pageY;
						size.min = cssint('min-'+lmode);
						size.max = cssint('max-'+lmode);
						size.org = cssint(lmode);
						addEventListener('mousemove', this);
						addEventListener('mouseup', this);
					} else if ('mousemove' == e.type) {
						const lmode = resizer.mode.toLowerCase(),
							length = size.org + (('width' == lmode ? e.pageX : e.pageY) - size.pos);
						if (length >= size.min && length <= size.max ) {
							source.style[lmode] = length + 'px';
							source.observer || store();
						}
					} else if ('mouseup' == e.type) {
						removeEventListener('mousemove', this);
						removeEventListener('mouseup', this);
					}
				}
			});
			source.observer = window.ResizeObserver ? new ResizeObserver(store) : null;
		}
		source.layoutResizer.mode = mode;
		source.layoutResizer.key = sClientSideKeyName;
		source.observer && source.observer.observe(source, { box: 'border-box' });
		if (length) {
			source.style[mode] = length + 'px';
		}
	} else {
		source.observer && source.observer.disconnect();
	}
};

rl.Utils = {
	htmlToPlain: htmlToPlain,
	plainToHtml: plainToHtml
};
