/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		window = require('../External/window.js'),
		$ = require('../External/jquery.js'),
		_ = require('../External/underscore.js'),
		moment = require('../External/moment.js'),
		
		Enums = require('../Common/Enums.js'),
		Globals = require('../Common/Globals.js'),
		Consts = require('../Common/Consts.js'),
		Plugins = require('../Common/Plugins.js'),
		Utils = require('../Common/Utils.js'),
		LinkBuilder = require('../Common/LinkBuilder.js'),

		kn = require('../Knoin/Knoin.js'),

		Data = require('../Storages/WebMailDataStorage.js'),
		Cache = require('../Storages/WebMailCacheStorage.js'),
		Remote = require('../Storages/WebMailAjaxRemoteStorage.js'),
		
		PopupsFolderSystemViewModel = require('../ViewModels/Popups/PopupsAskViewModel.js'),
		PopupsAskViewModel = require('../ViewModels/Popups/PopupsAskViewModel.js'),
		
		AbstractApp = require('./AbstractApp.js')
	;

	/**
	 * @constructor
	 * @extends AbstractApp
	 */
	function RainLoopApp()
	{
		AbstractApp.call(this);

		this.oData = null;
		this.oRemote = null;
		this.oCache = null;
		this.oMoveCache = {};

		this.quotaDebounce = _.debounce(this.quota, 1000 * 30);
		this.moveOrDeleteResponseHelper = _.bind(this.moveOrDeleteResponseHelper, this);

		this.messagesMoveTrigger = _.debounce(this.messagesMoveTrigger, 500);

		window.setInterval(function () {
			RL.pub('interval.30s');
		}, 30000);

		window.setInterval(function () {
			RL.pub('interval.1m');
		}, 60000);

		window.setInterval(function () {
			RL.pub('interval.2m');
		}, 60000 * 2);

		window.setInterval(function () {
			RL.pub('interval.3m');
		}, 60000 * 3);

		window.setInterval(function () {
			RL.pub('interval.5m');
		}, 60000 * 5);

		window.setInterval(function () {
			RL.pub('interval.10m');
		}, 60000 * 10);

		window.setTimeout(function () {
			window.setInterval(function () {
				RL.pub('interval.10m-after5m');
			}, 60000 * 10);
		}, 60000 * 5);

		$.wakeUp(function () {
			Remote.jsVersion(function (sResult, oData) {
				if (Enums.StorageResultType.Success === sResult && oData && !oData.Result)
				{
					if (window.parent && !!RL.settingsGet('InIframe'))
					{
						window.parent.location.reload();
					}
					else
					{
						window.location.reload();
					}
				}
			}, RL.settingsGet('Version'));
		}, {}, 60 * 60 * 1000);
	}

	_.extend(RainLoopApp.prototype, AbstractApp.prototype);

	RainLoopApp.prototype.oData = null;
	RainLoopApp.prototype.oRemote = null;
	RainLoopApp.prototype.oCache = null;

	/**
	 * @return {WebMailDataStorage}
	 */
	RainLoopApp.prototype.data = function ()
	{
		if (null === this.oData)
		{
			this.oData = new WebMailDataStorage();
		}

		return this.oData;
	};

	/**
	 * @return {WebMailAjaxRemoteStorage}
	 */
	RainLoopApp.prototype.remote = function ()
	{
		if (null === this.oRemote)
		{
			this.oRemote = new WebMailAjaxRemoteStorage();
		}

		return this.oRemote;
	};

	RainLoopApp.prototype.reloadFlagsCurrentMessageListAndMessageFromCache = function ()
	{
		_.each(Data.messageList(), function (oMessage) {
			Cache.initMessageFlagsFromCache(oMessage);
		});

		Cache.initMessageFlagsFromCache(Data.message());
	};

	/**
	 * @param {boolean=} bDropPagePosition = false
	 * @param {boolean=} bDropCurrenFolderCache = false
	 */
	RainLoopApp.prototype.reloadMessageList = function (bDropPagePosition, bDropCurrenFolderCache)
	{
		var
			iOffset = (Data.messageListPage() - 1) * Data.messagesPerPage()
		;

		if (Utils.isUnd(bDropCurrenFolderCache) ? false : !!bDropCurrenFolderCache)
		{
			Cache.setFolderHash(Data.currentFolderFullNameRaw(), '');
		}

		if (Utils.isUnd(bDropPagePosition) ? false : !!bDropPagePosition)
		{
			Data.messageListPage(1);
			iOffset = 0;
		}

		Data.messageListLoading(true);
		Remote.messageList(function (sResult, oData, bCached) {

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				Data.messageListError('');
				Data.messageListLoading(false);
				Data.setMessageList(oData, bCached);
			}
			else if (Enums.StorageResultType.Unload === sResult)
			{
				Data.messageListError('');
				Data.messageListLoading(false);
			}
			else if (Enums.StorageResultType.Abort !== sResult)
			{
				Data.messageList([]);
				Data.messageListLoading(false);
				Data.messageListError(oData && oData.ErrorCode ?
					Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_GET_MESSAGE_LIST')
				);
			}

		}, Data.currentFolderFullNameRaw(), iOffset, Data.messagesPerPage(), Data.messageListSearch());
	};

	RainLoopApp.prototype.recacheInboxMessageList = function ()
	{
		Remote.messageList(Utils.emptyFunction, 'INBOX', 0, Data.messagesPerPage(), '', true);
	};

	RainLoopApp.prototype.reloadMessageListHelper = function (bEmptyList)
	{
		RL.reloadMessageList(bEmptyList);
	};

	/**
	 * @param {Function} fResultFunc
	 * @returns {boolean}
	 */
	RainLoopApp.prototype.contactsSync = function (fResultFunc)
	{
		var oContacts = Data.contacts;
		if (oContacts.importing() || oContacts.syncing() || !Data.enableContactsSync() || !Data.allowContactsSync())
		{
			return false;
		}

		oContacts.syncing(true);

		Remote.contactsSync(function (sResult, oData) {

			oContacts.syncing(false);

			if (fResultFunc)
			{
				fResultFunc(sResult, oData);
			}
		});

		return true;
	};

	RainLoopApp.prototype.messagesMoveTrigger = function ()
	{
		var
			self = this,
			sSpamFolder = Data.spamFolder()
		;

		_.each(this.oMoveCache, function (oItem) {

			var
				bSpam = sSpamFolder === oItem['To'],
				bHam = !bSpam && sSpamFolder === oItem['From'] && 'INBOX' === oItem['To']
			;

			Remote.messagesMove(self.moveOrDeleteResponseHelper, oItem['From'], oItem['To'], oItem['Uid'],
				bSpam ? 'SPAM' : (bHam ? 'HAM' : ''));
		});

		this.oMoveCache = {};
	};

	RainLoopApp.prototype.messagesMoveHelper = function (sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForMove)
	{
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
	};

	RainLoopApp.prototype.messagesCopyHelper = function (sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForCopy)
	{
		Remote.messagesCopy(
			this.moveOrDeleteResponseHelper,
			sFromFolderFullNameRaw,
			sToFolderFullNameRaw,
			aUidForCopy
		);
	};

	RainLoopApp.prototype.messagesDeleteHelper = function (sFromFolderFullNameRaw, aUidForRemove)
	{
		Remote.messagesDelete(
			this.moveOrDeleteResponseHelper,
			sFromFolderFullNameRaw,
			aUidForRemove
		);
	};

	RainLoopApp.prototype.moveOrDeleteResponseHelper = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && Data.currentFolder())
		{
			if (oData && Utils.isArray(oData.Result) && 2 === oData.Result.length)
			{
				Cache.setFolderHash(oData.Result[0], oData.Result[1]);
			}
			else
			{
				Cache.setFolderHash(Data.currentFolderFullNameRaw(), '');

				if (oData && -1 < Utils.inArray(oData.ErrorCode,
					[Enums.Notification.CantMoveMessage, Enums.Notification.CantCopyMessage]))
				{
					window.alert(Utils.getNotification(oData.ErrorCode));
				}
			}

			RL.reloadMessageListHelper(0 === Data.messageList().length);
			RL.quotaDebounce();
		}
	};

	/**
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForRemove
	 */
	RainLoopApp.prototype.deleteMessagesFromFolderWithoutCheck = function (sFromFolderFullNameRaw, aUidForRemove)
	{
		this.messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove);
		Data.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove);
	};

	/**
	 * @param {number} iDeleteType
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForRemove
	 * @param {boolean=} bUseFolder = true
	 */
	RainLoopApp.prototype.deleteMessagesFromFolder = function (iDeleteType, sFromFolderFullNameRaw, aUidForRemove, bUseFolder)
	{
		var
			self = this,
			oMoveFolder = null,
			nSetSystemFoldersNotification = null
		;

		switch (iDeleteType)
		{
			case Enums.FolderType.Spam:
				oMoveFolder = Cache.getFolderFromCacheList(Data.spamFolder());
				nSetSystemFoldersNotification = Enums.SetSystemFoldersNotification.Spam;
				break;
			case Enums.FolderType.NotSpam:
				oMoveFolder = Cache.getFolderFromCacheList('INBOX');
				break;
			case Enums.FolderType.Trash:
				oMoveFolder = Cache.getFolderFromCacheList(Data.trashFolder());
				nSetSystemFoldersNotification = Enums.SetSystemFoldersNotification.Trash;
				break;
			case Enums.FolderType.Archive:
				oMoveFolder = Cache.getFolderFromCacheList(Data.archiveFolder());
				nSetSystemFoldersNotification = Enums.SetSystemFoldersNotification.Archive;
				break;
		}

		bUseFolder = Utils.isUnd(bUseFolder) ? true : !!bUseFolder;
		if (bUseFolder)
		{
			if ((Enums.FolderType.Spam === iDeleteType && Consts.Values.UnuseOptionValue === Data.spamFolder()) ||
				(Enums.FolderType.Trash === iDeleteType && Consts.Values.UnuseOptionValue === Data.trashFolder()) ||
				(Enums.FolderType.Archive === iDeleteType && Consts.Values.UnuseOptionValue === Data.archiveFolder()))
			{
				bUseFolder = false;
			}
		}

		if (!oMoveFolder && bUseFolder)
		{
			kn.showScreenPopup(PopupsFolderSystemViewModel, [nSetSystemFoldersNotification]);
		}
		else if (!bUseFolder || (Enums.FolderType.Trash === iDeleteType &&
			(sFromFolderFullNameRaw === Data.spamFolder() || sFromFolderFullNameRaw === Data.trashFolder())))
		{
			kn.showScreenPopup(PopupsAskViewModel, [Utils.i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'), function () {

				self.messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove);
				Data.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove);

			}]);
		}
		else if (oMoveFolder)
		{
			this.messagesMoveHelper(sFromFolderFullNameRaw, oMoveFolder.fullNameRaw, aUidForRemove);
			Data.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove, oMoveFolder.fullNameRaw);
		}
	};

	/**
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForMove
	 * @param {string} sToFolderFullNameRaw
	 * @param {boolean=} bCopy = false
	 */
	RainLoopApp.prototype.moveMessagesToFolder = function (sFromFolderFullNameRaw, aUidForMove, sToFolderFullNameRaw, bCopy)
	{
		if (sFromFolderFullNameRaw !== sToFolderFullNameRaw && Utils.isArray(aUidForMove) && 0 < aUidForMove.length)
		{
			var
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

				Data.removeMessagesFromList(oFromFolder.fullNameRaw, aUidForMove, oToFolder.fullNameRaw, bCopy);
				return true;
			}
		}

		return false;
	};

	/**
	 * @param {Function=} fCallback
	 */
	RainLoopApp.prototype.folders = function (fCallback)
	{
		this.data().foldersLoading(true);
		this.remote().folders(_.bind(function (sResult, oData) {

			Data.foldersLoading(false);
			if (Enums.StorageResultType.Success === sResult)
			{
				this.data().setFolders(oData);
				if (fCallback)
				{
					fCallback(true);
				}
			}
			else
			{
				if (fCallback)
				{
					fCallback(false);
				}
			}
		}, this));
	};

	RainLoopApp.prototype.reloadOpenPgpKeys = function ()
	{
		if (Data.capaOpenPGP())
		{
			var
				aKeys = [],
				oEmail = new EmailModel(),
				oOpenpgpKeyring = Data.openpgpKeyring,
				oOpenpgpKeys = oOpenpgpKeyring ? oOpenpgpKeyring.getAllKeys() : []
			;

			_.each(oOpenpgpKeys, function (oItem, iIndex) {
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

			Data.openpgpkeys(aKeys);
		}
	};

	RainLoopApp.prototype.accountsAndIdentities = function ()
	{
		Data.accountsLoading(true);
		Data.identitiesLoading(true);

		Remote.accountsAndIdentities(function (sResult, oData) {

			Data.accountsLoading(false);
			Data.identitiesLoading(false);

			if (Enums.StorageResultType.Success === sResult && oData.Result)
			{
				var
					sParentEmail = RL.settingsGet('ParentEmail'),
					sAccountEmail = Data.accountEmail()
				;

				sParentEmail = '' === sParentEmail ? sAccountEmail : sParentEmail;

				if (Utils.isArray(oData.Result['Accounts']))
				{
					Data.accounts(_.map(oData.Result['Accounts'], function (sValue) {
						return new AccountModel(sValue, sValue !== sParentEmail);
					}));
				}

				if (Utils.isArray(oData.Result['Identities']))
				{
					Data.identities(_.map(oData.Result['Identities'], function (oIdentityData) {

						var
							sId = Utils.pString(oIdentityData['Id']),
							sEmail = Utils.pString(oIdentityData['Email']),
							oIdentity = new IdentityModel(sId, sEmail, sId !== sAccountEmail)
						;

						oIdentity.name(Utils.pString(oIdentityData['Name']));
						oIdentity.replyTo(Utils.pString(oIdentityData['ReplyTo']));
						oIdentity.bcc(Utils.pString(oIdentityData['Bcc']));

						return oIdentity;
					}));
				}
			}
		});
	};

	RainLoopApp.prototype.quota = function ()
	{
		this.remote().quota(function (sResult, oData) {
			if (Enums.StorageResultType.Success === sResult &&	oData && oData.Result &&
				Utils.isArray(oData.Result) && 1 < oData.Result.length &&
				Utils.isPosNumeric(oData.Result[0], true) && Utils.isPosNumeric(oData.Result[1], true))
			{
				Data.userQuota(Utils.pInt(oData.Result[1]) * 1024);
				Data.userUsageSize(Utils.pInt(oData.Result[0]) * 1024);
			}
		});
	};

	/**
	 * @param {string} sFolder
	 * @param {Array=} aList = []
	 */
	RainLoopApp.prototype.folderInformation = function (sFolder, aList)
	{
		if ('' !== Utils.trim(sFolder))
		{
			this.remote().folderInformation(function (sResult, oData) {
				if (Enums.StorageResultType.Success === sResult)
				{
					if (oData && oData.Result && oData.Result.Hash && oData.Result.Folder)
					{
						var
							iUtc = moment().unix(),
							sHash = Cache.getFolderHash(oData.Result.Folder),
							oFolder = Cache.getFolderFromCacheList(oData.Result.Folder),
							bCheck = false,
							sUid = '',
							aList = [],
							bUnreadCountChange = false,
							oFlags = null
						;

						if (oFolder)
						{
							oFolder.interval = iUtc;

							if (oData.Result.Hash)
							{
								Cache.setFolderHash(oData.Result.Folder, oData.Result.Hash);
							}

							if (Utils.isNormal(oData.Result.MessageCount))
							{
								oFolder.messageCountAll(oData.Result.MessageCount);
							}

							if (Utils.isNormal(oData.Result.MessageUnseenCount))
							{
								if (Utils.pInt(oFolder.messageCountUnread()) !== Utils.pInt(oData.Result.MessageUnseenCount))
								{
									bUnreadCountChange = true;
								}

								oFolder.messageCountUnread(oData.Result.MessageUnseenCount);
							}

							if (bUnreadCountChange)
							{
								Cache.clearMessageFlagsFromCacheByFolder(oFolder.fullNameRaw);
							}

							if (oData.Result.Flags)
							{
								for (sUid in oData.Result.Flags)
								{
									if (oData.Result.Flags.hasOwnProperty(sUid))
									{
										bCheck = true;
										oFlags = oData.Result.Flags[sUid];
										Cache.storeMessageFlagsToCacheByFolderAndUid(oFolder.fullNameRaw, sUid.toString(), [
											!oFlags['IsSeen'], !!oFlags['IsFlagged'], !!oFlags['IsAnswered'], !!oFlags['IsForwarded'], !!oFlags['IsReadReceipt']
										]);
									}
								}

								if (bCheck)
								{
									RL.reloadFlagsCurrentMessageListAndMessageFromCache();
								}
							}

							Data.initUidNextAndNewMessages(oFolder.fullNameRaw, oData.Result.UidNext, oData.Result.NewMessages);

							if (oData.Result.Hash !== sHash || '' === sHash)
							{
								if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
								{
									RL.reloadMessageList();
								}
								else if ('INBOX' === oFolder.fullNameRaw)
								{
									RL.recacheInboxMessageList();
								}
							}
							else if (bUnreadCountChange)
							{
								if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
								{
									aList = Data.messageList();
									if (Utils.isNonEmptyArray(aList))
									{
										RL.folderInformation(oFolder.fullNameRaw, aList);
									}
								}
							}
						}
					}
				}
			}, sFolder, aList);
		}
	};

	/**
	 * @param {boolean=} bBoot = false
	 */
	RainLoopApp.prototype.folderInformationMultiply = function (bBoot)
	{
		bBoot = Utils.isUnd(bBoot) ? false : !!bBoot;

		var
			iUtc = moment().unix(),
			aFolders = Data.getNextFolderNames(bBoot)
		;

		if (Utils.isNonEmptyArray(aFolders))
		{
			this.remote().folderInformationMultiply(function (sResult, oData) {
				if (Enums.StorageResultType.Success === sResult)
				{
					if (oData && oData.Result && oData.Result.List && Utils.isNonEmptyArray(oData.Result.List))
					{
						_.each(oData.Result.List, function (oItem) {

							var
								aList = [],
								sHash = Cache.getFolderHash(oItem.Folder),
								oFolder = Cache.getFolderFromCacheList(oItem.Folder),
								bUnreadCountChange = false
							;

							if (oFolder)
							{
								oFolder.interval = iUtc;

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
									if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
									{
										RL.reloadMessageList();
									}
								}
								else if (bUnreadCountChange)
								{
									if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
									{
										aList = Data.messageList();
										if (Utils.isNonEmptyArray(aList))
										{
											RL.folderInformation(oFolder.fullNameRaw, aList);
										}
									}
								}
							}
						});

						if (bBoot)
						{
							RL.folderInformationMultiply(true);
						}
					}
				}
			}, aFolders);
		}
	};

	RainLoopApp.prototype.setMessageSeen = function (oMessage)
	{
		if (oMessage.unseen())
		{
			oMessage.unseen(false);

			var oFolder = Cache.getFolderFromCacheList(oMessage.folderFullNameRaw);
			if (oFolder)
			{
				oFolder.messageCountUnread(0 <= oFolder.messageCountUnread() - 1 ?
					oFolder.messageCountUnread() - 1 : 0);
			}

			Cache.storeMessageFlagsToCache(oMessage);
			RL.reloadFlagsCurrentMessageListAndMessageFromCache();
		}

		Remote.messageSetSeen(Utils.emptyFunction, oMessage.folderFullNameRaw, [oMessage.uid], true);
	};

	RainLoopApp.prototype.googleConnect = function ()
	{
		window.open(LinkBuilder.socialGoogle(), 'Google', 'left=200,top=100,width=650,height=600,menubar=no,status=no,resizable=yes,scrollbars=yes');
	};

	RainLoopApp.prototype.twitterConnect = function ()
	{
		window.open(LinkBuilder.socialTwitter(), 'Twitter', 'left=200,top=100,width=650,height=350,menubar=no,status=no,resizable=yes,scrollbars=yes');
	};

	RainLoopApp.prototype.facebookConnect = function ()
	{
		window.open(LinkBuilder.socialFacebook(), 'Facebook', 'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
	};

	/**
	 * @param {boolean=} bFireAllActions
	 */
	RainLoopApp.prototype.socialUsers = function (bFireAllActions)
	{
		if (bFireAllActions)
		{
			Data.googleActions(true);
			Data.facebookActions(true);
			Data.twitterActions(true);
		}

		Remote.socialUsers(function (sResult, oData) {

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				Data.googleUserName(oData.Result['Google'] || '');
				Data.facebookUserName(oData.Result['Facebook'] || '');
				Data.twitterUserName(oData.Result['Twitter'] || '');
			}
			else
			{
				Data.googleUserName('');
				Data.facebookUserName('');
				Data.twitterUserName('');
			}

			Data.googleLoggined('' !== Data.googleUserName());
			Data.facebookLoggined('' !== Data.facebookUserName());
			Data.twitterLoggined('' !== Data.twitterUserName());

			Data.googleActions(false);
			Data.facebookActions(false);
			Data.twitterActions(false);
		});
	};

	RainLoopApp.prototype.googleDisconnect = function ()
	{
		Data.googleActions(true);
		Remote.googleDisconnect(function () {
			RL.socialUsers();
		});
	};

	RainLoopApp.prototype.facebookDisconnect = function ()
	{
		Data.facebookActions(true);
		Remote.facebookDisconnect(function () {
			RL.socialUsers();
		});
	};

	RainLoopApp.prototype.twitterDisconnect = function ()
	{
		Data.twitterActions(true);
		Remote.twitterDisconnect(function () {
			RL.socialUsers();
		});
	};

	/**
	 * @param {Array} aSystem
	 * @param {Array} aList
	 * @param {Array=} aDisabled
	 * @param {Array=} aHeaderLines
	 * @param {?number=} iUnDeep
	 * @param {Function=} fDisableCallback
	 * @param {Function=} fVisibleCallback
	 * @param {Function=} fRenameCallback
	 * @param {boolean=} bSystem
	 * @param {boolean=} bBuildUnvisible
	 * @return {Array}
	 */
	RainLoopApp.prototype.folderListOptionsBuilder = function (aSystem, aList, aDisabled, aHeaderLines, iUnDeep, fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible)
	{
		var
			iIndex = 0,
			iLen = 0,
			/**
			 * @type {?FolderModel}
			 */
			oItem = null,
			bSep = false,
			sDeepPrefix = '\u00A0\u00A0\u00A0',
			aResult = []
		;

		bSystem = !Utils.isNormal(bSystem) ? 0 < aSystem.length : bSystem;
		bBuildUnvisible = Utils.isUnd(bBuildUnvisible) ? false : !!bBuildUnvisible;
		iUnDeep = !Utils.isNormal(iUnDeep) ? 0 : iUnDeep;
		fDisableCallback = Utils.isNormal(fDisableCallback) ? fDisableCallback : null;
		fVisibleCallback = Utils.isNormal(fVisibleCallback) ? fVisibleCallback : null;
		fRenameCallback = Utils.isNormal(fRenameCallback) ? fRenameCallback : null;

		if (!Utils.isArray(aDisabled))
		{
			aDisabled = [];
		}

		if (!Utils.isArray(aHeaderLines))
		{
			aHeaderLines = [];
		}

		for (iIndex = 0, iLen = aHeaderLines.length; iIndex < iLen; iIndex++)
		{
			aResult.push({
				'id': aHeaderLines[iIndex][0],
				'name': aHeaderLines[iIndex][1],
				'system': false,
				'seporator': false,
				'disabled': false
			});
		}

		bSep = true;
		for (iIndex = 0, iLen = aSystem.length; iIndex < iLen; iIndex++)
		{
			oItem = aSystem[iIndex];
			if (fVisibleCallback ? fVisibleCallback.call(null, oItem) : true)
			{
				if (bSep && 0 < aResult.length)
				{
					aResult.push({
						'id': '---',
						'name': '---',
						'system': false,
						'seporator': true,
						'disabled': true
					});
				}

				bSep = false;
				aResult.push({
					'id': oItem.fullNameRaw,
					'name': fRenameCallback ? fRenameCallback.call(null, oItem) : oItem.name(),
					'system': true,
					'seporator': false,
					'disabled': !oItem.selectable || -1 < Utils.inArray(oItem.fullNameRaw, aDisabled) ||
						(fDisableCallback ? fDisableCallback.call(null, oItem) : false)
				});
			}
		}

		bSep = true;
		for (iIndex = 0, iLen = aList.length; iIndex < iLen; iIndex++)
		{
			oItem = aList[iIndex];
			if (oItem.subScribed() || !oItem.existen)
			{
				if (fVisibleCallback ? fVisibleCallback.call(null, oItem) : true)
				{
					if (Enums.FolderType.User === oItem.type() || !bSystem || 0 < oItem.subFolders().length)
					{
						if (bSep && 0 < aResult.length)
						{
							aResult.push({
								'id': '---',
								'name': '---',
								'system': false,
								'seporator': true,
								'disabled': true
							});
						}

						bSep = false;
						aResult.push({
							'id': oItem.fullNameRaw,
							'name': (new window.Array(oItem.deep + 1 - iUnDeep)).join(sDeepPrefix) +
								(fRenameCallback ? fRenameCallback.call(null, oItem) : oItem.name()),
							'system': false,
							'seporator': false,
							'disabled': !oItem.selectable || -1 < Utils.inArray(oItem.fullNameRaw, aDisabled) ||
								(fDisableCallback ? fDisableCallback.call(null, oItem) : false)
						});
					}
				}
			}

			if (oItem.subScribed() && 0 < oItem.subFolders().length)
			{
				aResult = aResult.concat(RL.folderListOptionsBuilder([], oItem.subFolders(), aDisabled, [],
					iUnDeep, fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible));
			}
		}

		return aResult;
	};

	/**
	 * @param {string} sQuery
	 * @param {Function} fCallback
	 */
	RainLoopApp.prototype.getAutocomplete = function (sQuery, fCallback)
	{
		var
			aData = []
		;

		Remote.suggestions(function (sResult, oData) {
			if (Enums.StorageResultType.Success === sResult && oData && Utils.isArray(oData.Result))
			{
				aData = _.map(oData.Result, function (aItem) {
					return aItem && aItem[0] ? new EmailModel(aItem[0], aItem[1]) : null;
				});

				fCallback(_.compact(aData));
			}
			else if (Enums.StorageResultType.Abort !== sResult)
			{
				fCallback([]);
			}

		}, sQuery);
	};

	/**
	 * @param {string} sQuery
	 * @param {Function} fCallback
	 */
	RainLoopApp.prototype.getContactTagsAutocomplete = function (sQuery, fCallback)
	{
		fCallback(_.filter(Data.contactTags(), function (oContactTag) {
			return oContactTag && oContactTag.filterHelper(sQuery);
		}));
	};

	/**
	 * @param {string} sMailToUrl
	 * @returns {boolean}
	 */
	RainLoopApp.prototype.mailToHelper = function (sMailToUrl)
	{
		if (sMailToUrl && 'mailto:' === sMailToUrl.toString().substr(0, 7).toLowerCase())
		{
			sMailToUrl = sMailToUrl.toString().substr(7);

			var
				oParams = {},
				oEmailModel = null,
				sEmail = sMailToUrl.replace(/\?.+$/, ''),
				sQueryString = sMailToUrl.replace(/^[^\?]*\?/, '')
			;

			oEmailModel = new EmailModel();
			oEmailModel.parse(window.decodeURIComponent(sEmail));

			if (oEmailModel && oEmailModel.email)
			{
				oParams = Utils.simpleQueryParser(sQueryString);
				kn.showScreenPopup(PopupsComposeViewModel, [Enums.ComposeType.Empty, null, [oEmailModel],
					Utils.isUnd(oParams.subject) ? null : Utils.pString(oParams.subject),
					Utils.isUnd(oParams.body) ? null : Utils.plainToHtml(Utils.pString(oParams.body))
				]);
			}

			return true;
		}

		return false;
	};

	RainLoopApp.prototype.bootstart = function ()
	{
		RL.pub('rl.bootstart');
		AbstractApp.prototype.bootstart.call(this);

		Data.populateDataOnStart();

		var
			sCustomLoginLink = '',
			sJsHash = RL.settingsGet('JsHash'),
			iContactsSyncInterval = Utils.pInt(RL.settingsGet('ContactsSyncInterval')),
			bGoogle = RL.settingsGet('AllowGoogleSocial'),
			bFacebook = RL.settingsGet('AllowFacebookSocial'),
			bTwitter = RL.settingsGet('AllowTwitterSocial')
		;

		if (!RL.settingsGet('ChangePasswordIsAllowed'))
		{
			kn.removeSettingsViewModel(SettingsChangePasswordScreen);
		}

		if (!RL.settingsGet('ContactsIsAllowed'))
		{
			kn.removeSettingsViewModel(SettingsContacts);
		}

		if (!RL.capa(Enums.Capa.AdditionalAccounts))
		{
			kn.removeSettingsViewModel(SettingsAccounts);
		}

		if (RL.capa(Enums.Capa.AdditionalIdentities))
		{
			kn.removeSettingsViewModel(SettingsIdentity);
		}
		else
		{
			kn.removeSettingsViewModel(SettingsIdentities);
		}

		if (!RL.capa(Enums.Capa.OpenPGP))
		{
			kn.removeSettingsViewModel(SettingsOpenPGP);
		}

		if (!RL.capa(Enums.Capa.TwoFactor))
		{
			kn.removeSettingsViewModel(SettingsSecurity);
		}

		if (!RL.capa(Enums.Capa.Themes))
		{
			kn.removeSettingsViewModel(SettingsThemes);
		}

		if (!RL.capa(Enums.Capa.Filters))
		{
			kn.removeSettingsViewModel(SettingsFilters);
		}

		if (!bGoogle && !bFacebook && !bTwitter)
		{
			kn.removeSettingsViewModel(SettingsSocialScreen);
		}

		Utils.initOnStartOrLangChange(function () {

			$.extend(true, $.magnificPopup.defaults, {
				'tClose': Utils.i18n('MAGNIFIC_POPUP/CLOSE'),
				'tLoading': Utils.i18n('MAGNIFIC_POPUP/LOADING'),
				'gallery': {
					'tPrev': Utils.i18n('MAGNIFIC_POPUP/GALLERY_PREV'),
					'tNext': Utils.i18n('MAGNIFIC_POPUP/GALLERY_NEXT'),
					'tCounter': Utils.i18n('MAGNIFIC_POPUP/GALLERY_COUNTER')
				},
				'image': {
					'tError': Utils.i18n('MAGNIFIC_POPUP/IMAGE_ERROR')
				},
				'ajax': {
					'tError': Utils.i18n('MAGNIFIC_POPUP/AJAX_ERROR')
				}
			});

		}, this);

		if (window.SimplePace)
		{
			window.SimplePace.set(70);
			window.SimplePace.sleep();
		}

		if (!!RL.settingsGet('Auth'))
		{
			this.setTitle(Utils.i18n('TITLES/LOADING'));

			this.folders(_.bind(function (bValue) {

				kn.hideLoading();

				if (bValue)
				{
					if (window.$LAB && window.crypto && window.crypto.getRandomValues && RL.capa(Enums.Capa.OpenPGP))
					{
						window.$LAB.script(window.openpgp ? '' : LinkBuilder.openPgpJs()).wait(function () {
							if (window.openpgp)
							{
								Data.openpgpKeyring = new window.openpgp.Keyring();
								Data.capaOpenPGP(true);

								RL.pub('openpgp.init');

								RL.reloadOpenPgpKeys();
							}
						});
					}
					else
					{
						Data.capaOpenPGP(false);
					}

					kn.startScreens([MailBoxScreen, SettingsScreen]);

					if (bGoogle || bFacebook || bTwitter)
					{
						RL.socialUsers(true);
					}

					RL.sub('interval.2m', function () {
						RL.folderInformation('INBOX');
					});

					RL.sub('interval.2m', function () {
						var sF = Data.currentFolderFullNameRaw();
						if ('INBOX' !== sF)
						{
							RL.folderInformation(sF);
						}
					});

					RL.sub('interval.3m', function () {
						RL.folderInformationMultiply();
					});

					RL.sub('interval.5m', function () {
						RL.quota();
					});

					RL.sub('interval.10m', function () {
						RL.folders();
					});

					iContactsSyncInterval = 5 <= iContactsSyncInterval ? iContactsSyncInterval : 20;
					iContactsSyncInterval = 320 >= iContactsSyncInterval ? iContactsSyncInterval : 320;

					window.setInterval(function () {
						RL.contactsSync();
					}, iContactsSyncInterval * 60000 + 5000);

					_.delay(function () {
						RL.contactsSync();
					}, 5000);

					_.delay(function () {
						RL.folderInformationMultiply(true);
					}, 500);

					Plugins.runHook('rl-start-user-screens');
					RL.pub('rl.bootstart-user-screens');

					if (!!RL.settingsGet('AccountSignMe') && window.navigator.registerProtocolHandler)
					{
						_.delay(function () {
							try {
								window.navigator.registerProtocolHandler('mailto',
									window.location.protocol + '//' + window.location.host + window.location.pathname + '?mailto&to=%s',
									'' + (RL.settingsGet('Title') || 'RainLoop'));
							} catch(e) {}

							if (RL.settingsGet('MailToEmail'))
							{
								RL.mailToHelper(RL.settingsGet('MailToEmail'));
							}
						}, 500);
					}
				}
				else
				{
					kn.startScreens([LoginScreen]);

					Plugins.runHook('rl-start-login-screens');
					RL.pub('rl.bootstart-login-screens');
				}

				if (window.SimplePace)
				{
					window.SimplePace.set(100);
				}

				if (!Globals.bMobileDevice)
				{
					_.defer(function () {
						Utils.initLayoutResizer('#rl-left', '#rl-right', Enums.ClientSideKeyName.FolderListSize);
					});
				}

			}, this));
		}
		else
		{
			sCustomLoginLink = Utils.pString(RL.settingsGet('CustomLoginLink'));
			if (!sCustomLoginLink)
			{
				kn.hideLoading();
				kn.startScreens([LoginScreen]);

				Plugins.runHook('rl-start-login-screens');
				RL.pub('rl.bootstart-login-screens');

				if (window.SimplePace)
				{
					window.SimplePace.set(100);
				}
			}
			else
			{
				kn.routeOff();
				kn.setHash(LinkBuilder.root(), true);
				kn.routeOff();

				_.defer(function () {
					window.location.href = sCustomLoginLink;
				});
			}
		}

		if (bGoogle)
		{
			window['rl_' + sJsHash + '_google_service'] = function () {
				Data.googleActions(true);
				RL.socialUsers();
			};
		}

		if (bFacebook)
		{
			window['rl_' + sJsHash + '_facebook_service'] = function () {
				Data.facebookActions(true);
				RL.socialUsers();
			};
		}

		if (bTwitter)
		{
			window['rl_' + sJsHash + '_twitter_service'] = function () {
				Data.twitterActions(true);
				RL.socialUsers();
			};
		}

		RL.sub('interval.1m', function () {
			Globals.momentTrigger(!Globals.momentTrigger());
		});

		Plugins.runHook('rl-start-screens');
		RL.pub('rl.bootstart-end');
	};

	module.exports = new RainLoopApp();

}(module));