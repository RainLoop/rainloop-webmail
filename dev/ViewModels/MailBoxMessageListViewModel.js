/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function MailBoxMessageListViewModel()
{
	KnoinAbstractViewModel.call(this, 'Right', 'MailMessageList');

	this.sLastUid = null;
	this.emptySubjectValue = '';

	var oData = RL.data();

	this.popupVisibility = RL.popupVisibility;

	this.messageList = oData.messageList;
	this.currentMessage = oData.currentMessage;
	this.isMessageSelected = oData.isMessageSelected;
	this.messageListSearch = oData.messageListSearch;
	this.messageListError = oData.messageListError;
	this.folderMenuForMove = oData.folderMenuForMove;
	
	this.useCheckboxesInList = oData.useCheckboxesInList;

	this.mainMessageListSearch = oData.mainMessageListSearch;
	this.messageListEndFolder = oData.messageListEndFolder;

	this.messageListChecked = oData.messageListChecked;
	this.messageListCheckedOrSelected = oData.messageListCheckedOrSelected;
	this.messageListCheckedOrSelectedUidsWithSubMails = oData.messageListCheckedOrSelectedUidsWithSubMails;
	this.messageListCompleteLoadingThrottle = oData.messageListCompleteLoadingThrottle;

	Utils.initOnStartOrLangChange(function () {
		this.emptySubjectValue = Utils.i18n('MESSAGE_LIST/EMPTY_SUBJECT_TEXT');
	}, this);

	this.userQuota = oData.userQuota;
	this.userUsageSize = oData.userUsageSize;
	this.userUsageProc = oData.userUsageProc;

	// append drag and drop
	this.dragOver = ko.observable(false).extend({'throttle': 1});
	this.dragOverEnter = ko.observable(false).extend({'throttle': 1});
	this.dragOverArea = ko.observable(null);
	this.dragOverBodyArea = ko.observable(null);

	this.messageListItemTemplate = ko.computed(function () {
		return oData.usePreviewPane() ?
			'MailMessageListItem' : 'MailMessageListItemNoPreviewPane';
	});

	this.messageListSearchDesc = ko.computed(function () {
		var sValue = oData.messageListEndSearch();
		return '' === sValue ? '' : Utils.i18n('MESSAGE_LIST/SEARCH_RESULT_FOR', {'SEARCH': sValue});
	});

	this.messageListPagenator = ko.computed(Utils.computedPagenatorHelper(oData.messageListPage, oData.messageListPageCount));

	this.checkAll = ko.computed({
		'read': function () {
			return 0 < RL.data().messageListCheckedOrSelected().length;
		},

		'write': function (bValue) {
			bValue = !!bValue;
			_.each(RL.data().messageList(), function (oMessage) {
				oMessage.checked(bValue);
			});

			if (!bValue)
			{
				RL.data().message(null);
			}
		}
	});

	this.inputMessageListSearchFocus = ko.observable(false);

	this.sLastSearchValue = '';
	this.inputProxyMessageListSearch = ko.computed({
		'read': this.mainMessageListSearch,
		'write': function (sValue) {
			this.sLastSearchValue = sValue;
		},
		'owner': this
	});

	this.isIncompleteChecked = ko.computed(function () {
		var
			iM = RL.data().messageList().length,
			iC = RL.data().messageListCheckedOrSelected().length
		;
		return 0 < iM && 0 < iC && iM > iC;
	}, this);

	this.hasMessages = ko.computed(function () {
		return 0 < this.messageList().length;
	}, this);

	this.hasCheckedLines = ko.computed(function () {
		return 0 < this.messageListChecked().length;
	}, this);

	this.hasCheckedOrSelectedLines = ko.computed(function () {
		return 0 < this.messageListCheckedOrSelected().length;
	}, this);

	this.isSpamFolder = ko.computed(function () {
		return RL.data().spamFolder() === this.messageListEndFolder();
	}, this);

	this.isTrashFolder = ko.computed(function () {
		return RL.data().trashFolder() === this.messageListEndFolder();
	}, this);

	this.canBeMoved = this.hasCheckedOrSelectedLines;

	this.clearCommand = Utils.createCommand(this, function () {
		kn.showScreenPopup(PopupsFolderClearViewModel, [RL.data().currentFolder()]);
	});

	this.multyForwardCommand = Utils.createCommand(this, function () {
		kn.showScreenPopup(PopupsComposeViewModel, [Enums.ComposeType.ForwardAsAttachment, RL.data().messageListCheckedOrSelected()]);
	}, this.canBeMoved);
	
	this.deleteWithoutMoveCommand = Utils.createCommand(this, function () {
		this.deleteSelectedMessageFromCurrentFolder(Enums.FolderType.Trash, false);
	}, this.canBeMoved);

	this.deleteCommand = Utils.createCommand(this, function () {
		this.deleteSelectedMessageFromCurrentFolder(Enums.FolderType.Trash, true);
	}, this.canBeMoved);
	
	this.spamCommand = Utils.createCommand(this, function () {
		this.deleteSelectedMessageFromCurrentFolder(Enums.FolderType.Spam, true);
	}, this.canBeMoved);

	this.moveCommand = Utils.createCommand(this, Utils.emptyFunction, this.canBeMoved);

	this.setCommand = Utils.createCommand(this, Utils.emptyFunction, this.hasCheckedLines);

	this.checkCommand = Utils.createCommand(this, Utils.emptyFunction, this.hasCheckedLines);

	this.reloadCommand = Utils.createCommand(this, function () {
		if (!RL.data().messageListCompleteLoadingThrottle())
		{
			RL.reloadMessageList(false, true);
		}
	});
	
	this.quotaTooltip = _.bind(this.quotaTooltip, this);
	
	this.selector = new Selector(this.messageList, this.currentMessage,
		'.messageListItem .actionHandle', '.messageListItem.selected', '.messageListItem .checkboxMessage');

	this.selector.on('onItemSelect', _.bind(function (oMessage) {
		if (oMessage)
		{
			oData.message(oData.staticMessageList.populateByMessageListItem(oMessage));
			this.populateMessageBody(oData.message());
		}
		else
		{
			oData.message(null);
		}
	}, this));

	this.selector.on('onItemGetUid', function (oMessage) {
		return oMessage ? oMessage.generateUid() : '';
	});
	
	this.selector.on('onDelete', _.bind(function () {
		if (0 < RL.data().messageListCheckedOrSelected().length)
		{
			this.deleteCommand();
		}
	}, this));
}

