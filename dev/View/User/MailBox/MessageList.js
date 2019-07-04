import window from 'window';
import _ from '_';
import $ from '$';
import ko from 'ko';
import key from 'key';
import Jua from 'Jua';
import ifvisible from 'ifvisible';

import {
	Capa,
	Layout,
	Focused,
	ComposeType,
	FolderType,
	Magics,
	MessageSetAction,
	KeyState,
	StorageResultType
} from 'Common/Enums';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';

import { bMobileDevice, popupVisibility, leftPanelDisabled, moveAction } from 'Common/Globals';

import { noop, noopFalse, computedPagenatorHelper, draggablePlace, friendlySize, inArray, isUnd } from 'Common/Utils';

import { mailBox, append } from 'Common/Links';
import { Selector } from 'Common/Selector';
import * as Events from 'Common/Events';

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

import * as Settings from 'Storage/Settings';
import Remote from 'Remote/User/Ajax';

import { getApp } from 'Helper/Apps/User';

import { view, command, ViewType, showScreenPopup, setHash } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

const canBeMovedHelper = (self) => self.canBeMoved();

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

		this.mobile = !!Settings.appSettingsGet('mobile');
		this.newMoveToFolder = AppStore.newMoveToFolder;

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

		this.messageListChecked = MessageStore.messageListChecked;
		this.messageListCheckedOrSelected = MessageStore.messageListCheckedOrSelected;
		this.messageListCheckedOrSelectedUidsWithSubMails = MessageStore.messageListCheckedOrSelectedUidsWithSubMails;
		this.messageListCompleteLoadingThrottle = MessageStore.messageListCompleteLoadingThrottle;
		this.messageListCompleteLoadingThrottleForAnimation = MessageStore.messageListCompleteLoadingThrottleForAnimation;

		initOnStartOrLangChange(() => {
			this.emptySubjectValue = i18n('MESSAGE_LIST/EMPTY_SUBJECT_TEXT');
		});

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
			return '' === value ? '' : i18n('MESSAGE_LIST/SEARCH_RESULT_FOR', { 'SEARCH': value });
		});

		this.messageListPagenator = ko.computed(
			computedPagenatorHelper(MessageStore.messageListPage, MessageStore.messageListPageCount)
		);

		this.checkAll = ko.computed({
			read: () => 0 < MessageStore.messageListChecked().length,
			write: (value) => {
				value = !!value;
				_.each(MessageStore.messageList(), (message) => {
					message.checked(value);
				});
			}
		});

		this.inputMessageListSearchFocus = ko.observable(false);

		this.sLastSearchValue = '';
		this.inputProxyMessageListSearch = ko.computed({
			read: this.mainMessageListSearch,
			write: (value) => {
				this.sLastSearchValue = value;
			}
		});

		this.isIncompleteChecked = ko.computed(() => {
			const m = MessageStore.messageList().length,
				c = MessageStore.messageListChecked().length;
			return 0 < m && 0 < c && m > c;
		});

		this.hasMessages = ko.computed(() => 0 < this.messageList().length);

		this.hasCheckedOrSelectedLines = ko.computed(() => 0 < this.messageListCheckedOrSelected().length);

		this.isSpamFolder = ko.computed(
			() => FolderStore.spamFolder() === this.messageListEndFolder() && '' !== FolderStore.spamFolder()
		);

		this.isSpamDisabled = ko.computed(() => UNUSED_OPTION_VALUE === FolderStore.spamFolder());

		this.isTrashFolder = ko.computed(
			() => FolderStore.trashFolder() === this.messageListEndFolder() && '' !== FolderStore.trashFolder()
		);

		this.isDraftFolder = ko.computed(
			() => FolderStore.draftFolder() === this.messageListEndFolder() && '' !== FolderStore.draftFolder()
		);

		this.isSentFolder = ko.computed(
			() => FolderStore.sentFolder() === this.messageListEndFolder() && '' !== FolderStore.sentFolder()
		);

		this.isArchiveFolder = ko.computed(
			() => FolderStore.archiveFolder() === this.messageListEndFolder() && '' !== FolderStore.archiveFolder()
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

		this.mobileCheckedStateShow = ko.computed(() => {
			const checked = 0 < this.messageListChecked().length;
			return this.mobile ? checked : true;
		});

		this.mobileCheckedStateHide = ko.computed(() => {
			const checked = 0 < this.messageListChecked().length;
			return this.mobile ? !checked : true;
		});

		this.messageListFocused = ko.computed(() => Focused.MessageList === AppStore.focusedState());

		this.canBeMoved = this.hasCheckedOrSelectedLines;

		this.quotaTooltip = _.bind(this.quotaTooltip, this);

		this.selector = new Selector(
			this.messageList,
			this.selectorMessageSelected,
			this.selectorMessageFocused,
			'.messageListItem .actionHandle',
			'.messageListItem.selected',
			'.messageListItem .checkboxMessage',
			'.messageListItem.focused'
		);

		this.selector.on('onItemSelect', (message) => {
			MessageStore.selectMessage(message);
		});

		this.selector.on('onItemGetUid', (message) => (message ? message.generateUid() : ''));

		this.selector.on('onAutoSelect', () => this.useAutoSelect());

		this.selector.on('onUpUpOrDownDown', (v) => {
			this.goToUpUpOrDownDown(v);
		});

		Events.sub('mailbox.message-list.selector.go-down', (select) => {
			this.selector.goDown(select);
		});

		Events.sub('mailbox.message-list.selector.go-up', (select) => {
			this.selector.goUp(select);
		});

		Events.sub('mailbox.message.show', (sFolder, sUid) => {
			const message = _.find(
				this.messageList(),
				(item) => item && sFolder === item.folderFullNameRaw && sUid === item.uid
			);

			if ('INBOX' === sFolder) {
				setHash(mailBox(sFolder, 1));
			}

			if (message) {
				this.selector.selectMessageItem(message);
			} else {
				if ('INBOX' !== sFolder) {
					setHash(mailBox(sFolder, 1));
				}

				MessageStore.selectMessageByFolderAndUid(sFolder, sUid);
			}
		});

		MessageStore.messageListEndHash.subscribe(() => {
			this.selector.scrollToTop();
		});
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
			getApp().reloadMessageList(false, true);
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
			getApp().deleteMessagesFromFolder(
				FolderType.Trash,
				FolderStore.currentFolderFullNameRaw(),
				MessageStore.messageListCheckedOrSelectedUidsWithSubMails(),
				false
			);
		}
	}

	@command(canBeMovedHelper)
	deleteCommand() {
		getApp().deleteMessagesFromFolder(
			FolderType.Trash,
			FolderStore.currentFolderFullNameRaw(),
			MessageStore.messageListCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	@command(canBeMovedHelper)
	archiveCommand() {
		getApp().deleteMessagesFromFolder(
			FolderType.Archive,
			FolderStore.currentFolderFullNameRaw(),
			MessageStore.messageListCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	@command(canBeMovedHelper)
	spamCommand() {
		getApp().deleteMessagesFromFolder(
			FolderType.Spam,
			FolderStore.currentFolderFullNameRaw(),
			MessageStore.messageListCheckedOrSelectedUidsWithSubMails(),
			true
		);
	}

	@command(canBeMovedHelper)
	notSpamCommand() {
		getApp().deleteMessagesFromFolder(
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
		if (this.newMoveToFolder() && this.mobileCheckedStateShow()) {
			if (vm && event && event.preventDefault) {
				event.preventDefault();
				if (event.stopPropagation) {
					event.stopPropagation();
				}
			}

			if (moveAction()) {
				AppStore.focusedState(Focused.MessageList);
				moveAction(false);
			} else {
				AppStore.focusedState(Focused.FolderList);
				moveAction(true);
			}
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
		if (0 < this.messageListChecked().length) {
			return false;
		}

		window.clearTimeout(this.iGoToUpUpOrDownDownTimeout);
		this.iGoToUpUpOrDownDownTimeout = window.setTimeout(() => {
			let prev = null,
				next = null,
				temp = null,
				current = null;

			_.find(this.messageListPagenator(), (item) => {
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
		}, Magics.Time350ms);

		return true;
	}

	useAutoSelect() {
		if (this.messageListDisableAutoSelect()) {
			return false;
		}

		if (/is:unseen/.test(this.mainMessageListSearch())) {
			return false;
		}

		return Layout.NoPreview !== SettingsStore.layout();
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
		setHash(
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
			getApp().moveMessagesToFolder(
				FolderStore.currentFolderFullNameRaw(),
				MessageStore.messageListCheckedOrSelectedUidsWithSubMails(),
				sToFolderFullNameRaw,
				bCopy
			);
		}

		return false;
	}

	dragAndDronHelper(oMessageListItem) {
		if (oMessageListItem) {
			oMessageListItem.checked(true);
		}

		const el = draggablePlace(),
			updateUidsInfo = () => {
				const uids = MessageStore.messageListCheckedOrSelectedUidsWithSubMails();
				el.data('rl-uids', uids);
				el.find('.text').text('' + uids.length);
			};

		el.data('rl-folder', FolderStore.currentFolderFullNameRaw());

		updateUidsInfo();
		_.defer(updateUidsInfo);

		return el;
	}

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {number} iSetAction
	 * @param {Array=} aMessages = null
	 * @returns {void}
	 */
	setAction(sFolderFullNameRaw, iSetAction, aMessages) {
		getApp().messageListAction(sFolderFullNameRaw, iSetAction, aMessages);
	}

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {number} iSetAction
	 * @param {string} sThreadUid = ''
	 * @returns {void}
	 */
	setActionForAll(sFolderFullNameRaw, iSetAction, sThreadUid = '') {
		if ('' !== sFolderFullNameRaw) {
			let cnt = 0;
			const uids = [];

			let folder = getFolderFromCacheList(sFolderFullNameRaw);
			if (folder) {
				switch (iSetAction) {
					case MessageSetAction.SetSeen:
						folder = getFolderFromCacheList(sFolderFullNameRaw);
						if (folder) {
							_.each(MessageStore.messageList(), (message) => {
								if (message.unseen()) {
									cnt += 1;
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

						Remote.messageSetSeenToAll(noop, sFolderFullNameRaw, true, sThreadUid ? uids : null);
						break;
					case MessageSetAction.UnsetSeen:
						folder = getFolderFromCacheList(sFolderFullNameRaw);
						if (folder) {
							_.each(MessageStore.messageList(), (message) => {
								if (!message.unseen()) {
									cnt += 1;
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

						Remote.messageSetSeenToAll(noop, sFolderFullNameRaw, false, sThreadUid ? uids : null);
						break;
					// no default
				}

				getApp().reloadFlagsCurrentMessageListAndMessageFromCache();
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
			const checkedUids = _.map(checked, (message) => message.uid);
			if (0 < checkedUids.length && -1 < inArray(currentMessage.uid, checkedUids)) {
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
		if (0 < checked.length) {
			if (isUnd(bFlag)) {
				const flagged = _.filter(checked, (message) => message.flagged());
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
		if (0 < checked.length) {
			if (isUnd(seen)) {
				const unseen = _.filter(checked, (message) => message.unseen());
				this.setAction(
					checked[0].folderFullNameRaw,
					0 < unseen.length ? MessageSetAction.SetSeen : MessageSetAction.UnsetSeen,
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
		if (page) {
			setHash(
				mailBox(
					FolderStore.currentFolderFullNameHash(),
					page.value,
					MessageStore.messageListSearch(),
					MessageStore.messageListThreadUid()
				)
			);
		}
	}

	gotoThread(message) {
		if (message && 0 < message.threadsLen()) {
			MessageStore.messageListPageBeforeThread(MessageStore.messageListPage());

			setHash(mailBox(FolderStore.currentFolderFullNameHash(), 1, MessageStore.messageListSearch(), message.uid));
		}
	}

	clearListIsVisible() {
		return (
			'' === this.messageListSearchDesc() &&
			'' === this.messageListError() &&
			'' === this.messageListEndThreadUid() &&
			0 < this.messageList().length &&
			(this.isSpamFolder() || this.isTrashFolder())
		);
	}

	onBuild(dom) {
		const self = this;

		this.oContentVisible = $('.b-content', dom);
		this.oContentScrollable = $('.content', this.oContentVisible);

		this.selector.init(this.oContentVisible, this.oContentScrollable, KeyState.MessageList);

		if (this.mobile) {
			dom.on('click', () => {
				leftPanelDisabled(true);
			});
		}

		dom
			.on('click', '.messageList .b-message-list-wrapper', () => {
				if (Focused.MessageView === AppStore.focusedState()) {
					AppStore.focusedState(Focused.MessageList);
				}
			})
			.on('click', '.e-pagenator .e-page', function() {
				// eslint-disable-line prefer-arrow-callback
				self.gotoPage(ko.dataFor(this)); // eslint-disable-line no-invalid-this
			})
			.on('click', '.messageList .checkboxCkeckAll', () => {
				this.checkAll(!this.checkAll());
			})
			.on('click', '.messageList .messageListItem .flagParent', function() {
				// eslint-disable-line prefer-arrow-callback
				self.flagMessages(ko.dataFor(this)); // eslint-disable-line no-invalid-this
			})
			.on('click', '.messageList .messageListItem .threads-len', function() {
				// eslint-disable-line prefer-arrow-callback
				self.gotoThread(ko.dataFor(this)); // eslint-disable-line no-invalid-this
			})
			.on('dblclick', '.messageList .messageListItem .actionHandle', function() {
				// eslint-disable-line prefer-arrow-callback
				self.gotoThread(ko.dataFor(this)); // eslint-disable-line no-invalid-this
			});

		this.initUploaderForAppend();
		this.initShortcuts();

		if (!bMobileDevice && ifvisible && Settings.capa(Capa.Prefetch)) {
			ifvisible.setIdleDuration(Magics.ifvisibleIdle10s);

			ifvisible.idle(() => {
				this.prefetchNextTick();
			});
		}
	}

	initShortcuts() {
		key('enter', KeyState.MessageList, () => {
			if (this.message() && this.useAutoSelect()) {
				Events.pub('mailbox.message-view.toggle-full-screen');
				return false;
			}

			return true;
		});

		if (Settings.capa(Capa.MessageListActions)) {
			// archive (zip)
			key('z', [KeyState.MessageList, KeyState.MessageView], () => {
				this.archiveCommand();
				return false;
			});

			// delete
			key('delete, shift+delete, shift+3', KeyState.MessageList, (event, handler) => {
				if (event) {
					if (0 < MessageStore.messageListCheckedOrSelected().length) {
						if (handler && 'shift+delete' === handler.shortcut) {
							this.deleteWithoutMoveCommand();
						} else {
							this.deleteCommand();
						}
					}

					return false;
				}

				return true;
			});
		}

		if (Settings.capa(Capa.Reload)) {
			// check mail
			key('ctrl+r, command+r', [KeyState.FolderList, KeyState.MessageList, KeyState.MessageView], () => {
				this.reloadCommand();
				return false;
			});
		}

		// check all
		key('ctrl+a, command+a', KeyState.MessageList, () => {
			this.checkAll(!(this.checkAll() && !this.isIncompleteChecked()));
			return false;
		});

		if (Settings.capa(Capa.Composer)) {
			// write/compose (open compose popup)
			key('w,c', [KeyState.MessageList, KeyState.MessageView], () => {
				showScreenPopup(require('View/Popup/Compose'));
				return false;
			});
		}

		if (Settings.capa(Capa.MessageListActions)) {
			// important - star/flag messages
			key('i', [KeyState.MessageList, KeyState.MessageView], () => {
				this.flagMessagesFast();
				return false;
			});
		}

		key('t', [KeyState.MessageList], () => {
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
			key('m', KeyState.MessageList, () => {
				if (this.newMoveToFolder()) {
					this.moveNewCommand();
				} else {
					this.moveDropdownTrigger(true);
				}

				return false;
			});
		}

		if (Settings.capa(Capa.MessageListActions)) {
			// read
			key('q', [KeyState.MessageList, KeyState.MessageView], () => {
				this.seenMessagesFast(true);
				return false;
			});

			// unread
			key('u', [KeyState.MessageList, KeyState.MessageView], () => {
				this.seenMessagesFast(false);
				return false;
			});
		}

		if (Settings.capa(Capa.Composer)) {
			key('shift+f', [KeyState.MessageList, KeyState.MessageView], () => {
				this.multyForwardCommand();
				return false;
			});
		}

		if (Settings.capa(Capa.Search)) {
			// search input focus
			key('/', [KeyState.MessageList, KeyState.MessageView], () => {
				this.inputMessageListSearchFocus(true);
				return false;
			});
		}

		// cancel search
		key('esc', KeyState.MessageList, () => {
			if ('' !== this.messageListSearchDesc()) {
				this.cancelSearch();
				return false;
			} else if ('' !== this.messageListEndThreadUid()) {
				this.cancelThreadUid();
				return false;
			}

			return true;
		});

		// change focused state
		key('tab, shift+tab, left, right', KeyState.MessageList, (event, handler) => {
			if (event && handler && ('shift+tab' === handler.shortcut || 'left' === handler.shortcut)) {
				AppStore.focusedState(Focused.FolderList);
			} else if (this.message()) {
				AppStore.focusedState(Focused.MessageView);
			}

			return false;
		});

		key('ctrl+left, command+left', KeyState.MessageView, noopFalse);
		key('ctrl+right, command+right', KeyState.MessageView, noopFalse);
	}

	prefetchNextTick() {
		if (ifvisible && !this.bPrefetch && !ifvisible.now() && this.viewModelVisibility()) {
			const message = _.find(
				this.messageList(),
				(item) => item && !hasRequestedMessage(item.folderFullNameRaw, item.uid)
			);
			if (message) {
				this.bPrefetch = true;

				addRequestedMessage(message.folderFullNameRaw, message.uid);

				Remote.message(
					(result, data) => {
						const next = !!(StorageResultType.Success === result && data && data.Result);
						_.delay(() => {
							this.bPrefetch = false;
							if (next) {
								this.prefetchNextTick();
							}
						}, Magics.Time1s);
					},
					message.folderFullNameRaw,
					message.uid
				);
			}
		}
	}

	advancedSearchClick() {
		if (Settings.capa(Capa.SearchAdv)) {
			showScreenPopup(require('View/Popup/AdvancedSearch'), [this.mainMessageListSearch()]);
		}
	}

	quotaTooltip() {
		return i18n('MESSAGE_LIST/QUOTA_SIZE', {
			'SIZE': friendlySize(this.userUsageSize()),
			'PROC': this.userUsageProc(),
			'LIMIT': friendlySize(this.userQuota())
		});
	}

	initUploaderForAppend() {
		if (!Settings.appSettingsGet('allowAppendMessage') || !this.dragOverArea()) {
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

		this.dragOver.subscribe((value) => {
			if (value) {
				this.selector.scrollToTop();
			}
		});

		oJua
			.on('onDragEnter', () => {
				this.dragOverEnter(true);
			})
			.on('onDragLeave', () => {
				this.dragOverEnter(false);
			})
			.on('onBodyDragEnter', () => {
				this.dragOver(true);
			})
			.on('onBodyDragLeave', () => {
				this.dragOver(false);
			})
			.on('onSelect', (sUid, oData) => {
				if (sUid && oData && 'message/rfc822' === oData.Type) {
					MessageStore.messageListLoading(true);
					return true;
				}

				return false;
			})
			.on('onComplete', () => {
				getApp().reloadMessageList(true, true);
			});

		return !!oJua;
	}
}

export { MessageListMailBoxUserView, MessageListMailBoxUserView as default };
