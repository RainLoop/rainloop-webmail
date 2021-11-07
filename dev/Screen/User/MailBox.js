import { Scope } from 'Common/Enums';
import { Layout, ClientSideKeyName } from 'Common/EnumsUser';
import { doc, leftPanelDisabled, moveAction, Settings, elementById } from 'Common/Globals';
import { pString, pInt } from 'Common/Utils';
import { setLayoutResizer } from 'Common/UtilsUser';
import { getFolderFromCacheList, getFolderFullNameRaw, getFolderInboxName } from 'Common/Cache';
import { i18n } from 'Common/Translator';
import { SettingsUserStore } from 'Stores/User/Settings';

import { AppUserStore } from 'Stores/User/App';
import { AccountUserStore } from 'Stores/User/Account';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessageUserStore } from 'Stores/User/Message';
import { ThemeStore } from 'Stores/Theme';

import { SystemDropDownUserView } from 'View/User/SystemDropDown';
import { MailFolderList } from 'View/User/MailBox/FolderList';
import { MailMessageList } from 'View/User/MailBox/MessageList';
import { MailMessageView } from 'View/User/MailBox/MessageView';

import { AbstractScreen } from 'Knoin/AbstractScreen';

export class MailBoxUserScreen extends AbstractScreen {
	constructor() {
		super('mailbox', [
			SystemDropDownUserView,
			MailFolderList,
			MailMessageList,
			MailMessageView
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
			let threadUid = folderHash.replace(/^.+~(\d+)$/, '$1');

			FolderUserStore.currentFolder(folder);

			MessageUserStore.listPage(1 > page ? 1 : page);
			MessageUserStore.listSearch(search);
			MessageUserStore.listThreadUid((folderHash === threadUid) ? 0 : pInt(threadUid));

			rl.app.reloadMessageList();
		}
	}

	/**
	 * @returns {void}
	 */
	onStart() {
		if (!this.__started) {
			super.onStart();

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
		setTimeout(() => {
			// initMailboxLayoutResizer
			const top = elementById('V-MailMessageList'),
				bottom = elementById('V-MailMessageView'),
				fToggle = () => {
					let layout = SettingsUserStore.layout();
					setLayoutResizer(top, bottom, ClientSideKeyName.MessageListSize,
						(ThemeStore.isMobile() || Layout.NoPreview === layout)
							? 0
							: (Layout.SidePreview === layout ? 'Width' : 'Height')
					);
				};
			if (top && bottom) {
				fToggle();
				addEventListener('rl-layout', fToggle);
			}
		}, 1);

		doc.addEventListener('click', event =>
			event.target.closest('#rl-right') && moveAction(false)
		);
	}

	/**
	 * @returns {Array}
	 */
	routes() {
		const
			folder = (request, vals) => request ? decodeURI(pString(vals[0])) : getFolderInboxName(),
			fNormS = (request, vals) => [folder(request, vals), request ? pInt(vals[1]) : 1, decodeURI(pString(vals[2]))];

		return [
			[/^([^/]*)$/, { normalize_: fNormS }],
			[/^([a-zA-Z0-9~]+)\/(.+)\/?$/, { normalize_: (request, vals) =>
				[folder(request, vals), 1, decodeURI(pString(vals[1]))]
			}],
			[/^([a-zA-Z0-9~]+)\/p([1-9][0-9]*)(?:\/(.+)\/?)?$/, { normalize_: fNormS }]
		];
	}
}
