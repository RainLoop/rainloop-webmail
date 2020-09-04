import {
	isPosNumeric,
	isNonEmptyArray,
	pInt,
	pString,
	delegateRunOnDestroy,
	mailToHelper
} from 'Common/Utils';

import {
	Layout,
	Capa,
	StorageResultType,
	Notification,
	FolderType,
	SetSystemFoldersNotification,
	MessageSetAction,
	ClientSideKeyName
} from 'Common/Enums';

import { $htmlCL, leftPanelDisabled, bMobileDevice } from 'Common/Globals';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';

import {
	initMessageFlagsFromCache,
	setFolderHash,
	getFolderHash,
	getFolderInboxName,
	getFolderFromCacheList,
	clearMessageFlagsFromCacheByFolder,
	storeMessageFlagsToCacheBySetAction,
	storeMessageFlagsToCacheByFolderAndUid
} from 'Common/Cache';

import {
	userBackground,
	mailBox,
	root,
	openPgpWorkerJs,
	openPgpJs
} from 'Common/Links';

import { getNotification, i18n } from 'Common/Translator';

import AppStore from 'Stores/User/App';
import SettingsStore from 'Stores/User/Settings';
import NotificationStore from 'Stores/User/Notification';
import AccountStore from 'Stores/User/Account';
import ContactStore from 'Stores/User/Contact';
import IdentityStore from 'Stores/User/Identity';
import TemplateStore from 'Stores/User/Template';
import FolderStore from 'Stores/User/Folder';
import PgpStore from 'Stores/User/Pgp';
import MessageStore from 'Stores/User/Message';
import QuotaStore from 'Stores/User/Quota';

import * as Local from 'Storage/Client';

import Remote from 'Remote/User/Ajax';
import Promises from 'Promises/User/Ajax';

import { EmailModel } from 'Model/Email';
import { AccountModel } from 'Model/Account';
import { IdentityModel } from 'Model/Identity';
import { TemplateModel } from 'Model/Template';
import { OpenPgpKeyModel } from 'Model/OpenPgpKey';

import { LoginUserScreen } from 'Screen/User/Login';
import { MailBoxUserScreen } from 'Screen/User/MailBox';
import { SettingsUserScreen } from 'Screen/User/Settings';

import { hideLoading, routeOff, routeOn, setHash, startScreens, showScreenPopup } from 'Knoin/Knoin';

import { AbstractApp } from 'App/Abstract';

const doc = document, Settings = rl.settings;

class AppUser extends AbstractApp {
	constructor() {
		super(Remote);

		this.moveCache = {};

		this.quotaDebounce = this.quota.debounce(30000);
		this.moveOrDeleteResponseHelper = this.moveOrDeleteResponseHelper.bind(this);

		this.messagesMoveTrigger = this.messagesMoveTrigger.debounce(500);

		// wakeUp
		const interval = 3600000; // 60m
		var lastTime = (new Date()).getTime();
		setInterval(() => {
			const currentTime = (new Date()).getTime();
			if (currentTime > (lastTime + interval + 1000)) {
				if (rl.hash.check()) {
					this.reload();
				}
				Remote.jsVersion((sResult, oData) => {
					if (StorageResultType.Success === sResult && oData && !oData.Result) {
						this.reload();
					}
				}, Settings.app('version'));
			}
			lastTime = currentTime;
		}, interval);

		if (rl.hash.check()) {
			this.reload();
		}

		if (Settings.get('UserBackgroundHash')) {
			setTimeout(() => {
				const img = userBackground(Settings.get('UserBackgroundHash'));
				if (img) {
					$htmlCL.add('UserBackground');
					doc.body.style.backgroundImage = "url("+img+")";
				}
			}, 1000);
		}
	}

	remote() {
		return Remote;
	}

	reload() {
		(Settings.app('inIframe') ? parent : window).location.reload();
	}

	reloadFlagsCurrentMessageListAndMessageFromCache() {
		MessageStore.messageList().forEach(message => {
			initMessageFlagsFromCache(message);
		});
		initMessageFlagsFromCache(MessageStore.message());
	}

