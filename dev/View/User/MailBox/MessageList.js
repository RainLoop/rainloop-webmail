import ko from 'ko';
import { addObservablesTo, addComputablesTo } from 'External/ko';

import { Scope } from 'Common/Enums';

import { ComposeType, FolderType, MessageSetAction } from 'Common/EnumsUser';

import { doc,
	leftPanelDisabled, toggleLeftPanel,
	Settings, SettingsCapa,
	addEventsListeners,
	addShortcut, registerShortcut, formFieldFocused
} from 'Common/Globals';

import { arrayLength } from 'Common/Utils';
import { computedPaginatorHelper, showMessageComposer, populateMessageBody, download, moveAction } from 'Common/UtilsUser';
import { FileInfo } from 'Common/File';
import { isFullscreen, toggleFullscreen } from 'Common/Fullscreen';

import { mailBox, attachmentDownload } from 'Common/Links';
import { Selector } from 'Common/Selector';

import { i18n } from 'Common/Translator';

import { dropFilesInFolder } from 'Common/Folders';

import {
	getFolderFromCacheList,
	MessageFlagsCache
} from 'Common/Cache';

import { AppUserStore } from 'Stores/User/App';
import { SettingsUserStore } from 'Stores/User/Settings';
import { FolderUserStore } from 'Stores/User/Folder';
import { LanguageStore } from 'Stores/Language';
import { MessageUserStore } from 'Stores/User/Message';
import { MessagelistUserStore } from 'Stores/User/Messagelist';
import { ThemeStore } from 'Stores/Theme';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands, showScreenPopup, arePopupsVisible } from 'Knoin/Knoin';
import { AbstractViewRight } from 'Knoin/AbstractViews';

import { FolderClearPopupView } from 'View/Popup/FolderClear';
import { AdvancedSearchPopupView } from 'View/Popup/AdvancedSearch';
import { ComposePopupView } from 'View/Popup/Compose';

import { MessageModel } from 'Model/Message';

const
	canBeMovedHelper = () => MessagelistUserStore.hasCheckedOrSelected(),

	/**
	 * @param {string} sFolderFullName
	 * @param {number} iSetAction
	 * @param {Array=} aMessages = null
	 * @returns {void}
	 */
	listAction = (...args) => MessagelistUserStore.setAction(...args),

	moveMessagesToFolderType = (toFolderType, bDelete) =>
		rl.app.moveMessagesToFolderType(
			toFolderType,
			FolderUserStore.currentFolderFullName(),
			MessagelistUserStore.listCheckedOrSelectedUidsWithSubMails(),
			bDelete
		),

	pad2 = v => 10 > v ? '0' + v : '' + v,
	Ymd = dt => dt.getFullYear() + pad2(1 + dt.getMonth()) + pad2(dt.getDate());

let
	iGoToUpOrDownTimeout = 0,
	sLastSearchValue = '';

