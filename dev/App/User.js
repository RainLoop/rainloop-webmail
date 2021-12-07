import 'External/User/ko';

import { isArray, arrayLength, pString, forEachObjectValue } from 'Common/Utils';
import { delegateRunOnDestroy, mailToHelper, setLayoutResizer } from 'Common/UtilsUser';

import {
	Capa,
	Notification,
	Scope
} from 'Common/Enums';

import {
	FolderType,
	SetSystemFoldersNotification,
	MessageSetAction,
	ClientSideKeyName
} from 'Common/EnumsUser';

import {
	doc,
	elementById,
	createElement,
	$htmlCL,
	Settings,
	SettingsGet,
	leftPanelDisabled
} from 'Common/Globals';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';

import {
	MessageFlagsCache,
	setFolderHash,
	getFolderHash,
	getFolderInboxName,
	getFolderFromCacheList
} from 'Common/Cache';

import {
	mailBox,
	openPgpWorkerJs,
	openPgpJs
} from 'Common/Links';

import { getNotification, i18n } from 'Common/Translator';

import { SettingsUserStore } from 'Stores/User/Settings';
import { NotificationUserStore } from 'Stores/User/Notification';
import { AccountUserStore } from 'Stores/User/Account';
import { ContactUserStore } from 'Stores/User/Contact';
import { IdentityUserStore } from 'Stores/User/Identity';
import { FolderUserStore } from 'Stores/User/Folder';
import { PgpUserStore } from 'Stores/User/Pgp';
import { MessageUserStore } from 'Stores/User/Message';
import { ThemeStore } from 'Stores/Theme';

import * as Local from 'Storage/Client';

import Remote from 'Remote/User/Fetch';

import { EmailModel } from 'Model/Email';
import { AccountModel } from 'Model/Account';
import { IdentityModel } from 'Model/Identity';
import { OpenPgpKeyModel } from 'Model/OpenPgpKey';

import { LoginUserScreen } from 'Screen/User/Login';
import { MailBoxUserScreen } from 'Screen/User/MailBox';
import { SettingsUserScreen } from 'Screen/User/Settings';

import { startScreens, showScreenPopup, arePopupsVisible } from 'Knoin/Knoin';

import { AbstractApp } from 'App/Abstract';

import { ComposePopupView } from 'View/Popup/Compose';
import { FolderSystemPopupView } from 'View/Popup/FolderSystem';
import { AskPopupView } from 'View/Popup/Ask';

import { timeToNode } from 'Common/Momentor';

// Every 5 minutes
const refreshFolders = 300000;

class AppUser extends AbstractApp {
	constructor() {
		super(Remote);

		this.moveCache = {};

		this.moveOrDeleteResponseHelper = this.moveOrDeleteResponseHelper.bind(this);

		this.messagesMoveTrigger = this.messagesMoveTrigger.debounce(500);

		// wakeUp
		const interval = 3600000; // 60m
		var lastTime = Date.now();
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
		['keydown','keyup'].forEach(t => doc.addEventListener(t, fn));

		shortcuts.add('escape,enter', '', Scope.All, () => rl.Dropdowns.detectVisibility());
	}

	reload() {
		(Settings.app('inIframe') ? parent : window).location.reload();
	}

	reloadFlagsCurrentMessageListAndMessageFromCache() {
		MessageUserStore.list.forEach(message =>
			MessageFlagsCache.initMessage(message)
		);
		MessageFlagsCache.initMessage(MessageUserStore.message());
		MessageUserStore.messageViewTrigger(!MessageUserStore.messageViewTrigger());
	}

	/**
	 * @param {boolean=} bDropPagePosition = false
	 * @param {boolean=} bDropCurrenFolderCache = false
	 */
	reloadMessageList(bDropPagePosition = false, bDropCurrenFolderCache = false) {
		let iOffset = (MessageUserStore.listPage() - 1) * SettingsUserStore.messagesPerPage();

		if (bDropCurrenFolderCache) {
			setFolderHash(FolderUserStore.currentFolderFullName(), '');
		}

		if (bDropPagePosition) {
			MessageUserStore.listPage(1);
			MessageUserStore.listPageBeforeThread(1);
			iOffset = 0;

			rl.route.setHash(
				mailBox(
					FolderUserStore.currentFolderFullNameHash(),
					MessageUserStore.listPage(),
					MessageUserStore.listSearch(),
					MessageUserStore.listThreadUid()
				),
				true,
				true
			);
		}

		MessageUserStore.listLoading(true);
		MessageUserStore.listError('');
		Remote.messageList(
			(iError, oData, bCached) => {
				if (iError) {
					if (Notification.RequestAborted !== iError) {
						MessageUserStore.list([]);
						MessageUserStore.listError(getNotification(iError));
					}
				} else {
					MessageUserStore.setMessageList(oData, bCached);
				}
				MessageUserStore.listLoading(false);
			},
			{
				Folder: FolderUserStore.currentFolderFullName(),
				Offset: iOffset,
				Limit: SettingsUserStore.messagesPerPage(),
				Search: MessageUserStore.listSearch(),
				ThreadUid: MessageUserStore.listThreadUid()
			}
		);
	}

