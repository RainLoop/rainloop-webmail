import ko from 'ko';

import { Layout, Focused, MessageSetAction, StorageResultType, Notification } from 'Common/Enums';

import {
	pInt,
	pString,
	plainToHtml,
	findEmailAndLinks
} from 'Common/Utils';

import {
	getFolderInboxName,
	addNewMessageCache,
	setFolderUidNext,
	getFolderFromCacheList,
	setFolderHash,
	initMessageFlagsFromCache,
	addRequestedMessage,
	clearMessageFlagsFromCacheByFolder,
	clearNewMessageCache
} from 'Common/Cache';

import { MESSAGE_BODY_CACHE_LIMIT } from 'Common/Consts';
import { mailBox, notificationMailIcon } from 'Common/Links';
import { i18n, getNotification } from 'Common/Translator';

import { EmailCollectionModel } from 'Model/EmailCollection';
import { MessageModel } from 'Model/Message';
import { MessageCollectionModel } from 'Model/MessageCollection';

import { setHash } from 'Knoin/Knoin';

import AppStore from 'Stores/User/App';
import AccountStore from 'Stores/User/Account';
import FolderStore from 'Stores/User/Folder';
import PgpStore from 'Stores/User/Pgp';
import SettingsStore from 'Stores/User/Settings';
import NotificationStore from 'Stores/User/Notification';

import Remote from 'Remote/User/Fetch';

const
	hcont = Element.fromHTML('<div area="hidden" style="position:absolute;left:-5000px"></div>'),
	getRealHeight = el => {
		hcont.innerHTML = el.outerHTML;
		const result = hcont.clientHeight;
		hcont.innerHTML = '';
		return result;
	};

let iMessageBodyCacheCount = 0;

document.body.append(hcont);

class MessageUserStore {
	constructor() {
		this.staticMessage = new MessageModel();

		this.messageList = ko.observableArray([]).extend({ rateLimit: 0 });

		this.messageListCount = ko.observable(0);
		this.messageListSearch = ko.observable('');
		this.messageListThreadUid = ko.observable('');
		this.messageListPage = ko.observable(1);
		this.messageListPageBeforeThread = ko.observable(1);
		this.messageListError = ko.observable('');

		this.messageListEndFolder = ko.observable('');
		this.messageListEndSearch = ko.observable('');
		this.messageListEndThreadUid = ko.observable('');
		this.messageListEndPage = ko.observable(1);

		this.messageListLoading = ko.observable(false);
		this.messageListIsNotCompleted = ko.observable(false);
		this.messageListCompleteLoadingThrottle = ko.observable(false).extend({ throttle: 200 });
		this.messageListCompleteLoadingThrottleForAnimation = ko.observable(false).extend({ specialThrottle: 700 });

		this.messageListDisableAutoSelect = ko.observable(false).extend({ falseTimeout: 500 });

		this.selectorMessageSelected = ko.observable(null);
		this.selectorMessageFocused = ko.observable(null);

		// message viewer
		this.message = ko.observable(null);

		this.message.viewTrigger = ko.observable(false);

		this.messageError = ko.observable('');

		this.messageCurrentLoading = ko.observable(false);

		this.messageLoadingThrottle = ko.observable(false).extend({ throttle: 50 });

		this.messageFullScreenMode = ko.observable(false);

		this.messagesBodiesDom = ko.observable(null);
		this.messageActiveDom = ko.observable(null);

		this.computers();
		this.subscribers();

		this.onMessageResponse = this.onMessageResponse.bind(this);

		this.purgeMessageBodyCacheThrottle = this.purgeMessageBodyCache.throttle(30000);
	}