export class MailMessageList extends AbstractViewRight {
	constructor() {
		super();

		this.allowDangerousActions = SettingsCapa('DangerousActions');

		this.messageList = MessagelistUserStore;
		this.archiveAllowed = MessagelistUserStore.archiveAllowed;
		this.canMarkAsSpam = MessagelistUserStore.canMarkAsSpam;
		this.isSpamFolder = MessagelistUserStore.isSpamFolder;

		this.composeInEdit = ComposePopupView.inEdit;

		this.isMobile = ThemeStore.isMobile;
		this.leftPanelDisabled = leftPanelDisabled;
		this.toggleLeftPanel = toggleLeftPanel;

		this.popupVisibility = arePopupsVisible;

		this.useCheckboxesInList = SettingsUserStore.useCheckboxesInList;
		this.listPerDay = SettingsUserStore.listPerDay;

		this.userUsageProc = FolderUserStore.quotaPercentage;

		addObservablesTo(this, {
			moreDropdownTrigger: false,
			sortDropdownTrigger: false,

			focusSearch: false
		});

		// append drag and drop
		this.dragOver = ko.observable(false).extend({ throttle: 1 });
		this.dragOverEnter = ko.observable(false).extend({ throttle: 1 });

		const attachmentsActions = Settings.app('attachmentsActions');
		this.attachmentsActions = ko.observableArray(arrayLength(attachmentsActions) ? attachmentsActions : []);

		addComputablesTo(this, {

			sortSupported: () =>
				FolderUserStore.hasCapability('SORT') | FolderUserStore.hasCapability('ESORT'),

			messageListSearchDesc: () => {
				const value = MessagelistUserStore().Search;
				return value ? i18n('MESSAGE_LIST/SEARCH_RESULT_FOR', { SEARCH: value }) : ''
			},

			messageListPaginator: computedPaginatorHelper(MessagelistUserStore.page,
				MessagelistUserStore.pageCount),

			checkAll: {
				read: () => MessagelistUserStore.hasChecked(),
				write: (value) => {
					value = !!value;
					MessagelistUserStore.forEach(message => message.checked(value));
				}
			},

			inputSearch: {
				read: MessagelistUserStore.mainSearch,
				write: value => sLastSearchValue = value
			},

			isIncompleteChecked: () => {
				const c = MessagelistUserStore.listChecked().length;
				return c && MessagelistUserStore().length > c;
			},

			mobileCheckedStateShow: () => ThemeStore.isMobile() ? MessagelistUserStore.hasChecked() : 1,

			mobileCheckedStateHide: () => ThemeStore.isMobile() ? !MessagelistUserStore.hasChecked() : 1,

			listByDay: () => {
				let list = [], current, today = Ymd(new Date()),
					rtf = Intl.RelativeTimeFormat
						? new Intl.RelativeTimeFormat(doc.documentElement.lang, { numeric: "auto" }) : 0;
				MessagelistUserStore.forEach(msg => {
					let date = (new Date(msg.dateTimeStampInUTC() * 1000)),
						ymd = Ymd(date);
					if (!current || ymd != current.ymd) {
						if (rtf && today == ymd) {
							date = rtf.format(0, 'day');
						} else if (rtf && today - 1 == ymd) {
							date = rtf.format(-1, 'day');
//						} else if (today - 7 < ymd) {
//							date = date.format({weekday: 'long'});
//							date = date.format({dateStyle: 'full'},0,LanguageStore.hourCycle());
						} else {
//							date = date.format({dateStyle: 'medium'},0,LanguageStore.hourCycle());
							date = date.format({dateStyle: 'full'},0,LanguageStore.hourCycle());
						}
						current = {
							ymd: ymd,
							day: date,
							messages: []
						};
						list.push(current);
					}
					current.messages.push(msg);
				});
				return list;
			},

			sortText: () => {
				let mode = FolderUserStore.sortMode(),
					desc = '' === mode || mode.includes('REVERSE');
				mode = mode.split(/\s+/);
				if (mode.includes('FROM')) {
					 return '@' + (desc ? '⬆' : '⬇');
				}
				if (mode.includes('SUBJECT')) {
					 return '𝐒' + (desc ? '⬆' : '⬇');
				}
				return (mode.includes('SIZE') ? '✉' : '📅') + (desc ? '⬇' : '⬆');
			},

			downloadAsZipAllowed: () => this.attachmentsActions.includes('zip')
		});

		this.selector = new Selector(
			MessagelistUserStore,
			MessagelistUserStore.selectedMessage,
			MessagelistUserStore.focusedMessage,
			'.messageListItem .actionHandle',
			'.messageListItem .messageCheckbox',
			'.messageListItem.focused'
		);

		this.selector.on('ItemSelect', message => {
			if (message) {
				populateMessageBody(MessageModel.fromMessageListItem(message));
			} else {
				MessageUserStore.message(null);
			}
		});

		this.selector.on('MiddleClick', message => populateMessageBody(message, true));

		this.selector.on('ItemGetUid', message => (message ? message.generateUid() : ''));

		this.selector.on('AutoSelect', () => MessagelistUserStore.canAutoSelect());

		this.selector.on('UpOrDown', up => {
			if (MessagelistUserStore.hasChecked()) {
				return false;
			}

			clearTimeout(iGoToUpOrDownTimeout);
			iGoToUpOrDownTimeout = setTimeout(() => {
				let prev, next, temp, current;

				this.messageListPaginator().find(item => {
					if (item) {
						if (current) {
							next = item;
						}

						if (item.current) {
							current = item;
							prev = temp;
						}

						if (next) {
							return true;
						}

						temp = item;
					}

					return false;
				});

				if (up ? prev : next) {
					if (SettingsUserStore.usePreviewPane() || MessageUserStore.message()) {
						this.selector.iSelectNextHelper = up ? -1 : 1;
					} else {
						this.selector.iFocusedNextHelper = up ? -1 : 1;
					}
					this.selector.unselect();
					this.gotoPage(up ? prev : next);
				}
			}, 350);

			return true;
		});

		addEventListener('mailbox.message-list.selector.go-down',
			e => this.selector.newSelectPosition('ArrowDown', false, e.detail)
		);

		addEventListener('mailbox.message-list.selector.go-up',
			e => this.selector.newSelectPosition('ArrowUp', false, e.detail)
		);

		addEventListener('mailbox.message.show', e => {
			const sFolder = e.detail.Folder, iUid = e.detail.Uid;

			const message = MessagelistUserStore.find(
				item => sFolder === item?.folder && iUid == item?.uid
			);

			if ('INBOX' === sFolder) {
				hasher.setHash(mailBox(sFolder));
			}

			if (message) {
				this.selector.selectMessageItem(message);
			} else {
				if ('INBOX' !== sFolder) {
					hasher.setHash(mailBox(sFolder));
				}
				if (sFolder && iUid) {
					let message = new MessageModel;
					message.folder = sFolder;
					message.uid = iUid;
					populateMessageBody(message);
				} else {
					MessageUserStore.message(null);
				}
			}
		});

		MessagelistUserStore.endHash.subscribe((() =>
			this.selector.scrollToFocused()
		).throttle(50));

		decorateKoCommands(this, {
			downloadAttachCommand: canBeMovedHelper,
			downloadZipCommand: canBeMovedHelper,
			forwardCommand: canBeMovedHelper,
			deleteWithoutMoveCommand: canBeMovedHelper,
			deleteCommand: canBeMovedHelper,
			archiveCommand: canBeMovedHelper,
			spamCommand: canBeMovedHelper,
			notSpamCommand: canBeMovedHelper,
			moveCommand: canBeMovedHelper,
		});
	}