	messagesMoveTrigger() {
		const sTrashFolder = FolderUserStore.trashFolder(),
			sSpamFolder = FolderUserStore.spamFolder();

		forEachObjectValue(this.moveCache, item => {
			const isSpam = sSpamFolder === item.To,
				isTrash = sTrashFolder === item.To,
				isHam = !isSpam && sSpamFolder === item.From && getFolderInboxName() === item.To;

			Remote.request('MessageMove',
				this.moveOrDeleteResponseHelper,
				{
					FromFolder: item.From,
					ToFolder: item.To,
					Uids: item.Uid.join(','),
					MarkAsRead: (isSpam || isTrash) ? 1 : 0,
					Learning: isSpam ? 'SPAM' : isHam ? 'HAM' : ''
				},
				null,
				'',
				['MessageList']
			);
		});

		this.moveCache = {};
	}

	messagesMoveHelper(fromFolderFullName, toFolderFullName, uidsForMove) {
		const hash = '$$' + fromFolderFullName + '$$' + toFolderFullName + '$$';
		if (!this.moveCache[hash]) {
			this.moveCache[hash] = {
				From: fromFolderFullName,
				To: toFolderFullName,
				Uid: []
			};
		}

		this.moveCache[hash].Uid = this.moveCache[hash].Uid.concat(uidsForMove).unique();
		this.messagesMoveTrigger();
	}

	messagesCopyHelper(sFromFolderFullName, sToFolderFullName, aUidForCopy) {
		Remote.request('MessageCopy', this.moveOrDeleteResponseHelper, {
			FromFolder: sFromFolderFullName,
			ToFolder: sToFolderFullName,
			Uids: aUidForCopy.join(',')
		});
	}

	messagesDeleteHelper(sFromFolderFullName, aUidForRemove) {
		Remote.request('MessageDelete',
			this.moveOrDeleteResponseHelper,
			{
				Folder: sFromFolderFullName,
				Uids: aUidForRemove.join(',')
			},
			null,
			'',
			['MessageList']
		);
	}

	moveOrDeleteResponseHelper(iError, oData) {
		if (iError) {
			setFolderHash(FolderUserStore.currentFolderFullName(), '');
			alert(getNotification(iError));
		} else if (FolderUserStore.currentFolder()) {
			if (2 === arrayLength(oData.Result)) {
				setFolderHash(oData.Result[0], oData.Result[1]);
			} else {
				setFolderHash(FolderUserStore.currentFolderFullName(), '');
			}
			this.reloadMessageList(!MessageUserStore.list.length);
		}
	}

