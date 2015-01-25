
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

		UserSettingsStore = require('Stores/UserSettings'),

		Local = require('Storage/Local'),
		Cache = require('Storage/User/Cache'),
		Data = require('Storage/User/Data'),
		Remote = require('Storage/User/Remote'),

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

		this.message = Data.message;
		this.currentMessage = Data.currentMessage;
		this.messageListChecked = Data.messageListChecked;
		this.hasCheckedMessages = Data.hasCheckedMessages;
		this.messageListCheckedOrSelectedUidsWithSubMails = Data.messageListCheckedOrSelectedUidsWithSubMails;
		this.messageLoading = Data.messageLoading;
		this.messageLoadingThrottle = Data.messageLoadingThrottle;
		this.messagesBodiesDom = Data.messagesBodiesDom;
		this.useThreads = Data.useThreads;
		this.replySameFolder = Data.replySameFolder;
		this.layout = UserSettingsStore.layout;
		this.usePreviewPane = UserSettingsStore.usePreviewPane;
		this.isMessageSelected = Data.isMessageSelected;
		this.messageActiveDom = Data.messageActiveDom;
		this.messageError = Data.messageError;

		this.fullScreenMode = Data.messageFullScreenMode;

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
				this.currentMessage(null);
			}
		}, this);

		this.canBeRepliedOrForwarded = ko.computed(function () {
			var bV = this.messageVisibility();
			return !this.isDraftFolder() && bV;
		}, this);

		// commands
		this.closeMessage = Utils.createCommand(this, function () {
			Data.message(null);
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
			if (this.message())
			{
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.Trash,
					this.message().folderFullNameRaw,
					[this.message().uid], true);
			}
		}, this.messageVisibility);

		this.deleteWithoutMoveCommand = Utils.createCommand(this, function () {
			if (this.message())
			{
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.Trash,
					Data.currentFolderFullNameRaw(),
					[this.message().uid], false);
			}
		}, this.messageVisibility);

		this.archiveCommand = Utils.createCommand(this, function () {
			if (this.message())
			{
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.Archive,
					this.message().folderFullNameRaw,
					[this.message().uid], true);
			}
		}, this.messageVisibility);

		this.spamCommand = Utils.createCommand(this, function () {
			if (this.message())
			{
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.Spam,
					this.message().folderFullNameRaw,
					[this.message().uid], true);
			}
		}, this.messageVisibility);

		this.notSpamCommand = Utils.createCommand(this, function () {
			if (this.message())
			{
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.NotSpam,
					this.message().folderFullNameRaw,
					[this.message().uid], true);
			}
		}, this.messageVisibility);

		// viewer

		this.viewBodyTopValue = ko.observable(0);

		this.viewHash = '';
		this.viewSubject = ko.observable('');
		this.viewFromShort = ko.observable('');
		this.viewFromDkimData = ko.observable(['none', '']);
		this.viewToShort = ko.observable('');
		this.viewFrom = ko.observable('');
		this.viewTo = ko.observable('');
		this.viewCc = ko.observable('');
		this.viewBcc = ko.observable('');
		this.viewDate = ko.observable('');
		this.viewSize = ko.observable('');
		this.viewMoment = ko.observable('');
		this.viewLineAsCcc = ko.observable('');
		this.viewViewLink = ko.observable('');
		this.viewDownloadLink = ko.observable('');
		this.viewUserPic = ko.observable(Consts.DataImages.UserDotPic);
		this.viewUserPicVisible = ko.observable(false);
		this.viewIsImportant = ko.observable(false);

		this.viewPgpPassword = ko.observable('');
		this.viewPgpSignedVerifyStatus = ko.computed(function () {
			return this.message() ? this.message().pgpSignedVerifyStatus() : Enums.SignedVerifyStatus.None;
		}, this);

		this.viewPgpSignedVerifyUser = ko.computed(function () {
			return this.message() ? this.message().pgpSignedVerifyUser() : '';
		}, this);

		this.viewFromDkimStatusIconClass = ko.computed(function () {

//			var sResult = 'icon-warning-alt iconcolor-grey';
			var sResult = 'icon-none iconcolor-display-none';
			switch (this.viewFromDkimData()[0])
			{
				case 'none':
//					sResult = 'icon-warning-alt iconcolor-grey';
					sResult = 'icon-none iconcolor-display-none';
					break;
				case 'pass':
					sResult = 'icon-ok iconcolor-green';
					break;
				default:
					sResult = 'icon-warning-alt iconcolor-red';
					break;
			}

			return sResult;

		}, this);

		this.viewFromDkimStatusTitle = ko.computed(function () {
			var aStatus = this.viewFromDkimData();
			return Utils.isNonEmptyArray(aStatus) ? 'DKIM: ' + aStatus[0] + ' (' + aStatus[1] + ')' : '';
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

				this.viewHash = oMessage.hash;
				this.viewSubject(oMessage.subject());
				this.viewFromShort(oMessage.fromToLine(true, true));
				this.viewFromDkimData(oMessage.fromDkimData());
				this.viewToShort(oMessage.toToLine(true, true));
				this.viewFrom(oMessage.fromToLine(false));
				this.viewTo(oMessage.toToLine(false));
				this.viewCc(oMessage.ccToLine(false));
				this.viewBcc(oMessage.bccToLine(false));
				this.viewDate(oMessage.fullFormatDateValue());
				this.viewSize(oMessage.friendlySize());
				this.viewMoment(oMessage.momentDate());
				this.viewLineAsCcc(oMessage.lineAsCcc());
				this.viewViewLink(oMessage.viewLink());
				this.viewDownloadLink(oMessage.downloadLink());
				this.viewIsImportant(oMessage.isImportant());

				sLastEmail = oMessage.fromAsSingleEmail();
				Cache.getUserPic(sLastEmail, function (sPic, $sEmail) {
					if (sPic !== self.viewUserPic() && sLastEmail === $sEmail)
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
				this.viewHash = '';
				this.scrollMessageToTop();
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

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/User/MailBox/MessageView', 'View/App/MailBox/MessageView', 'MailBoxMessageViewViewModel'], MessageViewMailBoxUserView);
	_.extend(MessageViewMailBoxUserView.prototype, AbstractView.prototype);

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
		kn.showScreenPopup(require('View/Popup/Compose'), [sType, Data.message()]);
	};

	MessageViewMailBoxUserView.prototype.onBuild = function (oDom)
	{
		var
			self = this,
			sErrorMessage = Translator.i18n('PREVIEW_POPUP/IMAGE_ERROR'),
			fCheckHeaderHeight = function () {
				if (self.oHeaderDom)
				{
					self.viewBodyTopValue(self.message() ? self.oHeaderDom.height() +
						20 /* padding-(top/bottom): 20px */ + 1 /* borded-bottom: 1px */ : 0);
				}
			}
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

		Globals.$win.on('resize', function () {
			_.delay(fCheckHeaderHeight, 1);
			_.delay(fCheckHeaderHeight, 200);
			_.delay(fCheckHeaderHeight, 500);
		});

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
			.on('click', '.attachmentsPlace .attachmentItem .attachmentNameParent', function () {

				var
					oAttachment = ko.dataFor(this)
				;

				if (oAttachment && oAttachment.download)
				{
					require('App/User').download(oAttachment.linkDownload());
				}
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
	MessageViewMailBoxUserView.prototype.escShortcuts = function ()
	{
		if (this.viewModelVisibility() && this.message())
		{
			if (this.fullScreenMode())
			{
				this.fullScreenMode(false);
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

		key('enter', Enums.KeyState.MessageList, function () {
			if (Enums.Layout.NoPreview !== self.layout() && self.message())
			{
				self.toggleFullScreen();
				return false;
			}
		});

		// reply
		key('r', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			if (Data.message())
			{
				self.replyCommand();
				return false;
			}
		});

		// replaAll
		key('a', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			if (Data.message())
			{
				self.replyAllCommand();
				return false;
			}
		});

		// forward
		key('f', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			if (Data.message())
			{
				self.forwardCommand();
				return false;
			}
		});

		// message information
	//	key('i', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
	//		if (oData.message())
	//		{
	//			self.showFullInfo(!self.showFullInfo());
	//			return false;
	//		}
	//	});

		// toggle message blockquotes
		key('b', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			if (Data.message() && Data.message().body)
			{
				Data.message().body.find('.rlBlockquoteSwitcher').click();
				return false;
			}
		});

		key('ctrl+left, command+left, ctrl+up, command+up', Enums.KeyState.MessageView, function () {
			self.goUpCommand();
			return false;
		});

		key('ctrl+right, command+right, ctrl+down, command+down', Enums.KeyState.MessageView, function () {
			self.goDownCommand();
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
		return Data.message() && Data.draftFolder() === Data.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.isSentFolder = function ()
	{
		return Data.message() && Data.sentFolder() === Data.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.isSpamFolder = function ()
	{
		return Data.message() && Data.spamFolder() === Data.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.isSpamDisabled = function ()
	{
		return Data.message() && Data.spamFolder() === Consts.Values.UnuseOptionValue;
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.isArchiveFolder = function ()
	{
		return Data.message() && Data.archiveFolder() === Data.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MessageViewMailBoxUserView.prototype.isArchiveDisabled = function ()
	{
		return Data.message() && Data.archiveFolder() === Consts.Values.UnuseOptionValue;
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
		if (Data.message())
		{
			kn.showScreenPopup(require('View/Popup/Compose'), [Enums.ComposeType.Draft, Data.message()]);
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
				Translator.i18n('READ_RECEIPT/BODY', {'READ-RECEIPT': Data.accountEmail()}));

			oMessage.isReadReceipt(true);

			Cache.storeMessageFlagsToCache(oMessage);

			require('App/User').reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	};

	module.exports = MessageViewMailBoxUserView;

}());