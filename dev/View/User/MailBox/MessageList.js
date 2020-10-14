import ko from 'ko';

import {
	Capa,
	Layout,
	Focused,
	ComposeType,
	FolderType,
	MessageSetAction,
	KeyState,
	StorageResultType
} from 'Common/Enums';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';

import { leftPanelDisabled, moveAction } from 'Common/Globals';

import { computedPaginatorHelper } from 'Common/UtilsUser';
import { File } from 'Common/File';

import { mailBox, append } from 'Common/Links';
import { Selector } from 'Common/Selector';

import { i18n, initOnStartOrLangChange } from 'Common/Translator';

import {
	getFolderFromCacheList,
	clearMessageFlagsFromCacheByFolder,
	hasRequestedMessage,
	addRequestedMessage
} from 'Common/Cache';

import AppStore from 'Stores/User/App';
import QuotaStore from 'Stores/User/Quota';
import SettingsStore from 'Stores/User/Settings';
import FolderStore from 'Stores/User/Folder';
import MessageStore from 'Stores/User/Message';

import Remote from 'Remote/User/Fetch';

import { view, command, ViewType, showScreenPopup, popupVisibility } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

const
	Settings = rl.settings,
	canBeMovedHelper = (self) => self.canBeMoved(),
	ifvisible = window.ifvisible;

