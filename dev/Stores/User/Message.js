import window from 'window';
import _ from '_';
import ko from 'ko';
import $ from '$';

import { Magics, Layout, Focused, MessageSetAction, StorageResultType, Notification } from 'Common/Enums';

import {
	trim,
	isNormal,
	isArray,
	inArray,
	pInt,
	pString,
	plainToHtml,
	windowResize,
	findEmailAndLinks,
	getRealHeight
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
	hasNewMessageAndRemoveFromCache,
	storeMessageFlagsToCache,
	clearNewMessageCache
} from 'Common/Cache';

import { MESSAGE_BODY_CACHE_LIMIT } from 'Common/Consts';
import { data as GlobalsData, $div } from 'Common/Globals';
import { mailBox, notificationMailIcon } from 'Common/Links';
import { i18n, getNotification } from 'Common/Translator';
import { momentNowUnix } from 'Common/Momentor';

import * as MessageHelper from 'Helper/Message';
import { MessageModel } from 'Model/Message';

import { setHash } from 'Knoin/Knoin';

import AppStore from 'Stores/User/App';
import AccountStore from 'Stores/User/Account';
import FolderStore from 'Stores/User/Folder';
import PgpStore from 'Stores/User/Pgp';
import SettingsStore from 'Stores/User/Settings';
import NotificationStore from 'Stores/User/Notification';

import { getApp } from 'Helper/Apps/User';

