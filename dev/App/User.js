import 'External/User/ko';

import { SMAudio } from 'Common/Audio';
import { pInt } from 'Common/Utils';
import { mailToHelper, setLayoutResizer, dropdownsDetectVisibility, loadAccountsAndIdentities } from 'Common/UtilsUser';

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
import { FolderUserStore } from 'Stores/User/Folder';
import { PgpUserStore } from 'Stores/User/Pgp';
import { SMimeUserStore } from 'Stores/User/SMime';
import { MessagelistUserStore } from 'Stores/User/Messagelist';
import { ThemeStore, initThemes } from 'Stores/Theme';
import { LanguageStore } from 'Stores/Language';
import { MessageUserStore } from 'Stores/User/Message';

import Remote from 'Remote/User/Fetch';

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
	setRefreshFoldersInterval
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
					{ version: Settings.app('version') }
				);
			lastTime = currentTime;
		}, interval);

		addEventsListener(doc, ['keydown','keyup'], (ev=>$htmlCL.toggle('rl-ctrl-key-pressed', ev.ctrlKey)).debounce(500));

		addShortcut('escape,enter', '', dropdownsDetectVisibility);
		addEventListener('click', dropdownsDetectVisibility);

		this.folderList = FolderUserStore.folderList;
		this.messageList = MessagelistUserStore;

		this.ask = AskPopupView;
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

		if (bDelete) {
			showScreenPopup(AskPopupView, [
				i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'),
				() => {
					MessagelistUserStore.moveMessages(sFromFolderFullName, oUids);
				}
			]);
		} else if (oMoveFolder) {
			MessagelistUserStore.moveMessages(sFromFolderFullName, oUids, oMoveFolder.fullName);
		} else {
			showScreenPopup(FolderSystemPopupView, [nSetSystemFoldersNotification]);
		}
	}

	/**
	 * @param {string} folder
	 * @param {Array=} list = []
	 */
	folderInformation(folder, list) {
		folderInformation(folder, list);
	}

	logout() {
		localStorage.removeItem('register_protocol_offered');
		Remote.request('Logout', () => rl.logoutReload(Settings.app('customLogoutLink')));
	}

	bootstart() {
		super.bootstart();

		addEventListener('beforeunload', event => {
			if (arePopupsVisible() || (!SettingsUserStore.usePreviewPane() && MessageUserStore.message())) {
				event.preventDefault();
				return event.returnValue = i18n('POPUPS_ASK/EXIT_ARE_YOU_SURE');
			}
		}, {capture: true});
	}

	refresh() {
		initThemes();
		LanguageStore.language(SettingsGet('language'));
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

						setRefreshFoldersInterval(pInt(SettingsGet('CheckMailInterval')));

						loadAccountsAndIdentities();

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
								fToggle = () =>
									setLayoutResizer(left, ClientSideKeyNameFolderListSize,
										(ThemeStore.isMobile() || leftPanelDisabled()) ? 0 : 'Width');
							if (left) {
								fToggle();
								leftPanelDisabled.subscribe(fToggle);
							}
						}, 1);

						setInterval(reloadTime, 60000);

						PgpUserStore.init();
						SMimeUserStore.loadCertificates();

						setTimeout(() => mailToHelper(SettingsGet('mailToEmail')), 500);

						if (!localStorage.getItem('register_protocol_offered')) {
							// When auto-login is active
							navigator.registerProtocolHandler?.(
								'mailto',
								location.protocol + '//' + location.host + location.pathname + '?mailto&to=%s',
								(SettingsGet('title') || 'SnappyMail')
							);
							localStorage.setItem('register_protocol_offered', '1');
						}

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

AskPopupView.password = function(sAskDesc, btnText, ask) {
	return new Promise(resolve => {
		this.showModal([
			sAskDesc,
			view => resolve({password:view.passphrase(), remember:view.remember()}),
			() => resolve(null),
			true,
			ask || 5,
			btnText
		]);
	});
};

AskPopupView.cryptkey = () => new Promise(resolve => {
	const fn = () => AskPopupView.showModal([
		i18n('CRYPTO/ASK_CRYPTKEY_PASS'),
		view => {
			let pass = view.passphrase();
			if (pass) {
				Remote.post('ResealCryptKey', null, {
					passphrase: pass
				}).then(response => {
					resolve(response?.Result);
				}).catch(e => {
					if (111 === e.code) {
						fn();
					} else {
						console.error(e);
						resolve(null);
					}
				});
			} else {
				resolve(null);
			}
		},
		() => resolve(null),
		true,
		1,
		i18n('CRYPTO/DECRYPT')
	]);
	fn();
});