	/**
	 * @param {boolean=} bDropPagePosition = false
	 * @param {boolean=} bDropCurrenFolderCache = false
	 */
	reloadMessageList(bDropPagePosition = false, bDropCurrenFolderCache = false) {
		let iOffset = (MessageStore.messageListPage() - 1) * SettingsStore.messagesPerPage();

		if (bDropCurrenFolderCache) {
			setFolderHash(FolderStore.currentFolderFullNameRaw(), '');
		}

		if (bDropPagePosition) {
			MessageStore.messageListPage(1);
			MessageStore.messageListPageBeforeThread(1);
			iOffset = 0;

			setHash(
				mailBox(
					FolderStore.currentFolderFullNameHash(),
					MessageStore.messageListPage(),
					MessageStore.messageListSearch(),
					MessageStore.messageListThreadUid()
				),
				true,
				true
			);
		}

		MessageStore.messageListLoading(true);
		Remote.messageList(
			(sResult, oData, bCached) => {
				if (StorageResultType.Success === sResult && oData && oData.Result) {
					MessageStore.messageListError('');
					MessageStore.messageListLoading(false);

					MessageStore.setMessageList(oData, bCached);
				} else if (StorageResultType.Unload === sResult) {
					MessageStore.messageListError('');
					MessageStore.messageListLoading(false);
				} else if (StorageResultType.Abort !== sResult) {
					MessageStore.messageList([]);
					MessageStore.messageListLoading(false);
					MessageStore.messageListError(
						oData && oData.ErrorCode ? getNotification(oData.ErrorCode) : i18n('NOTIFICATIONS/CANT_GET_MESSAGE_LIST')
					);
				}
			},
			FolderStore.currentFolderFullNameRaw(),
			iOffset,
			SettingsStore.messagesPerPage(),
			MessageStore.messageListSearch(),
			MessageStore.messageListThreadUid()
		);
	}

	recacheInboxMessageList() {
		Remote.messageList(()=>{}, getFolderInboxName(), 0, SettingsStore.messagesPerPage(), '', '', true);
	}

	/**
	 * @param {Function} fResultFunc
	 * @returns {boolean}
	 */
	contactsSync(fResultFunc) {
		const oContacts = ContactStore.contacts;
		if (
			oContacts.importing() ||
			oContacts.syncing() ||
			!ContactStore.enableContactsSync() ||
			!ContactStore.allowContactsSync()
		) {
			return false;
		}

		oContacts.syncing(true);

		Remote.contactsSync((sResult, oData) => {
			oContacts.syncing(false);

			if (fResultFunc) {
				fResultFunc(sResult, oData);
			}
		});

		return true;
	}

	messagesMoveTrigger() {
		const sTrashFolder = FolderStore.trashFolder(),
			sSpamFolder = FolderStore.spamFolder();

		Object.values(this.moveCache).forEach(item => {
			const isSpam = sSpamFolder === item.To,
				isTrash = sTrashFolder === item.To,
				isHam = !isSpam && sSpamFolder === item.From && getFolderInboxName() === item.To;

			Remote.messagesMove(
				this.moveOrDeleteResponseHelper,
				item.From,
				item.To,
				item.Uid,
				isSpam ? 'SPAM' : isHam ? 'HAM' : '',
				isSpam || isTrash
			);
		});

		this.moveCache = {};
	}

	messagesMoveHelper(fromFolderFullNameRaw, toFolderFullNameRaw, uidsForMove) {
		const hash = '$$' + fromFolderFullNameRaw + '$$' + toFolderFullNameRaw + '$$';
		if (!this.moveCache[hash]) {
			this.moveCache[hash] = {
				From: fromFolderFullNameRaw,
				To: toFolderFullNameRaw,
				Uid: []
			};
		}

		this.moveCache[hash].Uid = this.moveCache[hash].Uid.concat(uidsForMove)
			.filter((value, index, self) => self.indexOf(value) == index);
		this.messagesMoveTrigger();
	}

