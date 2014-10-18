/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		moment = require('moment'),

		Consts = require('Common/Consts'),
		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),

		Settings = require('Storage/Settings'),
		Cache = require('Storage/User/Cache'),

		kn = require('Knoin/Knoin'),

		MessageModel = require('Model/Message'),

		Local = require('Storage/Local'),
		AbstractData = require('Storage/AbstractData')
	;

	/**
	 * @constructor
	 * @extends AbstractData
	 */
	function DataUserStorage()
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
				aList = [Cache.getFolderInboxName()],
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
				kn.setHash(Links.mailBox(
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
					require('App/User').historyBack();
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
		this.openpgp = null;
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

	_.extend(DataUserStorage.prototype, AbstractData.prototype);

	DataUserStorage.prototype.purgeMessageBodyCache = function()
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

	DataUserStorage.prototype.populateDataOnStart = function()
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

		this.lastFoldersHash = Local.get(Enums.ClientSideKeyName.FoldersLashHash) || '';

		this.remoteSuggestions = !!Settings.settingsGet('RemoteSuggestions');

		this.devEmail = Settings.settingsGet('DevEmail');
		this.devPassword = Settings.settingsGet('DevPassword');
	};

	DataUserStorage.prototype.initUidNextAndNewMessages = function (sFolder, sUidNext, aNewMessages)
	{
		if (Cache.getFolderInboxName() === sFolder && Utils.isNormal(sUidNext) && sUidNext !== '')
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
						Links.notificationMailIcon(),
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
							Links.notificationMailIcon(),
							MessageModel.emailsToLine(MessageModel.initEmailsFromJson(aNewMessages[iIndex].From), false),
							aNewMessages[iIndex].Subject
						);
					}
				}
			}

			Cache.setFolderUidNext(sFolder, sUidNext);
		}
	};

	DataUserStorage.prototype.hideMessageBodies = function ()
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
	DataUserStorage.prototype.getNextFolderNames = function (bBoot)
	{
		bBoot = Utils.isUnd(bBoot) ? false : !!bBoot;

		var
			aResult = [],
			iLimit = 10,
			iUtc = moment().unix(),
			iTimeout = iUtc - 60 * 5,
			aTimeouts = [],
			fSearchFunction = function (aList) {
				var sInboxFolderName = Cache.getFolderInboxName();
				_.each(aList, function (oFolder) {
					if (oFolder && sInboxFolderName !== oFolder.fullNameRaw &&
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
	DataUserStorage.prototype.removeMessagesFromList = function (
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
	 * @param {Object} oMessageTextBody
	 */
	DataUserStorage.prototype.initBlockquoteSwitcher = function (oMessageTextBody)
	{
		if (oMessageTextBody)
		{
			var $oList = $('blockquote:not(.rl-bq-switcher)', oMessageTextBody).filter(function () {
				return 0 === $(this).parent().closest('blockquote', oMessageTextBody).length;
			});

			if ($oList && 0 < $oList.length)
			{
				_.delay(function () {
					$oList.each(function () {
						var $self = $(this), iH = $self.height();
						if (0 === iH || 150 < iH)
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
				}, 100);
			}
		}
	};

	DataUserStorage.prototype.setMessage = function (oData, bCached)
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
						.html(Utils.findEmailAndLinks(sResultHtml))
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
				require('App/User').setMessageSeen(oMessage);
			}

			Utils.windowResize();
		}
	};

	/**
	 * @param {Array} aList
	 * @returns {string}
	 */
	DataUserStorage.prototype.calculateMessageListHash = function (aList)
	{
		return _.map(aList, function (oMessage) {
			return '' + oMessage.hash + '_' + oMessage.threadsLen() + '_' + oMessage.flagHash();
		}).join('|');
	};

	DataUserStorage.prototype.findPublicKeyByHex = function (sHash)
	{
		return _.find(this.openpgpkeysPublic(), function (oItem) {
			return oItem && sHash === oItem.id;
		});
	};

	DataUserStorage.prototype.findPublicKeysByEmail = function (sEmail)
	{
		var self = this;
		return _.compact(_.map(this.openpgpkeysPublic(), function (oItem) {

			var oKey = null;
			if (oItem && sEmail === oItem.email)
			{
				try
				{
					oKey = self.openpgp.key.readArmored(oItem.armor);
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
	DataUserStorage.prototype.findPrivateKeyByEmail = function (sEmail, sPassword)
	{
		var
			self = this,
			oPrivateKey = null,
			oKey = _.find(this.openpgpkeysPrivate(), function (oItem) {
				return oItem && sEmail === oItem.email;
			})
		;

		if (oKey)
		{
			try
			{
				oPrivateKey = self.openpgp.key.readArmored(oKey.armor);
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
	DataUserStorage.prototype.findSelfPrivateKey = function (sPassword)
	{
		return this.findPrivateKeyByEmail(this.accountEmail(), sPassword);
	};

	module.exports = new DataUserStorage();

}());
