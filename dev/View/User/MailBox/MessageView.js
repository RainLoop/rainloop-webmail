
(function () {

	'use strict';

	var
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		key = require('key'),

		PhotoSwipe = require('PhotoSwipe'),
		PhotoSwipeUI_Default = require('PhotoSwipeUI_Default'),

		Consts = require('Common/Consts'),
		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Events = require('Common/Events'),
		Translator = require('Common/Translator'),

		Cache = require('Common/Cache'),

		SettingsStore = require('Stores/User/Settings'),
		AccountStore = require('Stores/User/Account'),
		FolderStore = require('Stores/User/Folder'),
		MessageStore = require('Stores/User/Message'),

		Local = require('Storage/Client'),
		Remote = require('Remote/User/Ajax'),

		Promises = require('Promises/User/Ajax'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function MessageViewMailBoxUserView()
	{
		AbstractView.call(this, 'Right', 'MailMessageView');

		var
			self = this,
			sLastEmail = '',
			createCommandHelper = function (sType) {
				return Utils.createCommand(self, function () {
					this.lastReplyAction(sType);
					this.replyOrforward(sType);
				}, self.canBeRepliedOrForwarded);
			}
		;

		this.oHeaderDom = null;
		this.oMessageScrollerDom = null;

		this.pswp = null;

		this.message = MessageStore.message;
		this.messageListChecked = MessageStore.messageListChecked;
		this.hasCheckedMessages = MessageStore.hasCheckedMessages;
		this.messageListCheckedOrSelectedUidsWithSubMails = MessageStore.messageListCheckedOrSelectedUidsWithSubMails;
		this.messageLoadingThrottle = MessageStore.messageLoadingThrottle;
		this.messagesBodiesDom = MessageStore.messagesBodiesDom;
		this.useThreads = SettingsStore.useThreads;
		this.replySameFolder = SettingsStore.replySameFolder;
		this.layout = SettingsStore.layout;
		this.usePreviewPane = SettingsStore.usePreviewPane;
		this.isMessageSelected = MessageStore.isMessageSelected;
		this.messageActiveDom = MessageStore.messageActiveDom;
		this.messageError = MessageStore.messageError;

		this.fullScreenMode = MessageStore.messageFullScreenMode;

		this.messageListOfThreadsLoading = ko.observable(false).extend({'rateLimit': 1});

		this.lastReplyAction_ = ko.observable('');
		this.lastReplyAction = ko.computed({
			read: this.lastReplyAction_,
			write: function (sValue) {
				sValue = -1 === Utils.inArray(sValue, [
					Enums.ComposeType.Reply, Enums.ComposeType.ReplyAll, Enums.ComposeType.Forward
				]) ? Enums.ComposeType.Reply : sValue;
				this.lastReplyAction_(sValue);
			},
			owner: this
		});

		this.lastReplyAction(Local.get(Enums.ClientSideKeyName.LastReplyAction) || Enums.ComposeType.Reply);
		this.lastReplyAction_.subscribe(function (sValue) {
			Local.set(Enums.ClientSideKeyName.LastReplyAction, sValue);
		});

		this.showFullInfo = ko.observable(false);
		this.moreDropdownTrigger = ko.observable(false);
		this.messageDomFocused = ko.observable(false).extend({'rateLimit': 0});

		this.messageVisibility = ko.computed(function () {
			return !this.messageLoadingThrottle() && !!this.message();
		}, this);

		this.message.subscribe(function (oMessage) {
			if (!oMessage)
			{
				MessageStore.selectorMessageSelected(null);
			}
		}, this);

		this.canBeRepliedOrForwarded = ko.computed(function () {
			var bV = this.messageVisibility();
			return !this.isDraftFolder() && bV;
		}, this);

		// commands
		this.closeMessage = Utils.createCommand(this, function () {
			MessageStore.message(null);
		});

		this.replyCommand = createCommandHelper(Enums.ComposeType.Reply);
		this.replyAllCommand = createCommandHelper(Enums.ComposeType.ReplyAll);
		this.forwardCommand = createCommandHelper(Enums.ComposeType.Forward);
		this.forwardAsAttachmentCommand = createCommandHelper(Enums.ComposeType.ForwardAsAttachment);
		this.editAsNewCommand = createCommandHelper(Enums.ComposeType.EditAsNew);

		this.messageVisibilityCommand = Utils.createCommand(this, Utils.emptyFunction, this.messageVisibility);

		this.messageEditCommand = Utils.createCommand(this, function () {
			this.editMessage();
		}, this.messageVisibility);

		this.deleteCommand = Utils.createCommand(this, function () {
			var oMessage = this.message();
			if (oMessage)
			{
				this.message(null);
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.Trash,
					oMessage.folderFullNameRaw, [oMessage.uid], true);
			}
		}, this.messageVisibility);

		this.deleteWithoutMoveCommand = Utils.createCommand(this, function () {
			var oMessage = this.message();
			if (oMessage)
			{
				this.message(null);
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.Trash,
					oMessage.folderFullNameRaw, [oMessage.uid], false);
			}
		}, this.messageVisibility);

		this.archiveCommand = Utils.createCommand(this, function () {
			var oMessage = this.message();
			if (oMessage)
			{
				this.message(null);
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.Archive,
					oMessage.folderFullNameRaw, [oMessage.uid], true);
			}
		}, this.messageVisibility);

		this.spamCommand = Utils.createCommand(this, function () {
			var oMessage = this.message();
			if (oMessage)
			{
				this.message(null);
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.Spam,
					oMessage.folderFullNameRaw, [oMessage.uid], true);
			}
		}, this.messageVisibility);

		this.notSpamCommand = Utils.createCommand(this, function () {
			var oMessage = this.message();
			if (oMessage)
			{
				this.message(null);
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.NotSpam,
					oMessage.folderFullNameRaw, [oMessage.uid], true);
			}
		}, this.messageVisibility);

		// viewer

		this.viewBodyTopValue = ko.observable(0);

		this.viewFolder = '';
		this.viewUid = '';
		this.viewHash = '';
		this.viewSubject = ko.observable('');
		this.viewFromShort = ko.observable('');
		this.viewFromDkimData = ko.observable(['none', '']);
		this.viewToShort = ko.observable('');
		this.viewFrom = ko.observable('');
		this.viewTo = ko.observable('');
		this.viewCc = ko.observable('');
		this.viewBcc = ko.observable('');
		this.viewReplyTo = ko.observable('');
		this.viewTimeStamp = ko.observable(0);
		this.viewSize = ko.observable('');
		this.viewLineAsCss = ko.observable('');
		this.viewViewLink = ko.observable('');
		this.viewDownloadLink = ko.observable('');
		this.viewUserPic = ko.observable(Consts.DataImages.UserDotPic);
		this.viewUserPicVisible = ko.observable(false);
		this.viewIsImportant = ko.observable(false);
		this.viewIsFlagged = ko.observable(false);

