import ko from 'ko';

import { Scope, Notification } from 'Common/Enums';
import { MessageSetAction } from 'Common/EnumsUser';
import { doc, $htmlCL, createElement, elementById } from 'Common/Globals';
import { arrayLength, pInt, pString, addObservablesTo, addComputablesTo, addSubscribablesTo } from 'Common/Utils';
import { plainToHtml } from 'Common/UtilsUser';

import {
	getFolderInboxName,
	addNewMessageCache,
	setFolderUidNext,
	getFolderFromCacheList,
	setFolderHash,
	MessageFlagsCache,
	addRequestedMessage,
	clearNewMessageCache
} from 'Common/Cache';

import { mailBox } from 'Common/Links';
import { i18n, getNotification } from 'Common/Translator';

import { EmailCollectionModel } from 'Model/EmailCollection';
import { MessageModel } from 'Model/Message';
import { MessageCollectionModel } from 'Model/MessageCollection';

import { AppUserStore } from 'Stores/User/App';
import { AccountUserStore } from 'Stores/User/Account';
import { FolderUserStore } from 'Stores/User/Folder';
import { PgpUserStore } from 'Stores/User/Pgp';
import { SettingsUserStore } from 'Stores/User/Settings';
import { NotificationUserStore } from 'Stores/User/Notification';

//import Remote from 'Remote/User/Fetch'; Circular dependency

