import ko from 'ko';

import {
	Capa,
	Scope
} from 'Common/Enums';

import {
	ComposeType,
	FolderType,
	MessageSetAction
} from 'Common/EnumsUser';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';

import { doc, leftPanelDisabled, moveAction, Settings, SettingsGet } from 'Common/Globals';

import { computedPaginatorHelper, showMessageComposer, folderListOptionsBuilder } from 'Common/UtilsUser';
import { FileInfo } from 'Common/File';

import { mailBox, serverRequest } from 'Common/Links';
import { Selector } from 'Common/Selector';

import { i18n, initOnStartOrLangChange } from 'Common/Translator';

import {
	getFolderFromCacheList,
	MessageFlagsCache,
	hasRequestedMessage,
	addRequestedMessage
} from 'Common/Cache';

import { AppUserStore } from 'Stores/User/App';
import { QuotaUserStore } from 'Stores/User/Quota';
import { SettingsUserStore } from 'Stores/User/Settings';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessageUserStore } from 'Stores/User/Message';
import { ThemeStore } from 'Stores/Theme';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands, showScreenPopup, arePopupsVisible } from 'Knoin/Knoin';
import { AbstractViewRight } from 'Knoin/AbstractViews';

import { FolderClearPopupView } from 'View/Popup/FolderClear';
import { AdvancedSearchPopupView } from 'View/Popup/AdvancedSearch';

const
	canBeMovedHelper = () => MessageUserStore.hasCheckedOrSelected();