// THREADS
		this.viewThreads = ko.observableArray([]);
		this.viewThreads.trigger = ko.observable(false);

		this.viewThreadMessages = ko.observableArray([]);
		this.viewThreadMessages.error = ko.observable('');

		this.viewThreadMessages.subscribe(function () {
			this.viewThreadMessages.error('');
		}, this);

		MessageStore.messageLastThreadUidsData.subscribe(function (oData) {
			if (oData && oData['Uids'])
			{
				oData['Uid'] = Utils.pString(oData['Uid']);
				if (this.viewFolder === oData['Folder'] && this.viewUid === oData['Uid'])
				{
					this.viewThreads(oData['Uids']);
					this.viewThreads.trigger(!this.viewThreads.trigger());
				}

				var oMessage = MessageStore.message();
				if (oMessage && oMessage.folderFullNameRaw === oData['Folder'] && oMessage.uid === oData['Uid'])
				{
					oMessage.threads(oData['Uids']);
				}

				oMessage = _.find(MessageStore.messageList(), function (oMessage) {
					return oMessage && oMessage.folderFullNameRaw === oData['Folder'] && oMessage.uid === oData['Uid'];
				});

				if (oMessage && oMessage.folderFullNameRaw === oData['Folder'] && oMessage.uid === oData['Uid'])
				{
					oMessage.threads(oData['Uids']);
				}
			}
		}, this);

		this.viewThreads.status = ko.computed(function () {

			this.viewThreads.trigger();

			var
				iIndex = 0,
				aResult = [false, '', '', '', ''],
				aThreads = this.viewThreads.peek(),
				iLen = aThreads.length
			;

			if (1 < iLen)
			{
				iIndex = Utils.inArray(this.viewUid, aThreads);
				if (-1 < iIndex)
				{
					aResult[0] = true;
					aResult[1] = (iIndex + 1) + '/' + iLen;
					aResult[2] = aThreads[iIndex];
					aResult[3] = 0 < iIndex && aThreads[iIndex - 1] ? aThreads[iIndex - 1] : '';
					aResult[4] = aThreads[iIndex + 1] ? aThreads[iIndex + 1] : '';
				}
			}

			return aResult;

		}, this).extend({'notify': 'always'});

		this.viewThreadsControlVisibility = ko.computed(function () {
			return !!this.viewThreads.status()[0];
		}, this);

		this.viewThreadsControlDesc = ko.computed(function () {
			return this.viewThreads.status()[1];
		}, this);

		this.viewThreadsControlBackAllow = ko.computed(function () {
			return '' !== this.viewThreads.status()[4] && !this.messageLoadingThrottle();
		}, this);

		this.viewThreadsControlForwardAllow = ko.computed(function () {
			return '' !== this.viewThreads.status()[3] && !this.messageLoadingThrottle();
		}, this);

		this.threadBackCommand = Utils.createCommand(this, function () {
			var aStatus = this.viewThreads.status();
			this.openThreadMessage(aStatus[4]);
		}, this.viewThreadsControlBackAllow);

		this.threadForwardCommand = Utils.createCommand(this, function () {
			var aStatus = this.viewThreads.status();
			this.openThreadMessage(aStatus[3]);
		}, this.viewThreadsControlForwardAllow);

		this.threadListCommand = Utils.createCommand(this, function () {

			var
				self = this,
				sFolder = this.viewFolder,
				sUid = this.viewUid,
				aUids = this.viewThreads(),
				aStatus = this.viewThreads.status()
			;

			if (aStatus && aStatus[0])
			{
				self.viewThreadMessages([]);

				Promises.messageListSimple(sFolder, aUids, this.messageListOfThreadsLoading).then(function (aList) {

					_.each(aList, function (oItem) {
						if (oItem && oItem.uid)
						{
							oItem.selected = sUid === oItem.uid;
						}
					});

					self.viewThreadMessages(aList);

				}).fail(function (iErrorCode) {
					self.viewThreadMessages([]);
					self.viewThreadMessages.error(Translator.getNotification(
						iErrorCode, '', Enums.Notification.CantGetMessageList));
				}).done();
			}

		}, function () {
			return !this.messageLoadingThrottle() &&
				!this.messageListOfThreadsLoading();
		});

