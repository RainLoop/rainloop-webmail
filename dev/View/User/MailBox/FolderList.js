import window from 'window';
import $ from '$';
import ko from 'ko';
import key from 'key';

import { trim, isNormal, isArray, windowResize } from 'Common/Utils';
import { Capa, Focused, Layout, KeyState, EventKeyCode, Magics } from 'Common/Enums';
import { $html, leftPanelDisabled, moveAction } from 'Common/Globals';
import { mailBox, settings } from 'Common/Links';
import { setFolderHash } from 'Common/Cache';

import AppStore from 'Stores/User/App';
import SettingsStore from 'Stores/User/Settings';
import FolderStore from 'Stores/User/Folder';
import MessageStore from 'Stores/User/Message';

import * as Settings from 'Storage/Settings';

import { getApp } from 'Helper/Apps/User';

import { view, ViewType, showScreenPopup, setHash } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@view({
	name: 'View/User/MailBox/FolderList',
	type: ViewType.Left,
	templateID: 'MailFolderList'
})
class FolderListMailBoxUserView extends AbstractViewNext {
	constructor() {
		super();

		this.oContentVisible = null;
		this.oContentScrollable = null;

		this.composeInEdit = AppStore.composeInEdit;

		this.messageList = MessageStore.messageList;
		this.folderList = FolderStore.folderList;
		this.folderListSystem = FolderStore.folderListSystem;
		this.foldersChanging = FolderStore.foldersChanging;

		this.moveAction = moveAction;

		this.foldersListWithSingleInboxRootFolder = FolderStore.foldersListWithSingleInboxRootFolder;

		this.leftPanelDisabled = leftPanelDisabled;

		this.iDropOverTimer = 0;

		this.allowComposer = !!Settings.capa(Capa.Composer);
		this.allowContacts = !!AppStore.contactsIsAllowed();
		this.allowFolders = !!Settings.capa(Capa.Folders);

		this.folderListFocused = ko.computed(() => Focused.FolderList === AppStore.focusedState());

		this.isInboxStarred = ko.computed(
			() =>
				FolderStore.currentFolder() &&
				FolderStore.currentFolder().isInbox() &&
				-1 < trim(MessageStore.messageListSearch()).indexOf('is:flagged')
		);
	}

	onBuild(dom) {
		this.oContentVisible = $('.b-content', dom);
		this.oContentScrollable = $('.content', this.oContentVisible);

		const self = this,
			isMobile = Settings.appSettingsGet('mobile'),
			fSelectFolder = (el, event, starred) => {
				const isMove = moveAction();
				if (isMobile) {
					leftPanelDisabled(true);
				}

				event.preventDefault();

				if (starred) {
					event.stopPropagation();
				}

				const folder = ko.dataFor(el);
				if (folder) {
					if (isMove) {
						moveAction(false);
						getApp().moveMessagesToFolder(
							FolderStore.currentFolderFullNameRaw(),
							MessageStore.messageListCheckedOrSelectedUidsWithSubMails(),
							folder.fullNameRaw,
							false
						);
					} else {
						if (Layout.NoPreview === SettingsStore.layout()) {
							MessageStore.message(null);
						}

						if (folder.fullNameRaw === FolderStore.currentFolderFullNameRaw()) {
							setFolderHash(folder.fullNameRaw, '');
						}

						if (starred) {
							setHash(mailBox(folder.fullNameHash, 1, 'is:flagged'));
						} else {
							setHash(mailBox(folder.fullNameHash));
						}
					}

					AppStore.focusedState(Focused.MessageList);
				}
			};

		dom
			.on('click', '.b-folders .e-item .e-link .e-collapsed-sign', function(event) {
				// eslint-disable-line prefer-arrow-callback
				const folder = ko.dataFor(this); // eslint-disable-line no-invalid-this
				if (folder && event) {
					const collapsed = folder.collapsed();
					getApp().setExpandedFolder(folder.fullNameHash, collapsed);

					folder.collapsed(!collapsed);
					event.preventDefault();
					event.stopPropagation();
				}
			})
			.on('click', '.b-folders .e-item .e-link.selectable .inbox-star-icon', function(event) {
				// eslint-disable-line prefer-arrow-callback
				fSelectFolder(this, event, !self.isInboxStarred()); // eslint-disable-line no-invalid-this
			})
			.on('click', '.b-folders .e-item .e-link.selectable', function(event) {
				// eslint-disable-line prefer-arrow-callback
				fSelectFolder(this, event, false); // eslint-disable-line no-invalid-this
			});

		key('up, down', KeyState.FolderList, (event, handler) => {
			const keyCode = handler && 'up' === handler.shortcut ? EventKeyCode.Up : EventKeyCode.Down,
				$items = $('.b-folders .e-item .e-link:not(.hidden):visible', dom);

			if (event && $items.length) {
				let index = $items.index($items.filter('.focused'));
				if (-1 < index) {
					$items.eq(index).removeClass('focused');
				}

				if (EventKeyCode.Up === keyCode && 0 < index) {
					index -= 1;
				} else if (EventKeyCode.Down === keyCode && index < $items.length - 1) {
					index += 1;
				}

				$items.eq(index).addClass('focused');
				self.scrollToFocused();
			}

			return false;
		});

		key('enter', KeyState.FolderList, () => {
			const $items = $('.b-folders .e-item .e-link:not(.hidden).focused', dom);
			if ($items.length && $items[0]) {
				AppStore.focusedState(Focused.MessageList);
				$items.click();
			}

			return false;
		});

		key('space', KeyState.FolderList, () => {
			const $items = $('.b-folders .e-item .e-link:not(.hidden).focused', dom);
			if ($items.length && $items[0]) {
				const folder = ko.dataFor($items[0]);
				if (folder) {
					const collapsed = folder.collapsed();
					getApp().setExpandedFolder(folder.fullNameHash, collapsed);
					folder.collapsed(!collapsed);
				}
			}

			return false;
		});

		key('esc, tab, shift+tab, right', KeyState.FolderList, () => {
			AppStore.focusedState(Focused.MessageList);
			moveAction(false);
			return false;
		});

		AppStore.focusedState.subscribe((value) => {
			$('.b-folders .e-item .e-link.focused', dom).removeClass('focused');
			if (Focused.FolderList === value) {
				$('.b-folders .e-item .e-link.selected', dom).addClass('focused');
			}
		});
	}

