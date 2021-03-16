import { Scope } from 'Common/Enums';
import { doc, leftPanelDisabled, moveAction, Settings } from 'Common/Globals';
import { pString, pInt } from 'Common/Utils';
import { getFolderFromCacheList, getFolderFullNameRaw, getFolderInboxName } from 'Common/Cache';
import { i18n } from 'Common/Translator';

import { AppUserStore } from 'Stores/User/App';
import { AccountUserStore } from 'Stores/User/Account';
import { SettingsUserStore } from 'Stores/User/Settings';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessageUserStore } from 'Stores/User/Message';
import { ThemeStore } from 'Stores/Theme';

import { SystemDropDownMailBoxUserView } from 'View/User/MailBox/SystemDropDown';
import { FolderListMailBoxUserView } from 'View/User/MailBox/FolderList';
import { MessageListMailBoxUserView } from 'View/User/MailBox/MessageList';
import { MessageViewMailBoxUserView } from 'View/User/MailBox/MessageView';

import { warmUpScreenPopup } from 'Knoin/Knoin';

import { AbstractScreen } from 'Knoin/AbstractScreen';

import { ComposePopupView } from 'View/Popup/Compose';

export class MailBoxUserScreen extends AbstractScreen {
	constructor() {
		super('mailbox', [
			SystemDropDownMailBoxUserView,
			FolderListMailBoxUserView,
			MessageListMailBoxUserView,
			MessageViewMailBoxUserView
		]);
	}

	/**
	 * @returns {void}
	 */
	updateWindowTitle() {
		const count = Settings.app('listPermanentFiltered') ? 0 : FolderUserStore.foldersInboxUnreadCount(),
			email = AccountUserStore.email();

		rl.setWindowTitle(
			(email
				? '' + (0 < count ? '(' + count + ') ' : ' ') + email + ' - '
				: ''
			) + i18n('TITLES/MAILBOX')
		);
	}

	/**
	 * @returns {void}
	 */
	onShow() {
		this.updateWindowTitle();

		AppUserStore.focusedState(Scope.None);
		AppUserStore.focusedState(Scope.MessageList);

		ThemeStore.isMobile() && leftPanelDisabled(true);
	}

	/**
	 * @param {string} folderHash
	 * @param {number} page
	 * @param {string} search
	 * @returns {void}
	 */
	onRoute(folderHash, page, search) {
		const folder = getFolderFromCacheList(getFolderFullNameRaw(folderHash.replace(/~([\d]+)$/, '')));
		if (folder) {
			let threadUid = folderHash.replace(/^.+~([\d]+)$/, '$1');
			if (folderHash === threadUid) {
				threadUid = '';
			}

			FolderUserStore.currentFolder(folder);

			MessageUserStore.listPage(page);
			MessageUserStore.listSearch(search);
			MessageUserStore.listThreadUid(threadUid);

			rl.app.reloadMessageList();
		}
	}

	/**
	 * @returns {void}
	 */
	onStart() {
		if (!this.__started) {
			super.onStart();
			setTimeout(() => SettingsUserStore.layout.valueHasMutated(), 50);
			setTimeout(() => warmUpScreenPopup(ComposePopupView), 500);

			addEventListener('mailbox.inbox-unread-count', e => {
				FolderUserStore.foldersInboxUnreadCount(e.detail);

				const email = AccountUserStore.email();
				AccountUserStore.accounts.forEach(item =>
					item && email === item.email && item.count(e.detail)
				);

				this.updateWindowTitle();
			});
		}
	}

	/**
	 * @returns {void}
	 */
	onBuild() {
		setTimeout(() => rl.app.initHorizontalLayoutResizer(), 1);

		doc.addEventListener('click', event =>
			event.target.closest('#rl-right') && moveAction(false)
		);
	}

	/**
	 * @returns {Array}
	 */
	routes() {
		const
			fNormS = (request, vals) => {
				if (request) {
					vals[0] = decodeURI(pString(vals[0]));
					vals[1] = pInt(vals[1]);
				} else {
					vals[0] = getFolderInboxName();
					vals[1] = 1;
				}
				return [vals[0], 1 > vals[1] ? 1 : vals[1], decodeURI(pString(vals[2]))];
			},
			fNormD = (request, vals) =>
				[decodeURI(request ? pString(vals[0]) : getFolderInboxName()), 1, decodeURI(pString(vals[1]))];

		return [
			[/^([^/]*)$/, { 'normalize_': fNormS }],
			[/^([a-zA-Z0-9~]+)\/(.+)\/?$/, { 'normalize_': fNormD }],
			[/^([a-zA-Z0-9~]+)\/p([1-9][0-9]*)(?:\/(.+)\/?)?$/, { 'normalize_': fNormS }]
		];
	}
}
