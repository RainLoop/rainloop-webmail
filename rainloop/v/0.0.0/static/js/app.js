/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
webpackJsonp([3],{

/***/ 0:
/*!*************************!*\
  !*** ./dev/RainLoop.js ***!
  \*************************/
/***/ function(module, exports, __webpack_require__) {

	var require;(function (require) {
		'use strict';
		__webpack_require__(/*! App:Boot */ 35)(__webpack_require__(/*! App:RainLoop */ 4));
	}(require));

/***/ },

/***/ 4:
/*!*********************************!*\
  !*** ./dev/Apps/RainLoopApp.js ***!
  \*********************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			moment = __webpack_require__(/*! moment */ 25),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Plugins = __webpack_require__(/*! Common/Plugins */ 26),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),
			Events = __webpack_require__(/*! Common/Events */ 22),

			kn = __webpack_require__(/*! App:Knoin */ 5),

			Local = __webpack_require__(/*! Storage:LocalStorage */ 30),
			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Cache = __webpack_require__(/*! Storage:RainLoop:Cache */ 20),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),

			EmailModel = __webpack_require__(/*! Model:Email */ 23),
			FolderModel = __webpack_require__(/*! Model:Folder */ 58),
			MessageModel = __webpack_require__(/*! Model:Message */ 38),
			AccountModel = __webpack_require__(/*! Model:Account */ 51),
			IdentityModel = __webpack_require__(/*! Model:Identity */ 59),
			OpenPgpKeyModel = __webpack_require__(/*! Model:OpenPgpKey */ 60),

			AbstractApp = __webpack_require__(/*! App:Abstract */ 34)
		;

		/**
		 * @constructor
		 * @extends AbstractApp
		 */
		function RainLoopApp()
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


			this.socialUsers = _.bind(this.socialUsers, this);
		}

		_.extend(RainLoopApp.prototype, AbstractApp.prototype);

		RainLoopApp.prototype.remote = function ()
		{
			return Remote;
		};

		RainLoopApp.prototype.data = function ()
		{
			return Data;
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
				self = this,
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
					self.setMessageList(oData, bCached);
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
			this.reloadMessageList(bEmptyList);
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

				this.reloadMessageListHelper(0 === Data.messageList().length);
				this.quotaDebounce();
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
				kn.showScreenPopup(__webpack_require__(/*! View:Popup:FolderSystem */ 27), [nSetSystemFoldersNotification]);
			}
			else if (!bUseFolder || (Enums.FolderType.Trash === iDeleteType &&
				(sFromFolderFullNameRaw === Data.spamFolder() || sFromFolderFullNameRaw === Data.trashFolder())))
			{
				kn.showScreenPopup(__webpack_require__(/*! View:Popup:Ask */ 31), [Utils.i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'), function () {

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
			Data.foldersLoading(true);
			Remote.folders(_.bind(function (sResult, oData) {

				Data.foldersLoading(false);
				if (Enums.StorageResultType.Success === sResult)
				{
					this.setFolders(oData);
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
						sParentEmail = Settings.settingsGet('ParentEmail'),
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
			Remote.quota(function (sResult, oData) {
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
				var self = this;
				Remote.folderInformation(function (sResult, oData) {
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
										self.reloadFlagsCurrentMessageListAndMessageFromCache();
									}
								}

								Data.initUidNextAndNewMessages(oFolder.fullNameRaw, oData.Result.UidNext, oData.Result.NewMessages);

								if (oData.Result.Hash !== sHash || '' === sHash)
								{
									if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
									{
										self.reloadMessageList();
									}
									else if ('INBOX' === oFolder.fullNameRaw)
									{
										self.recacheInboxMessageList();
									}
								}
								else if (bUnreadCountChange)
								{
									if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
									{
										aList = Data.messageList();
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
		RainLoopApp.prototype.folderInformationMultiply = function (bBoot)
		{
			bBoot = Utils.isUnd(bBoot) ? false : !!bBoot;

			var
				self = this,
				iUtc = moment().unix(),
				aFolders = Data.getNextFolderNames(bBoot)
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
										if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
										{
											self.reloadMessageList();
										}
									}
									else if (bUnreadCountChange)
									{
										if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
										{
											aList = Data.messageList();
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
								self.folderInformationMultiply(true);
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
				this.reloadFlagsCurrentMessageListAndMessageFromCache();
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
			Remote.googleDisconnect(this.socialUsers);
		};

		RainLoopApp.prototype.facebookDisconnect = function ()
		{
			Data.facebookActions(true);
			Remote.facebookDisconnect(this.socialUsers);
		};

		RainLoopApp.prototype.twitterDisconnect = function ()
		{
			Data.twitterActions(true);
			Remote.twitterDisconnect(this.socialUsers);
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

		RainLoopApp.prototype.setMessageList = function (oData, bCached)
		{
			if (oData && oData.Result && 'Collection/MessageCollection' === oData.Result['@Object'] &&
				oData.Result['@Collection'] && Utils.isArray(oData.Result['@Collection']))
			{
				var
					mLastCollapsedThreadUids = null,
					iIndex = 0,
					iLen = 0,
					iCount = 0,
					iOffset = 0,
					aList = [],
					iUtc = moment().unix(),
					aStaticList = Data.staticMessageList,
					oJsonMessage = null,
					oMessage = null,
					oFolder = null,
					iNewCount = 0,
					bUnreadCountChange = false
				;

				iCount = Utils.pInt(oData.Result.MessageResultCount);
				iOffset = Utils.pInt(oData.Result.Offset);

				if (Utils.isNonEmptyArray(oData.Result.LastCollapsedThreadUids))
				{
					mLastCollapsedThreadUids = oData.Result.LastCollapsedThreadUids;
				}

				oFolder = Cache.getFolderFromCacheList(
					Utils.isNormal(oData.Result.Folder) ? oData.Result.Folder : '');

				if (oFolder && !bCached)
				{
					oFolder.interval = iUtc;

					Cache.setFolderHash(oData.Result.Folder, oData.Result.FolderHash);

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

					Data.initUidNextAndNewMessages(oFolder.fullNameRaw, oData.Result.UidNext, oData.Result.NewMessages);
				}

				if (bUnreadCountChange && oFolder)
				{
					Cache.clearMessageFlagsFromCacheByFolder(oFolder.fullNameRaw);
				}

				for (iIndex = 0, iLen = oData.Result['@Collection'].length; iIndex < iLen; iIndex++)
				{
					oJsonMessage = oData.Result['@Collection'][iIndex];
					if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
					{
						oMessage = aStaticList[iIndex];
						if (!oMessage || !oMessage.initByJson(oJsonMessage))
						{
							oMessage = MessageModel.newInstanceFromJson(oJsonMessage);
						}

						if (oMessage)
						{
							if (Cache.hasNewMessageAndRemoveFromCache(oMessage.folderFullNameRaw, oMessage.uid) && 5 >= iNewCount)
							{
								iNewCount++;
								oMessage.newForAnimation(true);
							}

							oMessage.deleted(false);

							if (bCached)
							{
								Cache.initMessageFlagsFromCache(oMessage);
							}
							else
							{
								Cache.storeMessageFlagsToCache(oMessage);
							}

							oMessage.lastInCollapsedThread(mLastCollapsedThreadUids && -1 < Utils.inArray(Utils.pInt(oMessage.uid), mLastCollapsedThreadUids) ? true : false);

							aList.push(oMessage);
						}
					}
				}

				Data.messageListCount(iCount);
				Data.messageListSearch(Utils.isNormal(oData.Result.Search) ? oData.Result.Search : '');
				Data.messageListPage(window.Math.ceil((iOffset / Data.messagesPerPage()) + 1));
				Data.messageListEndFolder(Utils.isNormal(oData.Result.Folder) ? oData.Result.Folder : '');
				Data.messageListEndSearch(Utils.isNormal(oData.Result.Search) ? oData.Result.Search : '');
				Data.messageListEndPage(Data.messageListPage());

				Data.messageList(aList);
				Data.messageListIsNotCompleted(false);

				if (aStaticList.length < aList.length)
				{
					Data.staticMessageList = aList;
				}

				Cache.clearNewMessageCache();

				if (oFolder && (bCached || bUnreadCountChange || Data.useThreads()))
				{
					this.folderInformation(oFolder.fullNameRaw, aList);
				}
			}
			else
			{
				Data.messageListCount(0);
				Data.messageList([]);
				Data.messageListError(Utils.getNotification(
					oData && oData.ErrorCode ? oData.ErrorCode : Enums.Notification.CantGetMessageList
				));
			}
		};

		/**
		 * @param {string} sNamespace
		 * @param {Array} aFolders
		 * @return {Array}
		 */
		RainLoopApp.prototype.folderResponseParseRec = function (sNamespace, aFolders)
		{
			var
				self = this,
				iIndex = 0,
				iLen = 0,
				oFolder = null,
				oCacheFolder = null,
				sFolderFullNameRaw = '',
				aSubFolders = [],
				aList = []
			;

			for (iIndex = 0, iLen = aFolders.length; iIndex < iLen; iIndex++)
			{
				oFolder = aFolders[iIndex];
				if (oFolder)
				{
					sFolderFullNameRaw = oFolder.FullNameRaw;

					oCacheFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
					if (!oCacheFolder)
					{
						oCacheFolder = FolderModel.newInstanceFromJson(oFolder);
						if (oCacheFolder)
						{
							Cache.setFolderToCacheList(sFolderFullNameRaw, oCacheFolder);
							Cache.setFolderFullNameRaw(oCacheFolder.fullNameHash, sFolderFullNameRaw);
						}
					}

					if (oCacheFolder)
					{
						oCacheFolder.collapsed(!self.isFolderExpanded(oCacheFolder.fullNameHash));

						if (oFolder.Extended)
						{
							if (oFolder.Extended.Hash)
							{
								Cache.setFolderHash(oCacheFolder.fullNameRaw, oFolder.Extended.Hash);
							}

							if (Utils.isNormal(oFolder.Extended.MessageCount))
							{
								oCacheFolder.messageCountAll(oFolder.Extended.MessageCount);
							}

							if (Utils.isNormal(oFolder.Extended.MessageUnseenCount))
							{
								oCacheFolder.messageCountUnread(oFolder.Extended.MessageUnseenCount);
							}
						}

						aSubFolders = oFolder['SubFolders'];
						if (aSubFolders && 'Collection/FolderCollection' === aSubFolders['@Object'] &&
							aSubFolders['@Collection'] && Utils.isArray(aSubFolders['@Collection']))
						{
							oCacheFolder.subFolders(
								this.folderResponseParseRec(sNamespace, aSubFolders['@Collection']));
						}

						aList.push(oCacheFolder);
					}
				}
			}

			return aList;
		};

		/**
		 * @param {*} oData
		 */
		RainLoopApp.prototype.setFolders = function (oData)
		{
			var
				aList = [],
				bUpdate = false,
				fNormalizeFolder = function (sFolderFullNameRaw) {
					return ('' === sFolderFullNameRaw || Consts.Values.UnuseOptionValue === sFolderFullNameRaw ||
						null !== Cache.getFolderFromCacheList(sFolderFullNameRaw)) ? sFolderFullNameRaw : '';
				}
			;

			if (oData && oData.Result && 'Collection/FolderCollection' === oData.Result['@Object'] &&
				oData.Result['@Collection'] && Utils.isArray(oData.Result['@Collection']))
			{
				if (!Utils.isUnd(oData.Result.Namespace))
				{
					Data.namespace = oData.Result.Namespace;
				}

				Data.threading(!!Settings.settingsGet('UseImapThread') && oData.Result.IsThreadsSupported && true);

				aList = this.folderResponseParseRec(Data.namespace, oData.Result['@Collection']);
				Data.folderList(aList);

				if (oData.Result['SystemFolders'] &&
					'' === '' + Settings.settingsGet('SentFolder') + Settings.settingsGet('DraftFolder') +
					Settings.settingsGet('SpamFolder') + Settings.settingsGet('TrashFolder') + Settings.settingsGet('ArchiveFolder') +
					Settings.settingsGet('NullFolder'))
				{
					// TODO Magic Numbers
					Settings.settingsSet('SentFolder', oData.Result['SystemFolders'][2] || null);
					Settings.settingsSet('DraftFolder', oData.Result['SystemFolders'][3] || null);
					Settings.settingsSet('SpamFolder', oData.Result['SystemFolders'][4] || null);
					Settings.settingsSet('TrashFolder', oData.Result['SystemFolders'][5] || null);
					Settings.settingsSet('ArchiveFolder', oData.Result['SystemFolders'][12] || null);

					bUpdate = true;
				}

				Data.sentFolder(fNormalizeFolder(Settings.settingsGet('SentFolder')));
				Data.draftFolder(fNormalizeFolder(Settings.settingsGet('DraftFolder')));
				Data.spamFolder(fNormalizeFolder(Settings.settingsGet('SpamFolder')));
				Data.trashFolder(fNormalizeFolder(Settings.settingsGet('TrashFolder')));
				Data.archiveFolder(fNormalizeFolder(Settings.settingsGet('ArchiveFolder')));

				if (bUpdate)
				{
					Remote.saveSystemFolders(Utils.emptyFunction, {
						'SentFolder': Data.sentFolder(),
						'DraftFolder': Data.draftFolder(),
						'SpamFolder': Data.spamFolder(),
						'TrashFolder': Data.trashFolder(),
						'ArchiveFolder': Data.archiveFolder(),
						'NullFolder': 'NullFolder'
					});
				}

				Local.set(Enums.ClientSideKeyName.FoldersLashHash, oData.Result.FoldersHash);
			}
		};

		/**
		 * @param {string} sFullNameHash
		 * @return {boolean}
		 */
		RainLoopApp.prototype.isFolderExpanded = function (sFullNameHash)
		{
			var aExpandedList = Local.get(Enums.ClientSideKeyName.ExpandedFolders);
			return Utils.isArray(aExpandedList) && -1 !== _.indexOf(aExpandedList, sFullNameHash);
		};

		/**
		 * @param {string} sFullNameHash
		 * @param {boolean} bExpanded
		 */
		RainLoopApp.prototype.setExpandedFolder = function (sFullNameHash, bExpanded)
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

		RainLoopApp.prototype.initLayoutResizer = function (sLeft, sRight, sClientSideKeyName)
		{
			var
				iDisabledWidth = 60,
				iMinWidth = 155,
				oLeft = $(sLeft),
				oRight = $(sRight),

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

				fResizeFunction = function (oEvent, oObject) {
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
				'helper': 'ui-resizable-helper',
				'minWidth': iMinWidth,
				'maxWidth': 350,
				'handles': 'e',
				'stop': fResizeFunction
			});

			Events.sub('left-panel.off', function () {
				fDisable(true);
			});

			Events.sub('left-panel.on', function () {
				fDisable(false);
			});
		};

		RainLoopApp.prototype.bootstartLoginScreen = function ()
		{
			var sCustomLoginLink = Utils.pString(Settings.settingsGet('CustomLoginLink'));
			if (!sCustomLoginLink)
			{
				kn.hideLoading();

				kn.startScreens([
					__webpack_require__(/*! Screen:RainLoop:Login */ 64)
				]);

				Plugins.runHook('rl-start-login-screens');
				Events.pub('rl.bootstart-login-screens');
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
		};

		RainLoopApp.prototype.bootstart = function ()
		{
			AbstractApp.prototype.bootstart.call(this);

			Data.populateDataOnStart();

			var
				self = this,
				sJsHash = Settings.settingsGet('JsHash'),
				iContactsSyncInterval = Utils.pInt(Settings.settingsGet('ContactsSyncInterval')),
				bGoogle = Settings.settingsGet('AllowGoogleSocial'),
				bFacebook = Settings.settingsGet('AllowFacebookSocial'),
				bTwitter = Settings.settingsGet('AllowTwitterSocial')
			;

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

			Globals.leftPanelDisabled.subscribe(function (bValue) {
				Events.pub('left-panel.' + (bValue ? 'off' : 'on'));
			});

			if (!!Settings.settingsGet('Auth'))
			{
				this.setTitle(Utils.i18n('TITLES/LOADING'));

				this.folders(_.bind(function (bValue) {

					if (bValue)
					{
						__webpack_require__.e/*nsure*/(0, function () {

							kn.hideLoading();

							if (window.$LAB && window.crypto && window.crypto.getRandomValues && Settings.capa(Enums.Capa.OpenPGP))
							{
								window.$LAB.script(window.openpgp ? '' : LinkBuilder.openPgpJs()).wait(function () {
									if (window.openpgp)
									{
										Data.openpgpKeyring = new window.openpgp.Keyring();
										Data.capaOpenPGP(true);

										Events.pub('openpgp.init');

										self.reloadOpenPgpKeys();
									}
								});
							}
							else
							{
								Data.capaOpenPGP(false);
							}

							kn.startScreens([
								__webpack_require__(/*! Screen:RainLoop:MailBox */ 65),
								__webpack_require__(/*! Screen:RainLoop:Settings */ 66),
								__webpack_require__(/*! Screen:RainLoop:About */ 61)
							]);

							if (bGoogle || bFacebook || bTwitter)
							{
								self.socialUsers(true);
							}

							Events.sub('interval.2m', function () {
								self.folderInformation('INBOX');
							});

							Events.sub('interval.2m', function () {
								var sF = Data.currentFolderFullNameRaw();
								if ('INBOX' !== sF)
								{
									self.folderInformation(sF);
								}
							});

							Events.sub('interval.3m', function () {
								self.folderInformationMultiply();
							});

							Events.sub('interval.5m', function () {
								self.quota();
							});

							Events.sub('interval.10m', function () {
								self.folders();
							});

							iContactsSyncInterval = 5 <= iContactsSyncInterval ? iContactsSyncInterval : 20;
							iContactsSyncInterval = 320 >= iContactsSyncInterval ? iContactsSyncInterval : 320;

							window.setInterval(function () {
								self.contactsSync();
							}, iContactsSyncInterval * 60000 + 5000);

							_.delay(function () {
								self.contactsSync();
							}, 5000);

							_.delay(function () {
								self.folderInformationMultiply(true);
							}, 500);

							Plugins.runHook('rl-start-user-screens');
							Events.pub('rl.bootstart-user-screens');

							if (!!Settings.settingsGet('AccountSignMe') && window.navigator.registerProtocolHandler)
							{
								_.delay(function () {
									try {
										window.navigator.registerProtocolHandler('mailto',
											window.location.protocol + '//' + window.location.host + window.location.pathname + '?mailto&to=%s',
											'' + (Settings.settingsGet('Title') || 'RainLoop'));
									} catch(e) {}

									if (Settings.settingsGet('MailToEmail'))
									{
										Utils.mailToHelper(Settings.settingsGet('MailToEmail'), __webpack_require__(/*! View:Popup:Compose */ 21));
									}
								}, 500);
							}

							if (!Globals.bMobileDevice)
							{
								_.defer(function () {
									self.initLayoutResizer('#rl-left', '#rl-right', Enums.ClientSideKeyName.FolderListSize);
								});
							}
						});
					}
					else
					{
						kn.hideLoading();

						self.bootstartLoginScreen();
					}

					if (window.SimplePace)
					{
						window.SimplePace.set(100);
					}

				}, this));
			}
			else
			{
				this.bootstartLoginScreen();

				if (window.SimplePace)
				{
					window.SimplePace.set(100);
				}
			}

			if (bGoogle)
			{
				window['rl_' + sJsHash + '_google_service'] = function () {
					Data.googleActions(true);
					self.socialUsers();
				};
			}

			if (bFacebook)
			{
				window['rl_' + sJsHash + '_facebook_service'] = function () {
					Data.facebookActions(true);
					self.socialUsers();
				};
			}

			if (bTwitter)
			{
				window['rl_' + sJsHash + '_twitter_service'] = function () {
					Data.twitterActions(true);
					self.socialUsers();
				};
			}

			Events.sub('interval.1m', function () {
				Globals.momentTrigger(!Globals.momentTrigger());
			});

			Plugins.runHook('rl-start-screens');
			Events.pub('rl.bootstart-end');
		};

		module.exports = new RainLoopApp();

	}());

/***/ },

/***/ 8:
/*!*************************************!*\
  !*** ./dev/Storages/DataStorage.js ***!
  \*************************************/
/***/ function(module, exports, __webpack_require__) {

	/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),
			moment = __webpack_require__(/*! moment */ 25),

			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Cache = __webpack_require__(/*! Storage:RainLoop:Cache */ 20),

			kn = __webpack_require__(/*! App:Knoin */ 5),

			MessageModel = __webpack_require__(/*! Model:Message */ 38),

			LocalStorage = __webpack_require__(/*! Storage:LocalStorage */ 30),
			AbstractData = __webpack_require__(/*! Storage:Abstract:Data */ 39)
		;

		/**
		 * @constructor
		 * @extends AbstractData
		 */
		function DataStorage()
		{
			AbstractData.call(this);

			var
				fRemoveSystemFolderType = function (observable) {
					return function () {
						var oFolder = Cache.getFolderFromCacheList(observable());
						if (oFolder)
						{
							oFolder.type(Enums.FolderType.User);
						}
					};
				},
				fSetSystemFolderType = function (iType) {
					return function (sValue) {
						var oFolder = Cache.getFolderFromCacheList(sValue);
						if (oFolder)
						{
							oFolder.type(iType);
						}
					};
				}
			;

			this.devEmail = '';
			this.devPassword = '';

			this.accountEmail = ko.observable('');
			this.accountIncLogin = ko.observable('');
			this.accountOutLogin = ko.observable('');
			this.projectHash = ko.observable('');
			this.threading = ko.observable(false);

			this.lastFoldersHash = '';
			this.remoteSuggestions = false;

			// system folders
			this.sentFolder = ko.observable('');
			this.draftFolder = ko.observable('');
			this.spamFolder = ko.observable('');
			this.trashFolder = ko.observable('');
			this.archiveFolder = ko.observable('');

			this.sentFolder.subscribe(fRemoveSystemFolderType(this.sentFolder), this, 'beforeChange');
			this.draftFolder.subscribe(fRemoveSystemFolderType(this.draftFolder), this, 'beforeChange');
			this.spamFolder.subscribe(fRemoveSystemFolderType(this.spamFolder), this, 'beforeChange');
			this.trashFolder.subscribe(fRemoveSystemFolderType(this.trashFolder), this, 'beforeChange');
			this.archiveFolder.subscribe(fRemoveSystemFolderType(this.archiveFolder), this, 'beforeChange');

			this.sentFolder.subscribe(fSetSystemFolderType(Enums.FolderType.SentItems), this);
			this.draftFolder.subscribe(fSetSystemFolderType(Enums.FolderType.Draft), this);
			this.spamFolder.subscribe(fSetSystemFolderType(Enums.FolderType.Spam), this);
			this.trashFolder.subscribe(fSetSystemFolderType(Enums.FolderType.Trash), this);
			this.archiveFolder.subscribe(fSetSystemFolderType(Enums.FolderType.Archive), this);

			this.draftFolderNotEnabled = ko.computed(function () {
				return '' === this.draftFolder() || Consts.Values.UnuseOptionValue === this.draftFolder();
			}, this);

			// personal
			this.displayName = ko.observable('');
			this.signature = ko.observable('');
			this.signatureToAll = ko.observable(false);
			this.replyTo = ko.observable('');

			// security
			this.enableTwoFactor = ko.observable(false);

			// accounts
			this.accounts = ko.observableArray([]);
			this.accountsLoading = ko.observable(false).extend({'throttle': 100});

			// identities
			this.defaultIdentityID = ko.observable('');
			this.identities = ko.observableArray([]);
			this.identitiesLoading = ko.observable(false).extend({'throttle': 100});

			// contacts
			this.contactTags = ko.observableArray([]);
			this.contacts = ko.observableArray([]);
			this.contacts.loading = ko.observable(false).extend({'throttle': 200});
			this.contacts.importing = ko.observable(false).extend({'throttle': 200});
			this.contacts.syncing = ko.observable(false).extend({'throttle': 200});
			this.contacts.exportingVcf = ko.observable(false).extend({'throttle': 200});
			this.contacts.exportingCsv = ko.observable(false).extend({'throttle': 200});

			this.allowContactsSync = ko.observable(false);
			this.enableContactsSync = ko.observable(false);
			this.contactsSyncUrl = ko.observable('');
			this.contactsSyncUser = ko.observable('');
			this.contactsSyncPass = ko.observable('');

			this.allowContactsSync = ko.observable(!!Settings.settingsGet('ContactsSyncIsAllowed'));
			this.enableContactsSync = ko.observable(!!Settings.settingsGet('EnableContactsSync'));
			this.contactsSyncUrl = ko.observable(Settings.settingsGet('ContactsSyncUrl'));
			this.contactsSyncUser = ko.observable(Settings.settingsGet('ContactsSyncUser'));
			this.contactsSyncPass = ko.observable(Settings.settingsGet('ContactsSyncPassword'));

			// folders
			this.namespace = '';
			this.folderList = ko.observableArray([]);
			this.folderList.focused = ko.observable(false);

			this.foldersListError = ko.observable('');

			this.foldersLoading = ko.observable(false);
			this.foldersCreating = ko.observable(false);
			this.foldersDeleting = ko.observable(false);
			this.foldersRenaming = ko.observable(false);

			this.foldersChanging = ko.computed(function () {
				var
					bLoading = this.foldersLoading(),
					bCreating = this.foldersCreating(),
					bDeleting = this.foldersDeleting(),
					bRenaming = this.foldersRenaming()
				;
				return bLoading || bCreating || bDeleting || bRenaming;
			}, this);

			this.foldersInboxUnreadCount = ko.observable(0);

			this.currentFolder = ko.observable(null).extend({'toggleSubscribe': [null,
				function (oPrev) {
					if (oPrev)
					{
						oPrev.selected(false);
					}
				}, function (oNext) {
					if (oNext)
					{
						oNext.selected(true);
					}
				}
			]});

			this.currentFolderFullNameRaw = ko.computed(function () {
				return this.currentFolder() ? this.currentFolder().fullNameRaw : '';
			}, this);

			this.currentFolderFullName = ko.computed(function () {
				return this.currentFolder() ? this.currentFolder().fullName : '';
			}, this);

			this.currentFolderFullNameHash = ko.computed(function () {
				return this.currentFolder() ? this.currentFolder().fullNameHash : '';
			}, this);

			this.currentFolderName = ko.computed(function () {
				return this.currentFolder() ? this.currentFolder().name() : '';
			}, this);

			this.folderListSystemNames = ko.computed(function () {

				var
					aList = ['INBOX'],
					aFolders = this.folderList(),
					sSentFolder = this.sentFolder(),
					sDraftFolder = this.draftFolder(),
					sSpamFolder = this.spamFolder(),
					sTrashFolder = this.trashFolder(),
					sArchiveFolder = this.archiveFolder()
				;

				if (Utils.isArray(aFolders) && 0 < aFolders.length)
				{
					if ('' !== sSentFolder && Consts.Values.UnuseOptionValue !== sSentFolder)
					{
						aList.push(sSentFolder);
					}
					if ('' !== sDraftFolder && Consts.Values.UnuseOptionValue !== sDraftFolder)
					{
						aList.push(sDraftFolder);
					}
					if ('' !== sSpamFolder && Consts.Values.UnuseOptionValue !== sSpamFolder)
					{
						aList.push(sSpamFolder);
					}
					if ('' !== sTrashFolder && Consts.Values.UnuseOptionValue !== sTrashFolder)
					{
						aList.push(sTrashFolder);
					}
					if ('' !== sArchiveFolder && Consts.Values.UnuseOptionValue !== sArchiveFolder)
					{
						aList.push(sArchiveFolder);
					}
				}

				return aList;

			}, this);

			this.folderListSystem = ko.computed(function () {
				return _.compact(_.map(this.folderListSystemNames(), function (sName) {
					return Cache.getFolderFromCacheList(sName);
				}));
			}, this);

			this.folderMenuForMove = ko.computed(function () {
				return Utils.folderListOptionsBuilder(this.folderListSystem(), this.folderList(), [
					this.currentFolderFullNameRaw()
				], null, null, null, null, function (oItem) {
					return oItem ? oItem.localName() : '';
				});
			}, this);

			// message list
			this.staticMessageList = [];

			this.messageList = ko.observableArray([]).extend({'rateLimit': 0});

			this.messageListCount = ko.observable(0);
			this.messageListSearch = ko.observable('');
			this.messageListPage = ko.observable(1);

			this.messageListThreadFolder = ko.observable('');
			this.messageListThreadUids = ko.observableArray([]);

			this.messageListThreadFolder.subscribe(function () {
				this.messageListThreadUids([]);
			}, this);

			this.messageListEndFolder = ko.observable('');
			this.messageListEndSearch = ko.observable('');
			this.messageListEndPage = ko.observable(1);

			this.messageListEndHash = ko.computed(function () {
				return this.messageListEndFolder() + '|' + this.messageListEndSearch() + '|' + this.messageListEndPage();
			}, this);

			this.messageListPageCount = ko.computed(function () {
				var iPage = window.Math.ceil(this.messageListCount() / this.messagesPerPage());
				return 0 >= iPage ? 1 : iPage;
			}, this);

			this.mainMessageListSearch = ko.computed({
				'read': this.messageListSearch,
				'write': function (sValue) {
					kn.setHash(LinkBuilder.mailBox(
						this.currentFolderFullNameHash(), 1, Utils.trim(sValue.toString())
					));
				},
				'owner': this
			});

			this.messageListError = ko.observable('');

			this.messageListLoading = ko.observable(false);
			this.messageListIsNotCompleted = ko.observable(false);
			this.messageListCompleteLoadingThrottle = ko.observable(false).extend({'throttle': 200});

			this.messageListCompleteLoading = ko.computed(function () {
				var
					bOne = this.messageListLoading(),
					bTwo = this.messageListIsNotCompleted()
				;
				return bOne || bTwo;
			}, this);

			this.messageListCompleteLoading.subscribe(function (bValue) {
				this.messageListCompleteLoadingThrottle(bValue);
			}, this);

			this.messageList.subscribe(_.debounce(function (aList) {
				_.each(aList, function (oItem) {
					if (oItem.newForAnimation())
					{
						oItem.newForAnimation(false);
					}
				});
			}, 500));

			// message preview
			this.staticMessageList = new MessageModel();
			this.message = ko.observable(null);
			this.messageLoading = ko.observable(false);
			this.messageLoadingThrottle = ko.observable(false).extend({'throttle': 50});

			this.message.focused = ko.observable(false);

			this.message.subscribe(function (oMessage) {
				if (!oMessage)
				{
					this.message.focused(false);
					this.messageFullScreenMode(false);
					this.hideMessageBodies();

					if (Enums.Layout.NoPreview === this.layout() &&
						-1 < window.location.hash.indexOf('message-preview'))
					{
						if (Globals.__APP)
						{
							Globals.__APP.historyBack();
						}
					}
				}
				else if (Enums.Layout.NoPreview === this.layout())
				{
					this.message.focused(true);
				}
			}, this);

			this.message.focused.subscribe(function (bValue) {
				if (bValue)
				{
					this.folderList.focused(false);
					Globals.keyScope(Enums.KeyState.MessageView);
				}
				else if (Enums.KeyState.MessageView === Globals.keyScope())
				{
					if (Enums.Layout.NoPreview === this.layout() && this.message())
					{
						Globals.keyScope(Enums.KeyState.MessageView);
					}
					else
					{
						Globals.keyScope(Enums.KeyState.MessageList);
					}
				}
			}, this);

			this.folderList.focused.subscribe(function (bValue) {
				if (bValue)
				{
					Globals.keyScope(Enums.KeyState.FolderList);
				}
				else if (Enums.KeyState.FolderList === Globals.keyScope())
				{
					Globals.keyScope(Enums.KeyState.MessageList);
				}
			});

			this.messageLoading.subscribe(function (bValue) {
				this.messageLoadingThrottle(bValue);
			}, this);

			this.messageFullScreenMode = ko.observable(false);

			this.messageError = ko.observable('');

			this.messagesBodiesDom = ko.observable(null);

			this.messagesBodiesDom.subscribe(function (oDom) {
				if (oDom && !(oDom instanceof $))
				{
					this.messagesBodiesDom($(oDom));
				}
			}, this);

			this.messageActiveDom = ko.observable(null);

			this.isMessageSelected = ko.computed(function () {
				return null !== this.message();
			}, this);

			this.currentMessage = ko.observable(null);

			this.messageListChecked = ko.computed(function () {
				return _.filter(this.messageList(), function (oItem) {
					return oItem.checked();
				});
			}, this).extend({'rateLimit': 0});

			this.hasCheckedMessages = ko.computed(function () {
				return 0 < this.messageListChecked().length;
			}, this).extend({'rateLimit': 0});

			this.messageListCheckedOrSelected = ko.computed(function () {

				var
					aChecked = this.messageListChecked(),
					oSelectedMessage = this.currentMessage()
				;

				return _.union(aChecked, oSelectedMessage ? [oSelectedMessage] : []);

			}, this);

			this.messageListCheckedOrSelectedUidsWithSubMails = ko.computed(function () {
				var aList = [];
				_.each(this.messageListCheckedOrSelected(), function (oMessage) {
					if (oMessage)
					{
						aList.push(oMessage.uid);
						if (0 < oMessage.threadsLen() && 0 === oMessage.parentUid() && oMessage.lastInCollapsedThread())
						{
							aList = _.union(aList, oMessage.threads());
						}
					}
				});
				return aList;
			}, this);

			// quota
			this.userQuota = ko.observable(0);
			this.userUsageSize = ko.observable(0);
			this.userUsageProc = ko.computed(function () {

				var
					iQuota = this.userQuota(),
					iUsed = this.userUsageSize()
				;

				return 0 < iQuota ? window.Math.ceil((iUsed / iQuota) * 100) : 0;

			}, this);

			// other
			this.capaOpenPGP = ko.observable(false);
			this.openpgpkeys = ko.observableArray([]);
			this.openpgpKeyring = null;

			this.openpgpkeysPublic = this.openpgpkeys.filter(function (oItem) {
				return !!(oItem && !oItem.isPrivate);
			});

			this.openpgpkeysPrivate = this.openpgpkeys.filter(function (oItem) {
				return !!(oItem && oItem.isPrivate);
			});

			// google
			this.googleActions = ko.observable(false);
			this.googleLoggined = ko.observable(false);
			this.googleUserName = ko.observable('');

			// facebook
			this.facebookActions = ko.observable(false);
			this.facebookLoggined = ko.observable(false);
			this.facebookUserName = ko.observable('');

			// twitter
			this.twitterActions = ko.observable(false);
			this.twitterLoggined = ko.observable(false);
			this.twitterUserName = ko.observable('');

			this.customThemeType = ko.observable(Enums.CustomThemeType.Light);

			this.purgeMessageBodyCacheThrottle = _.throttle(this.purgeMessageBodyCache, 1000 * 30);
		}

		_.extend(DataStorage.prototype, AbstractData.prototype);

		DataStorage.prototype.purgeMessageBodyCache = function()
		{
			var
				iCount = 0,
				oMessagesBodiesDom = null,
				iEnd = Globals.iMessageBodyCacheCount - Consts.Values.MessageBodyCacheLimit
			;

			if (0 < iEnd)
			{
				oMessagesBodiesDom = this.messagesBodiesDom();
				if (oMessagesBodiesDom)
				{
					oMessagesBodiesDom.find('.rl-cache-class').each(function () {
						var oItem = $(this);
						if (iEnd > oItem.data('rl-cache-count'))
						{
							oItem.addClass('rl-cache-purge');
							iCount++;
						}
					});

					if (0 < iCount)
					{
						_.delay(function () {
							oMessagesBodiesDom.find('.rl-cache-purge').remove();
						}, 300);
					}
				}
			}
		};

		DataStorage.prototype.populateDataOnStart = function()
		{
			AbstractData.prototype.populateDataOnStart.call(this);

			this.accountEmail(Settings.settingsGet('Email'));
			this.accountIncLogin(Settings.settingsGet('IncLogin'));
			this.accountOutLogin(Settings.settingsGet('OutLogin'));
			this.projectHash(Settings.settingsGet('ProjectHash'));

			this.defaultIdentityID(Settings.settingsGet('DefaultIdentityID'));

			this.displayName(Settings.settingsGet('DisplayName'));
			this.replyTo(Settings.settingsGet('ReplyTo'));
			this.signature(Settings.settingsGet('Signature'));
			this.signatureToAll(!!Settings.settingsGet('SignatureToAll'));
			this.enableTwoFactor(!!Settings.settingsGet('EnableTwoFactor'));

			this.lastFoldersHash = LocalStorage.get(Enums.ClientSideKeyName.FoldersLashHash) || '';

			this.remoteSuggestions = !!Settings.settingsGet('RemoteSuggestions');

			this.devEmail = Settings.settingsGet('DevEmail');
			this.devPassword = Settings.settingsGet('DevPassword');
		};

		DataStorage.prototype.initUidNextAndNewMessages = function (sFolder, sUidNext, aNewMessages)
		{
			if ('INBOX' === sFolder && Utils.isNormal(sUidNext) && sUidNext !== '')
			{
				if (Utils.isArray(aNewMessages) && 0 < aNewMessages.length)
				{
					var
						self = this,
						iIndex = 0,
						iLen = aNewMessages.length,
						fNotificationHelper = function (sImageSrc, sTitle, sText)
						{
							var
								NotificationClass = Utils.notificationClass(),
								oNotification = null
							;

							if (NotificationClass && self.useDesktopNotifications())
							{
								oNotification = new NotificationClass(sTitle, {
									'body': sText,
									'icon': sImageSrc
								});

								if (oNotification)
								{
									if (oNotification.show)
									{
										oNotification.show();
									}

									window.setTimeout((function (oLocalNotifications) {
										return function () {
											if (oLocalNotifications.cancel)
											{
												oLocalNotifications.cancel();
											}
											else if (oLocalNotifications.close)
											{
												oLocalNotifications.close();
											}
										};
									}(oNotification)), 7000);
								}
							}
						}
					;

					_.each(aNewMessages, function (oItem) {
						Cache.addNewMessageCache(sFolder, oItem.Uid);
					});

					if (3 < iLen)
					{
						fNotificationHelper(
							LinkBuilder.notificationMailIcon(),
							this.accountEmail(),
							Utils.i18n('MESSAGE_LIST/NEW_MESSAGE_NOTIFICATION', {
								'COUNT': iLen
							})
						);
					}
					else
					{
						for (; iIndex < iLen; iIndex++)
						{
							fNotificationHelper(
								LinkBuilder.notificationMailIcon(),
								MessageModel.emailsToLine(MessageModel.initEmailsFromJson(aNewMessages[iIndex].From), false),
								aNewMessages[iIndex].Subject
							);
						}
					}
				}

				Cache.setFolderUidNext(sFolder, sUidNext);
			}
		};

		DataStorage.prototype.hideMessageBodies = function ()
		{
			var oMessagesBodiesDom = this.messagesBodiesDom();
			if (oMessagesBodiesDom)
			{
				oMessagesBodiesDom.find('.b-text-part').hide();
			}
		};

		/**
		 * @param {boolean=} bBoot = false
		 * @returns {Array}
		 */
		DataStorage.prototype.getNextFolderNames = function (bBoot)
		{
			bBoot = Utils.isUnd(bBoot) ? false : !!bBoot;

			var
				aResult = [],
				iLimit = 10,
				iUtc = moment().unix(),
				iTimeout = iUtc - 60 * 5,
				aTimeouts = [],
				fSearchFunction = function (aList) {
					_.each(aList, function (oFolder) {
						if (oFolder && 'INBOX' !== oFolder.fullNameRaw &&
							oFolder.selectable && oFolder.existen &&
							iTimeout > oFolder.interval &&
							(!bBoot || oFolder.subScribed()))
						{
							aTimeouts.push([oFolder.interval, oFolder.fullNameRaw]);
						}

						if (oFolder && 0 < oFolder.subFolders().length)
						{
							fSearchFunction(oFolder.subFolders());
						}
					});
				}
			;

			fSearchFunction(this.folderList());

			aTimeouts.sort(function(a, b) {
				if (a[0] < b[0])
				{
					return -1;
				}
				else if (a[0] > b[0])
				{
					return 1;
				}

				return 0;
			});

			_.find(aTimeouts, function (aItem) {
				var oFolder = Cache.getFolderFromCacheList(aItem[1]);
				if (oFolder)
				{
					oFolder.interval = iUtc;
					aResult.push(aItem[1]);
				}

				return iLimit <= aResult.length;
			});

			return _.uniq(aResult);
		};

		/**
		 * @param {string} sFromFolderFullNameRaw
		 * @param {Array} aUidForRemove
		 * @param {string=} sToFolderFullNameRaw = ''
		 * @param {bCopy=} bCopy = false
		 */
		DataStorage.prototype.removeMessagesFromList = function (
			sFromFolderFullNameRaw, aUidForRemove, sToFolderFullNameRaw, bCopy)
		{
			sToFolderFullNameRaw = Utils.isNormal(sToFolderFullNameRaw) ? sToFolderFullNameRaw : '';
			bCopy = Utils.isUnd(bCopy) ? false : !!bCopy;

			aUidForRemove = _.map(aUidForRemove, function (mValue) {
				return Utils.pInt(mValue);
			});

			var
				self = this,
				iUnseenCount = 0,
				aMessageList = this.messageList(),
				oFromFolder = Cache.getFolderFromCacheList(sFromFolderFullNameRaw),
				oToFolder = '' === sToFolderFullNameRaw ? null : Cache.getFolderFromCacheList(sToFolderFullNameRaw || ''),
				sCurrentFolderFullNameRaw = this.currentFolderFullNameRaw(),
				oCurrentMessage = this.message(),
				aMessages = sCurrentFolderFullNameRaw === sFromFolderFullNameRaw ? _.filter(aMessageList, function (oMessage) {
					return oMessage && -1 < Utils.inArray(Utils.pInt(oMessage.uid), aUidForRemove);
				}) : []
			;

			_.each(aMessages, function (oMessage) {
				if (oMessage && oMessage.unseen())
				{
					iUnseenCount++;
				}
			});

			if (oFromFolder && !bCopy)
			{
				oFromFolder.messageCountAll(0 <= oFromFolder.messageCountAll() - aUidForRemove.length ?
					oFromFolder.messageCountAll() - aUidForRemove.length : 0);

				if (0 < iUnseenCount)
				{
					oFromFolder.messageCountUnread(0 <= oFromFolder.messageCountUnread() - iUnseenCount ?
						oFromFolder.messageCountUnread() - iUnseenCount : 0);
				}
			}

			if (oToFolder)
			{
				oToFolder.messageCountAll(oToFolder.messageCountAll() + aUidForRemove.length);
				if (0 < iUnseenCount)
				{
					oToFolder.messageCountUnread(oToFolder.messageCountUnread() + iUnseenCount);
				}

				oToFolder.actionBlink(true);
			}

			if (0 < aMessages.length)
			{
				if (bCopy)
				{
					_.each(aMessages, function (oMessage) {
						oMessage.checked(false);
					});
				}
				else
				{
					this.messageListIsNotCompleted(true);

					_.each(aMessages, function (oMessage) {
						if (oCurrentMessage && oCurrentMessage.hash === oMessage.hash)
						{
							oCurrentMessage = null;
							self.message(null);
						}

						oMessage.deleted(true);
					});

					_.delay(function () {
						_.each(aMessages, function (oMessage) {
							self.messageList.remove(oMessage);
						});
					}, 400);
				}
			}

			if ('' !== sFromFolderFullNameRaw)
			{
				Cache.setFolderHash(sFromFolderFullNameRaw, '');
			}

			if ('' !== sToFolderFullNameRaw)
			{
				Cache.setFolderHash(sToFolderFullNameRaw, '');
			}
		};

		/**
		 * @private
		 * @param {Object} oMessageTextBody
		 */
		DataStorage.prototype.initBlockquoteSwitcher = function (oMessageTextBody)
		{
			if (oMessageTextBody)
			{
				var $oList = $('blockquote:not(.rl-bq-switcher)', oMessageTextBody).filter(function () {
					return 0 === $(this).parent().closest('blockquote', oMessageTextBody).length;
				});

				if ($oList && 0 < $oList.length)
				{
					$oList.each(function () {
						var $self = $(this), iH = $self.height();
						if (0 === iH || 100 < iH)
						{
							$self.addClass('rl-bq-switcher hidden-bq');
							$('<span class="rlBlockquoteSwitcher"><i class="icon-ellipsis" /></span>')
								.insertBefore($self)
								.click(function () {
									$self.toggleClass('hidden-bq');
									Utils.windowResize();
								})
								.after('<br />')
								.before('<br />')
							;
						}
					});
				}
			}
		};

		DataStorage.prototype.setMessage = function (oData, bCached)
		{
			var
				bIsHtml = false,
				bHasExternals = false,
				bHasInternals = false,
				oBody = null,
				oTextBody = null,
				sId = '',
				sResultHtml = '',
				bPgpSigned = false,
				bPgpEncrypted = false,
				oMessagesBodiesDom = this.messagesBodiesDom(),
				oMessage = this.message()
			;

			if (oData && oMessage && oData.Result && 'Object/Message' === oData.Result['@Object'] &&
				oMessage.folderFullNameRaw === oData.Result.Folder && oMessage.uid === oData.Result.Uid)
			{
				this.messageError('');

				oMessage.initUpdateByMessageJson(oData.Result);
				Cache.addRequestedMessage(oMessage.folderFullNameRaw, oMessage.uid);

				if (!bCached)
				{
					oMessage.initFlagsByJson(oData.Result);
				}

				oMessagesBodiesDom = oMessagesBodiesDom && oMessagesBodiesDom[0] ? oMessagesBodiesDom : null;
				if (oMessagesBodiesDom)
				{
					sId = 'rl-mgs-' + oMessage.hash.replace(/[^a-zA-Z0-9]/g, '');
					oTextBody = oMessagesBodiesDom.find('#' + sId);
					if (!oTextBody || !oTextBody[0])
					{
						bHasExternals = !!oData.Result.HasExternals;
						bHasInternals = !!oData.Result.HasInternals;

						oBody = $('<div id="' + sId + '" />').hide().addClass('rl-cache-class');
						oBody.data('rl-cache-count', ++Globals.iMessageBodyCacheCount);

						if (Utils.isNormal(oData.Result.Html) && '' !== oData.Result.Html)
						{
							bIsHtml = true;
							sResultHtml = oData.Result.Html.toString();
						}
						else if (Utils.isNormal(oData.Result.Plain) && '' !== oData.Result.Plain)
						{
							bIsHtml = false;
							sResultHtml = Utils.plainToHtml(oData.Result.Plain.toString(), false);

							if ((oMessage.isPgpSigned() || oMessage.isPgpEncrypted()) && this.capaOpenPGP())
							{
								oMessage.plainRaw = Utils.pString(oData.Result.Plain);

								bPgpEncrypted = /---BEGIN PGP MESSAGE---/.test(oMessage.plainRaw);
								if (!bPgpEncrypted)
								{
									bPgpSigned = /-----BEGIN PGP SIGNED MESSAGE-----/.test(oMessage.plainRaw) &&
										/-----BEGIN PGP SIGNATURE-----/.test(oMessage.plainRaw);
								}

								Globals.$div.empty();
								if (bPgpSigned && oMessage.isPgpSigned())
								{
									sResultHtml =
										Globals.$div.append(
											$('<pre class="b-plain-openpgp signed"></pre>').text(oMessage.plainRaw)
										).html()
									;
								}
								else if (bPgpEncrypted && oMessage.isPgpEncrypted())
								{
									sResultHtml =
										Globals.$div.append(
											$('<pre class="b-plain-openpgp encrypted"></pre>').text(oMessage.plainRaw)
										).html()
									;
								}

								Globals.$div.empty();

								oMessage.isPgpSigned(bPgpSigned);
								oMessage.isPgpEncrypted(bPgpEncrypted);
							}
						}
						else
						{
							bIsHtml = false;
						}

						oBody
							.html(Utils.linkify(sResultHtml))
							.addClass('b-text-part ' + (bIsHtml ? 'html' : 'plain'))
						;

						oMessage.isHtml(!!bIsHtml);
						oMessage.hasImages(!!bHasExternals);
						oMessage.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.None);
						oMessage.pgpSignedVerifyUser('');

						oMessage.body = oBody;
						if (oMessage.body)
						{
							oMessagesBodiesDom.append(oMessage.body);
						}

						oMessage.storeDataToDom();

						if (bHasInternals)
						{
							oMessage.showInternalImages(true);
						}

						if (oMessage.hasImages() && this.showImages())
						{
							oMessage.showExternalImages(true);
						}

						this.purgeMessageBodyCacheThrottle();
					}
					else
					{
						oMessage.body = oTextBody;
						if (oMessage.body)
						{
							oMessage.body.data('rl-cache-count', ++Globals.iMessageBodyCacheCount);
							oMessage.fetchDataToDom();
						}
					}

					this.messageActiveDom(oMessage.body);

					this.hideMessageBodies();
					oMessage.body.show();

					if (oBody)
					{
						this.initBlockquoteSwitcher(oBody);
					}
				}

				Cache.initMessageFlagsFromCache(oMessage);
				if (oMessage.unseen())
				{
					if (Globals.__APP)
					{
						Globals.__APP.setMessageSeen(oMessage);
					}
				}

				Utils.windowResize();
			}
		};

		/**
		 * @param {Array} aList
		 * @returns {string}
		 */
		DataStorage.prototype.calculateMessageListHash = function (aList)
		{
			return _.map(aList, function (oMessage) {
				return '' + oMessage.hash + '_' + oMessage.threadsLen() + '_' + oMessage.flagHash();
			}).join('|');
		};

		DataStorage.prototype.findPublicKeyByHex = function (sHash)
		{
			return _.find(this.openpgpkeysPublic(), function (oItem) {
				return oItem && sHash === oItem.id;
			});
		};

		DataStorage.prototype.findPublicKeysByEmail = function (sEmail)
		{
			return _.compact(_.map(this.openpgpkeysPublic(), function (oItem) {

				var oKey = null;
				if (oItem && sEmail === oItem.email)
				{
					try
					{
						oKey = window.openpgp.key.readArmored(oItem.armor);
						if (oKey && !oKey.err && oKey.keys && oKey.keys[0])
						{
							return oKey.keys[0];
						}
					}
					catch (e) {}
				}

				return null;

			}));
		};

		/**
		 * @param {string} sEmail
		 * @param {string=} sPassword
		 * @returns {?}
		 */
		DataStorage.prototype.findPrivateKeyByEmail = function (sEmail, sPassword)
		{
			var
				oPrivateKey = null,
				oKey = _.find(this.openpgpkeysPrivate(), function (oItem) {
					return oItem && sEmail === oItem.email;
				})
			;

			if (oKey)
			{
				try
				{
					oPrivateKey = window.openpgp.key.readArmored(oKey.armor);
					if (oPrivateKey && !oPrivateKey.err && oPrivateKey.keys && oPrivateKey.keys[0])
					{
						oPrivateKey = oPrivateKey.keys[0];
						oPrivateKey.decrypt(Utils.pString(sPassword));
					}
					else
					{
						oPrivateKey = null;
					}
				}
				catch (e)
				{
					oPrivateKey = null;
				}
			}

			return oPrivateKey;
		};

		/**
		 * @param {string=} sPassword
		 * @returns {?}
		 */
		DataStorage.prototype.findSelfPrivateKey = function (sPassword)
		{
			return this.findPrivateKeyByEmail(this.accountEmail(), sPassword);
		};

		module.exports = new DataStorage();

	}());


/***/ },

/***/ 13:
/*!***************************************!*\
  !*** ./dev/Storages/RemoteStorage.js ***!
  \***************************************/
/***/ function(module, exports, __webpack_require__) {

	/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),

			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Base64 = __webpack_require__(/*! Common/Base64 */ 49),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Cache = __webpack_require__(/*! Storage:RainLoop:Cache */ 20),
			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),

			AbstractRemoteStorage = __webpack_require__(/*! Storage:Abstract:Remote */ 40)
		;

		/**
		 * @constructor
		 * @extends AbstractRemoteStorage
		 */
		function RemoteStorage()
		{
			AbstractRemoteStorage.call(this);

			this.oRequests = {};
		}

		_.extend(RemoteStorage.prototype, AbstractRemoteStorage.prototype);

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.folders = function (fCallback)
		{
			this.defaultRequest(fCallback, 'Folders', {
				'SentFolder': Settings.settingsGet('SentFolder'),
				'DraftFolder': Settings.settingsGet('DraftFolder'),
				'SpamFolder': Settings.settingsGet('SpamFolder'),
				'TrashFolder': Settings.settingsGet('TrashFolder'),
				'ArchiveFolder': Settings.settingsGet('ArchiveFolder')
			}, null, '', ['Folders']);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sEmail
		 * @param {string} sLogin
		 * @param {string} sPassword
		 * @param {boolean} bSignMe
		 * @param {string=} sLanguage
		 * @param {string=} sAdditionalCode
		 * @param {boolean=} bAdditionalCodeSignMe
		 */
		RemoteStorage.prototype.login = function (fCallback, sEmail, sLogin, sPassword, bSignMe, sLanguage, sAdditionalCode, bAdditionalCodeSignMe)
		{
			this.defaultRequest(fCallback, 'Login', {
				'Email': sEmail,
				'Login': sLogin,
				'Password': sPassword,
				'Language': sLanguage || '',
				'AdditionalCode': sAdditionalCode || '',
				'AdditionalCodeSignMe': bAdditionalCodeSignMe ? '1' : '0',
				'SignMe': bSignMe ? '1' : '0'
			});
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.getTwoFactor = function (fCallback)
		{
			this.defaultRequest(fCallback, 'GetTwoFactorInfo');
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.createTwoFactor = function (fCallback)
		{
			this.defaultRequest(fCallback, 'CreateTwoFactorSecret');
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.clearTwoFactor = function (fCallback)
		{
			this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.showTwoFactorSecret = function (fCallback)
		{
			this.defaultRequest(fCallback, 'ShowTwoFactorSecret');
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sCode
		 */
		RemoteStorage.prototype.testTwoFactor = function (fCallback, sCode)
		{
			this.defaultRequest(fCallback, 'TestTwoFactorInfo', {
				'Code': sCode
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {boolean} bEnable
		 */
		RemoteStorage.prototype.enableTwoFactor = function (fCallback, bEnable)
		{
			this.defaultRequest(fCallback, 'EnableTwoFactor', {
				'Enable': bEnable ? '1' : '0'
			});
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.clearTwoFactorInfo = function (fCallback)
		{
			this.defaultRequest(fCallback, 'ClearTwoFactorInfo');
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.contactsSync = function (fCallback)
		{
			this.defaultRequest(fCallback, 'ContactsSync', null, Consts.Defaults.ContactsSyncAjaxTimeout);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {boolean} bEnable
		 * @param {string} sUrl
		 * @param {string} sUser
		 * @param {string} sPassword
		 */
		RemoteStorage.prototype.saveContactsSyncData = function (fCallback, bEnable, sUrl, sUser, sPassword)
		{
			this.defaultRequest(fCallback, 'SaveContactsSyncData', {
				'Enable': bEnable ? '1' : '0',
				'Url': sUrl,
				'User': sUser,
				'Password': sPassword
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sEmail
		 * @param {string} sLogin
		 * @param {string} sPassword
		 */
		RemoteStorage.prototype.accountAdd = function (fCallback, sEmail, sLogin, sPassword)
		{
			this.defaultRequest(fCallback, 'AccountAdd', {
				'Email': sEmail,
				'Login': sLogin,
				'Password': sPassword
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sEmailToDelete
		 */
		RemoteStorage.prototype.accountDelete = function (fCallback, sEmailToDelete)
		{
			this.defaultRequest(fCallback, 'AccountDelete', {
				'EmailToDelete': sEmailToDelete
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sId
		 * @param {string} sEmail
		 * @param {string} sName
		 * @param {string} sReplyTo
		 * @param {string} sBcc
		 */
		RemoteStorage.prototype.identityUpdate = function (fCallback, sId, sEmail, sName, sReplyTo, sBcc)
		{
			this.defaultRequest(fCallback, 'IdentityUpdate', {
				'Id': sId,
				'Email': sEmail,
				'Name': sName,
				'ReplyTo': sReplyTo,
				'Bcc': sBcc
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sIdToDelete
		 */
		RemoteStorage.prototype.identityDelete = function (fCallback, sIdToDelete)
		{
			this.defaultRequest(fCallback, 'IdentityDelete', {
				'IdToDelete': sIdToDelete
			});
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.accountsAndIdentities = function (fCallback)
		{
			this.defaultRequest(fCallback, 'AccountsAndIdentities');
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sFolderFullNameRaw
		 * @param {number=} iOffset = 0
		 * @param {number=} iLimit = 20
		 * @param {string=} sSearch = ''
		 * @param {boolean=} bSilent = false
		 */
		RemoteStorage.prototype.messageList = function (fCallback, sFolderFullNameRaw, iOffset, iLimit, sSearch, bSilent)
		{
			sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);

			var
				sFolderHash = Cache.getFolderHash(sFolderFullNameRaw)
			;

			bSilent = Utils.isUnd(bSilent) ? false : !!bSilent;
			iOffset = Utils.isUnd(iOffset) ? 0 : Utils.pInt(iOffset);
			iLimit = Utils.isUnd(iOffset) ? 20 : Utils.pInt(iLimit);
			sSearch = Utils.pString(sSearch);

			if ('' !== sFolderHash && ('' === sSearch || -1 === sSearch.indexOf('is:')))
			{
				this.defaultRequest(fCallback, 'MessageList', {},
					'' === sSearch ? Consts.Defaults.DefaultAjaxTimeout : Consts.Defaults.SearchAjaxTimeout,
					'MessageList/' + Base64.urlsafe_encode([
						sFolderFullNameRaw,
						iOffset,
						iLimit,
						sSearch,
						Data.projectHash(),
						sFolderHash,
						'INBOX' === sFolderFullNameRaw ? Cache.getFolderUidNext(sFolderFullNameRaw) : '',
						Data.threading() && Data.useThreads() ? '1' : '0',
						Data.threading() && sFolderFullNameRaw === Data.messageListThreadFolder() ? Data.messageListThreadUids().join(',') : ''
					].join(String.fromCharCode(0))), bSilent ? [] : ['MessageList']);
			}
			else
			{
				this.defaultRequest(fCallback, 'MessageList', {
					'Folder': sFolderFullNameRaw,
					'Offset': iOffset,
					'Limit': iLimit,
					'Search': sSearch,
					'UidNext': 'INBOX' === sFolderFullNameRaw ? Cache.getFolderUidNext(sFolderFullNameRaw) : '',
					'UseThreads': Data.threading() && Data.useThreads() ? '1' : '0',
					'ExpandedThreadUid': Data.threading() && sFolderFullNameRaw === Data.messageListThreadFolder() ? Data.messageListThreadUids().join(',') : ''
				}, '' === sSearch ? Consts.Defaults.DefaultAjaxTimeout : Consts.Defaults.SearchAjaxTimeout, '', bSilent ? [] : ['MessageList']);
			}
		};

		/**
		 * @param {?Function} fCallback
		 * @param {Array} aDownloads
		 */
		RemoteStorage.prototype.messageUploadAttachments = function (fCallback, aDownloads)
		{
			this.defaultRequest(fCallback, 'MessageUploadAttachments', {
				'Attachments': aDownloads
			}, 999000);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sFolderFullNameRaw
		 * @param {number} iUid
		 * @return {boolean}
		 */
		RemoteStorage.prototype.message = function (fCallback, sFolderFullNameRaw, iUid)
		{
			sFolderFullNameRaw = Utils.pString(sFolderFullNameRaw);
			iUid = Utils.pInt(iUid);

			if (Cache.getFolderFromCacheList(sFolderFullNameRaw) && 0 < iUid)
			{
				this.defaultRequest(fCallback, 'Message', {}, null,
					'Message/' + Base64.urlsafe_encode([
						sFolderFullNameRaw,
						iUid,
						Data.projectHash(),
						Data.threading() && Data.useThreads() ? '1' : '0'
					].join(String.fromCharCode(0))), ['Message']);

				return true;
			}

			return false;
		};

		/**
		 * @param {?Function} fCallback
		 * @param {Array} aExternals
		 */
		RemoteStorage.prototype.composeUploadExternals = function (fCallback, aExternals)
		{
			this.defaultRequest(fCallback, 'ComposeUploadExternals', {
				'Externals': aExternals
			}, 999000);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sUrl
		 * @param {string} sAccessToken
		 */
		RemoteStorage.prototype.composeUploadDrive = function (fCallback, sUrl, sAccessToken)
		{
			this.defaultRequest(fCallback, 'ComposeUploadDrive', {
				'AccessToken': sAccessToken,
				'Url': sUrl
			}, 999000);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sFolder
		 * @param {Array=} aList = []
		 */
		RemoteStorage.prototype.folderInformation = function (fCallback, sFolder, aList)
		{
			var
				bRequest = true,
				aUids = []
			;

			if (Utils.isArray(aList) && 0 < aList.length)
			{
				bRequest = false;
				_.each(aList, function (oMessageListItem) {
					if (!Cache.getMessageFlagsFromCache(oMessageListItem.folderFullNameRaw, oMessageListItem.uid))
					{
						aUids.push(oMessageListItem.uid);
					}

					if (0 < oMessageListItem.threads().length)
					{
						_.each(oMessageListItem.threads(), function (sUid) {
							if (!Cache.getMessageFlagsFromCache(oMessageListItem.folderFullNameRaw, sUid))
							{
								aUids.push(sUid);
							}
						});
					}
				});

				if (0 < aUids.length)
				{
					bRequest = true;
				}
			}

			if (bRequest)
			{
				this.defaultRequest(fCallback, 'FolderInformation', {
					'Folder': sFolder,
					'FlagsUids': Utils.isArray(aUids) ? aUids.join(',') : '',
					'UidNext': 'INBOX' === sFolder ? Cache.getFolderUidNext(sFolder) : ''
				});
			}
			else if (Data.useThreads())
			{
				if (Globals.__APP)
				{
					Globals.__APP.reloadFlagsCurrentMessageListAndMessageFromCache();
				}
			}
		};

		/**
		 * @param {?Function} fCallback
		 * @param {Array} aFolders
		 */
		RemoteStorage.prototype.folderInformationMultiply = function (fCallback, aFolders)
		{
			this.defaultRequest(fCallback, 'FolderInformationMultiply', {
				'Folders': aFolders
			});
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.logout = function (fCallback)
		{
			this.defaultRequest(fCallback, 'Logout');
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sFolderFullNameRaw
		 * @param {Array} aUids
		 * @param {boolean} bSetFlagged
		 */
		RemoteStorage.prototype.messageSetFlagged = function (fCallback, sFolderFullNameRaw, aUids, bSetFlagged)
		{
			this.defaultRequest(fCallback, 'MessageSetFlagged', {
				'Folder': sFolderFullNameRaw,
				'Uids': aUids.join(','),
				'SetAction': bSetFlagged ? '1' : '0'
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sFolderFullNameRaw
		 * @param {Array} aUids
		 * @param {boolean} bSetSeen
		 */
		RemoteStorage.prototype.messageSetSeen = function (fCallback, sFolderFullNameRaw, aUids, bSetSeen)
		{
			this.defaultRequest(fCallback, 'MessageSetSeen', {
				'Folder': sFolderFullNameRaw,
				'Uids': aUids.join(','),
				'SetAction': bSetSeen ? '1' : '0'
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sFolderFullNameRaw
		 * @param {boolean} bSetSeen
		 */
		RemoteStorage.prototype.messageSetSeenToAll = function (fCallback, sFolderFullNameRaw, bSetSeen)
		{
			this.defaultRequest(fCallback, 'MessageSetSeenToAll', {
				'Folder': sFolderFullNameRaw,
				'SetAction': bSetSeen ? '1' : '0'
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sMessageFolder
		 * @param {string} sMessageUid
		 * @param {string} sDraftFolder
		 * @param {string} sFrom
		 * @param {string} sTo
		 * @param {string} sCc
		 * @param {string} sBcc
		 * @param {string} sSubject
		 * @param {boolean} bTextIsHtml
		 * @param {string} sText
		 * @param {Array} aAttachments
		 * @param {(Array|null)} aDraftInfo
		 * @param {string} sInReplyTo
		 * @param {string} sReferences
		 */
		RemoteStorage.prototype.saveMessage = function (fCallback, sMessageFolder, sMessageUid, sDraftFolder,
			sFrom, sTo, sCc, sBcc, sSubject, bTextIsHtml, sText, aAttachments, aDraftInfo, sInReplyTo, sReferences)
		{
			this.defaultRequest(fCallback, 'SaveMessage', {
				'MessageFolder': sMessageFolder,
				'MessageUid': sMessageUid,
				'DraftFolder': sDraftFolder,
				'From': sFrom,
				'To': sTo,
				'Cc': sCc,
				'Bcc': sBcc,
				'Subject': sSubject,
				'TextIsHtml': bTextIsHtml ? '1' : '0',
				'Text': sText,
				'DraftInfo': aDraftInfo,
				'InReplyTo': sInReplyTo,
				'References': sReferences,
				'Attachments': aAttachments
			}, Consts.Defaults.SaveMessageAjaxTimeout);
		};


		/**
		 * @param {?Function} fCallback
		 * @param {string} sMessageFolder
		 * @param {string} sMessageUid
		 * @param {string} sReadReceipt
		 * @param {string} sSubject
		 * @param {string} sText
		 */
		RemoteStorage.prototype.sendReadReceiptMessage = function (fCallback, sMessageFolder, sMessageUid, sReadReceipt, sSubject, sText)
		{
			this.defaultRequest(fCallback, 'SendReadReceiptMessage', {
				'MessageFolder': sMessageFolder,
				'MessageUid': sMessageUid,
				'ReadReceipt': sReadReceipt,
				'Subject': sSubject,
				'Text': sText
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sMessageFolder
		 * @param {string} sMessageUid
		 * @param {string} sSentFolder
		 * @param {string} sFrom
		 * @param {string} sTo
		 * @param {string} sCc
		 * @param {string} sBcc
		 * @param {string} sSubject
		 * @param {boolean} bTextIsHtml
		 * @param {string} sText
		 * @param {Array} aAttachments
		 * @param {(Array|null)} aDraftInfo
		 * @param {string} sInReplyTo
		 * @param {string} sReferences
		 * @param {boolean} bRequestReadReceipt
		 */
		RemoteStorage.prototype.sendMessage = function (fCallback, sMessageFolder, sMessageUid, sSentFolder,
			sFrom, sTo, sCc, sBcc, sSubject, bTextIsHtml, sText, aAttachments, aDraftInfo, sInReplyTo, sReferences, bRequestReadReceipt)
		{
			this.defaultRequest(fCallback, 'SendMessage', {
				'MessageFolder': sMessageFolder,
				'MessageUid': sMessageUid,
				'SentFolder': sSentFolder,
				'From': sFrom,
				'To': sTo,
				'Cc': sCc,
				'Bcc': sBcc,
				'Subject': sSubject,
				'TextIsHtml': bTextIsHtml ? '1' : '0',
				'Text': sText,
				'DraftInfo': aDraftInfo,
				'InReplyTo': sInReplyTo,
				'References': sReferences,
				'ReadReceiptRequest': bRequestReadReceipt ? '1' : '0',
				'Attachments': aAttachments
			}, Consts.Defaults.SendMessageAjaxTimeout);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {Object} oData
		 */
		RemoteStorage.prototype.saveSystemFolders = function (fCallback, oData)
		{
			this.defaultRequest(fCallback, 'SystemFoldersUpdate', oData);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {Object} oData
		 */
		RemoteStorage.prototype.saveSettings = function (fCallback, oData)
		{
			this.defaultRequest(fCallback, 'SettingsUpdate', oData);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sPrevPassword
		 * @param {string} sNewPassword
		 */
		RemoteStorage.prototype.changePassword = function (fCallback, sPrevPassword, sNewPassword)
		{
			this.defaultRequest(fCallback, 'ChangePassword', {
				'PrevPassword': sPrevPassword,
				'NewPassword': sNewPassword
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sNewFolderName
		 * @param {string} sParentName
		 */
		RemoteStorage.prototype.folderCreate = function (fCallback, sNewFolderName, sParentName)
		{
			this.defaultRequest(fCallback, 'FolderCreate', {
				'Folder': sNewFolderName,
				'Parent': sParentName
			}, null, '', ['Folders']);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sFolderFullNameRaw
		 */
		RemoteStorage.prototype.folderDelete = function (fCallback, sFolderFullNameRaw)
		{
			this.defaultRequest(fCallback, 'FolderDelete', {
				'Folder': sFolderFullNameRaw
			}, null, '', ['Folders']);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sPrevFolderFullNameRaw
		 * @param {string} sNewFolderName
		 */
		RemoteStorage.prototype.folderRename = function (fCallback, sPrevFolderFullNameRaw, sNewFolderName)
		{
			this.defaultRequest(fCallback, 'FolderRename', {
				'Folder': sPrevFolderFullNameRaw,
				'NewFolderName': sNewFolderName
			}, null, '', ['Folders']);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sFolderFullNameRaw
		 */
		RemoteStorage.prototype.folderClear = function (fCallback, sFolderFullNameRaw)
		{
			this.defaultRequest(fCallback, 'FolderClear', {
				'Folder': sFolderFullNameRaw
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sFolderFullNameRaw
		 * @param {boolean} bSubscribe
		 */
		RemoteStorage.prototype.folderSetSubscribe = function (fCallback, sFolderFullNameRaw, bSubscribe)
		{
			this.defaultRequest(fCallback, 'FolderSubscribe', {
				'Folder': sFolderFullNameRaw,
				'Subscribe': bSubscribe ? '1' : '0'
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sFolder
		 * @param {string} sToFolder
		 * @param {Array} aUids
		 * @param {string=} sLearning
		 */
		RemoteStorage.prototype.messagesMove = function (fCallback, sFolder, sToFolder, aUids, sLearning)
		{
			this.defaultRequest(fCallback, 'MessageMove', {
				'FromFolder': sFolder,
				'ToFolder': sToFolder,
				'Uids': aUids.join(','),
				'Learning': sLearning || ''
			}, null, '', ['MessageList']);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sFolder
		 * @param {string} sToFolder
		 * @param {Array} aUids
		 */
		RemoteStorage.prototype.messagesCopy = function (fCallback, sFolder, sToFolder, aUids)
		{
			this.defaultRequest(fCallback, 'MessageCopy', {
				'FromFolder': sFolder,
				'ToFolder': sToFolder,
				'Uids': aUids.join(',')
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sFolder
		 * @param {Array} aUids
		 */
		RemoteStorage.prototype.messagesDelete = function (fCallback, sFolder, aUids)
		{
			this.defaultRequest(fCallback, 'MessageDelete', {
				'Folder': sFolder,
				'Uids': aUids.join(',')
			}, null, '', ['MessageList']);
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.appDelayStart = function (fCallback)
		{
			this.defaultRequest(fCallback, 'AppDelayStart');
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.quota = function (fCallback)
		{
			this.defaultRequest(fCallback, 'Quota');
		};

		/**
		 * @param {?Function} fCallback
		 * @param {number} iOffset
		 * @param {number} iLimit
		 * @param {string} sSearch
		 */
		RemoteStorage.prototype.contacts = function (fCallback, iOffset, iLimit, sSearch)
		{
			this.defaultRequest(fCallback, 'Contacts', {
				'Offset': iOffset,
				'Limit': iLimit,
				'Search': sSearch
			}, null, '', ['Contacts']);
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.contactSave = function (fCallback, sRequestUid, sUid, sTags, aProperties)
		{
			this.defaultRequest(fCallback, 'ContactSave', {
				'RequestUid': sRequestUid,
				'Uid': Utils.trim(sUid),
				'Tags': Utils.trim(sTags),
				'Properties': aProperties
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {Array} aUids
		 */
		RemoteStorage.prototype.contactsDelete = function (fCallback, aUids)
		{
			this.defaultRequest(fCallback, 'ContactsDelete', {
				'Uids': aUids.join(',')
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sQuery
		 * @param {number} iPage
		 */
		RemoteStorage.prototype.suggestions = function (fCallback, sQuery, iPage)
		{
			this.defaultRequest(fCallback, 'Suggestions', {
				'Query': sQuery,
				'Page': iPage
			}, null, '', ['Suggestions']);
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.facebookUser = function (fCallback)
		{
			this.defaultRequest(fCallback, 'SocialFacebookUserInformation');
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.facebookDisconnect = function (fCallback)
		{
			this.defaultRequest(fCallback, 'SocialFacebookDisconnect');
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.twitterUser = function (fCallback)
		{
			this.defaultRequest(fCallback, 'SocialTwitterUserInformation');
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.twitterDisconnect = function (fCallback)
		{
			this.defaultRequest(fCallback, 'SocialTwitterDisconnect');
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.googleUser = function (fCallback)
		{
			this.defaultRequest(fCallback, 'SocialGoogleUserInformation');
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.googleDisconnect = function (fCallback)
		{
			this.defaultRequest(fCallback, 'SocialGoogleDisconnect');
		};

		/**
		 * @param {?Function} fCallback
		 */
		RemoteStorage.prototype.socialUsers = function (fCallback)
		{
			this.defaultRequest(fCallback, 'SocialUsers');
		};

		module.exports = new RemoteStorage();

	}());

/***/ },

/***/ 20:
/*!**************************************!*\
  !*** ./dev/Storages/CacheStorage.js ***!
  \**************************************/
/***/ function(module, exports, __webpack_require__) {

	/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Settings = __webpack_require__(/*! Storage:Settings */ 10)
		;

		/**
		 * @constructor
		 */
		function CacheStorage()
		{
			this.oFoldersCache = {};
			this.oFoldersNamesCache = {};
			this.oFolderHashCache = {};
			this.oFolderUidNextCache = {};
			this.oMessageListHashCache = {};
			this.oMessageFlagsCache = {};
			this.oNewMessage = {};
			this.oRequestedMessage = {};

			this.bCapaGravatar = Settings.capa(Enums.Capa.Gravatar);
		}

		/**
		 * @type {boolean}
		 */
		CacheStorage.prototype.bCapaGravatar = false;

		/**
		 * @type {Object}
		 */
		CacheStorage.prototype.oFoldersCache = {};

		/**
		 * @type {Object}
		 */
		CacheStorage.prototype.oFoldersNamesCache = {};

		/**
		 * @type {Object}
		 */
		CacheStorage.prototype.oFolderHashCache = {};

		/**
		 * @type {Object}
		 */
		CacheStorage.prototype.oFolderUidNextCache = {};

		/**
		 * @type {Object}
		 */
		CacheStorage.prototype.oMessageListHashCache = {};

		/**
		 * @type {Object}
		 */
		CacheStorage.prototype.oMessageFlagsCache = {};

		/**
		 * @type {Object}
		 */
		CacheStorage.prototype.oBodies = {};

		/**
		 * @type {Object}
		 */
		CacheStorage.prototype.oNewMessage = {};

		/**
		 * @type {Object}
		 */
		CacheStorage.prototype.oRequestedMessage = {};

		CacheStorage.prototype.clear = function ()
		{
			this.oFoldersCache = {};
			this.oFoldersNamesCache = {};
			this.oFolderHashCache = {};
			this.oFolderUidNextCache = {};
			this.oMessageListHashCache = {};
			this.oMessageFlagsCache = {};
			this.oBodies = {};
		};


		/**
		 * @param {string} sEmail
		 * @param {Function} fCallback
		 * @return {string}
		 */
		CacheStorage.prototype.getUserPic = function (sEmail, fCallback)
		{
			sEmail = Utils.trim(sEmail);
			fCallback(this.bCapaGravatar && '' !== sEmail ? LinkBuilder.avatarLink(sEmail) : '', sEmail);
		};

		/**
		 * @param {string} sFolderFullNameRaw
		 * @param {string} sUid
		 * @return {string}
		 */
		CacheStorage.prototype.getMessageKey = function (sFolderFullNameRaw, sUid)
		{
			return sFolderFullNameRaw + '#' + sUid;
		};

		/**
		 * @param {string} sFolder
		 * @param {string} sUid
		 */
		CacheStorage.prototype.addRequestedMessage = function (sFolder, sUid)
		{
			this.oRequestedMessage[this.getMessageKey(sFolder, sUid)] = true;
		};

		/**
		 * @param {string} sFolder
		 * @param {string} sUid
		 * @return {boolean}
		 */
		CacheStorage.prototype.hasRequestedMessage = function (sFolder, sUid)
		{
			return true === this.oRequestedMessage[this.getMessageKey(sFolder, sUid)];
		};

		/**
		 * @param {string} sFolderFullNameRaw
		 * @param {string} sUid
		 */
		CacheStorage.prototype.addNewMessageCache = function (sFolderFullNameRaw, sUid)
		{
			this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = true;
		};

		/**
		 * @param {string} sFolderFullNameRaw
		 * @param {string} sUid
		 */
		CacheStorage.prototype.hasNewMessageAndRemoveFromCache = function (sFolderFullNameRaw, sUid)
		{
			if (this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)])
			{
				this.oNewMessage[this.getMessageKey(sFolderFullNameRaw, sUid)] = null;
				return true;
			}

			return false;
		};

		CacheStorage.prototype.clearNewMessageCache = function ()
		{
			this.oNewMessage = {};
		};

		/**
		 * @param {string} sFolderHash
		 * @return {string}
		 */
		CacheStorage.prototype.getFolderFullNameRaw = function (sFolderHash)
		{
			return '' !== sFolderHash && this.oFoldersNamesCache[sFolderHash] ? this.oFoldersNamesCache[sFolderHash] : '';
		};

		/**
		 * @param {string} sFolderHash
		 * @param {string} sFolderFullNameRaw
		 */
		CacheStorage.prototype.setFolderFullNameRaw = function (sFolderHash, sFolderFullNameRaw)
		{
			this.oFoldersNamesCache[sFolderHash] = sFolderFullNameRaw;
		};

		/**
		 * @param {string} sFolderFullNameRaw
		 * @return {string}
		 */
		CacheStorage.prototype.getFolderHash = function (sFolderFullNameRaw)
		{
			return '' !== sFolderFullNameRaw && this.oFolderHashCache[sFolderFullNameRaw] ? this.oFolderHashCache[sFolderFullNameRaw] : '';
		};

		/**
		 * @param {string} sFolderFullNameRaw
		 * @param {string} sFolderHash
		 */
		CacheStorage.prototype.setFolderHash = function (sFolderFullNameRaw, sFolderHash)
		{
			this.oFolderHashCache[sFolderFullNameRaw] = sFolderHash;
		};

		/**
		 * @param {string} sFolderFullNameRaw
		 * @return {string}
		 */
		CacheStorage.prototype.getFolderUidNext = function (sFolderFullNameRaw)
		{
			return '' !== sFolderFullNameRaw && this.oFolderUidNextCache[sFolderFullNameRaw] ? this.oFolderUidNextCache[sFolderFullNameRaw] : '';
		};

		/**
		 * @param {string} sFolderFullNameRaw
		 * @param {string} sUidNext
		 */
		CacheStorage.prototype.setFolderUidNext = function (sFolderFullNameRaw, sUidNext)
		{
			this.oFolderUidNextCache[sFolderFullNameRaw] = sUidNext;
		};

		/**
		 * @param {string} sFolderFullNameRaw
		 * @return {?FolderModel}
		 */
		CacheStorage.prototype.getFolderFromCacheList = function (sFolderFullNameRaw)
		{
			return '' !== sFolderFullNameRaw && this.oFoldersCache[sFolderFullNameRaw] ? this.oFoldersCache[sFolderFullNameRaw] : null;
		};

		/**
		 * @param {string} sFolderFullNameRaw
		 * @param {?FolderModel} oFolder
		 */
		CacheStorage.prototype.setFolderToCacheList = function (sFolderFullNameRaw, oFolder)
		{
			this.oFoldersCache[sFolderFullNameRaw] = oFolder;
		};

		/**
		 * @param {string} sFolderFullNameRaw
		 */
		CacheStorage.prototype.removeFolderFromCacheList = function (sFolderFullNameRaw)
		{
			this.setFolderToCacheList(sFolderFullNameRaw, null);
		};

		/**
		 * @param {string} sFolderFullName
		 * @param {string} sUid
		 * @return {?Array}
		 */
		CacheStorage.prototype.getMessageFlagsFromCache = function (sFolderFullName, sUid)
		{
			return this.oMessageFlagsCache[sFolderFullName] && this.oMessageFlagsCache[sFolderFullName][sUid] ?
				this.oMessageFlagsCache[sFolderFullName][sUid] : null;
		};

		/**
		 * @param {string} sFolderFullName
		 * @param {string} sUid
		 * @param {Array} aFlagsCache
		 */
		CacheStorage.prototype.setMessageFlagsToCache = function (sFolderFullName, sUid, aFlagsCache)
		{
			if (!this.oMessageFlagsCache[sFolderFullName])
			{
				this.oMessageFlagsCache[sFolderFullName] = {};
			}

			this.oMessageFlagsCache[sFolderFullName][sUid] = aFlagsCache;
		};

		/**
		 * @param {string} sFolderFullName
		 */
		CacheStorage.prototype.clearMessageFlagsFromCacheByFolder = function (sFolderFullName)
		{
			this.oMessageFlagsCache[sFolderFullName] = {};
		};

		/**
		 * @param {(MessageModel|null)} oMessage
		 */
		CacheStorage.prototype.initMessageFlagsFromCache = function (oMessage)
		{
			if (oMessage)
			{
				var
					self = this,
					aFlags = this.getMessageFlagsFromCache(oMessage.folderFullNameRaw, oMessage.uid),
					mUnseenSubUid = null,
					mFlaggedSubUid = null
				;

				if (aFlags && 0 < aFlags.length)
				{
					oMessage.unseen(!!aFlags[0]);
					oMessage.flagged(!!aFlags[1]);
					oMessage.answered(!!aFlags[2]);
					oMessage.forwarded(!!aFlags[3]);
					oMessage.isReadReceipt(!!aFlags[4]);
				}

				if (0 < oMessage.threads().length)
				{
					mUnseenSubUid = _.find(oMessage.threads(), function (iSubUid) {
						var aFlags = self.getMessageFlagsFromCache(oMessage.folderFullNameRaw, iSubUid);
						return aFlags && 0 < aFlags.length && !!aFlags[0];
					});

					mFlaggedSubUid = _.find(oMessage.threads(), function (iSubUid) {
						var aFlags = self.getMessageFlagsFromCache(oMessage.folderFullNameRaw, iSubUid);
						return aFlags && 0 < aFlags.length && !!aFlags[1];
					});

					oMessage.hasUnseenSubMessage(mUnseenSubUid && 0 < Utils.pInt(mUnseenSubUid));
					oMessage.hasFlaggedSubMessage(mFlaggedSubUid && 0 < Utils.pInt(mFlaggedSubUid));
				}
			}
		};

		/**
		 * @param {(MessageModel|null)} oMessage
		 */
		CacheStorage.prototype.storeMessageFlagsToCache = function (oMessage)
		{
			if (oMessage)
			{
				this.setMessageFlagsToCache(
					oMessage.folderFullNameRaw,
					oMessage.uid,
					[oMessage.unseen(), oMessage.flagged(), oMessage.answered(), oMessage.forwarded(), oMessage.isReadReceipt()]
				);
			}
		};
		/**
		 * @param {string} sFolder
		 * @param {string} sUid
		 * @param {Array} aFlags
		 */
		CacheStorage.prototype.storeMessageFlagsToCacheByFolderAndUid = function (sFolder, sUid, aFlags)
		{
			if (Utils.isArray(aFlags) && 0 < aFlags.length)
			{
				this.setMessageFlagsToCache(sFolder, sUid, aFlags);
			}
		};

		module.exports = new CacheStorage();

	}());

/***/ },

/***/ 27:
/*!**************************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsFolderSystemViewModel.js ***!
  \**************************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsFolderSystemViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderSystem');

			Utils.initOnStartOrLangChange(function () {
				this.sChooseOnText = Utils.i18n('POPUPS_SYSTEM_FOLDERS/SELECT_CHOOSE_ONE');
				this.sUnuseText = Utils.i18n('POPUPS_SYSTEM_FOLDERS/SELECT_UNUSE_NAME');
			}, this);

			this.notification = ko.observable('');

			this.folderSelectList = ko.computed(function () {
				return Utils.folderListOptionsBuilder([], Data.folderList(), Data.folderListSystemNames(), [
					['', this.sChooseOnText],
					[Consts.Values.UnuseOptionValue, this.sUnuseText]
				]);
			}, this);

			var
				self = this,
				fSaveSystemFolders = null,
				fCallback = null
			;

			this.sentFolder = Data.sentFolder;
			this.draftFolder = Data.draftFolder;
			this.spamFolder = Data.spamFolder;
			this.trashFolder = Data.trashFolder;
			this.archiveFolder = Data.archiveFolder;

			fSaveSystemFolders = _.debounce(function () {

				Settings.settingsSet('SentFolder', self.sentFolder());
				Settings.settingsSet('DraftFolder', self.draftFolder());
				Settings.settingsSet('SpamFolder', self.spamFolder());
				Settings.settingsSet('TrashFolder', self.trashFolder());
				Settings.settingsSet('ArchiveFolder', self.archiveFolder());

				Remote.saveSystemFolders(Utils.emptyFunction, {
					'SentFolder': self.sentFolder(),
					'DraftFolder': self.draftFolder(),
					'SpamFolder': self.spamFolder(),
					'TrashFolder': self.trashFolder(),
					'ArchiveFolder': self.archiveFolder(),
					'NullFolder': 'NullFolder'
				});

			}, 1000);

			fCallback = function () {

				Settings.settingsSet('SentFolder', self.sentFolder());
				Settings.settingsSet('DraftFolder', self.draftFolder());
				Settings.settingsSet('SpamFolder', self.spamFolder());
				Settings.settingsSet('TrashFolder', self.trashFolder());
				Settings.settingsSet('ArchiveFolder', self.archiveFolder());

				fSaveSystemFolders();
			};

			this.sentFolder.subscribe(fCallback);
			this.draftFolder.subscribe(fCallback);
			this.spamFolder.subscribe(fCallback);
			this.trashFolder.subscribe(fCallback);
			this.archiveFolder.subscribe(fCallback);

			this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:FolderSystem', 'PopupsFolderSystemViewModel'], PopupsFolderSystemViewModel);
		_.extend(PopupsFolderSystemViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsFolderSystemViewModel.prototype.sChooseOnText = '';
		PopupsFolderSystemViewModel.prototype.sUnuseText = '';

		/**
		 * @param {number=} iNotificationType = Enums.SetSystemFoldersNotification.None
		 */
		PopupsFolderSystemViewModel.prototype.onShow = function (iNotificationType)
		{
			var sNotification = '';

			iNotificationType = Utils.isUnd(iNotificationType) ? Enums.SetSystemFoldersNotification.None : iNotificationType;

			switch (iNotificationType)
			{
				case Enums.SetSystemFoldersNotification.Sent:
					sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SENT');
					break;
				case Enums.SetSystemFoldersNotification.Draft:
					sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_DRAFTS');
					break;
				case Enums.SetSystemFoldersNotification.Spam:
					sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SPAM');
					break;
				case Enums.SetSystemFoldersNotification.Trash:
					sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_TRASH');
					break;
				case Enums.SetSystemFoldersNotification.Archive:
					sNotification = Utils.i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_ARCHIVE');
					break;
			}

			this.notification(sNotification);
		};

		module.exports = PopupsFolderSystemViewModel;

	}());

/***/ },

/***/ 30:
/*!**************************************!*\
  !*** ./dev/Storages/LocalStorage.js ***!
  \**************************************/
/***/ function(module, exports, __webpack_require__) {

	/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

	(function () {

		'use strict';

		/**
		 * @constructor
		 */
		function LocalStorage()
		{
			var
				NextStorageDriver = __webpack_require__(/*! _ */ 2).find([
					__webpack_require__(/*! Storage:LocalStorage:LocalStorage */ 91),
					__webpack_require__(/*! Storage:LocalStorage:Cookie */ 90)
				], function (NextStorageDriver) {
					return NextStorageDriver && NextStorageDriver.supported();
				})
			;

			this.oDriver = null;

			if (NextStorageDriver)
			{
				this.oDriver = new NextStorageDriver();
			}
		}

		/**
		 * @type {LocalStorageDriver|CookieDriver|null}
		 */
		LocalStorage.prototype.oDriver = null;

		/**
		 * @param {number} iKey
		 * @param {*} mData
		 * @return {boolean}
		 */
		LocalStorage.prototype.set = function (iKey, mData)
		{
			return this.oDriver ? this.oDriver.set('p' + iKey, mData) : false;
		};

		/**
		 * @param {number} iKey
		 * @return {*}
		 */
		LocalStorage.prototype.get = function (iKey)
		{
			return this.oDriver ? this.oDriver.get('p' + iKey) : null;
		};

		module.exports = new LocalStorage();

	}());

/***/ },

/***/ 33:
/*!***********************!*\
  !*** external "JSON" ***!
  \***********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = JSON;

/***/ },

/***/ 38:
/*!************************************!*\
  !*** ./dev/Models/MessageModel.js ***!
  \************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),
			moment = __webpack_require__(/*! moment */ 25),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			EmailModel = __webpack_require__(/*! Model:Email */ 23),
			AttachmentModel = __webpack_require__(/*! Model:Attachment */ 52)
		;

		/**
		* @constructor
		*/
		function MessageModel()
		{
			this.folderFullNameRaw = '';
			this.uid = '';
			this.hash = '';
			this.requestHash = '';
			this.subject = ko.observable('');
			this.subjectPrefix = ko.observable('');
			this.subjectSuffix = ko.observable('');
			this.size = ko.observable(0);
			this.dateTimeStampInUTC = ko.observable(0);
			this.priority = ko.observable(Enums.MessagePriority.Normal);

			this.proxy = false;

			this.fromEmailString = ko.observable('');
			this.fromClearEmailString = ko.observable('');
			this.toEmailsString = ko.observable('');
			this.toClearEmailsString = ko.observable('');

			this.senderEmailsString = ko.observable('');
			this.senderClearEmailsString = ko.observable('');

			this.emails = [];

			this.from = [];
			this.to = [];
			this.cc = [];
			this.bcc = [];
			this.replyTo = [];
			this.deliveredTo = [];

			this.newForAnimation = ko.observable(false);

			this.deleted = ko.observable(false);
			this.unseen = ko.observable(false);
			this.flagged = ko.observable(false);
			this.answered = ko.observable(false);
			this.forwarded = ko.observable(false);
			this.isReadReceipt = ko.observable(false);

			this.focused = ko.observable(false);
			this.selected = ko.observable(false);
			this.checked = ko.observable(false);
			this.hasAttachments = ko.observable(false);
			this.attachmentsMainType = ko.observable('');
			
			this.moment = ko.observable(moment(moment.unix(0)));
			
			this.attachmentIconClass = ko.computed(function () {
				var sClass = '';
				if (this.hasAttachments())
				{
					sClass = 'icon-attachment';
					switch (this.attachmentsMainType())
					{
						case 'image':
							sClass = 'icon-image';
							break;
						case 'archive':
							sClass = 'icon-file-zip';
							break;
						case 'doc':
							sClass = 'icon-file-text';
							break;
		 //				case 'pdf':
		 //					sClass = 'icon-file-pdf';
		 //					break;
					}
				}
				return sClass;
			}, this);

			this.fullFormatDateValue = ko.computed(function () {
				return MessageModel.calculateFullFromatDateValue(this.dateTimeStampInUTC());
			}, this);

			this.momentDate = Utils.createMomentDate(this);
			this.momentShortDate = Utils.createMomentShortDate(this);

			this.dateTimeStampInUTC.subscribe(function (iValue) {
				var iNow = moment().unix();
				this.moment(moment.unix(iNow < iValue ? iNow : iValue));
			}, this);

			this.body = null;
			this.plainRaw = '';
			this.isHtml = ko.observable(false);
			this.hasImages = ko.observable(false);
			this.attachments = ko.observableArray([]);

			this.isPgpSigned = ko.observable(false);
			this.isPgpEncrypted = ko.observable(false);
			this.pgpSignedVerifyStatus = ko.observable(Enums.SignedVerifyStatus.None);
			this.pgpSignedVerifyUser = ko.observable('');

			this.priority = ko.observable(Enums.MessagePriority.Normal);
			this.readReceipt = ko.observable('');

			this.aDraftInfo = [];
			this.sMessageId = '';
			this.sInReplyTo = '';
			this.sReferences = '';

			this.parentUid = ko.observable(0);
			this.threads = ko.observableArray([]);
			this.threadsLen = ko.observable(0);
			this.hasUnseenSubMessage = ko.observable(false);
			this.hasFlaggedSubMessage = ko.observable(false);

			this.lastInCollapsedThread = ko.observable(false);
			this.lastInCollapsedThreadLoading = ko.observable(false);

			this.threadsLenResult = ko.computed(function () {
				var iCount = this.threadsLen();
				return 0 === this.parentUid() && 0 < iCount ? iCount + 1 : '';
			}, this);
		}

		/**
		* @static
		* @param {AjaxJsonMessage} oJsonMessage
		* @return {?MessageModel}
		*/
		MessageModel.newInstanceFromJson = function (oJsonMessage)
		{
			var oMessageModel = new MessageModel();
			return oMessageModel.initByJson(oJsonMessage) ? oMessageModel : null;
		};

		/**
		* @static
		* @param {number} iTimeStampInUTC
		* @return {string}
		*/
		MessageModel.calculateFullFromatDateValue = function (iTimeStampInUTC)
		{
			return 0 < iTimeStampInUTC ? moment.unix(iTimeStampInUTC).format('LLL') : '';
		};

		/**
		* @static
		* @param {Array} aEmail
		* @param {boolean=} bFriendlyView
		* @param {boolean=} bWrapWithLink = false
		* @return {string}
		*/
		MessageModel.emailsToLine = function (aEmail, bFriendlyView, bWrapWithLink)
		{
			var
				aResult = [],
				iIndex = 0,
				iLen = 0
			;

			if (Utils.isNonEmptyArray(aEmail))
			{
				for (iIndex = 0, iLen = aEmail.length; iIndex < iLen; iIndex++)
				{
					aResult.push(aEmail[iIndex].toLine(bFriendlyView, bWrapWithLink));
				}
			}

			return aResult.join(', ');
		};

		/**
		* @static
		* @param {Array} aEmail
		* @return {string}
		*/
		MessageModel.emailsToLineClear = function (aEmail)
		{
			var
				aResult = [],
				iIndex = 0,
				iLen = 0
			;

			if (Utils.isNonEmptyArray(aEmail))
			{
				for (iIndex = 0, iLen = aEmail.length; iIndex < iLen; iIndex++)
				{
					if (aEmail[iIndex] && aEmail[iIndex].email && '' !== aEmail[iIndex].name)
					{
						aResult.push(aEmail[iIndex].email);
					}
				}
			}

			return aResult.join(', ');
		};

		/**
		* @static
		* @param {?Array} aJsonEmails
		* @return {Array.<EmailModel>}
		*/
		MessageModel.initEmailsFromJson = function (aJsonEmails)
		{
			var
				iIndex = 0,
				iLen = 0,
				oEmailModel = null,
				aResult = []
			;

			if (Utils.isNonEmptyArray(aJsonEmails))
			{
				for (iIndex = 0, iLen = aJsonEmails.length; iIndex < iLen; iIndex++)
				{
					oEmailModel = EmailModel.newInstanceFromJson(aJsonEmails[iIndex]);
					if (oEmailModel)
					{
						aResult.push(oEmailModel);
					}
				}
			}

			return aResult;
		};

		/**
		* @static
		* @param {Array.<EmailModel>} aMessageEmails
		* @param {Object} oLocalUnic
		* @param {Array} aLocalEmails
		*/
		MessageModel.replyHelper = function (aMessageEmails, oLocalUnic, aLocalEmails)
		{
		   if (aMessageEmails && 0 < aMessageEmails.length)
		   {
			   var
				   iIndex = 0,
				   iLen = aMessageEmails.length
			   ;

			   for (; iIndex < iLen; iIndex++)
			   {
				   if (Utils.isUnd(oLocalUnic[aMessageEmails[iIndex].email]))
				   {
					   oLocalUnic[aMessageEmails[iIndex].email] = true;
					   aLocalEmails.push(aMessageEmails[iIndex]);
				   }
			   }
		   }
		};

		MessageModel.prototype.clear = function ()
		{
		   this.folderFullNameRaw = '';
		   this.uid = '';
		   this.hash = '';
		   this.requestHash = '';
		   this.subject('');
		   this.subjectPrefix('');
		   this.subjectSuffix('');
		   this.size(0);
		   this.dateTimeStampInUTC(0);
		   this.priority(Enums.MessagePriority.Normal);

		   this.proxy = false;

		   this.fromEmailString('');
		   this.fromClearEmailString('');
		   this.toEmailsString('');
		   this.toClearEmailsString('');
		   this.senderEmailsString('');
		   this.senderClearEmailsString('');

		   this.emails = [];

		   this.from = [];
		   this.to = [];
		   this.cc = [];
		   this.bcc = [];
		   this.replyTo = [];
		   this.deliveredTo = [];

		   this.newForAnimation(false);

		   this.deleted(false);
		   this.unseen(false);
		   this.flagged(false);
		   this.answered(false);
		   this.forwarded(false);
		   this.isReadReceipt(false);

		   this.selected(false);
		   this.checked(false);
		   this.hasAttachments(false);
		   this.attachmentsMainType('');

		   this.body = null;
		   this.isHtml(false);
		   this.hasImages(false);
		   this.attachments([]);

		   this.isPgpSigned(false);
		   this.isPgpEncrypted(false);
		   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.None);
		   this.pgpSignedVerifyUser('');

		   this.priority(Enums.MessagePriority.Normal);
		   this.readReceipt('');
		   this.aDraftInfo = [];
		   this.sMessageId = '';
		   this.sInReplyTo = '';
		   this.sReferences = '';

		   this.parentUid(0);
		   this.threads([]);
		   this.threadsLen(0);
		   this.hasUnseenSubMessage(false);
		   this.hasFlaggedSubMessage(false);

		   this.lastInCollapsedThread(false);
		   this.lastInCollapsedThreadLoading(false);
		};

		/**
		 * @return {string}
		 */
		MessageModel.prototype.friendlySize = function ()
		{
			return Utils.friendlySize(this.size());
		};

		MessageModel.prototype.computeSenderEmail = function ()
		{
			var
				Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
				sSent = Data.sentFolder(),
				sDraft = Data.draftFolder()
			;

			this.senderEmailsString(this.folderFullNameRaw === sSent || this.folderFullNameRaw === sDraft ?
				this.toEmailsString() : this.fromEmailString());

			this.senderClearEmailsString(this.folderFullNameRaw === sSent || this.folderFullNameRaw === sDraft ?
				this.toClearEmailsString() : this.fromClearEmailString());
		};

		/**
		* @param {AjaxJsonMessage} oJsonMessage
		* @return {boolean}
		*/
		MessageModel.prototype.initByJson = function (oJsonMessage)
		{
		   var bResult = false;
		   if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
		   {
			   this.folderFullNameRaw = oJsonMessage.Folder;
			   this.uid = oJsonMessage.Uid;
			   this.hash = oJsonMessage.Hash;
			   this.requestHash = oJsonMessage.RequestHash;

			   this.proxy = !!oJsonMessage.ExternalProxy;

			   this.size(Utils.pInt(oJsonMessage.Size));

			   this.from = MessageModel.initEmailsFromJson(oJsonMessage.From);
			   this.to = MessageModel.initEmailsFromJson(oJsonMessage.To);
			   this.cc = MessageModel.initEmailsFromJson(oJsonMessage.Cc);
			   this.bcc = MessageModel.initEmailsFromJson(oJsonMessage.Bcc);
			   this.replyTo = MessageModel.initEmailsFromJson(oJsonMessage.ReplyTo);
			   this.deliveredTo = MessageModel.initEmailsFromJson(oJsonMessage.DeliveredTo);

			   this.subject(oJsonMessage.Subject);
			   if (Utils.isArray(oJsonMessage.SubjectParts))
			   {
				   this.subjectPrefix(oJsonMessage.SubjectParts[0]);
				   this.subjectSuffix(oJsonMessage.SubjectParts[1]);
			   }
			   else
			   {
				   this.subjectPrefix('');
				   this.subjectSuffix(this.subject());
			   }

			   this.dateTimeStampInUTC(Utils.pInt(oJsonMessage.DateTimeStampInUTC));
			   this.hasAttachments(!!oJsonMessage.HasAttachments);
			   this.attachmentsMainType(oJsonMessage.AttachmentsMainType);

			   this.fromEmailString(MessageModel.emailsToLine(this.from, true));
			   this.fromClearEmailString(MessageModel.emailsToLineClear(this.from));
			   this.toEmailsString(MessageModel.emailsToLine(this.to, true));
			   this.toClearEmailsString(MessageModel.emailsToLineClear(this.to));

			   this.parentUid(Utils.pInt(oJsonMessage.ParentThread));
			   this.threads(Utils.isArray(oJsonMessage.Threads) ? oJsonMessage.Threads : []);
			   this.threadsLen(Utils.pInt(oJsonMessage.ThreadsLen));

			   this.initFlagsByJson(oJsonMessage);
			   this.computeSenderEmail();

			   bResult = true;
		   }

		   return bResult;
		};

		/**
		* @param {AjaxJsonMessage} oJsonMessage
		* @return {boolean}
		*/
		MessageModel.prototype.initUpdateByMessageJson = function (oJsonMessage)
		{
		   var
			   Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			   bResult = false,
			   iPriority = Enums.MessagePriority.Normal
		   ;

		   if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
		   {
			   iPriority = Utils.pInt(oJsonMessage.Priority);
			   this.priority(-1 < Utils.inArray(iPriority, [Enums.MessagePriority.High, Enums.MessagePriority.Low]) ?
				   iPriority : Enums.MessagePriority.Normal);

			   this.aDraftInfo = oJsonMessage.DraftInfo;

			   this.sMessageId = oJsonMessage.MessageId;
			   this.sInReplyTo = oJsonMessage.InReplyTo;
			   this.sReferences = oJsonMessage.References;

			   this.proxy = !!oJsonMessage.ExternalProxy;

			   if (Data.capaOpenPGP())
			   {
				   this.isPgpSigned(!!oJsonMessage.PgpSigned);
				   this.isPgpEncrypted(!!oJsonMessage.PgpEncrypted);
			   }

			   this.hasAttachments(!!oJsonMessage.HasAttachments);
			   this.attachmentsMainType(oJsonMessage.AttachmentsMainType);

			   this.foundedCIDs = Utils.isArray(oJsonMessage.FoundedCIDs) ? oJsonMessage.FoundedCIDs : [];
			   this.attachments(this.initAttachmentsFromJson(oJsonMessage.Attachments));

			   this.readReceipt(oJsonMessage.ReadReceipt || '');

			   this.computeSenderEmail();

			   bResult = true;
		   }

		   return bResult;
		};

		/**
		* @param {(AjaxJsonAttachment|null)} oJsonAttachments
		* @return {Array}
		*/
		MessageModel.prototype.initAttachmentsFromJson = function (oJsonAttachments)
		{
		   var
			   iIndex = 0,
			   iLen = 0,
			   oAttachmentModel = null,
			   aResult = []
		   ;

		   if (oJsonAttachments && 'Collection/AttachmentCollection' === oJsonAttachments['@Object'] &&
			   Utils.isNonEmptyArray(oJsonAttachments['@Collection']))
		   {
			   for (iIndex = 0, iLen = oJsonAttachments['@Collection'].length; iIndex < iLen; iIndex++)
			   {
				   oAttachmentModel = AttachmentModel.newInstanceFromJson(oJsonAttachments['@Collection'][iIndex]);
				   if (oAttachmentModel)
				   {
					   if ('' !== oAttachmentModel.cidWithOutTags && 0 < this.foundedCIDs.length &&
						   0 <= Utils.inArray(oAttachmentModel.cidWithOutTags, this.foundedCIDs))
					   {
						   oAttachmentModel.isLinked = true;
					   }

					   aResult.push(oAttachmentModel);
				   }
			   }
		   }

		   return aResult;
		};

		/**
		* @param {AjaxJsonMessage} oJsonMessage
		* @return {boolean}
		*/
		MessageModel.prototype.initFlagsByJson = function (oJsonMessage)
		{
		   var bResult = false;

		   if (oJsonMessage && 'Object/Message' === oJsonMessage['@Object'])
		   {
			   this.unseen(!oJsonMessage.IsSeen);
			   this.flagged(!!oJsonMessage.IsFlagged);
			   this.answered(!!oJsonMessage.IsAnswered);
			   this.forwarded(!!oJsonMessage.IsForwarded);
			   this.isReadReceipt(!!oJsonMessage.IsReadReceipt);

			   bResult = true;
		   }

		   return bResult;
		};

		/**
		* @param {boolean} bFriendlyView
		* @param {boolean=} bWrapWithLink = false
		* @return {string}
		*/
		MessageModel.prototype.fromToLine = function (bFriendlyView, bWrapWithLink)
		{
		   return MessageModel.emailsToLine(this.from, bFriendlyView, bWrapWithLink);
		};

		/**
		* @param {boolean} bFriendlyView
		* @param {boolean=} bWrapWithLink = false
		* @return {string}
		*/
		MessageModel.prototype.toToLine = function (bFriendlyView, bWrapWithLink)
		{
		   return MessageModel.emailsToLine(this.to, bFriendlyView, bWrapWithLink);
		};

		/**
		* @param {boolean} bFriendlyView
		* @param {boolean=} bWrapWithLink = false
		* @return {string}
		*/
		MessageModel.prototype.ccToLine = function (bFriendlyView, bWrapWithLink)
		{
		   return MessageModel.emailsToLine(this.cc, bFriendlyView, bWrapWithLink);
		};

		/**
		* @param {boolean} bFriendlyView
		* @param {boolean=} bWrapWithLink = false
		* @return {string}
		*/
		MessageModel.prototype.bccToLine = function (bFriendlyView, bWrapWithLink)
		{
		   return MessageModel.emailsToLine(this.bcc, bFriendlyView, bWrapWithLink);
		};

		/**
		* @return string
		*/
		MessageModel.prototype.lineAsCcc = function ()
		{
		   var aResult = [];
		   if (this.deleted())
		   {
			   aResult.push('deleted');
		   }
		   if (this.selected())
		   {
			   aResult.push('selected');
		   }
		   if (this.checked())
		   {
			   aResult.push('checked');
		   }
		   if (this.flagged())
		   {
			   aResult.push('flagged');
		   }
		   if (this.unseen())
		   {
			   aResult.push('unseen');
		   }
		   if (this.answered())
		   {
			   aResult.push('answered');
		   }
		   if (this.forwarded())
		   {
			   aResult.push('forwarded');
		   }
		   if (this.focused())
		   {
			   aResult.push('focused');
		   }
		   if (this.hasAttachments())
		   {
			   aResult.push('withAttachments');
			   switch (this.attachmentsMainType())
			   {
				   case 'image':
					   aResult.push('imageOnlyAttachments');
					   break;
				   case 'archive':
					   aResult.push('archiveOnlyAttachments');
					   break;
			   }
		   }
		   if (this.newForAnimation())
		   {
			   aResult.push('new');
		   }
		   if ('' === this.subject())
		   {
			   aResult.push('emptySubject');
		   }
		   if (0 < this.parentUid())
		   {
			   aResult.push('hasParentMessage');
		   }
		   if (0 < this.threadsLen() && 0 === this.parentUid())
		   {
			   aResult.push('hasChildrenMessage');
		   }
		   if (this.hasUnseenSubMessage())
		   {
			   aResult.push('hasUnseenSubMessage');
		   }
		   if (this.hasFlaggedSubMessage())
		   {
			   aResult.push('hasFlaggedSubMessage');
		   }

		   return aResult.join(' ');
		};

		/**
		* @return {boolean}
		*/
		MessageModel.prototype.hasVisibleAttachments = function ()
		{
		   return !!_.find(this.attachments(), function (oAttachment) {
			   return !oAttachment.isLinked;
		   });
		};

		/**
		* @param {string} sCid
		* @return {*}
		*/
		MessageModel.prototype.findAttachmentByCid = function (sCid)
		{
		   var
			   oResult = null,
			   aAttachments = this.attachments()
		   ;

		   if (Utils.isNonEmptyArray(aAttachments))
		   {
			   sCid = sCid.replace(/^<+/, '').replace(/>+$/, '');
			   oResult = _.find(aAttachments, function (oAttachment) {
				   return sCid === oAttachment.cidWithOutTags;
			   });
		   }

		   return oResult || null;
		};

		/**
		* @param {string} sContentLocation
		* @return {*}
		*/
		MessageModel.prototype.findAttachmentByContentLocation = function (sContentLocation)
		{
		   var
			   oResult = null,
			   aAttachments = this.attachments()
		   ;

		   if (Utils.isNonEmptyArray(aAttachments))
		   {
			   oResult = _.find(aAttachments, function (oAttachment) {
				   return sContentLocation === oAttachment.contentLocation;
			   });
		   }

		   return oResult || null;
		};


		/**
		* @return {string}
		*/
		MessageModel.prototype.messageId = function ()
		{
		   return this.sMessageId;
		};

		/**
		* @return {string}
		*/
		MessageModel.prototype.inReplyTo = function ()
		{
		   return this.sInReplyTo;
		};

		/**
		* @return {string}
		*/
		MessageModel.prototype.references = function ()
		{
		   return this.sReferences;
		};

		/**
		* @return {string}
		*/
		MessageModel.prototype.fromAsSingleEmail = function ()
		{
		   return Utils.isArray(this.from) && this.from[0] ? this.from[0].email : '';
		};

		/**
		* @return {string}
		*/
		MessageModel.prototype.viewLink = function ()
		{
		   return LinkBuilder.messageViewLink(this.requestHash);
		};

		/**
		* @return {string}
		*/
		MessageModel.prototype.downloadLink = function ()
		{
		   return LinkBuilder.messageDownloadLink(this.requestHash);
		};

		/**
		* @param {Object} oExcludeEmails
		* @return {Array}
		*/
		MessageModel.prototype.replyEmails = function (oExcludeEmails)
		{
		   var
			   aResult = [],
			   oUnic = Utils.isUnd(oExcludeEmails) ? {} : oExcludeEmails
		   ;

		   MessageModel.replyHelper(this.replyTo, oUnic, aResult);
		   if (0 === aResult.length)
		   {
			   MessageModel.replyHelper(this.from, oUnic, aResult);
		   }

		   return aResult;
		};

		/**
		* @param {Object} oExcludeEmails
		* @return {Array.<Array>}
		*/
		MessageModel.prototype.replyAllEmails = function (oExcludeEmails)
		{
		   var
			   aToResult = [],
			   aCcResult = [],
			   oUnic = Utils.isUnd(oExcludeEmails) ? {} : oExcludeEmails
		   ;

		   MessageModel.replyHelper(this.replyTo, oUnic, aToResult);
		   if (0 === aToResult.length)
		   {
			   MessageModel.replyHelper(this.from, oUnic, aToResult);
		   }

		   MessageModel.replyHelper(this.to, oUnic, aToResult);
		   MessageModel.replyHelper(this.cc, oUnic, aCcResult);

		   return [aToResult, aCcResult];
		};

		/**
		* @return {string}
		*/
		MessageModel.prototype.textBodyToString = function ()
		{
		   return this.body ? this.body.html() : '';
		};

		/**
		* @return {string}
		*/
		MessageModel.prototype.attachmentsToStringLine = function ()
		{
		   var aAttachLines = _.map(this.attachments(), function (oItem) {
			   return oItem.fileName + ' (' + oItem.friendlySize + ')';
		   });

		   return aAttachLines && 0 < aAttachLines.length ? aAttachLines.join(', ') : '';
		};

		/**
		* @return {Object}
		*/
		MessageModel.prototype.getDataForWindowPopup = function ()
		{
		   return {
			   'popupFrom': this.fromToLine(false),
			   'popupTo': this.toToLine(false),
			   'popupCc': this.ccToLine(false),
			   'popupBcc': this.bccToLine(false),
			   'popupSubject': this.subject(),
			   'popupIsHtml': this.isHtml(),
			   'popupDate': this.fullFormatDateValue(),
			   'popupAttachments': this.attachmentsToStringLine(),
			   'popupBody': this.textBodyToString()
		   };
		};

		/**
		* @param {boolean=} bPrint = false
		*/
		MessageModel.prototype.viewPopupMessage = function (bPrint)
		{
		   Utils.windowPopupKnockout(this.getDataForWindowPopup(), 'PopupsWindowSimpleMessage', this.subject(), function (oPopupWin) {
			   if (oPopupWin && oPopupWin.document && oPopupWin.document.body)
			   {
				   $('img.lazy', oPopupWin.document.body).each(function (iIndex, oImg) {

					   var
						   $oImg = $(oImg),
						   sOrig = $oImg.data('original'),
						   sSrc = $oImg.attr('src')
					   ;

					   if (0 <= iIndex && sOrig && !sSrc)
					   {
						   $oImg.attr('src', sOrig);
					   }
				   });

				   if (bPrint)
				   {
					   window.setTimeout(function () {
						   oPopupWin.print();
					   }, 100);
				   }
			   }
		   });
		};

		MessageModel.prototype.printMessage = function ()
		{
		   this.viewPopupMessage(true);
		};

		/**
		* @returns {string}
		*/
		MessageModel.prototype.generateUid = function ()
		{
		   return this.folderFullNameRaw + '/' + this.uid;
		};

		/**
		* @param {MessageModel} oMessage
		* @return {MessageModel}
		*/
		MessageModel.prototype.populateByMessageListItem = function (oMessage)
		{
		   this.folderFullNameRaw = oMessage.folderFullNameRaw;
		   this.uid = oMessage.uid;
		   this.hash = oMessage.hash;
		   this.requestHash = oMessage.requestHash;
		   this.subject(oMessage.subject());
		   this.subjectPrefix(this.subjectPrefix());
		   this.subjectSuffix(this.subjectSuffix());

		   this.size(oMessage.size());
		   this.dateTimeStampInUTC(oMessage.dateTimeStampInUTC());
		   this.priority(oMessage.priority());

		   this.proxy = oMessage.proxy;

		   this.fromEmailString(oMessage.fromEmailString());
		   this.fromClearEmailString(oMessage.fromClearEmailString());
		   this.toEmailsString(oMessage.toEmailsString());
		   this.toClearEmailsString(oMessage.toClearEmailsString());

		   this.emails = oMessage.emails;

		   this.from = oMessage.from;
		   this.to = oMessage.to;
		   this.cc = oMessage.cc;
		   this.bcc = oMessage.bcc;
		   this.replyTo = oMessage.replyTo;
		   this.deliveredTo = oMessage.deliveredTo;

		   this.unseen(oMessage.unseen());
		   this.flagged(oMessage.flagged());
		   this.answered(oMessage.answered());
		   this.forwarded(oMessage.forwarded());
		   this.isReadReceipt(oMessage.isReadReceipt());

		   this.selected(oMessage.selected());
		   this.checked(oMessage.checked());
		   this.hasAttachments(oMessage.hasAttachments());
		   this.attachmentsMainType(oMessage.attachmentsMainType());

		   this.moment(oMessage.moment());

		   this.body = null;

		   this.priority(Enums.MessagePriority.Normal);
		   this.aDraftInfo = [];
		   this.sMessageId = '';
		   this.sInReplyTo = '';
		   this.sReferences = '';

		   this.parentUid(oMessage.parentUid());
		   this.threads(oMessage.threads());
		   this.threadsLen(oMessage.threadsLen());

		   this.computeSenderEmail();

		   return this;
		};

		MessageModel.prototype.showExternalImages = function (bLazy)
		{
		   if (this.body && this.body.data('rl-has-images'))
		   {
			   var sAttr = '';
			   bLazy = Utils.isUnd(bLazy) ? false : bLazy;

			   this.hasImages(false);
			   this.body.data('rl-has-images', false);

			   sAttr = this.proxy ? 'data-x-additional-src' : 'data-x-src';
			   $('[' + sAttr + ']', this.body).each(function () {
				   if (bLazy && $(this).is('img'))
				   {
					   $(this)
						   .addClass('lazy')
						   .attr('data-original', $(this).attr(sAttr))
						   .removeAttr(sAttr)
					   ;
				   }
				   else
				   {
					   $(this).attr('src', $(this).attr(sAttr)).removeAttr(sAttr);
				   }
			   });

			   sAttr = this.proxy ? 'data-x-additional-style-url' : 'data-x-style-url';
			   $('[' + sAttr + ']', this.body).each(function () {
				   var sStyle = Utils.trim($(this).attr('style'));
				   sStyle = '' === sStyle ? '' : (';' === sStyle.substr(-1) ? sStyle + ' ' : sStyle + '; ');
				   $(this).attr('style', sStyle + $(this).attr(sAttr)).removeAttr(sAttr);
			   });

			   if (bLazy)
			   {
				   $('img.lazy', this.body).addClass('lazy-inited').lazyload({
					   'threshold' : 400,
					   'effect' : 'fadeIn',
					   'skip_invisible' : false,
					   'container': $('.RL-MailMessageView .messageView .messageItem .content')[0]
				   });

				   Globals.$win.resize();
			   }

			   Utils.windowResize(500);
		   }
		};

		MessageModel.prototype.showInternalImages = function (bLazy)
		{
		   if (this.body && !this.body.data('rl-init-internal-images'))
		   {
			   this.body.data('rl-init-internal-images', true);

			   bLazy = Utils.isUnd(bLazy) ? false : bLazy;

			   var self = this;

			   $('[data-x-src-cid]', this.body).each(function () {

				   var oAttachment = self.findAttachmentByCid($(this).attr('data-x-src-cid'));
				   if (oAttachment && oAttachment.download)
				   {
					   if (bLazy && $(this).is('img'))
					   {
						   $(this)
							   .addClass('lazy')
							   .attr('data-original', oAttachment.linkPreview());
					   }
					   else
					   {
						   $(this).attr('src', oAttachment.linkPreview());
					   }
				   }
			   });

			   $('[data-x-src-location]', this.body).each(function () {

				   var oAttachment = self.findAttachmentByContentLocation($(this).attr('data-x-src-location'));
				   if (!oAttachment)
				   {
					   oAttachment = self.findAttachmentByCid($(this).attr('data-x-src-location'));
				   }

				   if (oAttachment && oAttachment.download)
				   {
					   if (bLazy && $(this).is('img'))
					   {
						   $(this)
							   .addClass('lazy')
							   .attr('data-original', oAttachment.linkPreview());
					   }
					   else
					   {
						   $(this).attr('src', oAttachment.linkPreview());
					   }
				   }
			   });

			   $('[data-x-style-cid]', this.body).each(function () {

				   var
					   sStyle = '',
					   sName = '',
					   oAttachment = self.findAttachmentByCid($(this).attr('data-x-style-cid'))
				   ;

				   if (oAttachment && oAttachment.linkPreview)
				   {
					   sName = $(this).attr('data-x-style-cid-name');
					   if ('' !== sName)
					   {
						   sStyle = Utils.trim($(this).attr('style'));
						   sStyle = '' === sStyle ? '' : (';' === sStyle.substr(-1) ? sStyle + ' ' : sStyle + '; ');
						   $(this).attr('style', sStyle + sName + ': url(\'' + oAttachment.linkPreview() + '\')');
					   }
				   }
			   });

			   if (bLazy)
			   {
				   (function ($oImg, oContainer) {
					   _.delay(function () {
						   $oImg.addClass('lazy-inited').lazyload({
							   'threshold' : 400,
							   'effect' : 'fadeIn',
							   'skip_invisible' : false,
							   'container': oContainer
						   });
					   }, 300);
				   }($('img.lazy', self.body), $('.RL-MailMessageView .messageView .messageItem .content')[0]));
			   }

			   Utils.windowResize(500);
		   }
		};

		MessageModel.prototype.storeDataToDom = function ()
		{
		   if (this.body)
		   {
			   this.body.data('rl-is-html', !!this.isHtml());
			   this.body.data('rl-has-images', !!this.hasImages());

			   this.body.data('rl-plain-raw', this.plainRaw);

			   var Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8);
			   if (Data.capaOpenPGP())
			   {
				   this.body.data('rl-plain-pgp-signed', !!this.isPgpSigned());
				   this.body.data('rl-plain-pgp-encrypted', !!this.isPgpEncrypted());
				   this.body.data('rl-pgp-verify-status', this.pgpSignedVerifyStatus());
				   this.body.data('rl-pgp-verify-user', this.pgpSignedVerifyUser());
			   }
		   }
		};

		MessageModel.prototype.storePgpVerifyDataToDom = function ()
		{
			var Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8);
			if (this.body && Data.capaOpenPGP())
			{
				this.body.data('rl-pgp-verify-status', this.pgpSignedVerifyStatus());
				this.body.data('rl-pgp-verify-user', this.pgpSignedVerifyUser());
			}
		};

		MessageModel.prototype.fetchDataToDom = function ()
		{
			if (this.body)
			{
				this.isHtml(!!this.body.data('rl-is-html'));
				this.hasImages(!!this.body.data('rl-has-images'));

				this.plainRaw = Utils.pString(this.body.data('rl-plain-raw'));

				var Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8);
				if (Data.capaOpenPGP())
				{
					this.isPgpSigned(!!this.body.data('rl-plain-pgp-signed'));
					this.isPgpEncrypted(!!this.body.data('rl-plain-pgp-encrypted'));
					this.pgpSignedVerifyStatus(this.body.data('rl-pgp-verify-status'));
					this.pgpSignedVerifyUser(this.body.data('rl-pgp-verify-user'));
				}
				else
				{
					this.isPgpSigned(false);
					this.isPgpEncrypted(false);
					this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.None);
					this.pgpSignedVerifyUser('');
				}
			}
		};

		MessageModel.prototype.verifyPgpSignedClearMessage = function ()
		{
		   if (this.isPgpSigned())
		   {
			   var
				   aRes = [],
				   mPgpMessage = null,
				   Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
				   sFrom = this.from && this.from[0] && this.from[0].email ? this.from[0].email : '',
				   aPublicKeys = Data.findPublicKeysByEmail(sFrom),
				   oValidKey = null,
				   oValidSysKey = null,
				   sPlain = ''
			   ;

			   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Error);
			   this.pgpSignedVerifyUser('');

			   try
			   {
				   mPgpMessage = window.openpgp.cleartext.readArmored(this.plainRaw);
				   if (mPgpMessage && mPgpMessage.getText)
				   {
					   this.pgpSignedVerifyStatus(
						   aPublicKeys.length ? Enums.SignedVerifyStatus.Unverified : Enums.SignedVerifyStatus.UnknownPublicKeys);

					   aRes = mPgpMessage.verify(aPublicKeys);
					   if (aRes && 0 < aRes.length)
					   {
						   oValidKey = _.find(aRes, function (oItem) {
							   return oItem && oItem.keyid && oItem.valid;
						   });

						   if (oValidKey)
						   {
							   oValidSysKey = Data.findPublicKeyByHex(oValidKey.keyid.toHex());
							   if (oValidSysKey)
							   {
								   sPlain = mPgpMessage.getText();

								   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Success);
								   this.pgpSignedVerifyUser(oValidSysKey.user);

								   sPlain =
									   Globals.$div.empty().append(
										   $('<pre class="b-plain-openpgp signed verified"></pre>').text(sPlain)
									   ).html()
								   ;

								   Globals.$div.empty();

								   this.replacePlaneTextBody(sPlain);
							   }
						   }
					   }
				   }
			   }
			   catch (oExc) {}

			   this.storePgpVerifyDataToDom();
		   }
		};

		MessageModel.prototype.decryptPgpEncryptedMessage = function (sPassword)
		{
		   if (this.isPgpEncrypted())
		   {
			   var
				   aRes = [],
				   mPgpMessage = null,
				   mPgpMessageDecrypted = null,
				   Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
				   sFrom = this.from && this.from[0] && this.from[0].email ? this.from[0].email : '',
				   aPublicKey = Data.findPublicKeysByEmail(sFrom),
				   oPrivateKey = Data.findSelfPrivateKey(sPassword),
				   oValidKey = null,
				   oValidSysKey = null,
				   sPlain = ''
			   ;

			   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Error);
			   this.pgpSignedVerifyUser('');

			   if (!oPrivateKey)
			   {
				   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.UnknownPrivateKey);
			   }

			   try
			   {
				   mPgpMessage = window.openpgp.message.readArmored(this.plainRaw);
				   if (mPgpMessage && oPrivateKey && mPgpMessage.decrypt)
				   {
					   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Unverified);

					   mPgpMessageDecrypted = mPgpMessage.decrypt(oPrivateKey);
					   if (mPgpMessageDecrypted)
					   {
						   aRes = mPgpMessageDecrypted.verify(aPublicKey);
						   if (aRes && 0 < aRes.length)
						   {
							   oValidKey = _.find(aRes, function (oItem) {
								   return oItem && oItem.keyid && oItem.valid;
							   });

							   if (oValidKey)
							   {
								   oValidSysKey = Data.findPublicKeyByHex(oValidKey.keyid.toHex());
								   if (oValidSysKey)
								   {
									   this.pgpSignedVerifyStatus(Enums.SignedVerifyStatus.Success);
									   this.pgpSignedVerifyUser(oValidSysKey.user);
								   }
							   }
						   }

						   sPlain = mPgpMessageDecrypted.getText();

						   sPlain =
							   Globals.$div.empty().append(
								   $('<pre class="b-plain-openpgp signed verified"></pre>').text(sPlain)
							   ).html()
						   ;

						   Globals.$div.empty();

						   this.replacePlaneTextBody(sPlain);
					   }
				   }
			   }
			   catch (oExc) {}

			   this.storePgpVerifyDataToDom();
		   }
		};

		MessageModel.prototype.replacePlaneTextBody = function (sPlain)
		{
		   if (this.body)
		   {
			   this.body.html(sPlain).addClass('b-text-part plain');
		   }
		};

		/**
		* @return {string}
		*/
		MessageModel.prototype.flagHash = function ()
		{
		   return [this.deleted(), this.unseen(), this.flagged(), this.answered(), this.forwarded(),
			   this.isReadReceipt()].join('');
		};

		module.exports = MessageModel;

	}());

/***/ },

/***/ 49:
/*!******************************!*\
  !*** ./dev/Common/Base64.js ***!
  \******************************/
/***/ function(module, exports, __webpack_require__) {

	// Base64 encode / decode
	// http://www.webtoolkit.info/

	(function () {

		'use strict';

		/*jslint bitwise: true*/
		var Base64 = {

			// private property
			_keyStr : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',

			// public method for urlsafe encoding
			urlsafe_encode : function (input) {
				return Base64.encode(input).replace(/[+]/g, '-').replace(/[\/]/g, '_').replace(/[=]/g, '.');
			},

			// public method for encoding
			encode : function (input) {
				var
					output = '',
					chr1, chr2, chr3, enc1, enc2, enc3, enc4,
					i = 0
				;

				input = Base64._utf8_encode(input);

				while (i < input.length)
				{
					chr1 = input.charCodeAt(i++);
					chr2 = input.charCodeAt(i++);
					chr3 = input.charCodeAt(i++);

					enc1 = chr1 >> 2;
					enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
					enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
					enc4 = chr3 & 63;

					if (isNaN(chr2))
					{
						enc3 = enc4 = 64;
					}
					else if (isNaN(chr3))
					{
						enc4 = 64;
					}

					output = output +
						this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
						this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
				}

				return output;
			},

			// public method for decoding
			decode : function (input) {
				var
					output = '',
					chr1, chr2, chr3, enc1, enc2, enc3, enc4,
					i = 0
				;

				input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');

				while (i < input.length)
				{
					enc1 = this._keyStr.indexOf(input.charAt(i++));
					enc2 = this._keyStr.indexOf(input.charAt(i++));
					enc3 = this._keyStr.indexOf(input.charAt(i++));
					enc4 = this._keyStr.indexOf(input.charAt(i++));

					chr1 = (enc1 << 2) | (enc2 >> 4);
					chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
					chr3 = ((enc3 & 3) << 6) | enc4;

					output = output + String.fromCharCode(chr1);

					if (enc3 !== 64)
					{
						output = output + String.fromCharCode(chr2);
					}

					if (enc4 !== 64)
					{
						output = output + String.fromCharCode(chr3);
					}
				}

				return Base64._utf8_decode(output);
			},

			// private method for UTF-8 encoding
			_utf8_encode : function (string) {

				string = string.replace(/\r\n/g, "\n");

				var
					utftext = '',
					n = 0,
					l = string.length,
					c = 0
				;

				for (; n < l; n++) {

					c = string.charCodeAt(n);

					if (c < 128)
					{
						utftext += String.fromCharCode(c);
					}
					else if ((c > 127) && (c < 2048))
					{
						utftext += String.fromCharCode((c >> 6) | 192);
						utftext += String.fromCharCode((c & 63) | 128);
					}
					else
					{
						utftext += String.fromCharCode((c >> 12) | 224);
						utftext += String.fromCharCode(((c >> 6) & 63) | 128);
						utftext += String.fromCharCode((c & 63) | 128);
					}
				}

				return utftext;
			},

			// private method for UTF-8 decoding
			_utf8_decode : function (utftext) {
				var
					string = '',
					i = 0,
					c = 0,
					c2 = 0,
					c3 = 0
				;

				while ( i < utftext.length )
				{
					c = utftext.charCodeAt(i);

					if (c < 128)
					{
						string += String.fromCharCode(c);
						i++;
					}
					else if((c > 191) && (c < 224))
					{
						c2 = utftext.charCodeAt(i+1);
						string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
						i += 2;
					}
					else
					{
						c2 = utftext.charCodeAt(i+1);
						c3 = utftext.charCodeAt(i+2);
						string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
						i += 3;
					}
				}

				return string;
			}
		};

		module.exports = Base64;
		/*jslint bitwise: false*/

	}());

/***/ },

/***/ 51:
/*!************************************!*\
  !*** ./dev/Models/AccountModel.js ***!
  \************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),

			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @constructor
		 *
		 * @param {string} sEmail
		 * @param {boolean=} bCanBeDelete = true
		 */
		function AccountModel(sEmail, bCanBeDelete)
		{
			this.email = sEmail;

			this.deleteAccess = ko.observable(false);
			this.canBeDalete = ko.observable(Utils.isUnd(bCanBeDelete) ? true : !!bCanBeDelete);
		}

		/**
		 * @type {string}
		 */
		AccountModel.prototype.email = '';

		/**
		 * @return {string}
		 */
		AccountModel.prototype.changeAccountLink = function ()
		{
			return __webpack_require__(/*! Common/LinkBuilder */ 11).change(this.email);
		};

		module.exports = AccountModel;

	}());

/***/ },

/***/ 52:
/*!***************************************!*\
  !*** ./dev/Models/AttachmentModel.js ***!
  \***************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),

			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11)
		;

		/**
		 * @constructor
		 */
		function AttachmentModel()
		{
			this.mimeType = '';
			this.fileName = '';
			this.estimatedSize = 0;
			this.friendlySize = '';
			this.isInline = false;
			this.isLinked = false;
			this.cid = '';
			this.cidWithOutTags = '';
			this.contentLocation = '';
			this.download = '';
			this.folder = '';
			this.uid = '';
			this.mimeIndex = '';
		}

		/**
		 * @static
		 * @param {AjaxJsonAttachment} oJsonAttachment
		 * @return {?AttachmentModel}
		 */
		AttachmentModel.newInstanceFromJson = function (oJsonAttachment)
		{
			var oAttachmentModel = new AttachmentModel();
			return oAttachmentModel.initByJson(oJsonAttachment) ? oAttachmentModel : null;
		};

		AttachmentModel.prototype.mimeType = '';
		AttachmentModel.prototype.fileName = '';
		AttachmentModel.prototype.estimatedSize = 0;
		AttachmentModel.prototype.friendlySize = '';
		AttachmentModel.prototype.isInline = false;
		AttachmentModel.prototype.isLinked = false;
		AttachmentModel.prototype.cid = '';
		AttachmentModel.prototype.cidWithOutTags = '';
		AttachmentModel.prototype.contentLocation = '';
		AttachmentModel.prototype.download = '';
		AttachmentModel.prototype.folder = '';
		AttachmentModel.prototype.uid = '';
		AttachmentModel.prototype.mimeIndex = '';

		/**
		 * @param {AjaxJsonAttachment} oJsonAttachment
		 */
		AttachmentModel.prototype.initByJson = function (oJsonAttachment)
		{
			var bResult = false;
			if (oJsonAttachment && 'Object/Attachment' === oJsonAttachment['@Object'])
			{
				this.mimeType = (oJsonAttachment.MimeType || '').toLowerCase();
				this.fileName = oJsonAttachment.FileName;
				this.estimatedSize = Utils.pInt(oJsonAttachment.EstimatedSize);
				this.isInline = !!oJsonAttachment.IsInline;
				this.isLinked = !!oJsonAttachment.IsLinked;
				this.cid = oJsonAttachment.CID;
				this.contentLocation = oJsonAttachment.ContentLocation;
				this.download = oJsonAttachment.Download;

				this.folder = oJsonAttachment.Folder;
				this.uid = oJsonAttachment.Uid;
				this.mimeIndex = oJsonAttachment.MimeIndex;

				this.friendlySize = Utils.friendlySize(this.estimatedSize);
				this.cidWithOutTags = this.cid.replace(/^<+/, '').replace(/>+$/, '');

				bResult = true;
			}

			return bResult;
		};

		/**
		 * @return {boolean}
		 */
		AttachmentModel.prototype.isImage = function ()
		{
			return -1 < Utils.inArray(this.mimeType.toLowerCase(),
				['image/png', 'image/jpg', 'image/jpeg', 'image/gif']
			);
		};

		/**
		 * @return {boolean}
		 */
		AttachmentModel.prototype.isText = function ()
		{
			return 'text/' === this.mimeType.substr(0, 5) &&
				-1 === Utils.inArray(this.mimeType, ['text/html']);
		};

		/**
		 * @return {boolean}
		 */
		AttachmentModel.prototype.isPdf = function ()
		{
			return Globals.bAllowPdfPreview && 'application/pdf' === this.mimeType;
		};

		/**
		 * @return {string}
		 */
		AttachmentModel.prototype.linkDownload = function ()
		{
			return LinkBuilder.attachmentDownload(this.download);
		};

		/**
		 * @return {string}
		 */
		AttachmentModel.prototype.linkPreview = function ()
		{
			return LinkBuilder.attachmentPreview(this.download);
		};

		/**
		 * @return {string}
		 */
		AttachmentModel.prototype.linkPreviewAsPlain = function ()
		{
			return LinkBuilder.attachmentPreviewAsPlain(this.download);
		};

		/**
		 * @return {string}
		 */
		AttachmentModel.prototype.generateTransferDownloadUrl = function ()
		{
			var	sLink = this.linkDownload();
			if ('http' !== sLink.substr(0, 4))
			{
				sLink = window.location.protocol + '//' + window.location.host + window.location.pathname + sLink;
			}

			return this.mimeType + ':' + this.fileName + ':' + sLink;
		};

		/**
		 * @param {AttachmentModel} oAttachment
		 * @param {*} oEvent
		 * @return {boolean}
		 */
		AttachmentModel.prototype.eventDragStart = function (oAttachment, oEvent)
		{
			var	oLocalEvent = oEvent.originalEvent || oEvent;
			if (oAttachment && oLocalEvent && oLocalEvent.dataTransfer && oLocalEvent.dataTransfer.setData)
			{
				oLocalEvent.dataTransfer.setData('DownloadURL', this.generateTransferDownloadUrl());
			}

			return true;
		};

		AttachmentModel.prototype.iconClass = function ()
		{
			var
				aParts = this.mimeType.toLocaleString().split('/'),
				sClass = 'icon-file'
			;

			if (aParts && aParts[1])
			{
				if ('image' === aParts[0])
				{
					sClass = 'icon-file-image';
				}
				else if ('text' === aParts[0])
				{
					sClass = 'icon-file-text';
				}
				else if ('audio' === aParts[0])
				{
					sClass = 'icon-file-music';
				}
				else if ('video' === aParts[0])
				{
					sClass = 'icon-file-movie';
				}
				else if (-1 < Utils.inArray(aParts[1],
					['zip', '7z', 'tar', 'rar', 'gzip', 'bzip', 'bzip2', 'x-zip', 'x-7z', 'x-rar', 'x-tar', 'x-gzip', 'x-bzip', 'x-bzip2', 'x-zip-compressed', 'x-7z-compressed', 'x-rar-compressed']))
				{
					sClass = 'icon-file-zip';
				}
		//		else if (-1 < Utils.inArray(aParts[1],
		//			['pdf', 'x-pdf']))
		//		{
		//			sClass = 'icon-file-pdf';
		//		}
		//		else if (-1 < Utils.inArray(aParts[1], [
		//			'exe', 'x-exe', 'x-winexe', 'bat'
		//		]))
		//		{
		//			sClass = 'icon-console';
		//		}
				else if (-1 < Utils.inArray(aParts[1], [
					'rtf', 'msword', 'vnd.msword', 'vnd.openxmlformats-officedocument.wordprocessingml.document',
					'vnd.openxmlformats-officedocument.wordprocessingml.template',
					'vnd.ms-word.document.macroEnabled.12',
					'vnd.ms-word.template.macroEnabled.12'
				]))
				{
					sClass = 'icon-file-text';
				}
				else if (-1 < Utils.inArray(aParts[1], [
					'excel', 'ms-excel', 'vnd.ms-excel',
					'vnd.openxmlformats-officedocument.spreadsheetml.sheet',
					'vnd.openxmlformats-officedocument.spreadsheetml.template',
					'vnd.ms-excel.sheet.macroEnabled.12',
					'vnd.ms-excel.template.macroEnabled.12',
					'vnd.ms-excel.addin.macroEnabled.12',
					'vnd.ms-excel.sheet.binary.macroEnabled.12'
				]))
				{
					sClass = 'icon-file-excel';
				}
				else if (-1 < Utils.inArray(aParts[1], [
					'powerpoint', 'ms-powerpoint', 'vnd.ms-powerpoint',
					'vnd.openxmlformats-officedocument.presentationml.presentation',
					'vnd.openxmlformats-officedocument.presentationml.template',
					'vnd.openxmlformats-officedocument.presentationml.slideshow',
					'vnd.ms-powerpoint.addin.macroEnabled.12',
					'vnd.ms-powerpoint.presentation.macroEnabled.12',
					'vnd.ms-powerpoint.template.macroEnabled.12',
					'vnd.ms-powerpoint.slideshow.macroEnabled.12'
				]))
				{
					sClass = 'icon-file-chart-graph';
				}
			}

			return sClass;
		};

		module.exports = AttachmentModel;

	}());

/***/ },

/***/ 58:
/*!***********************************!*\
  !*** ./dev/Models/FolderModel.js ***!
  \***********************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Events = __webpack_require__(/*! Common/Events */ 22)
		;

		/**
		 * @constructor
		 */
		function FolderModel()
		{
			this.name = ko.observable('');
			this.fullName = '';
			this.fullNameRaw = '';
			this.fullNameHash = '';
			this.delimiter = '';
			this.namespace = '';
			this.deep = 0;
			this.interval = 0;

			this.selectable = false;
			this.existen = true;

			this.type = ko.observable(Enums.FolderType.User);

			this.focused = ko.observable(false);
			this.selected = ko.observable(false);
			this.edited = ko.observable(false);
			this.collapsed = ko.observable(true);
			this.subScribed = ko.observable(true);
			this.subFolders = ko.observableArray([]);
			this.deleteAccess = ko.observable(false);
			this.actionBlink = ko.observable(false).extend({'falseTimeout': 1000});

			this.nameForEdit = ko.observable('');

			this.privateMessageCountAll = ko.observable(0);
			this.privateMessageCountUnread = ko.observable(0);

			this.collapsedPrivate = ko.observable(true);
		}

		/**
		 * @static
		 * @param {AjaxJsonFolder} oJsonFolder
		 * @return {?FolderModel}
		 */
		FolderModel.newInstanceFromJson = function (oJsonFolder)
		{
			var oFolderModel = new FolderModel();
			return oFolderModel.initByJson(oJsonFolder) ? oFolderModel.initComputed() : null;
		};

		/**
		 * @return {FolderModel}
		 */
		FolderModel.prototype.initComputed = function ()
		{
			this.hasSubScribedSubfolders = ko.computed(function () {
				return !!_.find(this.subFolders(), function (oFolder) {
					return oFolder.subScribed() && !oFolder.isSystemFolder();
				});
			}, this);

			this.canBeEdited = ko.computed(function () {
				return Enums.FolderType.User === this.type() && this.existen && this.selectable;
			}, this);

			this.visible = ko.computed(function () {
				var
					bSubScribed = this.subScribed(),
					bSubFolders = this.hasSubScribedSubfolders()
				;

				return (bSubScribed || (bSubFolders && (!this.existen || !this.selectable)));
			}, this);

			this.isSystemFolder = ko.computed(function () {
				return Enums.FolderType.User !== this.type();
			}, this);

			this.hidden = ko.computed(function () {
				var
					bSystem = this.isSystemFolder(),
					bSubFolders = this.hasSubScribedSubfolders()
				;

				return (bSystem && !bSubFolders) || (!this.selectable && !bSubFolders);

			}, this);

			this.selectableForFolderList = ko.computed(function () {
				return !this.isSystemFolder() && this.selectable;
			}, this);

			this.messageCountAll = ko.computed({
				'read': this.privateMessageCountAll,
				'write': function (iValue) {
					if (Utils.isPosNumeric(iValue, true))
					{
						this.privateMessageCountAll(iValue);
					}
					else
					{
						this.privateMessageCountAll.valueHasMutated();
					}
				},
				'owner': this
			});

			this.messageCountUnread = ko.computed({
				'read': this.privateMessageCountUnread,
				'write': function (iValue) {
					if (Utils.isPosNumeric(iValue, true))
					{
						this.privateMessageCountUnread(iValue);
					}
					else
					{
						this.privateMessageCountUnread.valueHasMutated();
					}
				},
				'owner': this
			});

			this.printableUnreadCount = ko.computed(function () {
				var
					iCount = this.messageCountAll(),
					iUnread = this.messageCountUnread(),
					iType = this.type()
				;

				if (0 < iCount)
				{
					if (Enums.FolderType.Draft === iType)
					{
						return '' + iCount;
					}
					else if (0 < iUnread && Enums.FolderType.Trash !== iType && Enums.FolderType.Archive !== iType && Enums.FolderType.SentItems !== iType)
					{
						return '' + iUnread;
					}
				}

				return '';

			}, this);

			this.canBeDeleted = ko.computed(function () {
				var
					bSystem = this.isSystemFolder()
				;
				return !bSystem && 0 === this.subFolders().length && 'INBOX' !== this.fullNameRaw;
			}, this);

			this.canBeSubScribed = ko.computed(function () {
				return !this.isSystemFolder() && this.selectable && 'INBOX' !== this.fullNameRaw;
			}, this);

	//		this.visible.subscribe(function () {
	//			Utils.timeOutAction('folder-list-folder-visibility-change', function () {
	//				Globals.$win.trigger('folder-list-folder-visibility-change');
	//			}, 100);
	//		});

			this.localName = ko.computed(function () {

				Globals.langChangeTrigger();

				var
					iType = this.type(),
					sName = this.name()
				;

				if (this.isSystemFolder())
				{
					switch (iType)
					{
						case Enums.FolderType.Inbox:
							sName = Utils.i18n('FOLDER_LIST/INBOX_NAME');
							break;
						case Enums.FolderType.SentItems:
							sName = Utils.i18n('FOLDER_LIST/SENT_NAME');
							break;
						case Enums.FolderType.Draft:
							sName = Utils.i18n('FOLDER_LIST/DRAFTS_NAME');
							break;
						case Enums.FolderType.Spam:
							sName = Utils.i18n('FOLDER_LIST/SPAM_NAME');
							break;
						case Enums.FolderType.Trash:
							sName = Utils.i18n('FOLDER_LIST/TRASH_NAME');
							break;
						case Enums.FolderType.Archive:
							sName = Utils.i18n('FOLDER_LIST/ARCHIVE_NAME');
							break;
					}
				}

				return sName;

			}, this);

			this.manageFolderSystemName = ko.computed(function () {

				Globals.langChangeTrigger();

				var
					sSuffix = '',
					iType = this.type(),
					sName = this.name()
				;

				if (this.isSystemFolder())
				{
					switch (iType)
					{
						case Enums.FolderType.Inbox:
							sSuffix = '(' + Utils.i18n('FOLDER_LIST/INBOX_NAME') + ')';
							break;
						case Enums.FolderType.SentItems:
							sSuffix = '(' + Utils.i18n('FOLDER_LIST/SENT_NAME') + ')';
							break;
						case Enums.FolderType.Draft:
							sSuffix = '(' + Utils.i18n('FOLDER_LIST/DRAFTS_NAME') + ')';
							break;
						case Enums.FolderType.Spam:
							sSuffix = '(' + Utils.i18n('FOLDER_LIST/SPAM_NAME') + ')';
							break;
						case Enums.FolderType.Trash:
							sSuffix = '(' + Utils.i18n('FOLDER_LIST/TRASH_NAME') + ')';
							break;
						case Enums.FolderType.Archive:
							sSuffix = '(' + Utils.i18n('FOLDER_LIST/ARCHIVE_NAME') + ')';
							break;
					}
				}

				if ('' !== sSuffix && '(' + sName + ')' === sSuffix || '(inbox)' === sSuffix.toLowerCase())
				{
					sSuffix = '';
				}

				return sSuffix;

			}, this);

			this.collapsed = ko.computed({
				'read': function () {
					return !this.hidden() && this.collapsedPrivate();
				},
				'write': function (mValue) {
					this.collapsedPrivate(mValue);
				},
				'owner': this
			});

			this.hasUnreadMessages = ko.computed(function () {
				return 0 < this.messageCountUnread();
			}, this);

			this.hasSubScribedUnreadMessagesSubfolders = ko.computed(function () {
				return !!_.find(this.subFolders(), function (oFolder) {
					return oFolder.hasUnreadMessages() || oFolder.hasSubScribedUnreadMessagesSubfolders();
				});
			}, this);

			// subscribe
			this.name.subscribe(function (sValue) {
				this.nameForEdit(sValue);
			}, this);

			this.edited.subscribe(function (bValue) {
				if (bValue)
				{
					this.nameForEdit(this.name());
				}
			}, this);

			this.messageCountUnread.subscribe(function (iUnread) {
				if (Enums.FolderType.Inbox === this.type())
				{
					Events.pub('mailbox.inbox-unread-count', [iUnread]);
				}
			}, this);

			return this;
		};

		FolderModel.prototype.fullName = '';
		FolderModel.prototype.fullNameRaw = '';
		FolderModel.prototype.fullNameHash = '';
		FolderModel.prototype.delimiter = '';
		FolderModel.prototype.namespace = '';
		FolderModel.prototype.deep = 0;
		FolderModel.prototype.interval = 0;

		/**
		 * @return {string}
		 */
		FolderModel.prototype.collapsedCss = function ()
		{
			return this.hasSubScribedSubfolders() ?
				(this.collapsed() ? 'icon-right-mini e-collapsed-sign' : 'icon-down-mini e-collapsed-sign') : 'icon-none e-collapsed-sign';
		};

		/**
		 * @param {AjaxJsonFolder} oJsonFolder
		 * @return {boolean}
		 */
		FolderModel.prototype.initByJson = function (oJsonFolder)
		{
			var bResult = false;
			if (oJsonFolder && 'Object/Folder' === oJsonFolder['@Object'])
			{
				this.name(oJsonFolder.Name);
				this.delimiter = oJsonFolder.Delimiter;
				this.fullName = oJsonFolder.FullName;
				this.fullNameRaw = oJsonFolder.FullNameRaw;
				this.fullNameHash = oJsonFolder.FullNameHash;
				this.deep = oJsonFolder.FullNameRaw.split(this.delimiter).length - 1;
				this.selectable = !!oJsonFolder.IsSelectable;
				this.existen = !!oJsonFolder.IsExists;

				this.subScribed(!!oJsonFolder.IsSubscribed);
				this.type('INBOX' === this.fullNameRaw ? Enums.FolderType.Inbox : Enums.FolderType.User);

				bResult = true;
			}

			return bResult;
		};

		/**
		 * @return {string}
		 */
		FolderModel.prototype.printableFullName = function ()
		{
			return this.fullName.split(this.delimiter).join(' / ');
		};

		module.exports = FolderModel;

	}());

/***/ },

/***/ 59:
/*!*************************************!*\
  !*** ./dev/Models/IdentityModel.js ***!
  \*************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),

			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @param {string} sId
		 * @param {string} sEmail
		 * @param {boolean=} bCanBeDelete = true
		 * @constructor
		 */
		function IdentityModel(sId, sEmail, bCanBeDelete)
		{
			this.id = sId;
			this.email = ko.observable(sEmail);
			this.name = ko.observable('');
			this.replyTo = ko.observable('');
			this.bcc = ko.observable('');

			this.deleteAccess = ko.observable(false);
			this.canBeDalete = ko.observable(bCanBeDelete);
		}

		IdentityModel.prototype.formattedName = function ()
		{
			var sName = this.name();
			return '' === sName ? this.email() : sName + ' <' + this.email() + '>';
		};

		IdentityModel.prototype.formattedNameForCompose = function ()
		{
			var sName = this.name();
			return '' === sName ? this.email() : sName + ' (' + this.email() + ')';
		};

		IdentityModel.prototype.formattedNameForEmail = function ()
		{
			var sName = this.name();
			return '' === sName ? this.email() : '"' + Utils.quoteName(sName) + '" <' + this.email() + '>';
		};

		module.exports = IdentityModel;

	}());

/***/ },

/***/ 60:
/*!***************************************!*\
  !*** ./dev/Models/OpenPgpKeyModel.js ***!
  \***************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3)
		;

		/**
		 * @param {string} iIndex
		 * @param {string} sGuID
		 * @param {string} sID
		 * @param {string} sUserID
		 * @param {string} sEmail
		 * @param {boolean} bIsPrivate
		 * @param {string} sArmor
		 * @constructor
		 */
		function OpenPgpKeyModel(iIndex, sGuID, sID, sUserID, sEmail, bIsPrivate, sArmor)
		{
			this.index = iIndex;
			this.id = sID;
			this.guid = sGuID;
			this.user = sUserID;
			this.email = sEmail;
			this.armor = sArmor;
			this.isPrivate = !!bIsPrivate;

			this.deleteAccess = ko.observable(false);
		}

		OpenPgpKeyModel.prototype.index = 0;
		OpenPgpKeyModel.prototype.id = '';
		OpenPgpKeyModel.prototype.guid = '';
		OpenPgpKeyModel.prototype.user = '';
		OpenPgpKeyModel.prototype.email = '';
		OpenPgpKeyModel.prototype.armor = '';
		OpenPgpKeyModel.prototype.isPrivate = false;

		module.exports = OpenPgpKeyModel;

	}());

/***/ },

/***/ 64:
/*!************************************!*\
  !*** ./dev/Screens/LoginScreen.js ***!
  \************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),

			KnoinAbstractScreen = __webpack_require__(/*! Knoin:AbstractScreen */ 24)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractScreen
		 */
		function LoginScreen()
		{
			KnoinAbstractScreen.call(this, 'login', [
				__webpack_require__(/*! View:RainLoop:Login */ 96)
			]);
		}

		_.extend(LoginScreen.prototype, KnoinAbstractScreen.prototype);

		LoginScreen.prototype.onShow = function ()
		{
			__webpack_require__(/*! App:RainLoop */ 4).setTitle('');
		};

		module.exports = LoginScreen;

	}());

/***/ },

/***/ 90:
/*!****************************************************!*\
  !*** ./dev/Storages/LocalStorages/CookieDriver.js ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

	(function () {

		'use strict';

		var
			$ = __webpack_require__(/*! $ */ 14),
			JSON = __webpack_require__(/*! JSON */ 33),

			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @constructor
		 */
		function CookieDriver()
		{
		}

		/**
		 * @static
		 * @return {boolean}
		 */
		CookieDriver.supported = function ()
		{
			return !!(window.navigator && window.navigator.cookieEnabled);
		};

		/**
		 * @param {string} sKey
		 * @param {*} mData
		 * @return {boolean}
		 */
		CookieDriver.prototype.set = function (sKey, mData)
		{
			var
				mStorageValue = $.cookie(Consts.Values.ClientSideStorageIndexName),
				bResult = false,
				mResult = null
			;

			try
			{
				mResult = null === mStorageValue ? null : JSON.parse(mStorageValue);
			}
			catch (oException) {}

			if (!mResult)
			{
				mResult = {};
			}

			mResult[sKey] = mData;

			try
			{
				$.cookie(Consts.Values.ClientSideStorageIndexName, JSON.stringify(mResult), {
					'expires': 30
				});

				bResult = true;
			}
			catch (oException) {}

			return bResult;
		};

		/**
		 * @param {string} sKey
		 * @return {*}
		 */
		CookieDriver.prototype.get = function (sKey)
		{
			var
				mStorageValue = $.cookie(Consts.Values.ClientSideStorageIndexName),
				mResult = null
			;

			try
			{
				mResult = null === mStorageValue ? null : JSON.parse(mStorageValue);
				if (mResult && !Utils.isUnd(mResult[sKey]))
				{
					mResult = mResult[sKey];
				}
				else
				{
					mResult = null;
				}
			}
			catch (oException) {}

			return mResult;
		};

		module.exports = CookieDriver;

	}());

/***/ },

/***/ 91:
/*!**********************************************************!*\
  !*** ./dev/Storages/LocalStorages/LocalStorageDriver.js ***!
  \**********************************************************/
/***/ function(module, exports, __webpack_require__) {

	/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			JSON = __webpack_require__(/*! JSON */ 33),

			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @constructor
		 */
		function LocalStorageDriver()
		{
		}

		/**
		 * @static
		 * @return {boolean}
		 */
		LocalStorageDriver.supported = function ()
		{
			return !!window.localStorage;
		};

		/**
		 * @param {string} sKey
		 * @param {*} mData
		 * @return {boolean}
		 */
		LocalStorageDriver.prototype.set = function (sKey, mData)
		{
			var
				mStorageValue = window.localStorage[Consts.Values.ClientSideStorageIndexName] || null,
				bResult = false,
				mResult = null
			;

			try
			{
				mResult = null === mStorageValue ? null : JSON.parse(mStorageValue);
			}
			catch (oException) {}

			if (!mResult)
			{
				mResult = {};
			}

			mResult[sKey] = mData;

			try
			{
				window.localStorage[Consts.Values.ClientSideStorageIndexName] = JSON.stringify(mResult);

				bResult = true;
			}
			catch (oException) {}

			return bResult;
		};

		/**
		 * @param {string} sKey
		 * @return {*}
		 */
		LocalStorageDriver.prototype.get = function (sKey)
		{
			var
				mStorageValue = window.localStorage[Consts.Values.ClientSideStorageIndexName] || null,
				mResult = null
			;

			try
			{
				mResult = null === mStorageValue ? null : JSON.parse(mStorageValue);
				if (mResult && !Utils.isUnd(mResult[sKey]))
				{
					mResult = mResult[sKey];
				}
				else
				{
					mResult = null;
				}
			}
			catch (oException) {}

			return mResult;
		};

		module.exports = LocalStorageDriver;

	}());

/***/ },

/***/ 96:
/*!******************************************!*\
  !*** ./dev/ViewModels/LoginViewModel.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function LoginViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Center', 'Login');

			this.email = ko.observable('');
			this.password = ko.observable('');
			this.signMe = ko.observable(false);

			this.additionalCode = ko.observable('');
			this.additionalCode.error = ko.observable(false);
			this.additionalCode.focused = ko.observable(false);
			this.additionalCode.visibility = ko.observable(false);
			this.additionalCodeSignMe = ko.observable(false);

			this.logoImg = Utils.trim(Settings.settingsGet('LoginLogo'));
			this.loginDescription = Utils.trim(Settings.settingsGet('LoginDescription'));
			this.logoCss = Utils.trim(Settings.settingsGet('LoginCss'));

			this.emailError = ko.observable(false);
			this.passwordError = ko.observable(false);

			this.emailFocus = ko.observable(false);
			this.submitFocus = ko.observable(false);

			this.email.subscribe(function () {
				this.emailError(false);
				this.additionalCode('');
				this.additionalCode.visibility(false);
			}, this);

			this.password.subscribe(function () {
				this.passwordError(false);
			}, this);

			this.additionalCode.subscribe(function () {
				this.additionalCode.error(false);
			}, this);

			this.additionalCode.visibility.subscribe(function () {
				this.additionalCode.error(false);
			}, this);

			this.submitRequest = ko.observable(false);
			this.submitError = ko.observable('');

			this.allowLanguagesOnLogin = Data.allowLanguagesOnLogin;

			this.langRequest = ko.observable(false);
			this.mainLanguage = Data.mainLanguage;
			this.bSendLanguage = false;

			this.mainLanguageFullName = ko.computed(function () {
				return Utils.convertLangName(this.mainLanguage());
			}, this);

			this.signMeType = ko.observable(Enums.LoginSignMeType.Unused);

			this.signMeType.subscribe(function (iValue) {
				this.signMe(Enums.LoginSignMeType.DefaultOn === iValue);
			}, this);

			this.signMeVisibility = ko.computed(function () {
				return Enums.LoginSignMeType.Unused !== this.signMeType();
			}, this);

			this.submitCommand = Utils.createCommand(this, function () {

				Utils.triggerAutocompleteInputChange();

				this.emailError('' === Utils.trim(this.email()));
				this.passwordError('' === Utils.trim(this.password()));

				if (this.additionalCode.visibility())
				{
					this.additionalCode.error('' === Utils.trim(this.additionalCode()));
				}

				if (this.emailError() || this.passwordError() || this.additionalCode.error())
				{
					return false;
				}

				this.submitRequest(true);

				var
					sPassword = this.password(),

					fLoginRequest = _.bind(function (sPassword) {

						Remote.login(_.bind(function (sResult, oData) {

							if (Enums.StorageResultType.Success === sResult && oData && 'Login' === oData.Action)
							{
								if (oData.Result)
								{
									if (oData.TwoFactorAuth)
									{
										this.additionalCode('');
										this.additionalCode.visibility(true);
										this.additionalCode.focused(true);

										this.submitRequest(false);
									}
									else
									{
										__webpack_require__(/*! App:RainLoop */ 4).loginAndLogoutReload();
									}
								}
								else if (oData.ErrorCode)
								{
									this.submitRequest(false);
									this.submitError(Utils.getNotification(oData.ErrorCode));

									if ('' === this.submitError())
									{
										this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
									}
								}
								else
								{
									this.submitRequest(false);
								}
							}
							else
							{
								this.submitRequest(false);
								this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
							}

						}, this), this.email(), '', sPassword, !!this.signMe(),
							this.bSendLanguage ? this.mainLanguage() : '',
							this.additionalCode.visibility() ? this.additionalCode() : '',
							this.additionalCode.visibility() ? !!this.additionalCodeSignMe() : false
						);

					}, this)
				;

				if (!!Settings.settingsGet('UseRsaEncryption') && Utils.rsaEncode.supported)
				{
					Remote.getPublicKey(_.bind(function (sResult, oData) {

						var bRequest = false;
						if (Enums.StorageResultType.Success === sResult && oData && oData.Result &&
							Utils.isArray(oData.Result) && oData.Result[0] && oData.Result[1] && oData.Result[2])
						{
							var sEncryptedPassword = Utils.rsaEncode(sPassword, oData.Result[0], oData.Result[1], oData.Result[2]);
							if (sEncryptedPassword)
							{
								fLoginRequest(sEncryptedPassword);
								bRequest = true;
							}
						}

						if (!bRequest)
						{
							this.submitRequest(false);
							this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
						}

					}, this));
				}
				else
				{
					fLoginRequest(sPassword);
				}

				return true;

			}, function () {
				return !this.submitRequest();
			});

			this.facebookLoginEnabled = ko.observable(false);

			this.facebookCommand = Utils.createCommand(this, function () {

				window.open(LinkBuilder.socialFacebook(), 'Facebook',
					'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
				return true;

			}, function () {
				return !this.submitRequest() && this.facebookLoginEnabled();
			});

			this.googleLoginEnabled = ko.observable(false);

			this.googleCommand = Utils.createCommand(this, function () {

				window.open(LinkBuilder.socialGoogle(), 'Google',
					'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
				return true;

			}, function () {
				return !this.submitRequest() && this.googleLoginEnabled();
			});

			this.twitterLoginEnabled = ko.observable(false);

			this.twitterCommand = Utils.createCommand(this, function () {

				window.open(LinkBuilder.socialTwitter(), 'Twitter',
					'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');

				return true;

			}, function () {
				return !this.submitRequest() && this.twitterLoginEnabled();
			});

			this.socialLoginEnabled = ko.computed(function () {

				var
					bF = this.facebookLoginEnabled(),
					bG = this.googleLoginEnabled(),
					bT = this.twitterLoginEnabled()
				;

				return bF || bG || bT;
			}, this);

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:RainLoop:Login', 'LoginViewModel'], LoginViewModel);
		_.extend(LoginViewModel.prototype, KnoinAbstractViewModel.prototype);

		LoginViewModel.prototype.onShow = function ()
		{
			kn.routeOff();

			_.delay(_.bind(function () {
				if ('' !== this.email() && '' !== this.password())
				{
					this.submitFocus(true);
				}
				else
				{
					this.emailFocus(true);
				}

				if (Settings.settingsGet('UserLanguage'))
				{
					$.cookie('rllang', Data.language(), {'expires': 30});
				}

			}, this), 100);
		};

		LoginViewModel.prototype.onHide = function ()
		{
			this.submitFocus(false);
			this.emailFocus(false);
		};

		LoginViewModel.prototype.onBuild = function ()
		{
			var
				self = this,
				sJsHash = Settings.settingsGet('JsHash'),
				fSocial = function (iErrorCode) {
					iErrorCode = Utils.pInt(iErrorCode);
					if (0 === iErrorCode)
					{
						self.submitRequest(true);
						__webpack_require__(/*! App:RainLoop */ 4).loginAndLogoutReload();
					}
					else
					{
						self.submitError(Utils.getNotification(iErrorCode));
					}
				}
			;

			this.facebookLoginEnabled(!!Settings.settingsGet('AllowFacebookSocial'));
			this.twitterLoginEnabled(!!Settings.settingsGet('AllowTwitterSocial'));
			this.googleLoginEnabled(!!Settings.settingsGet('AllowGoogleSocial'));

			switch ((Settings.settingsGet('SignMe') || 'unused').toLowerCase())
			{
				case Enums.LoginSignMeTypeAsString.DefaultOff:
					this.signMeType(Enums.LoginSignMeType.DefaultOff);
					break;
				case Enums.LoginSignMeTypeAsString.DefaultOn:
					this.signMeType(Enums.LoginSignMeType.DefaultOn);
					break;
				default:
				case Enums.LoginSignMeTypeAsString.Unused:
					this.signMeType(Enums.LoginSignMeType.Unused);
					break;
			}

			this.email(Data.devEmail);
			this.password(Data.devPassword);

			if (this.googleLoginEnabled())
			{
				window['rl_' + sJsHash + '_google_login_service'] = fSocial;
			}

			if (this.facebookLoginEnabled())
			{
				window['rl_' + sJsHash + '_facebook_login_service'] = fSocial;
			}

			if (this.twitterLoginEnabled())
			{
				window['rl_' + sJsHash + '_twitter_login_service'] = fSocial;
			}

			_.delay(function () {
				Data.language.subscribe(function (sValue) {
					self.langRequest(true);
					$.ajax({
						'url': LinkBuilder.langLink(sValue),
						'dataType': 'script',
						'cache': true
					}).done(function() {
						self.bSendLanguage = true;
						Utils.i18nReload();
						$.cookie('rllang', Data.language(), {'expires': 30});
					}).always(function() {
						self.langRequest(false);
					});
				});
			}, 50);

			Utils.triggerAutocompleteInputChange(true);
		};

		LoginViewModel.prototype.submitForm = function ()
		{
			this.submitCommand();
		};

		LoginViewModel.prototype.selectLanguage = function ()
		{
			kn.showScreenPopup(__webpack_require__(/*! View:Popup:Languages */ 32));
		};

		module.exports = LoginViewModel;

	}());

/***/ }

});