import ko from 'ko';

import { ScopeFolderList, ScopeMessageList } from 'Common/Enums';
import { addShortcut, leftPanelDisabled, stopEvent } from 'Common/Globals';
import { mailBox, settings } from 'Common/Links';
//import { setFolderETag } from 'Common/Cache';
import { addComputablesTo } from 'External/ko';

import { AppUserStore } from 'Stores/User/App';
import { SettingsUserStore } from 'Stores/User/Settings';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessageUserStore } from 'Stores/User/Message';
import { MessagelistUserStore } from 'Stores/User/Messagelist';

import { showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewLeft } from 'Knoin/AbstractViews';

import { showMessageComposer, moveAction } from 'Common/UtilsUser';
import { FolderCreatePopupView } from 'View/Popup/FolderCreate';
import { ContactsPopupView } from 'View/Popup/Contacts';
import { ComposePopupView } from 'View/Popup/Compose';

import { setExpandedFolder, foldersFilter } from 'Model/FolderCollection';
import { ThemeStore } from '../../../Stores/Theme';

export class MailFolderList extends AbstractViewLeft {
	constructor() {
		super();

//		this.oContentScrollable = null;

		this.composeInEdit = ComposePopupView.inEdit;

		this.systemFolders = FolderUserStore.systemFolders;

		this.moveAction = moveAction;

		this.allowContacts = AppUserStore.allowContacts();

		this.foldersFilter = foldersFilter;

		addComputablesTo(this, {
			foldersFilterVisible: () => 20 < FolderUserStore.folderList().CountRec,

			folderListVisible: () => {
				let result = FolderUserStore.folderList().filter(folder => folder.visible());
				// https://github.com/the-djmaze/snappymail/issues/1427
//				result.sort((a, b) => a.unreadEmails ? (b.unreadEmails ? 0 : -1) : (b.unreadEmails ? 1 : 0));
				return 1 === result.length && result[0].isInbox() ? result[0].subFolders() : result;
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
					stopEvent(event);
					return;
				}
			}

			el = eqs(event, 'a');
			if (el?.matches('.selectable')) {
				event.preventDefault();
				const folder = ko.dataFor(el);
				if (folder) {
					if (moveAction()) {
						moveAction(false);
						let messages = MessagelistUserStore.listCheckedOrSelectedUidsWithSubMails();
						messages.size && MessagelistUserStore.moveMessages(
							messages.folder,
							messages,
							folder.fullName,
							event.ctrlKey
						);
					} else {
						if (!SettingsUserStore.usePreviewPane()) {
							MessageUserStore.message(null);
						}
/*
						if (folder.fullName === FolderUserStore.currentFolderFullName()) {
							setFolderETag(folder.fullName, '');
						}
*/
						let search = '';
						if (event.target.matches('.flag-icon') && !folder.isFlagged()) {
							search = 'flagged';
						} else if (folder.unreadCount() && event.clientX > el.getBoundingClientRect().right - 25) {
							search = 'unseen';
						}
						hasher.setHash(mailBox(folder.fullNameHash, 1, search));

						// in mobile mode hide the panel when a folder is clicked
						ThemeStore.isMobile() && leftPanelDisabled(true);
					}

					AppUserStore.focusedState(ScopeMessageList);
				}
			}
		});

		addShortcut('arrowup,arrowdown', '', ScopeFolderList, event => {
			let items = [], index = 0;
			dom.querySelectorAll('li a').forEach(node => {
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

		addShortcut('enter,open', '', ScopeFolderList, () => {
			const item = qs('li a.focused');
			if (item) {
				AppUserStore.focusedState(ScopeMessageList);
				item.click();
			}

			return false;
		});

		addShortcut('space', '', ScopeFolderList, () => {
			const item = qs('li a.focused'),
				folder = item && ko.dataFor(item);
			if (folder) {
				const collapsed = folder.collapsed();
				setExpandedFolder(folder.fullName, collapsed);
				folder.collapsed(!collapsed);
			}

			return false;
		});

//		addShortcut('tab', 'shift', ScopeFolderList, () => {
		addShortcut('escape,tab,arrowright', '', ScopeFolderList, () => {
			AppUserStore.focusedState(ScopeMessageList);
			moveAction(false);
			return false;
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

	clearFolderSearch() {
		foldersFilter('');
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
