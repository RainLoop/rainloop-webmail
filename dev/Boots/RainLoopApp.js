/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

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

	this.iSuggestionsLimit = Utils.pInt(this.settingsGet('SuggestionsLimit'));
	this.iSuggestionsLimit = 0 === this.iSuggestionsLimit ? 20 : this.iSuggestionsLimit;

	this.quotaDebounce = _.debounce(this.quota, 1000 * 30);

	$.wakeUp(function (iSleepTime) {
		RL.remote().jsInfo(Utils.emptyFunction, {'WakeUpTime': Math.round(iSleepTime / 1000)}, true);
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

/**
 * @return {WebMailCacheStorage}
 */
RainLoopApp.prototype.cache = function ()
{
	if (null === this.oCache)
	{
		this.oCache = new WebMailCacheStorage();
	}

	return this.oCache;
};

RainLoopApp.prototype.reloadFlagsCurrentMessageListAndMessageFromCache = function ()
{
	var oCache = RL.cache();
	_.each(RL.data().messageList(), function (oMessage) {
		oCache.initMessageFlagsFromCache(oMessage);
	});

	oCache.initMessageFlagsFromCache(RL.data().message());
};

/**
 * @param {boolean=} bDropPagePosition = false
 * @param {boolean=} bDropCurrenFolderCache = false
 */
RainLoopApp.prototype.reloadMessageList = function (bDropPagePosition, bDropCurrenFolderCache)
{
	var
		oRLData = RL.data(),
		iOffset = (oRLData.messageListPage() - 1) * oRLData.messagesPerPage()
	;

	if (Utils.isUnd(bDropCurrenFolderCache) ? false : !!bDropCurrenFolderCache)
	{
		RL.cache().setFolderHash(oRLData.currentFolderFullNameRaw(), '');
	}

	if (Utils.isUnd(bDropPagePosition) ? false : !!bDropPagePosition)
	{
		oRLData.messageListPage(1);
		iOffset = 0;
	}

	oRLData.messageListLoading(true);
	RL.remote().messageList(function (sResult, oData, bCached) {

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			oRLData.messageListError('');
			oRLData.messageListLoading(false);
			oRLData.setMessageList(oData, bCached);
		}
		else if (Enums.StorageResultType.Unload === sResult)
		{
			oRLData.messageListError('');
			oRLData.messageListLoading(false);
		}
		else if (Enums.StorageResultType.Abort !== sResult)
		{
			oRLData.messageList([]);
			oRLData.messageListLoading(false);
			oRLData.messageListError(oData && oData.ErrorCode ?
				Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_GET_MESSAGE_LIST')
			);
		}

	}, oRLData.currentFolderFullNameRaw(), iOffset, oRLData.messagesPerPage(), oRLData.messageListSearch());
};

RainLoopApp.prototype.recacheInboxMessageList = function ()
{
	RL.remote().messageList(Utils.emptyFunction, 'INBOX', 0, RL.data().messagesPerPage(), '', true);
};

/**
 * @param {boolean=} bUseCache = true
 * @param {Function=} fCallback
 */
RainLoopApp.prototype.folders = function (bUseCache, fCallback)
{
	this.data().foldersLoading(true);
	this.remote().folders(_.bind(function (sResult, oData, bCached) {

		RL.data().foldersLoading(false);
		if (Enums.StorageResultType.Success === sResult)
		{
			this.data().setFolders(oData, bCached);
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
	}, this), bUseCache);
};

RainLoopApp.prototype.accountsAndIdentities = function ()
{
	var oRainLoopData = RL.data();
	
	oRainLoopData.accountsLoading(true);
	oRainLoopData.identitiesLoading(true);

	RL.remote().accountsAndIdentities(function (sResult, oData) {

		oRainLoopData.accountsLoading(false);
		oRainLoopData.identitiesLoading(false);
		
		if (Enums.StorageResultType.Success === sResult && oData.Result)
		{
			var 
				sParentEmail = RL.settingsGet('ParentEmail'),
				sAccountEmail = oRainLoopData.accountEmail()
			;
			
			sParentEmail = '' === sParentEmail ? sAccountEmail : sParentEmail;

			if (Utils.isArray(oData.Result['Accounts']))
			{
				oRainLoopData.accounts(_.map(oData.Result['Accounts'], function (sValue) {
					return new AccountModel(sValue, sValue !== sParentEmail);
				}));
			}
			
			if (Utils.isArray(oData.Result['Identities']))
			{
				oRainLoopData.identities(_.map(oData.Result['Identities'], function (oIdentityData) {
					
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
			Utils.isArray(oData.Result) && 2 === oData.Result.length &&
			Utils.isPosNumeric(oData.Result[0], true) && Utils.isPosNumeric(oData.Result[1], true))
		{
			RL.data().userQuota(Utils.pInt(oData.Result[1]) * 1024);
			RL.data().userUsageSize(Utils.pInt(oData.Result[0]) * 1024);
		}
	});
};

/**
 * @param {string} sFolder
 * @param {Array=} aList = []
 */
RainLoopApp.prototype.folderInformation = function (sFolder, aList)
{
	this.remote().folderInformation(function (sResult, oData) {
		if (Enums.StorageResultType.Success === sResult)
		{
			if (oData && oData.Result && oData.Result.Hash && oData.Result.Folder)
			{
				var
					sHash = RL.cache().getFolderHash(oData.Result.Folder),
					oFolder = RL.cache().getFolderFromCacheList(oData.Result.Folder),
					bCheck = false,
					sUid = '',
					aList = [],
					bUnreadCountChange = false,
					oFlags = null
				;

				if (oFolder)
				{
					if (oData.Result.Hash)
					{
						RL.cache().setFolderHash(oData.Result.Folder, oData.Result.Hash);
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
						RL.cache().clearMessageFlagsFromCacheByFolder(oFolder.fullNameRaw);
					}

					if (oData.Result.Flags)
					{
						for (sUid in oData.Result.Flags)
						{
							if (oData.Result.Flags.hasOwnProperty(sUid))
							{
								bCheck = true;
								oFlags = oData.Result.Flags[sUid];
								RL.cache().storeMessageFlagsToCacheByFolderAndUid(oFolder.fullNameRaw, sUid.toString(), [
									!oFlags['IsSeen'], !!oFlags['IsFlagged'], !!oFlags['IsAnswered'], !!oFlags['IsForwarded']
								]);
							}
						}

						if (bCheck)
						{
							RL.reloadFlagsCurrentMessageListAndMessageFromCache();
						}
					}

					RL.data().initUidNextAndNewMessages(oFolder.fullNameRaw, oData.Result.UidNext, oData.Result.NewMessages);

					if (oData.Result.Hash !== sHash || '' === sHash)
					{
						if (oFolder.fullNameRaw === RL.data().currentFolderFullNameRaw())
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
						if (oFolder.fullNameRaw === RL.data().currentFolderFullNameRaw())
						{
							aList = RL.data().messageList();
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
};

RainLoopApp.prototype.setMessageSeen = function (oMessage)
{
	if (oMessage.unseen())
	{
		oMessage.unseen(false);

		var oFolder = RL.cache().getFolderFromCacheList(oMessage.folderFullNameRaw);
		if (oFolder)
		{
			oFolder.messageCountUnread(0 <= oFolder.messageCountUnread() - 1 ?
				oFolder.messageCountUnread() - 1 : 0);
		}

		RL.cache().storeMessageFlagsToCache(oMessage);
		RL.reloadFlagsCurrentMessageListAndMessageFromCache();
	}

	RL.remote().messageSetSeen(Utils.emptyFunction, oMessage.folderFullNameRaw, [oMessage.uid], true);
};

RainLoopApp.prototype.googleConnect = function ()
{
	window.open(RL.link().socialGoogle(), 'Google', 'left=200,top=100,width=650,height=600,menubar=no,status=no,resizable=yes,scrollbars=yes');
};

RainLoopApp.prototype.twitterConnect = function ()
{
	window.open(RL.link().socialTwitter(), 'Twitter', 'left=200,top=100,width=650,height=350,menubar=no,status=no,resizable=yes,scrollbars=yes');
};

RainLoopApp.prototype.facebookConnect = function ()
{
	window.open(RL.link().socialFacebook(), 'Facebook', 'left=200,top=100,width=650,height=335,menubar=no,status=no,resizable=yes,scrollbars=yes');
};

/**
 * @param {boolean=} bFireAllActions
 */
RainLoopApp.prototype.socialUsers = function (bFireAllActions)
{
	var oRainLoopData = RL.data();

	if (bFireAllActions)
	{
		oRainLoopData.googleActions(true);
		oRainLoopData.facebookActions(true);
		oRainLoopData.twitterActions(true);
	}

	RL.remote().socialUsers(function (sResult, oData) {

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			oRainLoopData.googleUserName(oData.Result['Google'] || '');
			oRainLoopData.facebookUserName(oData.Result['Facebook'] || '');
			oRainLoopData.twitterUserName(oData.Result['Twitter'] || '');
		}
		else
		{
			oRainLoopData.googleUserName('');
			oRainLoopData.facebookUserName('');
			oRainLoopData.twitterUserName('');
		}

		oRainLoopData.googleLoggined('' !== oRainLoopData.googleUserName());
		oRainLoopData.facebookLoggined('' !== oRainLoopData.facebookUserName());
		oRainLoopData.twitterLoggined('' !== oRainLoopData.twitterUserName());

		oRainLoopData.googleActions(false);
		oRainLoopData.facebookActions(false);
		oRainLoopData.twitterActions(false);
	});
};

RainLoopApp.prototype.googleDisconnect = function ()
{
	RL.data().googleActions(true);
	RL.remote().googleDisconnect(function () {
		RL.socialUsers();
	});
};

RainLoopApp.prototype.facebookDisconnect = function ()
{
	RL.data().facebookActions(true);
	RL.remote().facebookDisconnect(function () {
		RL.socialUsers();
	});
};

RainLoopApp.prototype.twitterDisconnect = function ()
{
	RL.data().twitterActions(true);
	RL.remote().twitterDisconnect(function () {
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
			'disable': false
		});
	}

	for (iIndex = 0, iLen = aSystem.length; iIndex < iLen; iIndex++)
	{
		oItem = aSystem[iIndex];
		if (fVisibleCallback ? fVisibleCallback.call(null, oItem) : true)
		{
			aResult.push({
				'id': oItem.fullNameRaw,
				'system': true,
				'name': fRenameCallback ? fRenameCallback.call(null, oItem) : oItem.name(),
				'disable': !oItem.selectable || -1 < Utils.inArray(oItem.fullNameRaw, aDisabled) ||
					(fDisableCallback ? fDisableCallback.call(null, oItem) : false)
			});
		}
	}

	for (iIndex = 0, iLen = aList.length; iIndex < iLen; iIndex++)
	{
		oItem = aList[iIndex];
		if (!oItem.isGmailFolder && (oItem.subScribed() || !oItem.existen))
		{
			if (fVisibleCallback ? fVisibleCallback.call(null, oItem) : true)
			{
				if (Enums.FolderType.User === oItem.type() || !bSystem || (!oItem.isNamespaceFolder && 0 < oItem.subFolders().length))
				{
					aResult.push({
						'id': oItem.fullNameRaw,
						'system': false,
						'name': (new window.Array(oItem.deep + 1 - iUnDeep)).join(sDeepPrefix) + 
							(fRenameCallback ? fRenameCallback.call(null, oItem) : oItem.name()),
						'disable': !oItem.selectable || -1 < Utils.inArray(oItem.fullNameRaw, aDisabled) ||
							(Enums.FolderType.User !== oItem.type()) ||
							(fDisableCallback ? fDisableCallback.call(null, oItem) : false)
					});
				}
			}
		}
		
		if (oItem.subScribed() && 0 < oItem.subFolders().length)
		{
			aResult = aResult.concat(RL.folderListOptionsBuilder([], oItem.subFolders(), aDisabled, [],
				oItem.isUnpaddigFolder ? iUnDeep + 1 : iUnDeep,
				fDisableCallback, fVisibleCallback, fRenameCallback, bSystem, bBuildUnvisible));
		}
	}

	return aResult;
};

/**
 * @param {string} sQuery
 * @param {number} iPage
 * @param {Function} fCallback
 */
RainLoopApp.prototype.getAutocomplete = function (sQuery, iPage, fCallback)
{
	var
		aData = []
	;

	RL.remote().suggestions(function (sResult, oData) {
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result && Utils.isArray(oData.Result.List))
		{
			aData = _.map(oData.Result.List, function (aItem) {
				return aItem && aItem[0] ? new EmailModel(aItem[0], aItem[1]) : null;
			});

			fCallback(_.compact(aData), !!oData.Result.More);
		}
		else if (Enums.StorageResultType.Abort !== sResult)
		{
			fCallback([], false);
		}
	}, sQuery, iPage);
};

RainLoopApp.prototype.emailsPicsHashes = function ()
{
	RL.remote().emailsPicsHashes(function (sResult, oData) {
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			RL.cache().setEmailsPicsHashesData(oData.Result);
		}
	});
};

RainLoopApp.prototype.bootstart = function ()
{
	AbstractApp.prototype.bootstart.call(this);

	RL.data().populateDataOnStart();

	var
		sCustomLoginLink = '',
		sJsHash = this.settingsGet('JsHash'),
		bGoogle = this.settingsGet('AllowGoogleSocial'),
		bFacebook = this.settingsGet('AllowFacebookSocial'),
		bTwitter = this.settingsGet('AllowTwitterSocial')
	;
	
	if (!this.settingsGet('AllowChangePassword'))
	{
		Utils.removeSettingsViewModel(SettingsChangePasswordScreen);
	}
	
	if (!this.settingsGet('AllowAdditionalAccounts'))
	{
		Utils.removeSettingsViewModel(SettingsAccounts);
	}
	
	if (this.settingsGet('AllowIdentities'))
	{
		Utils.removeSettingsViewModel(SettingsIdentity);
	}
	else
	{
		Utils.removeSettingsViewModel(SettingsIdentities);
	}

	if (!bGoogle && !bFacebook && !bTwitter)
	{
		Utils.removeSettingsViewModel(SettingsSocialScreen);
	}
	
	if (!this.settingsGet('AllowThemes'))
	{
		Utils.removeSettingsViewModel(SettingsThemes);
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

	if (!!this.settingsGet('Auth'))
	{
		this.setTitle(Utils.i18n('TITLES/LOADING'));

		this.folders(true, _.bind(function (bValue) {

			kn.hideLoading();

			if (bValue)
			{
				kn.startScreens([MailBoxScreen, SettingsScreen]);
				
				// setup maito protocol
				$document.on('mousedown', '#rl-center a', function (oEvent) {
					if (oEvent && 3 !== oEvent['which'])
					{
						var oEmailModel = null, sHref = $(this).attr('href');
						if (sHref && 'mailto:' === sHref.toString().toLowerCase().substr(0, 7))
						{
							oEmailModel = new EmailModel();
							oEmailModel.parse(window.decodeURI(sHref.toString().substr(7)));
							if (oEmailModel && oEmailModel.email)
							{
								kn.showScreenPopup(PopupsComposeViewModel, [Enums.ComposeType.Empty, null, [oEmailModel]]);
								return false;
							}
						}
					}

					return true;
				});

				if (bGoogle || bFacebook || bTwitter)
				{
					RL.socialUsers(true);
				}

				_.delay(function () {

					RL.emailsPicsHashes();

					RL.remote().servicesPics(function (sResult, oData) {
						if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
						{
							RL.cache().setServicesData(oData.Result);
						}
					});
				}, 1000);

				Plugins.runHook('rl-start-user-screens');
			}
			else
			{
				kn.startScreens([LoginScreen]);
				Plugins.runHook('rl-start-login-screens');
			}

			if (window.SimplePace)
			{
				window.SimplePace.set(100);
			}

			if (!Globals.bMobileDevice)
			{
				_.defer(function () {
					Utils.initLayoutResizer('#rl-top-resizer-left', '#rl-top-resizer-right', '#rl-center',
						120, 300, 200, 600, Enums.ClientSideKeyName.FolderListSize);
				});
			}
			
		}, this));
	}
	else
	{
		sCustomLoginLink = Utils.pString(this.settingsGet('CustomLoginLink'));
		if (!sCustomLoginLink)
		{
			kn.hideLoading();
			kn.startScreens([LoginScreen]);

			Plugins.runHook('rl-start-login-screens');

			if (window.SimplePace)
			{
				window.SimplePace.set(100);
			}
		}
		else
		{
			kn.routeOff();
			kn.setHash(RL.link().root(), true);
			kn.routeOff();

			_.defer(function () {
				window.location.href = sCustomLoginLink;
			});
		}
	}

	if (bGoogle)
	{
		window['rl_' + sJsHash + '_google_service'] = function () {
			RL.data().googleActions(true);
			RL.socialUsers();
		};
	}

	if (bFacebook)
	{
		window['rl_' + sJsHash + '_facebook_service'] = function () {
			RL.data().facebookActions(true);
			RL.socialUsers();
		};
	}

	if (bTwitter)
	{
		window['rl_' + sJsHash + '_twitter_service'] = function () {
			RL.data().twitterActions(true);
			RL.socialUsers();
		};
	}

	Plugins.runHook('rl-start-screens');
};

/**
 * @type {RainLoopApp}
 */
RL = new RainLoopApp();
