import ko from 'ko';

import { Capa, Scope } from 'Common/Enums';
import { leftPanelDisabled, moveAction, Settings } from 'Common/Globals';
import { mailBox, settings } from 'Common/Links';
import { setFolderHash } from 'Common/Cache';

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

export class FolderListMailBoxUserView extends AbstractViewLeft {
	constructor() {
		super('User/MailBox/FolderList', 'MailFolderList');

		this.oContentScrollable = null;

		this.composeInEdit = AppUserStore.composeInEdit;

		this.folderList = FolderUserStore.folderList;
		this.folderListSystem = FolderUserStore.folderListSystem;
		this.foldersChanging = FolderUserStore.foldersChanging;

		this.moveAction = moveAction;

		this.foldersListWithSingleInboxRootFolder = FolderUserStore.foldersListWithSingleInboxRootFolder;

		this.leftPanelDisabled = leftPanelDisabled;

		this.allowComposer = Settings.capa(Capa.Composer);
		this.allowContacts = AppUserStore.allowContacts();

		this.folderListFocused = ko.computed(() => Scope.FolderList === AppUserStore.focusedState());

		this.isInboxStarred = ko.computed(
			() =>
				FolderUserStore.currentFolder() &&
				FolderUserStore.currentFolder().isInbox() &&
				MessageUserStore.listSearch().trim().includes('is:flagged')
		);
	}

	onBuild(dom) {
		const qs = s => dom.querySelector(s),
			eqs = (ev, s) => ev.target.closestWithin(s, dom),
			fSelectFolder = (el, event, starred) => {
				const isMove = moveAction();
				ThemeStore.isMobile() && leftPanelDisabled(true);

				event.preventDefault();

				if (starred) {
					event.stopPropagation();
				}

				const folder = ko.dataFor(el);
				if (folder) {
					if (isMove) {
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

						rl.route.setHash(starred
							? mailBox(folder.fullNameHash, 1, 'is:flagged')
							: mailBox(folder.fullNameHash)
						);
					}

					AppUserStore.focusedState(Scope.MessageList);
				}
			};

		this.oContentScrollable = qs('.b-content');

		dom.addEventListener('click', event => {
			let el = event.target.closest('.e-collapsed-sign');
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

			el = eqs(event, '.b-folders .e-item a.selectable .inbox-star-icon');
			el && fSelectFolder(el, event, !this.isInboxStarred());

			el = eqs(event, '.b-folders .e-item a.selectable');
			el && fSelectFolder(el, event, false);
		});

		shortcuts.add('arrowup,arrowdown', '', Scope.FolderList, event => {
			let items = [], index = 0;
			dom.querySelectorAll('.b-folders .e-item a:not(.hidden)').forEach(node => {
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
			const item = qs('.b-folders .e-item a:not(.hidden).focused');
			if (item) {
				AppUserStore.focusedState(Scope.MessageList);
				item.click();
			}

			return false;
		});

		shortcuts.add('space', '', Scope.FolderList, () => {
			const item = qs('.b-folders .e-item a:not(.hidden).focused'),
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
			let el = qs('.b-folders .e-item a.focused');
			el && qs('.b-folders .e-item a.focused').classList.remove('focused');
			if (Scope.FolderList === value) {
				el = qs('.b-folders .e-item a.selected');
				el && qs('.b-folders .e-item a.selected').classList.add('focused');
			}
		});
	}

	scrollToFocused() {
		const scrollable = this.oContentScrollable;
		if (scrollable) {
			let block, focused = scrollable.querySelector('.e-item a.focused');
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
