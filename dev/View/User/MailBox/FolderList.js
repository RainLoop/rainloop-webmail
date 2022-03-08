import ko from 'ko';

import { Scope } from 'Common/Enums';
import { moveAction } from 'Common/Globals';
import { mailBox, settings } from 'Common/Links';
import { setFolderHash } from 'Common/Cache';
import { addComputablesTo } from 'External/ko';

import { AppUserStore } from 'Stores/User/App';
import { SettingsUserStore } from 'Stores/User/Settings';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessageUserStore } from 'Stores/User/Message';
import { MessagelistUserStore } from 'Stores/User/Messagelist';

import { showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewLeft } from 'Knoin/AbstractViews';

import { showMessageComposer } from 'Common/UtilsUser';
import { FolderCreatePopupView } from 'View/Popup/FolderCreate';
import { ContactsPopupView } from 'View/Popup/Contacts';

import { moveMessagesToFolder } from 'Common/Folders';

import { setExpandedFolder } from 'Model/FolderCollection';

export class MailFolderList extends AbstractViewLeft {
	constructor() {
		super();

		this.oContentScrollable = null;

		this.composeInEdit = AppUserStore.composeInEdit;

		this.folderList = FolderUserStore.folderList;
		this.folderListSystem = FolderUserStore.folderListSystem;
		this.foldersChanging = FolderUserStore.foldersChanging;

		this.moveAction = moveAction;

		this.foldersListWithSingleInboxRootFolder = ko.observable(false);

		this.allowContacts = AppUserStore.allowContacts();

		addComputablesTo(this, {
			folderListVisible: () => {
				let multiple = false,
					inbox, visible,
					result = FolderUserStore.folderList().filter(folder => {
						if (folder.isInbox()) {
							inbox = folder;
						}
						visible = folder.visible();
						multiple |= visible && !folder.isInbox();
						return visible;
					});
				if (inbox && !multiple) {
					inbox.collapsed(false);
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
					setExpandedFolder(folder.fullName, collapsed);

					folder.collapsed(!collapsed);
					event.preventDefault();
					event.stopPropagation();
					return;
				}
			}

			el = eqs(event, 'a');
			if (el && el.matches('.selectable')) {
				event.preventDefault();
				const folder = ko.dataFor(el);
				if (folder) {
					if (moveAction()) {
						moveAction(false);
						moveMessagesToFolder(
							FolderUserStore.currentFolderFullName(),
							MessagelistUserStore.listCheckedOrSelectedUidsWithSubMails(),
							folder.fullName,
							event.ctrlKey
						);
					} else {
						if (!SettingsUserStore.usePreviewPane()) {
							MessageUserStore.message(null);
						}

						if (folder.fullName === FolderUserStore.currentFolderFullName()) {
							setFolderHash(folder.fullName, '');
						}

						hasher.setHash(
							mailBox(folder.fullNameHash, 1,
								(event.target.matches('.flag-icon') && !folder.isFlagged()) ? 'flagged' : ''
							)
						);
					}

					AppUserStore.focusedState(Scope.MessageList);
				}
			}
		});

		shortcuts.add('arrowup,arrowdown', '', Scope.FolderList, event => {
			let items = [], index = 0;
			dom.querySelectorAll('li a:not(.hidden)').forEach(node => {
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
			const item = qs('li a:not(.hidden).focused');
			if (item) {
				AppUserStore.focusedState(Scope.MessageList);
				item.click();
			}

			return false;
		});

		shortcuts.add('space', '', Scope.FolderList, () => {
			const item = qs('li a:not(.hidden).focused'),
				folder = item && ko.dataFor(item);
			if (folder) {
				const collapsed = folder.collapsed();
				setExpandedFolder(folder.fullName, collapsed);
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
			let el = qs('li a.focused');
			el && el.classList.remove('focused');
			if (Scope.FolderList === value) {
				el = qs('li a.selected');
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
		hasher.setHash(settings('folders'));
	}

	contactsClick() {
		if (this.allowContacts) {
			showScreenPopup(ContactsPopupView);
		}
	}
}
