/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
		$ = require('$'),
		_ = require('_'),
		ko = require('ko'),
		key = require('key'),
		ifvisible = require('ifvisible'),
		Jua = require('Jua'),

		Enums = require('Enums'),
		Consts = require('Consts'),
		Globals = require('Globals'),
		Utils = require('Utils'),
		LinkBuilder = require('LinkBuilder'),
		Events = require('Events'),
		Selector = require('Selector'),

		AppSettings = require('../Storages/AppSettings.js'),
		Cache = require('../Storages/WebMailCacheStorage.js'),
		Data = require('../Storages/WebMailDataStorage.js'),
		Remote = require('../Storages/WebMailAjaxRemoteStorage.js'),

		kn = require('kn'),
		KnoinAbstractViewModel = require('KnoinAbstractViewModel'),

		PopupsComposeViewModel = require('./Popups/PopupsComposeViewModel.js'),
		PopupsAdvancedSearchViewModel = require('./Popups/PopupsAdvancedSearchViewModel.js'),
		PopupsFolderClearViewModel = require('./Popups/PopupsFolderClearViewModel.js')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function MailBoxMessageListViewModel()
	{
		var App = require('../Apps/RainLoopApp.js');

		KnoinAbstractViewModel.call(this, 'Right', 'MailMessageList');

		this.sLastUid = null;
		this.bPrefetch = false;
		this.emptySubjectValue = '';

		this.hideDangerousActions = !!AppSettings.settingsGet('HideDangerousActions');

		this.popupVisibility = Globals.popupVisibility;

		this.message = Data.message;
		this.messageList = Data.messageList;
		this.folderList = Data.folderList;
		this.currentMessage = Data.currentMessage;
		this.isMessageSelected = Data.isMessageSelected;
		this.messageListSearch = Data.messageListSearch;
		this.messageListError = Data.messageListError;
		this.folderMenuForMove = Data.folderMenuForMove;

		this.useCheckboxesInList = Data.useCheckboxesInList;

		this.mainMessageListSearch = Data.mainMessageListSearch;
		this.messageListEndFolder = Data.messageListEndFolder;

		this.messageListChecked = Data.messageListChecked;
		this.messageListCheckedOrSelected = Data.messageListCheckedOrSelected;
		this.messageListCheckedOrSelectedUidsWithSubMails = Data.messageListCheckedOrSelectedUidsWithSubMails;
		this.messageListCompleteLoadingThrottle = Data.messageListCompleteLoadingThrottle;

		Utils.initOnStartOrLangChange(function () {
			this.emptySubjectValue = Utils.i18n('MESSAGE_LIST/EMPTY_SUBJECT_TEXT');
		}, this);

		this.userQuota = Data.userQuota;
		this.userUsageSize = Data.userUsageSize;
		this.userUsageProc = Data.userUsageProc;

		this.moveDropdownTrigger = ko.observable(false);
		this.moreDropdownTrigger = ko.observable(false);

		// append drag and drop
		this.dragOver = ko.observable(false).extend({'throttle': 1});
		this.dragOverEnter = ko.observable(false).extend({'throttle': 1});
		this.dragOverArea = ko.observable(null);
		this.dragOverBodyArea = ko.observable(null);

		this.messageListItemTemplate = ko.computed(function () {
			return Enums.Layout.NoPreview !== Data.layout() ?
				'MailMessageListItem' : 'MailMessageListItemNoPreviewPane';
		});

		this.messageListSearchDesc = ko.computed(function () {
			var sValue = Data.messageListEndSearch();
			return '' === sValue ? '' : Utils.i18n('MESSAGE_LIST/SEARCH_RESULT_FOR', {'SEARCH': sValue});
		});

		this.messageListPagenator = ko.computed(Utils.computedPagenatorHelper(Data.messageListPage, Data.messageListPageCount));

		this.checkAll = ko.computed({
			'read': function () {
				return 0 < Data.messageListChecked().length;
			},

			'write': function (bValue) {
				bValue = !!bValue;
				_.each(Data.messageList(), function (oMessage) {
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
				iM = Data.messageList().length,
				iC = Data.messageListChecked().length
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
			return Data.spamFolder() === this.messageListEndFolder() &&
				'' !== Data.spamFolder();
		}, this);

		this.isSpamDisabled = ko.computed(function () {
			return Consts.Values.UnuseOptionValue === Data.spamFolder();
		}, this);

		this.isTrashFolder = ko.computed(function () {
			return Data.trashFolder() === this.messageListEndFolder() &&
				'' !== Data.trashFolder();
		}, this);

		this.isDraftFolder = ko.computed(function () {
			return Data.draftFolder() === this.messageListEndFolder() &&
				'' !== Data.draftFolder();
		}, this);

		this.isSentFolder = ko.computed(function () {
			return Data.sentFolder() === this.messageListEndFolder() &&
				'' !== Data.sentFolder();
		}, this);

		this.isArchiveFolder = ko.computed(function () {
			return Data.archiveFolder() === this.messageListEndFolder() &&
				'' !== Data.archiveFolder();
		}, this);

		this.isArchiveDisabled = ko.computed(function () {
			return Consts.Values.UnuseOptionValue === Data.archiveFolder();
		}, this);

		this.canBeMoved = this.hasCheckedOrSelectedLines;

		this.clearCommand = Utils.createCommand(this, function () {
			kn.showScreenPopup(PopupsFolderClearViewModel, [Data.currentFolder()]);
		});

		this.multyForwardCommand = Utils.createCommand(this, function () {
			kn.showScreenPopup(PopupsComposeViewModel, [Enums.ComposeType.ForwardAsAttachment, Data.messageListCheckedOrSelected()]);
		}, this.canBeMoved);

		this.deleteWithoutMoveCommand = Utils.createCommand(this, function () {
			App.deleteMessagesFromFolder(Enums.FolderType.Trash,
				Data.currentFolderFullNameRaw(),
				Data.messageListCheckedOrSelectedUidsWithSubMails(), false);
		}, this.canBeMoved);

		this.deleteCommand = Utils.createCommand(this, function () {
			App.deleteMessagesFromFolder(Enums.FolderType.Trash,
				Data.currentFolderFullNameRaw(),
				Data.messageListCheckedOrSelectedUidsWithSubMails(), true);
		}, this.canBeMoved);

		this.archiveCommand = Utils.createCommand(this, function () {
			App.deleteMessagesFromFolder(Enums.FolderType.Archive,
				Data.currentFolderFullNameRaw(),
				Data.messageListCheckedOrSelectedUidsWithSubMails(), true);
		}, this.canBeMoved);

		this.spamCommand = Utils.createCommand(this, function () {
			App.deleteMessagesFromFolder(Enums.FolderType.Spam,
				Data.currentFolderFullNameRaw(),
				Data.messageListCheckedOrSelectedUidsWithSubMails(), true);
		}, this.canBeMoved);

		this.notSpamCommand = Utils.createCommand(this, function () {
			App.deleteMessagesFromFolder(Enums.FolderType.NotSpam,
				Data.currentFolderFullNameRaw(),
				Data.messageListCheckedOrSelectedUidsWithSubMails(), true);
		}, this.canBeMoved);

		this.moveCommand = Utils.createCommand(this, Utils.emptyFunction, this.canBeMoved);

		this.reloadCommand = Utils.createCommand(this, function () {
			if (!Data.messageListCompleteLoadingThrottle())
			{
				App.reloadMessageList(false, true);
			}
		});

		this.quotaTooltip = _.bind(this.quotaTooltip, this);

		this.selector = new Selector(this.messageList, this.currentMessage,
			'.messageListItem .actionHandle', '.messageListItem.selected', '.messageListItem .checkboxMessage',
				'.messageListItem.focused');

		this.selector.on('onItemSelect', _.bind(function (oMessage) {
			if (oMessage)
			{
				Data.message(Data.staticMessageList.populateByMessageListItem(oMessage));
				this.populateMessageBody(Data.message());

				if (Enums.Layout.NoPreview === Data.layout())
				{
					kn.setHash(LinkBuilder.messagePreview(), true);
					Data.message.focused(true);
				}
			}
			else
			{
				Data.message(null);
			}
		}, this));

		this.selector.on('onItemGetUid', function (oMessage) {
			return oMessage ? oMessage.generateUid() : '';
		});

		Data.messageListEndHash.subscribe(function () {
			this.selector.scrollToTop();
		}, this);

		Data.layout.subscribe(function (mValue) {
			this.selector.autoSelect(Enums.Layout.NoPreview !== mValue);
		}, this);

		Data.layout.valueHasMutated();

		Events
			.sub('mailbox.message-list.selector.go-down', function () {
				this.selector.goDown(true);
			}, this)
			.sub('mailbox.message-list.selector.go-up', function () {
				this.selector.goUp(true);
			}, this)
		;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('MailBoxMessageListViewModel', MailBoxMessageListViewModel);

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
	MailBoxMessageListViewModel.prototype.moveSelectedMessagesToFolder = function (sToFolderFullNameRaw, bCopy)
	{
		if (this.canBeMoved())
		{
			var App = require('../Apps/RainLoopApp.js');
			App.moveMessagesToFolder(
				Data.currentFolderFullNameRaw(),
				Data.messageListCheckedOrSelectedUidsWithSubMails(), sToFolderFullNameRaw, bCopy);
		}

		return false;
	};

	MailBoxMessageListViewModel.prototype.dragAndDronHelper = function (oMessageListItem)
	{
		if (oMessageListItem)
		{
			oMessageListItem.checked(true);
		}

		var
			oEl = Utils.draggeblePlace(),
			aUids = Data.messageListCheckedOrSelectedUidsWithSubMails()
		;

		oEl.data('rl-folder', Data.currentFolderFullNameRaw());
		oEl.data('rl-uids', aUids);
		oEl.find('.text').text('' + aUids.length);

		_.defer(function () {
			var aUids = Data.messageListCheckedOrSelectedUidsWithSubMails();

			oEl.data('rl-uids', aUids);
			oEl.find('.text').text('' + aUids.length);
		});

		return oEl;
	};

	/**
	 * @param {string} sResult
	 * @param {AjaxJsonDefaultResponse} oData
	 * @param {boolean} bCached
	 */
	MailBoxMessageListViewModel.prototype.onMessageResponse = function (sResult, oData, bCached)
	{
		Data.hideMessageBodies();
		Data.messageLoading(false);

		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			Data.setMessage(oData, bCached);
		}
		else if (Enums.StorageResultType.Unload === sResult)
		{
			Data.message(null);
			Data.messageError('');
		}
		else if (Enums.StorageResultType.Abort !== sResult)
		{
			Data.message(null);
			Data.messageError((oData && oData.ErrorCode ?
				Utils.getNotification(oData.ErrorCode) :
				Utils.getNotification(Enums.Notification.UnknownError)));
		}
	};

	MailBoxMessageListViewModel.prototype.populateMessageBody = function (oMessage)
	{
		if (oMessage)
		{
			if (Remote.message(this.onMessageResponse, oMessage.folderFullNameRaw, oMessage.uid))
			{
				Data.messageLoading(true);
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
			iAlreadyUnread = 0,
			App = require('../Apps/RainLoopApp.js')
		;

		if (Utils.isUnd(aMessages))
		{
			aMessages = Data.messageListChecked();
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
					Cache.storeMessageFlagsToCache(oMessage);
				});

				oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
				if (oFolder)
				{
					oFolder.messageCountUnread(oFolder.messageCountUnread() - iAlreadyUnread);
				}

				Remote.messageSetSeen(Utils.emptyFunction, sFolderFullNameRaw, aUids, true);
				break;
			case Enums.MessageSetAction.UnsetSeen:
				_.each(aMessages, function (oMessage) {
					if (oMessage.unseen())
					{
						iAlreadyUnread++;
					}

					oMessage.unseen(true);
					Cache.storeMessageFlagsToCache(oMessage);
				});

				oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
				if (oFolder)
				{
					oFolder.messageCountUnread(oFolder.messageCountUnread() - iAlreadyUnread + aUids.length);
				}
				Remote.messageSetSeen(Utils.emptyFunction, sFolderFullNameRaw, aUids, false);
				break;
			case Enums.MessageSetAction.SetFlag:
				_.each(aMessages, function (oMessage) {
					oMessage.flagged(true);
					Cache.storeMessageFlagsToCache(oMessage);
				});
				Remote.messageSetFlagged(Utils.emptyFunction, sFolderFullNameRaw, aUids, true);
				break;
			case Enums.MessageSetAction.UnsetFlag:
				_.each(aMessages, function (oMessage) {
					oMessage.flagged(false);
					Cache.storeMessageFlagsToCache(oMessage);
				});
				Remote.messageSetFlagged(Utils.emptyFunction, sFolderFullNameRaw, aUids, false);
				break;
			}

			App.reloadFlagsCurrentMessageListAndMessageFromCache();
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
			aMessages = Data.messageList(),
			App = require('../Apps/RainLoopApp.js')
		;

		if ('' !== sFolderFullNameRaw)
		{
			oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);

			if (oFolder)
			{
				switch (iSetAction) {
				case Enums.MessageSetAction.SetSeen:
					oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
					if (oFolder)
					{
						_.each(aMessages, function (oMessage) {
							oMessage.unseen(false);
						});

						oFolder.messageCountUnread(0);
						Cache.clearMessageFlagsFromCacheByFolder(sFolderFullNameRaw);
					}

					Remote.messageSetSeenToAll(Utils.emptyFunction, sFolderFullNameRaw, true);
					break;
				case Enums.MessageSetAction.UnsetSeen:
					oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw);
					if (oFolder)
					{
						_.each(aMessages, function (oMessage) {
							oMessage.unseen(true);
						});

						oFolder.messageCountUnread(oFolder.messageCountAll());
						Cache.clearMessageFlagsFromCacheByFolder(sFolderFullNameRaw);
					}
					Remote.messageSetSeenToAll(Utils.emptyFunction, sFolderFullNameRaw, false);
					break;
				}

				App.reloadFlagsCurrentMessageListAndMessageFromCache();
			}
		}
	};

	MailBoxMessageListViewModel.prototype.listSetSeen = function ()
	{
		this.setAction(Data.currentFolderFullNameRaw(), Enums.MessageSetAction.SetSeen, Data.messageListCheckedOrSelected());
	};

	MailBoxMessageListViewModel.prototype.listSetAllSeen = function ()
	{
		this.setActionForAll(Data.currentFolderFullNameRaw(), Enums.MessageSetAction.SetSeen);
	};

	MailBoxMessageListViewModel.prototype.listUnsetSeen = function ()
	{
		this.setAction(Data.currentFolderFullNameRaw(), Enums.MessageSetAction.UnsetSeen, Data.messageListCheckedOrSelected());
	};

	MailBoxMessageListViewModel.prototype.listSetFlags = function ()
	{
		this.setAction(Data.currentFolderFullNameRaw(), Enums.MessageSetAction.SetFlag, Data.messageListCheckedOrSelected());
	};

	MailBoxMessageListViewModel.prototype.listUnsetFlags = function ()
	{
		this.setAction(Data.currentFolderFullNameRaw(), Enums.MessageSetAction.UnsetFlag, Data.messageListCheckedOrSelected());
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

	MailBoxMessageListViewModel.prototype.flagMessagesFast = function (bFlag)
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

			if (Utils.isUnd(bFlag))
			{
				this.setAction(aChecked[0].folderFullNameRaw,
					aChecked.length === aFlagged.length ? Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
			}
			else
			{
				this.setAction(aChecked[0].folderFullNameRaw,
					!bFlag ? Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
			}
		}
	};

	MailBoxMessageListViewModel.prototype.seenMessagesFast = function (bSeen)
	{
		var
			aChecked = this.messageListCheckedOrSelected(),
			aUnseen = []
		;

		if (0 < aChecked.length)
		{
			aUnseen = _.filter(aChecked, function (oMessage) {
				return oMessage.unseen();
			});

			if (Utils.isUnd(bSeen))
			{
				this.setAction(aChecked[0].folderFullNameRaw,
					0 < aUnseen.length ? Enums.MessageSetAction.SetSeen : Enums.MessageSetAction.UnsetSeen, aChecked);
			}
			else
			{
				this.setAction(aChecked[0].folderFullNameRaw,
					bSeen ? Enums.MessageSetAction.SetSeen : Enums.MessageSetAction.UnsetSeen, aChecked);
			}
		}
	};

	MailBoxMessageListViewModel.prototype.onBuild = function (oDom)
	{
		var
			self = this,
			App = require('../Apps/RainLoopApp.js')
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
				Data.messageListThreadFolder(oMessage.folderFullNameRaw);

				aList = Data.messageListThreadUids();

				if (oMessage.lastInCollapsedThread())
				{
					aList.push(0 < oMessage.parentUid() ? oMessage.parentUid() : oMessage.uid);
				}
				else
				{
					aList = _.without(aList, 0 < oMessage.parentUid() ? oMessage.parentUid() : oMessage.uid);
				}

				Data.messageListThreadUids(_.uniq(aList));

				oMessage.lastInCollapsedThreadLoading(true);
				oMessage.lastInCollapsedThread(!oMessage.lastInCollapsedThread());

				App.reloadMessageList();
			}

			return false;
		});

		this.selector.init(this.oContentVisible, this.oContentScrollable, Enums.KeyState.MessageList);

		oDom
			.on('click', '.messageList .b-message-list-wrapper', function () {
				if (self.message.focused())
				{
					self.message.focused(false);
				}
			})
			.on('click', '.e-pagenator .e-page', function () {
				var oPage = ko.dataFor(this);
				if (oPage)
				{
					kn.setHash(LinkBuilder.mailBox(
						Data.currentFolderFullNameHash(),
						oPage.value,
						Data.messageListSearch()
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

		if (!Globals.bMobileDevice && AppSettings.capa(Enums.Capa.Prefetch) && ifvisible)
		{
			ifvisible.setIdleDuration(10);

			ifvisible.idle(function () {
				self.prefetchNextTick();
			});
		}
	};

	MailBoxMessageListViewModel.prototype.initShortcuts = function ()
	{
		var self = this;

		// disable print
		key('ctrl+p, command+p', Enums.KeyState.MessageList, function () {
			return false;
		});

		// archive (zip)
		key('z', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.archiveCommand();
			return false;
		});

		// delete
		key('delete, shift+delete, shift+3', Enums.KeyState.MessageList, function (event, handler) {
			if (event)
			{
				if (0 < Data.messageListCheckedOrSelected().length)
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

		// check mail
		key('ctrl+r, command+r', [Enums.KeyState.FolderList, Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.reloadCommand();
			return false;
		});

		// check all
		key('ctrl+a, command+a', Enums.KeyState.MessageList, function () {
			self.checkAll(!(self.checkAll() && !self.isIncompleteChecked()));
			return false;
		});

		// write/compose (open compose popup)
		key('w,c', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			kn.showScreenPopup(PopupsComposeViewModel);
			return false;
		});

		// important - star/flag messages
		key('i', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.flagMessagesFast();
			return false;
		});

		// move
		key('m', Enums.KeyState.MessageList, function () {
			self.moveDropdownTrigger(true);
			return false;
		});

		// read
		key('q', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.seenMessagesFast(true);
			return false;
		});

		// unread
		key('u', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.seenMessagesFast(false);
			return false;
		});

		key('shift+f', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.multyForwardCommand();
			return false;
		});

		// search input focus
		key('/', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.inputMessageListSearchFocus(true);
			return false;
		});

		// cancel search
		key('esc', Enums.KeyState.MessageList, function () {
			if ('' !== self.messageListSearchDesc())
			{
				self.cancelSearch();
				return false;
			}
		});

		// change focused state
		key('tab, shift+tab, left, right', Enums.KeyState.MessageList, function (event, handler) {
			if (event && handler && 'shift+tab' === handler.shortcut || 'left' === handler.shortcut)
			{
				self.folderList.focused(true);
			}
			else if (self.message())
			{
				self.message.focused(true);
			}

			return false;
		});

		// TODO
		key('ctrl+left, command+left', Enums.KeyState.MessageView, function () {
			return false;
		});

		// TODO
		key('ctrl+right, command+right', Enums.KeyState.MessageView, function () {
			return false;
		});
	};

	MailBoxMessageListViewModel.prototype.prefetchNextTick = function ()
	{
		if (!this.bPrefetch && !ifvisible.now() && this.viewModelVisibility())
		{
			var
				self = this,
				oMessage = _.find(this.messageList(), function (oMessage) {
					return oMessage &&
						!Cache.hasRequestedMessage(oMessage.folderFullNameRaw, oMessage.uid);
				})
			;

			if (oMessage)
			{
				this.bPrefetch = true;

				Cache.addRequestedMessage(oMessage.folderFullNameRaw, oMessage.uid);

				Remote.message(function (sResult, oData) {

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
		if (!AppSettings.settingsGet('AllowAppendMessage') || !this.dragOverArea())
		{
			return false;
		}

		var
			oJua = new Jua({
				'action': LinkBuilder.append(),
				'name': 'AppendFile',
				'queueSize': 1,
				'multipleSizeLimit': 1,
				'disableFolderDragAndDrop': true,
				'hidden': {
					'Folder': function () {
						return Data.currentFolderFullNameRaw();
					}
				},
				'dragAndDropElement': this.dragOverArea(),
				'dragAndDropBodyElement': this.dragOverBodyArea()
			})
		;

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
					Data.messageListLoading(true);
					return true;
				}

				return false;
			}, this))
			.on('onComplete', _.bind(function () {
				require('../Apps/RainLoopApp.js').reloadMessageList(true, true);
			}, this))
		;

		return !!oJua;
	};

	module.exports = MailBoxMessageListViewModel;

}(module, require));