	computers() {
		this.messageLoading = ko.computed(() => this.messageCurrentLoading());

		this.messageListEndHash = ko.computed(
			() =>
				this.messageListEndFolder() +
				'|' +
				this.messageListEndSearch() +
				'|' +
				this.messageListEndThreadUid() +
				'|' +
				this.messageListEndPage()
		);

		this.messageListPageCount = ko.computed(() => {
			const page = Math.ceil(this.messageListCount() / SettingsStore.messagesPerPage());
			return 0 >= page ? 1 : page;
		});

		this.mainMessageListSearch = ko.computed({
			read: this.messageListSearch,
			write: (value) => {
				setHash(
					mailBox(FolderStore.currentFolderFullNameHash(), 1, value.toString().trim(), this.messageListThreadUid())
				);
			}
		});

		this.messageListCompleteLoading = ko.computed(() => {
			const one = this.messageListLoading(),
				two = this.messageListIsNotCompleted();
			return one || two;
		});

		this.isMessageSelected = ko.computed(() => null !== this.message());

		this.messageListChecked = ko
			.computed(() => this.messageList().filter(item => item.checked()))
			.extend({ rateLimit: 0 });

		this.hasCheckedMessages = ko.computed(() => 0 < this.messageListChecked().length).extend({ rateLimit: 0 });

		this.messageListCheckedOrSelected = ko.computed(() => {
			const checked = this.messageListChecked(),
				selectedMessage = this.selectorMessageSelected(),
				focusedMessage = this.selectorMessageFocused();

			if (checked.length) {
				return selectedMessage
					? checked.concat([selectedMessage]).filter((value, index, self) => self.indexOf(value) == index)
					: checked;
			} else if (selectedMessage) {
				return [selectedMessage];
			}

			return focusedMessage ? [focusedMessage] : [];
		});

		this.messageListCheckedOrSelectedUidsWithSubMails = ko.computed(() => {
			let result = [];
			this.messageListCheckedOrSelected().forEach(message => {
				if (message) {
					result.push(message.uid);
					if (1 < message.threadsLen()) {
						result = result.concat(message.threads()).filter((value, index, self) => self.indexOf(value) == index);
					}
				}
			});
			return result;
		});
	}

	subscribers() {
		this.messageListCompleteLoading.subscribe((value) => {
			value = !!value;
			this.messageListCompleteLoadingThrottle(value);
			this.messageListCompleteLoadingThrottleForAnimation(value);
		});

		this.messageList.subscribe(
			(list=> {
				list.forEach(item =>
					item && item.newForAnimation() && item.newForAnimation(false)
				)
			}).debounce(500)
		);

		this.message.subscribe(message => {
			if (message) {
				if (Layout.NoPreview === SettingsStore.layout()) {
					AppStore.focusedState(Focused.MessageView);
				}
			} else {
				AppStore.focusedState(Focused.MessageList);

				this.messageFullScreenMode(false);
				this.hideMessageBodies();
			}
		});

		this.messageLoading.subscribe(value => this.messageLoadingThrottle(value));

		this.messageListEndFolder.subscribe(folder => {
			const message = this.message();
			if (message && folder && folder !== message.folderFullNameRaw) {
				this.message(null);
			}
		});
	}

	purgeMessageBodyCache() {
		const end = iMessageBodyCacheCount - MESSAGE_BODY_CACHE_LIMIT;
		if (0 < end) {
			let count = 0;
			const messagesDom = this.messagesBodiesDom();
			if (messagesDom) {
				messagesDom.querySelectorAll('.rl-cache-class').forEach(node => {
					if (end > node.rlCacheCount) {
						node.classList.add('rl-cache-purge');
						++count;
					}
				});

				if (0 < count) {
					setTimeout(() => messagesDom.querySelectorAll('.rl-cache-purge').forEach(node => node.remove()), 350);
				}
			}
		}
	}

	initUidNextAndNewMessages(folder, uidNext, newMessages) {
		if (getFolderInboxName() === folder && uidNext) {
			if (Array.isNotEmpty(newMessages)) {
				newMessages.forEach(item => {
					addNewMessageCache(folder, item.Uid);
				});

				NotificationStore.playSoundNotification();

				const len = newMessages.length;
				if (3 < len) {
					NotificationStore.displayDesktopNotification(
						notificationMailIcon(),
						AccountStore.email(),
						i18n('MESSAGE_LIST/NEW_MESSAGE_NOTIFICATION', {
							'COUNT': len
						}),
						{ 'Folder': '', 'Uid': '' }
					);
				} else {
					newMessages.forEach(item => {
						NotificationStore.displayDesktopNotification(
							notificationMailIcon(),
							EmailCollectionModel.reviveFromJson(item.From).toString(),
							item.Subject,
							{ 'Folder': item.Folder, 'Uid': item.Uid }
						);
					});
				}
			}

			setFolderUidNext(folder, uidNext);
		}
	}

