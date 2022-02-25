import 'External/User/ko';

import { isArray, pString } from 'Common/Utils';
import { mailToHelper, setLayoutResizer } from 'Common/UtilsUser';

import {
	FolderType,
	SetSystemFoldersNotification,
	ClientSideKeyName
} from 'Common/EnumsUser';

import {
	doc,
	elementById,
	$htmlCL,
	Settings,
	SettingsGet,
	leftPanelDisabled,
	addEventsListener
} from 'Common/Globals';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';

import {
	MessageFlagsCache,
	setFolderHash,
	getFolderHash,
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
import { ThemeStore } from 'Stores/Theme';

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
	folderInformationMultiply,
	refreshFoldersInterval,
	messagesMoveHelper,
	messagesDeleteHelper,
	fetchFolderInformation
} from 'Common/Folders';
import { loadFolders } from 'Model/FolderCollection';

class AppUser extends AbstractApp {
	constructor() {
		super(Remote);

		// wakeUp
		const interval = 3600000; // 60m
		let lastTime = Date.now();
		setInterval(() => {
			const currentTime = Date.now();
			if (currentTime > (lastTime + interval + 1000)) {
				Remote.request('Version',
					iError => (100 < iError) && this.reload(),
					{ Version: Settings.app('version') }
				);
			}
			lastTime = currentTime;
		}, interval);

		const fn = (ev=>$htmlCL.toggle('rl-ctrl-key-pressed', ev.ctrlKey)).debounce(500);
		addEventsListener(doc, ['keydown','keyup'], fn);

		shortcuts.add('escape,enter', '', () => rl.Dropdowns.detectVisibility());
	}

	reload() {
		(Settings.app('inIframe') ? parent : window).location.reload();
	}

	/**
	 * @param {number} iDeleteType
	 * @param {string} sFromFolderFullName
	 * @param {Array} aUidForRemove
	 * @param {boolean=} bUseFolder = true
	 */
	deleteMessagesFromFolder(iDeleteType, sFromFolderFullName, aUidForRemove, bUseFolder) {
		let oMoveFolder = null,
			nSetSystemFoldersNotification = null;

		switch (iDeleteType) {
			case FolderType.Spam:
				oMoveFolder = getFolderFromCacheList(FolderUserStore.spamFolder());
				nSetSystemFoldersNotification = SetSystemFoldersNotification.Spam;
				break;
			case FolderType.NotSpam:
				oMoveFolder = getFolderFromCacheList(getFolderInboxName());
				break;
			case FolderType.Trash:
				oMoveFolder = getFolderFromCacheList(FolderUserStore.trashFolder());
				nSetSystemFoldersNotification = SetSystemFoldersNotification.Trash;
				break;
			case FolderType.Archive:
				oMoveFolder = getFolderFromCacheList(FolderUserStore.archiveFolder());
				nSetSystemFoldersNotification = SetSystemFoldersNotification.Archive;
				break;
			// no default
		}

		bUseFolder = undefined === bUseFolder ? true : !!bUseFolder;
		if (bUseFolder) {
			if (
				(FolderType.Spam === iDeleteType && UNUSED_OPTION_VALUE === FolderUserStore.spamFolder()) ||
				(FolderType.Trash === iDeleteType && UNUSED_OPTION_VALUE === FolderUserStore.trashFolder()) ||
				(FolderType.Archive === iDeleteType && UNUSED_OPTION_VALUE === FolderUserStore.archiveFolder())
			) {
				bUseFolder = false;
			}
		}

		if (!oMoveFolder && bUseFolder) {
			showScreenPopup(FolderSystemPopupView, [nSetSystemFoldersNotification]);
		} else if (
			!bUseFolder ||
			(FolderType.Trash === iDeleteType &&
				(sFromFolderFullName === FolderUserStore.spamFolder()
				 || sFromFolderFullName === FolderUserStore.trashFolder()))
		) {
			showScreenPopup(AskPopupView, [
				i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'),
				() => {
					messagesDeleteHelper(sFromFolderFullName, aUidForRemove);
					MessagelistUserStore.removeMessagesFromList(sFromFolderFullName, aUidForRemove);
				}
			]);
		} else if (oMoveFolder) {
			messagesMoveHelper(sFromFolderFullName, oMoveFolder.fullName, aUidForRemove);
			MessagelistUserStore.removeMessagesFromList(sFromFolderFullName, aUidForRemove, oMoveFolder.fullName);
		}
	}