import Remote from 'Remote/User/Ajax';

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

		this.messageLoadingThrottle = ko.observable(false).extend({ throttle: Magics.Time50ms });

		this.messageFullScreenMode = ko.observable(false);

		this.messagesBodiesDom = ko.observable(null);
		this.messageActiveDom = ko.observable(null);

		this.computers();
		this.subscribers();

		this.onMessageResponse = _.bind(this.onMessageResponse, this);

		this.purgeMessageBodyCacheThrottle = _.throttle(this.purgeMessageBodyCache, Magics.Time30s);
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
			const page = window.Math.ceil(this.messageListCount() / SettingsStore.messagesPerPage());
			return 0 >= page ? 1 : page;
		});

		this.mainMessageListSearch = ko.computed({
			read: this.messageListSearch,
			write: (value) => {
				setHash(
					mailBox(FolderStore.currentFolderFullNameHash(), 1, trim(value.toString()), this.messageListThreadUid())
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
			.computed(() => _.filter(this.messageList(), (item) => item.checked()))
			.extend({ rateLimit: 0 });

		this.hasCheckedMessages = ko.computed(() => 0 < this.messageListChecked().length).extend({ rateLimit: 0 });

		this.messageListCheckedOrSelected = ko.computed(() => {
			const checked = this.messageListChecked(),
				selectedMessage = this.selectorMessageSelected(),
				focusedMessage = this.selectorMessageFocused();

			if (checked.length) {
				return _.union(checked, selectedMessage ? [selectedMessage] : []);
			} else if (selectedMessage) {
				return [selectedMessage];
			}

			return focusedMessage ? [focusedMessage] : [];
		});

		this.messageListCheckedOrSelectedUidsWithSubMails = ko.computed(() => {
			let result = [];
			_.each(this.messageListCheckedOrSelected(), (message) => {
				if (message) {
					result.push(message.uid);
					if (1 < message.threadsLen()) {
						result = _.union(result, message.threads());
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
			_.debounce((list) => {
				_.each(list, (item) => {
					if (item && item.newForAnimation()) {
						item.newForAnimation(false);
					}
				});
			}, Magics.Time500ms)
		);

		this.message.subscribe((message) => {
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

		this.messageLoading.subscribe((value) => {
			this.messageLoadingThrottle(value);
		});

		this.messagesBodiesDom.subscribe((dom) => {
			if (dom && !(dom instanceof $)) {
				this.messagesBodiesDom($(dom));
			}
		});

		this.messageListEndFolder.subscribe((folder) => {
			const message = this.message();
			if (message && folder && folder !== message.folderFullNameRaw) {
				this.message(null);
			}
		});
	}

	purgeMessageBodyCache() {
		let count = 0;
		const end = GlobalsData.iMessageBodyCacheCount - MESSAGE_BODY_CACHE_LIMIT;

		if (0 < end) {
			const messagesDom = this.messagesBodiesDom();
			if (messagesDom) {
				messagesDom.find('.rl-cache-class').each(function() {
					const item = $(this); // eslint-disable-line no-invalid-this
					if (end > item.data('rl-cache-count')) {
						item.addClass('rl-cache-purge');
						count += 1;
					}
				});

				if (0 < count) {
					_.delay(() => messagesDom.find('.rl-cache-purge').remove(), Magics.Time350ms);
				}
			}
		}
	}

	initUidNextAndNewMessages(folder, uidNext, newMessages) {
		if (getFolderInboxName() === folder && isNormal(uidNext) && '' !== uidNext) {
			if (isArray(newMessages) && 0 < newMessages.length) {
				_.each(newMessages, (item) => {
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
					_.each(newMessages, (item) => {
						NotificationStore.displayDesktopNotification(
							notificationMailIcon(),
							MessageHelper.emailArrayToString(MessageHelper.emailArrayFromJson(item.From), false),
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
		if (messagesDom) {
			messagesDom.find('.b-text-part').hide();
		}
	}

	/**
	 * @param {string} fromFolderFullNameRaw
	 * @param {Array} uidForRemove
	 * @param {string=} toFolderFullNameRaw = ''
	 * @param {boolean=} copy = false
	 */
	removeMessagesFromList(fromFolderFullNameRaw, uidForRemove, toFolderFullNameRaw = '', copy = false) {
		uidForRemove = _.map(uidForRemove, (mValue) => pInt(mValue));

		let unseenCount = 0,
			messageList = this.messageList(),
			currentMessage = this.message();

		const trashFolder = FolderStore.trashFolder(),
			spamFolder = FolderStore.spamFolder(),
			fromFolder = getFolderFromCacheList(fromFolderFullNameRaw),
			toFolder = '' === toFolderFullNameRaw ? null : getFolderFromCacheList(toFolderFullNameRaw || ''),
			currentFolderFullNameRaw = FolderStore.currentFolderFullNameRaw(),
			messages =
				currentFolderFullNameRaw === fromFolderFullNameRaw
					? _.filter(messageList, (item) => item && -1 < inArray(pInt(item.uid), uidForRemove))
					: [];

		_.each(messages, (item) => {
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

		if (0 < messages.length) {
			if (copy) {
				_.each(messages, (item) => {
					item.checked(false);
				});
			} else {
				this.messageListIsNotCompleted(true);

				_.each(messages, (item) => {
					if (currentMessage && currentMessage.hash === item.hash) {
						currentMessage = null;
						this.message(null);
					}

					item.deleted(true);
				});

				_.delay(() => {
					_.each(messages, (item) => {
						this.messageList.remove(item);
					});
				}, Magics.Time350ms);
			}
		}

		if ('' !== fromFolderFullNameRaw) {
			setFolderHash(fromFolderFullNameRaw, '');
		}

		if ('' !== toFolderFullNameRaw) {
			setFolderHash(toFolderFullNameRaw, '');
		}

		if ('' !== this.messageListThreadUid()) {
			messageList = this.messageList();

			if (
				messageList &&
				0 < messageList.length &&
				!!_.find(messageList, (item) => !!(item && item.deleted() && item.uid === this.messageListThreadUid()))
			) {
				const message = _.find(messageList, (item) => item && !item.deleted());
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
		if (messageTextBody) {
			const $oList = $('blockquote:not(.rl-bq-switcher)', messageTextBody).filter(function() {
				return (
					0 ===
					$(this)
						.parent()
						.closest('blockquote', messageTextBody).length
				); // eslint-disable-line no-invalid-this
			});

			if ($oList && 0 < $oList.length) {
				$oList.each(function() {
					const $this = $(this); // eslint-disable-line no-invalid-this

					let h = $this.height();
					if (0 === h) {
						h = getRealHeight($this);
					}

					if ('' !== trim($this.text()) && (0 === h || 100 < h)) {
						$this.addClass('rl-bq-switcher hidden-bq');
						$('<span class="rlBlockquoteSwitcher"><i class="icon-ellipsis" /></span>')
							.insertBefore($this)
							.on('click.rlBlockquoteSwitcher', () => {
								$this.toggleClass('hidden-bq');
								windowResize();
							})
							.after('<br />')
							.before('<br />');
					}
				});
			}
		}
	}

	/**
	 * @param {Object} messageTextBody
	 * @param {Object} message
	 */
	initOpenPgpControls(messageTextBody, message) {
		if (messageTextBody && messageTextBody.find) {
			messageTextBody.find('.b-plain-openpgp:not(.inited)').each(function() {
				PgpStore.initMessageBodyControls($(this), message); // eslint-disable-line no-invalid-this
			});
		}
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
			if (message.uid !== data.Result.Uid && 1 < threads.length && -1 < inArray(data.Result.Uid, threads)) {
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

				messagesDom = messagesDom && messagesDom[0] ? messagesDom : null;
				if (messagesDom) {
					id = 'rl-mgs-' + message.hash.replace(/[^a-zA-Z0-9]/g, '');

					const textBody = messagesDom.find('#' + id);
					if (!textBody || !textBody[0]) {
						let isHtml = false;
						if (isNormal(data.Result.Html) && '' !== data.Result.Html) {
							isHtml = true;
							resultHtml = data.Result.Html.toString();
						} else if (isNormal(data.Result.Plain) && '' !== data.Result.Plain) {
							isHtml = false;
							resultHtml = plainToHtml(data.Result.Plain.toString(), false);

							if ((message.isPgpSigned() || message.isPgpEncrypted()) && PgpStore.capaOpenPGP()) {
								plain = pString(data.Result.Plain);

								const isPgpEncrypted = /---BEGIN PGP MESSAGE---/.test(plain);
								if (!isPgpEncrypted) {
									pgpSigned =
										/-----BEGIN PGP SIGNED MESSAGE-----/.test(plain) && /-----BEGIN PGP SIGNATURE-----/.test(plain);
								}

								$div.empty();
								if (pgpSigned && message.isPgpSigned()) {
									resultHtml = $div.append($('<pre class="b-plain-openpgp signed"></pre>').text(plain)).html();
								} else if (isPgpEncrypted && message.isPgpEncrypted()) {
									resultHtml = $div.append($('<pre class="b-plain-openpgp encrypted"></pre>').text(plain)).html();
								} else {
									resultHtml = '<pre>' + resultHtml + '</pre>';
								}

								$div.empty();

								message.isPgpSigned(pgpSigned);
								message.isPgpEncrypted(isPgpEncrypted);
							} else {
								resultHtml = '<pre>' + resultHtml + '</pre>';
							}
						} else {
							isHtml = false;
							resultHtml = '<pre>' + resultHtml + '</pre>';
						}

						GlobalsData.iMessageBodyCacheCount += 1;

						body = $('<div id="' + id + '" ></div>')
							.hide()
							.addClass('rl-cache-class');
						body.data('rl-cache-count', GlobalsData.iMessageBodyCacheCount);

						body.html(findEmailAndLinks(resultHtml)).addClass('b-text-part ' + (isHtml ? 'html' : 'plain'));

						message.isHtml(!!isHtml);
						message.hasImages(!!data.Result.HasExternals);

						message.body = body;
						if (message.body) {
							messagesDom.append(message.body);
						}

						message.storeDataInDom();

						if (data.Result.HasInternals) {
							message.showInternalImages(true);
						}

						if (message.hasImages() && SettingsStore.showImages()) {
							message.showExternalImages(true);
						}

						this.purgeMessageBodyCacheThrottle();
					} else {
						message.body = textBody;
						if (message.body) {
							GlobalsData.iMessageBodyCacheCount += 1;
							message.body.data('rl-cache-count', GlobalsData.iMessageBodyCacheCount);
							message.fetchDataFromDom();
						}
					}

					this.messageActiveDom(message.body);

					this.hideMessageBodies();

					if (body) {
						this.initOpenPgpControls(body, message);

						this.initBlockquoteSwitcher(body);
					}

					message.body.show();
				}

				initMessageFlagsFromCache(message);
				if (message.unseen() || message.hasUnseenSubMessage()) {
					getApp().messageListAction(message.folderFullNameRaw, MessageSetAction.SetSeen, [message]);
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
						selectedMessage = _.find(
							this.messageList(),
							(subMessage) =>
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

				windowResize();
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
		return _.map(list, (message) => '' + message.hash + '_' + message.threadsLen() + '_' + message.flagHash()).join(
			'|'
		);
	}

	setMessageList(data, cached) {
		if (
			data &&
			data.Result &&
			'Collection/MessageCollection' === data.Result['@Object'] &&
			data.Result['@Collection'] &&
			isArray(data.Result['@Collection'])
		) {
			let newCount = 0,
				unreadCountChange = false;

			const list = [],
				utc = momentNowUnix(),
				iCount = pInt(data.Result.MessageResultCount),
				iOffset = pInt(data.Result.Offset);

			const folder = getFolderFromCacheList(isNormal(data.Result.Folder) ? data.Result.Folder : '');

			if (folder && !cached) {
				folder.interval = utc;

				setFolderHash(data.Result.Folder, data.Result.FolderHash);

				if (isNormal(data.Result.MessageCount)) {
					folder.messageCountAll(data.Result.MessageCount);
				}

				if (isNormal(data.Result.MessageUnseenCount)) {
					if (pInt(folder.messageCountUnread()) !== pInt(data.Result.MessageUnseenCount)) {
						unreadCountChange = true;
					}

					folder.messageCountUnread(data.Result.MessageUnseenCount);
				}

				this.initUidNextAndNewMessages(folder.fullNameRaw, data.Result.UidNext, data.Result.NewMessages);
			}

			if (unreadCountChange && folder) {
				clearMessageFlagsFromCacheByFolder(folder.fullNameRaw);
			}

			_.each(data.Result['@Collection'], (jsonMessage) => {
				if (jsonMessage && 'Object/Message' === jsonMessage['@Object']) {
					const message = MessageModel.newInstanceFromJson(jsonMessage);
					if (message) {
						if (hasNewMessageAndRemoveFromCache(message.folderFullNameRaw, message.uid) && 5 >= newCount) {
							newCount += 1;
							message.newForAnimation(true);
						}

						message.deleted(false);

						if (cached) {
							initMessageFlagsFromCache(message);
						} else {
							storeMessageFlagsToCache(message);
						}

						list.push(message);
					}
				}
			});

			this.messageListCount(iCount);
			this.messageListSearch(isNormal(data.Result.Search) ? data.Result.Search : '');
			this.messageListPage(window.Math.ceil(iOffset / SettingsStore.messagesPerPage() + 1));
			this.messageListThreadUid(isNormal(data.Result.ThreadUid) ? pString(data.Result.ThreadUid) : '');

			this.messageListEndFolder(isNormal(data.Result.Folder) ? data.Result.Folder : '');
			this.messageListEndSearch(this.messageListSearch());
			this.messageListEndThreadUid(this.messageListThreadUid());
			this.messageListEndPage(this.messageListPage());

			this.messageListDisableAutoSelect(true);

			this.messageList(list);
			this.messageListIsNotCompleted(false);

			clearNewMessageCache();

			if (folder && (cached || unreadCountChange || SettingsStore.useThreads())) {
				getApp().folderInformation(folder.fullNameRaw, list);
			}
		} else {
			this.messageListCount(0);
			this.messageList([]);
			this.messageListError(getNotification(data && data.ErrorCode ? data.ErrorCode : Notification.CantGetMessageList));
		}
	}
}

export default new MessageUserStore();
