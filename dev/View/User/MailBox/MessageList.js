import ko from 'ko';

import { Scope } from 'Common/Enums';

import { ComposeType, FolderType, MessageSetAction } from 'Common/EnumsUser';

import { leftPanelDisabled, moveAction,
	Settings, SettingsCapa, SettingsGet,
	addEventsListeners,
	addShortcut, registerShortcut, formFieldFocused
} from 'Common/Globals';

import { computedPaginatorHelper, showMessageComposer, populateMessageBody } from 'Common/UtilsUser';
import { FileInfo } from 'Common/File';
import { folderListOptionsBuilder, moveMessagesToFolder } from 'Common/Folders';
import { isFullscreen, toggleFullscreen } from 'Common/Fullscreen';

import { mailBox, serverRequest } from 'Common/Links';
import { Selector } from 'Common/Selector';

import { i18n } from 'Common/Translator';

import {
	getFolderFromCacheList,
	MessageFlagsCache
} from 'Common/Cache';

import { AppUserStore } from 'Stores/User/App';
import { SettingsUserStore } from 'Stores/User/Settings';
import { FolderUserStore } from 'Stores/User/Folder';
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
		);

let
	iGoToUpOrDownTimeout = 0,
	sLastSearchValue = '';

export class MailMessageList extends AbstractViewRight {
	constructor() {
		super();

		this.newMoveToFolder = !!SettingsGet('NewMoveToFolder');

		this.allowDangerousActions = SettingsCapa('DangerousActions');

		this.messageList = MessagelistUserStore;
		this.archiveAllowed = MessagelistUserStore.archiveAllowed;
		this.canMarkAsSpam = MessagelistUserStore.canMarkAsSpam;
		this.isSpamFolder = MessagelistUserStore.isSpamFolder;

		this.composeInEdit = ComposePopupView.inEdit;

		this.isMobile = ThemeStore.isMobile;
		this.leftPanelDisabled = leftPanelDisabled;

		this.popupVisibility = arePopupsVisible;

		this.useCheckboxesInList = SettingsUserStore.useCheckboxesInList;

		this.userUsageProc = FolderUserStore.quotaPercentage;

		this.addObservables({
			moveDropdownTrigger: false,
			moreDropdownTrigger: false,
			sortDropdownTrigger: false,

			focusSearch: false
		});

		// append drag and drop
		this.dragOver = ko.observable(false).extend({ throttle: 1 });
		this.dragOverEnter = ko.observable(false).extend({ throttle: 1 });

		this.addComputables({

			sortSupported: () =>
				FolderUserStore.hasCapability('SORT') | FolderUserStore.hasCapability('ESORT'),

			folderMenuForMove: () =>
				folderListOptionsBuilder(
					[FolderUserStore.currentFolderFullName()],
					[],
					item => item ? item.localName() : ''
				),

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
			}
		});

		this.selector = new Selector(
			MessagelistUserStore,
			MessagelistUserStore.selectedMessage,
			MessagelistUserStore.focusedMessage,
			'.messageListItem .actionHandle',
			'.messageListItem .checkboxMessage',
			'.messageListItem.focused'
		);

		this.selector.on('ItemSelect', message => {
			if (message) {
				MessageUserStore.message(MessageModel.fromMessageListItem(message));
				populateMessageBody(MessageUserStore.message());
			} else {
				MessageUserStore.message(null);
			}
		});

		this.selector.on('MiddleClick', message => populateMessageBody(message, true));

		this.selector.on('ItemGetUid', message => (message ? message.generateUid() : ''));

		this.selector.on('AutoSelect', () => MessagelistUserStore.canAutoSelect());

		this.selector.on('UpOrDown', v => this.goToUpOrDown(v));

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
					MessageUserStore.message(MessageModel.fromMessageListItem(null));
					MessageUserStore.message().folder = sFolder;
					MessageUserStore.message().uid = iUid;

