
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		key = require('key'),
		Jua = require('Jua'),
		ifvisible = require('ifvisible'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),
		Events = require('Common/Events'),
		Selector = require('Common/Selector'),
		Translator = require('Common/Translator'),

		Cache = require('Common/Cache'),

		AppStore = require('Stores/User/App'),
		QuotaStore = require('Stores/User/Quota'),
		SettingsStore = require('Stores/User/Settings'),
		FolderStore = require('Stores/User/Folder'),
		MessageStore = require('Stores/User/Message'),

		Settings = require('Storage/Settings'),
		Remote = require('Remote/User/Ajax'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function MessageListMailBoxUserView()
	{
		AbstractView.call(this, 'Right', 'MailMessageList');

		this.sLastUid = null;
		this.bPrefetch = false;
		this.emptySubjectValue = '';

		this.allowReload = !!Settings.capa(Enums.Capa.Reload);
		this.allowSearch = !!Settings.capa(Enums.Capa.Search);
		this.allowSearchAdv = !!Settings.capa(Enums.Capa.SearchAdv);
		this.allowComposer = !!Settings.capa(Enums.Capa.Composer);
		this.allowMessageListActions = !!Settings.capa(Enums.Capa.MessageListActions);
		this.allowDangerousActions = !!Settings.capa(Enums.Capa.DangerousActions);

		this.popupVisibility = Globals.popupVisibility;

		this.message = MessageStore.message;
		this.messageList = MessageStore.messageList;
		this.messageListDisableAutoSelect = MessageStore.messageListDisableAutoSelect;

		this.folderList = FolderStore.folderList;

		this.selectorMessageSelected = MessageStore.selectorMessageSelected;
		this.selectorMessageFocused = MessageStore.selectorMessageFocused;
		this.isMessageSelected = MessageStore.isMessageSelected;
		this.messageListSearch = MessageStore.messageListSearch;
		this.messageListThreadUid = MessageStore.messageListThreadUid;
		this.messageListError = MessageStore.messageListError;
		this.folderMenuForMove = FolderStore.folderMenuForMove;

		this.useCheckboxesInList = SettingsStore.useCheckboxesInList;

		this.mainMessageListSearch = MessageStore.mainMessageListSearch;
		this.messageListEndFolder = MessageStore.messageListEndFolder;
		this.messageListEndThreadUid = MessageStore.messageListEndThreadUid;

		this.messageListChecked = MessageStore.messageListChecked;
		this.messageListCheckedOrSelected = MessageStore.messageListCheckedOrSelected;
		this.messageListCheckedOrSelectedUidsWithSubMails = MessageStore.messageListCheckedOrSelectedUidsWithSubMails;
		this.messageListCompleteLoadingThrottle = MessageStore.messageListCompleteLoadingThrottle;
		this.messageListCompleteLoadingThrottleForAnimation = MessageStore.messageListCompleteLoadingThrottleForAnimation;

		Translator.initOnStartOrLangChange(function () {
			this.emptySubjectValue = Translator.i18n('MESSAGE_LIST/EMPTY_SUBJECT_TEXT');
		}, this);

		this.userQuota = QuotaStore.quota;
		this.userUsageSize = QuotaStore.usage;
		this.userUsageProc = QuotaStore.percentage;

		this.moveDropdownTrigger = ko.observable(false);
		this.moreDropdownTrigger = ko.observable(false);

		// append drag and drop
		this.dragOver = ko.observable(false).extend({'throttle': 1});
		this.dragOverEnter = ko.observable(false).extend({'throttle': 1});
		this.dragOverArea = ko.observable(null);
		this.dragOverBodyArea = ko.observable(null);

		this.messageListItemTemplate = ko.computed(function () {
			return Enums.Layout.SidePreview === SettingsStore.layout() ?
				'MailMessageListItem' : 'MailMessageListItemNoPreviewPane';
		});

		this.messageListSearchDesc = ko.computed(function () {
			var sValue = MessageStore.messageListEndSearch();
			return '' === sValue ? '' : Translator.i18n('MESSAGE_LIST/SEARCH_RESULT_FOR', {'SEARCH': sValue});
		});

		this.messageListPagenator = ko.computed(Utils.computedPagenatorHelper(
			MessageStore.messageListPage, MessageStore.messageListPageCount));

		this.checkAll = ko.computed({
			'read': function () {
				return 0 < MessageStore.messageListChecked().length;
			},

			'write': function (bValue) {
				bValue = !!bValue;
				_.each(MessageStore.messageList(), function (oMessage) {
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
				iM = MessageStore.messageList().length,
				iC = MessageStore.messageListChecked().length
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
			return FolderStore.spamFolder() === this.messageListEndFolder() &&
				'' !== FolderStore.spamFolder();
		}, this);

		this.isSpamDisabled = ko.computed(function () {
			return Consts.Values.UnuseOptionValue === FolderStore.spamFolder();
		}, this);

		this.isTrashFolder = ko.computed(function () {
			return FolderStore.trashFolder() === this.messageListEndFolder() &&
				'' !== FolderStore.trashFolder();
		}, this);

		this.isDraftFolder = ko.computed(function () {
			return FolderStore.draftFolder() === this.messageListEndFolder() &&
				'' !== FolderStore.draftFolder();
		}, this);

		this.isSentFolder = ko.computed(function () {
			return FolderStore.sentFolder() === this.messageListEndFolder() &&
				'' !== FolderStore.sentFolder();
		}, this);

		this.isArchiveFolder = ko.computed(function () {
			return FolderStore.archiveFolder() === this.messageListEndFolder() &&
				'' !== FolderStore.archiveFolder();
		}, this);

		this.isArchiveDisabled = ko.computed(function () {
			return Consts.Values.UnuseOptionValue === FolderStore.archiveFolder();
		}, this);

		this.isArchiveVisible = ko.computed(function () {
			return !this.isArchiveFolder() && !this.isArchiveDisabled() && !this.isDraftFolder();
		}, this);

		this.isSpamVisible = ko.computed(function () {
			return !this.isSpamFolder() && !this.isSpamDisabled() && !this.isDraftFolder() && !this.isSentFolder();
		}, this);

		this.isUnSpamVisible = ko.computed(function () {
			return this.isSpamFolder() && !this.isSpamDisabled() && !this.isDraftFolder() && !this.isSentFolder();
		}, this);

		this.messageListFocused = ko.computed(function () {
			return Enums.Focused.MessageList === AppStore.focusedState();
		});

		this.canBeMoved = this.hasCheckedOrSelectedLines;

		this.clearCommand = Utils.createCommand(this, function () {
			if (Settings.capa(Enums.Capa.DangerousActions))
			{
				kn.showScreenPopup(require('View/Popup/FolderClear'), [FolderStore.currentFolder()]);
			}
		});

		this.multyForwardCommand = Utils.createCommand(this, function () {
			if (Settings.capa(Enums.Capa.Composer))
			{
				kn.showScreenPopup(require('View/Popup/Compose'), [
					Enums.ComposeType.ForwardAsAttachment, MessageStore.messageListCheckedOrSelected()]);
			}
		}, this.canBeMoved);

		this.deleteWithoutMoveCommand = Utils.createCommand(this, function () {
			if (Settings.capa(Enums.Capa.DangerousActions))
			{
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.Trash,
					FolderStore.currentFolderFullNameRaw(),
					MessageStore.messageListCheckedOrSelectedUidsWithSubMails(), false);
			}
		}, this.canBeMoved);

		this.deleteCommand = Utils.createCommand(this, function () {
			require('App/User').deleteMessagesFromFolder(Enums.FolderType.Trash,
				FolderStore.currentFolderFullNameRaw(),
				MessageStore.messageListCheckedOrSelectedUidsWithSubMails(), true);
		}, this.canBeMoved);

		this.archiveCommand = Utils.createCommand(this, function () {
			require('App/User').deleteMessagesFromFolder(Enums.FolderType.Archive,
				FolderStore.currentFolderFullNameRaw(),
				MessageStore.messageListCheckedOrSelectedUidsWithSubMails(), true);
		}, this.canBeMoved);

		this.spamCommand = Utils.createCommand(this, function () {
			require('App/User').deleteMessagesFromFolder(Enums.FolderType.Spam,
				FolderStore.currentFolderFullNameRaw(),
				MessageStore.messageListCheckedOrSelectedUidsWithSubMails(), true);
		}, this.canBeMoved);

		this.notSpamCommand = Utils.createCommand(this, function () {
			require('App/User').deleteMessagesFromFolder(Enums.FolderType.NotSpam,
				FolderStore.currentFolderFullNameRaw(),
				MessageStore.messageListCheckedOrSelectedUidsWithSubMails(), true);
		}, this.canBeMoved);

		this.moveCommand = Utils.createCommand(this, Utils.emptyFunction, this.canBeMoved);

		this.reloadCommand = Utils.createCommand(this, function () {
			if (!MessageStore.messageListCompleteLoadingThrottleForAnimation() && this.allowReload)
			{
				require('App/User').reloadMessageList(false, true);
			}
		});

		this.quotaTooltip = _.bind(this.quotaTooltip, this);

		this.selector = new Selector(this.messageList, this.selectorMessageSelected, this.selectorMessageFocused,
			'.messageListItem .actionHandle', '.messageListItem.selected', '.messageListItem .checkboxMessage',
				'.messageListItem.focused');

		this.selector.on('onItemSelect', _.bind(function (oMessage) {
			MessageStore.selectMessage(oMessage);
		}, this));

		this.selector.on('onItemGetUid', function (oMessage) {
			return oMessage ? oMessage.generateUid() : '';
		});

		this.selector.on('onAutoSelect', _.bind(function () {
			return this.useAutoSelect();
		}, this));

		this.selector.on('onUpUpOrDownDown', _.bind(function (bV) {
			this.goToUpUpOrDownDown(bV);
		}, this));

		Events
			.sub('mailbox.message-list.selector.go-down', function (bSelect) {
				this.selector.goDown(bSelect);
			}, this)
			.sub('mailbox.message-list.selector.go-up', function (bSelect) {
				this.selector.goUp(bSelect);
			}, this)
		;

		Events
			.sub('mailbox.message.show', function (sFolder, sUid) {

				var oMessage = _.find(this.messageList(), function (oItem) {
					return oItem && sFolder === oItem.folderFullNameRaw && sUid === oItem.uid;
				});

				if ('INBOX' === sFolder)
				{
					kn.setHash(Links.mailBox(sFolder, 1));
				}

				if (oMessage)
				{
					this.selector.selectMessageItem(oMessage);
				}
				else
				{
					if ('INBOX' !== sFolder)
					{
						kn.setHash(Links.mailBox(sFolder, 1));
					}

					MessageStore.selectMessageByFolderAndUid(sFolder, sUid);
				}

			}, this)
		;

		MessageStore.messageListEndHash.subscribe(function () {
			this.selector.scrollToTop();
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/User/MailBox/MessageList', 'View/App/MailBox/MessageList', 'MailBoxMessageListViewModel'], MessageListMailBoxUserView);
	_.extend(MessageListMailBoxUserView.prototype, AbstractView.prototype);

	/**
	 * @type {string}
	 */
	MessageListMailBoxUserView.prototype.emptySubjectValue = '';

	MessageListMailBoxUserView.prototype.iGoToUpUpOrDownDownTimeout = 0;

	MessageListMailBoxUserView.prototype.goToUpUpOrDownDown = function (bUp)
	{
		var self = this;

		if (0 < this.messageListChecked().length)
		{
			return false;
		}

		window.clearTimeout(this.iGoToUpUpOrDownDownTimeout);
		this.iGoToUpUpOrDownDownTimeout = window.setTimeout(function () {

			var
				oPrev = null,
				oNext = null,
				oTemp = null,
				oCurrent = null,
				aPages = self.messageListPagenator()
			;

			_.find(aPages, function (oItem) {

				if (oItem)
				{
					if (oCurrent)
					{
						oNext = oItem;
					}

					if (oItem.current)
					{
						oCurrent = oItem;
						oPrev = oTemp;
					}

					if (oNext)
					{
						return true;
					}

					oTemp = oItem;
				}

				return false;
			});

			if (Enums.Layout.NoPreview === SettingsStore.layout() && !self.message())
			{
				self.selector.iFocusedNextHelper = bUp ? -1 : 1;
			}
			else
			{
				self.selector.iSelectNextHelper = bUp ? -1 : 1;
			}

			if (bUp ? oPrev : oNext)
			{
				self.selector.unselect();
				self.gotoPage(bUp ? oPrev : oNext);
			}

		}, 350);
	};

	MessageListMailBoxUserView.prototype.useAutoSelect = function ()
	{
		if (this.messageListDisableAutoSelect())
		{
			return false;
		}

		if (/is:unseen/.test(this.mainMessageListSearch()))
		{
			return false;
		}

		return Enums.Layout.NoPreview !== SettingsStore.layout();
	};

	MessageListMailBoxUserView.prototype.searchEnterAction = function ()
	{
		this.mainMessageListSearch(this.sLastSearchValue);
		this.inputMessageListSearchFocus(false);
	};

	/**
	 * @return {string}
	 */
	MessageListMailBoxUserView.prototype.printableMessageCountForDeletion = function ()
	{
		var iCnt = this.messageListCheckedOrSelectedUidsWithSubMails().length;
		return 1 < iCnt ? ' (' + (100 > iCnt ? iCnt : '99+') + ')' : '';
	};

	MessageListMailBoxUserView.prototype.cancelSearch = function ()
	{
		this.mainMessageListSearch('');
		this.inputMessageListSearchFocus(false);
	};

	MessageListMailBoxUserView.prototype.cancelThreadUid = function ()
	{
		kn.setHash(Links.mailBox(
			FolderStore.currentFolderFullNameHash(),
			MessageStore.messageListPageBeforeThread(),
			MessageStore.messageListSearch()
		));
	};

	/**
	 * @param {string} sToFolderFullNameRaw
	 * @param {boolean} bCopy
	 * @return {boolean}
	 */
	MessageListMailBoxUserView.prototype.moveSelectedMessagesToFolder = function (sToFolderFullNameRaw, bCopy)
	{
		if (this.canBeMoved())
		{
			require('App/User').moveMessagesToFolder(
				FolderStore.currentFolderFullNameRaw(),
				MessageStore.messageListCheckedOrSelectedUidsWithSubMails(), sToFolderFullNameRaw, bCopy);
		}

		return false;
	};

	MessageListMailBoxUserView.prototype.dragAndDronHelper = function (oMessageListItem)
	{
		if (oMessageListItem)
		{
			oMessageListItem.checked(true);
		}

		var
			oEl = Utils.draggablePlace(),
			aUids = MessageStore.messageListCheckedOrSelectedUidsWithSubMails()
		;

		oEl.data('rl-folder', FolderStore.currentFolderFullNameRaw());
		oEl.data('rl-uids', aUids);
		oEl.find('.text').text('' + aUids.length);

		_.defer(function () {
			var aUids = MessageStore.messageListCheckedOrSelectedUidsWithSubMails();

			oEl.data('rl-uids', aUids);
			oEl.find('.text').text('' + aUids.length);
		});

		return oEl;
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {string|bool} sUid
	 * @param {number} iSetAction
	 * @param {Array=} aMessages = null
	 */
	MessageListMailBoxUserView.prototype.setAction = function (sFolderFullNameRaw, mUid, iSetAction, aMessages)
	{
		require('App/User').messageListAction(sFolderFullNameRaw, mUid, iSetAction, aMessages);
	};

	/**
	 * @param {string} sFolderFullNameRaw
	 * @param {number} iSetAction
	 */
	MessageListMailBoxUserView.prototype.setActionForAll = function (sFolderFullNameRaw, iSetAction)
	{
		var
			oFolder = null,
			aMessages = MessageStore.messageList()
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

				require('App/User').reloadFlagsCurrentMessageListAndMessageFromCache();
			}
		}
	};

	MessageListMailBoxUserView.prototype.listSetSeen = function ()
	{
		this.setAction(FolderStore.currentFolderFullNameRaw(), true,
			Enums.MessageSetAction.SetSeen, MessageStore.messageListCheckedOrSelected());
	};

	MessageListMailBoxUserView.prototype.listSetAllSeen = function ()
	{
		this.setActionForAll(FolderStore.currentFolderFullNameRaw(), Enums.MessageSetAction.SetSeen);
	};

	MessageListMailBoxUserView.prototype.listUnsetSeen = function ()
	{
		this.setAction(FolderStore.currentFolderFullNameRaw(), true,
			Enums.MessageSetAction.UnsetSeen, MessageStore.messageListCheckedOrSelected());
	};

	MessageListMailBoxUserView.prototype.listSetFlags = function ()
	{
		this.setAction(FolderStore.currentFolderFullNameRaw(), true,
			Enums.MessageSetAction.SetFlag, MessageStore.messageListCheckedOrSelected());
	};

	MessageListMailBoxUserView.prototype.listUnsetFlags = function ()
	{
		this.setAction(FolderStore.currentFolderFullNameRaw(), true,
			Enums.MessageSetAction.UnsetFlag, MessageStore.messageListCheckedOrSelected());
	};

	MessageListMailBoxUserView.prototype.flagMessages = function (oCurrentMessage)
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
				this.setAction(oCurrentMessage.folderFullNameRaw, true, oCurrentMessage.flagged() ?
					Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
			}
			else
			{
				this.setAction(oCurrentMessage.folderFullNameRaw, true, oCurrentMessage.flagged() ?
					Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, [oCurrentMessage]);
			}
		}
	};

	MessageListMailBoxUserView.prototype.flagMessagesFast = function (bFlag)
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
				this.setAction(aChecked[0].folderFullNameRaw, true,
					aChecked.length === aFlagged.length ? Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
			}
			else
			{
				this.setAction(aChecked[0].folderFullNameRaw, true,
					!bFlag ? Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, aChecked);
			}
		}
	};

	MessageListMailBoxUserView.prototype.seenMessagesFast = function (bSeen)
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
				this.setAction(aChecked[0].folderFullNameRaw, true,
					0 < aUnseen.length ? Enums.MessageSetAction.SetSeen : Enums.MessageSetAction.UnsetSeen, aChecked);
			}
			else
			{
				this.setAction(aChecked[0].folderFullNameRaw, true,
					bSeen ? Enums.MessageSetAction.SetSeen : Enums.MessageSetAction.UnsetSeen, aChecked);
			}
		}
	};

	MessageListMailBoxUserView.prototype.gotoPage = function (oPage)
	{
		if (oPage)
		{
			kn.setHash(Links.mailBox(
				FolderStore.currentFolderFullNameHash(),
				oPage.value,
				MessageStore.messageListSearch(),
				MessageStore.messageListThreadUid()
			));
		}
	};

	MessageListMailBoxUserView.prototype.gotoThread = function (oMessage)
	{
		if (oMessage && 0 < oMessage.threadsLen())
		{
			MessageStore.messageListPageBeforeThread(MessageStore.messageListPage());

			kn.setHash(Links.mailBox(
				FolderStore.currentFolderFullNameHash(),
				1,
				MessageStore.messageListSearch(),
				oMessage.uid
			));
		}
	};

	MessageListMailBoxUserView.prototype.clearListIsVisible = function ()
	{
		return '' === this.messageListSearchDesc() && '' === this.messageListError() &&
			'' === MessageStore.messageListEndThreadUid() &&
			0 < this.messageList().length && (this.isSpamFolder() || this.isTrashFolder());
	};

	MessageListMailBoxUserView.prototype.onBuild = function (oDom)
	{
		var self = this;

		this.oContentVisible = $('.b-content', oDom);
		this.oContentScrollable = $('.content', this.oContentVisible);

		this.selector.init(this.oContentVisible, this.oContentScrollable, Enums.KeyState.MessageList);

		oDom
			.on('click', '.messageList .b-message-list-wrapper', function () {
				if (Enums.Focused.MessageView === AppStore.focusedState())
				{
					AppStore.focusedState(Enums.Focused.MessageList);
				}
			})
			.on('click', '.e-pagenator .e-page', function () {
				self.gotoPage(ko.dataFor(this));
			})
			.on('click', '.messageList .checkboxCkeckAll', function () {
				self.checkAll(!self.checkAll());
			})
			.on('click', '.messageList .messageListItem .flagParent', function () {
				self.flagMessages(ko.dataFor(this));
			})
			.on('click', '.messageList .messageListItem .threads-len', function () {
				self.gotoThread(ko.dataFor(this));
			})
			.on('dblclick', '.messageList .messageListItem .actionHandle', function () {
				self.gotoThread(ko.dataFor(this));
			})
		;

		this.initUploaderForAppend();
		this.initShortcuts();

		if (!Globals.bMobileDevice && ifvisible && Settings.capa(Enums.Capa.Prefetch))
		{
			ifvisible.setIdleDuration(10);

			ifvisible.idle(function () {
				self.prefetchNextTick();
			});
		}
	};

	MessageListMailBoxUserView.prototype.initShortcuts = function ()
	{
		var self = this;

		// disable print
		key('ctrl+p, command+p', Enums.KeyState.MessageList, function () {
			return false;
		});

		key('enter', Enums.KeyState.MessageList, function () {
			if (self.message() && self.useAutoSelect())
			{
				Events.pub('mailbox.message-view.toggle-full-screen');
				return false;
			}
		});

		if (Settings.capa(Enums.Capa.MessageListActions))
		{
			// archive (zip)
			key('z', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
				self.archiveCommand();
				return false;
			});

			// delete
			key('delete, shift+delete, shift+3', Enums.KeyState.MessageList, function (event, handler) {
				if (event)
				{
					if (0 < MessageStore.messageListCheckedOrSelected().length)
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
		}

		if (Settings.capa(Enums.Capa.Reload))
		{
			// check mail
			key('ctrl+r, command+r', [Enums.KeyState.FolderList, Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
				self.reloadCommand();
				return false;
			});
		}

		// check all
		key('ctrl+a, command+a', Enums.KeyState.MessageList, function () {
			self.checkAll(!(self.checkAll() && !self.isIncompleteChecked()));
			return false;
		});

		if (Settings.capa(Enums.Capa.Composer))
		{
			// write/compose (open compose popup)
			key('w,c', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
				kn.showScreenPopup(require('View/Popup/Compose'));
				return false;
			});
		}

		if (Settings.capa(Enums.Capa.MessageListActions))
		{
			// important - star/flag messages
			key('i', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
				self.flagMessagesFast();
				return false;
			});
		}

		key('t', [Enums.KeyState.MessageList], function () {

			var oMessage = self.selectorMessageSelected();
			if (!oMessage)
			{
				oMessage = self.selectorMessageFocused();
			}

			if (oMessage && 0 < oMessage.threadsLen())
			{
				self.gotoThread(oMessage);
			}

			return false;
		});

		if (Settings.capa(Enums.Capa.MessageListActions))
		{
			// move
			key('m', Enums.KeyState.MessageList, function () {
				self.moveDropdownTrigger(true);
				return false;
			});
		}

		if (Settings.capa(Enums.Capa.MessageListActions))
		{
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
		}

		if (Settings.capa(Enums.Capa.Composer))
		{
			key('shift+f', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
				self.multyForwardCommand();
				return false;
			});
		}

		if (Settings.capa(Enums.Capa.Search))
		{
			// search input focus
			key('/', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
				self.inputMessageListSearchFocus(true);
				return false;
			});
		}

		// cancel search
		key('esc', Enums.KeyState.MessageList, function () {
			if ('' !== self.messageListSearchDesc())
			{
				self.cancelSearch();
				return false;
			}
			else if ('' !== self.messageListEndThreadUid())
			{
				self.cancelThreadUid();
				return false;
			}
		});

		// change focused state
		key('tab, shift+tab, left, right', Enums.KeyState.MessageList, function (event, handler) {
			if (event && handler && ('shift+tab' === handler.shortcut || 'left' === handler.shortcut))
			{
				AppStore.focusedState(Enums.Focused.FolderList);
			}
			else if (self.message())
			{
				AppStore.focusedState(Enums.Focused.MessageView);
			}

			return false;
		});

		key('ctrl+left, command+left', Enums.KeyState.MessageView, function () {
			return false;
		});

		key('ctrl+right, command+right', Enums.KeyState.MessageView, function () {
			return false;
		});
	};

	MessageListMailBoxUserView.prototype.prefetchNextTick = function ()
	{
		if (ifvisible && !this.bPrefetch && !ifvisible.now() && this.viewModelVisibility())
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

	MessageListMailBoxUserView.prototype.composeClick = function ()
	{
		if (Settings.capa(Enums.Capa.Composer))
		{
			kn.showScreenPopup(require('View/Popup/Compose'));
		}
	};

	MessageListMailBoxUserView.prototype.advancedSearchClick = function ()
	{
		if (Settings.capa(Enums.Capa.SearchAdv))
		{
			kn.showScreenPopup(require('View/Popup/AdvancedSearch'));
		}
	};

	MessageListMailBoxUserView.prototype.quotaTooltip = function ()
	{
		return Translator.i18n('MESSAGE_LIST/QUOTA_SIZE', {
			'SIZE': Utils.friendlySize(this.userUsageSize()),
			'PROC': this.userUsageProc(),
			'LIMIT': Utils.friendlySize(this.userQuota())
		});
	};

	MessageListMailBoxUserView.prototype.initUploaderForAppend = function ()
	{
		if (!Settings.settingsGet('AllowAppendMessage') || !this.dragOverArea())
		{
			return false;
		}

		var
			oJua = new Jua({
				'action': Links.append(),
				'name': 'AppendFile',
				'queueSize': 1,
				'multipleSizeLimit': 1,
				'hidden': {
					'Folder': function () {
						return FolderStore.currentFolderFullNameRaw();
					}
				},
				'dragAndDropElement': this.dragOverArea(),
				'dragAndDropBodyElement': this.dragOverBodyArea()
			})
		;

		this.dragOver.subscribe(function (bValue) {
			if (bValue)
			{
				this.selector.scrollToTop();
			}
		}, this);

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
					MessageStore.messageListLoading(true);
					return true;
				}

				return false;

			}, this))
			.on('onComplete', _.bind(function () {
				require('App/User').reloadMessageList(true, true);
			}, this))
		;

		return !!oJua;
	};

	module.exports = MessageListMailBoxUserView;

}());
