import ko from 'ko';
import { addObservablesTo, addComputablesTo } from 'External/ko';

import { ScopeFolderList, ScopeMessageList, ScopeMessageView } from 'Common/Enums';
import { ComposeType, FolderType, MessageSetAction } from 'Common/EnumsUser';
import { doc,
	leftPanelDisabled, toggleLeftPanel,
	Settings, SettingsCapa,
	addEventsListeners, stopEvent,
	addShortcut, registerShortcut, formFieldFocused
} from 'Common/Globals';
import { arrayLength } from 'Common/Utils';
import { computedPaginatorHelper, showMessageComposer, populateMessageBody, downloadZip, moveAction } from 'Common/UtilsUser';
import { FileInfo, RFC822 } from 'Common/File';
import { isFullscreen, toggleFullscreen } from 'Common/Fullscreen';

import { mailBox } from 'Common/Links';
import { Selector } from 'Common/Selector';

import { i18n } from 'Common/Translator';

import { dropFilesInFolder } from 'Common/Folders';

import { getFolderFromCacheList } from 'Common/Cache';

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

import { LayoutSideView, ClientSideKeyNameMessageListSize } from 'Common/EnumsUser';
import { setLayoutResizer } from 'Common/UtilsUser';

const
	canBeMovedHelper = () => MessagelistUserStore.hasCheckedOrSelected(),

	/**
	 * @param {string} sFolderFullName
	 * @param {number} iSetAction
	 * @param {Array=} aMessages = null
	 * @returns {void}
	 */
	listAction = (...args) => MessagelistUserStore.setAction(...args),

	moveMessagesToFolderType = (toFolderType, bDelete) => {
		let messages = MessagelistUserStore.listCheckedOrSelectedUidsWithSubMails();
		messages.size && rl.app.moveMessagesToFolderType(
			toFolderType,
			messages.folder,
			messages,
			bDelete
		)
	},

	pad2 = v => 10 > v ? '0' + v : '' + v,
	Ymd = dt => dt.getFullYear() + pad2(1 + dt.getMonth()) + pad2(dt.getDate()),

	setMessage = msg => {
		populateMessageBody(msg);
/* This will replace url hash, and then load message
 * It's working properly yet
//		let hash = msg.href;
		let hash = mailBox(
			msg.folder,
			MessagelistUserStore.page(),
			MessagelistUserStore.listSearch(),
			MessagelistUserStore.threadUid(),
			msg.uid
		);
		MessageUserStore.message() ? hasher.replaceHash(hash) : hasher.setHash(hash);
*/
	};


