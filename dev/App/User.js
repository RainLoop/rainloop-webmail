import 'External/User/ko';

import { SMAudio } from 'Common/Audio';
import { isArray, pString } from 'Common/Utils';
import { mailToHelper, setLayoutResizer, dropdownsDetectVisibility } from 'Common/UtilsUser';

import {
	FolderType,
	ClientSideKeyNameFolderListSize
} from 'Common/EnumsUser';

import {
	doc,
	elementById,
	$htmlCL,
	Settings,
	SettingsGet,
	leftPanelDisabled,
	addEventsListener,
	addShortcut
} from 'Common/Globals';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';

import {
	getFolderInboxName,
	getFolderFromCacheList
} from 'Common/Cache';

import { i18n, reloadTime } from 'Common/Translator';

import { SettingsUserStore } from 'Stores/User/Settings';
import { NotificationUserStore } from 'Stores/User/Notification';
import { AccountUserStore } from 'Stores/User/Account';
import { ContactUserStore } from 'Stores/User/Contact';
import { IdentityUserStore } from 'Stores/User/Identity';
import { FolderUserStore } from 'Stores/User/Folder';
import { PgpUserStore } from 'Stores/User/Pgp';
import { MessagelistUserStore } from 'Stores/User/Messagelist';
import { ThemeStore, changeTheme } from 'Stores/Theme';
import { LanguageStore } from 'Stores/Language';
import { MessageUserStore } from 'Stores/User/Message';

import Remote from 'Remote/User/Fetch';

import { AccountModel } from 'Model/Account';
import { IdentityModel } from 'Model/Identity';

import { LoginUserScreen } from 'Screen/User/Login';
import { MailBoxUserScreen } from 'Screen/User/MailBox';
import { SettingsUserScreen } from 'Screen/User/Settings';

import { startScreens, showScreenPopup, arePopupsVisible } from 'Knoin/Knoin';

import { AbstractApp } from 'App/Abstract';

import { ComposePopupView } from 'View/Popup/Compose';
import { FolderSystemPopupView } from 'View/Popup/FolderSystem';
import { AskPopupView } from 'View/Popup/Ask';

import {
	folderInformation,
	folderInformationMultiply,
	refreshFoldersInterval,
	messagesMoveHelper,
	messagesDeleteHelper
} from 'Common/Folders';
import { loadFolders } from 'Model/FolderCollection';

export class AppUser extends AbstractApp {
	constructor() {
		super(Remote);

		// wakeUp
		const interval = 3600000; // 60m
		let lastTime = Date.now();
		setInterval(() => {
			const currentTime = Date.now();
			(currentTime > (lastTime + interval + 1000))
			&& Remote.request('Version',
					iError => (100 < iError) && location.reload(),
					{ Version: Settings.app('version') }
				);
			lastTime = currentTime;
		}, interval);

		addEventsListener(doc, ['keydown','keyup'], (ev=>$htmlCL.toggle('rl-ctrl-key-pressed', ev.ctrlKey)).debounce(500));

		addShortcut('escape,enter', '', dropdownsDetectVisibility);
		addEventListener('click', dropdownsDetectVisibility);

		this.folderList = FolderUserStore.folderList;
	}

	/**
	 * @param {number} iFolderType
	 * @param {string} sFromFolderFullName
	 * @param {Set} oUids
	 * @param {boolean=} bDelete = false
	 */
	moveMessagesToFolderType(iFolderType, sFromFolderFullName, oUids, bDelete) {
		let oMoveFolder = null,
			nSetSystemFoldersNotification = 0;

		switch (iFolderType) {
			case FolderType.Junk:
				oMoveFolder = getFolderFromCacheList(FolderUserStore.spamFolder());
				nSetSystemFoldersNotification = iFolderType;
				bDelete = bDelete || UNUSED_OPTION_VALUE === FolderUserStore.spamFolder();
				break;
			case FolderType.Inbox:
				oMoveFolder = getFolderFromCacheList(getFolderInboxName());
				break;
			case FolderType.Trash:
				oMoveFolder = getFolderFromCacheList(FolderUserStore.trashFolder());
				nSetSystemFoldersNotification = iFolderType;
				bDelete = bDelete || UNUSED_OPTION_VALUE === FolderUserStore.trashFolder()
					|| sFromFolderFullName === FolderUserStore.spamFolder()
					|| sFromFolderFullName === FolderUserStore.trashFolder();
				break;
			case FolderType.Archive:
				oMoveFolder = getFolderFromCacheList(FolderUserStore.archiveFolder());
				nSetSystemFoldersNotification = iFolderType;
				bDelete = bDelete || UNUSED_OPTION_VALUE === FolderUserStore.archiveFolder();
				break;
			// no default
		}

		if (!oMoveFolder && !bDelete) {
			showScreenPopup(FolderSystemPopupView, [nSetSystemFoldersNotification]);
		} else if (bDelete) {
			showScreenPopup(AskPopupView, [
				i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'),
				() => {
					messagesDeleteHelper(sFromFolderFullName, oUids);
					MessagelistUserStore.removeMessagesFromList(sFromFolderFullName, oUids);
				}
			]);
		} else if (oMoveFolder) {
			messagesMoveHelper(sFromFolderFullName, oMoveFolder.fullName, oUids);
			MessagelistUserStore.removeMessagesFromList(sFromFolderFullName, oUids, oMoveFolder.fullName);
		}
	}

