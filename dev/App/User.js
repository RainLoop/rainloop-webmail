
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		progressJs = require('progressJs'),
		Tinycon = require('Tinycon'),

		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Consts = require('Common/Consts'),
		Plugins = require('Common/Plugins'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),
		Events = require('Common/Events'),

		Translator = require('Common/Translator'),
		Momentor = require('Common/Momentor'),

		kn = require('Knoin/Knoin'),

		Cache = require('Common/Cache'),

		SocialStore = require('Stores/Social'),
		SettingsStore = require('Stores/User/Settings'),
		AccountStore = require('Stores/User/Account'),
		IdentityStore = require('Stores/User/Identity'),
		TemplateStore = require('Stores/User/Template'),
		FolderStore = require('Stores/User/Folder'),
		PgpStore = require('Stores/User/Pgp'),
		MessageStore = require('Stores/User/Message'),
		ContactStore = require('Stores/User/Contact'),

		Local = require('Storage/Client'),
		Settings = require('Storage/Settings'),

		Remote = require('Remote/User/Ajax'),
		Promises = require('Promises/User/Ajax'),

		EmailModel = require('Model/Email'),
		AccountModel = require('Model/Account'),
		IdentityModel = require('Model/Identity'),
		TemplateModel = require('Model/Template'),
		OpenPgpKeyModel = require('Model/OpenPgpKey'),

		AbstractApp = require('App/Abstract')
	;

	/**
	 * @constructor
	 * @extends AbstractApp
	 */
	function AppUser()
	{
		AbstractApp.call(this, Remote);

		this.oMoveCache = {};

		this.quotaDebounce = _.debounce(this.quota, 1000 * 30);
		this.moveOrDeleteResponseHelper = _.bind(this.moveOrDeleteResponseHelper, this);

		this.messagesMoveTrigger = _.debounce(this.messagesMoveTrigger, 500);

		window.setInterval(function () {
			Events.pub('interval.30s');
		}, 30000);

		window.setInterval(function () {
			Events.pub('interval.1m');
		}, 60000);

		window.setInterval(function () {
			Events.pub('interval.2m');
		}, 60000 * 2);

		window.setInterval(function () {
			Events.pub('interval.3m');
		}, 60000 * 3);

		window.setInterval(function () {
			Events.pub('interval.5m');
		}, 60000 * 5);

		window.setInterval(function () {
			Events.pub('interval.10m');
		}, 60000 * 10);

		window.setInterval(function () {
			Events.pub('interval.15m');
		}, 60000 * 15);

		window.setInterval(function () {
			Events.pub('interval.20m');
		}, 60000 * 15);

		window.setTimeout(function () {
			window.setInterval(function () {
				Events.pub('interval.2m-after5m');
			}, 60000 * 2);
		}, 60000 * 5);

		window.setTimeout(function () {
			window.setInterval(function () {
				Events.pub('interval.5m-after5m');
			}, 60000 * 5);
		}, 60000 * 5);

		window.setTimeout(function () {
			window.setInterval(function () {
				Events.pub('interval.10m-after5m');
			}, 60000 * 10);
		}, 60000 * 5);

		$.wakeUp(function () {

			Remote.jsVersion(function (sResult, oData) {
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
			_.delay(function () {
				$('#rl-bg').attr('style', 'background-image: none !important;')
						.backstretch(Links.userBackground(Settings.settingsGet('UserBackgroundHash')), {
					'fade': Globals.bAnimationSupported ? 1000 : 0, 'centeredX': true, 'centeredY': true
				}).removeAttr('style');
			}, 1000);
		}

		this.socialUsers = _.bind(this.socialUsers, this);
	}

	_.extend(AppUser.prototype, AbstractApp.prototype);

	AppUser.prototype.remote = function ()
	{
		return Remote;
	};

	AppUser.prototype.reloadFlagsCurrentMessageListAndMessageFromCache = function ()
	{
		_.each(MessageStore.messageList(), function (oMessage) {
			Cache.initMessageFlagsFromCache(oMessage);
		});

		Cache.initMessageFlagsFromCache(MessageStore.message());
	};

	/**
	 * @param {boolean=} bDropPagePosition = false
	 * @param {boolean=} bDropCurrenFolderCache = false
	 */
	AppUser.prototype.reloadMessageList = function (bDropPagePosition, bDropCurrenFolderCache)
	{
		var
			iOffset = (MessageStore.messageListPage() - 1) * SettingsStore.messagesPerPage()
		;

		if (Utils.isUnd(bDropCurrenFolderCache) ? false : !!bDropCurrenFolderCache)
		{
			Cache.setFolderHash(FolderStore.currentFolderFullNameRaw(), '');
		}

		if (Utils.isUnd(bDropPagePosition) ? false : !!bDropPagePosition)
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
		Remote.messageList(function (sResult, oData, bCached) {

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
	};

	AppUser.prototype.recacheInboxMessageList = function ()
	{
		Remote.messageList(Utils.emptyFunction, Cache.getFolderInboxName(), 0, SettingsStore.messagesPerPage(), '', '', true);
	};

	/**
	 * @param {Function} fResultFunc
	 * @return {boolean}
	 */
	AppUser.prototype.contactsSync = function (fResultFunc)
	{
		var oContacts = ContactStore.contacts;
		if (oContacts.importing() || oContacts.syncing() || !ContactStore.enableContactsSync() || !ContactStore.allowContactsSync())
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

	AppUser.prototype.messagesMoveTrigger = function ()
	{
		var
			self = this,
			sTrashFolder = FolderStore.trashFolder(),
			sSpamFolder = FolderStore.spamFolder()
		;

		_.each(this.oMoveCache, function (oItem) {

			var
				bSpam = sSpamFolder === oItem['To'],
				bTrash = sTrashFolder === oItem['To'],
				bHam = !bSpam && sSpamFolder === oItem['From'] && Cache.getFolderInboxName() === oItem['To']
			;

			Remote.messagesMove(self.moveOrDeleteResponseHelper, oItem['From'], oItem['To'], oItem['Uid'],
				bSpam ? 'SPAM' : (bHam ? 'HAM' : ''), bSpam || bTrash);
		});

		this.oMoveCache = {};
	};

	AppUser.prototype.messagesMoveHelper = function (sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForMove)
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

	AppUser.prototype.messagesCopyHelper = function (sFromFolderFullNameRaw, sToFolderFullNameRaw, aUidForCopy)
	{
		Remote.messagesCopy(
			this.moveOrDeleteResponseHelper,
			sFromFolderFullNameRaw,
			sToFolderFullNameRaw,
			aUidForCopy
		);
	};

	AppUser.prototype.messagesDeleteHelper = function (sFromFolderFullNameRaw, aUidForRemove)
	{
		Remote.messagesDelete(
			this.moveOrDeleteResponseHelper,
			sFromFolderFullNameRaw,
			aUidForRemove
		);
	};

	AppUser.prototype.moveOrDeleteResponseHelper = function (sResult, oData)
	{
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
	};

	/**
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForRemove
	 */
	AppUser.prototype.deleteMessagesFromFolderWithoutCheck = function (sFromFolderFullNameRaw, aUidForRemove)
	{
		this.messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove);
		MessageStore.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove);
	};

	/**
	 * @param {number} iDeleteType
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForRemove
	 * @param {boolean=} bUseFolder = true
	 */
	AppUser.prototype.deleteMessagesFromFolder = function (iDeleteType, sFromFolderFullNameRaw, aUidForRemove, bUseFolder)
	{
		var
			self = this,
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
			if ((Enums.FolderType.Spam === iDeleteType && Consts.Values.UnuseOptionValue === FolderStore.spamFolder()) ||
				(Enums.FolderType.Trash === iDeleteType && Consts.Values.UnuseOptionValue === FolderStore.trashFolder()) ||
				(Enums.FolderType.Archive === iDeleteType && Consts.Values.UnuseOptionValue === FolderStore.archiveFolder()))
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
			kn.showScreenPopup(require('View/Popup/Ask'), [Translator.i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'), function () {

				self.messagesDeleteHelper(sFromFolderFullNameRaw, aUidForRemove);
				MessageStore.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove);

			}]);
		}
		else if (oMoveFolder)
		{
			this.messagesMoveHelper(sFromFolderFullNameRaw, oMoveFolder.fullNameRaw, aUidForRemove);
			MessageStore.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove, oMoveFolder.fullNameRaw);
		}
	};

	/**
	 * @param {string} sFromFolderFullNameRaw
	 * @param {Array} aUidForMove
	 * @param {string} sToFolderFullNameRaw
	 * @param {boolean=} bCopy = false
	 */
	AppUser.prototype.moveMessagesToFolder = function (sFromFolderFullNameRaw, aUidForMove, sToFolderFullNameRaw, bCopy)
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

				MessageStore.removeMessagesFromList(oFromFolder.fullNameRaw, aUidForMove, oToFolder.fullNameRaw, bCopy);
				return true;
			}
		}

		return false;
	};

	/**
	 * @param {Function=} fCallback
	 */
	AppUser.prototype.foldersReload = function (fCallback)
	{
		Promises.foldersReload(FolderStore.foldersLoading).then(function (bValue) {
			if (fCallback)
			{
				fCallback(!!bValue);
			}
		}).fail(function () {
			if (fCallback)
			{
				fCallback(false);
			}
		});
	};

	AppUser.prototype.foldersPromisesActionHelper = function (oPromise, iErrorDefCode)
	{
		Promises
			.abort('Folders')
			.fastResolve(true)
			.then(function () {
				return oPromise;
			})
			.fail(function (iErrorCode) {
				FolderStore.folderList.error(Translator.getNotification(iErrorCode, '', iErrorDefCode));
			}).fin(function () {
				Promises.foldersReloadWithTimeout(FolderStore.foldersLoading);
			}).done()
		;
	};

	AppUser.prototype.reloadOpenPgpKeys = function ()
	{
		if (PgpStore.capaOpenPGP())
		{
			var
				aKeys = [],
				oEmail = new EmailModel(),
				oOpenpgpKeyring = PgpStore.openpgpKeyring,
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

			Utils.delegateRunOnDestroy(PgpStore.openpgpkeys());
			PgpStore.openpgpkeys(aKeys);
		}
	};

	AppUser.prototype.accountsCounts = function ()
	{
		return false;
//		AccountStore.accounts.loading(true);
//
//		Remote.accountsCounts(function (sResult, oData) {
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
//				_.each(oData.Result['Counts'], function (oItem) {
//
//					var oAccount = _.find(aAcounts, function (oAccount) {
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

	AppUser.prototype.accountsAndIdentities = function (bBoot)
	{
		var self = this;

		AccountStore.accounts.loading(true);
		IdentityStore.identities.loading(true);

		Remote.accountsAndIdentities(function (sResult, oData) {

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
					_.each(AccountStore.accounts(), function (oAccount) {
						aCounts[oAccount.email] = oAccount.count();
					});

					Utils.delegateRunOnDestroy(AccountStore.accounts());

					AccountStore.accounts(_.map(oData.Result['Accounts'], function (sValue) {
						return new AccountModel(sValue, sValue !== sParentEmail, aCounts[sValue] || 0);
					}));
				}

				if (Utils.isUnd(bBoot) ? false : !!bBoot)
				{
					_.delay(function () {
						self.accountsCounts();
					}, 1000 * 5);

					Events.sub('interval.10m-after5m', function () {
						self.accountsCounts();
					});
				}

				if (Utils.isArray(oData.Result['Identities']))
				{
					Utils.delegateRunOnDestroy(IdentityStore.identities());

					IdentityStore.identities(_.map(oData.Result['Identities'], function (oIdentityData) {

						var
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
	};

	AppUser.prototype.templates = function ()
	{
		TemplateStore.templates.loading(true);

		Remote.templates(function (sResult, oData) {

			TemplateStore.templates.loading(false);

			if (Enums.StorageResultType.Success === sResult && oData.Result &&
				Utils.isArray(oData.Result['Templates']))
			{
				Utils.delegateRunOnDestroy(TemplateStore.templates());

				TemplateStore.templates(_.compact(_.map(oData.Result['Templates'], function (oTemplateData) {
					var oTemplate = new TemplateModel();
					return oTemplate.parse(oTemplateData) ? oTemplate : null;
				})));
			}
		});
	};

	AppUser.prototype.quota = function ()
	{
		Remote.quota(function (sResult, oData) {
			if (Enums.StorageResultType.Success === sResult &&	oData && oData.Result &&
				Utils.isArray(oData.Result) && 1 < oData.Result.length &&
				Utils.isPosNumeric(oData.Result[0], true) && Utils.isPosNumeric(oData.Result[1], true))
			{
				require('Stores/User/Quota').populateData(
					Utils.pInt(oData.Result[1]), Utils.pInt(oData.Result[0]));
			}
		});
	};

	/**
	 * @param {string} sFolder
	 * @param {Array=} aList = []
	 */
	AppUser.prototype.folderInformation = function (sFolder, aList)
	{
		if ('' !== Utils.trim(sFolder))
		{
			var self = this;
			Remote.folderInformation(function (sResult, oData) {
				if (Enums.StorageResultType.Success === sResult)
				{
					if (oData && oData.Result && oData.Result.Hash && oData.Result.Folder)
					{
						var
							iUtc = Momentor.momentNowUnix(),
							sHash = Cache.getFolderHash(oData.Result.Folder),
							oFolder = Cache.getFolderFromCacheList(oData.Result.Folder),
							bCheck = false,
							sUid = '',
							aList = [],
							oFlags = null,
							bUnreadCountChange = false
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
									self.reloadFlagsCurrentMessageListAndMessageFromCache();
								}
							}

							MessageStore.initUidNextAndNewMessages(oFolder.fullNameRaw, oData.Result.UidNext, oData.Result.NewMessages);

							if (oData.Result.Hash !== sHash || '' === sHash)
							{
								if (oFolder.fullNameRaw === FolderStore.currentFolderFullNameRaw())
								{
									self.reloadMessageList();
								}
								else if (Cache.getFolderInboxName() === oFolder.fullNameRaw)
								{
									self.recacheInboxMessageList();
								}
							}
							else if (bUnreadCountChange)
							{
								if (oFolder.fullNameRaw === FolderStore.currentFolderFullNameRaw())
								{
									aList = MessageStore.messageList();
									if (Utils.isNonEmptyArray(aList))
									{
										self.folderInformation(oFolder.fullNameRaw, aList);
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
	AppUser.prototype.folderInformationMultiply = function (bBoot)
	{
		bBoot = Utils.isUnd(bBoot) ? false : !!bBoot;

		var
			self = this,
			iUtc = Momentor.momentNowUnix(),
			aFolders = FolderStore.getNextFolderNames()
		;

		if (Utils.isNonEmptyArray(aFolders))
		{
			Remote.folderInformationMultiply(function (sResult, oData) {
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
									if (oFolder.fullNameRaw === FolderStore.currentFolderFullNameRaw())
									{
										self.reloadMessageList();
									}
								}
								else if (bUnreadCountChange)
								{
									if (oFolder.fullNameRaw === FolderStore.currentFolderFullNameRaw())
									{
										aList = MessageStore.messageList();
										if (Utils.isNonEmptyArray(aList))
										{
											self.folderInformation(oFolder.fullNameRaw, aList);
										}
									}
								}
							}
						});

						if (bBoot)
						{
							_.delay(function () {
								self.folderInformationMultiply(true);
							}, 2000);
						}
					}
				}
			}, aFolders);
		}
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string|bool} mUid
	 * @param {number} iSetAction
	 * @param {Array=} aMessages = null
	 */
	AppUser.prototype.messageListAction = function (sFolderFullNameRaw, mUid, iSetAction, aMessages)
	{
		var
			oFolder = null,
			aRootUids = [],
			iAlreadyUnread = 0
		;

		if (Utils.isUnd(aMessages))
		{
			aMessages = MessageStore.messageListChecked();
		}

		aRootUids = _.uniq(_.compact(_.map(aMessages, function (oMessage) {
			return (oMessage && oMessage.uid) ? oMessage.uid : null;
		})));

		if ('' !== sFolderFullNameRaw && 0 < aRootUids.length)
		{
			switch (iSetAction) {
				case Enums.MessageSetAction.SetSeen:

					_.each(aRootUids, function (sSubUid) {
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

					_.each(aRootUids, function (sSubUid) {
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

					_.each(aRootUids, function (sSubUid) {
						Cache.storeMessageFlagsToCacheBySetAction(
							sFolderFullNameRaw, sSubUid, iSetAction);
					});

					Remote.messageSetFlagged(Utils.emptyFunction, sFolderFullNameRaw, aRootUids, true);
					break;

				case Enums.MessageSetAction.UnsetFlag:

					_.each(aRootUids, function (sSubUid) {
						Cache.storeMessageFlagsToCacheBySetAction(
							sFolderFullNameRaw, sSubUid, iSetAction);
					});

					Remote.messageSetFlagged(Utils.emptyFunction, sFolderFullNameRaw, aRootUids, false);
					break;
			}

			this.reloadFlagsCurrentMessageListAndMessageFromCache();
			MessageStore.message.viewTrigger(!MessageStore.message.viewTrigger());
		}
	};

	AppUser.prototype.googleConnect = function ()
	{
		window.open(Links.socialGoogle(), 'Google', 'left=200,top=100,width=650,height=600,menubar=no,status=no,resizable=yes,scrollbars=yes');
	};

	AppUser.prototype.twitterConnect = function ()
	{
		window.open(Links.socialTwitter(), 'Twitter', 'left=200,top=100,width=650,height=350,menubar=no,status=no,resizable=yes,scrollbars=yes');
	};

	AppUser.prototype.facebookConnect = function ()
	{
		window.open(Links.socialFacebook(), 'Facebook', 'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
	};

	/**
	 * @param {boolean=} bFireAllActions
	 */
	AppUser.prototype.socialUsers = function (bFireAllActions)
	{
		if (true === bFireAllActions)
		{
			SocialStore.google.loading(true);
			SocialStore.facebook.loading(true);
			SocialStore.twitter.loading(true);
		}

		Remote.socialUsers(function (sResult, oData) {

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				SocialStore.google.userName(oData.Result['Google'] || '');
				SocialStore.facebook.userName(oData.Result['Facebook'] || '');
				SocialStore.twitter.userName(oData.Result['Twitter'] || '');
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
	};

	AppUser.prototype.googleDisconnect = function ()
	{
		SocialStore.google.loading(true);
		Remote.googleDisconnect(this.socialUsers);
	};

	AppUser.prototype.facebookDisconnect = function ()
	{
		SocialStore.facebook.loading(true);
		Remote.facebookDisconnect(this.socialUsers);
	};

	AppUser.prototype.twitterDisconnect = function ()
	{
		SocialStore.twitter.loading(true);
		Remote.twitterDisconnect(this.socialUsers);
	};

	/**
	 * @param {string} sQuery
	 * @param {Function} fCallback
	 */
	AppUser.prototype.getAutocomplete = function (sQuery, fCallback)
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
	 * @param {string} sFullNameHash
	 * @param {boolean} bExpanded
	 */
	AppUser.prototype.setExpandedFolder = function (sFullNameHash, bExpanded)
	{
		var aExpandedList = Local.get(Enums.ClientSideKeyName.ExpandedFolders);
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
	};

	AppUser.prototype.initHorizontalLayoutResizer = function (sClientSideKeyName)
	{
		var
			iMinHeight = 200,
			iMaxHeight = 500,
			oTop = null,
			oBottom = null,

			fResizeCreateFunction = function (oEvent) {
				if (oEvent && oEvent.target)
				{
					var oResizableHandle = $(oEvent.target).find('.ui-resizable-handle');

					oResizableHandle
						.on('mousedown', function () {
							Globals.$html.addClass('rl-resizer');
						})
						.on('mouseup', function () {
							Globals.$html.removeClass('rl-resizer');
						})
					;
				}
			},

			fResizeStartFunction = function () {
				Globals.$html.addClass('rl-resizer');
			},

			fResizeResizeFunction = _.debounce(function () {
				Globals.$html.addClass('rl-resizer');
			}, 500, true),

			fResizeStopFunction = function (oEvent, oObject) {
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

			fSetHeight = function (iHeight) {
				if (iHeight)
				{
					if (oTop)
					{
						oTop.attr('style', 'height:' + iHeight + 'px');
					}

					if (oBottom)
					{
						oBottom.attr('style', 'top:' + (55 /* top toolbar */ + iHeight) + 'px');
					}
				}
			},

			fDisable = function (bDisable) {
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

					var iHeight = Utils.pInt(Local.get(sClientSideKeyName)) || 300;
					fSetHeight(iHeight > iMinHeight ? iHeight : iMinHeight);
				}
			}
		;

		fDisable(false);

		Events.sub('layout', function (sLayout) {
			fDisable(Enums.Layout.BottomPreview !== sLayout);
		});
	};

	AppUser.prototype.initVerticalLayoutResizer = function (sClientSideKeyName)
	{
		var
			iDisabledWidth = 60,
			iMinWidth = 155,
			oLeft = $('#rl-left'),
			oRight = $('#rl-right'),

			mLeftWidth = Local.get(sClientSideKeyName) || null,

			fSetWidth = function (iWidth) {
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

			fDisable = function (bDisable) {
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
			fResizeCreateFunction = function (oEvent) {
				if (oEvent && oEvent.target)
				{
					var oResizableHandle = $(oEvent.target).find('.ui-resizable-handle');

					oResizableHandle
						.on('mousedown', function () {
							Globals.$html.addClass('rl-resizer');
						})
						.on('mouseup', function () {
							Globals.$html.removeClass('rl-resizer');
						})
					;
				}
			},
			fResizeResizeFunction = _.debounce(function () {
				Globals.$html.addClass('rl-resizer');
			}, 500, true),
			fResizeStartFunction = function () {
				Globals.$html.addClass('rl-resizer');
			},
			fResizeStopFunction = function (oEvent, oObject) {
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

		Events.sub('left-panel.off', function () {
			fDisable(true);
		});

		Events.sub('left-panel.on', function () {
			fDisable(false);
		});
	};

	AppUser.prototype.logout = function ()
	{
		var self = this;
		Remote.logout(function () {
			self.loginAndLogoutReload(false, true,
				Settings.settingsGet('ParentEmail') && 0 < Settings.settingsGet('ParentEmail').length);
		});
	};

	AppUser.prototype.bootstartTwoFactorScreen = function ()
	{
		kn.showScreenPopup(require('View/Popup/TwoFactorConfiguration'), [true]);
	};

	AppUser.prototype.bootstartWelcomePopup = function (sUrl)
	{
		kn.showScreenPopup(require('View/Popup/WelcomePage'), [sUrl]);
	};

	AppUser.prototype.bootstartLoginScreen = function ()
	{
		Globals.$html.removeClass('rl-user-auth').addClass('rl-user-no-auth');

		var sCustomLoginLink = Utils.pString(Settings.settingsGet('CustomLoginLink'));
		if (!sCustomLoginLink)
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
				window.location.href = sCustomLoginLink;
			});
		}
	};

	AppUser.prototype.bootend = function ()
	{
		kn.hideLoading();

		if (progressJs)
		{
			progressJs().end();
		}
	};

	AppUser.prototype.bootstart = function ()
	{
		AbstractApp.prototype.bootstart.call(this);

		require('Stores/User/App').populate();
		require('Stores/User/Settings').populate();
		require('Stores/User/Notification').populate();
		require('Stores/User/Account').populate();
		require('Stores/User/Contact').populate();

		var
			self = this,
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
			progressJs().set(70);
		}

		Globals.leftPanelDisabled.subscribe(function (bValue) {
			Events.pub('left-panel.' + (bValue ? 'off' : 'on'));
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

				self.foldersReload(_.bind(function (bValue) {

					this.bootend();

					if (bValue)
					{
						if ('' !== sStartupUrl)
						{
							kn.routeOff();
							kn.setHash(Links.root(sStartupUrl), true);
							kn.routeOn();
						}

						if ($LAB && window.crypto && window.crypto.getRandomValues && Settings.capa(Enums.Capa.OpenPGP))
						{
							var fOpenpgpCallback = function (openpgp) {

								PgpStore.openpgp = openpgp;

								if (window.Worker)
								{
									PgpStore.openpgp.initWorker(Links.openPgpWorkerJs());
								}

//								PgpStore.openpgp.config.useWebCrypto = false;

								PgpStore.openpgpKeyring = new openpgp.Keyring();
								PgpStore.capaOpenPGP(true);

								Events.pub('openpgp.init');

								self.reloadOpenPgpKeys();
							};

							if (window.openpgp)
							{
								fOpenpgpCallback(window.openpgp);
							}
							else
							{
								$LAB.script(Links.openPgpJs()).wait(function () {
									if (window.openpgp)
									{
										fOpenpgpCallback(window.openpgp);
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
							self.socialUsers(true);
						}

						Events.sub('interval.2m', function () {
							self.folderInformation(Cache.getFolderInboxName());
						});

						Events.sub('interval.3m', function () {
							var sF = FolderStore.currentFolderFullNameRaw();
							if (Cache.getFolderInboxName() !== sF)
							{
								self.folderInformation(sF);
							}
						});

						Events.sub('interval.2m-after5m', function () {
							self.folderInformationMultiply();
						});

						Events.sub('interval.15m', function () {
							self.quota();
						});

						Events.sub('interval.20m', function () {
							self.foldersReload();
						});

						iContactsSyncInterval = 5 <= iContactsSyncInterval ? iContactsSyncInterval : 20;
						iContactsSyncInterval = 320 >= iContactsSyncInterval ? iContactsSyncInterval : 320;

						_.delay(function () {
							self.contactsSync();
						}, 10000);

						_.delay(function () {
							self.folderInformationMultiply(true);
						}, 2000);

						window.setInterval(function () {
							self.contactsSync();
						}, iContactsSyncInterval * 60000 + 5000);

						self.accountsAndIdentities(true);

						_.delay(function () {
							var sF = FolderStore.currentFolderFullNameRaw();
							if (Cache.getFolderInboxName() !== sF)
							{
								self.folderInformation(sF);
							}
						}, 1000);

						_.delay(function () {
							self.quota();
						}, 5000);

						_.delay(function () {
							Remote.appDelayStart(Utils.emptyFunction);
						}, 35000);

						Events.sub('rl.auto-logout', function () {
							self.logout();
						});

						Plugins.runHook('rl-start-user-screens');
						Events.pub('rl.bootstart-user-screens');

						if (Settings.settingsGet('WelcomePageUrl'))
						{
							_.delay(function () {
								self.bootstartWelcomePopup(Settings.settingsGet('WelcomePageUrl'));
							}, 1000);
						}

						if (!!Settings.settingsGet('AccountSignMe') &&
							window.navigator.registerProtocolHandler &&
							Settings.capa(Enums.Capa.Composer))
						{
							_.delay(function () {
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
							_.defer(function () {
								self.initVerticalLayoutResizer(Enums.ClientSideKeyName.FolderListSize);
							});

							if (Tinycon && Settings.settingsGet('FaviconStatus') && !Settings.settingsGet('Filtered') )
							{
								Tinycon.setOptions({
									fallback: false
								});

								Events.sub('mailbox.inbox-unread-count', function (iCount) {
									Tinycon.setBubble(0 < iCount ? (99 < iCount ? 99 : iCount) : 0);
								});
							}
						}
					}
					else
					{
						this.logout();
					}

				}, self));

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
			window['rl_' + sJsHash + '_google_service'] = function () {
				SocialStore.google.loading(true);
				self.socialUsers();
			};
		}

		if (bFacebook)
		{
			window['rl_' + sJsHash + '_facebook_service'] = function () {
				SocialStore.facebook.loading(true);
				self.socialUsers();
			};
		}

		if (bTwitter)
		{
			window['rl_' + sJsHash + '_twitter_service'] = function () {
				SocialStore.twitter.loading(true);
				self.socialUsers();
			};
		}

		Events.sub('interval.1m', function () {
			Momentor.reload();
		});

		Plugins.runHook('rl-start-screens');
		Events.pub('rl.bootstart-end');
	};

	module.exports = new AppUser();

}());