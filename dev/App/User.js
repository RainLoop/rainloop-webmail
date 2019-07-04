import window from 'window';
import _ from '_';
import $ from '$';
import progressJs from 'progressJs';

import {
	noop,
	trim,
	log,
	has,
	isArray,
	inArray,
	isUnd,
	isNormal,
	isPosNumeric,
	isNonEmptyArray,
	pInt,
	pString,
	delegateRunOnDestroy,
	mailToHelper,
	windowResize,
	jassl
} from 'Common/Utils';

import {
	Layout,
	Capa,
	StorageResultType,
	Notification,
	FolderType,
	SetSystemFoldersNotification,
	MessageSetAction,
	ClientSideKeyName,
	Magics
} from 'Common/Enums';

import { $html, leftPanelWidth, leftPanelDisabled, bAnimationSupported, bMobileDevice } from 'Common/Globals';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { runHook } from 'Common/Plugins';
import { momentNowUnix, reload as momentReload } from 'Common/Momentor';

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
	openPgpJs,
	socialGoogle,
	socialTwitter,
	socialFacebook
} from 'Common/Links';

import * as Events from 'Common/Events';

import { getNotification, i18n } from 'Common/Translator';

import SocialStore from 'Stores/Social';
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
import * as Settings from 'Storage/Settings';
import { checkTimestamp } from 'Storage/RainLoop';

import Remote from 'Remote/User/Ajax';
import Promises from 'Promises/User/Ajax';

import { EmailModel } from 'Model/Email';
import { AccountModel } from 'Model/Account';
import { IdentityModel } from 'Model/Identity';
import { TemplateModel } from 'Model/Template';
import { OpenPgpKeyModel } from 'Model/OpenPgpKey';

// import {AboutUserScreen} from 'Screen/User/About';
import { LoginUserScreen } from 'Screen/User/Login';
import { MailBoxUserScreen } from 'Screen/User/MailBox';
import { SettingsUserScreen } from 'Screen/User/Settings';

import { hideLoading, routeOff, routeOn, setHash, startScreens, showScreenPopup } from 'Knoin/Knoin';

import { AbstractApp } from 'App/Abstract';

class AppUser extends AbstractApp {
	constructor() {
		super(Remote);

		this.moveCache = {};

		this.quotaDebounce = _.debounce(this.quota, Magics.Time30s);
		this.moveOrDeleteResponseHelper = _.bind(this.moveOrDeleteResponseHelper, this);

		this.messagesMoveTrigger = _.debounce(this.messagesMoveTrigger, 500);

		window.setInterval(() => Events.pub('interval.30s'), Magics.Time30s);
		window.setInterval(() => Events.pub('interval.1m'), Magics.Time1m);
		window.setInterval(() => Events.pub('interval.2m'), Magics.Time2m);
		window.setInterval(() => Events.pub('interval.3m'), Magics.Time3m);
		window.setInterval(() => Events.pub('interval.5m'), Magics.Time5m);
		window.setInterval(() => Events.pub('interval.10m'), Magics.Time10m);
		window.setInterval(() => Events.pub('interval.15m'), Magics.Time15m);
		window.setInterval(() => Events.pub('interval.20m'), Magics.Time20m);

		window.setTimeout(() => window.setInterval(() => Events.pub('interval.2m-after5m'), Magics.Time2m), Magics.Time5m);
		window.setTimeout(() => window.setInterval(() => Events.pub('interval.5m-after5m'), Magics.Time5m), Magics.Time5m);
		window.setTimeout(
			() => window.setInterval(() => Events.pub('interval.10m-after5m'), Magics.Time10m),
			Magics.Time5m
		);

		$.wakeUp(
			() => {
				if (checkTimestamp()) {
					this.reload();
				}

				Remote.jsVersion((sResult, oData) => {
					if (StorageResultType.Success === sResult && oData && !oData.Result) {
						this.reload();
					}
				}, Settings.appSettingsGet('version'));
			},
			{},
			Magics.Time60m
		);

		if (checkTimestamp()) {
			this.reload();
		}

		if (Settings.settingsGet('UserBackgroundHash')) {
			_.delay(() => {
				$('#rl-bg')
					.attr('style', 'background-image: none !important;')
					.backstretch(userBackground(Settings.settingsGet('UserBackgroundHash')), {
						fade: bAnimationSupported ? Magics.Time1s : 0,
						centeredX: true,
						centeredY: true
					})
					.removeAttr('style');
			}, Magics.Time1s);
		}

		this.socialUsers = _.bind(this.socialUsers, this);
	}