	changeSort(self, event) {
		FolderUserStore.sortMode(event.target.closest('li').dataset.sort);
		this.reload();
	}

	clear() {
		SettingsCapa('DangerousActions')
		&& showScreenPopup(FolderClearPopupView, [FolderUserStore.currentFolder()]);
	}

	reload() {
		MessagelistUserStore.isLoading()
		|| MessagelistUserStore.reload(false, true);
	}

	forwardCommand() {
		showMessageComposer([
			ComposeType.ForwardAsAttachment,
			MessagelistUserStore.listCheckedOrSelected()
		]);
	}

	downloadZipCommand() {
		let hashes = []/*, uids = []*/;
//		MessagelistUserStore.forEach(message => message.checked() && uids.push(message.uid));
		MessagelistUserStore.forEach(message => message.checked() && hashes.push(message.requestHash));
		if (hashes.length) {
			Remote.post('AttachmentsActions', null, {
				Do: 'Zip',
				Folder: MessagelistUserStore().Folder,
//				Uids: uids,
				Hashes: hashes
			})
			.then(result => {
				let hash = result?.Result?.FileHash;
				if (hash) {
					download(attachmentDownload(hash), hash+'.zip');
				} else {
					alert('Download failed');
				}
			})
			.catch(() => alert('Download failed'));
		}
	}

	downloadAttachCommand() {
		let hashes = [];
		MessagelistUserStore.forEach(message => {
			if (message.checked()) {
				message.attachments.forEach(attachment => {
					if (!attachment.isLinked() && attachment.download) {
						hashes.push(attachment.download);
					}
				});
			}
		});
		if (hashes.length) {
			Remote.post('AttachmentsActions', null, {
				Do: 'Zip',
				Hashes: hashes
			})
			.then(result => {
				let hash = result?.Result?.FileHash;
				if (hash) {
					download(attachmentDownload(hash), hash+'.zip');
				} else {
					alert('Download failed');
				}
			})
			.catch(() => alert('Download failed'));
		}
	}

