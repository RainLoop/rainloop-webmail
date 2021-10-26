import ko from 'ko';

import { Scope } from 'Common/Enums';
import { leftPanelDisabled, moveAction } from 'Common/Globals';
import { mailBox, settings } from 'Common/Links';
import { setFolderHash } from 'Common/Cache';
import { addComputablesTo } from 'Common/Utils';

import { AppUserStore } from 'Stores/User/App';
import { SettingsUserStore } from 'Stores/User/Settings';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessageUserStore } from 'Stores/User/Message';
import { ThemeStore } from 'Stores/Theme';

import { showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewLeft } from 'Knoin/AbstractViews';

import { showMessageComposer } from 'Common/UtilsUser';
import { FolderCreatePopupView } from 'View/Popup/FolderCreate';
import { ContactsPopupView } from 'View/Popup/Contacts';

export class MailFolderList extends AbstractViewLeft {
	constructor() {
		super('MailFolderList');

		this.oContentScrollable = null;

		this.composeInEdit = AppUserStore.composeInEdit;

		this.folderList = FolderUserStore.folderList;
		this.folderListSystem = FolderUserStore.folderListSystem;
		this.foldersChanging = FolderUserStore.foldersChanging;

		this.moveAction = moveAction;

		this.foldersListWithSingleInboxRootFolder = ko.observable(false);

		this.leftPanelDisabled = leftPanelDisabled;

		this.allowContacts = AppUserStore.allowContacts();

		addComputablesTo(this, {
			folderListFocused: () => Scope.FolderList === AppUserStore.focusedState(),

			folderListVisible: () => {
				let multiple = false,
					inbox, subscribed, hasSub,
					result = FolderUserStore.folderList().filter(folder => {
						if (folder.isInbox()) {
							inbox = folder;
						}
						subscribed = folder.subscribed();
						hasSub = folder.hasSubscribedSubfolders();
						multiple |= (!folder.isSystemFolder() || (hasSub && !folder.isInbox())) && (subscribed || hasSub)
						return !(folder.hidden() | folder.kolabType());
					});
				if (inbox && !multiple) {
					inbox.collapsedPrivate(false);
				}
				this.foldersListWithSingleInboxRootFolder(!multiple);
				return result;
			}
		});
	}

	onBuild(dom) {
		const qs = s => dom.querySelector(s),
			eqs = (ev, s) => ev.target.closestWithin(s, dom);

		this.oContentScrollable = qs('.b-content');

		dom.addEventListener('click', event => {
			let el = eqs(event, '.e-collapsed-sign');
			if (el) {
				const folder = ko.dataFor(el);
				if (folder) {
					const collapsed = folder.collapsed();
					rl.app.setExpandedFolder(folder.fullNameHash, collapsed);

					folder.collapsed(!collapsed);
					event.preventDefault();
					event.stopPropagation();
					return;
				}
			}

			el = eqs(event, 'a');
			if (el && el.matches('.selectable')) {
				ThemeStore.isMobile() && leftPanelDisabled(true);
				event.preventDefault();
				const folder = ko.dataFor(el);
				if (folder) {
					if (moveAction()) {
						moveAction(false);
						rl.app.moveMessagesToFolder(
							FolderUserStore.currentFolderFullNameRaw(),
							MessageUserStore.listCheckedOrSelectedUidsWithSubMails(),
							folder.fullNameRaw,
							event.ctrlKey
						);
					} else {
						if (!SettingsUserStore.usePreviewPane()) {
							MessageUserStore.message(null);
						}

						if (folder.fullNameRaw === FolderUserStore.currentFolderFullNameRaw()) {
							setFolderHash(folder.fullNameRaw, '');
						}

						rl.route.setHash(
							mailBox(folder.fullNameHash, 1,
								(event.target.matches('.flag-icon') && !folder.isFlagged()) ? 'is:flagged' : ''
							)
						);
					}

					AppUserStore.focusedState(Scope.MessageList);
				}
			}
		});

		shortcuts.add('arrowup,arrowdown', '', Scope.FolderList, event => {
			let items = [], index = 0;
			dom.querySelectorAll('.b-folders li a:not(.hidden)').forEach(node => {
				if (node.offsetHeight || node.getClientRects().length) {
					items.push(node);
					if (node.matches('.focused')) {
						node.classList.remove('focused');
						index = items.length - 1;
					}
				}
			});
			if (items.length) {
				if ('ArrowUp' === event.key) {
					index && --index;
				} else if (index < items.length - 1) {
					++index;
				}
				items[index].classList.add('focused');
				this.scrollToFocused();
			}

			return false;
		});

		shortcuts.add('enter,open', '', Scope.FolderList, () => {
			const item = qs('.b-folders li a:not(.hidden).focused');
			if (item) {
				AppUserStore.focusedState(Scope.MessageList);
				item.click();
			}

			return false;
		});

		shortcuts.add('space', '', Scope.FolderList, () => {
			const item = qs('.b-folders li a:not(.hidden).focused'),
				folder = item && ko.dataFor(item);
			if (folder) {
				const collapsed = folder.collapsed();
				rl.app.setExpandedFolder(folder.fullNameHash, collapsed);
				folder.collapsed(!collapsed);
			}

			return false;
		});

//		shortcuts.add('tab', 'shift', Scope.FolderList, () => {
		shortcuts.add('escape,tab,arrowright', '', Scope.FolderList, () => {
			AppUserStore.focusedState(Scope.MessageList);
			moveAction(false);
			return false;
		});

		AppUserStore.focusedState.subscribe(value => {
			let el = qs('.b-folders li a.focused');
			el && el.classList.remove('focused');
			if (Scope.FolderList === value) {
				el = qs('.b-folders li a.selected');
				el && el.classList.add('focused');
			}
		});
	}

	scrollToFocused() {
		const scrollable = this.oContentScrollable;
		if (scrollable) {
			let block, focused = scrollable.querySelector('li a.focused');
			if (focused) {
				const fRect = focused.getBoundingClientRect(),
					sRect = scrollable.getBoundingClientRect();
				if (fRect.top < sRect.top) {
					block = 'start';
				} else if (fRect.bottom > sRect.bottom) {
					block = 'end';
				}
				block && focused.scrollIntoView(block === 'start');
			}
		}
	}

	composeClick() {
		showMessageComposer();
	}

	createFolder() {
		showScreenPopup(FolderCreatePopupView);
	}

	configureFolders() {
		rl.route.setHash(settings('folders'));
	}

	contactsClick() {
		if (this.allowContacts) {
			showScreenPopup(ContactsPopupView);
		}
	}
}