	remote() {
		return Remote;
	}

	reload() {
		if (window.parent && !!Settings.appSettingsGet('inIframe')) {
			window.parent.location.reload();
		} else {
			window.location.reload();
		}
	}

	reloadFlagsCurrentMessageListAndMessageFromCache() {
		_.each(MessageStore.messageList(), (message) => {
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
		Remote.messageList(noop, getFolderInboxName(), 0, SettingsStore.messagesPerPage(), '', '', true);
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

		_.each(this.moveCache, (item) => {
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

		this.moveCache[hash].Uid = _.union(this.moveCache[hash].Uid, uidsForMove);
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
			if (oData && isArray(oData.Result) && 2 === oData.Result.length) {
				setFolderHash(oData.Result[0], oData.Result[1]);
			} else {
				setFolderHash(FolderStore.currentFolderFullNameRaw(), '');

				if (oData && -1 < inArray(oData.ErrorCode, [Notification.CantMoveMessage, Notification.CantCopyMessage])) {
					window.alert(getNotification(oData.ErrorCode));
				}
			}

			this.reloadMessageList(0 === MessageStore.messageList().length);
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

		bUseFolder = isUnd(bUseFolder) ? true : !!bUseFolder;
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
		if (sFromFolderFullNameRaw !== sToFolderFullNameRaw && isArray(aUidForMove) && 0 < aUidForMove.length) {
			const oFromFolder = getFolderFromCacheList(sFromFolderFullNameRaw),
				oToFolder = getFolderFromCacheList(sToFolderFullNameRaw);

			if (oFromFolder && oToFolder) {
				if (isUnd(bCopy) ? false : !!bCopy) {
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
					_.delay(() => {
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

			_.each(openpgpKeys, (oItem, iIndex) => {
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
						_.each(oItem.users, (item) => {
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
								_.uniq(_.compact(_.map(oItem.getKeyIds(), (item) => (item && item.toHex ? item.toHex() : null)))),
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

	accountsCounts() {
		return false;
		// AccountStore.accounts.loading(true);
		//
		// Remote.accountsCounts((sResult, oData) => {
		//
		// 	AccountStore.accounts.loading(false);
		//
		// 	if (StorageResultType.Success === sResult && oData.Result && oData.Result['Counts'])
		// 	{
		// 		var
		// 			sEmail = AccountStore.email(),
		// 			aAcounts = AccountStore.accounts()
		// 		;
		//
		// 		_.each(oData.Result['Counts'], (oItem) => {
		//
		// 			var oAccount = _.find(aAcounts, (oAccount) => {
		// 				return oAccount && oItem[0] === oAccount.email && sEmail !== oAccount.email;
		// 			});
		//
		// 			if (oAccount)
		// 			{
		// 				oAccount.count(pInt(oItem[1]));
		// 			}
		// 		});
		// 	}
		// });
	}

	accountsAndIdentities(bBoot) {
		AccountStore.accounts.loading(true);
		IdentityStore.identities.loading(true);

		Remote.accountsAndIdentities((sResult, oData) => {
			AccountStore.accounts.loading(false);
			IdentityStore.identities.loading(false);

			if (StorageResultType.Success === sResult && oData.Result) {
				const counts = {},
					sAccountEmail = AccountStore.email();
				let parentEmail = Settings.settingsGet('ParentEmail');

				parentEmail = '' === parentEmail ? sAccountEmail : parentEmail;

				if (isArray(oData.Result.Accounts)) {
					_.each(AccountStore.accounts(), (oAccount) => {
						counts[oAccount.email] = oAccount.count();
					});

					delegateRunOnDestroy(AccountStore.accounts());

					AccountStore.accounts(
						_.map(
							oData.Result.Accounts,
							(sValue) => new AccountModel(sValue, sValue !== parentEmail, counts[sValue] || 0)
						)
					);
				}

				if (isUnd(bBoot) ? false : !!bBoot) {
					_.delay(() => this.accountsCounts(), 1000 * 5);
					Events.sub('interval.10m-after5m', () => this.accountsCounts());
				}

				if (isArray(oData.Result.Identities)) {
					delegateRunOnDestroy(IdentityStore.identities());

					IdentityStore.identities(
						_.map(oData.Result.Identities, (identityData) => {
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

			if (StorageResultType.Success === result && data.Result && isArray(data.Result.Templates)) {
				delegateRunOnDestroy(TemplateStore.templates());

				TemplateStore.templates(
					_.compact(
						_.map(data.Result.Templates, (templateData) => {
							const template = new TemplateModel();
							return template.parse(templateData) ? template : null;
						})
					)
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
				isArray(data.Result) &&
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
		if ('' !== trim(folder)) {
			Remote.folderInformation(
				(result, data) => {
					if (StorageResultType.Success === result) {
						if (data && data.Result && data.Result.Hash && data.Result.Folder) {
							let uid = '',
								check = false,
								unreadCountChange = false;

							const folderFromCache = getFolderFromCacheList(data.Result.Folder);
							if (folderFromCache) {
								folderFromCache.interval = momentNowUnix();

								if (data.Result.Hash) {
									setFolderHash(data.Result.Folder, data.Result.Hash);
								}

								if (isNormal(data.Result.MessageCount)) {
									folderFromCache.messageCountAll(data.Result.MessageCount);
								}

								if (isNormal(data.Result.MessageUnseenCount)) {
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
										if (has(data.Result.Flags, uid)) {
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
								if (data.Result.Hash !== hash || '' === hash || unreadCountChange) {
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
						const utc = momentNowUnix();
						_.each(oData.Result.List, (item) => {
							const hash = getFolderHash(item.Folder),
								folder = getFolderFromCacheList(item.Folder);
							let unreadCountChange = false;

							if (folder) {
								folder.interval = utc;

								if (item.Hash) {
									setFolderHash(item.Folder, item.Hash);
								}

								if (isNormal(item.MessageCount)) {
									folder.messageCountAll(item.MessageCount);
								}

								if (isNormal(item.MessageUnseenCount)) {
									if (pInt(folder.messageCountUnread()) !== pInt(item.MessageUnseenCount)) {
										unreadCountChange = true;
									}

									folder.messageCountUnread(item.MessageUnseenCount);
								}

								if (unreadCountChange) {
									clearMessageFlagsFromCacheByFolder(folder.fullNameRaw);
								}

								if (item.Hash !== hash || '' === hash) {
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
							_.delay(() => this.folderInformationMultiply(true), 2000);
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

		if (isUnd(messages) || !messages) {
			messages = MessageStore.messageListChecked();
		}

		rootUids = _.uniq(_.compact(_.map(messages, (oMessage) => (oMessage && oMessage.uid ? oMessage.uid : null))));

		if ('' !== sFolderFullNameRaw && 0 < rootUids.length) {
			switch (iSetAction) {
				case MessageSetAction.SetSeen:
					_.each(rootUids, (sSubUid) => {
						alreadyUnread += storeMessageFlagsToCacheBySetAction(sFolderFullNameRaw, sSubUid, iSetAction);
					});

					folder = getFolderFromCacheList(sFolderFullNameRaw);
					if (folder) {
						folder.messageCountUnread(folder.messageCountUnread() - alreadyUnread);
					}

					Remote.messageSetSeen(noop, sFolderFullNameRaw, rootUids, true);
					break;

				case MessageSetAction.UnsetSeen:
					_.each(rootUids, (sSubUid) => {
						alreadyUnread += storeMessageFlagsToCacheBySetAction(sFolderFullNameRaw, sSubUid, iSetAction);
					});

					folder = getFolderFromCacheList(sFolderFullNameRaw);
					if (folder) {
						folder.messageCountUnread(folder.messageCountUnread() - alreadyUnread + rootUids.length);
					}

					Remote.messageSetSeen(noop, sFolderFullNameRaw, rootUids, false);
					break;

				case MessageSetAction.SetFlag:
					_.each(rootUids, (sSubUid) => {
						storeMessageFlagsToCacheBySetAction(sFolderFullNameRaw, sSubUid, iSetAction);
					});

					Remote.messageSetFlagged(noop, sFolderFullNameRaw, rootUids, true);
					break;

				case MessageSetAction.UnsetFlag:
					_.each(rootUids, (sSubUid) => {
						storeMessageFlagsToCacheBySetAction(sFolderFullNameRaw, sSubUid, iSetAction);
					});

					Remote.messageSetFlagged(noop, sFolderFullNameRaw, rootUids, false);
					break;
				// no default
			}

			this.reloadFlagsCurrentMessageListAndMessageFromCache();
			MessageStore.message.viewTrigger(!MessageStore.message.viewTrigger());
		}
	}

	googleConnect() {
		window.open(
			socialGoogle(),
			'Google',
			'left=200,top=100,width=650,height=600,menubar=no,status=no,resizable=yes,scrollbars=yes'
		);
	}

	twitterConnect() {
		window.open(
			socialTwitter(),
			'Twitter',
			'left=200,top=100,width=650,height=350,menubar=no,status=no,resizable=yes,scrollbars=yes'
		);
	}

	facebookConnect() {
		window.open(
			socialFacebook(),
			'Facebook',
			'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes'
		);
	}

	/**
	 * @param {boolean=} fireAllActions = false
	 */
	socialUsers(fireAllActions = false) {
		if (true === fireAllActions) {
			SocialStore.google.loading(true);
			SocialStore.facebook.loading(true);
			SocialStore.twitter.loading(true);
		}

		Remote.socialUsers((result, data) => {
			if (StorageResultType.Success === result && data && data.Result) {
				SocialStore.google.userName(data.Result.Google || '');
				SocialStore.facebook.userName(data.Result.Facebook || '');
				SocialStore.twitter.userName(data.Result.Twitter || '');
			} else {
				SocialStore.google.userName('');
				SocialStore.facebook.userName('');
				SocialStore.twitter.userName('');
			}

			SocialStore.google.loading(false);
			SocialStore.facebook.loading(false);
			SocialStore.twitter.loading(false);
		});
	}

	googleDisconnect() {
		SocialStore.google.loading(true);
		Remote.googleDisconnect(this.socialUsers);
	}

	facebookDisconnect() {
		SocialStore.facebook.loading(true);
		Remote.facebookDisconnect(this.socialUsers);
	}

	twitterDisconnect() {
		SocialStore.twitter.loading(true);
		Remote.twitterDisconnect(this.socialUsers);
	}

	/**
	 * @param {string} query
	 * @param {Function} autocompleteCallback
	 */
	getAutocomplete(query, autocompleteCallback) {
		Remote.suggestions((result, data) => {
			if (StorageResultType.Success === result && data && isArray(data.Result)) {
				autocompleteCallback(
					_.compact(_.map(data.Result, (item) => (item && item[0] ? new EmailModel(item[0], item[1]) : null)))
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
		if (!isArray(aExpandedList)) {
			aExpandedList = [];
		}

		if (bExpanded) {
			aExpandedList.push(sFullNameHash);
			aExpandedList = _.uniq(aExpandedList);
		} else {
			aExpandedList = _.without(aExpandedList, sFullNameHash);
		}

		Local.set(ClientSideKeyName.ExpandedFolders, aExpandedList);
	}

	initHorizontalLayoutResizer(sClientSideKeyName) {
		let top = null,
			bottom = null;

		const minHeight = 200,
			maxHeight = 500,
			fSetHeight = (height) => {
				if (height) {
					if (top) {
						top.attr('style', 'height:' + height + 'px');
					}

					if (bottom) {
						bottom.attr('style', 'top:' + (55 /* top toolbar */ + height) + 'px');
					}
				}
			},
			fResizeCreateFunction = (event) => {
				if (event && event.target) {
					$(event.target)
						.find('.ui-resizable-handle')
						.on('mousedown', () => {
							$html.addClass('rl-resizer');
						})
						.on('mouseup', () => {
							$html.removeClass('rl-resizer');
						});
				}
			},
			fResizeStartFunction = () => {
				$html.addClass('rl-resizer');
			},
			fResizeResizeFunction = _.debounce(
				() => {
					$html.addClass('rl-resizer');
				},
				500,
				true
			),
			fResizeStopFunction = (oEvent, oObject) => {
				$html.removeClass('rl-resizer');
				if (oObject && oObject.size && oObject.size.height) {
					Local.set(sClientSideKeyName, oObject.size.height);

					fSetHeight(oObject.size.height);

					windowResize();
				}
			},
			oOptions = {
				helper: 'ui-resizable-helper-h',
				minHeight: minHeight,
				maxHeight: maxHeight,
				handles: 's',
				create: fResizeCreateFunction,
				resize: fResizeResizeFunction,
				start: fResizeStartFunction,
				stop: fResizeStopFunction
			},
			fDisable = (bDisable) => {
				if (bDisable) {
					if (top && top.hasClass('ui-resizable')) {
						top.resizable('destroy').removeAttr('style');
					}

					if (bottom) {
						bottom.removeAttr('style');
					}
				} else if ($html.hasClass('rl-bottom-preview-pane')) {
					top = $('.b-message-list-wrapper');
					bottom = $('.b-message-view-wrapper');

					if (!top.hasClass('ui-resizable')) {
						top.resizable(oOptions);
					}

					const iHeight = pInt(Local.get(sClientSideKeyName)) || 300;
					fSetHeight(iHeight > minHeight ? iHeight : minHeight);
				}
			};

		fDisable(false);

		Events.sub('layout', (layout) => {
			fDisable(Layout.BottomPreview !== layout);
		});
	}

	initVerticalLayoutResizer(sClientSideKeyName) {
		const disabledWidth = 60,
			minWidth = 155,
			lLeft = $('#rl-left'),
			right = $('#rl-right'),
			mLeftWidth = Local.get(sClientSideKeyName) || null,
			fSetWidth = (iWidth) => {
				if (iWidth) {
					leftPanelWidth(iWidth);

					$html.removeClass('rl-resizer');

					lLeft.css({
						width: '' + iWidth + 'px'
					});

					right.css({
						left: '' + iWidth + 'px'
					});
				}
			},
			fDisable = (bDisable) => {
				if (bDisable) {
					lLeft.resizable('disable');
					fSetWidth(disabledWidth);
				} else {
					lLeft.resizable('enable');
					const width = pInt(Local.get(sClientSideKeyName)) || minWidth;
					fSetWidth(width > minWidth ? width : minWidth);
				}
			},
			fResizeCreateFunction = (event) => {
				if (event && event.target) {
					$(event.target)
						.find('.ui-resizable-handle')
						.on('mousedown', () => {
							$html.addClass('rl-resizer');
						})
						.on('mouseup', () => {
							$html.removeClass('rl-resizer');
						});
				}
			},
			fResizeResizeFunction = _.debounce(
				() => {
					$html.addClass('rl-resizer');
				},
				500,
				true
			),
			fResizeStartFunction = () => {
				$html.addClass('rl-resizer');
			},
			fResizeStopFunction = (event, obj) => {
				$html.removeClass('rl-resizer');
				if (obj && obj.size && obj.size.width) {
					Local.set(sClientSideKeyName, obj.size.width);

					leftPanelWidth(obj.size.width);

					right.css({
						left: '' + obj.size.width + 'px'
					});

					lLeft.css({
						position: '',
						top: '',
						left: '',
						height: ''
					});
				}
			};

		if (null !== mLeftWidth) {
			fSetWidth(mLeftWidth > minWidth ? mLeftWidth : minWidth);
		}

		lLeft.resizable({
			helper: 'ui-resizable-helper-w',
			minWidth: minWidth,
			maxWidth: Magics.Size350px,
			handles: 'e',
			create: fResizeCreateFunction,
			resize: fResizeResizeFunction,
			start: fResizeStartFunction,
			stop: fResizeStopFunction
		});

		Events.sub('left-panel.off', () => {
			fDisable(true);
		});

		Events.sub('left-panel.on', () => {
			fDisable(false);
		});
	}

	logout() {
		Remote.logout(() => {
			this.loginAndLogoutReload(
				false,
				true,
				Settings.settingsGet('ParentEmail') && 0 < Settings.settingsGet('ParentEmail').length
			);
		});
	}

	bootstartTwoFactorScreen() {
		showScreenPopup(require('View/Popup/TwoFactorConfiguration'), [true]);
	}

	bootstartWelcomePopup(url) {
		showScreenPopup(require('View/Popup/WelcomePage'), [url]);
	}

	bootstartLoginScreen() {
		$html.removeClass('rl-user-auth').addClass('rl-user-no-auth');

		const customLoginLink = pString(Settings.appSettingsGet('customLoginLink'));
		if (!customLoginLink) {
			startScreens([LoginUserScreen]);

			runHook('rl-start-login-screens');
			Events.pub('rl.bootstart-login-screens');
		} else {
			routeOff();
			setHash(root(), true);
			routeOff();

			_.defer(() => {
				window.location.href = customLoginLink;
			});
		}
	}

	bootend() {
		if (progressJs) {
			progressJs.set(100).end();
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

		let contactsSyncInterval = pInt(Settings.settingsGet('ContactsSyncInterval'));

		const jsHash = Settings.appSettingsGet('jsHash'),
			startupUrl = pString(Settings.settingsGet('StartupUrl')),
			allowGoogle = Settings.settingsGet('AllowGoogleSocial'),
			allowFacebook = Settings.settingsGet('AllowFacebookSocial'),
			allowTwitter = Settings.settingsGet('AllowTwitterSocial');

		if (progressJs) {
			progressJs.set(90);
		}

		leftPanelDisabled.subscribe((value) => {
			Events.pub('left-panel.' + (value ? 'off' : 'on'));
		});

		this.setWindowTitle('');
		if (Settings.settingsGet('Auth')) {
			$html.addClass('rl-user-auth');

			if (
				Settings.capa(Capa.TwoFactor) &&
				Settings.capa(Capa.TwoFactorForce) &&
				Settings.settingsGet('RequireTwoFactor')
			) {
				this.bootend();
				this.bootstartTwoFactorScreen();
			} else {
				this.setWindowTitle(i18n('TITLES/LOADING'));

				// require.ensure([], function() { // require code splitting

				this.foldersReload((value) => {
					this.bootend();

					if (value) {
						if ('' !== startupUrl) {
							routeOff();
							setHash(root(startupUrl), true);
							routeOn();
						}

						if (jassl && window.crypto && window.crypto.getRandomValues && Settings.capa(Capa.OpenPGP)) {
							const openpgpCallback = (openpgp) => {
								PgpStore.openpgp = openpgp;

								if (window.Worker) {
									try {
										PgpStore.openpgp.initWorker({ path: openPgpWorkerJs() });
									} catch (e) {
										log(e);
									}
								}

								PgpStore.openpgpKeyring = new openpgp.Keyring();
								PgpStore.capaOpenPGP(true);

								Events.pub('openpgp.init');

								this.reloadOpenPgpKeys();
							};

							if (window.openpgp) {
								openpgpCallback(window.openpgp);
							} else {
								jassl(openPgpJs()).then(() => {
									if (window.openpgp) {
										openpgpCallback(window.openpgp);
									}
								});
							}
						} else {
							PgpStore.capaOpenPGP(false);
						}

						startScreens([
							MailBoxUserScreen,
							Settings.capa(Capa.Settings) ? SettingsUserScreen : null
							// false ? AboutUserScreen : null
						]);

						if (allowGoogle || allowFacebook || allowTwitter) {
							this.socialUsers(true);
						}

						Events.sub('interval.2m', () => this.folderInformation(getFolderInboxName()));
						Events.sub('interval.3m', () => {
							const sF = FolderStore.currentFolderFullNameRaw();
							if (getFolderInboxName() !== sF) {
								this.folderInformation(sF);
							}
						});

						Events.sub('interval.2m-after5m', () => this.folderInformationMultiply());
						Events.sub('interval.15m', () => this.quota());
						Events.sub('interval.20m', () => this.foldersReload());

						contactsSyncInterval = 5 <= contactsSyncInterval ? contactsSyncInterval : 20;
						contactsSyncInterval = 320 >= contactsSyncInterval ? contactsSyncInterval : 320;

						_.delay(() => this.contactsSync(), Magics.Time10s);
						_.delay(() => this.folderInformationMultiply(true), Magics.Time2s);

						window.setInterval(() => this.contactsSync(), contactsSyncInterval * 60000 + 5000);

						this.accountsAndIdentities(true);

						_.delay(() => {
							const sF = FolderStore.currentFolderFullNameRaw();
							if (getFolderInboxName() !== sF) {
								this.folderInformation(sF);
							}
						}, 1000);

						_.delay(() => this.quota(), 5000);
						_.delay(() => Remote.appDelayStart(noop), 35000);

						Events.sub('rl.auto-logout', () => this.logout());

						runHook('rl-start-user-screens');
						Events.pub('rl.bootstart-user-screens');

						if (Settings.settingsGet('WelcomePageUrl')) {
							_.delay(() => this.bootstartWelcomePopup(Settings.settingsGet('WelcomePageUrl')), 1000);
						}

						if (
							!!Settings.settingsGet('AccountSignMe') &&
							window.navigator.registerProtocolHandler &&
							Settings.capa(Capa.Composer)
						) {
							_.delay(() => {
								try {
									window.navigator.registerProtocolHandler(
										'mailto',
										window.location.protocol + '//' + window.location.host + window.location.pathname + '?mailto&to=%s',
										'' + (Settings.settingsGet('Title') || 'RainLoop')
									);
								} catch (e) {} // eslint-disable-line no-empty

								if (Settings.settingsGet('MailToEmail')) {
									mailToHelper(Settings.settingsGet('MailToEmail'), require('View/Popup/Compose'));
								}
							}, 500);
						}

						if (!bMobileDevice) {
							_.defer(() => this.initVerticalLayoutResizer(ClientSideKeyName.FolderListSize));
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

		if (allowGoogle) {
			window['rl_' + jsHash + '_google_service'] = () => {
				SocialStore.google.loading(true);
				this.socialUsers();
			};
		}

		if (allowFacebook) {
			window['rl_' + jsHash + '_facebook_service'] = () => {
				SocialStore.facebook.loading(true);
				this.socialUsers();
			};
		}

		if (allowTwitter) {
			window['rl_' + jsHash + '_twitter_service'] = () => {
				SocialStore.twitter.loading(true);
				this.socialUsers();
			};
		}

		Events.sub('interval.1m', () => momentReload());

		runHook('rl-start-screens');
		Events.pub('rl.bootstart-end');
	}
}

export default new AppUser();