					populateMessageBody(MessageUserStore.message());
				} else {
					MessageUserStore.message(null);
				}
			}
		});

		MessagelistUserStore.endHash.subscribe((() =>
			this.selector.scrollToFocused()
		).throttle(50));

		decorateKoCommands(this, {
			forwardCommand: canBeMovedHelper,
			deleteWithoutMoveCommand: canBeMovedHelper,
			deleteCommand: canBeMovedHelper,
			archiveCommand: canBeMovedHelper,
			spamCommand: canBeMovedHelper,
			notSpamCommand: canBeMovedHelper,
			moveCommand: canBeMovedHelper,
			moveNewCommand: canBeMovedHelper,
		});
	}

	changeSort(self, event) {
		FolderUserStore.sortMode(event.target.closest('li').dataset.sort);
		this.reload();
	}

	clear() {
		if (SettingsCapa('DangerousActions')) {
			showScreenPopup(FolderClearPopupView, [FolderUserStore.currentFolder()]);
		}
	}

	reload() {
		if (!MessagelistUserStore.isLoading()) {
			MessagelistUserStore.reload(false, true);
		}
	}

	forwardCommand() {
		showMessageComposer([
			ComposeType.ForwardAsAttachment,
			MessagelistUserStore.listCheckedOrSelected()
		]);
	}

	deleteWithoutMoveCommand() {
		if (SettingsCapa('DangerousActions')) {
			moveMessagesToFolderType(FolderType.Trash, true);
		}
	}

	deleteCommand() {
		moveMessagesToFolderType(FolderType.Trash);
	}

	archiveCommand() {
		moveMessagesToFolderType(FolderType.Archive);
	}

	spamCommand() {
		moveMessagesToFolderType(FolderType.Spam);
	}

	notSpamCommand() {
		moveMessagesToFolderType(FolderType.NotSpam);
	}

	moveCommand() {}

	moveNewCommand(vm, event) {
		if (this.newMoveToFolder && this.mobileCheckedStateShow()) {
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

	goToUpOrDown(up) {
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

	/**
	 * @param {string} sToFolderFullName
	 * @param {boolean} bCopy
	 * @returns {boolean}
	 */
	moveSelectedMessagesToFolder(sToFolderFullName, bCopy) {
		if (MessagelistUserStore.hasCheckedOrSelected()) {
			moveMessagesToFolder(
				FolderUserStore.currentFolderFullName(),
				MessagelistUserStore.listCheckedOrSelectedUidsWithSubMails(),
				sToFolderFullName,
				bCopy
			);
		}

		return false;
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

	flagMessages(currentMessage) {
		const checked = MessagelistUserStore.listCheckedOrSelected();
		if (currentMessage) {
			const checkedUids = checked.map(message => message.uid);
			if (checkedUids.includes(currentMessage.uid)) {
				listAction(
					currentMessage.folder,
					currentMessage.isFlagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					checked
				);
			} else {
				listAction(
					currentMessage.folder,
					currentMessage.isFlagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					[currentMessage]
				);
			}
		}
	}

	flagMessagesFast(bFlag) {
		const checked = MessagelistUserStore.listCheckedOrSelected();
		if (checked.length) {
			if (undefined === bFlag) {
				const flagged = checked.filter(message => message.isFlagged());
				listAction(
					checked[0].folder,
					checked.length === flagged.length ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					checked
				);
			} else {
				listAction(
					checked[0].folder,
					!bFlag ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					checked
				);
			}
		}
	}

	seenMessagesFast(seen) {
		const checked = MessagelistUserStore.listCheckedOrSelected();
		if (checked.length && null != seen) {
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
		if (0 < message?.threadsLen()) {
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
				el && this.flagMessages(ko.dataFor(el));

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
			const oJua = new Jua({
				action: serverRequest('Append'),
				name: 'AppendFile',
				limit: 1,
				hidden: {
					Folder: () => FolderUserStore.currentFolderFullName()
				},
				dragAndDropElement: dom.querySelector('.listDragOver'),
				dragAndDropBodyElement: b_content
			});

			this.dragOver.subscribe(value => value && this.selector.scrollToTop());

			oJua
				.on('onDragEnter', () => this.dragOverEnter(true))
				.on('onDragLeave', () => this.dragOverEnter(false))
				.on('onBodyDragEnter', () => this.dragOver(true))
				.on('onBodyDragLeave', () => this.dragOver(false))
				.on('onSelect', (sUid, oData) => {
					if (sUid && oData && 'message/rfc822' === oData.Type) {
						MessagelistUserStore.loading(true);
						return true;
					}

					return false;
				})
				.on('onComplete', () => MessagelistUserStore.reload(true, true));
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
			this.flagMessagesFast();
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
			if (this.newMoveToFolder) {
				this.moveNewCommand();
			} else {
				this.moveDropdownTrigger(true);
			}

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

		addShortcut('f,mailforward', 'shift', [Scope.MessageList, Scope.MessageView], () => {
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
			if (MessageUserStore.message()){
				AppUserStore.focusedState(Scope.MessageView);
				return false;
			}
		});

		addShortcut('arrowleft', 'meta', Scope.MessageView, ()=>false);
		addShortcut('arrowright', 'meta', Scope.MessageView, ()=>false);

		addShortcut('f', 'meta', Scope.MessageList, ()=>this.advancedSearchClick());
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