@view({
	name: 'View/User/MailBox/MessageList',
	type: ViewType.Right,
	templateID: 'MailMessageList'
})
class MessageListMailBoxUserView extends AbstractViewNext {
	constructor() {
		super();

		this.sLastUid = null;
		this.bPrefetch = false;
		this.emptySubjectValue = '';

		this.iGoToUpUpOrDownDownTimeout = 0;

		this.mobile = !!Settings.app('mobile');
		this.newMoveToFolder = !!Settings.get('NewMoveToFolder');

		this.allowReload = !!Settings.capa(Capa.Reload);
		this.allowSearch = !!Settings.capa(Capa.Search);
		this.allowSearchAdv = !!Settings.capa(Capa.SearchAdv);
		this.allowComposer = !!Settings.capa(Capa.Composer);
		this.allowMessageListActions = !!Settings.capa(Capa.MessageListActions);
		this.allowDangerousActions = !!Settings.capa(Capa.DangerousActions);
		this.allowFolders = !!Settings.capa(Capa.Folders);

		this.popupVisibility = popupVisibility;

		this.message = MessageStore.message;
		this.messageList = MessageStore.messageList;
		this.messageListDisableAutoSelect = MessageStore.messageListDisableAutoSelect;

		this.folderList = FolderStore.folderList;

		this.composeInEdit = AppStore.composeInEdit;
		this.leftPanelDisabled = leftPanelDisabled;

		this.selectorMessageSelected = MessageStore.selectorMessageSelected;
		this.selectorMessageFocused = MessageStore.selectorMessageFocused;
		this.isMessageSelected = MessageStore.isMessageSelected;
		this.messageListSearch = MessageStore.messageListSearch;
		this.messageListThreadUid = MessageStore.messageListThreadUid;
		this.messageListError = MessageStore.messageListError;
		this.folderMenuForMove = FolderStore.folderMenuForMove;

		this.useCheckboxesInList = SettingsStore.useCheckboxesInList;

		this.mainMessageListSearch = MessageStore.mainMessageListSearch;
		this.messageListEndFolder = MessageStore.messageListEndFolder;
		this.messageListEndThreadUid = MessageStore.messageListEndThreadUid;

		this.messageListCheckedOrSelected = MessageStore.messageListCheckedOrSelected;
		this.messageListCheckedOrSelectedUidsWithSubMails = MessageStore.messageListCheckedOrSelectedUidsWithSubMails;
		this.messageListCompleteLoadingThrottle = MessageStore.messageListCompleteLoadingThrottle;
		this.messageListCompleteLoadingThrottleForAnimation = MessageStore.messageListCompleteLoadingThrottleForAnimation;

		initOnStartOrLangChange(() => this.emptySubjectValue = i18n('MESSAGE_LIST/EMPTY_SUBJECT_TEXT'));

		this.userQuota = QuotaStore.quota;
		this.userUsageSize = QuotaStore.usage;
		this.userUsageProc = QuotaStore.percentage;

		this.moveDropdownTrigger = ko.observable(false);
		this.moreDropdownTrigger = ko.observable(false);

		// append drag and drop
		this.dragOver = ko.observable(false).extend({ 'throttle': 1 });
		this.dragOverEnter = ko.observable(false).extend({ 'throttle': 1 });
		this.dragOverArea = ko.observable(null);
		this.dragOverBodyArea = ko.observable(null);

		this.messageListItemTemplate = ko.computed(() =>
			this.mobile || Layout.SidePreview === SettingsStore.layout()
				? 'MailMessageListItem'
				: 'MailMessageListItemNoPreviewPane'
		);

		this.messageListSearchDesc = ko.computed(() => {
			const value = MessageStore.messageListEndSearch();
			return value ? i18n('MESSAGE_LIST/SEARCH_RESULT_FOR', { 'SEARCH': value }) : '';
		});

		this.messageListPaginator = ko.computed(
			computedPaginatorHelper(MessageStore.messageListPage, MessageStore.messageListPageCount)
		);

		this.checkAll = ko.computed({
			read: () => 0 < MessageStore.messageListChecked().length,
			write: (value) => {
				value = !!value;
				MessageStore.messageList().forEach(message => message.checked(value));
			}
		});

		this.inputMessageListSearchFocus = ko.observable(false);

		this.sLastSearchValue = '';
		this.inputProxyMessageListSearch = ko.computed({
			read: this.mainMessageListSearch,
			write: value => this.sLastSearchValue = value
		});

		this.isIncompleteChecked = ko.computed(() => {
			const c = MessageStore.messageListChecked().length;
			return c && MessageStore.messageList().length > c;
		});

		this.hasMessages = ko.computed(() => 0 < this.messageList().length);

		this.hasCheckedOrSelectedLines = ko.computed(() => 0 < this.messageListCheckedOrSelected().length);

		this.isSpamFolder = ko.computed(
			() => FolderStore.spamFolder() === this.messageListEndFolder() && FolderStore.spamFolder()
		);

		this.isSpamDisabled = ko.computed(() => UNUSED_OPTION_VALUE === FolderStore.spamFolder());

		this.isTrashFolder = ko.computed(
			() => FolderStore.trashFolder() === this.messageListEndFolder() && FolderStore.trashFolder()
		);

		this.isDraftFolder = ko.computed(
			() => FolderStore.draftFolder() === this.messageListEndFolder() && FolderStore.draftFolder()
		);

		this.isSentFolder = ko.computed(
			() => FolderStore.sentFolder() === this.messageListEndFolder() && FolderStore.sentFolder()
		);

		this.isArchiveFolder = ko.computed(
			() => FolderStore.archiveFolder() === this.messageListEndFolder() && FolderStore.archiveFolder()
		);

		this.isArchiveDisabled = ko.computed(() => UNUSED_OPTION_VALUE === FolderStore.archiveFolder());

		this.isArchiveVisible = ko.computed(
			() => !this.isArchiveFolder() && !this.isArchiveDisabled() && !this.isDraftFolder()
		);

		this.isSpamVisible = ko.computed(
			() => !this.isSpamFolder() && !this.isSpamDisabled() && !this.isDraftFolder() && !this.isSentFolder()
		);

		this.isUnSpamVisible = ko.computed(
			() => this.isSpamFolder() && !this.isSpamDisabled() && !this.isDraftFolder() && !this.isSentFolder()
		);

//		this.messageListChecked = MessageStore.messageListChecked;
		this.mobileCheckedStateShow = ko.computed(() => this.mobile ? 0 < MessageStore.messageListChecked().length : true);

		this.mobileCheckedStateHide = ko.computed(() => this.mobile ? !MessageStore.messageListChecked().length : true);

		this.messageListFocused = ko.computed(() => Focused.MessageList === AppStore.focusedState());

		this.canBeMoved = this.hasCheckedOrSelectedLines;

		this.quotaTooltip = this.quotaTooltip.bind(this);

		this.selector = new Selector(
			this.messageList,
			this.selectorMessageSelected,
			this.selectorMessageFocused,
			'.messageListItem .actionHandle',
			'.messageListItem.selected',
			'.messageListItem .checkboxMessage',
			'.messageListItem.focused'
		);

		this.selector.on('onItemSelect', message => MessageStore.selectMessage(message));

		this.selector.on('onItemGetUid', message => (message ? message.generateUid() : ''));

		this.selector.on('onAutoSelect', () => this.useAutoSelect());

		this.selector.on('onUpUpOrDownDown', v => this.goToUpUpOrDownDown(v));

		addEventListener('mailbox.message-list.selector.go-down', e => this.selector.goDown(e.detail));

		addEventListener('mailbox.message-list.selector.go-up', e => this.selector.goUp(e.detail));

		addEventListener('mailbox.message.show', e => {
			const sFolder = e.detail.Folder, sUid = e.detail.Uid;

			const message = this.messageList().find(
				item => item && sFolder === item.folderFullNameRaw && sUid === item.uid
			);

			if ('INBOX' === sFolder) {
				rl.route.setHash(mailBox(sFolder, 1));
			}

			if (message) {
				this.selector.selectMessageItem(message);
			} else {
				if ('INBOX' !== sFolder) {
					rl.route.setHash(mailBox(sFolder, 1));
				}

				MessageStore.selectMessageByFolderAndUid(sFolder, sUid);
			}
		});

		MessageStore.messageListEndHash.subscribe((() =>
			this.selector.scrollToFocused()
		).throttle(50));
	}

