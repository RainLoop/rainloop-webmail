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

	this.message = oData.message;
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
			return 0 < RL.data().messageListChecked().length;
		},

		'write': function (bValue) {
			bValue = !!bValue;
			_.each(RL.data().messageList(), function (oMessage) {
				oMessage.checked(bValue);
			});
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
			iC = RL.data().messageListChecked().length
		;
		return 0 < iM && 0 < iC && iM > iC;
	}, this);

	this.hasMessages = ko.computed(function () {
		return 0 < this.messageList().length;
	}, this);

	this.hasCheckedOrSelectedLines = ko.computed(function () {
		return 0 < this.messageListCheckedOrSelected().length;
	}, this);

	this.isSpamFolder = ko.computed(function () {
		return oData.spamFolder() === this.messageListEndFolder() &&
			'' !== oData.spamFolder();
	}, this);

	this.isSpamDisabled = ko.computed(function () {
		return Consts.Values.UnuseOptionValue === oData.spamFolder();
	}, this);

	this.isTrashFolder = ko.computed(function () {
		return oData.trashFolder() === this.messageListEndFolder() &&
			'' !== oData.trashFolder();
	}, this);

	this.isDraftFolder = ko.computed(function () {
		return oData.draftFolder() === this.messageListEndFolder() &&
			'' !== oData.draftFolder();
	}, this);

	this.isSentFolder = ko.computed(function () {
		return oData.sentFolder() === this.messageListEndFolder() &&
			'' !== oData.sentFolder();
	}, this);

	this.isArchiveFolder = ko.computed(function () {
		return oData.archiveFolder() === this.messageListEndFolder() &&
			'' !== oData.archiveFolder();
	}, this);

	this.isArchiveDisabled = ko.computed(function () {
		return Consts.Values.UnuseOptionValue === RL.data().archiveFolder();
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

	this.archiveCommand = Utils.createCommand(this, function () {
		RL.deleteMessagesFromFolder(Enums.FolderType.Archive,
			RL.data().currentFolderFullNameRaw(),
			RL.data().messageListCheckedOrSelectedUidsWithSubMails(), true);
	}, this.canBeMoved);
	
	this.spamCommand = Utils.createCommand(this, function () {
		RL.deleteMessagesFromFolder(Enums.FolderType.Spam,
			RL.data().currentFolderFullNameRaw(),
			RL.data().messageListCheckedOrSelectedUidsWithSubMails(), true);
	}, this.canBeMoved);

	this.moveCommand = Utils.createCommand(this, Utils.emptyFunction, this.canBeMoved);

	this.reloadCommand = Utils.createCommand(this, function () {
		if (!RL.data().messageListCompleteLoadingThrottle())
		{
			RL.reloadMessageList(false, true);
		}
	});
	
	this.quotaTooltip = _.bind(this.quotaTooltip, this);
	
	this.selector = new Selector(this.messageList, this.currentMessage,
		'.messageListItem .actionHandle', '.messageListItem.selected', '.messageListItem .checkboxMessage',
			'.messageListItem.focused');

	this.selector.on('onItemSelect', _.bind(function (oMessage) {
		if (oMessage)
		{
			oData.message(oData.staticMessageList.populateByMessageListItem(oMessage));
			this.populateMessageBody(oData.message());

			if (Enums.Layout.NoPreview === oData.layout())
			{
				kn.setHash(RL.link().messagePreview(), true);
				oData.message.focused(true);
			}
		}
		else
		{
			oData.message(null);
		}
	}, this));

	this.selector.on('onItemGetUid', function (oMessage) {
		return oMessage ? oMessage.generateUid() : '';
	});

//	this.selector.autoSelect(false);
	oData.layout.subscribe(function (mValue) {
		this.selector.autoSelect(Enums.Layout.NoPreview !== mValue);
	}, this);

	oData.layout.valueHasMutated();

	RL
		.sub('mailbox.message-list.selector.go-down', function () {
			this.selector.goDown(true);
		}, this)
		.sub('mailbox.message-list.selector.go-up', function () {
			this.selector.goUp(true);
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

/**
 * @returns {string}
 */
MailBoxMessageListViewModel.prototype.printableMessageCountForDeletion = function ()
{
	var iCnt = this.messageListCheckedOrSelectedUidsWithSubMails().length;
	return 1 < iCnt ? ' (' + (100 > iCnt ? iCnt : '99+') + ')' : '';
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

MailBoxMessageListViewModel.prototype.flagMessages = function (oCurrentMessage)
{
	var
		aChecked = this.messageListCheckedOrSelected(),
		aCheckedUids = []
	;

	if (oCurrentMessage)
	{
		if (0 < aChecked.length)
		{
			aCheckedUids = _.map(aChecked, function (oMessage) {
				return oMessage.uid;
			});
		}

		if (0 < aCheckedUids.length && -1 < Utils.inArray(oCurrentMessage.uid, aCheckedUids))
		{
			this.setAction(oCurrentMessage.folderFullNameRaw, oCurrentMessage.flagged() ?
				Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
		}
		else
		{
			this.setAction(oCurrentMessage.folderFullNameRaw, oCurrentMessage.flagged() ?
				Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, [oCurrentMessage]);
		}
	}
};

MailBoxMessageListViewModel.prototype.flagMessagesFast = function ()
{
	var
		aChecked = this.messageListCheckedOrSelected(),
		aFlagged = []
	;

	if (0 < aChecked.length)
	{
		aFlagged = _.filter(aChecked, function (oMessage) {
			return oMessage.flagged();
		});

		this.setAction(aChecked[0].folderFullNameRaw,
			aChecked.length === aFlagged.length ? Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
	}
};

MailBoxMessageListViewModel.prototype.seenMessagesFast = function ()
{
	var
		aChecked = this.messageListCheckedOrSelected(),
		aUnseen = []
	;

	aUnseen = _.filter(aChecked, function (oMessage) {
		return oMessage.unseen();
	});

	this.setAction(aChecked[0].folderFullNameRaw,
		0 < aUnseen.length ? Enums.MessageSetAction.SetSeen : Enums.MessageSetAction.UnsetSeen, aChecked);
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

	this.selector.init(this.oContentVisible, this.oContentScrollable, Enums.KeyState.MessageList);

	oDom
		.on('click', '.messageList .b-message-list-wrapper', function () {
			if (oData.useKeyboardShortcuts() && self.message.focused())
			{
				self.message.focused(false);
			}
		})
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
			self.flagMessages(ko.dataFor(this));
		})
	;

	this.initUploaderForAppend();
	this.initShortcuts();

	if (!Globals.bMobileDevice && !!RL.settingsGet('AllowPrefetch') && ifvisible)
	{
		ifvisible.setIdleDuration(10);

		ifvisible.idle(function () {
			self.prefetchNextTick();
		});
	}
};

MailBoxMessageListViewModel.prototype.initShortcuts = function ()
{
	var
		self = this,
		oData = RL.data()
	;

	// disable print
	key('ctrl+p, command+p', Enums.KeyState.MessageList, function () {
		if (oData.useKeyboardShortcuts())
		{
			return false;
		}
	});

	// delete
	key('delete, shift+delete', Enums.KeyState.MessageList, function (event, handler) {
		if (oData.useKeyboardShortcuts() && event)
		{
			if (0 < RL.data().messageListCheckedOrSelected().length)
			{
				if (handler && 'shift+delete' === handler.shortcut)
				{
					self.deleteWithoutMoveCommand();
				}
				else
				{
					self.deleteCommand();
				}
			}

			return false;
		}
	});

	// check all
	key('ctrl+a, command+a', Enums.KeyState.MessageList, function () {
		if (oData.useKeyboardShortcuts())
		{
			self.checkAll(!(self.checkAll() && !self.isIncompleteChecked()));
			return false;
		}
	});

	// new message (open compose popup)
	key('c,n', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		if (oData.useKeyboardShortcuts())
		{
			kn.showScreenPopup(PopupsComposeViewModel);
			return false;
		}
	});

	// star/flag messages
	key('s', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		if (oData.useKeyboardShortcuts())
		{
			self.flagMessagesFast();
			return false;
		}
	});

	// mark as read/unread
	key('m', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		if (oData.useKeyboardShortcuts())
		{
			self.seenMessagesFast();
			return false;
		}
	});

	// shortcuts help
	key('shift+/', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		if (oData.useKeyboardShortcuts())
		{
			kn.showScreenPopup(PopupsKeyboardShortcutsHelpViewModel);
			return false;
		}
	});

	key('shift+f', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		if (oData.useKeyboardShortcuts())
		{
			self.multyForwardCommand();
			return false;
		}
	});

	// search input focus
	key('/', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
		if (oData.useKeyboardShortcuts())
		{
			if (self.message())
			{
				self.message.focused(false);
			}
			
			self.inputMessageListSearchFocus(true);
			return false;
		}
	});

	// cancel search
	key('esc', Enums.KeyState.MessageList, function () {
		if (oData.useKeyboardShortcuts() && '' !== self.messageListSearchDesc())
		{
			self.cancelSearch();
			return false;
		}
	});

	// change focused state
	key('tab, shift+tab', Enums.KeyState.MessageList, function () {
		if (oData.useKeyboardShortcuts())
		{
			if (self.message())
			{
				self.message.focused(true);
			}

			return false;
		}
	});

	key('ctrl+left, command+left', Enums.KeyState.MessageView, function () {
		if (oData.useKeyboardShortcuts())
		{
			// TODO
			return false;
		}
	});

	key('ctrl+right, command+right', Enums.KeyState.MessageView, function () {
		if (oData.useKeyboardShortcuts())
		{
			// TODO
			return false;
		}
	});
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