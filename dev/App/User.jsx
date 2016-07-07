
import window from 'window';
import _ from '_';
import $ from '$';
import progressJs from 'progressJs';
import Tinycon from 'Tinycon';

import {
	noop, trim, log, has, isArray, inArray, isUnd, isNormal, isPosNumeric, isNonEmptyArray,
	pInt, pString, delegateRunOnDestroy, mailToHelper, windowResize
} from 'Common/Utils';

import {
	Layout, Capa, StorageResultType, Notification, FolderType,
	SetSystemFoldersNotification, MessageSetAction, ClientSideKeyName
} from 'Common/Enums';

import {
	$html,
	leftPanelWidth, leftPanelDisabled,
	bAnimationSupported, bMobileDevice
} from 'Common/Globals';

import {UNUSED_OPTION_VALUE} from 'Common/Consts';
import * as Plugins from 'Common/Plugins';
import * as Links from 'Common/Links';
import * as Events from 'Common/Events';
import * as Momentor from 'Common/Momentor';
import * as Cache from 'Common/Cache';
import {getNotification, i18n} from 'Common/Translator';

import SocialStore from 'Stores/Social';
import SettingsStore from 'Stores/User/Settings';
import AccountStore from 'Stores/User/Account';
import IdentityStore from 'Stores/User/Identity';
import TemplateStore from 'Stores/User/Template';
import FolderStore from 'Stores/User/Folder';
import PgpStore from 'Stores/User/Pgp';
import MessageStore from 'Stores/User/Message';
import ContactStore from 'Stores/User/Contact';

import * as Local from 'Storage/Client';
import * as Settings from 'Storage/Settings';
import {checkTimestamp} from 'Storage/RainLoop';

import Remote from 'Remote/User/Ajax';
import Promises from 'Promises/User/Ajax';

import {EmailModel} from 'Model/Email';
import {AccountModel} from 'Model/Account';
import {IdentityModel} from 'Model/Identity';
import {TemplateModel} from 'Model/Template';
import {OpenPgpKeyModel} from 'Model/OpenPgpKey';

// import {AboutUserScreen} from 'Screen/User/About';
import {LoginUserScreen} from 'Screen/User/Login';
import {MailBoxUserScreen} from 'Screen/User/MailBox';
import {SettingsUserScreen} from 'Screen/User/Settings';

import {
	hideLoading, routeOff, routeOn, setHash,
	startScreens, showScreenPopup
} from 'Knoin/Knoin';

import {AbstractApp} from 'App/Abstract';

class AppUser extends AbstractApp
{
	constructor()
	{
		super(Remote);

		this.moveCache = {};

		this.quotaDebounce = _.debounce(this.quota, 1000 * 30);
		this.moveOrDeleteResponseHelper = _.bind(this.moveOrDeleteResponseHelper, this);

		this.messagesMoveTrigger = _.debounce(this.messagesMoveTrigger, 500);

		window.setInterval(() => Events.pub('interval.30s'), 30000);
		window.setInterval(() => Events.pub('interval.1m'), 60000);
		window.setInterval(() => Events.pub('interval.2m'), 60000 * 2);
		window.setInterval(() => Events.pub('interval.3m'), 60000 * 3);
		window.setInterval(() => Events.pub('interval.5m'), 60000 * 5);
		window.setInterval(() => Events.pub('interval.10m'), 60000 * 10);
		window.setInterval(() => Events.pub('interval.15m'), 60000 * 15);
		window.setInterval(() => Events.pub('interval.20m'), 60000 * 15);

		window.setTimeout(() => window.setInterval(() => Events.pub('interval.2m-after5m'), 60000 * 2), 60000 * 5);
		window.setTimeout(() =>	window.setInterval(() => Events.pub('interval.5m-after5m'), 60000 * 5), 60000 * 5);
		window.setTimeout(() => window.setInterval(() => Events.pub('interval.10m-after5m'), 60000 * 10), 60000 * 5);

		$.wakeUp(() => {
			if (checkTimestamp())
			{
				this.reload();
			}

			Remote.jsVersion((sResult, oData) => {
				if (StorageResultType.Success === sResult && oData && !oData.Result)
				{
					this.reload();
				}
			}, Settings.appSettingsGet('version'));

		}, {}, 60 * 60 * 1000);

		if (checkTimestamp())
		{
			this.reload();
		}

		if (Settings.settingsGet('UserBackgroundHash'))
		{
			_.delay(() => {
				$('#rl-bg')
					.attr('style', 'background-image: none !important;')
					.backstretch(Links.userBackground(Settings.settingsGet('UserBackgroundHash')), {
						fade: bAnimationSupported ? 1000 : 0,
						centeredX: true,
						centeredY: true
					})
					.removeAttr('style');
			}, 1000);
		}

		this.socialUsers = _.bind(this.socialUsers, this);
	}

	remote() {
		return Remote;
	}

	reload() {
		if (window.parent && !!Settings.appSettingsGet('inIframe'))
		{
			window.parent.location.reload();
		}
		else
		{
			window.location.reload();
		}
	}