	@command()
	clearCommand() {
		if (Settings.capa(Capa.DangerousActions)) {
			showScreenPopup(require('View/Popup/FolderClear'), [FolderStore.currentFolder()]);
		}
	}

	@command()
	reloadCommand() {
		if (!MessageStore.messageListCompleteLoadingThrottleForAnimation() && this.allowReload) {
			rl.app.reloadMessageList(false, true);
		}
	}

	@command(canBeMovedHelper)
	multyForwardCommand() {
		if (Settings.capa(Capa.Composer)) {
			showScreenPopup(require('View/Popup/Compose'), [
				ComposeType.ForwardAsAttachment,
				MessageStore.messageListCheckedOrSelected()
			]);
		}
	}

	@command(canBeMovedHelper)
	deleteWithoutMoveCommand() {
		if (Settings.capa(Capa.DangerousActions)) {
			rl.app.deleteMessagesFromFolder(
				FolderType.Trash,
				FolderStore.currentFolderFullNameRaw(),
				MessageStore.messageListCheckedOrSelectedUidsWithSubMails(),
				false
			);
		}
	}

	@command(canBeMovedHelper)
	deleteCommand() {
		rl.app.deleteMessagesFromFolder(
			FolderType.Trash,
			FolderStore.currentFolderFullNameRaw(),
			MessageStore.messageListCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	@command(canBeMovedHelper)
	archiveCommand() {
		rl.app.deleteMessagesFromFolder(
			FolderType.Archive,
			FolderStore.currentFolderFullNameRaw(),
			MessageStore.messageListCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	@command(canBeMovedHelper)
	spamCommand() {
		rl.app.deleteMessagesFromFolder(
			FolderType.Spam,
			FolderStore.currentFolderFullNameRaw(),
			MessageStore.messageListCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	@command(canBeMovedHelper)
	notSpamCommand() {
		rl.app.deleteMessagesFromFolder(
			FolderType.NotSpam,
			FolderStore.currentFolderFullNameRaw(),
			MessageStore.messageListCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	@command(canBeMovedHelper)
	moveCommand() {} // eslint-disable-line no-empty-function

	@command(canBeMovedHelper)
	moveNewCommand(vm, event) {
		if (this.newMoveToFolder && this.mobileCheckedStateShow()) {
			if (vm && event && event.preventDefault) {
				event.preventDefault();
				event.stopPropagation();
			}

			let b = moveAction();
			AppStore.focusedState(b ? Focused.MessageList : Focused.FolderList);
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
		if (Settings.capa(Capa.Composer)) {
			showScreenPopup(require('View/Popup/Compose'));
		}
	}

	goToUpUpOrDownDown(up) {
		if (MessageStore.messageListChecked().length) {
			return false;
		}

		clearTimeout(this.iGoToUpUpOrDownDownTimeout);
		this.iGoToUpUpOrDownDownTimeout = setTimeout(() => {
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

			if (Layout.NoPreview === SettingsStore.layout() && !this.message()) {
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
		return !this.messageListDisableAutoSelect()
		 && !/is:unseen/.test(this.mainMessageListSearch())
		 && Layout.NoPreview !== SettingsStore.layout();
	}

	searchEnterAction() {
		this.mainMessageListSearch(this.sLastSearchValue);
		this.inputMessageListSearchFocus(false);
	}

	/**
	 * @returns {string}
	 */
	printableMessageCountForDeletion() {
		const cnt = this.messageListCheckedOrSelectedUidsWithSubMails().length;
		return 1 < cnt ? ' (' + (100 > cnt ? cnt : '99+') + ')' : ''; // eslint-disable-line no-magic-numbers
	}

	cancelSearch() {
		this.mainMessageListSearch('');
		this.inputMessageListSearchFocus(false);
	}

	cancelThreadUid() {
		rl.route.setHash(
			mailBox(
				FolderStore.currentFolderFullNameHash(),
				MessageStore.messageListPageBeforeThread(),
				MessageStore.messageListSearch()
			)
		);
	}

	/**
	 * @param {string} sToFolderFullNameRaw
	 * @param {boolean} bCopy
	 * @returns {boolean}
	 */
	moveSelectedMessagesToFolder(sToFolderFullNameRaw, bCopy) {
		if (this.canBeMoved()) {
			rl.app.moveMessagesToFolder(
				FolderStore.currentFolderFullNameRaw(),
				MessageStore.messageListCheckedOrSelectedUidsWithSubMails(),
				sToFolderFullNameRaw,
				bCopy
			);
		}

		return false;
	}

	getDragData(event) {
		const item = ko.dataFor(document.elementFromPoint(event.clientX, event.clientY));
		item && item.checked && item.checked(true);
		const uids = MessageStore.messageListCheckedOrSelectedUidsWithSubMails();
		item && !uids.includes(item.uid) && uids.push(item.uid);
		return uids.length ? {
			copy: event.ctrlKey,
			folder: FolderStore.currentFolderFullNameRaw(),
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
	 * @param {string} sThreadUid = ''
	 * @returns {void}
	 */
	setActionForAll(sFolderFullNameRaw, iSetAction, sThreadUid = '') {
		if (sFolderFullNameRaw) {
			let cnt = 0;
			const uids = [];

			let folder = getFolderFromCacheList(sFolderFullNameRaw);
			if (folder) {
				switch (iSetAction) {
					case MessageSetAction.SetSeen:
						folder = getFolderFromCacheList(sFolderFullNameRaw);
						if (folder) {
							MessageStore.messageList().forEach(message => {
								if (message.unseen()) {
									++cnt;
								}

								message.unseen(false);
								uids.push(message.uid);
							});

							if (sThreadUid) {
								folder.messageCountUnread(folder.messageCountUnread() - cnt);
								if (0 > folder.messageCountUnread()) {
									folder.messageCountUnread(0);
								}
							} else {
								folder.messageCountUnread(0);
							}

							clearMessageFlagsFromCacheByFolder(sFolderFullNameRaw);
						}

						Remote.messageSetSeenToAll(()=>{}, sFolderFullNameRaw, true, sThreadUid ? uids : null);
						break;
					case MessageSetAction.UnsetSeen:
						folder = getFolderFromCacheList(sFolderFullNameRaw);
						if (folder) {
							MessageStore.messageList().forEach(message => {
								if (!message.unseen()) {
									++cnt;
								}

								message.unseen(true);
								uids.push(message.uid);
							});

							if (sThreadUid) {
								folder.messageCountUnread(folder.messageCountUnread() + cnt);
								if (folder.messageCountAll() < folder.messageCountUnread()) {
									folder.messageCountUnread(folder.messageCountAll());
								}
							} else {
								folder.messageCountUnread(folder.messageCountAll());
							}

							clearMessageFlagsFromCacheByFolder(sFolderFullNameRaw);
						}

						Remote.messageSetSeenToAll(()=>{}, sFolderFullNameRaw, false, sThreadUid ? uids : null);
						break;
					// no default
				}

				rl.app.reloadFlagsCurrentMessageListAndMessageFromCache();
			}
		}
	}

	listSetSeen() {
		this.setAction(
			FolderStore.currentFolderFullNameRaw(),
			MessageSetAction.SetSeen,
			MessageStore.messageListCheckedOrSelected()
		);
	}

	listSetAllSeen() {
		this.setActionForAll(
			FolderStore.currentFolderFullNameRaw(),
			MessageSetAction.SetSeen,
			this.messageListEndThreadUid()
		);
	}

	listUnsetSeen() {
		this.setAction(
			FolderStore.currentFolderFullNameRaw(),
			MessageSetAction.UnsetSeen,
			MessageStore.messageListCheckedOrSelected()
		);
	}

	listSetFlags() {
		this.setAction(
			FolderStore.currentFolderFullNameRaw(),
			MessageSetAction.SetFlag,
			MessageStore.messageListCheckedOrSelected()
		);
	}

	listUnsetFlags() {
		this.setAction(
			FolderStore.currentFolderFullNameRaw(),
			MessageSetAction.UnsetFlag,
			MessageStore.messageListCheckedOrSelected()
		);
	}

	flagMessages(currentMessage) {
		const checked = this.messageListCheckedOrSelected();
		if (currentMessage) {
			const checkedUids = checked.map(message => message.uid);
			if (checkedUids.includes(currentMessage.uid)) {
				this.setAction(
					currentMessage.folderFullNameRaw,
					currentMessage.flagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					checked
				);
			} else {
				this.setAction(
					currentMessage.folderFullNameRaw,
					currentMessage.flagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					[currentMessage]
				);
			}
		}
	}

	flagMessagesFast(bFlag) {
		const checked = this.messageListCheckedOrSelected();
		if (checked.length) {
			if (undefined === bFlag) {
				const flagged = checked.filter(message => message.flagged());
				this.setAction(
					checked[0].folderFullNameRaw,
					checked.length === flagged.length ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					checked
				);
			} else {
				this.setAction(
					checked[0].folderFullNameRaw,
					!bFlag ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					checked
				);
			}
		}
	}

	seenMessagesFast(seen) {
		const checked = this.messageListCheckedOrSelected();
		if (checked.length) {
			if (undefined === seen) {
				const unseen = checked.filter(message => message.unseen());
				this.setAction(
					checked[0].folderFullNameRaw,
					unseen.length ? MessageSetAction.SetSeen : MessageSetAction.UnsetSeen,
					checked
				);
			} else {
				this.setAction(
					checked[0].folderFullNameRaw,
					seen ? MessageSetAction.SetSeen : MessageSetAction.UnsetSeen,
					checked
				);
			}
		}
	}

	gotoPage(page) {
		page && rl.route.setHash(
			mailBox(
				FolderStore.currentFolderFullNameHash(),
				page.value,
				MessageStore.messageListSearch(),
				MessageStore.messageListThreadUid()
			)
		);
	}

	gotoThread(message) {
		if (message && 0 < message.threadsLen()) {
			MessageStore.messageListPageBeforeThread(MessageStore.messageListPage());

			rl.route.setHash(
				mailBox(FolderStore.currentFolderFullNameHash(), 1, MessageStore.messageListSearch(), message.uid)
			);
		}
	}

	clearListIsVisible() {
		return (
			!this.messageListSearchDesc() &&
			!this.messageListError() &&
			!this.messageListEndThreadUid() &&
			this.messageList().length &&
			(this.isSpamFolder() || this.isTrashFolder())
		);
	}

	onBuild(dom) {
		const eqs = (ev, s) => ev.target.closestWithin(s, dom);

		this.selector.init(dom.querySelector('.b-content'), KeyState.MessageList);

		dom.addEventListener('click', event => {
			this.mobile && leftPanelDisabled(true);

			if (eqs(event, '.messageList .b-message-list-wrapper') && Focused.MessageView === AppStore.focusedState()) {
				AppStore.focusedState(Focused.MessageList);
			}

			let el = eqs(event, '.e-paginator .e-page');
			el && this.gotoPage(ko.dataFor(el));

			eqs(event, '.messageList .checkboxCkeckAll') && this.checkAll(!this.checkAll());

			el = eqs(event, '.messageList .messageListItem .flagParent');
			el && this.flagMessages(ko.dataFor(el));

			el = eqs(event, '.messageList .messageListItem .threads-len');
			el && this.gotoThread(ko.dataFor(el));
		});

		dom.addEventListener('dblclick', event => {
			let  el = eqs(event, '.messageList .messageListItem .actionHandle');
			el && this.gotoThread(ko.dataFor(el));
		});

		this.initUploaderForAppend();
		this.initShortcuts();

		if (ifvisible && !rl.settings.app('mobile') && Settings.capa(Capa.Prefetch)) {
			ifvisible.idle(this.prefetchNextTick.bind(this));
		}
	}

	initShortcuts() {
		shortcuts.add('enter,open', '', KeyState.MessageList, () => {
			if (this.message() && this.useAutoSelect()) {
				dispatchEvent(new CustomEvent('mailbox.message-view.toggle-full-screen'));
				return false;
			}

			return true;
		});

		if (Settings.capa(Capa.MessageListActions)) {
			// archive (zip)
			shortcuts.add('z', '', [KeyState.MessageList, KeyState.MessageView], () => {
				this.archiveCommand();
				return false;
			});

			// delete
			shortcuts.add('delete', 'shift', KeyState.MessageList, () => {
				MessageStore.messageListCheckedOrSelected().length && this.deleteWithoutMoveCommand();
				return false;
			});
//			shortcuts.add('3', 'shift', KeyState.MessageList, () => {
			shortcuts.add('delete', '', KeyState.MessageList, () => {
				MessageStore.messageListCheckedOrSelected().length && this.deleteCommand();
				return false;
			});
		}

		if (Settings.capa(Capa.Reload)) {
			// check mail
			shortcuts.add('r', 'meta', [KeyState.FolderList, KeyState.MessageList, KeyState.MessageView], () => {
				this.reloadCommand();
				return false;
			});
		}

		// check all
		shortcuts.add('a', 'meta', KeyState.MessageList, () => {
			this.checkAll(!(this.checkAll() && !this.isIncompleteChecked()));
			return false;
		});

		if (Settings.capa(Capa.Composer)) {
			// write/compose (open compose popup)
			shortcuts.add('w,c,new', '', [KeyState.MessageList, KeyState.MessageView], () => {
				showScreenPopup(require('View/Popup/Compose'));
				return false;
			});
		}

		if (Settings.capa(Capa.MessageListActions)) {
			// important - star/flag messages
			shortcuts.add('i', '', [KeyState.MessageList, KeyState.MessageView], () => {
				this.flagMessagesFast();
				return false;
			});
		}

		shortcuts.add('t', '', [KeyState.MessageList], () => {
			let message = this.selectorMessageSelected();
			if (!message) {
				message = this.selectorMessageFocused();
			}

			if (message && 0 < message.threadsLen()) {
				this.gotoThread(message);
			}

			return false;
		});

		if (Settings.capa(Capa.MessageListActions)) {
			// move
			shortcuts.add('insert', '', KeyState.MessageList, () => {
				if (this.newMoveToFolder) {
					this.moveNewCommand();
				} else {
					this.moveDropdownTrigger(true);
				}

				return false;
			});
		}

		if (Settings.capa(Capa.MessageListActions)) {
			// read
			shortcuts.add('q', '', [KeyState.MessageList, KeyState.MessageView], () => {
				this.seenMessagesFast(true);
				return false;
			});

			// unread
			shortcuts.add('u', '', [KeyState.MessageList, KeyState.MessageView], () => {
				this.seenMessagesFast(false);
				return false;
			});
		}

		if (Settings.capa(Capa.Composer)) {
			shortcuts.add('f,mailforward', 'shift', [KeyState.MessageList, KeyState.MessageView], () => {
				this.multyForwardCommand();
				return false;
			});
		}

		if (Settings.capa(Capa.Search)) {
			// search input focus
			shortcuts.add('/', '', [KeyState.MessageList, KeyState.MessageView], () => {
				this.inputMessageListSearchFocus(true);
				return false;
			});
		}

		// cancel search
		shortcuts.add('escape', '', KeyState.MessageList, () => {
			if (this.messageListSearchDesc()) {
				this.cancelSearch();
				return false;
			} else if (this.messageListEndThreadUid()) {
				this.cancelThreadUid();
				return false;
			}

			return true;
		});

		// change focused state
		shortcuts.add('tab', 'shift', KeyState.MessageList, () => {
			AppStore.focusedState(Focused.FolderList);
			return false;
		});
		shortcuts.add('arrowleft', '', KeyState.MessageList, () => {
			AppStore.focusedState(Focused.FolderList);
			return false;
		});
		shortcuts.add('tab,arrowright', '', KeyState.MessageList, () => {
			this.message() && AppStore.focusedState(Focused.MessageView);
			return false;
		});

		shortcuts.add('arrowleft', 'meta', KeyState.MessageView, ()=>false);
		shortcuts.add('arrowright', 'meta', KeyState.MessageView, ()=>false);
	}

	prefetchNextTick() {
		if (ifvisible && !this.bPrefetch && !ifvisible.now() && this.viewModelVisible) {
			const message = this.messageList().find(
				item => item && !hasRequestedMessage(item.folderFullNameRaw, item.uid)
			);
			if (message) {
				this.bPrefetch = true;

				addRequestedMessage(message.folderFullNameRaw, message.uid);

				Remote.message(
					(result, data) => {
						const next = !!(StorageResultType.Success === result && data && data.Result);
						setTimeout(() => {
							this.bPrefetch = false;
							next && this.prefetchNextTick();
						}, 1000);
					},
					message.folderFullNameRaw,
					message.uid
				);
			}
		}
	}

	advancedSearchClick() {
		Settings.capa(Capa.SearchAdv)
			&& showScreenPopup(require('View/Popup/AdvancedSearch'), [this.mainMessageListSearch()]);
	}

	quotaTooltip() {
		return i18n('MESSAGE_LIST/QUOTA_SIZE', {
			'SIZE': File.friendlySize(this.userUsageSize()),
			'PROC': this.userUsageProc(),
			'LIMIT': File.friendlySize(this.userQuota())
		});
	}

	initUploaderForAppend() {
		if (!Settings.app('allowAppendMessage') || !this.dragOverArea()) {
			return false;
		}

		const oJua = new Jua({
			action: append(),
			name: 'AppendFile',
			queueSize: 1,
			multipleSizeLimit: 1,
			hidden: {
				Folder: () => FolderStore.currentFolderFullNameRaw()
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
					MessageStore.messageListLoading(true);
					return true;
				}

				return false;
			})
			.on('onComplete', () => rl.app.reloadMessageList(true, true));

		return !!oJua;
	}
}

export { MessageListMailBoxUserView, MessageListMailBoxUserView as default };
