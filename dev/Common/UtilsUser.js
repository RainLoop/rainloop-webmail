import { MessageFlagsCache } from 'Common/Cache';
import { Notification } from 'Common/Enums';
import { MessageSetAction, ComposeType/*, FolderType*/ } from 'Common/EnumsUser';
import { doc, createElement, elementById, dropdowns, dropdownVisibility, SettingsGet } from 'Common/Globals';
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

populateMessageBody = (oMessage, preload) => {
	if (oMessage) {
		preload || MessageUserStore.hideMessageBodies();
		preload || MessageUserStore.loading(true);
		Remote.message((iError, oData/*, bCached*/) => {
			if (iError) {
				if (Notification.RequestAborted !== iError && !preload) {
					MessageUserStore.message(null);
					MessageUserStore.error(getNotification(iError));
				}
			} else {
				oMessage = preload ? oMessage : null;
				let
					isNew = false,
					json = oData?.Result,
					message = oMessage || MessageUserStore.message();

				if (
					json &&
					MessageModel.validJson(json) &&
					message &&
					message.folder === json.Folder
				) {
					const threads = message.threads(),
						messagesDom = MessageUserStore.bodiesDom();
					if (!oMessage && message.uid != json.Uid && threads.includes(json.Uid)) {
						message = MessageModel.reviveFromJson(json);
						if (message) {
							message.threads(threads);
							MessageFlagsCache.initMessage(message);

							// Set clone
							MessageUserStore.message(MessageModel.fromMessageListItem(message));
							message = MessageUserStore.message();

							isNew = true;
						}
					}

					if (message && message.uid == json.Uid) {
						oMessage || MessageUserStore.error('');
/*
						if (bCached) {
							delete json.Flags;
						}
*/
						isNew || message.revivePropertiesFromJson(json);
						if (messagesDom) {
							let id = 'rl-msg-' + message.hash.replace(/[^a-zA-Z0-9]/g, ''),
								body = elementById(id);
							if (body) {
								message.body = body;
								message.isHtml(body.classList.contains('html'));
								message.hasImages(body.rlHasImages);
							} else {
								body = Element.fromHTML('<div id="' + id + '" hidden="" class="b-text-part '
									+ (message.pgpSigned() ? ' openpgp-signed' : '')
									+ (message.pgpEncrypted() ? ' openpgp-encrypted' : '')
									+ '">'
									+ '</div>');
								message.body = body;
								if (!SettingsUserStore.viewHTML() || !message.viewHtml()) {
									message.viewPlain();
								}

								MessageUserStore.purgeMessageBodyCache();
							}

							messagesDom.append(body);

							if (!oMessage) {
								MessageUserStore.activeDom(message.body);
								MessageUserStore.hideMessageBodies();
								message.body.hidden = false;
							}
							oMessage && message.viewPopupMessage();
						}

						MessageFlagsCache.initMessage(message);
						if (message.isUnseen()) {
							MessageUserStore.MessageSeenTimer = setTimeout(
								() => MessagelistUserStore.setAction(message.folder, MessageSetAction.SetSeen, [message]),
								SettingsUserStore.messageReadDelay() * 1000 // seconds
							);
						}

						if (message && isNew) {
							let selectedMessage = MessagelistUserStore.selectedMessage();
							if (
								selectedMessage &&
								(message.folder !== selectedMessage.folder || message.uid != selectedMessage.uid)
							) {
								MessagelistUserStore.selectedMessage(null);
								if (1 === MessagelistUserStore.length) {
									MessagelistUserStore.focusedMessage(null);
								}
							} else if (!selectedMessage) {
								selectedMessage = MessagelistUserStore.find(
									subMessage =>
										subMessage &&
										subMessage.folder === message.folder &&
										subMessage.uid == message.uid
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
			preload || MessageUserStore.loading(false);
		}, oMessage.folder, oMessage.uid);
	}
};