Utils.extendAsViewModel('MailBoxMessageListViewModel', MailBoxMessageListViewModel);

/**
 * @type {string}
 */
MailBoxMessageListViewModel.prototype.emptySubjectValue = '';

MailBoxMessageListViewModel.prototype.searchEnterAction = function ()
{
	this.mainMessageListSearch(this.sLastSearchValue);
	this.inputMessageListSearchFocus(false);
};

MailBoxMessageListViewModel.prototype.cancelSearch = function ()
{
	this.mainMessageListSearch('');
	this.inputMessageListSearchFocus(false);
};

/**
 * @param {string} sFromFolderFullNameRaw
 * @param {Array} aUidForRemove
 * @param {string=} sToFolderFullNameRaw
 * @param {boolean=} bCopy = false
 */
MailBoxMessageListViewModel.prototype.removeMessagesFromList = function (sFromFolderFullNameRaw, aUidForRemove, sToFolderFullNameRaw, bCopy)
{
	sToFolderFullNameRaw = Utils.isNormal(sToFolderFullNameRaw) ? sToFolderFullNameRaw : '';
	bCopy = Utils.isUnd(bCopy) ? false : !!bCopy;

	var
		iUnseenCount = 0 ,
		oData = RL.data(),
		oFromFolder = RL.cache().getFolderFromCacheList(sFromFolderFullNameRaw),
		oToFolder = '' === sToFolderFullNameRaw ? null : RL.cache().getFolderFromCacheList(sToFolderFullNameRaw || ''),
		sCurrentFolderFullNameRaw = oData.currentFolderFullNameRaw(),
		oCurrentMessage = oData.message(),
		aMessages = sCurrentFolderFullNameRaw === sFromFolderFullNameRaw ? _.filter(oData.messageList(), function (oMessage) {
			return oMessage && -1 < Utils.inArray(oMessage.uid, aUidForRemove);
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
			_.each(aMessages, function (oMessage) {
				if (oCurrentMessage && oCurrentMessage.requestHash === oMessage.requestHash)
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

			RL.data().messageListIsNotCompleted(true);
			RL.cache().setFolderHash(sFromFolderFullNameRaw, '');
		}

		if (Utils.isNormal(sToFolderFullNameRaw))
		{
			RL.cache().setFolderHash(sToFolderFullNameRaw || '', '');
		}
	}
};

/**
 * @param {string=} sToFolderFullNameRaw
 */
MailBoxMessageListViewModel.prototype.removeCheckedOrSelectedMessagesFromList = function (sToFolderFullNameRaw)
{
	this.removeMessagesFromList(RL.data().currentFolderFullNameRaw(), _.map(RL.data().messageListCheckedOrSelected(), function (oMessage) {
		return oMessage.uid;
	}), sToFolderFullNameRaw);
};

MailBoxMessageListViewModel.prototype.moveOrDeleteResponse = function (sResult, oData)
{
	if (Enums.StorageResultType.Success === sResult && RL.data().currentFolder())
	{
		if (oData && Utils.isArray(oData.Result) && 2 === oData.Result.length)
		{
			RL.cache().setFolderHash(oData.Result[0], oData.Result[1]);
		}
		else
		{
			if (oData && -1 < Utils.inArray(oData.ErrorCode,
				[Enums.Notification.CantMoveMessage, Enums.Notification.CantCopyMessage]))
			{
				window.alert(Utils.getNotification(oData.ErrorCode));
			}

			RL.cache().setFolderHash(RL.data().currentFolderFullNameRaw(), '');
		}

		RL.reloadMessageList();
		
		RL.quotaDebounce();
	}
};

/**
 * @param {string} sFromFolderFullNameRaw
 * @param {Array} aUidForRemove
 * @param {string} sToFolderFullNameRaw
 * @param {boolean=} bCopy = false
 */
MailBoxMessageListViewModel.prototype.moveMessagesToFolder = function (sFromFolderFullNameRaw, aUidForRemove, sToFolderFullNameRaw, bCopy)
{
	if (sFromFolderFullNameRaw !== sToFolderFullNameRaw && Utils.isArray(aUidForRemove) && 0 < aUidForRemove.length)
	{
		var 
			oFromFolder = RL.cache().getFolderFromCacheList(sFromFolderFullNameRaw),
			oToFolder = RL.cache().getFolderFromCacheList(sToFolderFullNameRaw)
		;
		
		if (oFromFolder && oToFolder)
		{
			bCopy = Utils.isUnd(bCopy) ? false : !!bCopy;

			RL.remote()[bCopy ? 'messagesCopy' : 'messagesMove'](
				_.bind(this.moveOrDeleteResponse, this),
				oFromFolder.fullNameRaw,
				oToFolder.fullNameRaw,
				aUidForRemove
			);

			oToFolder.actionBlink(true);

			this.removeMessagesFromList(sFromFolderFullNameRaw, aUidForRemove, sToFolderFullNameRaw, bCopy);
			return true;
		}
	}

	return false;
};

/**
 * @param {string} sToFolderFullNameRaw
 * @return {boolean}
 */
MailBoxMessageListViewModel.prototype.moveSelectedMessagesToFolder = function (sToFolderFullNameRaw)
{
	if (this.canBeMoved())
	{
		return this.moveMessagesToFolder(RL.data().currentFolderFullNameRaw(), 
			RL.data().messageListCheckedOrSelectedUidsWithSubMails(), sToFolderFullNameRaw);
	}

	return false;
};

/**
 * @param {number} iType
 * @param {boolean=} bUseFolder = true
 */
MailBoxMessageListViewModel.prototype.deleteSelectedMessageFromCurrentFolder = function (iType, bUseFolder)
{
	if (this.canBeMoved())
	{
		bUseFolder = Utils.isUnd(bUseFolder) ? true : !!bUseFolder;
		var oTrashOrSpamFolder = RL.cache().getFolderFromCacheList(
			Enums.FolderType.Spam === iType ? RL.data().spamFolder() : RL.data().trashFolder());

		if (!oTrashOrSpamFolder && bUseFolder)
		{
			kn.showScreenPopup(PopupsFolderSystemViewModel, [
				Enums.FolderType.Spam === iType ? Enums.SetSystemFoldersNotification.Spam : Enums.SetSystemFoldersNotification.Trash]);
		}
		else if (!bUseFolder || (oTrashOrSpamFolder && (Consts.Values.UnuseOptionValue === oTrashOrSpamFolder.fullNameRaw ||
			RL.data().currentFolderFullNameRaw() === oTrashOrSpamFolder.fullNameRaw)))
		{
			RL.remote().messagesDelete(
				_.bind(this.moveOrDeleteResponse, this),
				RL.data().currentFolderFullNameRaw(),
				RL.data().messageListCheckedOrSelectedUidsWithSubMails()
			);

			this.removeCheckedOrSelectedMessagesFromList();
		}
		else if (oTrashOrSpamFolder)
		{
			RL.remote().messagesMove(
				_.bind(this.moveOrDeleteResponse, this),
				RL.data().currentFolderFullNameRaw(),
				oTrashOrSpamFolder.fullNameRaw,
				RL.data().messageListCheckedOrSelectedUidsWithSubMails()
			);

			oTrashOrSpamFolder.actionBlink(true);
			this.removeCheckedOrSelectedMessagesFromList(oTrashOrSpamFolder.fullNameRaw);
		}
	}
};

MailBoxMessageListViewModel.prototype.dragAndDronHelper = function (oMessageListItem, bCopy)
{
	if (oMessageListItem)
	{
		oMessageListItem.checked(true);
	}

	var oEl = Utils.draggeblePlace();
	oEl.data('rl-folder', RL.data().currentFolderFullNameRaw());
	oEl.data('rl-uids', RL.data().messageListCheckedOrSelectedUidsWithSubMails());
	oEl.data('rl-copy', bCopy ? '1' : '0');
	oEl.find('.text').text((bCopy ? '+' : '') + '' + RL.data().messageListCheckedOrSelectedUidsWithSubMails().length);

	return oEl;
};

/**
 * @param {string} sResult
 * @param {AjaxJsonDefaultResponse} oData
 * @param {boolean} bCached
 */
MailBoxMessageListViewModel.prototype.onMessageResponse = function (sResult, oData, bCached)
{
	var oRainLoopData = RL.data();
	
	oRainLoopData.messageLoading(false);
	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		oRainLoopData.setMessage(oData, bCached);
	}
	else if (Enums.StorageResultType.Unload === sResult)
	{
		oRainLoopData.message(null);
		oRainLoopData.messageError('');
	}
	else if (Enums.StorageResultType.Abort !== sResult)
	{
		oRainLoopData.message(null);
		oRainLoopData.messageError((oData && oData.ErrorCode ?
			Utils.getNotification(oData.ErrorCode) :
			Utils.getNotification(Enums.Notification.UnknownError)));
	}
};

MailBoxMessageListViewModel.prototype.populateMessageBody = function (oMessage)
{
	if (oMessage)
	{
		if (RL.remote().message(this.onMessageResponse, oMessage.folderFullNameRaw, oMessage.uid))
		{
			RL.data().messageLoading(true);
		}
		else
		{
			Utils.log('Error: Unknown message request: ' + oMessage.folderFullNameRaw + ' ~ ' + oMessage.uid + ' [e-101]');
		}
	}
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {number} iSetAction
 * @param {Array=} aMessages = null
 */
MailBoxMessageListViewModel.prototype.setAction = function (sFolderFullNameRaw, iSetAction, aMessages)
{
	var
		aUids = [],
		oFolder = null,
		oCache = RL.cache(),
		iAlreadyUnread = 0
	;

	if (Utils.isUnd(aMessages))
	{
		aMessages = RL.data().messageListChecked();
	}

	aUids = _.map(aMessages, function (oMessage) {
		return oMessage.uid;
	});

	if ('' !== sFolderFullNameRaw && 0 < aUids.length)
	{
		switch (iSetAction) {
		case Enums.MessageSetAction.SetSeen:
			_.each(aMessages, function (oMessage) {
				if (oMessage.unseen())
				{
					iAlreadyUnread++;
				}

				oMessage.unseen(false);
				oCache.storeMessageFlagsToCache(oMessage);
			});

			oFolder = oCache.getFolderFromCacheList(sFolderFullNameRaw);
			if (oFolder)
			{
				oFolder.messageCountUnread(oFolder.messageCountUnread() - iAlreadyUnread);
			}

			RL.remote().messageSetSeen(Utils.emptyFunction, sFolderFullNameRaw, aUids, true);
			break;
		case Enums.MessageSetAction.UnsetSeen:
			_.each(aMessages, function (oMessage) {
				if (oMessage.unseen())
				{
					iAlreadyUnread++;
				}

				oMessage.unseen(true);
				oCache.storeMessageFlagsToCache(oMessage);
			});

			oFolder = oCache.getFolderFromCacheList(sFolderFullNameRaw);
			if (oFolder)
			{
				oFolder.messageCountUnread(oFolder.messageCountUnread() - iAlreadyUnread + aUids.length);
			}
			RL.remote().messageSetSeen(Utils.emptyFunction, sFolderFullNameRaw, aUids, false);
			break;
		case Enums.MessageSetAction.SetFlag:
			_.each(aMessages, function (oMessage) {
				oMessage.flagged(true);
				oCache.storeMessageFlagsToCache(oMessage);
			});
			RL.remote().messageSetFlagged(Utils.emptyFunction, sFolderFullNameRaw, aUids, true);
			break;
		case Enums.MessageSetAction.UnsetFlag:
			_.each(aMessages, function (oMessage) {
				oMessage.flagged(false);
				oCache.storeMessageFlagsToCache(oMessage);
			});
			RL.remote().messageSetFlagged(Utils.emptyFunction, sFolderFullNameRaw, aUids, false);
			break;
		}

		RL.reloadFlagsCurrentMessageListAndMessageFromCache();
	}
};

/**
 * @param {string} sFolderFullNameRaw
 * @param {number} iSetAction
 */
MailBoxMessageListViewModel.prototype.setActionForAll = function (sFolderFullNameRaw, iSetAction)
{
	var
		oFolder = null,
		aMessages = RL.data().messageList(),
		oCache = RL.cache()
	;

	if ('' !== sFolderFullNameRaw)
	{
		oFolder = oCache.getFolderFromCacheList(sFolderFullNameRaw);

		if (oFolder)
		{
			switch (iSetAction) {
			case Enums.MessageSetAction.SetSeen:
				oFolder = oCache.getFolderFromCacheList(sFolderFullNameRaw);
				if (oFolder)
				{
					_.each(aMessages, function (oMessage) {
						oMessage.unseen(false);
					});

					oFolder.messageCountUnread(0);
					oCache.clearMessageFlagsFromCacheByFolder(sFolderFullNameRaw);
				}

				RL.remote().messageSetSeenToAll(Utils.emptyFunction, sFolderFullNameRaw, true);
				break;
			case Enums.MessageSetAction.UnsetSeen:
				oFolder = oCache.getFolderFromCacheList(sFolderFullNameRaw);
				if (oFolder)
				{
					_.each(aMessages, function (oMessage) {
						oMessage.unseen(true);
					});

					oFolder.messageCountUnread(oFolder.messageCountAll());
					oCache.clearMessageFlagsFromCacheByFolder(sFolderFullNameRaw);
				}
				RL.remote().messageSetSeenToAll(Utils.emptyFunction, sFolderFullNameRaw, false);
				break;
			}

			RL.reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	}
};

MailBoxMessageListViewModel.prototype.listSetSeen = function ()
{
	this.setAction(RL.data().currentFolderFullNameRaw(), Enums.MessageSetAction.SetSeen, RL.data().messageListCheckedOrSelected());
};

MailBoxMessageListViewModel.prototype.listSetAllSeen = function ()
{
	this.setActionForAll(RL.data().currentFolderFullNameRaw(), Enums.MessageSetAction.SetSeen);
};

MailBoxMessageListViewModel.prototype.listUnsetSeen = function ()
{
	this.setAction(RL.data().currentFolderFullNameRaw(), Enums.MessageSetAction.UnsetSeen, RL.data().messageListCheckedOrSelected());
};

MailBoxMessageListViewModel.prototype.listSetFlags = function ()
{
	this.setAction(RL.data().currentFolderFullNameRaw(), Enums.MessageSetAction.SetFlag, RL.data().messageListCheckedOrSelected());
};

MailBoxMessageListViewModel.prototype.listUnsetFlags = function ()
{
	this.setAction(RL.data().currentFolderFullNameRaw(), Enums.MessageSetAction.UnsetFlag, RL.data().messageListCheckedOrSelected());
};

MailBoxMessageListViewModel.prototype.onBuild = function (oDom)
{
	var 
		self = this,
		oData = RL.data()
	;

	this.oContentVisible = $('.b-content', oDom);
	this.oContentScrollable = $('.content', this.oContentVisible);

	this.oContentVisible.on('click', '.fullThreadHandle', function () {
		var
			aList = [],
			oMessage = ko.dataFor(this)
		;

		if (oMessage && !oMessage.lastInCollapsedThreadLoading())
		{
			RL.data().messageListThreadFolder(oMessage.folderFullNameRaw);

			aList = RL.data().messageListThreadUids();

			if (oMessage.lastInCollapsedThread())
			{
				aList.push(0 < oMessage.parentUid() ? oMessage.parentUid() : oMessage.uid);
			}
			else
			{
				aList = _.without(aList, 0 < oMessage.parentUid() ? oMessage.parentUid() : oMessage.uid);
			}

			RL.data().messageListThreadUids(_.uniq(aList));

			oMessage.lastInCollapsedThreadLoading(true);
			oMessage.lastInCollapsedThread(!oMessage.lastInCollapsedThread());
			RL.reloadMessageList();
		}

		return false;
	});

	this.selector.init(this.oContentVisible, this.oContentScrollable);

	$document.on('keydown', function (oEvent) {

		var
			bResult = true,
			iKeyCode = oEvent ? oEvent.keyCode : 0
		;

		if (oEvent && self.viewModelVisibility() && oData.useKeyboardShortcuts() && !RL.popupVisibility() && !oData.messageFullScreenMode() && !Utils.inFocus())
		{
			if (oData.usePreviewPane() || (!oData.message() && (Enums.EventKeyCode.Delete === iKeyCode || Enums.EventKeyCode.A === iKeyCode)))
			{
				if (oEvent.ctrlKey && Enums.EventKeyCode.A === iKeyCode)
				{
					self.checkAll(!(self.checkAll() && !self.isIncompleteChecked()));
					bResult = false;
				}
			}
		}

		return bResult;
	});

	oDom
		.on('click', '.e-pagenator .e-page', function () {
			var oPage = ko.dataFor(this);
			if (oPage)
			{
				kn.setHash(RL.link().mailBox(
					oData.currentFolderFullNameHash(),
					oPage.value,
					oData.messageListSearch()
				));
			}
		})
		.on('click', '.messageList .checkboxCkeckAll', function () {
			self.checkAll(!self.checkAll());
		})
		.on('click', '.messageList .messageListItem .flagParent', function () {

			var
				oMessage = ko.dataFor(this),
				aChecked = oData.messageListCheckedOrSelected(),
				aCheckedUids = []
			;

			if (oMessage)
			{
				if (0 < aChecked.length)
				{
					aCheckedUids = _.map(aChecked, function (oMessage) {
						return oMessage.uid;
					});
				}

				if (0 < aCheckedUids.length && -1 < Utils.inArray(oMessage.uid, aCheckedUids))
				{
					self.setAction(oMessage.folderFullNameRaw, oMessage.flagged() ?
						Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
				}
				else
				{
					self.setAction(oMessage.folderFullNameRaw, oMessage.flagged() ?
						Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, [oMessage]);
				}
			}
		})
	;

	ko.computed(function () {

		var
			oData = RL.data(),
			bViewModelVisibility = this.viewModelVisibility(),
			bPopupVisibility = RL.popupVisibility(),
			bUseKeyboardShortcuts = oData.useKeyboardShortcuts(),
			bMessageFullScreenMode = oData.messageFullScreenMode()
		;

		this.selector.useKeyboard(bViewModelVisibility && bUseKeyboardShortcuts && !bMessageFullScreenMode && !bPopupVisibility);

	}, this).extend({'notify': 'always'});

	this.initUploaderForAppend();
};

MailBoxMessageListViewModel.prototype.composeClick = function ()
{
	kn.showScreenPopup(PopupsComposeViewModel);
};

MailBoxMessageListViewModel.prototype.advancedSearchClick = function ()
{
	kn.showScreenPopup(PopupsAdvancedSearchViewModel);
};

MailBoxMessageListViewModel.prototype.quotaTooltip = function ()
{
	return Utils.i18n('MESSAGE_LIST/QUOTA_SIZE', {
		'SIZE': Utils.friendlySize(this.userUsageSize()),
		'PROC': this.userUsageProc(),
		'LIMIT': Utils.friendlySize(this.userQuota())
	});
};

MailBoxMessageListViewModel.prototype.initUploaderForAppend = function ()
{
	if (!RL.settingsGet('AllowAppendMessage') || !this.dragOverArea())
	{
		return false;
	}

	var oJua = new Jua({
		'action': RL.link().append(),
		'name': 'AppendFile',
		'queueSize': 1,
		'multipleSizeLimit': 1,
		'disableFolderDragAndDrop': true,
		'hidden': {
			'Folder': function () {
				return RL.data().currentFolderFullNameRaw();
			}
		},
		'dragAndDropElement': this.dragOverArea(),
		'dragAndDropBodyElement': this.dragOverBodyArea(),
		'onDragEnter': _.bind(function () {
			this.dragOverEnter(true);
		}, this),
		'onDragLeave': _.bind(function () {
			this.dragOverEnter(false);
		}, this),
		'onBodyDragEnter': _.bind(function () {
			this.dragOver(true);
		}, this),
		'onBodyDragLeave': _.bind(function () {
			this.dragOver(false);
		}, this),
		'onSelect': _.bind(function (sUid, oData) {
			if (sUid && oData && 'message/rfc822' === oData['Type'])
			{
				RL.data().messageListLoading(true);
				return true;
			}
			
			return false;
		}),
		'onComplete': _.bind(function () {
			RL.reloadMessageList(true, true);
		}, this)
	});

	return !!oJua;
};