	/**
	 * @param {string} sFromFolderFullName
	 * @param {Array} aUidForRemove
	 */
	deleteMessagesFromFolderWithoutCheck(sFromFolderFullName, aUidForRemove) {
		this.messagesDeleteHelper(sFromFolderFullName, aUidForRemove);
		MessageUserStore.removeMessagesFromList(sFromFolderFullName, aUidForRemove);
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
					this.messagesDeleteHelper(sFromFolderFullName, aUidForRemove);
					MessageUserStore.removeMessagesFromList(sFromFolderFullName, aUidForRemove);
				}
			]);
		} else if (oMoveFolder) {
			this.messagesMoveHelper(sFromFolderFullName, oMoveFolder.fullName, aUidForRemove);
			MessageUserStore.removeMessagesFromList(sFromFolderFullName, aUidForRemove, oMoveFolder.fullName);
		}
	}

	/**
	 * @param {string} sFromFolderFullName
	 * @param {Array} aUidForMove
	 * @param {string} sToFolderFullName
	 * @param {boolean=} bCopy = false
	 */
	moveMessagesToFolder(sFromFolderFullName, aUidForMove, sToFolderFullName, bCopy) {
		if (sFromFolderFullName !== sToFolderFullName && arrayLength(aUidForMove)) {
			const oFromFolder = getFolderFromCacheList(sFromFolderFullName),
				oToFolder = getFolderFromCacheList(sToFolderFullName);

			if (oFromFolder && oToFolder) {
				if (undefined === bCopy ? false : !!bCopy) {
					this.messagesCopyHelper(oFromFolder.fullName, oToFolder.fullName, aUidForMove);
				} else {
					this.messagesMoveHelper(oFromFolder.fullName, oToFolder.fullName, aUidForMove);
				}

				MessageUserStore.removeMessagesFromList(oFromFolder.fullName, aUidForMove, oToFolder.fullName, bCopy);
				return true;
			}
		}

		return false;
	}

	/**
	 * @param {Function=} callback = null
	 */
	foldersReload(callback = null) {
		Remote.foldersReload(callback);
	}

	foldersPromisesActionHelper(promise, errorDefCode) {
		Remote.abort('Folders')
			.fastResolve(true)
			.then(() => promise)
			.then(
				() => Remote.foldersReloadWithTimeout(),
				error => {
					FolderUserStore.folderListError(getNotification(error.code, '', errorDefCode) + '.\n' + error.message);
					Remote.foldersReloadWithTimeout();
				}
			);
	}

	reloadOpenPgpKeys() {
		if (PgpUserStore.capaOpenPGP()) {
			const keys = [],
				email = new EmailModel(),
				openpgpKeyring = PgpUserStore.openpgpKeyring,
				openpgpKeys = openpgpKeyring ? openpgpKeyring.getAllKeys() : [];

			openpgpKeys.forEach((oItem, iIndex) => {
				if (oItem && oItem.primaryKey) {
					const aEmails = [],
						aUsers = [],
						primaryUser = oItem.getPrimaryUser(),
						user =
							primaryUser && primaryUser.user
								? primaryUser.user.userId.userid
								: oItem.users && oItem.users[0]
								? oItem.users[0].userId.userid
								: '';

					if (oItem.users) {
						oItem.users.forEach(item => {
							if (item.userId) {
								email.clear();
								email.parse(item.userId.userid);
								if (email.validate()) {
									aEmails.push(email.email);
									aUsers.push(item.userId.userid);
								}
							}
						});
					}

					if (aEmails.length) {
						keys.push(
							new OpenPgpKeyModel(
								iIndex,
								oItem.primaryKey.getFingerprint(),
								oItem.primaryKey
									.getKeyId()
									.toHex()
									.toLowerCase(),
								oItem.getKeyIds()
									.map(item => (item && item.toHex ? item.toHex() : null))
									.validUnique(),
								aUsers,
								aEmails,
								oItem.isPrivate(),
								oItem.armor(),
								user
							)
						);
					}
				}
			});

			delegateRunOnDestroy(PgpUserStore.openpgpkeys());
			PgpUserStore.openpgpkeys(keys);
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

					delegateRunOnDestroy(AccountUserStore.accounts());

					AccountUserStore.accounts(
						accounts.map(
							sValue => new AccountModel(sValue/*, counts[sValue]*/)
						)
					);
//					accounts.length &&
					AccountUserStore.accounts.unshift(new AccountModel(mainEmail/*, counts[mainEmail]*/, false));
				}

				if (isArray(oData.Result.Identities)) {
					delegateRunOnDestroy(IdentityUserStore());

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
			Remote.folderInformation(
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

								this.reloadFlagsCurrentMessageListAndMessageFromCache();
							}

							MessageUserStore.initUidNextAndNewMessages(
								folderFromCache.fullName,
								result.UidNext,
								result.NewMessages
							);

							if (!hash || unreadCountChange || result.Hash !== hash) {
								if (folderFromCache.fullName === FolderUserStore.currentFolderFullName()) {
									this.reloadMessageList();
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

	/**
	 * @param {boolean=} boot = false
	 */
	folderInformationMultiply(boot = false) {
		const folders = FolderUserStore.getNextFolderNames(refreshFolders);
		if (arrayLength(folders)) {
			Remote.request('FolderInformationMultiply', (iError, oData) => {
				if (!iError && arrayLength(oData.Result)) {
					const utc = Date.now();
					oData.Result.forEach(item => {
						const hash = getFolderHash(item.Folder),
							folder = getFolderFromCacheList(item.Folder);

						if (folder) {
							folder.expires = utc;

							setFolderHash(item.Folder, item.Hash);

							folder.messageCountAll(item.MessageCount);

							let unreadCountChange = folder.messageCountUnread() !== item.MessageUnseenCount;

							folder.messageCountUnread(item.MessageUnseenCount);

							if (unreadCountChange) {
								MessageFlagsCache.clearFolder(folder.fullName);
							}

							if (!hash || item.Hash !== hash) {
								if (folder.fullName === FolderUserStore.currentFolderFullName()) {
									this.reloadMessageList();
								}
							} else if (unreadCountChange
							 && folder.fullName === FolderUserStore.currentFolderFullName()
							 && MessageUserStore.list.length) {
								this.folderInformation(folder.fullName, MessageUserStore.list());
							}
						}
					});

					if (boot) {
						setTimeout(() => this.folderInformationMultiply(true), 2000);
					}
				}
			}, {
				Folders: folders
			});
		}
	}

	/**
	 * @param {string} sFolderFullName
	 * @param {number} iSetAction
	 * @param {Array=} messages = null
	 */
	messageListAction(sFolderFullName, iSetAction, messages) {
		messages = messages || MessageUserStore.listChecked();

		let folder = null,
			alreadyUnread = 0,
			rootUids = messages.map(oMessage => oMessage && oMessage.uid ? oMessage.uid : null)
				.validUnique(),
			length = rootUids.length;

		if (sFolderFullName && length) {
			switch (iSetAction) {
				case MessageSetAction.SetSeen:
					length = 0;
					// fallthrough is intentionally
				case MessageSetAction.UnsetSeen:
					rootUids.forEach(sSubUid =>
						alreadyUnread += MessageFlagsCache.storeBySetAction(sFolderFullName, sSubUid, iSetAction)
					);

					folder = getFolderFromCacheList(sFolderFullName);
					if (folder) {
						folder.messageCountUnread(folder.messageCountUnread() - alreadyUnread + length);
					}

					Remote.request('MessageSetSeen', null, {
						Folder: sFolderFullName,
						Uids: rootUids.join(','),
						SetAction: iSetAction == MessageSetAction.SetSeen ? 1 : 0
					});
					break;

				case MessageSetAction.SetFlag:
				case MessageSetAction.UnsetFlag:
					rootUids.forEach(sSubUid =>
						MessageFlagsCache.storeBySetAction(sFolderFullName, sSubUid, iSetAction)
					);
					Remote.request('MessageSetFlagged', null, {
						Folder: sFolderFullName,
						Uids: rootUids.join(','),
						SetAction: iSetAction == MessageSetAction.SetFlag ? 1 : 0
					});
					break;
				// no default
			}

			this.reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	}

	/**
	 * @param {string} query
	 * @param {Function} autocompleteCallback
	 */
	getAutocomplete(query, autocompleteCallback) {
		Remote.suggestions((iError, data) => {
			if (!iError && isArray(data.Result)) {
				autocompleteCallback(
					data.Result.map(item => (item && item[0] ? new EmailModel(item[0], item[1]) : null)).filter(v => v)
				);
			} else if (Notification.RequestAborted !== iError) {
				autocompleteCallback([]);
			}
		}, query);
	}

	/**
	 * @param {string} sFullName
	 * @param {boolean} bExpanded
	 */
	setExpandedFolder(sFullName, bExpanded) {
		let aExpandedList = Local.get(ClientSideKeyName.ExpandedFolders);
		if (!isArray(aExpandedList)) {
			aExpandedList = [];
		}

		if (bExpanded) {
			if (!aExpandedList.includes(sFullName))
				aExpandedList.push(sFullName);
		} else {
			aExpandedList = aExpandedList.filter(value => value !== sFullName);
		}

		Local.set(ClientSideKeyName.ExpandedFolders, aExpandedList);
	}

	/**
	 * @param {string} link
	 * @returns {boolean}
	 */
	download(link) {
		if (ThemeStore.isMobile()) {
			open(link, '_self');
			focus();
		} else {
			const oLink = createElement('a');
			oLink.href = link;
			doc.body.appendChild(oLink).click();
			oLink.remove();
		}
		return true;
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

			this.foldersReload(value => {
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
							this.folderInformationMultiply();
						}, refreshFolders);

						// Every 15 minutes
						setInterval(()=>this.foldersReload(), 900000);

						ContactUserStore.init();

						this.accountsAndIdentities();

						setTimeout(() => {
							const cF = FolderUserStore.currentFolderFullName();
							if (getFolderInboxName() !== cF) {
								this.folderInformation(cF);
							}
							FolderUserStore.hasCapability('LIST-STATUS') || this.folderInformationMultiply(true);
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

						['touchstart','mousedown','mousemove','keydown'].forEach(
							t => doc.addEventListener(t, SettingsUserStore.delayLogout, {passive:true})
						);
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

						setInterval(this.reloadTime(), 60000);

						if (window.crypto && crypto.getRandomValues && Settings.capa(Capa.OpenPGP)) {
							const script = createElement('script', {src:openPgpJs()});
							script.onload = () => {
								PgpUserStore.openpgp = openpgp;
								if (window.Worker) {
									try {
										PgpUserStore.openpgp.initWorker({ path: openPgpWorkerJs() });
									} catch (e) {
										console.error(e);
									}
								}
								PgpUserStore.openpgpKeyring = new openpgp.Keyring();
								PgpUserStore.capaOpenPGP(true);
								this.reloadOpenPgpKeys();
							};
							script.onerror = () => console.error(script.src);
							doc.head.append(script);
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

	reloadTime()
	{
		setTimeout(() =>
			doc.querySelectorAll('time').forEach(element => timeToNode(element))
			, 1)
	}

	showMessageComposer(params = [])
	{
		showScreenPopup(ComposePopupView, params);
	}
}

export default new AppUser();
