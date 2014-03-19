/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function MailBoxMessageListViewModel()
{
	KnoinAbstractViewModel.call(this, 'Right', 'MailMessageList');

	this.sLastUid = null;
	this.bPrefetch = false;
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
		return Enums.Layout.NoPreview !== oData.layout() ?
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

	this.isSpamDisabled = ko.computed(function () {
		return Consts.Values.UnuseOptionValue === RL.data().spamFolder();
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
		RL.deleteMessagesFromFolder(Enums.FolderType.Trash,
			RL.data().currentFolderFullNameRaw(),
			RL.data().messageListCheckedOrSelectedUidsWithSubMails(), false);
	}, this.canBeMoved);

	this.deleteCommand = Utils.createCommand(this, function () {
		RL.deleteMessagesFromFolder(Enums.FolderType.Trash, 
			RL.data().currentFolderFullNameRaw(),
			RL.data().messageListCheckedOrSelectedUidsWithSubMails(), true);
	}, this.canBeMoved);
	
	this.spamCommand = Utils.createCommand(this, function () {
		RL.deleteMessagesFromFolder(Enums.FolderType.Spam,
			RL.data().currentFolderFullNameRaw(),
			RL.data().messageListCheckedOrSelectedUidsWithSubMails(), true);
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
			if (Enums.Layout.NoPreview === oData.layout())
			{
				kn.setHash(RL.link().messagePreview(), true);
			}
			
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

	RL
		.sub('mailbox.message-list.selector.go-down', function () {
			this.selector.goDown();
		}, this)
		.sub('mailbox.message-list.selector.go-up', function () {
			this.selector.goUp();
		}, this)
	;

	Knoin.constructorEnd(this);
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
 * @param {string} sToFolderFullNameRaw
 * @return {boolean}
 */
MailBoxMessageListViewModel.prototype.moveSelectedMessagesToFolder = function (sToFolderFullNameRaw)
{
	if (this.canBeMoved())
	{
		RL.moveMessagesToFolder(
			RL.data().currentFolderFullNameRaw(),
			RL.data().messageListCheckedOrSelectedUidsWithSubMails(), sToFolderFullNameRaw);
	}

	return false;
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

	oRainLoopData.hideMessageBodies();
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
			if (Enums.Layout.NoPreview !== oData.layout() || (!oData.message() && (Enums.EventKeyCode.Delete === iKeyCode || Enums.EventKeyCode.A === iKeyCode)))
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

	if (!Globals.bMobileDevice && !!RL.settingsGet('AllowPrefetch') && ifvisible)
	{
		ifvisible.setIdleDuration(10);

		ifvisible.idle(function () {
			self.prefetchNextTick();
		});
	}
};

MailBoxMessageListViewModel.prototype.prefetchNextTick = function ()
{
	if (!this.bPrefetch && !ifvisible.now() && this.viewModelVisibility())
	{
		var 
			self = this,
			oCache = RL.cache(),
			oMessage = _.find(this.messageList(), function (oMessage) {
				return oMessage &&
					!oCache.hasRequestedMessage(oMessage.folderFullNameRaw, oMessage.uid);
			})
		;
		
		if (oMessage)
		{
			this.bPrefetch = true;

			RL.cache().addRequestedMessage(oMessage.folderFullNameRaw, oMessage.uid);
			
			RL.remote().message(function (sResult, oData) {
				
				var bNext = !!(Enums.StorageResultType.Success === sResult && oData && oData.Result);
				
				_.delay(function () {
					self.bPrefetch = false;
					if (bNext)
					{
						self.prefetchNextTick();
					}
				}, 1000);
				
			}, oMessage.folderFullNameRaw, oMessage.uid);
		}
	}
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
		'dragAndDropBodyElement': this.dragOverBodyArea()
	});

	oJua
		.on('onDragEnter', _.bind(function () {
			this.dragOverEnter(true);
		}, this))
		.on('onDragLeave', _.bind(function () {
			this.dragOverEnter(false);
		}, this))
		.on('onBodyDragEnter', _.bind(function () {
			this.dragOver(true);
		}, this))
		.on('onBodyDragLeave', _.bind(function () {
			this.dragOver(false);
		}, this))
		.on('onSelect', _.bind(function (sUid, oData) {
			if (sUid && oData && 'message/rfc822' === oData['Type'])
			{
				RL.data().messageListLoading(true);
				return true;
			}

			return false;
		}, this))
		.on('onComplete', _.bind(function () {
			RL.reloadMessageList(true, true);
		}, this))
	;

	return !!oJua;
};