const
	hcont = Element.fromHTML('<div area="hidden" style="position:absolute;left:-5000px"></div>'),
	getRealHeight = el => {
		hcont.innerHTML = el.outerHTML;
		const result = hcont.clientHeight;
		hcont.innerHTML = '';
		return result;
	},
	/*eslint-disable max-len*/
	url = /(^|[\s\n]|\/?>)(https:\/\/[-A-Z0-9+\u0026\u2019#/%?=()~_|!:,.;]*[-A-Z0-9+\u0026#/%=~()_|])/gi,
	email = /(^|[\s\n]|\/?>)((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x21\x23-\x5b\x5d-\x7f]|\\[\x21\x23-\x5b\x5d-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x21-\x5a\x53-\x7f]|\\[\x21\x23-\x5b\x5d-\x7f])+)\]))/gi,
	findEmailAndLinks = html => html
		.replace(url, '$1<a href="$2" target="_blank">$2</a>')
		.replace(email, '$1<a href="mailto:$2">$2</a>'),
	isChecked = item => item.checked(),

	// Removes background and color
	// Many e-mails incorrectly only define one, not both
	// And in dark theme mode this kills the readability
	removeColors = html => {
		let l;
		do {
			l = html.length;
			html = html
				.replace(/(<[^>]+[;"'])\s*background(-[a-z]+)?\s*:[^;"']+/gi, '$1')
				.replace(/(<[^>]+[;"'])\s*color\s*:[^;"']+/gi, '$1')
				.replace(/(<[^>]+)\s(bg)?color=("[^"]+"|'[^']+')/gi, '$1');
		} while (l != html.length)
		return html;
	};

let MessageSeenTimer;

doc.body.append(hcont);

export const MessageUserStore = new class {
	constructor() {
		this.staticMessage = new MessageModel();

		this.list = ko.observableArray().extend({ debounce: 0 });

		addObservablesTo(this, {
			listCount: 0,
			listSearch: '',
			listThreadUid: 0,
			listPage: 1,
			listPageBeforeThread: 1,
			listError: '',

			listEndFolder: '',
			listEndSearch: '',
			listEndThreadUid: 0,
			listEndPage: 1,

			listLoading: false,
			listLoadingAnimation: false,
			listIsNotCompleted: false,
			listCompleteLoading: false,

			selectorMessageSelected: null,
			selectorMessageFocused: null,

			// message viewer
			message: null,
			messageViewTrigger: false,
			messageError: '',
			messageLoading: false,
			messageFullScreenMode: false,

			// Cache mail bodies
			messagesBodiesDom: null,
			messageActiveDom: null
		});

		this.listDisableAutoSelect = ko.observable(false).extend({ falseTimeout: 500 });

		// Computed Observables

		addComputablesTo(this, {
			listEndHash: () =>
				this.listEndFolder() +
				'|' +
				this.listEndSearch() +
				'|' +
				this.listEndThreadUid() +
				'|' +
				this.listEndPage(),

			listPageCount: () => Math.max(1, Math.ceil(this.listCount() / SettingsUserStore.messagesPerPage())),

			mainMessageListSearch: {
				read: this.listSearch,
				write: value => rl.route.setHash(
					mailBox(FolderUserStore.currentFolderFullNameHash(), 1, value.toString().trim(), this.listThreadUid())
				)
			},

			isMessageSelected: () => null !== this.message(),

			listCheckedOrSelected: () => {
				const
					selectedMessage = this.selectorMessageSelected(),
					focusedMessage = this.selectorMessageFocused(),
					checked = this.list.filter(item => isChecked(item) || item === selectedMessage);
				return checked.length ? checked : (focusedMessage ? [focusedMessage] : []);
			},

			listCheckedOrSelectedUidsWithSubMails: () => {
				let result = [];
				this.listCheckedOrSelected().forEach(message => {
					result.push(message.uid);
					if (1 < message.threadsLen()) {
						result = result.concat(message.threads()).unique();
					}
				});
				return result;
			}
		});

		this.listChecked = ko
			.computed(() => this.list.filter(isChecked))
			.extend({ rateLimit: 0 });

		this.hasCheckedMessages = ko
			.computed(() => !!this.list.find(isChecked))
			.extend({ rateLimit: 0 });

		this.hasCheckedOrSelected = ko
			.computed(() => !!(this.selectorMessageSelected()
				|| this.selectorMessageFocused()
				|| this.list.find(item => item.checked())))
			.extend({ rateLimit: 50 });

		// Subscribers

		let timer = 0, fn = this.listLoadingAnimation;

		addSubscribablesTo(this, {
			listCompleteLoading: value => {
				if (value) {
					fn(value);
				} else if (fn()) {
					clearTimeout(timer);
					timer = setTimeout(() => {
						fn(value);
						timer = 0;
					}, 700);
				} else {
					fn(value);
				}
			},

			listLoadingAnimation: value => $htmlCL.toggle('list-loading', value),

			listLoading: value =>
				this.listCompleteLoading(value || this.listIsNotCompleted()),

			listIsNotCompleted: value =>
				this.listCompleteLoading(value || this.listLoading()),

			message: message => {
				clearTimeout(MessageSeenTimer);
				if (message) {
					if (!SettingsUserStore.usePreviewPane()) {
						AppUserStore.focusedState(Scope.MessageView);
					}
				} else {
					AppUserStore.focusedState(Scope.MessageList);

					this.messageFullScreenMode(false);
					this.hideMessageBodies();
				}
			},

			listEndFolder: folder => {
				const message = this.message();
				if (message && folder && folder !== message.folder) {
					this.message(null);
				}
			},

			isMessageSelected: value => elementById('rl-right').classList.toggle('message-selected', value)
		});

		this.purgeMessageBodyCache = this.purgeMessageBodyCache.throttle(30000);
	}

	purgeMessageBodyCache() {
		const messagesDom = this.messagesBodiesDom(),
			children = messagesDom && messagesDom.children;
		if (children) {
			while (15 < children.length) {
				children[0].remove();
			}
		}
	}

	initUidNextAndNewMessages(folder, uidNext, newMessages) {
		if (getFolderInboxName() === folder && uidNext) {
			if (arrayLength(newMessages)) {
				newMessages.forEach(item => addNewMessageCache(folder, item.Uid));

				NotificationUserStore.playSoundNotification();

				const len = newMessages.length;
				if (3 < len) {
					NotificationUserStore.displayDesktopNotification(
						AccountUserStore.email(),
						i18n('MESSAGE_LIST/NEW_MESSAGE_NOTIFICATION', {
							COUNT: len
						}),
						{ Url: mailBox(newMessages[0].Folder) }
					);
				} else {
					newMessages.forEach(item => {
						NotificationUserStore.displayDesktopNotification(
							EmailCollectionModel.reviveFromJson(item.From).toString(),
							item.Subject,
							{ Folder: item.Folder, Uid: item.Uid }
						);
					});
				}
			}

			setFolderUidNext(folder, uidNext);
		}
	}

	hideMessageBodies() {
		const messagesDom = this.messagesBodiesDom();
		messagesDom && Array.from(messagesDom.children).forEach(el => el.hidden = true);
	}

	/**
	 * @param {string} fromFolderFullName
	 * @param {Array} uidForRemove
	 * @param {string=} toFolderFullName = ''
	 * @param {boolean=} copy = false
	 */
	removeMessagesFromList(fromFolderFullName, uidForRemove, toFolderFullName = '', copy = false) {
		uidForRemove = uidForRemove.map(mValue => pInt(mValue));

		let unseenCount = 0,
			messageList = this.list,
			currentMessage = this.message();

		const trashFolder = FolderUserStore.trashFolder(),
			spamFolder = FolderUserStore.spamFolder(),
			fromFolder = getFolderFromCacheList(fromFolderFullName),
			toFolder = toFolderFullName ? getFolderFromCacheList(toFolderFullName) : null,
			messages =
				FolderUserStore.currentFolderFullName() === fromFolderFullName
					? messageList.filter(item => item && uidForRemove.includes(pInt(item.uid)))
					: [];

		messages.forEach(item => {
			if (item && item.isUnseen()) {
				++unseenCount;
			}
		});

		if (fromFolder && !copy) {
			fromFolder.messageCountAll(
				0 <= fromFolder.messageCountAll() - uidForRemove.length ? fromFolder.messageCountAll() - uidForRemove.length : 0
			);

			if (0 < unseenCount) {
				fromFolder.messageCountUnread(
					0 <= fromFolder.messageCountUnread() - unseenCount ? fromFolder.messageCountUnread() - unseenCount : 0
				);
			}
		}

		if (toFolder) {
			if (trashFolder === toFolder.fullName || spamFolder === toFolder.fullName) {
				unseenCount = 0;
			}

			toFolder.messageCountAll(toFolder.messageCountAll() + uidForRemove.length);
			if (0 < unseenCount) {
				toFolder.messageCountUnread(toFolder.messageCountUnread() + unseenCount);
			}

			toFolder.actionBlink(true);
		}

		if (messages.length) {
			if (copy) {
				messages.forEach(item => item.checked(false));
			} else {
				this.listIsNotCompleted(true);

				messages.forEach(item => {
					if (currentMessage && currentMessage.hash === item.hash) {
						currentMessage = null;
						this.message(null);
					}

					item.deleted(true);
				});

				setTimeout(() => messages.forEach(item => messageList.remove(item)), 350);
			}
		}

		if (fromFolderFullName) {
			setFolderHash(fromFolderFullName, '');
		}

		if (toFolderFullName) {
			setFolderHash(toFolderFullName, '');
		}

		if (this.listThreadUid()) {
			if (
				messageList.length &&
				!!messageList.find(item => !!(item && item.deleted() && item.uid == this.listThreadUid()))
			) {
				const message = messageList.find(item => item && !item.deleted());
				if (message && this.listThreadUid() != message.uid) {
					this.listThreadUid(message.uid);

					rl.route.setHash(
						mailBox(
							FolderUserStore.currentFolderFullNameHash(),
							this.listPage(),
							this.listSearch(),
							this.listThreadUid()
						),
						true,
						true
					);
				} else if (!message) {
					if (1 < this.listPage()) {
						this.listPage(this.listPage() - 1);

						rl.route.setHash(
							mailBox(
								FolderUserStore.currentFolderFullNameHash(),
								this.listPage(),
								this.listSearch(),
								this.listThreadUid()
							),
							true,
							true
						);
					} else {
						this.listThreadUid(0);

						rl.route.setHash(
							mailBox(
								FolderUserStore.currentFolderFullNameHash(),
								this.listPageBeforeThread(),
								this.listSearch()
							),
							true,
							true
						);
					}
				}
			}
		}
	}

	/**
	 * @param {Object} messageTextBody
	 */
	initBlockquoteSwitcher(messageTextBody) {
		messageTextBody && messageTextBody.querySelectorAll('blockquote:not(.rl-bq-switcher)').forEach(node => {
			if (node.textContent.trim() && !node.parentNode.closest('blockquote')) {
				let h = node.clientHeight || getRealHeight(node);
				if (0 === h || 100 < h) {
					const el = Element.fromHTML('<span class="rlBlockquoteSwitcher">•••</span>');
					node.classList.add('rl-bq-switcher','hidden-bq');
					node.before(el);
					el.addEventListener('click', () => node.classList.toggle('hidden-bq'));
				}
			}
		});
	}

	/**
	 * @param {Object} messageTextBody
	 * @param {Object} message
	 */
	initOpenPgpControls(messageTextBody, message) {
		messageTextBody && messageTextBody.querySelectorAll('.b-plain-openpgp:not(.inited)').forEach(node =>
			PgpUserStore.initMessageBodyControls(node, message)
		);
	}

	setMessage(data, cached, oMessage) {
		let isNew = false,
			json = data && data.Result,
			messagesDom = this.messagesBodiesDom(),
			selectedMessage = this.selectorMessageSelected(),
			message = oMessage || this.message();

		if (
			json &&
			MessageModel.validJson(json) &&
			message &&
			message.folder === json.Folder
		) {
			const threads = message.threads();
			if (message.uid != json.Uid && 1 < threads.length && threads.includes(json.Uid)) {
				message = oMessage ? null : MessageModel.reviveFromJson(json);
				if (message) {
					message.threads(threads);
					MessageFlagsCache.initMessage(message);

					this.message(this.staticMessage.populateByMessageListItem(message));
					message = this.message();

					isNew = true;
				}
			}

			if (message && message.uid == json.Uid) {
				oMessage || this.messageError('');

				if (cached) {
					delete json.IsSeen;
					delete json.IsFlagged;
					delete json.IsAnswered;
					delete json.IsForwarded;
					delete json.IsReadReceipt;
					delete json.IsDeleted;
				}

				message.revivePropertiesFromJson(json);
				addRequestedMessage(message.folder, message.uid);

				if (messagesDom) {
					let body = null,
						id = 'rl-msg-' + message.hash.replace(/[^a-zA-Z0-9]/g, '');

					const textBody = elementById(id);
					if (textBody) {
						message.body = textBody;
						message.fetchDataFromDom();
						messagesDom.append(textBody);
					} else {
						let isHtml = !!json.Html,
							plain = '',
							resultHtml = '<pre></pre>';
						if (isHtml) {
							resultHtml = json.Html.toString();
							if (SettingsUserStore.removeColors()) {
								resultHtml = removeColors(resultHtml);
							}
						} else if (json.Plain) {
							resultHtml = plainToHtml(json.Plain.toString());

							if ((message.isPgpSigned() || message.isPgpEncrypted()) && PgpUserStore.capaOpenPGP()) {
								plain = pString(json.Plain);
								const pre = createElement('pre');
								if (message.isPgpSigned()) {
									pre.className = 'b-plain-openpgp signed';
									pre.textContent = plain;
								} else if (message.isPgpEncrypted()) {
									pre.className = 'b-plain-openpgp encrypted';
									pre.textContent = plain;
								} else {
									pre.innerHTML = resultHtml;
								}
								resultHtml = pre.outerHTML;
							} else {
								resultHtml = '<pre>' + resultHtml + '</pre>';
							}
						}

						body = Element.fromHTML('<div id="' + id + '" hidden="" class="b-text-part '
							+ (isHtml ? 'html' : 'plain') + '">'
							+ (isHtml ? resultHtml : findEmailAndLinks(resultHtml))
							+ '</div>');

						if (isHtml) {
							// Drop Microsoft Office style properties
							const rgbRE = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/g,
								hex = n => ('0' + parseInt(n).toString(16)).slice(-2);
							body.querySelectorAll('[style*=mso]').forEach(el =>
								el.setAttribute('style', el.style.cssText.replace(rgbRE, (m,r,g,b) => '#' + hex(r) + hex(g) + hex(b)))
							);
						}

						body.rlIsHtml = isHtml;
						body.rlHasImages = !!json.HasExternals;

						message.body = body;

						message.isHtml(isHtml);
						message.hasImages(body.rlHasImages);

						messagesDom.append(body);

						if (json.HasInternals) {
							message.showInternalImages();
						}

						if (message.hasImages() && SettingsUserStore.showImages()) {
							message.showExternalImages();
						}

						this.purgeMessageBodyCache();
					}

					oMessage || this.messageActiveDom(message.body);

					oMessage || this.hideMessageBodies();

					if (body) {
						this.initOpenPgpControls(body, message);

						this.initBlockquoteSwitcher(body);
					}

					oMessage || (message.body.hidden = false);
					oMessage && message.viewPopupMessage();
				}

				MessageFlagsCache.initMessage(message);
				if (message.isUnseen()) {
					MessageSeenTimer = setTimeout(
						() => rl.app.messageListAction(message.folder, MessageSetAction.SetSeen, [message]),
						SettingsUserStore.messageReadDelay() * 1000 // seconds
					);
				}

				if (isNew) {
					if (
						selectedMessage &&
						message &&
						(message.folder !== selectedMessage.folder || message.uid != selectedMessage.uid)
					) {
						this.selectorMessageSelected(null);
						if (1 === this.list.length) {
							this.selectorMessageFocused(null);
						}
					} else if (!selectedMessage && message) {
						selectedMessage = this.list.find(
							subMessage =>
								subMessage &&
								subMessage.folder === message.folder &&
								subMessage.uid == message.uid
						);

						if (selectedMessage) {
							this.selectorMessageSelected(selectedMessage);
							this.selectorMessageFocused(selectedMessage);
						}
					}
				}
			}
		}
	}

	selectMessage(oMessage) {
		if (oMessage) {
			this.message(this.staticMessage.populateByMessageListItem(oMessage));
			this.populateMessageBody(this.message());
		} else {
			this.message(null);
		}
	}

	selectMessageByFolderAndUid(sFolder, iUid) {
		if (sFolder && iUid) {
			this.message(this.staticMessage.populateByMessageListItem(null));
			this.message().folder = sFolder;
			this.message().uid = iUid;

			this.populateMessageBody(this.message());
		} else {
			this.message(null);
		}
	}

	populateMessageBody(oMessage, preload) {
		if (oMessage) {
			preload || this.hideMessageBodies();
			preload || this.messageLoading(true);
			rl.app.Remote.message((iError, oData, bCached) => {
				if (iError) {
					if (Notification.RequestAborted !== iError && !preload) {
						this.message(null);
						this.messageError(getNotification(iError));
					}
				} else {
					this.setMessage(oData, bCached, preload ? oMessage : null);
				}
				preload || this.messageLoading(false);
			}, oMessage.folder, oMessage.uid);
		}
	}

	/**
	 * @param {Array} list
	 * @returns {string}
	 */
	calculateMessageListHash(list) {
		return list.map(message => message.hash + '_' + message.threadsLen() + '_' + message.flagHash()).join(
			'|'
		);
	}

	setMessageList(data, cached) {
		const collection = MessageCollectionModel.reviveFromJson(data.Result, cached);
		if (collection) {
			let unreadCountChange = false;

			const iCount = collection.MessageResultCount,
				iOffset = collection.Offset,
				folder = getFolderFromCacheList(collection.Folder);

			if (folder && !cached) {
				folder.expires = Date.now();

				setFolderHash(collection.Folder, collection.FolderHash);

				if (null != collection.MessageCount) {
					folder.messageCountAll(collection.MessageCount);
				}

				if (null != collection.MessageUnseenCount) {
					if (pInt(folder.messageCountUnread()) !== pInt(collection.MessageUnseenCount)) {
						unreadCountChange = true;
						MessageFlagsCache.clearFolder(folder.fullName);
					}

					folder.messageCountUnread(collection.MessageUnseenCount);
				}

				this.initUidNextAndNewMessages(folder.fullName, collection.UidNext, collection.NewMessages);
			}

			this.listCount(iCount);
			this.listSearch(pString(collection.Search));
			this.listPage(Math.ceil(iOffset / SettingsUserStore.messagesPerPage() + 1));
			this.listThreadUid(data.Result.ThreadUid);

			this.listEndFolder(collection.Folder);
			this.listEndSearch(this.listSearch());
			this.listEndThreadUid(this.listThreadUid());
			this.listEndPage(this.listPage());

			this.listDisableAutoSelect(true);

			this.list(collection);
			this.listIsNotCompleted(false);

			clearNewMessageCache();

			if (folder && (cached || unreadCountChange || SettingsUserStore.useThreads())) {
				rl.app.folderInformation(folder.fullName, collection);
			}
		} else {
			this.listCount(0);
			this.list([]);
			this.listError(getNotification(Notification.CantGetMessageList));
		}
	}
};