	deleteWithoutMoveCommand() {
		SettingsCapa('DangerousActions')
		&& moveMessagesToFolderType(FolderType.Trash, true);
	}

	deleteCommand() {
		moveMessagesToFolderType(FolderType.Trash);
	}

	archiveCommand() {
		moveMessagesToFolderType(FolderType.Archive);
	}

	spamCommand() {
		moveMessagesToFolderType(FolderType.Junk);
	}

	notSpamCommand() {
		moveMessagesToFolderType(FolderType.Inbox);
	}

	moveCommand(vm, event) {
		if (this.mobileCheckedStateShow()) {
			if (vm && event?.preventDefault) {
				event.preventDefault();
				event.stopPropagation();
			}

			let b = moveAction();
			AppUserStore.focusedState(b ? Scope.MessageList : Scope.FolderList);
			moveAction(!b);
		}
	}

	composeClick() {
		showMessageComposer();
	}

	cancelSearch() {
		MessagelistUserStore.mainSearch('');
		this.focusSearch(false);
	}

	cancelThreadUid() {
		// history.go(-1) better?
		hasher.setHash(
			mailBox(
				FolderUserStore.currentFolderFullNameHash(),
				MessagelistUserStore.pageBeforeThread(),
				MessagelistUserStore.listSearch()
			)
		);
	}

	listSetSeen() {
		listAction(
			FolderUserStore.currentFolderFullName(),
			MessageSetAction.SetSeen,
			MessagelistUserStore.listCheckedOrSelected()
		);
	}

	listSetAllSeen() {
		let sFolderFullName = FolderUserStore.currentFolderFullName(),
			iThreadUid = MessagelistUserStore.endThreadUid();
		if (sFolderFullName) {
			let cnt = 0;
			const uids = [];

			let folder = getFolderFromCacheList(sFolderFullName);
			if (folder) {
				MessagelistUserStore.forEach(message => {
					if (message.isUnseen()) {
						++cnt;
					}

					message.flags.push('\\seen');
//					message.flags.valueHasMutated();
					iThreadUid && uids.push(message.uid);
				});

				if (iThreadUid) {
					folder.unreadEmails(Math.max(0, folder.unreadEmails() - cnt));
				} else {
					folder.unreadEmails(0);
				}

				MessageFlagsCache.clearFolder(sFolderFullName);

				Remote.request('MessageSetSeenToAll', null, {
					Folder: sFolderFullName,
					SetAction: 1,
					ThreadUids: uids.join(',')
				});

				MessagelistUserStore.reloadFlagsAndCachedMessage();
			}
		}
	}

	listUnsetSeen() {
		listAction(
			FolderUserStore.currentFolderFullName(),
			MessageSetAction.UnsetSeen,
			MessagelistUserStore.listCheckedOrSelected()
		);
	}

	listSetFlags() {
		listAction(
			FolderUserStore.currentFolderFullName(),
			MessageSetAction.SetFlag,
			MessagelistUserStore.listCheckedOrSelected()
		);
	}

	listUnsetFlags() {
		listAction(
			FolderUserStore.currentFolderFullName(),
			MessageSetAction.UnsetFlag,
			MessagelistUserStore.listCheckedOrSelected()
		);
	}

	seenMessagesFast(seen) {
		const checked = MessagelistUserStore.listCheckedOrSelected();
		if (checked.length) {
			listAction(
				checked[0].folder,
				seen ? MessageSetAction.SetSeen : MessageSetAction.UnsetSeen,
				checked
			);
		}
	}

	gotoPage(page) {
		page && hasher.setHash(
			mailBox(
				FolderUserStore.currentFolderFullNameHash(),
				page.value,
				MessagelistUserStore.listSearch(),
				MessagelistUserStore.threadUid()
			)
		);
	}

	gotoThread(message) {
		if (message?.threadsLen()) {
			MessagelistUserStore.pageBeforeThread(MessagelistUserStore.page());

			hasher.setHash(
				mailBox(FolderUserStore.currentFolderFullNameHash(), 1, MessagelistUserStore.listSearch(), message.uid)
			);
		}
	}