	hideMessageBodies() {
		const messagesDom = this.messagesBodiesDom();
		messagesDom && messagesDom.querySelectorAll('.b-text-part').forEach(el => el.hidden = true);
	}

	/**
	 * @param {string} fromFolderFullNameRaw
	 * @param {Array} uidForRemove
	 * @param {string=} toFolderFullNameRaw = ''
	 * @param {boolean=} copy = false
	 */
	removeMessagesFromList(fromFolderFullNameRaw, uidForRemove, toFolderFullNameRaw = '', copy = false) {
		uidForRemove = uidForRemove.map(mValue => pInt(mValue));

		let unseenCount = 0,
			messageList = this.messageList(),
			currentMessage = this.message();

		const trashFolder = FolderStore.trashFolder(),
			spamFolder = FolderStore.spamFolder(),
			fromFolder = getFolderFromCacheList(fromFolderFullNameRaw),
			toFolder = toFolderFullNameRaw ? getFolderFromCacheList(toFolderFullNameRaw) : null,
			currentFolderFullNameRaw = FolderStore.currentFolderFullNameRaw(),
			messages =
				currentFolderFullNameRaw === fromFolderFullNameRaw
					? messageList.filter(item => item && uidForRemove.includes(pInt(item.uid)))
					: [];

		messages.forEach(item => {
			if (item && item.unseen()) {
				unseenCount += 1;
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
			if (trashFolder === toFolder.fullNameRaw || spamFolder === toFolder.fullNameRaw) {
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
				messages.forEach(item => {
					item.checked(false);
				});
			} else {
				this.messageListIsNotCompleted(true);

				messages.forEach(item => {
					if (currentMessage && currentMessage.hash === item.hash) {
						currentMessage = null;
						this.message(null);
					}

					item.deleted(true);
				});

				setTimeout(() => {
					messages.forEach(item => {
						this.messageList.remove(item);
					});
				}, 350);
			}
		}

		if (fromFolderFullNameRaw) {
			setFolderHash(fromFolderFullNameRaw, '');
		}

		if (toFolderFullNameRaw) {
			setFolderHash(toFolderFullNameRaw, '');
		}

		if (this.messageListThreadUid()) {
			messageList = this.messageList();

			if (
				messageList &&
				messageList.length &&
				!!messageList.find(item => !!(item && item.deleted() && item.uid === this.messageListThreadUid()))
			) {
				const message = messageList.find(item => item && !item.deleted());
				if (message && this.messageListThreadUid() !== pString(message.uid)) {
					this.messageListThreadUid(pString(message.uid));

					setHash(
						mailBox(
							FolderStore.currentFolderFullNameHash(),
							this.messageListPage(),
							this.messageListSearch(),
							this.messageListThreadUid()
						),
						true,
						true
					);
				} else if (!message) {
					if (1 < this.messageListPage()) {
						this.messageListPage(this.messageListPage() - 1);

						setHash(
							mailBox(
								FolderStore.currentFolderFullNameHash(),
								this.messageListPage(),
								this.messageListSearch(),
								this.messageListThreadUid()
							),
							true,
							true
						);
					} else {
						this.messageListThreadUid('');

						setHash(
							mailBox(
								FolderStore.currentFolderFullNameHash(),
								this.messageListPageBeforeThread(),
								this.messageListSearch()
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
			PgpStore.initMessageBodyControls(node, message)
		);
	}

	setMessage(data, cached) {
		let isNew = false,
			body = null,
			id = '',
			plain = '',
			resultHtml = '',
			pgpSigned = false,
			messagesDom = this.messagesBodiesDom(),
			selectedMessage = this.selectorMessageSelected(),
			message = this.message();

		if (
			data &&
			message &&
			data.Result &&
			'Object/Message' === data.Result['@Object'] &&
			message.folderFullNameRaw === data.Result.Folder
		) {
			const threads = message.threads();
			if (message.uid !== data.Result.Uid && 1 < threads.length && threads.includes(data.Result.Uid)) {
				message = MessageModel.newInstanceFromJson(data.Result);
				if (message) {
					message.threads(threads);
					initMessageFlagsFromCache(message);

					this.message(this.staticMessage.populateByMessageListItem(message));
					message = this.message();

					isNew = true;
				}
			}

			if (message && message.uid === data.Result.Uid) {
				this.messageError('');

				message.initUpdateByMessageJson(data.Result);
				addRequestedMessage(message.folderFullNameRaw, message.uid);

				if (!cached) {
					message.initFlagsByJson(data.Result);
				}

				if (messagesDom) {
					id = 'rl-mgs-' + message.hash.replace(/[^a-zA-Z0-9]/g, '');

					const textBody = document.getElementById(id);
					if (textBody) {
						iMessageBodyCacheCount += 1;
						textBody.rlCacheCount = iMessageBodyCacheCount;
						message.fetchDataFromDom();
						message.body = textBody;
					} else {
						let isHtml = false;
						if (data.Result.Html) {
							isHtml = true;
							resultHtml = data.Result.Html.toString();
						} else if (data.Result.Plain) {
							isHtml = false;
							resultHtml = plainToHtml(data.Result.Plain.toString());

							if ((message.isPgpSigned() || message.isPgpEncrypted()) && PgpStore.capaOpenPGP()) {
								plain = pString(data.Result.Plain);

								const isPgpEncrypted = /---BEGIN PGP MESSAGE---/.test(plain);
								if (!isPgpEncrypted) {
									pgpSigned =
										/-----BEGIN PGP SIGNED MESSAGE-----/.test(plain) && /-----BEGIN PGP SIGNATURE-----/.test(plain);
								}

								const pre = document.createElement('pre');
								if (pgpSigned && message.isPgpSigned()) {
									pre.className = 'b-plain-openpgp signed';
									pre.textContent = plain;
								} else if (isPgpEncrypted && message.isPgpEncrypted()) {
									pre.className = 'b-plain-openpgp encrypted';
									pre.textContent = plain;
								} else {
									pre.innerHTML = resultHtml;
								}
								resultHtml = pre.outerHTML;

								message.isPgpSigned(pgpSigned);
								message.isPgpEncrypted(isPgpEncrypted);
							} else {
								resultHtml = '<pre>' + resultHtml + '</pre>';
							}
						} else {
							isHtml = false;
							resultHtml = '<pre>' + resultHtml + '</pre>';
						}

						iMessageBodyCacheCount += 1;

						body = Element.fromHTML('<div id="' + id + '" hidden="" class="rl-cache-class b-text-part '
							+ (isHtml ? 'html' : 'plain') + '">'
							+ findEmailAndLinks(resultHtml)
							+ '</div>');
						body.rlCacheCount = iMessageBodyCacheCount;

						// Drop Microsoft Office style properties
						const rgbRE = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/g,
							hex = n => ('0' + parseInt(n).toString(16)).slice(-2);
						body.querySelectorAll('[style*=mso]').forEach(el =>
							el.setAttribute('style', el.style.cssText.replace(rgbRE, (m,r,g,b) => '#' + hex(r) + hex(g) + hex(b)))
						);

						message.body = body;

						message.isHtml(!!isHtml);
						message.hasImages(!!data.Result.HasExternals);

						messagesDom.append(body);

						message.storeDataInDom();

						if (data.Result.HasInternals) {
							message.showInternalImages();
						}

						if (message.hasImages() && SettingsStore.showImages()) {
							message.showExternalImages();
						}

						this.purgeMessageBodyCacheThrottle();
					}

					this.messageActiveDom(message.body);

					this.hideMessageBodies();

					if (body) {
						this.initOpenPgpControls(body, message);

						this.initBlockquoteSwitcher(body);
					}

					message.body.hidden = false;
				}

				initMessageFlagsFromCache(message);
				if (message.unseen() || message.hasUnseenSubMessage()) {
					rl.app.messageListAction(message.folderFullNameRaw, MessageSetAction.SetSeen, [message]);
				}

				if (isNew) {
					message = this.message();

					if (
						selectedMessage &&
						message &&
						(message.folderFullNameRaw !== selectedMessage.folderFullNameRaw || message.uid !== selectedMessage.uid)
					) {
						this.selectorMessageSelected(null);
						if (1 === this.messageList().length) {
							this.selectorMessageFocused(null);
						}
					} else if (!selectedMessage && message) {
						selectedMessage = this.messageList().find(
							subMessage =>
								subMessage &&
								subMessage.folderFullNameRaw === message.folderFullNameRaw &&
								subMessage.uid === message.uid
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

	selectMessageByFolderAndUid(sFolder, sUid) {
		if (sFolder && sUid) {
			this.message(this.staticMessage.populateByMessageListItem(null));
			this.message().folderFullNameRaw = sFolder;
			this.message().uid = sUid;

			this.populateMessageBody(this.message());
		} else {
			this.message(null);
		}
	}

	populateMessageBody(oMessage) {
		if (oMessage) {
			if (Remote.message(this.onMessageResponse, oMessage.folderFullNameRaw, oMessage.uid)) {
				this.messageCurrentLoading(true);
			}
		}
	}

	/**
	 * @param {string} sResult
	 * @param {AjaxJsonDefaultResponse} oData
	 * @param {boolean} bCached
	 */
	onMessageResponse(sResult, oData, bCached) {
		this.hideMessageBodies();

		this.messageCurrentLoading(false);

		if (StorageResultType.Success === sResult && oData && oData.Result) {
			this.setMessage(oData, bCached);
		} else if (StorageResultType.Unload === sResult) {
			this.message(null);
			this.messageError('');
		} else if (StorageResultType.Abort !== sResult) {
			this.message(null);
			this.messageError(
				oData && oData.ErrorCode ? getNotification(oData.ErrorCode) : getNotification(Notification.UnknownError)
			);
		}
	}

	/**
	 * @param {Array} list
	 * @returns {string}
	 */
	calculateMessageListHash(list) {
		return list.map(message => '' + message.hash + '_' + message.threadsLen() + '_' + message.flagHash()).join(
			'|'
		);
	}

	setMessageList(data, cached) {
		const collection = data && MessageCollectionModel.reviveFromJson(data.Result, cached);
		if (collection) {
			let unreadCountChange = false;

			const iCount = collection.MessageResultCount,
				iOffset = collection.Offset,
				folder = getFolderFromCacheList(collection.Folder);

			if (folder && !cached) {
				folder.interval = Date.now() / 1000;

				setFolderHash(collection.Folder, collection.FolderHash);

				if (null != collection.MessageCount) {
					folder.messageCountAll(collection.MessageCount);
				}

				if (null != collection.MessageUnseenCount) {
					if (pInt(folder.messageCountUnread()) !== pInt(collection.MessageUnseenCount)) {
						unreadCountChange = true;
						clearMessageFlagsFromCacheByFolder(folder.fullNameRaw);
					}

					folder.messageCountUnread(collection.MessageUnseenCount);
				}

				this.initUidNextAndNewMessages(folder.fullNameRaw, collection.UidNext, collection.NewMessages);
			}

			this.messageListCount(iCount);
			this.messageListSearch(pString(collection.Search));
			this.messageListPage(Math.ceil(iOffset / SettingsStore.messagesPerPage() + 1));
			this.messageListThreadUid(pString(data.Result.ThreadUid));

			this.messageListEndFolder(collection.Folder);
			this.messageListEndSearch(this.messageListSearch());
			this.messageListEndThreadUid(this.messageListThreadUid());
			this.messageListEndPage(this.messageListPage());

			this.messageListDisableAutoSelect(true);

			this.messageList(collection);
			this.messageListIsNotCompleted(false);

			clearNewMessageCache();

			if (folder && (cached || unreadCountChange || SettingsStore.useThreads())) {
				rl.app.folderInformation(folder.fullNameRaw, collection);
			}
		} else {
			this.messageListCount(0);
			this.messageList([]);
			this.messageListError(getNotification(data && data.ErrorCode ? data.ErrorCode : Notification.CantGetMessageList));
		}
	}
}

export default new MessageUserStore();
