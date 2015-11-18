
import {window, _, $} from 'common';
import ko from 'ko';
import progressJs from 'progressJs';
import Tinycon from 'Tinycon';

import * as Enums from 'Common/Enums';
import * as Consts from 'Common/Consts';
import Globals from 'Common/Globals';
import Plugins from 'Common/Plugins';
import Utils from 'Common/Utils';
import Links from 'Common/Links';
import Events from 'Common/Events';
import Translator from 'Common/Translator';
import Momentor from 'Common/Momentor';
import Cache from 'Common/Cache';


import SocialStore from 'Stores/Social';
import SettingsStore from 'Stores/User/Settings';
import AccountStore from 'Stores/User/Account';
import IdentityStore from 'Stores/User/Identity';
import TemplateStore from 'Stores/User/Template';
import FolderStore from 'Stores/User/Folder';
import PgpStore from 'Stores/User/Pgp';
import MessageStore from 'Stores/User/Message';
import ContactStore from 'Stores/User/Contact';

import Local from 'Storage/Client.jsx';
import Settings from 'Storage/Settings';

import Remote from 'Remote/User/Ajax';
import Promises from 'Promises/User/Ajax';

import EmailModel from 'Model/Email';
import AccountModel from 'Model/Account';
import IdentityModel from 'Model/Identity';
import TemplateModel from 'Model/Template';
import OpenPgpKeyModel from 'Model/OpenPgpKey';

import kn from 'Knoin/Knoin';

import {AbstractApp} from 'App/Abstract';

class AppUser extends AbstractApp
{
	oMoveCache = {};