	listEmptyMessage() {
		if (!this.dragOver()
		 && !MessagelistUserStore().length
		 && !MessagelistUserStore.isLoading()
		 && !MessagelistUserStore.error()) {
			 return i18n('MESSAGE_LIST/EMPTY_' + (MessagelistUserStore.listSearch() ? 'SEARCH_' : '') + 'LIST');
		}
		return '';
	}

	clearListIsVisible() {
		return (
			!this.messageListSearchDesc() &&
			!MessagelistUserStore.error() &&
			!MessagelistUserStore.endThreadUid() &&
			MessagelistUserStore().length &&
			(MessagelistUserStore.isSpamFolder() || MessagelistUserStore.isTrashFolder())
		);
	}

	onBuild(dom) {
		const b_content = dom.querySelector('.b-content'),
			eqs = (ev, s) => ev.target.closestWithin(s, dom);

		this.selector.init(b_content, Scope.MessageList);

		addEventsListeners(dom, {
			click: event => {
				ThemeStore.isMobile() && !eqs(event, '.toggleLeft') && leftPanelDisabled(true);

				if (eqs(event, '.messageList') && Scope.MessageView === AppUserStore.focusedState()) {
					AppUserStore.focusedState(Scope.MessageList);
				}

				let el = eqs(event, '.e-paginator a');
				el && this.gotoPage(ko.dataFor(el));

				eqs(event, '.checkboxCheckAll') && this.checkAll(!this.checkAll());

				el = eqs(event, '.flagParent');
				let currentMessage = el && ko.dataFor(el);
				if (currentMessage) {
					const checked = MessagelistUserStore.listCheckedOrSelected();
					listAction(
						currentMessage.folder,
						currentMessage.isFlagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
						checked.find(message => message.uid == currentMessage.uid) ? checked : [currentMessage]
					);
				}

				el = eqs(event, '.threads-len');
				el && this.gotoThread(ko.dataFor(el));
			},
			dblclick: event => {
				let el = eqs(event, '.actionHandle');
				el && this.gotoThread(ko.dataFor(el));
			}
		});

		// initUploaderForAppend

		if (Settings.app('allowAppendMessage')) {
			const dropZone = dom.querySelector('.listDragOver'),
				validFiles = oEvent => {
					for (const item of oEvent.dataTransfer.items) {
						if ('file' === item.kind && 'message/rfc822' === item.type) {
							return true;
						}
					}
				};
			addEventsListeners(dropZone, {
				dragover: oEvent => {
					if (validFiles(oEvent)) {
						oEvent.dataTransfer.dropEffect = 'copy';
						oEvent.preventDefault();
					}
				},
			});
			addEventsListeners(b_content, {
				dragenter: oEvent => {
					if (validFiles(oEvent)) {
						if (b_content.contains(oEvent.target)) {
							this.dragOver(true);
						}
						if (oEvent.target == dropZone) {
							oEvent.dataTransfer.dropEffect = 'copy';
							this.dragOverEnter(true);
						}
					}
				},
				dragleave: oEvent => {
					if (oEvent.target == dropZone) {
						this.dragOverEnter(false);
					}
					let related = oEvent.relatedTarget;
					if (!related || !b_content.contains(related)) {
						this.dragOver(false);
					}
				},
				drop: oEvent => {
					oEvent.preventDefault();
					if (oEvent.target == dropZone && validFiles(oEvent)) {
						MessagelistUserStore.loading(true);
						dropFilesInFolder(FolderUserStore.currentFolderFullName(), oEvent.dataTransfer.files);
					}
					this.dragOverEnter(false);
					this.dragOver(false);
				}
			});
		}

		// initShortcuts

		addShortcut('enter,open', '', Scope.MessageList, () => {
			if (formFieldFocused()) {
				MessagelistUserStore.mainSearch(sLastSearchValue);
				return false;
			}
			if (MessageUserStore.message() && MessagelistUserStore.canAutoSelect()) {
				isFullscreen() || toggleFullscreen();
				return false;
			}
		});

		// archive (zip)
		registerShortcut('z', '', [Scope.MessageList, Scope.MessageView], () => {
			this.archiveCommand();
			return false;
		});

		// delete
		registerShortcut('delete', 'shift', Scope.MessageList, () => {
			MessagelistUserStore.listCheckedOrSelected().length && this.deleteWithoutMoveCommand();
			return false;
		});
//		registerShortcut('3', 'shift', Scope.MessageList, () => {
		registerShortcut('delete', '', Scope.MessageList, () => {
			MessagelistUserStore.listCheckedOrSelected().length && this.deleteCommand();
			return false;
		});

		// check mail
		addShortcut('r', 'meta', [Scope.FolderList, Scope.MessageList, Scope.MessageView], () => {
			this.reload();
			return false;
		});

		// check all
		registerShortcut('a', 'meta', Scope.MessageList, () => {
			this.checkAll(!(this.checkAll() && !this.isIncompleteChecked()));
			return false;
		});

		// write/compose (open compose popup)
		registerShortcut('w,c,new', '', [Scope.MessageList, Scope.MessageView], () => {
			showMessageComposer();
			return false;
		});

		// important - star/flag messages
		registerShortcut('i', '', [Scope.MessageList, Scope.MessageView], () => {
			const checked = MessagelistUserStore.listCheckedOrSelected();
			if (checked.length) {
				listAction(
					checked[0].folder,
					checked.every(message => message.isFlagged()) ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					checked
				);
			}
			return false;
		});

		registerShortcut('t', '', [Scope.MessageList], () => {
			let message = MessagelistUserStore.selectedMessage() || MessagelistUserStore.focusedMessage();
			if (0 < message?.threadsLen()) {
				this.gotoThread(message);
			}
			return false;
		});

		// move
		registerShortcut('insert', '', Scope.MessageList, () => {
			this.moveCommand();
			return false;
		});

		// read
		registerShortcut('q', '', [Scope.MessageList, Scope.MessageView], () => {
			this.seenMessagesFast(true);
			return false;
		});

		// unread
		registerShortcut('u', '', [Scope.MessageList, Scope.MessageView], () => {
			this.seenMessagesFast(false);
			return false;
		});

		registerShortcut('f,mailforward', 'shift', [Scope.MessageList, Scope.MessageView], () => {
			this.forwardCommand();
			return false;
		});

		if (SettingsCapa('Search')) {
			// search input focus
			addShortcut('/', '', [Scope.MessageList, Scope.MessageView], () => {
				this.focusSearch(true);
				return false;
			});
		}

		// cancel search
		addShortcut('escape', '', Scope.MessageList, () => {
			if (this.messageListSearchDesc()) {
				this.cancelSearch();
				return false;
			} else if (MessagelistUserStore.endThreadUid()) {
				this.cancelThreadUid();
				return false;
			}
		});

		// change focused state
		addShortcut('tab', 'shift', Scope.MessageList, () => {
			AppUserStore.focusedState(Scope.FolderList);
			return false;
		});
		addShortcut('arrowleft', '', Scope.MessageList, () => {
			AppUserStore.focusedState(Scope.FolderList);
			return false;
		});
		addShortcut('tab,arrowright', '', Scope.MessageList, () => {
			if (MessageUserStore.message()) {
				AppUserStore.focusedState(Scope.MessageView);
				return false;
			}
		});

		addShortcut('arrowleft', 'meta', Scope.MessageView, ()=>false);
		addShortcut('arrowright', 'meta', Scope.MessageView, ()=>false);

		addShortcut('f', 'meta', Scope.MessageList, this.advancedSearchClick);
	}

	advancedSearchClick() {
		showScreenPopup(AdvancedSearchPopupView, [MessagelistUserStore.mainSearch()]);
	}

	quotaTooltip() {
		return i18n('MESSAGE_LIST/QUOTA_SIZE', {
			SIZE: FileInfo.friendlySize(FolderUserStore.quotaUsage()),
			PROC: FolderUserStore.quotaPercentage(),
			LIMIT: FileInfo.friendlySize(FolderUserStore.quotaLimit())
		}).replace(/<[^>]+>/g, '');
	}
}
