/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends AbstractData
 */
function WebMailDataStorage()
{
	AbstractData.call(this);

	var
		fRemoveSystemFolderType = function (observable) {
			return function () {
				var oFolder = RL.cache().getFolderFromCacheList(observable());
				if (oFolder)
				{
					oFolder.type(Enums.FolderType.User);
				}
			};
		},
		fSetSystemFolderType = function (iType) {
			return function (sValue) {
				var oFolder = RL.cache().getFolderFromCacheList(sValue);
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

	this.allowContactsSync = ko.observable(!!RL.settingsGet('ContactsSyncIsAllowed'));
	this.enableContactsSync = ko.observable(!!RL.settingsGet('EnableContactsSync'));
	this.contactsSyncUrl = ko.observable(RL.settingsGet('ContactsSyncUrl'));
	this.contactsSyncUser = ko.observable(RL.settingsGet('ContactsSyncUser'));
	this.contactsSyncPass = ko.observable(RL.settingsGet('ContactsSyncPassword'));

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
			return RL.cache().getFolderFromCacheList(sName);
		}));
	}, this);

	this.folderMenuForMove = ko.computed(function () {
		return RL.folderListOptionsBuilder(this.folderListSystem(), this.folderList(), [
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
		var iPage = Math.ceil(this.messageListCount() / this.messagesPerPage());
		return 0 >= iPage ? 1 : iPage;
	}, this);

	this.mainMessageListSearch = ko.computed({
		'read': this.messageListSearch,
		'write': function (sValue) {
			kn.setHash(RL.link().mailBox(
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
			this.hideMessageBodies();

			if (Enums.Layout.NoPreview === RL.data().layout() &&
				-1 < window.location.hash.indexOf('message-preview'))
			{
				RL.historyBack();
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
			RL.data().folderList.focused(false);
			RL.data().keyScope(Enums.KeyState.MessageView);
		}
		else if (Enums.KeyState.MessageView === RL.data().keyScope())
		{
			RL.data().keyScope(Enums.KeyState.MessageList);
		}
	});

	this.folderList.focused.subscribe(function (bValue) {
		if (bValue)
		{
			RL.data().keyScope(Enums.KeyState.FolderList);
		}
		else if (Enums.KeyState.FolderList === RL.data().keyScope())
		{
			RL.data().keyScope(Enums.KeyState.MessageList);
		}
	});

	this.messageLoading.subscribe(function (bValue) {
		this.messageLoadingThrottle(bValue);
	}, this);

	this.messageFullScreenMode = ko.observable(false);

	this.messageError = ko.observable('');

	this.messagesBodiesDom = ko.observable(null);

	this.messagesBodiesDom.subscribe(function (oDom) {
		if (oDom && !(oDom instanceof jQuery))
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

		return 0 < iQuota ? Math.ceil((iUsed / iQuota) * 100) : 0;

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

_.extend(WebMailDataStorage.prototype, AbstractData.prototype);

WebMailDataStorage.prototype.purgeMessageBodyCache = function()
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

WebMailDataStorage.prototype.populateDataOnStart = function()
{
	AbstractData.prototype.populateDataOnStart.call(this);

	this.accountEmail(RL.settingsGet('Email'));
	this.accountIncLogin(RL.settingsGet('IncLogin'));
	this.accountOutLogin(RL.settingsGet('OutLogin'));
	this.projectHash(RL.settingsGet('ProjectHash'));

	this.defaultIdentityID(RL.settingsGet('DefaultIdentityID'));

	this.displayName(RL.settingsGet('DisplayName'));
	this.replyTo(RL.settingsGet('ReplyTo'));
	this.signature(RL.settingsGet('Signature'));
	this.signatureToAll(!!RL.settingsGet('SignatureToAll'));
	this.enableTwoFactor(!!RL.settingsGet('EnableTwoFactor'));

	this.lastFoldersHash = RL.local().get(Enums.ClientSideKeyName.FoldersLashHash) || '';

	this.remoteSuggestions = !!RL.settingsGet('RemoteSuggestions');

	this.devEmail = RL.settingsGet('DevEmail');
	this.devPassword = RL.settingsGet('DevPassword');
};

WebMailDataStorage.prototype.initUidNextAndNewMessages = function (sFolder, sUidNext, aNewMessages)
{
	if ('INBOX' === sFolder && Utils.isNormal(sUidNext) && sUidNext !== '')
	{
		if (Utils.isArray(aNewMessages) && 0 < aNewMessages.length)
		{
			var
				oCache = RL.cache(),
				iIndex = 0,
				iLen = aNewMessages.length,
				fNotificationHelper = function (sImageSrc, sTitle, sText)
				{
					var oNotification = null;
					if (NotificationClass && RL.data().useDesktopNotifications())
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
				oCache.addNewMessageCache(sFolder, oItem.Uid);
			});

			if (3 < iLen)
			{
				fNotificationHelper(
					RL.link().notificationMailIcon(),
					RL.data().accountEmail(),
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
						RL.link().notificationMailIcon(),
						MessageModel.emailsToLine(MessageModel.initEmailsFromJson(aNewMessages[iIndex].From), false),
						aNewMessages[iIndex].Subject
					);
				}
			}
		}

		RL.cache().setFolderUidNext(sFolder, sUidNext);
	}
};

/**
 * @param {string} sNamespace
 * @param {Array} aFolders
 * @return {Array}
 */
WebMailDataStorage.prototype.folderResponseParseRec = function (sNamespace, aFolders)
{
	var
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

			oCacheFolder = RL.cache().getFolderFromCacheList(sFolderFullNameRaw);
			if (!oCacheFolder)
			{
				oCacheFolder = FolderModel.newInstanceFromJson(oFolder);
				if (oCacheFolder)
				{
					RL.cache().setFolderToCacheList(sFolderFullNameRaw, oCacheFolder);
					RL.cache().setFolderFullNameRaw(oCacheFolder.fullNameHash, sFolderFullNameRaw);
				}
			}

			if (oCacheFolder)
			{
				oCacheFolder.collapsed(!Utils.isFolderExpanded(oCacheFolder.fullNameHash));

				if (oFolder.Extended)
				{
					if (oFolder.Extended.Hash)
					{
						RL.cache().setFolderHash(oCacheFolder.fullNameRaw, oFolder.Extended.Hash);
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
WebMailDataStorage.prototype.setFolders = function (oData)
{
	var
		aList = [],
		bUpdate = false,
		oRLData = RL.data(),
		fNormalizeFolder = function (sFolderFullNameRaw) {
			return ('' === sFolderFullNameRaw || Consts.Values.UnuseOptionValue === sFolderFullNameRaw ||
				null !== RL.cache().getFolderFromCacheList(sFolderFullNameRaw)) ? sFolderFullNameRaw : '';
		}
	;

	if (oData && oData.Result && 'Collection/FolderCollection' === oData.Result['@Object'] &&
		oData.Result['@Collection'] && Utils.isArray(oData.Result['@Collection']))
	{
		if (!Utils.isUnd(oData.Result.Namespace))
		{
			oRLData.namespace = oData.Result.Namespace;
		}

		this.threading(!!RL.settingsGet('UseImapThread') && oData.Result.IsThreadsSupported && true);

		aList = this.folderResponseParseRec(oRLData.namespace, oData.Result['@Collection']);
		oRLData.folderList(aList);

		if (oData.Result['SystemFolders'] &&
			'' === '' + RL.settingsGet('SentFolder') + RL.settingsGet('DraftFolder') +
			RL.settingsGet('SpamFolder') + RL.settingsGet('TrashFolder') + RL.settingsGet('ArchiveFolder') +
			RL.settingsGet('NullFolder'))
		{
			// TODO Magic Numbers
			RL.settingsSet('SentFolder', oData.Result['SystemFolders'][2] || null);
			RL.settingsSet('DraftFolder', oData.Result['SystemFolders'][3] || null);
			RL.settingsSet('SpamFolder', oData.Result['SystemFolders'][4] || null);
			RL.settingsSet('TrashFolder', oData.Result['SystemFolders'][5] || null);
			RL.settingsSet('ArchiveFolder', oData.Result['SystemFolders'][12] || null);

			bUpdate = true;
		}

		oRLData.sentFolder(fNormalizeFolder(RL.settingsGet('SentFolder')));
		oRLData.draftFolder(fNormalizeFolder(RL.settingsGet('DraftFolder')));
		oRLData.spamFolder(fNormalizeFolder(RL.settingsGet('SpamFolder')));
		oRLData.trashFolder(fNormalizeFolder(RL.settingsGet('TrashFolder')));
		oRLData.archiveFolder(fNormalizeFolder(RL.settingsGet('ArchiveFolder')));

		if (bUpdate)
		{
			RL.remote().saveSystemFolders(Utils.emptyFunction, {
				'SentFolder': oRLData.sentFolder(),
				'DraftFolder': oRLData.draftFolder(),
				'SpamFolder': oRLData.spamFolder(),
				'TrashFolder': oRLData.trashFolder(),
				'ArchiveFolder': oRLData.archiveFolder(),
				'NullFolder': 'NullFolder'
			});
		}

		RL.local().set(Enums.ClientSideKeyName.FoldersLashHash, oData.Result.FoldersHash);
	}
};

WebMailDataStorage.prototype.hideMessageBodies = function ()
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
WebMailDataStorage.prototype.getNextFolderNames = function (bBoot)
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
		var oFolder = RL.cache().getFolderFromCacheList(aItem[1]);
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
WebMailDataStorage.prototype.removeMessagesFromList = function (
	sFromFolderFullNameRaw, aUidForRemove, sToFolderFullNameRaw, bCopy)
{
	sToFolderFullNameRaw = Utils.isNormal(sToFolderFullNameRaw) ? sToFolderFullNameRaw : '';
	bCopy = Utils.isUnd(bCopy) ? false : !!bCopy;

	aUidForRemove = _.map(aUidForRemove, function (mValue) {
		return Utils.pInt(mValue);
	});

	var
		iUnseenCount = 0,
		oData = RL.data(),
		oCache = RL.cache(),
		aMessageList = oData.messageList(),
		oFromFolder = RL.cache().getFolderFromCacheList(sFromFolderFullNameRaw),
		oToFolder = '' === sToFolderFullNameRaw ? null : oCache.getFolderFromCacheList(sToFolderFullNameRaw || ''),
		sCurrentFolderFullNameRaw = oData.currentFolderFullNameRaw(),
		oCurrentMessage = oData.message(),
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
			oData.messageListIsNotCompleted(true);

			_.each(aMessages, function (oMessage) {
				if (oCurrentMessage && oCurrentMessage.hash === oMessage.hash)
				{
					oCurrentMessage = null;
					oData.message(null);
				}

				oMessage.deleted(true);
			});

			_.delay(function () {
				_.each(aMessages, function (oMessage) {
					oData.messageList.remove(oMessage);
				});
			}, 400);
		}
	}

	if ('' !== sFromFolderFullNameRaw)
	{
		oCache.setFolderHash(sFromFolderFullNameRaw, '');
	}

	if ('' !== sToFolderFullNameRaw)
	{
		oCache.setFolderHash(sToFolderFullNameRaw, '');
	}
};

WebMailDataStorage.prototype.setMessage = function (oData, bCached)
{
	var
		bIsHtml = false,
		bHasExternals = false,
		bHasInternals = false,
		oBody = null,
		oTextBody = null,
		sId = '',
		sPlainAsHtml = '',
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
		RL.cache().addRequestedMessage(oMessage.folderFullNameRaw, oMessage.uid);

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
					oBody
						.html(oData.Result.Html.toString())
						.linkify().find('.linkified').removeClass('linkified').end()
						.addClass('b-text-part html')
					;
				}
				else if (Utils.isNormal(oData.Result.Plain) && '' !== oData.Result.Plain)
				{
					bIsHtml = false;
					sPlainAsHtml = Utils.plainToHtml(oData.Result.Plain.toString());

					if ((oMessage.isPgpSigned() || oMessage.isPgpEncrypted()) && RL.data().capaOpenPGP())
					{
						oMessage.plainRaw = Utils.pString(oData.Result.Plain);

						bPgpEncrypted = /---BEGIN PGP MESSAGE---/.test(oMessage.plainRaw);
						if (!bPgpEncrypted)
						{
							bPgpSigned = /-----BEGIN PGP SIGNED MESSAGE-----/.test(oMessage.plainRaw) &&
								/-----BEGIN PGP SIGNATURE-----/.test(oMessage.plainRaw);
						}

						$proxyDiv.empty();
						if (bPgpSigned && oMessage.isPgpSigned())
						{
							sPlainAsHtml =
								$proxyDiv.append(
									$('<pre class="b-plain-openpgp signed"></pre>').text(oMessage.plainRaw)
								).html()
							;
						}
						else if (bPgpEncrypted && oMessage.isPgpEncrypted())
						{
							sPlainAsHtml =
								$proxyDiv.append(
									$('<pre class="b-plain-openpgp encrypted"></pre>').text(oMessage.plainRaw)
								).html()
							;
						}

						$proxyDiv.empty();

						oMessage.isPgpSigned(bPgpSigned);
						oMessage.isPgpEncrypted(bPgpEncrypted);
					}

					oBody
						.html(sPlainAsHtml)
						.linkify().find('.linkified').removeClass('linkified').end()
						.addClass('b-text-part plain')
					;
				}
				else
				{
					bIsHtml = false;
				}

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
				Utils.initBlockquoteSwitcher(oBody);
			}
		}

		RL.cache().initMessageFlagsFromCache(oMessage);
		if (oMessage.unseen())
		{
			RL.setMessageSeen(oMessage);
		}

		Utils.windowResize();
	}
};

/**
 * @param {Array} aList
 * @returns {string}
 */
WebMailDataStorage.prototype.calculateMessageListHash = function (aList)
{
	return _.map(aList, function (oMessage) {
		return '' + oMessage.hash + '_' + oMessage.threadsLen() + '_' + oMessage.flagHash();
	}).join('|');
};

WebMailDataStorage.prototype.setMessageList = function (oData, bCached)
{
	if (oData && oData.Result && 'Collection/MessageCollection' === oData.Result['@Object'] &&
		oData.Result['@Collection'] && Utils.isArray(oData.Result['@Collection']))
	{
		var
			oRainLoopData = RL.data(),
			oCache = RL.cache(),
			mLastCollapsedThreadUids = null,
			iIndex = 0,
			iLen = 0,
			iCount = 0,
			iOffset = 0,
			aList = [],
			iUtc = moment().unix(),
			aStaticList = oRainLoopData.staticMessageList,
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

		oFolder = RL.cache().getFolderFromCacheList(
			Utils.isNormal(oData.Result.Folder) ? oData.Result.Folder : '');

		if (oFolder && !bCached)
		{
			oFolder.interval = iUtc;

			RL.cache().setFolderHash(oData.Result.Folder, oData.Result.FolderHash);

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

			this.initUidNextAndNewMessages(oFolder.fullNameRaw, oData.Result.UidNext, oData.Result.NewMessages);
		}

		if (bUnreadCountChange && oFolder)
		{
			RL.cache().clearMessageFlagsFromCacheByFolder(oFolder.fullNameRaw);
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
					if (oCache.hasNewMessageAndRemoveFromCache(oMessage.folderFullNameRaw, oMessage.uid) && 5 >= iNewCount)
					{
						iNewCount++;
						oMessage.newForAnimation(true);
					}

					oMessage.deleted(false);

					if (bCached)
					{
						RL.cache().initMessageFlagsFromCache(oMessage);
					}
					else
					{
						RL.cache().storeMessageFlagsToCache(oMessage);
					}

					oMessage.lastInCollapsedThread(mLastCollapsedThreadUids && -1 < Utils.inArray(Utils.pInt(oMessage.uid), mLastCollapsedThreadUids) ? true : false);

					aList.push(oMessage);
				}
			}
		}

		oRainLoopData.messageListCount(iCount);
		oRainLoopData.messageListSearch(Utils.isNormal(oData.Result.Search) ? oData.Result.Search : '');
		oRainLoopData.messageListPage(Math.ceil((iOffset / oRainLoopData.messagesPerPage()) + 1));
		oRainLoopData.messageListEndFolder(Utils.isNormal(oData.Result.Folder) ? oData.Result.Folder : '');
		oRainLoopData.messageListEndSearch(Utils.isNormal(oData.Result.Search) ? oData.Result.Search : '');
		oRainLoopData.messageListEndPage(oRainLoopData.messageListPage());

		oRainLoopData.messageList(aList);
		oRainLoopData.messageListIsNotCompleted(false);

		if (aStaticList.length < aList.length)
		{
			oRainLoopData.staticMessageList = aList;
		}

		oCache.clearNewMessageCache();

		if (oFolder && (bCached || bUnreadCountChange || RL.data().useThreads()))
		{
			RL.folderInformation(oFolder.fullNameRaw, aList);
		}
	}
	else
	{
		RL.data().messageListCount(0);
		RL.data().messageList([]);
		RL.data().messageListError(Utils.getNotification(
			oData && oData.ErrorCode ? oData.ErrorCode : Enums.Notification.CantGetMessageList
		));
	}
};

WebMailDataStorage.prototype.findPublicKeyByHex = function (sHash)
{
	return _.find(this.openpgpkeysPublic(), function (oItem) {
		return oItem && sHash === oItem.id;
	});
};

WebMailDataStorage.prototype.findPublicKeysByEmail = function (sEmail)
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
WebMailDataStorage.prototype.findPrivateKeyByEmail = function (sEmail, sPassword)
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
WebMailDataStorage.prototype.findSelfPrivateKey = function (sPassword)
{
	return this.findPrivateKeyByEmail(this.accountEmail(), sPassword);
};