	accountsAndIdentities() {
		AccountUserStore.loading(true);
		IdentityUserStore.loading(true);

		Remote.request('AccountsAndIdentities', (iError, oData) => {
			AccountUserStore.loading(false);
			IdentityUserStore.loading(false);

			if (!iError) {
				const
//					counts = {},
					accounts = oData.Result.Accounts,
					mainEmail = SettingsGet('MainEmail');

				if (isArray(accounts)) {
//					AccountUserStore.accounts.forEach(oAccount => counts[oAccount.email] = oAccount.count());

					AccountUserStore.accounts(
						accounts.map(
							sValue => new AccountModel(sValue/*, counts[sValue]*/)
						)
					);
//					accounts.length &&
					AccountUserStore.accounts.unshift(new AccountModel(mainEmail/*, counts[mainEmail]*/, false));
				}

				if (isArray(oData.Result.Identities)) {
					IdentityUserStore(
						oData.Result.Identities.map(identityData => {
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
					);
				}
			}
		});
	}

	/**
	 * @param {string} folder
	 * @param {Array=} list = []
	 */
	folderInformation(folder, list) {
		if (folder && folder.trim()) {
			fetchFolderInformation(
				(iError, data) => {
					if (!iError && data.Result) {
						const result = data.Result,
							hash = getFolderHash(result.Folder),
							folderFromCache = getFolderFromCacheList(result.Folder);
						if (folderFromCache) {
							folderFromCache.expires = Date.now();

							setFolderHash(result.Folder, result.Hash);

							folderFromCache.messageCountAll(result.MessageCount);

							let unreadCountChange = (folderFromCache.messageCountUnread() !== result.MessageUnseenCount);

							folderFromCache.messageCountUnread(result.MessageUnseenCount);

							if (unreadCountChange) {
								MessageFlagsCache.clearFolder(folderFromCache.fullName);
							}

							if (result.Flags.length) {
								result.Flags.forEach(message =>
									MessageFlagsCache.setFor(folderFromCache.fullName, message.Uid.toString(), message.Flags)
								);

								MessagelistUserStore.reloadFlagsAndCachedMessage();
							}

							MessagelistUserStore.initUidNextAndNewMessages(
								folderFromCache.fullName,
								result.UidNext,
								result.NewMessages
							);

							if (!hash || unreadCountChange || result.Hash !== hash) {
								if (folderFromCache.fullName === FolderUserStore.currentFolderFullName()) {
									MessagelistUserStore.reload();
								} else if (getFolderInboxName() === folderFromCache.fullName) {
									Remote.messageList(null, {Folder: getFolderInboxName()}, true);
								}
							}
						}
					}
				},
				folder,
				list
			);
		}
	}

	logout() {
		Remote.request('Logout', () => rl.logoutReload());
	}

	bootstart() {
		super.bootstart();

		addEventListener('resize', () => leftPanelDisabled(ThemeStore.isMobile() || 1000 > innerWidth));
		addEventListener('beforeunload', event => {
			if (arePopupsVisible()) {
				event.preventDefault();
				return event.returnValue = "Are you sure you want to exit?";
			}
		}, {capture: true});
	}

	start() {
		if (SettingsGet('Auth')) {
			rl.setWindowTitle(i18n('GLOBAL/LOADING'));

			NotificationUserStore.enableSoundNotification(!!SettingsGet('SoundNotification'));
			NotificationUserStore.enableDesktopNotification(!!SettingsGet('DesktopNotifications'));

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
							this.folderInformation(iF);
							if (iF !== cF) {
								this.folderInformation(cF);
							}
							folderInformationMultiply();
						}, refreshFoldersInterval);

						ContactUserStore.init();

						this.accountsAndIdentities();

						setTimeout(() => {
							const cF = FolderUserStore.currentFolderFullName();
							if (getFolderInboxName() !== cF) {
								this.folderInformation(cF);
							}
							FolderUserStore.hasCapability('LIST-STATUS') || folderInformationMultiply(true);
						}, 1000);

						setTimeout(() => Remote.request('AppDelayStart'), 35000);

						// When auto-login is active
						if (
							SettingsGet('AccountSignMe') &&
							navigator.registerProtocolHandler
						) {
							setTimeout(() => {
								try {
									navigator.registerProtocolHandler(
										'mailto',
										location.protocol + '//' + location.host + location.pathname + '?mailto&to=%s',
										(SettingsGet('Title') || 'SnappyMail')
									);
								} catch (e) {} // eslint-disable-line no-empty

								value = SettingsGet('MailToEmail');
								value && mailToHelper(value);
							}, 500);
						}

						// add pointermove ?
						addEventsListener(doc, ['touchstart','mousemove','keydown'], SettingsUserStore.delayLogout, {passive:true});
						SettingsUserStore.delayLogout();

						// initLeftSideLayoutResizer
						setTimeout(() => {
							const left = elementById('rl-left'),
								right = elementById('rl-right'),
								fToggle = () =>
									setLayoutResizer(left, right, ClientSideKeyName.FolderListSize,
										(ThemeStore.isMobile() || leftPanelDisabled()) ? 0 : 'Width');
							if (left && right) {
								fToggle();
								leftPanelDisabled.subscribe(fToggle);
							}
						}, 1);

						setInterval(reloadTime(), 60000);

						PgpUserStore.init();
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

export default new AppUser();
