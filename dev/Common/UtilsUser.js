import { ComposeType/*, FolderType*/ } from 'Common/EnumsUser';
import { EmailModel } from 'Model/Email';
import { isArray } from 'Common/Utils';
import { doc, createElement } from 'Common/Globals';
import { FolderUserStore } from 'Stores/User/Folder';
import { SettingsUserStore } from 'Stores/User/Settings';
import * as Local from 'Storage/Client';
import { plainToHtml } from 'Common/Html';
import { ThemeStore } from 'Stores/Theme';

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
 * @param {string} link
 * @returns {boolean}
 */
download = (link, name = "") => {
	if (ThemeStore.isMobile()) {
		open(link, '_self');
		focus();
	} else {
		const oLink = createElement('a');
		oLink.href = link;
		oLink.target = '_blank';
		oLink.download = name;
		doc.body.appendChild(oLink).click();
		oLink.remove();
	}
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