// PGP
		this.viewPgpPassword = ko.observable('');
		this.viewPgpSignedVerifyStatus = ko.computed(function () {
			return this.message() ? this.message().pgpSignedVerifyStatus() : Enums.SignedVerifyStatus.None;
		}, this);

		this.viewPgpSignedVerifyUser = ko.computed(function () {
			return this.message() ? this.message().pgpSignedVerifyUser() : '';
		}, this);

		this.viewFromDkimStatusIconClass = ko.computed(function () {

			var sResult = 'icon-none iconcolor-display-none';
//			var sResult = 'icon-warning-alt iconcolor-grey';
			switch (this.viewFromDkimData()[0])
			{
				case 'none':
					break;
				case 'pass':
					sResult = 'icon-ok iconcolor-green';
//					sResult = 'icon-warning-alt iconcolor-green';
					break;
				default:
					sResult = 'icon-warning-alt iconcolor-red';
					break;
			}

			return sResult;

		}, this);

		this.viewFromDkimStatusTitle = ko.computed(function () {

			var aStatus = this.viewFromDkimData();
			if (Utils.isNonEmptyArray(aStatus))
			{
				if (aStatus[0] && aStatus[1])
				{
					return aStatus[1];
				}
				else if (aStatus[0])
				{
					return 'DKIM: ' + aStatus[0];
				}
			}

			return '';

		}, this);

		this.message.subscribe(function (oMessage) {

			this.messageActiveDom(null);

			this.viewPgpPassword('');

			if (oMessage)
			{
				if (this.viewHash !== oMessage.hash)
				{
					this.scrollMessageToTop();
				}

				this.viewFolder = oMessage.folderFullNameRaw;
				this.viewUid = oMessage.uid;
				this.viewHash = oMessage.hash;
				this.viewSubject(oMessage.subject());
				this.viewFromShort(oMessage.fromToLine(true, true));
				this.viewFromDkimData(oMessage.fromDkimData());
				this.viewToShort(oMessage.toToLine(true, true));
				this.viewFrom(oMessage.fromToLine(false));
				this.viewTo(oMessage.toToLine(false));
				this.viewCc(oMessage.ccToLine(false));
				this.viewBcc(oMessage.bccToLine(false));
				this.viewReplyTo(oMessage.replyToToLine(false));
				this.viewTimeStamp(oMessage.dateTimeStampInUTC());
				this.viewSize(oMessage.friendlySize());
				this.viewLineAsCss(oMessage.lineAsCss());
				this.viewViewLink(oMessage.viewLink());
				this.viewDownloadLink(oMessage.downloadLink());
				this.viewIsImportant(oMessage.isImportant());
				this.viewIsFlagged(oMessage.flagged());

				this.viewThreads(oMessage.threads());
				this.viewThreads.trigger(!this.viewThreads.trigger());

				sLastEmail = oMessage.fromAsSingleEmail();
				Cache.getUserPic(sLastEmail, function (sPic, sEmail) {
					if (sPic !== self.viewUserPic() && sLastEmail === sEmail)
					{
						self.viewUserPicVisible(false);
						self.viewUserPic(Consts.DataImages.UserDotPic);
						if ('' !== sPic)
						{
							self.viewUserPicVisible(true);
							self.viewUserPic(sPic);
						}
					}
				});
			}
			else
			{
				this.viewFolder = '';
				this.viewUid = '';
				this.viewHash = '';

				this.viewThreads([]);

				this.scrollMessageToTop();
			}

		}, this);

		this.message.viewTrigger.subscribe(function () {
			var oMessage = this.message();
			if (oMessage)
			{
				this.viewIsFlagged(oMessage.flagged());
			}
			else
			{
				this.viewIsFlagged(false);
			}
		}, this);

		this.fullScreenMode.subscribe(function (bValue) {
			if (bValue)
			{
				Globals.$html.addClass('rl-message-fullscreen');
			}
			else
			{
				Globals.$html.removeClass('rl-message-fullscreen');
			}

			Utils.windowResize();
		});

		this.messageLoadingThrottle.subscribe(Utils.windowResizeCallback);

		this.goUpCommand = Utils.createCommand(this, function () {
			Events.pub('mailbox.message-list.selector.go-up');
		});

		this.goDownCommand = Utils.createCommand(this, function () {
			Events.pub('mailbox.message-list.selector.go-down');
		});

		Events.sub('mailbox.message-view.toggle-full-screen', function () {
			this.toggleFullScreen();
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/User/MailBox/MessageView', 'View/App/MailBox/MessageView', 'MailBoxMessageViewViewModel'], MessageViewMailBoxUserView);
	_.extend(MessageViewMailBoxUserView.prototype, AbstractView.prototype);

	MessageViewMailBoxUserView.prototype.updateViewFlagsFromCache = function ()
	{
		var aFlags = this.getMessageFlagsFromCache(this.viewFolder, this.viewUid);
		if (aFlags)
		{
			this.viewIsFlagged(!!aFlags[1]);
		}
	};

	MessageViewMailBoxUserView.prototype.openThreadMessage = function (sUid)
	{
		var oMessage = this.message();
		if (oMessage && sUid)
		{
			MessageStore.selectThreadMessage(oMessage.folderFullNameRaw, sUid);
		}
	};

	MessageViewMailBoxUserView.prototype.isPgpActionVisible = function ()
	{
		return Enums.SignedVerifyStatus.Success !== this.viewPgpSignedVerifyStatus();
	};

	MessageViewMailBoxUserView.prototype.isPgpStatusVerifyVisible = function ()
	{
		return Enums.SignedVerifyStatus.None !== this.viewPgpSignedVerifyStatus();
	};

	MessageViewMailBoxUserView.prototype.isPgpStatusVerifySuccess = function ()
	{
		return Enums.SignedVerifyStatus.Success === this.viewPgpSignedVerifyStatus();
	};

	MessageViewMailBoxUserView.prototype.pgpStatusVerifyMessage = function ()
	{
		var sResult = '';
		switch (this.viewPgpSignedVerifyStatus())
		{
			case Enums.SignedVerifyStatus.UnknownPublicKeys:
				sResult = Translator.i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND');
				break;
			case Enums.SignedVerifyStatus.UnknownPrivateKey:
				sResult = Translator.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND');
				break;
			case Enums.SignedVerifyStatus.Unverified:
				sResult = Translator.i18n('PGP_NOTIFICATIONS/UNVERIFIRED_SIGNATURE');
				break;
			case Enums.SignedVerifyStatus.Error:
				sResult = Translator.i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR');
				break;
			case Enums.SignedVerifyStatus.Success:
				sResult = Translator.i18n('PGP_NOTIFICATIONS/GOOD_SIGNATURE', {
					'USER': this.viewPgpSignedVerifyUser()
				});
				break;
		}

		return sResult;
	};

	MessageViewMailBoxUserView.prototype.fullScreen = function ()
	{
		this.fullScreenMode(true);
		Utils.windowResize();
	};

	MessageViewMailBoxUserView.prototype.unFullScreen = function ()
	{
		this.fullScreenMode(false);
		Utils.windowResize();
	};

	MessageViewMailBoxUserView.prototype.toggleFullScreen = function ()
	{
		Utils.removeSelection();

		this.fullScreenMode(!this.fullScreenMode());
		Utils.windowResize();
	};

	/**
	 * @param {string} sType
	 */
	MessageViewMailBoxUserView.prototype.replyOrforward = function (sType)
	{
		kn.showScreenPopup(require('View/Popup/Compose'), [sType, MessageStore.message()]);
	};

	MessageViewMailBoxUserView.prototype.checkHeaderHeight = function ()
	{
		if (this.oHeaderDom)
		{
			this.viewBodyTopValue(this.message() ? this.oHeaderDom.height() +
				20 /* padding-(top/bottom): 20px */ + 1 /* borded-bottom: 1px */ : 0);
		}
	};

	MessageViewMailBoxUserView.prototype.onBuild = function (oDom)
	{
		var
			self = this,
			sErrorMessage = Translator.i18n('PREVIEW_POPUP/IMAGE_ERROR'),
			fCheckHeaderHeight = _.bind(this.checkHeaderHeight, this)
		;

		this.fullScreenMode.subscribe(function (bValue) {
			if (bValue)
			{
				self.message.focused(true);
			}
		}, this);

		this.fullScreenMode.subscribe(fCheckHeaderHeight);
		this.showFullInfo.subscribe(fCheckHeaderHeight);
		this.message.subscribe(fCheckHeaderHeight);

		Events.sub('window.resize', _.throttle(function () {
			_.delay(fCheckHeaderHeight, 1);
			_.delay(fCheckHeaderHeight, 200);
			_.delay(fCheckHeaderHeight, 500);
		}, 50));

		this.showFullInfo.subscribe(function () {
			Utils.windowResize();
			Utils.windowResize(250);
		});

		this.oHeaderDom = $('.messageItemHeader', oDom);
		this.oHeaderDom = this.oHeaderDom[0] ? this.oHeaderDom : null;

		this.pswpDom = $('.pswp', oDom)[0];

		if (this.pswpDom)
		{
			oDom
				.on('click', '.attachmentImagePreview[data-index]', function (oEvent) {

					var
						oPs = null,
						oEl = oEvent.currentTarget || null,
						aItems = []
//						fThumbBoundsFn = function (index) {
//							var oRes = null, oEl = aItems[index], oPos = null;
//							if (oEl && oEl.el)
//							{
//								oPos = oEl.el.find('.iconBG').offset();
//								oRes = oPos && oPos.top && oPos.left ?
//									{x: oPos.left, y: oPos.top, w: 60} : null;
//							}
//
//							return oRes;
//						}
					;

					oDom.find('.attachmentImagePreview[data-index]').each(function (index, oSubElement) {

						var
							$oItem = $(oSubElement)
						;

						aItems.push({
//							'el': $oItem,
							'w': 600, 'h': 400,
							'src': $oItem.attr('href'),
							'title': $oItem.attr('title') || ''
						});
					});

					if (aItems && 0 < aItems.length)
					{
						Globals.useKeyboardShortcuts(false);

						oPs = new PhotoSwipe(self.pswpDom, PhotoSwipeUI_Default, aItems, {
							'index': Utils.pInt($(oEl).data('index')),
							'bgOpacity': 0.85,
							'loadingIndicatorDelay': 500,
							'errorMsg': '<div class="pswp__error-msg">' + sErrorMessage + '</div>',
							'showHideOpacity': true,
							'tapToToggleControls': false,
//							'getThumbBoundsFn': fThumbBoundsFn,
							'timeToIdle': 0,
							'timeToIdleOutside': 0,
							'history': false,
							'arrowEl': 1 < aItems.length,
							'counterEl': 1 < aItems.length,
							'shareEl': false
						});

						oPs.listen('imageLoadComplete', function(index, item) {
							if (item && item.img && item.img.width && item.img.height)
							{
								item.w = item.img.width;
								item.h = item.img.height;

								oPs.updateSize(true);
							}
						});

						oPs.listen('close', function() {
							Globals.useKeyboardShortcuts(true);
						});

						oPs.init();
					}

					return false;
				});
		}

		oDom
			.on('click', 'a', function (oEvent) {
				// setup maito protocol
				return !(!!oEvent && 3 !== oEvent['which'] && Utils.mailToHelper($(this).attr('href'), require('View/Popup/Compose')));
			})
			.on('click', '.attachmentsPlace .attachmentIconParent', function (oEvent) {
				if (oEvent && oEvent.stopPropagation)
				{
					oEvent.stopPropagation();
				}
			})
			.on('click', '.thread-list .thread-list-message', function () {
				var oMessage = ko.dataFor(this);
				if (oMessage && oMessage.folderFullNameRaw && oMessage.uid)
				{
					self.openThreadMessage(oMessage.uid);
				}
			})
			.on('click', '.attachmentsPlace .attachmentItem .attachmentNameParent', function () {

				var
					oAttachment = ko.dataFor(this)
				;

				if (oAttachment && oAttachment.download)
				{
					require('App/User').download(oAttachment.linkDownload());
				}
			})
			.on('click', '.messageItemHeader .flagParent', function () {
				self.flagViewMessage();
			})
		;

		this.message.focused.subscribe(function (bValue) {
			if (bValue && !Utils.inFocus()) {
				this.messageDomFocused(true);
			} else {
				this.messageDomFocused(false);
				this.scrollMessageToTop();
				this.scrollMessageToLeft();
			}
		}, this);

		this.messageDomFocused.subscribe(function (bValue) {
			if (!bValue && Enums.KeyState.MessageView === Globals.keyScope())
			{
				this.message.focused(false);
			}
		}, this);

		Globals.keyScope.subscribe(function (sValue) {
			if (Enums.KeyState.MessageView === sValue && this.message.focused())
			{
				this.messageDomFocused(true);
			}
		}, this);

		this.oMessageScrollerDom = oDom.find('.messageItem .content');
		this.oMessageScrollerDom = this.oMessageScrollerDom && this.oMessageScrollerDom[0] ? this.oMessageScrollerDom : null;

		this.initShortcuts();
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.flagViewMessage = function ()
	{
		var oMessage = this.message();
		if (oMessage)
		{
			require('App/User').messageListAction(oMessage.folderFullNameRaw, oMessage.uid,
				oMessage.flagged() ? Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, [oMessage]);
		}
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.escShortcuts = function ()
	{
		if (this.viewModelVisibility() && this.message())
		{
			if (this.fullScreenMode())
			{
				this.fullScreenMode(false);

				if (Enums.Layout.NoPreview !== this.layout())
				{
					this.message.focused(false);
				}
			}
			else if (Enums.Layout.NoPreview === this.layout())
			{
				this.message(null);
			}
			else
			{
				this.message.focused(false);
			}

			return false;
		}
	};

	MessageViewMailBoxUserView.prototype.initShortcuts = function ()
	{
		var
			self = this
		;

		// exit fullscreen, back
		key('esc', Enums.KeyState.MessageView, _.bind(this.escShortcuts, this));

		// fullscreen
		key('enter', Enums.KeyState.MessageView, function () {
			self.toggleFullScreen();
			return false;
		});

		// reply
		key('r', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			if (MessageStore.message())
			{
				self.replyCommand();
				return false;
			}
		});

		// replaAll
		key('a', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			if (MessageStore.message())
			{
				self.replyAllCommand();
				return false;
			}
		});

		// forward
		key('f', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			if (MessageStore.message())
			{
				self.forwardCommand();
				return false;
			}
		});

		// message information
	//	key('i', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
	//		if (MessageStore.message())
	//		{
	//			self.showFullInfo(!self.showFullInfo());
	//			return false;
	//		}
	//	});

		// toggle message blockquotes
		key('b', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			if (MessageStore.message() && MessageStore.message().body)
			{
				MessageStore.message().body.find('.rlBlockquoteSwitcher').click();
				return false;
			}
		});

		key('ctrl+up, command+up', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.goUpCommand();
			return false;
		});

		key('ctrl+down, command+down', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.goDownCommand();
			return false;
		});

		key('ctrl+left, command+left', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.threadForwardCommand();
			return false;
		});

		key('ctrl+right, command+right', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.threadBackCommand();
			return false;
		});

		// print
		key('ctrl+p, command+p', Enums.KeyState.MessageView, function () {
			if (self.message())
			{
				self.message().printMessage();
			}

			return false;
		});

		// delete
		key('delete, shift+delete', Enums.KeyState.MessageView, function (event, handler) {
			if (event)
			{
				if (handler && 'shift+delete' === handler.shortcut)
				{
					self.deleteWithoutMoveCommand();
				}
				else
				{
					self.deleteCommand();
				}

				return false;
			}
		});

		// change focused state
		key('tab, shift+tab, left', Enums.KeyState.MessageView, function (event, handler) {
			if (!self.fullScreenMode() && self.message() && Enums.Layout.NoPreview !== self.layout())
			{
				if (event && handler && 'left' === handler.shortcut)
				{
					if (self.oMessageScrollerDom && 0 < self.oMessageScrollerDom.scrollLeft())
					{
						return true;
					}

					self.message.focused(false);
				}
				else
				{
					self.message.focused(false);
				}
			}
			else if (self.message() && Enums.Layout.NoPreview === self.layout() && event && handler && 'left' === handler.shortcut)
			{
				return true;
			}

			return false;
		});
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.isDraftFolder = function ()
	{
		return MessageStore.message() && FolderStore.draftFolder() === MessageStore.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.isSentFolder = function ()
	{
		return MessageStore.message() && FolderStore.sentFolder() === MessageStore.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.isSpamFolder = function ()
	{
		return MessageStore.message() && FolderStore.spamFolder() === MessageStore.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.isSpamDisabled = function ()
	{
		return MessageStore.message() && FolderStore.spamFolder() === Consts.Values.UnuseOptionValue;
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.isArchiveFolder = function ()
	{
		return MessageStore.message() && FolderStore.archiveFolder() === MessageStore.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.isArchiveDisabled = function ()
	{
		return MessageStore.message() && FolderStore.archiveFolder() === Consts.Values.UnuseOptionValue;
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.isDraftOrSentFolder = function ()
	{
		return this.isDraftFolder() || this.isSentFolder();
	};

	MessageViewMailBoxUserView.prototype.composeClick = function ()
	{
		kn.showScreenPopup(require('View/Popup/Compose'));
	};

	MessageViewMailBoxUserView.prototype.editMessage = function ()
	{
		if (MessageStore.message())
		{
			kn.showScreenPopup(require('View/Popup/Compose'), [Enums.ComposeType.Draft, MessageStore.message()]);
		}
	};

	MessageViewMailBoxUserView.prototype.scrollMessageToTop = function ()
	{
		if (this.oMessageScrollerDom)
		{
			if (50 < this.oMessageScrollerDom.scrollTop())
			{
				this.oMessageScrollerDom
					.scrollTop(50)
					.animate({'scrollTop': 0}, 200)
				;
			}
			else
			{
				this.oMessageScrollerDom.scrollTop(0);
			}

			Utils.windowResize();
		}
	};

	MessageViewMailBoxUserView.prototype.scrollMessageToLeft = function ()
	{
		if (this.oMessageScrollerDom)
		{
			this.oMessageScrollerDom.scrollLeft(0);
			Utils.windowResize();
		}
	};

	/**
	 * @param {MessageModel} oMessage
	 */
	MessageViewMailBoxUserView.prototype.showImages = function (oMessage)
	{
		if (oMessage && oMessage.showExternalImages)
		{
			oMessage.showExternalImages(true);
		}
	};

	/**
	 * @returns {string}
	 */
	MessageViewMailBoxUserView.prototype.printableCheckedMessageCount = function ()
	{
		var iCnt = this.messageListCheckedOrSelectedUidsWithSubMails().length;
		return 0 < iCnt ? (100 > iCnt ? iCnt : '99+') : '';
	};


	/**
	 * @param {MessageModel} oMessage
	 */
	MessageViewMailBoxUserView.prototype.verifyPgpSignedClearMessage = function (oMessage)
	{
		if (oMessage)
		{
			oMessage.verifyPgpSignedClearMessage();
		}
	};

	/**
	 * @param {MessageModel} oMessage
	 */
	MessageViewMailBoxUserView.prototype.decryptPgpEncryptedMessage = function (oMessage)
	{
		if (oMessage)
		{
			oMessage.decryptPgpEncryptedMessage(this.viewPgpPassword());
		}
	};

	/**
	 * @param {MessageModel} oMessage
	 */
	MessageViewMailBoxUserView.prototype.readReceipt = function (oMessage)
	{
		if (oMessage && '' !== oMessage.readReceipt())
		{
			Remote.sendReadReceiptMessage(Utils.emptyFunction, oMessage.folderFullNameRaw, oMessage.uid,
				oMessage.readReceipt(),
				Translator.i18n('READ_RECEIPT/SUBJECT', {'SUBJECT': oMessage.subject()}),
				Translator.i18n('READ_RECEIPT/BODY', {'READ-RECEIPT': AccountStore.email()}));

			oMessage.isReadReceipt(true);

			Cache.storeMessageFlagsToCache(oMessage);

			require('App/User').reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	};

	module.exports = MessageViewMailBoxUserView;

}());