	constructor()
	{
		super(Remote);

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
			Remote.jsVersion((sResult, oData) => {
				if (Enums.StorageResultType.Success === sResult && oData && !oData.Result)
				{
					if (window.parent && !!Settings.settingsGet('InIframe'))
					{
						window.parent.location.reload();
					}
					else
					{
						window.location.reload();
					}
				}
			}, Settings.settingsGet('Version'));
		}, {}, 60 * 60 * 1000);

		if (Settings.settingsGet('UserBackgroundHash'))
		{
			_.delay(() => {
				$('#rl-bg').attr('style', 'background-image: none !important;')
						.backstretch(Links.userBackground(Settings.settingsGet('UserBackgroundHash')), {
					'fade': Globals.bAnimationSupported ? 1000 : 0, 'centeredX': true, 'centeredY': true
				}).removeAttr('style');
			}, 1000);
		}

		this.socialUsers = _.bind(this.socialUsers, this);
	}

	remote() {
		return Remote;
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
			iOffset = (MessageStore.messageListPage() - 1) * SettingsStore.messagesPerPage()
		;

		if (bDropCurrenFolderCache)
		{
			Cache.setFolderHash(FolderStore.currentFolderFullNameRaw(), '');
		}

		if (bDropPagePosition)
		{
			MessageStore.messageListPage(1);
			MessageStore.messageListPageBeforeThread(1);
			iOffset = 0;

			kn.setHash(Links.mailBox(
				FolderStore.currentFolderFullNameHash(),
				MessageStore.messageListPage(),
				MessageStore.messageListSearch(),
				MessageStore.messageListThreadUid()
			), true, true);
		}

		MessageStore.messageListLoading(true);
		Remote.messageList((sResult, oData, bCached) => {

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				MessageStore.messageListError('');
				MessageStore.messageListLoading(false);

				MessageStore.setMessageList(oData, bCached);
			}
			else if (Enums.StorageResultType.Unload === sResult)
			{
				MessageStore.messageListError('');
				MessageStore.messageListLoading(false);
			}
			else if (Enums.StorageResultType.Abort !== sResult)
			{
				MessageStore.messageList([]);
				MessageStore.messageListLoading(false);
				MessageStore.messageListError(oData && oData.ErrorCode ?
					Translator.getNotification(oData.ErrorCode) : Translator.i18n('NOTIFICATIONS/CANT_GET_MESSAGE_LIST')
				);
			}

		}, FolderStore.currentFolderFullNameRaw(), iOffset, SettingsStore.messagesPerPage(),
			MessageStore.messageListSearch(), MessageStore.messageListThreadUid());
	}

	recacheInboxMessageList() {
		Remote.messageList(Utils.emptyFunction, Cache.getFolderInboxName(), 0, SettingsStore.messagesPerPage(), '', '', true);
	}

	/**
	 * @param {Function} fResultFunc
	 * @return {boolean}
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
			sSpamFolder = FolderStore.spamFolder()
		;

		_.each(this.oMoveCache, (oItem) => {

			var
				bSpam = sSpamFolder === oItem['To'],
				bTrash = sTrashFolder === oItem['To'],
				bHam = !bSpam && sSpamFolder === oItem['From'] && Cache.getFolderInboxName() === oItem['To']
			;

			Remote.messagesMove(this.moveOrDeleteResponseHelper, oItem['From'], oItem['To'], oItem['Uid'],
				bSpam ? 'SPAM' : (bHam ? 'HAM' : ''), bSpam || bTrash);
		});

		this.oMoveCache = {};
	}

	messagesMoveHelper(sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForMove) {

		var sH = '$$' + sFromFolderFullNameRaw + '$$' + sToFolderFullNameRaw + '$$';
		if (!this.oMoveCache[sH])
		{
			this.oMoveCache[sH] = {
				'From': sFromFolderFullNameRaw,
				'To': sToFolderFullNameRaw,
				'Uid': []
			};
		}

		this.oMoveCache[sH]['Uid'] = _.union(this.oMoveCache[sH]['Uid'], aUidForMove);
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

		if (Enums.StorageResultType.Success === sResult && FolderStore.currentFolder())
		{
			if (oData && Utils.isArray(oData.Result) && 2 === oData.Result.length)
			{
				Cache.setFolderHash(oData.Result[0], oData.Result[1]);
			}
			else
			{
				Cache.setFolderHash(FolderStore.currentFolderFullNameRaw(), '');

				if (oData && -1 < Utils.inArray(oData.ErrorCode,
					[Enums.Notification.CantMoveMessage, Enums.Notification.CantCopyMessage]))
				{
					window.alert(Translator.getNotification(oData.ErrorCode));
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
			nSetSystemFoldersNotification = null
		;

		switch (iDeleteType)
		{
			case Enums.FolderType.Spam:
				oMoveFolder = Cache.getFolderFromCacheList(FolderStore.spamFolder());
				nSetSystemFoldersNotification = Enums.SetSystemFoldersNotification.Spam;
				break;
			case Enums.FolderType.NotSpam:
				oMoveFolder = Cache.getFolderFromCacheList(Cache.getFolderInboxName());
				break;
			case Enums.FolderType.Trash:
				oMoveFolder = Cache.getFolderFromCacheList(FolderStore.trashFolder());
				nSetSystemFoldersNotification = Enums.SetSystemFoldersNotification.Trash;
				break;
			case Enums.FolderType.Archive:
				oMoveFolder = Cache.getFolderFromCacheList(FolderStore.archiveFolder());
				nSetSystemFoldersNotification = Enums.SetSystemFoldersNotification.Archive;
				break;
		}

		bUseFolder = Utils.isUnd(bUseFolder) ? true : !!bUseFolder;
		if (bUseFolder)
		{
			if ((Enums.FolderType.Spam === iDeleteType && Consts.UNUSED_OPTION_VALUE === FolderStore.spamFolder()) ||
				(Enums.FolderType.Trash === iDeleteType && Consts.UNUSED_OPTION_VALUE === FolderStore.trashFolder()) ||
				(Enums.FolderType.Archive === iDeleteType && Consts.UNUSED_OPTION_VALUE === FolderStore.archiveFolder()))
			{
				bUseFolder = false;
			}
		}

		if (!oMoveFolder && bUseFolder)
		{
			kn.showScreenPopup(require('View/Popup/FolderSystem'), [nSetSystemFoldersNotification]);
		}
		else if (!bUseFolder || (Enums.FolderType.Trash === iDeleteType &&
			(sFromFolderFullNameRaw === FolderStore.spamFolder() || sFromFolderFullNameRaw === FolderStore.trashFolder())))
		{
			kn.showScreenPopup(require('View/Popup/Ask'), [Translator.i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'), () => {
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

		if (sFromFolderFullNameRaw !== sToFolderFullNameRaw && Utils.isArray(aUidForMove) && 0 < aUidForMove.length)
		{
			const
				oFromFolder = Cache.getFolderFromCacheList(sFromFolderFullNameRaw),
				oToFolder = Cache.getFolderFromCacheList(sToFolderFullNameRaw)
			;

			if (oFromFolder && oToFolder)
			{
				if (Utils.isUnd(bCopy) ? false : !!bCopy)
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

		Promises.foldersReload(FolderStore.foldersLoading).then((value) => {
			if (callback)
			{
				callback(!!value);
			}
		}).fail(() => {
			if (callback)
			{
				callback(false);
			}
		});
	}

	foldersPromisesActionHelper(promise, errorDefCode) {

		Promises
			.abort('Folders')
			.fastResolve(true)
			.then(() => promise)
			.fail((errorCode) => {
				FolderStore.folderList.error(Translator.getNotification(errorCode, '', errorDefCode));
			}).fin(() => {
				Promises.foldersReloadWithTimeout(FolderStore.foldersLoading);
			}).done()
		;
	}

	reloadOpenPgpKeys() {

		if (PgpStore.capaOpenPGP())
		{
			var
				aKeys = [],
				oEmail = new EmailModel(),
				oOpenpgpKeyring = PgpStore.openpgpKeyring,
				oOpenpgpKeys = oOpenpgpKeyring ? oOpenpgpKeyring.getAllKeys() : []
			;

			_.each(oOpenpgpKeys, (oItem, iIndex) => {
				if (oItem && oItem.primaryKey)
				{
					var

						oPrimaryUser = oItem.getPrimaryUser(),
						sUser = (oPrimaryUser && oPrimaryUser.user) ? oPrimaryUser.user.userId.userid
							: (oItem.users && oItem.users[0] ? oItem.users[0].userId.userid : '')
					;

					oEmail.clear();
					oEmail.mailsoParse(sUser);

					if (oEmail.validate())
					{
						aKeys.push(new OpenPgpKeyModel(
							iIndex,
							oItem.primaryKey.getFingerprint(),
							oItem.primaryKey.getKeyId().toHex().toLowerCase(),
							sUser,
							oEmail.email,
							oItem.isPrivate(),
							oItem.armor())
						);
					}
				}
			});

			Utils.delegateRunOnDestroy(PgpStore.openpgpkeys());
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
//			if (Enums.StorageResultType.Success === sResult && oData.Result && oData.Result['Counts'])
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
//						oAccount.count(Utils.pInt(oItem[1]));
//					}
//				});
//			}
//		});
	};

	accountsAndIdentities(bBoot) {

		AccountStore.accounts.loading(true);
		IdentityStore.identities.loading(true);

		Remote.accountsAndIdentities((sResult, oData) => {

			AccountStore.accounts.loading(false);
			IdentityStore.identities.loading(false);

			if (Enums.StorageResultType.Success === sResult && oData.Result)
			{
				var
					aCounts = {},
					sParentEmail = Settings.settingsGet('ParentEmail'),
					sAccountEmail = AccountStore.email()
				;

				sParentEmail = '' === sParentEmail ? sAccountEmail : sParentEmail;

				if (Utils.isArray(oData.Result['Accounts']))
				{
					_.each(AccountStore.accounts(), (oAccount) => {
						aCounts[oAccount.email] = oAccount.count();
					});

					Utils.delegateRunOnDestroy(AccountStore.accounts());

					AccountStore.accounts(_.map(oData.Result['Accounts'], 
						(sValue) => new AccountModel(sValue, sValue !== sParentEmail, aCounts[sValue] || 0)));
				}

				if (Utils.isUnd(bBoot) ? false : !!bBoot)
				{
					_.delay(() => this.accountsCounts(), 1000 * 5);
					Events.sub('interval.10m-after5m', () => this.accountsCounts());
				}

				if (Utils.isArray(oData.Result['Identities']))
				{
					Utils.delegateRunOnDestroy(IdentityStore.identities());

					IdentityStore.identities(_.map(oData.Result['Identities'], (oIdentityData) => {

						const
							sId = Utils.pString(oIdentityData['Id']),
							sEmail = Utils.pString(oIdentityData['Email']),
							oIdentity = new IdentityModel(sId, sEmail)
						;

						oIdentity.name(Utils.pString(oIdentityData['Name']));
						oIdentity.replyTo(Utils.pString(oIdentityData['ReplyTo']));
						oIdentity.bcc(Utils.pString(oIdentityData['Bcc']));
						oIdentity.signature(Utils.pString(oIdentityData['Signature']));
						oIdentity.signatureInsertBefore(!!oIdentityData['SignatureInsertBefore']);

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

			if (Enums.StorageResultType.Success === result && data.Result &&
				Utils.isArray(data.Result['Templates']))
			{
				Utils.delegateRunOnDestroy(TemplateStore.templates());

				TemplateStore.templates(_.compact(_.map(data.Result['Templates'], (templateData) => {
					const template = new TemplateModel();
					return template.parse(templateData) ? template : null;
				})));
			}
		});
	}

	quota() {
		Remote.quota((result, data) => {
			if (Enums.StorageResultType.Success === result &&	data && data.Result &&
				Utils.isArray(data.Result) && 1 < data.Result.length &&
				Utils.isPosNumeric(data.Result[0], true) && Utils.isPosNumeric(data.Result[1], true))
			{
				require('Stores/User/Quota').populateData(
					Utils.pInt(data.Result[1]), Utils.pInt(data.Result[0]));
			}
		});
	}

	/**
	 * @param {string} folder
	 * @param {Array=} list = []
	 */
	folderInformation(folder, list) {
		if ('' !== Utils.trim(folder))
		{
			Remote.folderInformation((result, data) => {
				if (Enums.StorageResultType.Success === result)
				{
					if (data && data.Result && data.Result.Hash && data.Result.Folder)
					{
						let
							uid = '',
							list = [],
							check = false,
							unreadCountChange = false
						;

						const folder = Cache.getFolderFromCacheList(data.Result.Folder);
						if (folder)
						{
							folder.interval = Momentor.momentNowUnix();

							if (data.Result.Hash)
							{
								Cache.setFolderHash(data.Result.Folder, data.Result.Hash);
							}

							if (Utils.isNormal(data.Result.MessageCount))
							{
								folder.messageCountAll(data.Result.MessageCount);
							}

							if (Utils.isNormal(data.Result.MessageUnseenCount))
							{
								if (Utils.pInt(folder.messageCountUnread()) !== Utils.pInt(data.Result.MessageUnseenCount))
								{
									unreadCountChange = true;
								}

								folder.messageCountUnread(data.Result.MessageUnseenCount);
							}

							if (unreadCountChange)
							{
								Cache.clearMessageFlagsFromCacheByFolder(folder.fullNameRaw);
							}

							if (data.Result.Flags)
							{
								for (uid in data.Result.Flags)
								{
									if (data.Result.Flags.hasOwnProperty(uid))
									{
										check = true;
										const flags = data.Result.Flags[uid];
										Cache.storeMessageFlagsToCacheByFolderAndUid(folder.fullNameRaw, uid.toString(), [
											!flags['IsSeen'], !!flags['IsFlagged'], !!flags['IsAnswered'], !!flags['IsForwarded'], !!flags['IsReadReceipt']
										]);
									}
								}

								if (check)
								{
									this.reloadFlagsCurrentMessageListAndMessageFromCache();
								}
							}

							MessageStore.initUidNextAndNewMessages(folder.fullNameRaw, data.Result.UidNext, data.Result.NewMessages);

							const hash = Cache.getFolderHash(data.Result.Folder);
							if (data.Result.Hash !== hash || '' === hash)
							{
								if (folder.fullNameRaw === FolderStore.currentFolderFullNameRaw())
								{
									this.reloadMessageList();
								}
								else if (Cache.getFolderInboxName() === folder.fullNameRaw)
								{
									this.recacheInboxMessageList();
								}
							}
							else if (unreadCountChange)
							{
								if (folder.fullNameRaw === FolderStore.currentFolderFullNameRaw())
								{
									list = MessageStore.messageList();
									if (Utils.isNonEmptyArray(list))
									{
										this.folderInformation(folder.fullNameRaw, list);
									}
								}
							}
						}
					}
				}
			}, folder, list);
		}
	};

	/**
	 * @param {boolean=} boot = false
	 */
	folderInformationMultiply(boot = false) {

		const folders = FolderStore.getNextFolderNames();
		if (Utils.isNonEmptyArray(folders))
		{
			Remote.folderInformationMultiply((sResult, oData) => {
				if (Enums.StorageResultType.Success === sResult)
				{
					if (oData && oData.Result && oData.Result.List && Utils.isNonEmptyArray(oData.Result.List))
					{
						const utc = Momentor.momentNowUnix();
						_.each(oData.Result.List, (oItem) => {

							var
								sHash = Cache.getFolderHash(oItem.Folder),
								oFolder = Cache.getFolderFromCacheList(oItem.Folder),
								bUnreadCountChange = false
							;

							if (oFolder)
							{
								oFolder.interval = utc;

								if (oItem.Hash)
								{
									Cache.setFolderHash(oItem.Folder, oItem.Hash);
								}

								if (Utils.isNormal(oItem.MessageCount))
								{
									oFolder.messageCountAll(oItem.MessageCount);
								}

								if (Utils.isNormal(oItem.MessageUnseenCount))
								{
									if (Utils.pInt(oFolder.messageCountUnread()) !== Utils.pInt(oItem.MessageUnseenCount))
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
										if (Utils.isNonEmptyArray(aList))
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
	};

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
			iAlreadyUnread = 0
		;

		if (Utils.isUnd(aMessages))
		{
			aMessages = MessageStore.messageListChecked();
		}

		aRootUids = _.uniq(_.compact(_.map(aMessages, (oMessage) => (oMessage && oMessage.uid) ? oMessage.uid : null)));

		if ('' !== sFolderFullNameRaw && 0 < aRootUids.length)
		{
			switch (iSetAction) {
				case Enums.MessageSetAction.SetSeen:

					_.each(aRootUids, (sSubUid) => {
						iAlreadyUnread += Cache.storeMessageFlagsToCacheBySetAction(
							sFolderFullNameRaw, sSubUid, iSetAction);
					});

					oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
					if (oFolder)
					{
						oFolder.messageCountUnread(oFolder.messageCountUnread() - iAlreadyUnread);
					}

					Remote.messageSetSeen(Utils.emptyFunction, sFolderFullNameRaw, aRootUids, true);
					break;

				case Enums.MessageSetAction.UnsetSeen:

					_.each(aRootUids, (sSubUid) => {
						iAlreadyUnread += Cache.storeMessageFlagsToCacheBySetAction(
							sFolderFullNameRaw, sSubUid, iSetAction);
					});

					oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
					if (oFolder)
					{
						oFolder.messageCountUnread(oFolder.messageCountUnread() - iAlreadyUnread + aRootUids.length);
					}

					Remote.messageSetSeen(Utils.emptyFunction, sFolderFullNameRaw, aRootUids, false);
					break;

				case Enums.MessageSetAction.SetFlag:

					_.each(aRootUids, (sSubUid) => {
						Cache.storeMessageFlagsToCacheBySetAction(
							sFolderFullNameRaw, sSubUid, iSetAction);
					});

					Remote.messageSetFlagged(Utils.emptyFunction, sFolderFullNameRaw, aRootUids, true);
					break;

				case Enums.MessageSetAction.UnsetFlag:

					_.each(aRootUids, (sSubUid) => {
						Cache.storeMessageFlagsToCacheBySetAction(
							sFolderFullNameRaw, sSubUid, iSetAction);
					});

					Remote.messageSetFlagged(Utils.emptyFunction, sFolderFullNameRaw, aRootUids, false);
					break;
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

			if (Enums.StorageResultType.Success === result && data && data.Result)
			{
				SocialStore.google.userName(data.Result['Google'] || '');
				SocialStore.facebook.userName(data.Result['Facebook'] || '');
				SocialStore.twitter.userName(data.Result['Twitter'] || '');
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
	 * @param {Function} callback
	 */
	getAutocomplete(query, callback) {
		Remote.suggestions((result, data) => {
			if (Enums.StorageResultType.Success === result && data && Utils.isArray(data.Result))
			{
				callback(_.compact(_.map(data.Result, 
					(item) => item && item[0] ? new EmailModel(item[0], item[1]) : null)));
			}
			else if (Enums.StorageResultType.Abort !== result)
			{
				callback([]);
			}
		}, query);
	}

	/**
	 * @param {string} sFullNameHash
	 * @param {boolean} bExpanded
	 */
	setExpandedFolder(sFullNameHash, bExpanded) {
		let aExpandedList = Local.get(Enums.ClientSideKeyName.ExpandedFolders);
		if (!Utils.isArray(aExpandedList))
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

		Local.set(Enums.ClientSideKeyName.ExpandedFolders, aExpandedList);
	}

	initHorizontalLayoutResizer(sClientSideKeyName) {

		var
			iMinHeight = 200,
			iMaxHeight = 500,
			oTop = null,
			oBottom = null,

			fResizeCreateFunction = (event) => {
				if (event && event.target)
				{
					var oResizableHandle = $(event.target).find('.ui-resizable-handle');

					oResizableHandle
						.on('mousedown', () => {
							Globals.$html.addClass('rl-resizer');
						})
						.on('mouseup', () => {
							Globals.$html.removeClass('rl-resizer');
						})
					;
				}
			},

			fResizeStartFunction = () => {
				Globals.$html.addClass('rl-resizer');
			},

			fResizeResizeFunction = _.debounce(() => {
				Globals.$html.addClass('rl-resizer');
			}, 500, true),

			fResizeStopFunction = (oEvent, oObject) => {
				Globals.$html.removeClass('rl-resizer');
				if (oObject && oObject.size && oObject.size.height)
				{
					Local.set(sClientSideKeyName, oObject.size.height);

					fSetHeight(oObject.size.height);

					Utils.windowResize();
				}
			},

			oOptions = {
				'helper': 'ui-resizable-helper-h',
				'minHeight': iMinHeight,
				'maxHeight': iMaxHeight,
				'handles': 's',
				'create': fResizeCreateFunction,
				'resize': fResizeResizeFunction,
				'start': fResizeStartFunction,
				'stop': fResizeStopFunction
			},

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

			fDisable = (bDisable) => {
				if (bDisable)
				{
					if (oTop && oTop.hasClass('ui-resizable'))
					{
						oTop
							.resizable('destroy')
							.removeAttr('style')
						;
					}

					if (oBottom)
					{
						oBottom.removeAttr('style');
					}
				}
				else if (Globals.$html.hasClass('rl-bottom-preview-pane'))
				{
					oTop = $('.b-message-list-wrapper');
					oBottom = $('.b-message-view-wrapper');

					if (!oTop.hasClass('ui-resizable'))
					{
						oTop.resizable(oOptions);
					}

					const iHeight = Utils.pInt(Local.get(sClientSideKeyName)) || 300;
					fSetHeight(iHeight > iMinHeight ? iHeight : iMinHeight);
				}
			}
		;

		fDisable(false);

		Events.sub('layout', (layout) => {
			fDisable(Enums.Layout.BottomPreview !== layout);
		});
	};

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
					oLeft.css({
						'width': '' + iWidth + 'px'
					});

					oRight.css({
						'left': '' + iWidth + 'px'
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
					var iWidth = Utils.pInt(Local.get(sClientSideKeyName)) || iMinWidth;
					fSetWidth(iWidth > iMinWidth ? iWidth : iMinWidth);
				}
			},
			fResizeCreateFunction = (oEvent) => {
				if (oEvent && oEvent.target)
				{
					$(oEvent.target).find('.ui-resizable-handle')
						.on('mousedown', () => {
							Globals.$html.addClass('rl-resizer');
						})
						.on('mouseup', () => {
							Globals.$html.removeClass('rl-resizer');
						})
					;
				}
			},
			fResizeResizeFunction = _.debounce(() => {
				Globals.$html.addClass('rl-resizer');
			}, 500, true),
			fResizeStartFunction = () => {
				Globals.$html.addClass('rl-resizer');
			},
			fResizeStopFunction = (oEvent, oObject) => {
				Globals.$html.removeClass('rl-resizer');
				if (oObject && oObject.size && oObject.size.width)
				{
					Local.set(sClientSideKeyName, oObject.size.width);

					oRight.css({
						'left': '' + oObject.size.width + 'px'
					});
				}
			}
		;

		if (null !== mLeftWidth)
		{
			fSetWidth(mLeftWidth > iMinWidth ? mLeftWidth : iMinWidth);
		}

		oLeft.resizable({
			'helper': 'ui-resizable-helper-w',
			'minWidth': iMinWidth,
			'maxWidth': 350,
			'handles': 'e',
			'create': fResizeCreateFunction,
			'resize': fResizeResizeFunction,
			'start': fResizeStartFunction,
			'stop': fResizeStopFunction
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
	};

	bootstartTwoFactorScreen() {
		kn.showScreenPopup(require('View/Popup/TwoFactorConfiguration'), [true]);
	}

	bootstartWelcomePopup(url) {
		kn.showScreenPopup(require('View/Popup/WelcomePage'), [url]);
	}

	bootstartLoginScreen() {

		Globals.$html.removeClass('rl-user-auth').addClass('rl-user-no-auth');

		const customLoginLink = Utils.pString(Settings.settingsGet('CustomLoginLink'));
		if (!customLoginLink)
		{
			kn.startScreens([
				require('Screen/User/Login')
			]);

			Plugins.runHook('rl-start-login-screens');
			Events.pub('rl.bootstart-login-screens');
		}
		else
		{
			kn.routeOff();
			kn.setHash(Links.root(), true);
			kn.routeOff();

			_.defer(function () {
				window.location.href = customLoginLink;
			});
		}
	}

	bootend() {
		if (progressJs)
		{
			kn.hideLoading();

			progressJs.onbeforeend(() =>  {
				$('.progressjs-container').hide();
				_.delay(() => {
					$('.progressjs-container').remove();
				}, 100);
			});

			progressJs.set(100).end();
		}
		else
		{
			kn.hideLoading();
		}
	};

	bootstart() {

		super.bootstart();

		require('Stores/User/App').populate();
		require('Stores/User/Settings').populate();
		require('Stores/User/Notification').populate();
		require('Stores/User/Account').populate();
		require('Stores/User/Contact').populate();

		var
			$LAB = require('$LAB'),
			sJsHash = Settings.settingsGet('JsHash'),
			sStartupUrl = Utils.pString(Settings.settingsGet('StartupUrl')),
			iContactsSyncInterval = Utils.pInt(Settings.settingsGet('ContactsSyncInterval')),
			bGoogle = Settings.settingsGet('AllowGoogleSocial'),
			bFacebook = Settings.settingsGet('AllowFacebookSocial'),
			bTwitter = Settings.settingsGet('AllowTwitterSocial')
		;

		if (progressJs)
		{
			progressJs.set(90);
		}

		Globals.leftPanelDisabled.subscribe((value) => {
			Events.pub('left-panel.' + (value ? 'off' : 'on'));
		});

		this.setWindowTitle('');
		if (!!Settings.settingsGet('Auth'))
		{
			Globals.$html.addClass('rl-user-auth');

			if (Settings.capa(Enums.Capa.TwoFactor) &&
				Settings.capa(Enums.Capa.TwoFactorForce) &&
				Settings.settingsGet('RequireTwoFactor'))
			{
				this.bootend();
				this.bootstartTwoFactorScreen();
			}
			else
			{
				this.setWindowTitle(Translator.i18n('TITLES/LOADING'));

//require.ensure([], function() { // require code splitting

				this.foldersReload((value) => {

					this.bootend();

					if (value)
					{
						if ('' !== sStartupUrl)
						{
							kn.routeOff();
							kn.setHash(Links.root(sStartupUrl), true);
							kn.routeOn();
						}

						if ($LAB && window.crypto && window.crypto.getRandomValues && Settings.capa(Enums.Capa.OpenPGP))
						{
							const openpgpCallback = (openpgp) => {

								PgpStore.openpgp = openpgp;

								if (window.Worker)
								{
									try
									{
										PgpStore.openpgp.initWorker(Links.openPgpWorkerJs());
									}
									catch (e)
									{
										Utils.log(e);
									}
								}

//								PgpStore.openpgp.config.useWebCrypto = false;

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
								$LAB.script(Links.openPgpJs()).wait(() => {
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

						kn.startScreens([
							require('Screen/User/MailBox'),
							Settings.capa(Enums.Capa.Settings) ? require('Screen/User/Settings') : null,
							false ? require('Screen/User/About') : null
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
						_.delay(() => Remote.appDelayStart(Utils.emptyFunction), 35000);

						Events.sub('rl.auto-logout', () => this.logout());

						Plugins.runHook('rl-start-user-screens');
						Events.pub('rl.bootstart-user-screens');

						if (Settings.settingsGet('WelcomePageUrl'))
						{
							_.delay(() => this.bootstartWelcomePopup(Settings.settingsGet('WelcomePageUrl')), 1000);
						}

						if (!!Settings.settingsGet('AccountSignMe') &&
							window.navigator.registerProtocolHandler &&
							Settings.capa(Enums.Capa.Composer))
						{
							_.delay(() => {
								try {
									window.navigator.registerProtocolHandler('mailto',
										window.location.protocol + '//' + window.location.host + window.location.pathname + '?mailto&to=%s',
										'' + (Settings.settingsGet('Title') || 'RainLoop'));
								} catch(e) {}

								if (Settings.settingsGet('MailToEmail'))
								{
									Utils.mailToHelper(Settings.settingsGet('MailToEmail'), require('View/Popup/Compose'));
								}
							}, 500);
						}

						if (!Globals.bMobileDevice)
						{
							_.defer(() => this.initVerticalLayoutResizer(Enums.ClientSideKeyName.FolderListSize));

							if (Tinycon && Settings.settingsGet('FaviconStatus') && !Settings.settingsGet('Filtered') )
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

//}); // require code splitting

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