export class MailMessageList extends AbstractViewRight {
	constructor() {
		super('MailMessageList');

		this.bPrefetch = false;
		this.emptySubjectValue = '';

		this.iGoToUpOrDownTimeout = 0;

		this.newMoveToFolder = !!SettingsGet('NewMoveToFolder');

		this.allowSearch = Settings.capa(Capa.Search);
		this.allowSearchAdv = Settings.capa(Capa.SearchAdv);
		this.allowDangerousActions = Settings.capa(Capa.DangerousActions);

		this.messageList = MessageUserStore.list;

		this.sortSupported = FolderUserStore.sortSupported;

		this.composeInEdit = AppUserStore.composeInEdit;
		this.leftPanelDisabled = leftPanelDisabled;

		this.isMessageSelected = MessageUserStore.isMessageSelected;
		this.messageListSearch = MessageUserStore.listSearch;
		this.messageListError = MessageUserStore.listError;

		this.popupVisibility = arePopupsVisible;

		this.useCheckboxesInList = SettingsUserStore.useCheckboxesInList;

		this.messageListEndThreadUid = MessageUserStore.listEndThreadUid;

		this.messageListCompleteLoadingThrottle = MessageUserStore.listCompleteLoading;

		initOnStartOrLangChange(() => this.emptySubjectValue = i18n('MESSAGE_LIST/EMPTY_SUBJECT_TEXT'));

		this.userUsageProc = QuotaUserStore.percentage;

		this.addObservables({
			moveDropdownTrigger: false,
			moreDropdownTrigger: false,
			sortDropdownTrigger: false,

			dragOverArea: null,
			dragOverBodyArea: null,

			inputMessageListSearchFocus: false
		});

		// append drag and drop
		this.dragOver = ko.observable(false).extend({ throttle: 1 });
		this.dragOverEnter = ko.observable(false).extend({ throttle: 1 });

		this.sLastSearchValue = '';

		this.addComputables({

			folderMenuForMove: () =>
				folderListOptionsBuilder(
					[FolderUserStore.currentFolderFullNameRaw()],
					[],
					item => item ? item.localName() : ''
				),

			messageListSearchDesc: () => {
				const value = MessageUserStore.listEndSearch();
				return value ? i18n('MESSAGE_LIST/SEARCH_RESULT_FOR', { SEARCH: value }) : ''
			},

			messageListPaginator: computedPaginatorHelper(MessageUserStore.listPage,
				MessageUserStore.listPageCount),

			checkAll: {
				read: () => 0 < MessageUserStore.listChecked().length,
				write: (value) => {
					value = !!value;
					MessageUserStore.list.forEach(message => message.checked(value));
				}
			},

			inputProxyMessageListSearch: {
				read: MessageUserStore.mainMessageListSearch,
				write: value => this.sLastSearchValue = value
			},

			isIncompleteChecked: () => {
				const c = MessageUserStore.listChecked().length;
				return c && MessageUserStore.list.length > c;
			},

			hasMessages: () => 0 < MessageUserStore.list.length,

			isSpamFolder: () => (FolderUserStore.spamFolder() || 0) === MessageUserStore.listEndFolder(),

			isSpamDisabled: () => UNUSED_OPTION_VALUE === FolderUserStore.spamFolder(),

			isTrashFolder: () => (FolderUserStore.trashFolder() || 0) === MessageUserStore.listEndFolder(),

			isDraftFolder: () => (FolderUserStore.draftFolder() || 0) === MessageUserStore.listEndFolder(),

			isSentFolder: () => (FolderUserStore.sentFolder() || 0) === MessageUserStore.listEndFolder(),

			isArchiveFolder: () => (FolderUserStore.archiveFolder() || 0) === MessageUserStore.listEndFolder(),

			isArchiveDisabled: () => UNUSED_OPTION_VALUE === FolderUserStore.archiveFolder(),

			isArchiveVisible: () => !this.isArchiveFolder() && !this.isArchiveDisabled() && !this.isDraftFolder(),

			isSpamVisible: () =>
				!this.isSpamFolder() && !this.isSpamDisabled() && !this.isDraftFolder() && !this.isSentFolder(),

			isUnSpamVisible: () =>
				this.isSpamFolder() && !this.isSpamDisabled() && !this.isDraftFolder() && !this.isSentFolder(),

			mobileCheckedStateShow: () => ThemeStore.isMobile() ? 0 < MessageUserStore.listChecked().length : true,

			mobileCheckedStateHide: () => ThemeStore.isMobile() ? !MessageUserStore.listChecked().length : true,

			messageListFocused: () => Scope.MessageList === AppUserStore.focusedState(),

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

		this.hasCheckedOrSelectedLines = MessageUserStore.hasCheckedOrSelected,

		this.selector = new Selector(
			MessageUserStore.list,
			MessageUserStore.selectorMessageSelected,
			MessageUserStore.selectorMessageFocused,
			'.messageListItem .actionHandle',
			'.messageListItem .checkboxMessage',
			'.messageListItem.focused'
		);

		this.selector.on('ItemSelect', message => MessageUserStore.selectMessage(message));

		this.selector.on('MiddleClick', message => MessageUserStore.populateMessageBody(message, true));

		this.selector.on('ItemGetUid', message => (message ? message.generateUid() : ''));

		this.selector.on('AutoSelect', () => this.useAutoSelect());

		this.selector.on('UpOrDown', v => this.goToUpOrDown(v));

		addEventListener('mailbox.message-list.selector.go-down',
			e => this.selector.newSelectPosition('ArrowDown', false, e.detail)
		);

		addEventListener('mailbox.message-list.selector.go-up',
			e => this.selector.newSelectPosition('ArrowUp', false, e.detail)
		);

		addEventListener('mailbox.message.show', e => {
			const sFolder = e.detail.Folder, iUid = e.detail.Uid;

			const message = MessageUserStore.list.find(
				item => item && sFolder === item.folder && iUid == item.uid
			);

			if ('INBOX' === sFolder) {
				rl.route.setHash(mailBox(sFolder));
			}

			if (message) {
				this.selector.selectMessageItem(message);
			} else {
				if ('INBOX' !== sFolder) {
					rl.route.setHash(mailBox(sFolder));
				}

				MessageUserStore.selectMessageByFolderAndUid(sFolder, iUid);
			}
		});

		MessageUserStore.listEndHash.subscribe((() =>
			this.selector.scrollToFocused()
		).throttle(50));

		decorateKoCommands(this, {
			clearCommand: 1,
			reloadCommand: 1,
			multyForwardCommand: canBeMovedHelper,
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
		this.reloadCommand();
	}

	clearCommand() {
		if (Settings.capa(Capa.DangerousActions)) {
			showScreenPopup(FolderClearPopupView, [FolderUserStore.currentFolder()]);
		}
	}

	reloadCommand() {
		if (!MessageUserStore.listLoadingAnimation()) {
			rl.app.reloadMessageList(false, true);
		}
	}

	multyForwardCommand() {
		showMessageComposer([
			ComposeType.ForwardAsAttachment,
			MessageUserStore.listCheckedOrSelected()
		]);
	}

	deleteWithoutMoveCommand() {
		if (Settings.capa(Capa.DangerousActions)) {
			rl.app.deleteMessagesFromFolder(
				FolderType.Trash,
				FolderUserStore.currentFolderFullNameRaw(),
				MessageUserStore.listCheckedOrSelectedUidsWithSubMails(),
				false
			);
		}
	}

	deleteCommand() {
		rl.app.deleteMessagesFromFolder(
			FolderType.Trash,
			FolderUserStore.currentFolderFullNameRaw(),
			MessageUserStore.listCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	archiveCommand() {
		rl.app.deleteMessagesFromFolder(
			FolderType.Archive,
			FolderUserStore.currentFolderFullNameRaw(),
			MessageUserStore.listCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	spamCommand() {
		rl.app.deleteMessagesFromFolder(
			FolderType.Spam,
			FolderUserStore.currentFolderFullNameRaw(),
			MessageUserStore.listCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	notSpamCommand() {
		rl.app.deleteMessagesFromFolder(
			FolderType.NotSpam,
			FolderUserStore.currentFolderFullNameRaw(),
			MessageUserStore.listCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	moveCommand() {}

	moveNewCommand(vm, event) {
		if (this.newMoveToFolder && this.mobileCheckedStateShow()) {
			if (vm && event && event.preventDefault) {
				event.preventDefault();
				event.stopPropagation();
			}

			let b = moveAction();
			AppUserStore.focusedState(b ? Scope.MessageList : Scope.FolderList);
			moveAction(!b);
		}
	}

	hideLeft(item, event) {
		event.preventDefault();
		event.stopPropagation();

		leftPanelDisabled(true);
	}

	showLeft(item, event) {
		event.preventDefault();
		event.stopPropagation();

		leftPanelDisabled(false);
	}

	composeClick() {
		showMessageComposer();
	}

	goToUpOrDown(up) {
		if (MessageUserStore.listChecked().length) {
			return false;
		}

		clearTimeout(this.iGoToUpOrDownTimeout);
		this.iGoToUpOrDownTimeout = setTimeout(() => {
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

			if (!SettingsUserStore.usePreviewPane() && !MessageUserStore.message()) {
				this.selector.iFocusedNextHelper = up ? -1 : 1;
			} else {
				this.selector.iSelectNextHelper = up ? -1 : 1;
			}

			if (up ? prev : next) {
				this.selector.unselect();
				this.gotoPage(up ? prev : next);
			}
		}, 350);

		return true;
	}

	useAutoSelect() {
		return !MessageUserStore.listDisableAutoSelect()
			&& !/is:unseen/.test(MessageUserStore.mainMessageListSearch())
			&& SettingsUserStore.usePreviewPane();
	}

	searchEnterAction() {
		MessageUserStore.mainMessageListSearch(this.sLastSearchValue);
		this.inputMessageListSearchFocus(false);
	}

	cancelSearch() {
		MessageUserStore.mainMessageListSearch('');
		this.inputMessageListSearchFocus(false);
	}

	cancelThreadUid() {
		rl.route.setHash(
			mailBox(
				FolderUserStore.currentFolderFullNameHash(),
				MessageUserStore.listPageBeforeThread(),
				MessageUserStore.listSearch()
			)
		);
	}

	/**
	 * @param {string} sToFolderFullNameRaw
	 * @param {boolean} bCopy
	 * @returns {boolean}
	 */
	moveSelectedMessagesToFolder(sToFolderFullNameRaw, bCopy) {
		if (MessageUserStore.hasCheckedOrSelected()) {
			rl.app.moveMessagesToFolder(
				FolderUserStore.currentFolderFullNameRaw(),
				MessageUserStore.listCheckedOrSelectedUidsWithSubMails(),
				sToFolderFullNameRaw,
				bCopy
			);
		}

		return false;
	}

	getDragData(event) {
		const item = ko.dataFor(doc.elementFromPoint(event.clientX, event.clientY));
		item && item.checked && item.checked(true);
		const uids = MessageUserStore.listCheckedOrSelectedUidsWithSubMails();
		item && !uids.includes(item.uid) && uids.push(item.uid);
		return uids.length ? {
			copy: event.ctrlKey,
			folder: FolderUserStore.currentFolderFullNameRaw(),
			uids: uids
		} : null;
	}

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {number} iSetAction
	 * @param {Array=} aMessages = null
	 * @returns {void}
	 */
	setAction(sFolderFullNameRaw, iSetAction, aMessages) {
		rl.app.messageListAction(sFolderFullNameRaw, iSetAction, aMessages);
	}

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {number} iSetAction
	 * @param {number} iThreadUid = ''
	 * @returns {void}
	 */
	setActionForAll(sFolderFullNameRaw, iSetAction, iThreadUid = 0) {
		if (sFolderFullNameRaw) {
			let cnt = 0;
			const uids = [];

			let folder = getFolderFromCacheList(sFolderFullNameRaw);
			if (folder) {
				switch (iSetAction) {
					case MessageSetAction.SetSeen:
						folder = getFolderFromCacheList(sFolderFullNameRaw);
						if (folder) {
							MessageUserStore.list.forEach(message => {
								if (message.isUnseen()) {
									++cnt;
								}

								message.isUnseen(false);
								uids.push(message.uid);
							});

							if (iThreadUid) {
								folder.messageCountUnread(folder.messageCountUnread() - cnt);
								if (0 > folder.messageCountUnread()) {
									folder.messageCountUnread(0);
								}
							} else {
								folder.messageCountUnread(0);
							}

							MessageFlagsCache.clearFolder(sFolderFullNameRaw);
						}

						Remote.messageSetSeenToAll(()=>0, sFolderFullNameRaw, true, iThreadUid ? uids : null);
						break;
					case MessageSetAction.UnsetSeen:
						folder = getFolderFromCacheList(sFolderFullNameRaw);
						if (folder) {
							MessageUserStore.list.forEach(message => {
								if (!message.isUnseen()) {
									++cnt;
								}

								message.isUnseen(true);
								uids.push(message.uid);
							});

							if (iThreadUid) {
								folder.messageCountUnread(folder.messageCountUnread() + cnt);
								if (folder.messageCountAll() < folder.messageCountUnread()) {
									folder.messageCountUnread(folder.messageCountAll());
								}
							} else {
								folder.messageCountUnread(folder.messageCountAll());
							}

							MessageFlagsCache.clearFolder(sFolderFullNameRaw);
						}

						Remote.messageSetSeenToAll(()=>0, sFolderFullNameRaw, false, iThreadUid ? uids : null);
						break;
					// no default
				}

				rl.app.reloadFlagsCurrentMessageListAndMessageFromCache();
			}
		}
	}

	listSetSeen() {
		this.setAction(
			FolderUserStore.currentFolderFullNameRaw(),
			MessageSetAction.SetSeen,
			MessageUserStore.listCheckedOrSelected()
		);
	}

	listSetAllSeen() {
		this.setActionForAll(
			FolderUserStore.currentFolderFullNameRaw(),
			MessageSetAction.SetSeen,
			MessageUserStore.listEndThreadUid()
		);
	}

	listUnsetSeen() {
		this.setAction(
			FolderUserStore.currentFolderFullNameRaw(),
			MessageSetAction.UnsetSeen,
			MessageUserStore.listCheckedOrSelected()
		);
	}

	listSetFlags() {
		this.setAction(
			FolderUserStore.currentFolderFullNameRaw(),
			MessageSetAction.SetFlag,
			MessageUserStore.listCheckedOrSelected()
		);
	}

	listUnsetFlags() {
		this.setAction(
			FolderUserStore.currentFolderFullNameRaw(),
			MessageSetAction.UnsetFlag,
			MessageUserStore.listCheckedOrSelected()
		);
	}

	flagMessages(currentMessage) {
		const checked = MessageUserStore.listCheckedOrSelected();
		if (currentMessage) {
			const checkedUids = checked.map(message => message.uid);
			if (checkedUids.includes(currentMessage.uid)) {
				this.setAction(
					currentMessage.folder,
					currentMessage.isFlagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					checked
				);
			} else {
				this.setAction(
					currentMessage.folder,
					currentMessage.isFlagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					[currentMessage]
				);
			}
		}
	}

	flagMessagesFast(bFlag) {
		const checked = MessageUserStore.listCheckedOrSelected();
		if (checked.length) {
			if (undefined === bFlag) {
				const flagged = checked.filter(message => message.isFlagged());
				this.setAction(
					checked[0].folder,
					checked.length === flagged.length ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					checked
				);
			} else {
				this.setAction(
					checked[0].folder,
					!bFlag ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					checked
				);
			}
		}
	}

	seenMessagesFast(seen) {
		const checked = MessageUserStore.listCheckedOrSelected();
		if (checked.length) {
			if (undefined === seen) {
				const unseen = checked.filter(message => message.isUnseen());
				this.setAction(
					checked[0].folder,
					unseen.length ? MessageSetAction.SetSeen : MessageSetAction.UnsetSeen,
					checked
				);
			} else {
				this.setAction(
					checked[0].folder,
					seen ? MessageSetAction.SetSeen : MessageSetAction.UnsetSeen,
					checked
				);
			}
		}
	}

	gotoPage(page) {
		page && rl.route.setHash(
			mailBox(
				FolderUserStore.currentFolderFullNameHash(),
				page.value,
				MessageUserStore.listSearch(),
				MessageUserStore.listThreadUid()
			)
		);
	}

	gotoThread(message) {
		if (message && 0 < message.threadsLen()) {
			MessageUserStore.listPageBeforeThread(MessageUserStore.listPage());

			rl.route.setHash(
				mailBox(FolderUserStore.currentFolderFullNameHash(), 1, MessageUserStore.listSearch(), message.uid)
			);
		}
	}

	listEmptyMessage() {
		if (!this.dragOver()
		 && !MessageUserStore.list().length
		 && !MessageUserStore.listCompleteLoading()
		 && !MessageUserStore.listError()) {
			 return i18n('MESSAGE_LIST/EMPTY_' + (MessageUserStore.listSearch() ? 'SEARCH_' : '') + 'LIST');
		}
		return '';
	}

	clearListIsVisible() {
		return (
			!this.messageListSearchDesc() &&
			!MessageUserStore.listError() &&
			!MessageUserStore.listEndThreadUid() &&
			MessageUserStore.list().length &&
			(this.isSpamFolder() || this.isTrashFolder())
		);
	}

	onBuild(dom) {
		const eqs = (ev, s) => ev.target.closestWithin('.messageList '+s, dom);

		this.selector.init(dom.querySelector('.b-content'), Scope.MessageList);

		dom.addEventListener('click', event => {
			ThemeStore.isMobile() && leftPanelDisabled(true);

			if (eqs(event, '.b-message-list-wrapper') && Scope.MessageView === AppUserStore.focusedState()) {
				AppUserStore.focusedState(Scope.MessageList);
			}

			let el = eqs(event, '.e-paginator .e-page');
			el && this.gotoPage(ko.dataFor(el));

			eqs(event, '.checkboxCheckAll') && this.checkAll(!this.checkAll());

			el = eqs(event, '.flagParent');
			el && this.flagMessages(ko.dataFor(el));

			el = eqs(event, '.threads-len');
			el && this.gotoThread(ko.dataFor(el));
		});

		dom.addEventListener('dblclick', event => {
			let  el = eqs(event, '.actionHandle');
			el && this.gotoThread(ko.dataFor(el));
		});

		// initUploaderForAppend

		if (Settings.app('allowAppendMessage') && this.dragOverArea()) {
			const oJua = new Jua({
				action: serverRequest('Append'),
				name: 'AppendFile',
				limit: 1,
				hidden: {
					Folder: () => FolderUserStore.currentFolderFullNameRaw()
				},
				dragAndDropElement: this.dragOverArea(),
				dragAndDropBodyElement: this.dragOverBodyArea()
			});

			this.dragOver.subscribe(value => value && this.selector.scrollToTop());

			oJua
				.on('onDragEnter', () => this.dragOverEnter(true))
				.on('onDragLeave', () => this.dragOverEnter(false))
				.on('onBodyDragEnter', () => this.dragOver(true))
				.on('onBodyDragLeave', () => this.dragOver(false))
				.on('onSelect', (sUid, oData) => {
					if (sUid && oData && 'message/rfc822' === oData.Type) {
						MessageUserStore.listLoading(true);
						return true;
					}

					return false;
				})
				.on('onComplete', () => rl.app.reloadMessageList(true, true));
		}

		// initShortcuts

		shortcuts.add('enter,open', '', Scope.MessageList, () => {
			if (MessageUserStore.message() && this.useAutoSelect()) {
				dispatchEvent(new CustomEvent('mailbox.message-view.toggle-full-screen'));
				return false;
			}
		});

		// archive (zip)
		shortcuts.add('z', '', [Scope.MessageList, Scope.MessageView], () => {
			this.archiveCommand();
			return false;
		});

		// delete
		shortcuts.add('delete', 'shift', Scope.MessageList, () => {
			MessageUserStore.listCheckedOrSelected().length && this.deleteWithoutMoveCommand();
			return false;
		});
//		shortcuts.add('3', 'shift', Scope.MessageList, () => {
		shortcuts.add('delete', '', Scope.MessageList, () => {
			MessageUserStore.listCheckedOrSelected().length && this.deleteCommand();
			return false;
		});

		// check mail
		shortcuts.add('r', 'meta', [Scope.FolderList, Scope.MessageList, Scope.MessageView], () => {
			this.reloadCommand();
			return false;
		});

		// check all
		shortcuts.add('a', 'meta', Scope.MessageList, () => {
			this.checkAll(!(this.checkAll() && !this.isIncompleteChecked()));
			return false;
		});

		// write/compose (open compose popup)
		shortcuts.add('w,c,new', '', [Scope.MessageList, Scope.MessageView], () => {
			showMessageComposer();
			return false;
		});

		// important - star/flag messages
		shortcuts.add('i', '', [Scope.MessageList, Scope.MessageView], () => {
			this.flagMessagesFast();
			return false;
		});

		shortcuts.add('t', '', [Scope.MessageList], () => {
			let message = MessageUserStore.selectorMessageSelected();
			if (!message) {
				message = MessageUserStore.selectorMessageFocused();
			}

			if (message && 0 < message.threadsLen()) {
				this.gotoThread(message);
			}

			return false;
		});

		// move
		shortcuts.add('insert', '', Scope.MessageList, () => {
			if (this.newMoveToFolder) {
				this.moveNewCommand();
			} else {
				this.moveDropdownTrigger(true);
			}

			return false;
		});

		// read
		shortcuts.add('q', '', [Scope.MessageList, Scope.MessageView], () => {
			this.seenMessagesFast(true);
			return false;
		});

		// unread
		shortcuts.add('u', '', [Scope.MessageList, Scope.MessageView], () => {
			this.seenMessagesFast(false);
			return false;
		});

		shortcuts.add('f,mailforward', 'shift', [Scope.MessageList, Scope.MessageView], () => {
			this.multyForwardCommand();
			return false;
		});

		if (Settings.capa(Capa.Search)) {
			// search input focus
			shortcuts.add('/', '', [Scope.MessageList, Scope.MessageView], () => {
				this.inputMessageListSearchFocus(true);
				return false;
			});
		}

		// cancel search
		shortcuts.add('escape', '', Scope.MessageList, () => {
			if (this.messageListSearchDesc()) {
				this.cancelSearch();
				return false;
			} else if (MessageUserStore.listEndThreadUid()) {
				this.cancelThreadUid();
				return false;
			}
		});

		// change focused state
		shortcuts.add('tab', 'shift', Scope.MessageList, () => {
			AppUserStore.focusedState(Scope.FolderList);
			return false;
		});
		shortcuts.add('arrowleft', '', Scope.MessageList, () => {
			AppUserStore.focusedState(Scope.FolderList);
			return false;
		});
		shortcuts.add('tab,arrowright', '', Scope.MessageList, () => {
			if (MessageUserStore.message()){
				AppUserStore.focusedState(Scope.MessageView);
				return false;
			}
		});

		shortcuts.add('arrowleft', 'meta', Scope.MessageView, ()=>false);
		shortcuts.add('arrowright', 'meta', Scope.MessageView, ()=>false);

		if (!ThemeStore.isMobile() && Settings.capa(Capa.Prefetch)) {
			ifvisible.idle(this.prefetchNextTick.bind(this));
		}
	}

	prefetchNextTick() {
		if (!this.bPrefetch && !ifvisible.now() && !this.viewModelDom.hidden) {
			const message = MessageUserStore.list.find(
				item => item && !hasRequestedMessage(item.folder, item.uid)
			);
			if (message) {
				this.bPrefetch = true;

				addRequestedMessage(message.folder, message.uid);

				Remote.message(
					iError => {
						const next = !iError;
						setTimeout(() => {
							this.bPrefetch = false;
							next && this.prefetchNextTick();
						}, 1000);
					},
					message.folder,
					message.uid
				);
			}
		}
	}

	advancedSearchClick() {
		Settings.capa(Capa.SearchAdv)
			&& showScreenPopup(AdvancedSearchPopupView, [MessageUserStore.mainMessageListSearch()]);
	}

	quotaTooltip() {
		return i18n('MESSAGE_LIST/QUOTA_SIZE', {
			SIZE: FileInfo.friendlySize(QuotaUserStore.usage()),
			PROC: QuotaUserStore.percentage(),
			LIMIT: FileInfo.friendlySize(QuotaUserStore.quota())
		}).replace(/<[^>]+>/g, '');
	}
}
