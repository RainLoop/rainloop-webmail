import { MessageFlagsCache } from 'Common/Cache';
import { Notification } from 'Common/Enums';
import { MessageSetAction, ComposeType/*, FolderType*/ } from 'Common/EnumsUser';
import { doc, createElement, elementById, dropdowns, dropdownVisibility, SettingsGet, leftPanelDisabled } from 'Common/Globals';
import { plainToHtml } from 'Common/Html';
import { getNotification } from 'Common/Translator';
import { EmailModel } from 'Model/Email';
import { MessageModel } from 'Model/Message';
import { MessageUserStore } from 'Stores/User/Message';
import { MessagelistUserStore } from 'Stores/User/Messagelist';
import { SettingsUserStore } from 'Stores/User/Settings';
import * as Local from 'Storage/Client';
import { ThemeStore } from 'Stores/Theme';
import Remote from 'Remote/User/Fetch';

export const

moveAction = ko.observable(false),

dropdownsDetectVisibility = (() =>
	dropdownVisibility(!!dropdowns.find(item => item.classList.contains('show')))
).debounce(50),

/**
 * @param {string} link
 * @returns {boolean}
 */
download = (link, name = "") => {
	console.log('download: '+link);
	// Firefox 98 issue https://github.com/the-djmaze/snappymail/issues/301
	if (ThemeStore.isMobile() || /firefox/i.test(navigator.userAgent)) {
		open(link, '_blank');
		focus();
	} else {
		const oLink = createElement('a', {
			href: link,
			target: '_blank',
			download: name
		});
		doc.body.appendChild(oLink).click();
		oLink.remove();
	}
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

				push ? result.push(data) : result.unshift(data);
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
mailToHelper = mailToUrl => {
	if ('mailto:' === mailToUrl?.slice(0, 7).toLowerCase()) {
		mailToUrl = mailToUrl.slice(7).split('?');

		const
			email = mailToUrl[0],
			params = new URLSearchParams(mailToUrl[1]),
			toEmailModel = value => null != value ? EmailModel.parseEmailLine(value) : null;

		showMessageComposer([
			ComposeType.Empty,
			null,
			params.get('to')
				? Object.values(
						toEmailModel(email + ',' + params.get('to')).reduce((result, value) => {
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
					)
				: EmailModel.parseEmailLine(email),
			toEmailModel(params.get('cc')),
			toEmailModel(params.get('bcc')),
			params.get('subject'),
			plainToHtml(params.get('body') || '')
		]);

		return true;
	}

	return false;
},

showMessageComposer = (params = []) =>
{
	rl.app.showMessageComposer(params);
},

setLayoutResizer = (source, target, sClientSideKeyName, mode) =>
{
	if (source.layoutResizer && source.layoutResizer.mode != mode) {
		target.removeAttribute('style');
		source.removeAttribute('style');
	}
	source.observer?.disconnect();
//	source.classList.toggle('resizable', mode);
	if (mode) {
		const length = Local.get(sClientSideKeyName + mode) || SettingsGet('Resizer' + sClientSideKeyName + mode),
			setTargetPos = mode => {
				let value;
				if ('Width' == mode) {
					value = source.offsetWidth;
					target.style.left = value + 'px';
				} else {
					value = source.offsetHeight;
					target.style.top = (4 + source.offsetTop + value) + 'px';
				}
				return value;
			};
		if (length) {
			source.style[mode.toLowerCase()] = length + 'px';
			setTargetPos(mode);
		}
		if (!source.layoutResizer) {
			const resizer = createElement('div', {'class':'resizer'}),
				save = (data => Remote.saveSettings(0, data)).debounce(500),
				size = {},
				store = () => {
					const value = setTargetPos(resizer.mode),
						prop = resizer.key + resizer.mode;
					(value == Local.get(prop)) || Local.set(prop, value);
					(value == SettingsGet('Resizer' + prop)) || save({['Resizer' + prop]: value});
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
		source.observer?.observe(source, { box: 'border-box' });
	}
},

populateMessageBody = (oMessage, popup) => {
	if (oMessage) {
		popup || MessageUserStore.message(oMessage);
		popup || MessageUserStore.loading(true);
		Remote.message((iError, oData/*, bCached*/) => {
			if (iError) {
				if (Notification.RequestAborted !== iError && !popup) {
					MessageUserStore.message(null);
					MessageUserStore.error(getNotification(iError));
				}
			} else {
				let json = oData?.Result;

				if (
					json &&
					MessageModel.validJson(json) &&
					oMessage.folder === json.Folder
				) {
					const threads = oMessage.threads(),
						isNew = !popup && oMessage.uid != json.Uid && threads.includes(json.Uid),
						messagesDom = MessageUserStore.bodiesDom();
					if (isNew) {
						oMessage = MessageModel.reviveFromJson(json);
						if (oMessage) {
							oMessage.threads(threads);
							MessageFlagsCache.initMessage(oMessage);

							// Set clone
							oMessage = MessageModel.fromMessageListItem(oMessage);
						}
						MessageUserStore.message(oMessage);
					}

					if (oMessage && oMessage.uid == json.Uid) {
						popup || MessageUserStore.error('');
/*
						if (bCached) {
							delete json.Flags;
						}
*/
						isNew || oMessage.revivePropertiesFromJson(json);

						if (messagesDom) {
							let id = 'rl-msg-' + oMessage.hash.replace(/[^a-zA-Z0-9]/g, ''),
								body = elementById(id);
							if (body) {
								oMessage.body = body;
								oMessage.isHtml(body.classList.contains('html'));
								oMessage.hasImages(body.rlHasImages);
							} else {
								body = Element.fromHTML('<div id="' + id + '" hidden="" class="b-text-part '
									+ (oMessage.pgpSigned() ? ' openpgp-signed' : '')
									+ (oMessage.pgpEncrypted() ? ' openpgp-encrypted' : '')
									+ '">'
									+ '</div>');
								oMessage.body = body;
								if (!SettingsUserStore.viewHTML() || !oMessage.viewHtml()) {
									oMessage.viewPlain();
								}

								MessageUserStore.purgeMessageBodyCache();
							}

							messagesDom.append(body);

							popup || (oMessage.body.hidden = false);
							popup && oMessage.viewPopupMessage();
						}

						MessageFlagsCache.initMessage(oMessage);
						if (oMessage.isUnseen()) {
							MessageUserStore.MessageSeenTimer = setTimeout(
								() => MessagelistUserStore.setAction(oMessage.folder, MessageSetAction.SetSeen, [oMessage]),
								SettingsUserStore.messageReadDelay() * 1000 // seconds
							);
						}

						if (isNew) {
							let selectedMessage = MessagelistUserStore.selectedMessage();
							if (
								selectedMessage &&
								(oMessage.folder !== selectedMessage.folder || oMessage.uid != selectedMessage.uid)
							) {
								MessagelistUserStore.selectedMessage(null);
								if (1 === MessagelistUserStore.length) {
									MessagelistUserStore.focusedMessage(null);
								}
							} else if (!selectedMessage) {
								selectedMessage = MessagelistUserStore.find(
									subMessage =>
										subMessage &&
										subMessage.folder === oMessage.folder &&
										subMessage.uid == oMessage.uid
								);

								if (selectedMessage) {
									MessagelistUserStore.selectedMessage(selectedMessage);
									MessagelistUserStore.focusedMessage(selectedMessage);
								}
							}
						}
					}
				}
			}
			popup || MessageUserStore.loading(false);
		}, oMessage.folder, oMessage.uid);
	}
};

leftPanelDisabled.subscribe(value => value && moveAction(false));
moveAction.subscribe(value => value && leftPanelDisabled(false));