	reloadFlagsCurrentMessageListAndMessageFromCache() {
		_.each(MessageStore.messageList(), (message) => {
			Cache.initMessageFlagsFromCache(message);
		});
		Cache.initMessageFlagsFromCache(MessageStore.message());
	}

	/**
	 * @param {boolean=} bDropPagePosition = false
	 * @param {boolean=} bDropCurrenFolderCache = false
	 */
	reloadMessageList(bDropPagePosition = false, bDropCurrenFolderCache = false) {

		let
			iOffset = (MessageStore.messageListPage() - 1) * SettingsStore.messagesPerPage();

		if (bDropCurrenFolderCache)
		{
			Cache.setFolderHash(FolderStore.currentFolderFullNameRaw(), '');
		}

		if (bDropPagePosition)
		{
			MessageStore.messageListPage(1);
			MessageStore.messageListPageBeforeThread(1);
			iOffset = 0;

			setHash(Links.mailBox(
				FolderStore.currentFolderFullNameHash(),
				MessageStore.messageListPage(),
				MessageStore.messageListSearch(),
				MessageStore.messageListThreadUid()
			), true, true);
		}

		MessageStore.messageListLoading(true);
		Remote.messageList((sResult, oData, bCached) => {

			if (StorageResultType.Success === sResult && oData && oData.Result)
			{
				MessageStore.messageListError('');
				MessageStore.messageListLoading(false);

				MessageStore.setMessageList(oData, bCached);
			}
			else if (StorageResultType.Unload === sResult)
			{
				MessageStore.messageListError('');
				MessageStore.messageListLoading(false);
			}
			else if (StorageResultType.Abort !== sResult)
			{
				MessageStore.messageList([]);
				MessageStore.messageListLoading(false);
				MessageStore.messageListError(oData && oData.ErrorCode ?
					getNotification(oData.ErrorCode) : i18n('NOTIFICATIONS/CANT_GET_MESSAGE_LIST')
				);
			}

		}, FolderStore.currentFolderFullNameRaw(), iOffset, SettingsStore.messagesPerPage(),
			MessageStore.messageListSearch(), MessageStore.messageListThreadUid());
	}

	recacheInboxMessageList() {
		Remote.messageList(noop, Cache.getFolderInboxName(), 0, SettingsStore.messagesPerPage(), '', '', true);
	}

	/**
	 * @param {Function} fResultFunc
	 * @returns {boolean}
	 */
	contactsSync(fResultFunc) {

		const oContacts = ContactStore.contacts;
		if (oContacts.importing() || oContacts.syncing() || !ContactStore.enableContactsSync() || !ContactStore.allowContactsSync())
		{
			return false;
		}

		oContacts.syncing(true);

		Remote.contactsSync((sResult, oData) => {

			oContacts.syncing(false);

			if (fResultFunc)
			{
				fResultFunc(sResult, oData);
			}
		});

		return true;
	}

	messagesMoveTrigger() {

		const
			sTrashFolder = FolderStore.trashFolder(),
			sSpamFolder = FolderStore.spamFolder();

		_.each(this.moveCache, (oItem) => {

			var
				bSpam = sSpamFolder === oItem.To,
				bTrash = sTrashFolder === oItem.To,
				bHam = !bSpam && sSpamFolder === oItem.From && Cache.getFolderInboxName() === oItem.To;

			Remote.messagesMove(this.moveOrDeleteResponseHelper, oItem.From, oItem.To, oItem.Uid,
				bSpam ? 'SPAM' : (bHam ? 'HAM' : ''), bSpam || bTrash);
		});

		this.moveCache = {};
	}

	messagesMoveHelper(sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForMove) {

		var sH = '$$' + sFromFolderFullNameRaw + '$$' + sToFolderFullNameRaw + '$$';
		if (!this.moveCache[sH])
		{
			this.moveCache[sH] = {
				From: sFromFolderFullNameRaw,
				To: sToFolderFullNameRaw,
				Uid: []
			};
		}

		this.moveCache[sH].Uid = _.union(this.moveCache[sH].Uid, aUidForMove);
		this.messagesMoveTrigger();
	}

	messagesCopyHelper(sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForCopy) {
		Remote.messagesCopy(
			this.moveOrDeleteResponseHelper,
			sFromFolderFullNameRaw,
			sToFolderFullNameRaw,
			aUidForCopy
		);
	}

	messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove) {
		Remote.messagesDelete(
			this.moveOrDeleteResponseHelper,
			sFromFolderFullNameRaw,
			aUidForRemove
		);
	}

	moveOrDeleteResponseHelper(sResult, oData) {

		if (StorageResultType.Success === sResult && FolderStore.currentFolder())
		{
			if (oData && isArray(oData.Result) && 2 === oData.Result.length)
			{
				Cache.setFolderHash(oData.Result[0], oData.Result[1]);
			}
			else
			{
				Cache.setFolderHash(FolderStore.currentFolderFullNameRaw(), '');

				if (oData && -1 < inArray(oData.ErrorCode,
					[Notification.CantMoveMessage, Notification.CantCopyMessage]))
				{
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

		let
			oMoveFolder = null,
			nSetSystemFoldersNotification = null;

		switch (iDeleteType)
		{
			case FolderType.Spam:
				oMoveFolder = Cache.getFolderFromCacheList(FolderStore.spamFolder());
				nSetSystemFoldersNotification = SetSystemFoldersNotification.Spam;
				break;
			case FolderType.NotSpam:
				oMoveFolder = Cache.getFolderFromCacheList(Cache.getFolderInboxName());
				break;
			case FolderType.Trash:
				oMoveFolder = Cache.getFolderFromCacheList(FolderStore.trashFolder());
				nSetSystemFoldersNotification = SetSystemFoldersNotification.Trash;
				break;
			case FolderType.Archive:
				oMoveFolder = Cache.getFolderFromCacheList(FolderStore.archiveFolder());
				nSetSystemFoldersNotification = SetSystemFoldersNotification.Archive;
				break;
			// no default
		}

		bUseFolder = isUnd(bUseFolder) ? true : !!bUseFolder;
		if (bUseFolder)
		{
			if ((FolderType.Spam === iDeleteType && UNUSED_OPTION_VALUE === FolderStore.spamFolder()) ||
				(FolderType.Trash === iDeleteType && UNUSED_OPTION_VALUE === FolderStore.trashFolder()) ||
				(FolderType.Archive === iDeleteType && UNUSED_OPTION_VALUE === FolderStore.archiveFolder()))
			{
				bUseFolder = false;
			}
		}

		if (!oMoveFolder && bUseFolder)
		{
			showScreenPopup(require('View/Popup/FolderSystem'), [nSetSystemFoldersNotification]);
		}
		else if (!bUseFolder || (FolderType.Trash === iDeleteType &&
			(sFromFolderFullNameRaw === FolderStore.spamFolder() || sFromFolderFullNameRaw === FolderStore.trashFolder())))
		{
			showScreenPopup(require('View/Popup/Ask'), [i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'), () => {
				this.messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove);
				MessageStore.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove);
			}]);
		}
		else if (oMoveFolder)
		{
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

		if (sFromFolderFullNameRaw !== sToFolderFullNameRaw && isArray(aUidForMove) && 0 < aUidForMove.length)
		{
			const
				oFromFolder = Cache.getFolderFromCacheList(sFromFolderFullNameRaw),
				oToFolder = Cache.getFolderFromCacheList(sToFolderFullNameRaw);

			if (oFromFolder && oToFolder)
			{
				if (isUnd(bCopy) ? false : !!bCopy)
				{
					this.messagesCopyHelper(oFromFolder.fullNameRaw, oToFolder.fullNameRaw, aUidForMove);
				}
				else
				{
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
		if (callback)
		{
			prom.then((value) => {
				callback(!!value);
			}).catch(() => {
				_.delay(() => {
					callback(false);
				}, 1);
			});
		}
	}

	foldersPromisesActionHelper(promise, errorDefCode) {

		Promises
			.abort('Folders')
			.fastResolve(true)
			.then(() => promise)
			.then(() => {
				Promises.foldersReloadWithTimeout(FolderStore.foldersLoading);
			}, (errorCode) => {
				FolderStore.folderList.error(getNotification(errorCode, '', errorDefCode));
				Promises.foldersReloadWithTimeout(FolderStore.foldersLoading);
			});
	}

	reloadOpenPgpKeys() {

		if (PgpStore.capaOpenPGP())
		{
			var
				aKeys = [],
				oEmail = new EmailModel(),
				oOpenpgpKeyring = PgpStore.openpgpKeyring,
				oOpenpgpKeys = oOpenpgpKeyring ? oOpenpgpKeyring.getAllKeys() : [];

			_.each(oOpenpgpKeys, (oItem, iIndex) => {
				if (oItem && oItem.primaryKey)
				{
					var
						aEmails = [],
						aUsers = [],
						oPrimaryUser = oItem.getPrimaryUser(),
						sUser = (oPrimaryUser && oPrimaryUser.user) ? oPrimaryUser.user.userId.userid :
							(oItem.users && oItem.users[0] ? oItem.users[0].userId.userid : '');

					if (oItem.users)
					{
						_.each(oItem.users, (item) => {
							if (item.userId)
							{
								oEmail.clear();
								oEmail.mailsoParse(item.userId.userid);
								if (oEmail.validate())
								{
									aEmails.push(oEmail.email);
									aUsers.push(item.userId.userid);
								}
							}
						});
					}

					if (aEmails.length)
					{
						aKeys.push(new OpenPgpKeyModel(
							iIndex,
							oItem.primaryKey.getFingerprint(),
							oItem.primaryKey.getKeyId().toHex().toLowerCase(),
							_.uniq(_.compact(_.map(
								oItem.getKeyIds(), (item) => (item && item.toHex ? item.toHex() : null)
							))),
							aUsers,
							aEmails,
							oItem.isPrivate(),
							oItem.armor(),
							sUser)
						);
					}
				}
			});

			delegateRunOnDestroy(PgpStore.openpgpkeys());
			PgpStore.openpgpkeys(aKeys);
		}
	}

	accountsCounts() {
		return false;
//		AccountStore.accounts.loading(true);
//
//		Remote.accountsCounts((sResult, oData) => {
//
//			AccountStore.accounts.loading(false);
//
//			if (StorageResultType.Success === sResult && oData.Result && oData.Result['Counts'])
//			{
//				var
//					sEmail = AccountStore.email(),
//					aAcounts = AccountStore.accounts()
//				;
//
//				_.each(oData.Result['Counts'], (oItem) => {
//
//					var oAccount = _.find(aAcounts, (oAccount) => {
//						return oAccount && oItem[0] === oAccount.email && sEmail !== oAccount.email;
//					});
//
//					if (oAccount)
//					{
//						oAccount.count(pInt(oItem[1]));
//					}
//				});
//			}
//		});
	}

	accountsAndIdentities(bBoot) {

		AccountStore.accounts.loading(true);
		IdentityStore.identities.loading(true);

		Remote.accountsAndIdentities((sResult, oData) => {

			AccountStore.accounts.loading(false);
			IdentityStore.identities.loading(false);

			if (StorageResultType.Success === sResult && oData.Result)
			{
				var
					aCounts = {},
					sParentEmail = Settings.settingsGet('ParentEmail'),
					sAccountEmail = AccountStore.email();

				sParentEmail = '' === sParentEmail ? sAccountEmail : sParentEmail;

				if (isArray(oData.Result.Accounts))
				{
					_.each(AccountStore.accounts(), (oAccount) => {
						aCounts[oAccount.email] = oAccount.count();
					});

					delegateRunOnDestroy(AccountStore.accounts());

					AccountStore.accounts(_.map(oData.Result.Accounts,
						(sValue) => new AccountModel(sValue, sValue !== sParentEmail, aCounts[sValue] || 0)));
				}

				if (isUnd(bBoot) ? false : !!bBoot)
				{
					_.delay(() => this.accountsCounts(), 1000 * 5);
					Events.sub('interval.10m-after5m', () => this.accountsCounts());
				}

				if (isArray(oData.Result.Identities))
				{
					delegateRunOnDestroy(IdentityStore.identities());

					IdentityStore.identities(_.map(oData.Result.Identities, (oIdentityData) => {

						const
							sId = pString(oIdentityData.Id),
							sEmail = pString(oIdentityData.Email),
							oIdentity = new IdentityModel(sId, sEmail);

						oIdentity.name(pString(oIdentityData.Name));
						oIdentity.replyTo(pString(oIdentityData.ReplyTo));
						oIdentity.bcc(pString(oIdentityData.Bcc));
						oIdentity.signature(pString(oIdentityData.Signature));
						oIdentity.signatureInsertBefore(!!oIdentityData.SignatureInsertBefore);

						return oIdentity;
					}));
				}
			}
		});
	}

	templates() {

		TemplateStore.templates.loading(true);

		Remote.templates((result, data) => {

			TemplateStore.templates.loading(false);

			if (StorageResultType.Success === result && data.Result &&
				isArray(data.Result.Templates))
			{
				delegateRunOnDestroy(TemplateStore.templates());

				TemplateStore.templates(_.compact(_.map(data.Result.Templates, (templateData) => {
					const template = new TemplateModel();
					return template.parse(templateData) ? template : null;
				})));
			}
		});
	}

	quota() {
		Remote.quota((result, data) => {
			if (StorageResultType.Success === result && data && data.Result &&
				isArray(data.Result) && 1 < data.Result.length &&
				isPosNumeric(data.Result[0], true) && isPosNumeric(data.Result[1], true))
			{
				require('Stores/User/Quota').populateData(
					pInt(data.Result[1]), pInt(data.Result[0]));
			}
		});
	}

	/**
	 * @param {string} folder
	 * @param {Array=} list = []
	 */
	folderInformation(folder, list) {
		if ('' !== trim(folder))
		{
			Remote.folderInformation((result, data) => {
				if (StorageResultType.Success === result)
				{
					if (data && data.Result && data.Result.Hash && data.Result.Folder)
					{
						let
							uid = '',
							check = false,
							unreadCountChange = false;

						const folderFromCache = Cache.getFolderFromCacheList(data.Result.Folder);
						if (folderFromCache)
						{
							folderFromCache.interval = Momentor.momentNowUnix();

							if (data.Result.Hash)
							{
								Cache.setFolderHash(data.Result.Folder, data.Result.Hash);
							}

							if (isNormal(data.Result.MessageCount))
							{
								folderFromCache.messageCountAll(data.Result.MessageCount);
							}

							if (isNormal(data.Result.MessageUnseenCount))
							{
								if (pInt(folderFromCache.messageCountUnread()) !== pInt(data.Result.MessageUnseenCount))
								{
									unreadCountChange = true;
								}

								folderFromCache.messageCountUnread(data.Result.MessageUnseenCount);
							}

							if (unreadCountChange)
							{
								Cache.clearMessageFlagsFromCacheByFolder(folderFromCache.fullNameRaw);
							}

							if (data.Result.Flags)
							{
								for (uid in data.Result.Flags)
								{
									if (has(data.Result.Flags, uid))
									{
										check = true;
										const flags = data.Result.Flags[uid];
										Cache.storeMessageFlagsToCacheByFolderAndUid(folderFromCache.fullNameRaw, uid.toString(), [
											!flags.IsSeen, !!flags.IsFlagged, !!flags.IsAnswered, !!flags.IsForwarded, !!flags.IsReadReceipt
										]);
									}
								}

								if (check)
								{
									this.reloadFlagsCurrentMessageListAndMessageFromCache();
								}
							}

							MessageStore.initUidNextAndNewMessages(folderFromCache.fullNameRaw, data.Result.UidNext, data.Result.NewMessages);

							const hash = Cache.getFolderHash(data.Result.Folder);
							if (data.Result.Hash !== hash || '' === hash || unreadCountChange)
							{
								if (folderFromCache.fullNameRaw === FolderStore.currentFolderFullNameRaw())
								{
									this.reloadMessageList();
								}
								else if (Cache.getFolderInboxName() === folderFromCache.fullNameRaw)
								{
									this.recacheInboxMessageList();
								}
							}
						}
					}
				}
			}, folder, list);
		}
	}

	/**
	 * @param {boolean=} boot = false
	 */
	folderInformationMultiply(boot = false) {

		const folders = FolderStore.getNextFolderNames();
		if (isNonEmptyArray(folders))
		{
			Remote.folderInformationMultiply((sResult, oData) => {
				if (StorageResultType.Success === sResult)
				{
					if (oData && oData.Result && oData.Result.List && isNonEmptyArray(oData.Result.List))
					{
						const utc = Momentor.momentNowUnix();
						_.each(oData.Result.List, (oItem) => {

							var
								sHash = Cache.getFolderHash(oItem.Folder),
								oFolder = Cache.getFolderFromCacheList(oItem.Folder),
								bUnreadCountChange = false;

							if (oFolder)
							{
								oFolder.interval = utc;

								if (oItem.Hash)
								{
									Cache.setFolderHash(oItem.Folder, oItem.Hash);
								}

								if (isNormal(oItem.MessageCount))
								{
									oFolder.messageCountAll(oItem.MessageCount);
								}

								if (isNormal(oItem.MessageUnseenCount))
								{
									if (pInt(oFolder.messageCountUnread()) !== pInt(oItem.MessageUnseenCount))
									{
										bUnreadCountChange = true;
									}

									oFolder.messageCountUnread(oItem.MessageUnseenCount);
								}

								if (bUnreadCountChange)
								{
									Cache.clearMessageFlagsFromCacheByFolder(oFolder.fullNameRaw);
								}

								if (oItem.Hash !== sHash || '' === sHash)
								{
									if (oFolder.fullNameRaw === FolderStore.currentFolderFullNameRaw())
									{
										this.reloadMessageList();
									}
								}
								else if (bUnreadCountChange)
								{
									if (oFolder.fullNameRaw === FolderStore.currentFolderFullNameRaw())
									{
										const aList = MessageStore.messageList();
										if (isNonEmptyArray(aList))
										{
											this.folderInformation(oFolder.fullNameRaw, aList);
										}
									}
								}
							}
						});

						if (boot)
						{
							_.delay(() => this.folderInformationMultiply(true), 2000);
						}
					}
				}
			}, folders);
		}
	}

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string|bool} mUid
	 * @param {number} iSetAction
	 * @param {Array=} aMessages = null
	 */
	messageListAction(sFolderFullNameRaw, mUid, iSetAction, aMessages) {

		var
			oFolder = null,
			aRootUids = [],
			iAlreadyUnread = 0;

		if (isUnd(aMessages))
		{
			aMessages = MessageStore.messageListChecked();
		}

		aRootUids = _.uniq(_.compact(_.map(aMessages, (oMessage) => (oMessage && oMessage.uid ? oMessage.uid : null))));

		if ('' !== sFolderFullNameRaw && 0 < aRootUids.length)
		{
			switch (iSetAction)
			{
				case MessageSetAction.SetSeen:

					_.each(aRootUids, (sSubUid) => {
						iAlreadyUnread += Cache.storeMessageFlagsToCacheBySetAction(
							sFolderFullNameRaw, sSubUid, iSetAction);
					});

					oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
					if (oFolder)
					{
						oFolder.messageCountUnread(oFolder.messageCountUnread() - iAlreadyUnread);
					}

					Remote.messageSetSeen(noop, sFolderFullNameRaw, aRootUids, true);
					break;

				case MessageSetAction.UnsetSeen:

					_.each(aRootUids, (sSubUid) => {
						iAlreadyUnread += Cache.storeMessageFlagsToCacheBySetAction(
							sFolderFullNameRaw, sSubUid, iSetAction);
					});

					oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
					if (oFolder)
					{
						oFolder.messageCountUnread(oFolder.messageCountUnread() - iAlreadyUnread + aRootUids.length);
					}

					Remote.messageSetSeen(noop, sFolderFullNameRaw, aRootUids, false);
					break;

				case MessageSetAction.SetFlag:

					_.each(aRootUids, (sSubUid) => {
						Cache.storeMessageFlagsToCacheBySetAction(
							sFolderFullNameRaw, sSubUid, iSetAction);
					});

					Remote.messageSetFlagged(noop, sFolderFullNameRaw, aRootUids, true);
					break;

				case MessageSetAction.UnsetFlag:

					_.each(aRootUids, (sSubUid) => {
						Cache.storeMessageFlagsToCacheBySetAction(
							sFolderFullNameRaw, sSubUid, iSetAction);
					});

					Remote.messageSetFlagged(noop, sFolderFullNameRaw, aRootUids, false);
					break;
				// no default
			}

			this.reloadFlagsCurrentMessageListAndMessageFromCache();
			MessageStore.message.viewTrigger(!MessageStore.message.viewTrigger());
		}
	}

	googleConnect() {
		window.open(Links.socialGoogle(), 'Google', 'left=200,top=100,width=650,height=600,menubar=no,status=no,resizable=yes,scrollbars=yes');
	}

	twitterConnect() {
		window.open(Links.socialTwitter(), 'Twitter', 'left=200,top=100,width=650,height=350,menubar=no,status=no,resizable=yes,scrollbars=yes');
	}

	facebookConnect() {
		window.open(Links.socialFacebook(), 'Facebook', 'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
	}

	/**
	 * @param {boolean=} fireAllActions = false
	 */
	socialUsers(fireAllActions = false) {
		if (true === fireAllActions)
		{
			SocialStore.google.loading(true);
			SocialStore.facebook.loading(true);
			SocialStore.twitter.loading(true);
		}

		Remote.socialUsers((result, data) => {

			if (StorageResultType.Success === result && data && data.Result)
			{
				SocialStore.google.userName(data.Result.Google || '');
				SocialStore.facebook.userName(data.Result.Facebook || '');
				SocialStore.twitter.userName(data.Result.Twitter || '');
			}
			else
			{
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
			if (StorageResultType.Success === result && data && isArray(data.Result))
			{
				autocompleteCallback(_.compact(_.map(data.Result, (item) => (item && item[0] ? new EmailModel(item[0], item[1]) : null))));
			}
			else if (StorageResultType.Abort !== result)
			{
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
		if (!isArray(aExpandedList))
		{
			aExpandedList = [];
		}

		if (bExpanded)
		{
			aExpandedList.push(sFullNameHash);
			aExpandedList = _.uniq(aExpandedList);
		}
		else
		{
			aExpandedList = _.without(aExpandedList, sFullNameHash);
		}

		Local.set(ClientSideKeyName.ExpandedFolders, aExpandedList);
	}

	initHorizontalLayoutResizer(sClientSideKeyName) {

		var
			iMinHeight = 200,
			iMaxHeight = 500,
			oTop = null,
			oBottom = null,

			fSetHeight = (height) => {
				if (height)
				{
					if (oTop)
					{
						oTop.attr('style', 'height:' + height + 'px');
					}

					if (oBottom)
					{
						oBottom.attr('style', 'top:' + (55 /* top toolbar */ + height) + 'px');
					}
				}
			},

			fResizeCreateFunction = (event) => {
				if (event && event.target)
				{
					var oResizableHandle = $(event.target).find('.ui-resizable-handle');

					oResizableHandle
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

			fResizeResizeFunction = _.debounce(() => {
				$html.addClass('rl-resizer');
			}, 500, true),

			fResizeStopFunction = (oEvent, oObject) => {
				$html.removeClass('rl-resizer');
				if (oObject && oObject.size && oObject.size.height)
				{
					Local.set(sClientSideKeyName, oObject.size.height);

					fSetHeight(oObject.size.height);

					windowResize();
				}
			},

			oOptions = {
				helper: 'ui-resizable-helper-h',
				minHeight: iMinHeight,
				maxHeight: iMaxHeight,
				handles: 's',
				create: fResizeCreateFunction,
				resize: fResizeResizeFunction,
				start: fResizeStartFunction,
				stop: fResizeStopFunction
			},

			fDisable = (bDisable) => {
				if (bDisable)
				{
					if (oTop && oTop.hasClass('ui-resizable'))
					{
						oTop
							.resizable('destroy')
							.removeAttr('style');
					}

					if (oBottom)
					{
						oBottom.removeAttr('style');
					}
				}
				else if ($html.hasClass('rl-bottom-preview-pane'))
				{
					oTop = $('.b-message-list-wrapper');
					oBottom = $('.b-message-view-wrapper');

					if (!oTop.hasClass('ui-resizable'))
					{
						oTop.resizable(oOptions);
					}

					const iHeight = pInt(Local.get(sClientSideKeyName)) || 300;
					fSetHeight(iHeight > iMinHeight ? iHeight : iMinHeight);
				}
			};

		fDisable(false);

		Events.sub('layout', (layout) => {
			fDisable(Layout.BottomPreview !== layout);
		});
	}

	initVerticalLayoutResizer(sClientSideKeyName) {

		var
			iDisabledWidth = 60,
			iMinWidth = 155,
			oLeft = $('#rl-left'),
			oRight = $('#rl-right'),

			mLeftWidth = Local.get(sClientSideKeyName) || null,

			fSetWidth = (iWidth) => {
				if (iWidth)
				{
					leftPanelWidth(iWidth);

					$html.removeClass('rl-resizer');

					oLeft.css({
						width: '' + iWidth + 'px'
					});

					oRight.css({
						left: '' + iWidth + 'px'
					});
				}
			},

			fDisable = (bDisable) => {
				if (bDisable)
				{
					oLeft.resizable('disable');
					fSetWidth(iDisabledWidth);
				}
				else
				{
					oLeft.resizable('enable');
					var iWidth = pInt(Local.get(sClientSideKeyName)) || iMinWidth;
					fSetWidth(iWidth > iMinWidth ? iWidth : iMinWidth);
				}
			},

			fResizeCreateFunction = (oEvent) => {
				if (oEvent && oEvent.target)
				{
					$(oEvent.target).find('.ui-resizable-handle')
						.on('mousedown', () => {
							$html.addClass('rl-resizer');
						})
						.on('mouseup', () => {
							$html.removeClass('rl-resizer');
						});
				}
			},
			fResizeResizeFunction = _.debounce(() => {
				$html.addClass('rl-resizer');
			}, 500, true),
			fResizeStartFunction = () => {
				$html.addClass('rl-resizer');
			},
			fResizeStopFunction = (oEvent, oObject) => {
				$html.removeClass('rl-resizer');
				if (oObject && oObject.size && oObject.size.width)
				{
					Local.set(sClientSideKeyName, oObject.size.width);

					leftPanelWidth(oObject.size.width);

					oRight.css({
						left: '' + oObject.size.width + 'px'
					});

					oLeft.css({
						position: '',
						top: '',
						left: '',
						height: ''
					});
				}
			};

		if (null !== mLeftWidth)
		{
			fSetWidth(mLeftWidth > iMinWidth ? mLeftWidth : iMinWidth);
		}

		oLeft.resizable({
			helper: 'ui-resizable-helper-w',
			minWidth: iMinWidth,
			maxWidth: 350,
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
			this.loginAndLogoutReload(false, true,
				Settings.settingsGet('ParentEmail') && 0 < Settings.settingsGet('ParentEmail').length);
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
		if (!customLoginLink)
		{
			startScreens([
				LoginUserScreen
			]);

			Plugins.runHook('rl-start-login-screens');
			Events.pub('rl.bootstart-login-screens');
		}
		else
		{
			routeOff();
			setHash(Links.root(), true);
			routeOff();

			_.defer(function() {
				window.location.href = customLoginLink;
			});
		}
	}

	bootend() {
		if (progressJs)
		{
			progressJs.set(100).end();
		}
		hideLoading();
	}

	bootstart() {

		super.bootstart();

		require('Stores/User/App').populate();
		require('Stores/User/Settings').populate();
		require('Stores/User/Notification').populate();
		require('Stores/User/Account').populate();
		require('Stores/User/Contact').populate();

		var
			sJsHash = Settings.appSettingsGet('jsHash'),
			sStartupUrl = pString(Settings.settingsGet('StartupUrl')),
			iContactsSyncInterval = pInt(Settings.settingsGet('ContactsSyncInterval')),
			bGoogle = Settings.settingsGet('AllowGoogleSocial'),
			bFacebook = Settings.settingsGet('AllowFacebookSocial'),
			bTwitter = Settings.settingsGet('AllowTwitterSocial');

		if (progressJs)
		{
			progressJs.set(90);
		}

		leftPanelDisabled.subscribe((value) => {
			Events.pub('left-panel.' + (value ? 'off' : 'on'));
		});

		this.setWindowTitle('');
		if (Settings.settingsGet('Auth'))
		{
			$html.addClass('rl-user-auth');

			if (Settings.capa(Capa.TwoFactor) &&
				Settings.capa(Capa.TwoFactorForce) &&
				Settings.settingsGet('RequireTwoFactor'))
			{
				this.bootend();
				this.bootstartTwoFactorScreen();
			}
			else
			{
				this.setWindowTitle(i18n('TITLES/LOADING'));

// require.ensure([], function() { // require code splitting

				this.foldersReload((value) => {

					this.bootend();

					if (value)
					{
						if ('' !== sStartupUrl)
						{
							routeOff();
							setHash(Links.root(sStartupUrl), true);
							routeOn();
						}

						if (window.jassl && window.crypto && window.crypto.getRandomValues && Settings.capa(Capa.OpenPGP))
						{
							const openpgpCallback = (openpgp) => {

								PgpStore.openpgp = openpgp;

								if (window.Worker)
								{
									try
									{
										PgpStore.openpgp.initWorker({path: Links.openPgpWorkerJs()});
									}
									catch (e)
									{
										log(e);
									}
								}

								PgpStore.openpgpKeyring = new openpgp.Keyring();
								PgpStore.capaOpenPGP(true);

								Events.pub('openpgp.init');

								this.reloadOpenPgpKeys();
							};

							if (window.openpgp)
							{
								openpgpCallback(window.openpgp);
							}
							else
							{
								window.jassl(Links.openPgpJs()).then(() => {
									if (window.openpgp)
									{
										openpgpCallback(window.openpgp);
									}
								});
							}
						}
						else
						{
							PgpStore.capaOpenPGP(false);
						}

						startScreens([
							MailBoxUserScreen,
							Settings.capa(Capa.Settings) ? SettingsUserScreen : null
//							false ? AboutUserScreen : null
						]);

						if (bGoogle || bFacebook || bTwitter)
						{
							this.socialUsers(true);
						}

						Events.sub('interval.2m', () => this.folderInformation(Cache.getFolderInboxName()));
						Events.sub('interval.3m', () => {
							const sF = FolderStore.currentFolderFullNameRaw();
							if (Cache.getFolderInboxName() !== sF)
							{
								this.folderInformation(sF);
							}
						});

						Events.sub('interval.2m-after5m', () => this.folderInformationMultiply());
						Events.sub('interval.15m', () => this.quota());
						Events.sub('interval.20m', () => this.foldersReload());

						iContactsSyncInterval = 5 <= iContactsSyncInterval ? iContactsSyncInterval : 20;
						iContactsSyncInterval = 320 >= iContactsSyncInterval ? iContactsSyncInterval : 320;

						_.delay(() => this.contactsSync(), 10000);
						_.delay(() => this.folderInformationMultiply(true), 2000);

						window.setInterval(() => this.contactsSync(), iContactsSyncInterval * 60000 + 5000);

						this.accountsAndIdentities(true);

						_.delay(() => {
							const sF = FolderStore.currentFolderFullNameRaw();
							if (Cache.getFolderInboxName() !== sF)
							{
								this.folderInformation(sF);
							}
						}, 1000);

						_.delay(() => this.quota(), 5000);
						_.delay(() => Remote.appDelayStart(noop), 35000);

						Events.sub('rl.auto-logout', () => this.logout());

						Plugins.runHook('rl-start-user-screens');
						Events.pub('rl.bootstart-user-screens');

						if (Settings.settingsGet('WelcomePageUrl'))
						{
							_.delay(() => this.bootstartWelcomePopup(Settings.settingsGet('WelcomePageUrl')), 1000);
						}

						if (!!Settings.settingsGet('AccountSignMe') &&
							window.navigator.registerProtocolHandler &&
							Settings.capa(Capa.Composer))
						{
							_.delay(() => {
								try {
									window.navigator.registerProtocolHandler('mailto',
										window.location.protocol + '//' + window.location.host + window.location.pathname + '?mailto&to=%s',
										'' + (Settings.settingsGet('Title') || 'RainLoop'));
								}
								catch (e) {} // eslint-disable-line no-empty

								if (Settings.settingsGet('MailToEmail'))
								{
									mailToHelper(Settings.settingsGet('MailToEmail'), require('View/Popup/Compose'));
								}
							}, 500);
						}

						if (!bMobileDevice)
						{
							_.defer(() => this.initVerticalLayoutResizer(ClientSideKeyName.FolderListSize));

							if (Tinycon && Settings.appSettingsGet('faviconStatus') && !Settings.appSettingsGet('listPermanentFiltered'))
							{
								Tinycon.setOptions({
									fallback: false
								});

								Events.sub('mailbox.inbox-unread-count',
									(iCount) => Tinycon.setBubble(0 < iCount ? (99 < iCount ? 99 : iCount) : 0));
							}
						}
					}
					else
					{
						this.logout();
					}
				});

// }); // require code splitting

			}
		}
		else
		{
			this.bootend();
			this.bootstartLoginScreen();
		}

		if (bGoogle)
		{
			window['rl_' + sJsHash + '_google_service'] = () => {
				SocialStore.google.loading(true);
				this.socialUsers();
			};
		}

		if (bFacebook)
		{
			window['rl_' + sJsHash + '_facebook_service'] = () => {
				SocialStore.facebook.loading(true);
				this.socialUsers();
			};
		}

		if (bTwitter)
		{
			window['rl_' + sJsHash + '_twitter_service'] = () => {
				SocialStore.twitter.loading(true);
				this.socialUsers();
			};
		}

		Events.sub('interval.1m', () => Momentor.reload());

		Plugins.runHook('rl-start-screens');
		Events.pub('rl.bootstart-end');
	}
}

export default new AppUser();