	accountsAndIdentities() {
		AccountUserStore.loading(true);
		IdentityUserStore.loading(true);

		Remote.request('AccountsAndIdentities', (iError, oData) => {
			AccountUserStore.loading(false);
			IdentityUserStore.loading(false);

			if (!iError) {
				let items = oData.Result.Accounts;
				AccountUserStore(isArray(items)
					? items.map(oValue => new AccountModel(oValue.email, oValue.name))
					: []
				);
				AccountUserStore.unshift(new AccountModel(SettingsGet('MainEmail'), '', false));

				items = oData.Result.Identities;
				IdentityUserStore(isArray(items)
					? items.map(identityData => {
						const identity = new IdentityModel(
							pString(identityData.Id),
							pString(identityData.Email)
						);
						identity.name(pString(identityData.Name));
						identity.replyTo(pString(identityData.ReplyTo));
						identity.bcc(pString(identityData.Bcc));
						identity.signature(pString(identityData.Signature));
						identity.signatureInsertBefore(!!identityData.SignatureInsertBefore);
						return identity;
					})
					: []
				);
			}
		});
	}

	/**
	 * @param {string} folder
	 * @param {Array=} list = []
	 */
	folderInformation(folder, list) {
		folderInformation(folder, list);
	}

	logout() {
		Remote.request('Logout', () => rl.logoutReload(Settings.app('customLogoutLink')));
	}

	bootstart() {
		super.bootstart();

		addEventListener('resize', () => leftPanelDisabled(ThemeStore.isMobile() || 1000 > innerWidth));
		addEventListener('beforeunload', event => {
			if (arePopupsVisible() || (ThemeStore.isMobile() && MessageUserStore.message())) {
				event.preventDefault();
				return event.returnValue = "Are you sure you want to exit?";
			}
		}, {capture: true});
	}

	refresh() {
		ThemeStore.populate();
		LanguageStore.language(SettingsGet('Language'));
		changeTheme(SettingsGet('Theme'));
		this.start();
	}

	start() {
		if (SettingsGet('Auth')) {
			rl.setTitle(i18n('GLOBAL/LOADING'));

			SMAudio.notifications(!!SettingsGet('SoundNotification'));
			NotificationUserStore.enabled(!!SettingsGet('DesktopNotifications'));

			AccountUserStore.email(SettingsGet('Email'));

			SettingsUserStore.init();
			ContactUserStore.init();

			loadFolders(value => {
				try {
					if (value) {
						startScreens([
							MailBoxUserScreen,
							SettingsUserScreen
						]);

						setInterval(() => {
							const cF = FolderUserStore.currentFolderFullName(),
								iF = getFolderInboxName();
							folderInformation(iF);
							iF === cF || folderInformation(cF);
							folderInformationMultiply();
						}, refreshFoldersInterval);

						ContactUserStore.init();

						this.accountsAndIdentities();

						setTimeout(() => {
							const cF = FolderUserStore.currentFolderFullName();
							getFolderInboxName() === cF || folderInformation(cF);
							FolderUserStore.hasCapability('LIST-STATUS') || folderInformationMultiply(true);
						}, 1000);

						setTimeout(() => Remote.request('AppDelayStart'), 35000);

						// add pointermove ?
						addEventsListener(doc, ['touchstart','mousemove','keydown'], SettingsUserStore.delayLogout, {passive:true});
						SettingsUserStore.delayLogout();

						// initLeftSideLayoutResizer
						setTimeout(() => {
							const left = elementById('rl-left'),
								right = elementById('rl-right'),
								fToggle = () =>
									setLayoutResizer(left, right, ClientSideKeyNameFolderListSize,
										(ThemeStore.isMobile() || leftPanelDisabled()) ? 0 : 'Width');
							if (left && right) {
								fToggle();
								leftPanelDisabled.subscribe(fToggle);
							}
						}, 1);

						setInterval(reloadTime(), 60000);

						PgpUserStore.init();

						// When auto-login is active
						try {
							navigator.registerProtocolHandler?.(
								'mailto',
								location.protocol + '//' + location.host + location.pathname + '?mailto&to=%s',
								(SettingsGet('Title') || 'SnappyMail')
							);
						} catch (e) {} // eslint-disable-line no-empty

						setTimeout(() => mailToHelper(SettingsGet('MailToEmail')), 500);
					} else {
						this.logout();
					}
				} catch (e) {
					console.error(e);
				}
			});

		} else {
			startScreens([LoginUserScreen]);
		}
	}

	showMessageComposer(params = [])
	{
		showScreenPopup(ComposePopupView, params);
	}
}