	messagesDropOver(folder) {
		window.clearTimeout(this.iDropOverTimer);
		if (folder && folder.collapsed()) {
			this.iDropOverTimer = window.setTimeout(() => {
				folder.collapsed(false);
				getApp().setExpandedFolder(folder.fullNameHash, true);
				windowResize();
			}, Magics.Time500ms);
		}
	}

	messagesDropOut() {
		window.clearTimeout(this.iDropOverTimer);
	}

	scrollToFocused() {
		if (!this.oContentVisible || !this.oContentScrollable) {
			return false;
		}

		const offset = 20,
			focused = $('.e-item .e-link.focused', this.oContentScrollable),
			pos = focused.position(),
			visibleHeight = this.oContentVisible.height(),
			focusedHeight = focused.outerHeight();

		if (pos && (0 > pos.top || pos.top + focusedHeight > visibleHeight)) {
			if (0 > pos.top) {
				this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + pos.top - offset);
			} else {
				this.oContentScrollable.scrollTop(
					this.oContentScrollable.scrollTop() + pos.top - visibleHeight + focusedHeight + offset
				);
			}

			return true;
		}

		return false;
	}

	/**
	 * @param {FolderModel} toFolder
	 * @param {{helper:jQuery}} ui
	 * @returns {void}
	 */
	messagesDrop(toFolder, ui) {
		if (toFolder && ui && ui.helper) {
			const fromFolderFullNameRaw = ui.helper.data('rl-folder'),
				copy = $html.hasClass('rl-ctrl-key-pressed'),
				uids = ui.helper.data('rl-uids');

			if (isNormal(fromFolderFullNameRaw) && '' !== fromFolderFullNameRaw && isArray(uids)) {
				getApp().moveMessagesToFolder(fromFolderFullNameRaw, uids, toFolder.fullNameRaw, copy);
			}
		}
	}

	composeClick() {
		if (Settings.capa(Capa.Composer)) {
			showScreenPopup(require('View/Popup/Compose'));
		}
	}

	createFolder() {
		showScreenPopup(require('View/Popup/FolderCreate'));
	}

	configureFolders() {
		setHash(settings('folders'));
	}

	contactsClick() {
		if (this.allowContacts) {
			showScreenPopup(require('View/Popup/Contacts'));
		}
	}
}

export { FolderListMailBoxUserView, FolderListMailBoxUserView as default };