	messagesCopyHelper(sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForCopy) {
		Remote.messagesCopy(this.moveOrDeleteResponseHelper, sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForCopy);
	}

	messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove) {
		Remote.messagesDelete(this.moveOrDeleteResponseHelper, sFromFolderFullNameRaw, aUidForRemove);
	}

	moveOrDeleteResponseHelper(sResult, oData) {
		if (StorageResultType.Success === sResult && FolderStore.currentFolder()) {
			if (oData && Array.isArray(oData.Result) && 2 === oData.Result.length) {
				setFolderHash(oData.Result[0], oData.Result[1]);
			} else {
				setFolderHash(FolderStore.currentFolderFullNameRaw(), '');

				if (oData && [Notification.CantMoveMessage, Notification.CantCopyMessage].includes(oData.ErrorCode)) {
					alert(getNotification(oData.ErrorCode));
				}
			}

			this.reloadMessageList(!MessageStore.messageList().length);
			this.quotaDebounce();
		}
	}

	/**
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForRemove
	 */
	deleteMessagesFromFolderWithoutCheck(sFromFolderFullNameRaw, aUidForRemove) {
		this.messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove);
		MessageStore.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove);
	}

	/**
	 * @param {number} iDeleteType
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForRemove
	 * @param {boolean=} bUseFolder = true
	 */
	deleteMessagesFromFolder(iDeleteType, sFromFolderFullNameRaw, aUidForRemove, bUseFolder) {
		let oMoveFolder = null,
			nSetSystemFoldersNotification = null;

		switch (iDeleteType) {
			case FolderType.Spam:
				oMoveFolder = getFolderFromCacheList(FolderStore.spamFolder());
				nSetSystemFoldersNotification = SetSystemFoldersNotification.Spam;
				break;
			case FolderType.NotSpam:
				oMoveFolder = getFolderFromCacheList(getFolderInboxName());
				break;
			case FolderType.Trash:
				oMoveFolder = getFolderFromCacheList(FolderStore.trashFolder());
				nSetSystemFoldersNotification = SetSystemFoldersNotification.Trash;
				break;
			case FolderType.Archive:
				oMoveFolder = getFolderFromCacheList(FolderStore.archiveFolder());
				nSetSystemFoldersNotification = SetSystemFoldersNotification.Archive;
				break;
			// no default
		}

		bUseFolder = undefined === bUseFolder ? true : !!bUseFolder;
		if (bUseFolder) {
			if (
				(FolderType.Spam === iDeleteType && UNUSED_OPTION_VALUE === FolderStore.spamFolder()) ||
				(FolderType.Trash === iDeleteType && UNUSED_OPTION_VALUE === FolderStore.trashFolder()) ||
				(FolderType.Archive === iDeleteType && UNUSED_OPTION_VALUE === FolderStore.archiveFolder())
			) {
				bUseFolder = false;
			}
		}

		if (!oMoveFolder && bUseFolder) {
			showScreenPopup(require('View/Popup/FolderSystem'), [nSetSystemFoldersNotification]);
		} else if (
			!bUseFolder ||
			(FolderType.Trash === iDeleteType &&
				(sFromFolderFullNameRaw === FolderStore.spamFolder() || sFromFolderFullNameRaw === FolderStore.trashFolder()))
		) {
			showScreenPopup(require('View/Popup/Ask'), [
				i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'),
				() => {
					this.messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove);
					MessageStore.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove);
				}
			]);
		} else if (oMoveFolder) {
			this.messagesMoveHelper(sFromFolderFullNameRaw, oMoveFolder.fullNameRaw, aUidForRemove);
			MessageStore.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove, oMoveFolder.fullNameRaw);
		}
	}

	/**
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForMove
	 * @param {string} sToFolderFullNameRaw
	 * @param {boolean=} bCopy = false
	 */
	moveMessagesToFolder(sFromFolderFullNameRaw, aUidForMove, sToFolderFullNameRaw, bCopy) {
		if (sFromFolderFullNameRaw !== sToFolderFullNameRaw && Array.isArray(aUidForMove) && aUidForMove.length) {
			const oFromFolder = getFolderFromCacheList(sFromFolderFullNameRaw),
				oToFolder = getFolderFromCacheList(sToFolderFullNameRaw);

			if (oFromFolder && oToFolder) {
				if (undefined === bCopy ? false : !!bCopy) {
					this.messagesCopyHelper(oFromFolder.fullNameRaw, oToFolder.fullNameRaw, aUidForMove);
				} else {
					this.messagesMoveHelper(oFromFolder.fullNameRaw, oToFolder.fullNameRaw, aUidForMove);
				}

				MessageStore.removeMessagesFromList(oFromFolder.fullNameRaw, aUidForMove, oToFolder.fullNameRaw, bCopy);
				return true;
			}
		}

		return false;
	}

	/**
	 * @param {Function=} callback = null
	 */
	foldersReload(callback = null) {
		const prom = Promises.foldersReload(FolderStore.foldersLoading);
		if (callback) {
			prom
				.then((value) => !!value)
				.then(callback)
				.catch(() => {
					setTimeout(() => {
						if (callback) {
							callback(false); // eslint-disable-line callback-return
						}
					}, 1);
				});
		}
	}

	foldersPromisesActionHelper(promise, errorDefCode) {
		Promises.abort('Folders')
			.fastResolve(true)
			.then(() => promise)
			.then(
				() => {
					Promises.foldersReloadWithTimeout(FolderStore.foldersLoading);
				},
				(errorCode) => {
					FolderStore.folderList.error(getNotification(errorCode, '', errorDefCode));
					Promises.foldersReloadWithTimeout(FolderStore.foldersLoading);
				}
			);
	}

	reloadOpenPgpKeys() {
		if (PgpStore.capaOpenPGP()) {
			const keys = [],
				email = new EmailModel(),
				openpgpKeyring = PgpStore.openpgpKeyring,
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
									.filter((value, index, self) => !!value && self.indexOf(value) == index),
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

			delegateRunOnDestroy(PgpStore.openpgpkeys());
			PgpStore.openpgpkeys(keys);
		}
	}

	accountsAndIdentities() {
		AccountStore.accounts.loading(true);
		IdentityStore.identities.loading(true);

		Remote.accountsAndIdentities((sResult, oData) => {
			AccountStore.accounts.loading(false);
			IdentityStore.identities.loading(false);

			if (StorageResultType.Success === sResult && oData.Result) {
				const counts = {},
					sAccountEmail = AccountStore.email();
				let parentEmail = Settings.get('ParentEmail') || sAccountEmail;

				if (Array.isArray(oData.Result.Accounts)) {
					AccountStore.accounts().forEach(oAccount => {
						counts[oAccount.email] = oAccount.count();
					});

					delegateRunOnDestroy(AccountStore.accounts());

					AccountStore.accounts(
						oData.Result.Accounts.map(
							sValue => new AccountModel(sValue, sValue !== parentEmail, counts[sValue] || 0)
						)
					);
				}

				if (Array.isArray(oData.Result.Identities)) {
					delegateRunOnDestroy(IdentityStore.identities());

					IdentityStore.identities(
						oData.Result.Identities.map(identityData => {
							const id = pString(identityData.Id),
								email = pString(identityData.Email),
								identity = new IdentityModel(id, email);

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

	templates() {
		TemplateStore.templates.loading(true);

		Remote.templates((result, data) => {
			TemplateStore.templates.loading(false);

			if (StorageResultType.Success === result && data.Result && Array.isArray(data.Result.Templates)) {
				delegateRunOnDestroy(TemplateStore.templates());

				TemplateStore.templates(
					data.Result.Templates.map(templateData => {
						const template = new TemplateModel();
						return template.parse(templateData) ? template : null;
					}).filter(value => !!value)
				);
			}
		});
	}

	quota() {
		Remote.quota((result, data) => {
			if (
				StorageResultType.Success === result &&
				data &&
				data.Result &&
				Array.isArray(data.Result) &&
				1 < data.Result.length &&
				isPosNumeric(data.Result[0], true) &&
				isPosNumeric(data.Result[1], true)
			) {
				QuotaStore.populateData(pInt(data.Result[1]), pInt(data.Result[0]));
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
				(result, data) => {
					if (StorageResultType.Success === result) {
						if (data && data.Result && data.Result.Hash && data.Result.Folder) {
							let uid = '',
								check = false,
								unreadCountChange = false;

							const folderFromCache = getFolderFromCacheList(data.Result.Folder);
							if (folderFromCache) {
								folderFromCache.interval = Date.now() / 1000;

								if (data.Result.Hash) {
									setFolderHash(data.Result.Folder, data.Result.Hash);
								}

								if (null != data.Result.MessageCount) {
									folderFromCache.messageCountAll(data.Result.MessageCount);
								}

								if (null != data.Result.MessageUnseenCount) {
									if (pInt(folderFromCache.messageCountUnread()) !== pInt(data.Result.MessageUnseenCount)) {
										unreadCountChange = true;
									}

									folderFromCache.messageCountUnread(data.Result.MessageUnseenCount);
								}

								if (unreadCountChange) {
									clearMessageFlagsFromCacheByFolder(folderFromCache.fullNameRaw);
								}

								if (data.Result.Flags) {
									for (uid in data.Result.Flags) {
										if (Object.prototype.hasOwnProperty.call(data.Result.Flags, uid)) {
											check = true;
											const flags = data.Result.Flags[uid];
											storeMessageFlagsToCacheByFolderAndUid(folderFromCache.fullNameRaw, uid.toString(), [
												!flags.IsSeen,
												!!flags.IsFlagged,
												!!flags.IsAnswered,
												!!flags.IsForwarded,
												!!flags.IsReadReceipt
											]);
										}
									}

									if (check) {
										this.reloadFlagsCurrentMessageListAndMessageFromCache();
									}
								}

								MessageStore.initUidNextAndNewMessages(
									folderFromCache.fullNameRaw,
									data.Result.UidNext,
									data.Result.NewMessages
								);

								const hash = getFolderHash(data.Result.Folder);
								if (!hash || unreadCountChange || data.Result.Hash !== hash) {
									if (folderFromCache.fullNameRaw === FolderStore.currentFolderFullNameRaw()) {
										this.reloadMessageList();
									} else if (getFolderInboxName() === folderFromCache.fullNameRaw) {
										this.recacheInboxMessageList();
									}
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
		const folders = FolderStore.getNextFolderNames();
		if (isNonEmptyArray(folders)) {
			Remote.folderInformationMultiply((sResult, oData) => {
				if (StorageResultType.Success === sResult) {
					if (oData && oData.Result && oData.Result.List && isNonEmptyArray(oData.Result.List)) {
						const utc = Date.now() / 1000;
						oData.Result.List.forEach(item => {
							const hash = getFolderHash(item.Folder),
								folder = getFolderFromCacheList(item.Folder);
							let unreadCountChange = false;

							if (folder) {
								folder.interval = utc;

								if (item.Hash) {
									setFolderHash(item.Folder, item.Hash);
								}

								if (null != item.MessageCount) {
									folder.messageCountAll(item.MessageCount);
								}

								if (null != item.MessageUnseenCount) {
									if (pInt(folder.messageCountUnread()) !== pInt(item.MessageUnseenCount)) {
										unreadCountChange = true;
									}

									folder.messageCountUnread(item.MessageUnseenCount);
								}

								if (unreadCountChange) {
									clearMessageFlagsFromCacheByFolder(folder.fullNameRaw);
								}

								if (!hash || item.Hash !== hash) {
									if (folder.fullNameRaw === FolderStore.currentFolderFullNameRaw()) {
										this.reloadMessageList();
									}
								} else if (unreadCountChange) {
									if (folder.fullNameRaw === FolderStore.currentFolderFullNameRaw()) {
										const list = MessageStore.messageList();
										if (isNonEmptyArray(list)) {
											this.folderInformation(folder.fullNameRaw, list);
										}
									}
								}
							}
						});

						if (boot) {
							setTimeout(() => this.folderInformationMultiply(true), 2000);
						}
					}
				}
			}, folders);
		}
	}

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {number} iSetAction
	 * @param {Array=} messages = null
	 */
	messageListAction(sFolderFullNameRaw, iSetAction, messages) {
		let folder = null,
			alreadyUnread = 0,
			rootUids = [];

		if (undefined === messages || !messages) {
			messages = MessageStore.messageListChecked();
		}

		rootUids = messages.map(oMessage => oMessage && oMessage.uid ? oMessage.uid : null)
			.filter((value, index, self) => !!value && self.indexOf(value) == index);

		if (sFolderFullNameRaw && rootUids.length) {
			switch (iSetAction) {
				case MessageSetAction.SetSeen:
					rootUids.forEach(sSubUid => {
						alreadyUnread += storeMessageFlagsToCacheBySetAction(sFolderFullNameRaw, sSubUid, iSetAction);
					});

					folder = getFolderFromCacheList(sFolderFullNameRaw);
					if (folder) {
						folder.messageCountUnread(folder.messageCountUnread() - alreadyUnread);
					}

					Remote.messageSetSeen(()=>{}, sFolderFullNameRaw, rootUids, true);
					break;

				case MessageSetAction.UnsetSeen:
					rootUids.forEach(sSubUid => {
						alreadyUnread += storeMessageFlagsToCacheBySetAction(sFolderFullNameRaw, sSubUid, iSetAction);
					});

					folder = getFolderFromCacheList(sFolderFullNameRaw);
					if (folder) {
						folder.messageCountUnread(folder.messageCountUnread() - alreadyUnread + rootUids.length);
					}

					Remote.messageSetSeen(()=>{}, sFolderFullNameRaw, rootUids, false);
					break;

				case MessageSetAction.SetFlag:
					rootUids.forEach(sSubUid => {
						storeMessageFlagsToCacheBySetAction(sFolderFullNameRaw, sSubUid, iSetAction);
					});

					Remote.messageSetFlagged(()=>{}, sFolderFullNameRaw, rootUids, true);
					break;

				case MessageSetAction.UnsetFlag:
					rootUids.forEach(sSubUid => {
						storeMessageFlagsToCacheBySetAction(sFolderFullNameRaw, sSubUid, iSetAction);
					});

					Remote.messageSetFlagged(()=>{}, sFolderFullNameRaw, rootUids, false);
					break;
				// no default
			}

			this.reloadFlagsCurrentMessageListAndMessageFromCache();
			MessageStore.message.viewTrigger(!MessageStore.message.viewTrigger());
		}
	}

	/**
	 * @param {string} query
	 * @param {Function} autocompleteCallback
	 */
	getAutocomplete(query, autocompleteCallback) {
		Remote.suggestions((result, data) => {
			if (StorageResultType.Success === result && data && Array.isArray(data.Result)) {
				autocompleteCallback(
					data.Result.map(item => (item && item[0] ? new EmailModel(item[0], item[1]) : null)).filter(value => !!value)
				);
			} else if (StorageResultType.Abort !== result) {
				autocompleteCallback([]);
			}
		}, query);
	}

	/**
	 * @param {string} sFullNameHash
	 * @param {boolean} bExpanded
	 */
	setExpandedFolder(sFullNameHash, bExpanded) {
		let aExpandedList = Local.get(ClientSideKeyName.ExpandedFolders);
		if (!Array.isArray(aExpandedList)) {
			aExpandedList = [];
		}

		if (bExpanded) {
			if (!aExpandedList.includes(sFullNameHash))
				aExpandedList.push(sFullNameHash);
		} else {
			aExpandedList = aExpandedList.filter(value => value !== sFullNameHash);
		}

		Local.set(ClientSideKeyName.ExpandedFolders, aExpandedList);
	}

	setLayoutResizer(source, target, sClientSideKeyName, mode) {
		if (mode) {
			source.classList.add('resizable');
			if (!source.querySelector('.resizer')) {
				const resizer = doc.createElement('div'),
					cssint = s => parseFloat(getComputedStyle(source, null).getPropertyValue(s).replace('px', ''));
				resizer.className = 'resizer';
				source.append(resizer);
				resizer.addEventListener('mousedown', {
					source: source,
					mode: mode,
					handleEvent: function(e) {
						if ('mousedown' == e.type) {
							e.preventDefault();
							this.pos = ('width' == this.mode) ? e.pageX : e.pageY;
							this.min = cssint('min-'+this.mode);
							this.max = cssint('max-'+this.mode);
							this.org = cssint(this.mode);
							addEventListener('mousemove', this);
							addEventListener('mouseup', this);
						} else if ('mousemove' == e.type) {
							const length = this.org + (('width' == this.mode ? e.pageX : e.pageY) - this.pos);
							if (length >= this.min && length <= this.max ) {
								this.source.style[this.mode] = length + 'px';
							}
						} else if ('mouseup' == e.type) {
							removeEventListener('mousemove', this);
							removeEventListener('mouseup', this);
						}
					}
				});
				if ('width' == mode) {
					source.observer = new ResizeObserver(() => {
						target.style.left = source.offsetWidth + 'px';
						Local.set(sClientSideKeyName, source.offsetWidth);
					});
				} else {
					source.observer = new ResizeObserver(() => {
						target.style.top = (4 + source.offsetTop + source.offsetHeight) + 'px';
						Local.set(sClientSideKeyName, source.offsetHeight);
					});
				}
			}
			source.observer.observe(source, { box: 'border-box' });
			const length = Local.get(sClientSideKeyName);
			if (length) {
				if ('width' == mode) {
					source.style.width = length + 'px';
				} else {
					source.style.height = length + 'px';
				}
			}
		} else {
			source.observer && source.observer.disconnect();
			source.classList.remove('resizable');
			target.removeAttribute('style');
			source.removeAttribute('style');
		}
	}

	initHorizontalLayoutResizer(sClientSideKeyName) {
		const top = doc.querySelector('.b-message-list-wrapper'),
			bottom = doc.querySelector('.b-message-view-wrapper'),
			fDisable = bDisable => {
				this.setLayoutResizer(top, bottom, sClientSideKeyName,
					(bDisable || !$htmlCL.contains('rl-bottom-preview-pane')) ? null : 'height');
			};
		if (top && bottom) {
			fDisable(false);
			addEventListener('rl-layout', e => fDisable(Layout.BottomPreview !== e.detail));
		}
	}

	initVerticalLayoutResizer(sClientSideKeyName) {
		const left = doc.getElementById('rl-left'),
			right = doc.getElementById('rl-right'),
			fDisable = bDisable => {
				this.setLayoutResizer(left, right, sClientSideKeyName, bDisable ? null : 'width');
			};
		if (left && right) {
			fDisable(false);
			leftPanelDisabled.subscribe(value => fDisable(value));
		}
	}

	logout() {
		Remote.logout(() => this.logoutReload(0 < (Settings.get('ParentEmail')||{length:0}).length));
	}

	bootstartTwoFactorScreen() {
		showScreenPopup(require('View/Popup/TwoFactorConfiguration'), [true]);
	}

	bootstartLoginScreen() {
		$htmlCL.remove('rl-user-auth');
		$htmlCL.add('rl-user-no-auth');
		startScreens([LoginUserScreen]);
	}

	bootend() {
		if (window.progressJs) {
			progressJs.end();
		}
		hideLoading();
	}

	bootstart() {
		super.bootstart();

		AppStore.populate();
		SettingsStore.populate();
		NotificationStore.populate();
		AccountStore.populate();
		ContactStore.populate();

		let contactsSyncInterval = pInt(Settings.get('ContactsSyncInterval'));

		const startupUrl = pString(Settings.get('StartupUrl'));

		if (window.progressJs) {
			progressJs.set(90);
		}

		rl.setWindowTitle();
		if (Settings.get('Auth')) {
			$htmlCL.add('rl-user-auth');

			if (
				Settings.capa(Capa.TwoFactor) &&
				Settings.capa(Capa.TwoFactorForce) &&
				Settings.get('RequireTwoFactor')
			) {
				this.bootend();
				this.bootstartTwoFactorScreen();
			} else {
				rl.setWindowTitle(i18n('TITLES/LOADING'));

				// require.ensure([], function() { // require code splitting

				this.foldersReload((value) => {
					this.bootend();

					if (value) {
						if (startupUrl) {
							routeOff();
							setHash(root(startupUrl), true);
							routeOn();
						}

						if (window.crypto && crypto.getRandomValues && Settings.capa(Capa.OpenPGP)) {
							const openpgpCallback = () => {
								if (!window.openpgp) {
									return false;
								}
								PgpStore.openpgp = openpgp;

								if (window.Worker) {
									try {
										PgpStore.openpgp.initWorker({ path: openPgpWorkerJs() });
									} catch (e) {
										console.log(e);
									}
								}

								PgpStore.openpgpKeyring = new openpgp.Keyring();
								PgpStore.capaOpenPGP(true);

								this.reloadOpenPgpKeys();

								return true;
							};

							if (!openpgpCallback()) {
								const script = doc.createElement('script');
								script.onload = openpgpCallback;
								script.onerror = () => console.error(script.src);
								script.src = openPgpJs();
								doc.head.append(script);
							}
						} else {
							PgpStore.capaOpenPGP(false);
						}

						startScreens([
							MailBoxUserScreen,
							Settings.capa(Capa.Settings) ? SettingsUserScreen : null
							// false ? AboutUserScreen : null
						]);

						setInterval(() => this.folderInformation(getFolderInboxName()), 120000);
						setInterval(() => {
							const sF = FolderStore.currentFolderFullNameRaw();
							if (getFolderInboxName() !== sF) {
								this.folderInformation(sF);
							}
						}, 180000);

						setTimeout(() => setInterval(this.folderInformationMultiply, 120000), 300000);
						setInterval(this.quota, 900000);
						setInterval(this.foldersReload, 1200000);

						contactsSyncInterval = 5 <= contactsSyncInterval ? contactsSyncInterval : 20;
						contactsSyncInterval = 320 >= contactsSyncInterval ? contactsSyncInterval : 320;

						setTimeout(this.contactsSync, 10000);
						setTimeout(() => this.folderInformationMultiply(true), 2000);

						setInterval(this.contactsSync, contactsSyncInterval * 60000 + 5000);

						this.accountsAndIdentities(true);

						setTimeout(() => {
							const sF = FolderStore.currentFolderFullNameRaw();
							if (getFolderInboxName() !== sF) {
								this.folderInformation(sF);
							}
						}, 1000);

						setTimeout(this.quota, 5000);
						setTimeout(() => Remote.appDelayStart(()=>{}), 35000);

						addEventListener('rl.auto-logout', () => this.logout());

						if (
							!!Settings.get('AccountSignMe') &&
							navigator.registerProtocolHandler &&
							Settings.capa(Capa.Composer)
						) {
							setTimeout(() => {
								try {
									navigator.registerProtocolHandler(
										'mailto',
										location.protocol + '//' + location.host + location.pathname + '?mailto&to=%s',
										'' + (Settings.get('Title') || 'RainLoop')
									);
								} catch (e) {} // eslint-disable-line no-empty

								if (Settings.get('MailToEmail')) {
									mailToHelper(Settings.get('MailToEmail'), require('View/Popup/Compose'));
								}
							}, 500);
						}

						if (!bMobileDevice) {
							const o = this;
							setTimeout(() => o.initVerticalLayoutResizer(ClientSideKeyName.FolderListSize), 1);
						}
					} else {
						this.logout();
					}
				});

				// }); // require code splitting
			}
		} else {
			this.bootend();
			this.bootstartLoginScreen();
		}

		setInterval(() => dispatchEvent(new CustomEvent('reload-time')), 60000);
	}
}

export default new AppUser();