let
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

		this.isMobile = ThemeStore.isMobile; // Obsolete

		this.popupVisibility = arePopupsVisible;

		this.useCheckboxesInList = SettingsUserStore.useCheckboxesInList;

		this.userUsageProc = FolderUserStore.quotaPercentage;

		addObservablesTo(this, {
			focusSearch: false
		});

		// append drag and drop
		this.dragOver = ko.observable(false).extend({ throttle: 1 });
		this.dragOverEnter = ko.observable(false).extend({ throttle: 1 });

		const attachmentsActions = Settings.app('attachmentsActions');
		this.attachmentsActions = ko.observableArray(arrayLength(attachmentsActions) ? attachmentsActions : []);

		addComputablesTo(this, {

			sortSupported: () => FolderUserStore.hasCapability('SORT') && !MessagelistUserStore.threadUid(),

			messageListSearchDesc: () => {
				const value = MessagelistUserStore().search;
				return value ? i18n('MESSAGE_LIST/SEARCH_RESULT_FOR', { SEARCH: value }) : ''
			},

			messageListPaginator: computedPaginatorHelper(MessagelistUserStore.page, MessagelistUserStore.pageCount),

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

			listGrouped: () => {
				let uid = MessagelistUserStore.threadUid(),
					sort = FolderUserStore.sortMode() || 'DATE';
				return SettingsUserStore.listGrouped() && (sort.includes('DATE') || sort.includes('FROM')) && !uid;
			},

			timeFormat: () => (FolderUserStore.sortMode() || '').includes('FROM') ? 'AUTO' : 'LT',

			groupedList: () => {
				let list = [], current, sort = FolderUserStore.sortMode() || 'DATE';
				if (sort.includes('FROM')) {
					MessagelistUserStore.forEach(msg => {
						let email = msg.from[0].email;
						if (!current || email != current.id) {
							current = {
								id: email,
								label: msg.from[0].toLine(),
								search: 'from=' + email,
								messages: []
							};
							list.push(current);
						}
						current.messages.push(msg);
					});
				} else if (sort.includes('DATE')) {
					let today = Ymd(new Date()),
						rtf = Intl.RelativeTimeFormat
							? new Intl.RelativeTimeFormat(doc.documentElement.lang, { numeric: "auto" }) : 0;
					MessagelistUserStore.forEach(msg => {
						let dt = (new Date(msg.dateTimestamp() * 1000)),
							date,
							ymd = Ymd(dt);
						if (!current || ymd != current.id) {
							if (rtf && today == ymd) {
								date = rtf.format(0, 'day');
							} else if (rtf && today - 1 == ymd) {
								date = rtf.format(-1, 'day');
//							} else if (today - 7 < ymd) {
//								date = dt.format({weekday: 'long'});
//								date = dt.format({dateStyle: 'full'},0,LanguageStore.hourCycle());
							} else {
//								date = dt.format({dateStyle: 'medium'},0,LanguageStore.hourCycle());
								date = dt.format({dateStyle: 'full'},0,LanguageStore.hourCycle());
							}
							current = {
								id: ymd,
								label: date,
								search: 'on=' + dt.getFullYear() + '-' + pad2(1 + dt.getMonth()) + '-' + pad2(dt.getDate()),
								messages: []
							};
							list.push(current);
						}
						current.messages.push(msg);
					});
				}
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
			'.messageListItem',
			'.messageListItem .messageCheckbox'
		);

		this.selector.on('ItemSelect', message => {
			if (message) {
//				setMessage(message.clone());
				setMessage(message);
			} else {
				MessageUserStore.message(null);
			}
		});

		this.selector.on('MiddleClick', message => populateMessageBody(message, true));

		this.selector.on('ItemGetUid', message => (message ? message.folder + '/' + message.uid : ''));

		this.selector.on('canSelect', () => MessagelistUserStore.canSelect());

		this.selector.on('click', (event, currentMessage) => {
			const el = event.target;
			if (el.closest('.flagParent')) {
				if (currentMessage) {
					const checked = MessagelistUserStore.listCheckedOrSelected();
					listAction(
						currentMessage.folder,
						currentMessage.isFlagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
						checked.find(message => message.uid == currentMessage.uid) ? checked : [currentMessage]
					);
				}
			} else if (el.closest('.threads-len')) {
				this.gotoThread(currentMessage);
			} else {
				return 1;
			}
		});

		this.selector.on('UpOrDown', up => {
			if (!MessagelistUserStore.hasChecked()) {
				up = up ? -1 : 1;
				const page = MessagelistUserStore.page() + up;
				if (page > 0 && page <= MessagelistUserStore.pageCount()) {
					if (SettingsUserStore.usePreviewPane() || MessageUserStore.message()) {
						this.selector.iSelectNextHelper = up;
					} else {
						this.selector.iFocusedNextHelper = up;
					}
					this.selector.unselect();
					this.gotoPage(page);
				}
			}
		});

		addEventListener('mailbox.message-list.selector.go-down',
			e => this.selector.newSelectPosition('ArrowDown', false, e.detail)
		);

		addEventListener('mailbox.message-list.selector.go-up',
			e => this.selector.newSelectPosition('ArrowUp', false, e.detail)
		);

		addEventListener('mailbox.message.show', e => {
			const sFolder = e.detail.folder, iUid = e.detail.uid;

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
					setMessage(message);
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

	clearListIsVisible() {
		return (
			!this.messageListSearchDesc()
		 && !MessagelistUserStore.error()
		 && !MessagelistUserStore.endThreadUid()
		 && MessagelistUserStore().length
		 && (MessagelistUserStore.isSpamFolder() || MessagelistUserStore.isTrashFolder())
		 && SettingsCapa('DangerousActions')
		);
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

	/**
	 * Download selected messages
	 */
	downloadZipCommand() {
		let hashes = []/*, uids = []*/;
//		MessagelistUserStore.forEach(message => message.checked() && uids.push(message.uid));
		MessagelistUserStore.forEach(message => message.checked() && hashes.push(message.requestHash));
		downloadZip(null, hashes, null, null, MessagelistUserStore().folder);
	}

	/**
	 * Download attachments of selected messages
	 */
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
		downloadZip(null, hashes);
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
		if (canBeMovedHelper()) {
			if (vm && event?.preventDefault) {
				stopEvent(event);
			}

			let b = moveAction();
			AppUserStore.focusedState(b ? ScopeMessageList : ScopeFolderList);
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

				Remote.request('MessageSetSeenToAll', null, {
					folder: sFolderFullName,
					setAction: 1,
					threadUids: uids.join(',')
				});
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
				page,
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

	onBuild(dom) {
		const b_content = dom.querySelector('.b-content'),
			eqs = (ev, s) => ev.target.closestWithin(s, dom);

		setTimeout(() => {
			// initMailboxLayoutResizer
			const top = dom.querySelector('.messageList'),
				fToggle = () => {
					let layout = SettingsUserStore.usePreviewPane();
					setLayoutResizer(top, ClientSideKeyNameMessageListSize,
						layout ? (LayoutSideView === layout ? 'Width' : 'Height') : 0
					);
				};
			if (top) {
				fToggle();
				addEventListener('rl-layout', fToggle);
			}
		}, 1);

		this.selector.init(b_content, ScopeMessageList);

		addEventsListeners(dom, {
			click: event => {
				if (eqs(event, '.toggleLeft')) {
					toggleLeftPanel();
				} else {
					ThemeStore.isMobile() && leftPanelDisabled(true);

					if (eqs(event, '.messageList') && ScopeMessageView === AppUserStore.focusedState()) {
						AppUserStore.focusedState(ScopeMessageList);
					}

					let el = eqs(event, '.e-paginator a');
					el && this.gotoPage(ko.dataFor(el)?.value);

					eqs(event, '.checkboxCheckAll') && this.checkAll(!this.checkAll());
				}
			},
			dblclick: event => {
				let el = eqs(event, '.messageListItem');
				el && this.gotoThread(ko.dataFor(el));
			}
		});

		// initUploaderForAppend

		if (Settings.app('allowAppendMessage')) {
			const dropZone = dom.querySelector('.listDragOver'),
				validFiles = oEvent => {
					for (const item of oEvent.dataTransfer.items) {
						if ('file' === item.kind && RFC822 === item.type) {
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

		addShortcut('enter,open', '', ScopeMessageList, () => {
			if (formFieldFocused()) {
				MessagelistUserStore.mainSearch(sLastSearchValue);
				return false;
			}
			if (MessageUserStore.message() && MessagelistUserStore.canSelect()) {
				isFullscreen() || toggleFullscreen();
				return false;
			}
		});

		// archive (zip)
		registerShortcut('z', '', [ScopeMessageList, ScopeMessageView], () => {
			this.archiveCommand();
			return false;
		});

		// delete
		registerShortcut('delete', 'shift', ScopeMessageList, () => {
			MessagelistUserStore.listCheckedOrSelected().length && this.deleteWithoutMoveCommand();
			return false;
		});
//		registerShortcut('3', 'shift', ScopeMessageList, () => {
		registerShortcut('delete', '', ScopeMessageList, () => {
			MessagelistUserStore.listCheckedOrSelected().length && this.deleteCommand();
			return false;
		});

		// check mail
		addShortcut('r', 'meta', [ScopeFolderList, ScopeMessageList, ScopeMessageView], () => {
			this.reload();
			return false;
		});

		// check all
		registerShortcut('a', 'meta', ScopeMessageList, () => {
			this.checkAll(!(this.checkAll() && !this.isIncompleteChecked()));
			return false;
		});

		// write/compose (open compose popup)
		registerShortcut('w,c,new', '', [ScopeMessageList, ScopeMessageView], () => {
			showMessageComposer();
			return false;
		});

		// important - star/flag messages
		registerShortcut('i', '', [ScopeMessageList, ScopeMessageView], () => {
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

		registerShortcut('t', '', [ScopeMessageList], () => {
			let message = MessagelistUserStore.selectedMessage() || MessagelistUserStore.focusedMessage();
			if (0 < message?.threadsLen()) {
				this.gotoThread(message);
			}
			return false;
		});

		// move
		registerShortcut('insert', '', ScopeMessageList, () => {
			this.moveCommand();
			return false;
		});

		// read
		registerShortcut('q', '', [ScopeMessageList, ScopeMessageView], () => {
			this.seenMessagesFast(true);
			return false;
		});

		// unread
		registerShortcut('u', '', [ScopeMessageList, ScopeMessageView], () => {
			this.seenMessagesFast(false);
			return false;
		});

		registerShortcut('f,mailforward', 'shift', [ScopeMessageList, ScopeMessageView], () => {
			this.forwardCommand();
			return false;
		});

		if (SettingsCapa('Search')) {
			// search input focus
			addShortcut('/', '', [ScopeMessageList, ScopeMessageView], () => {
				this.focusSearch(true);
				return false;
			});
		}

		// cancel search
		addShortcut('escape', '', ScopeMessageList, () => {
			if (this.messageListSearchDesc()) {
				this.cancelSearch();
				return false;
			} else if (MessagelistUserStore.endThreadUid()) {
				this.cancelThreadUid();
				return false;
			}
		});

		// change focused state
		addShortcut('tab', 'shift', ScopeMessageList, () => {
			AppUserStore.focusedState(ScopeFolderList);
			return false;
		});
		addShortcut('arrowleft', '', ScopeMessageList, () => {
			AppUserStore.focusedState(ScopeFolderList);
			return false;
		});
		addShortcut('tab,arrowright', '', ScopeMessageList, () => {
			if (MessageUserStore.message()) {
				AppUserStore.focusedState(ScopeMessageView);
				return false;
			}
		});

		addShortcut('arrowleft', 'meta', ScopeMessageView, ()=>false);
		addShortcut('arrowright', 'meta', ScopeMessageView, ()=>false);

		addShortcut('f', 'meta', ScopeMessageList, this.advancedSearchClick);
	}

	advancedSearchClick() {
		showScreenPopup(AdvancedSearchPopupView, [MessagelistUserStore.mainSearch()]);
	}

	groupSearch(group) {
		group.search && MessagelistUserStore.mainSearch(group.search);
	}

	groupCheck(group) {
		group.messages.forEach(message => message.checked(!message.checked()));
	}

	quotaTooltip() {
		return i18n('MESSAGE_LIST/QUOTA_SIZE', {
			SIZE: FileInfo.friendlySize(FolderUserStore.quotaUsage()),
			PROC: FolderUserStore.quotaPercentage(),
			LIMIT: FileInfo.friendlySize(FolderUserStore.quotaLimit())
		}).replace(/<[^>]+>/g, '');
	}
}
