/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		$ = require('$'),
		ko = require('ko'),
		key = require('key'),
		$html = require('$html'),

		Consts = require('Consts'),
		Enums = require('Enums'),
		Globals = require('Globals'),
		Utils = require('Utils'),
		Events = require('Events'),

		Cache = require('../Storages/WebMailCacheStorage.js'),
		Data = require('../Storages/WebMailDataStorage.js'),
		Remote = require('../Storages/WebMailAjaxRemoteStorage.js'),

		PopupsComposeViewModel = require('./Popups/PopupsComposeViewModel.js'),

		kn = require('kn'),
		KnoinAbstractViewModel = require('KnoinAbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function MailBoxMessageViewViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Right', 'MailMessageView');

		var
			self = this,
			sLastEmail = '',
			RL = require('../Boots/RainLoopApp.js'),
			createCommandHelper = function (sType) {
				return Utils.createCommand(self, function () {
					this.replyOrforward(sType);
				}, self.canBeRepliedOrForwarded);
			}
		;

		this.oMessageScrollerDom = null;

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
		this.layout = Data.layout;
		this.usePreviewPane = Data.usePreviewPane;
		this.isMessageSelected = Data.isMessageSelected;
		this.messageActiveDom = Data.messageActiveDom;
		this.messageError = Data.messageError;

		this.fullScreenMode = Data.messageFullScreenMode;

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

		this.canBeRepliedOrForwarded = this.messageVisibility;

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
				RL.deleteMessagesFromFolder(Enums.FolderType.Trash,
					this.message().folderFullNameRaw,
					[this.message().uid], true);
			}
		}, this.messageVisibility);

		this.deleteWithoutMoveCommand = Utils.createCommand(this, function () {
			if (this.message())
			{
				RL.deleteMessagesFromFolder(Enums.FolderType.Trash,
					Data.currentFolderFullNameRaw(),
					[this.message().uid], false);
			}
		}, this.messageVisibility);

		this.archiveCommand = Utils.createCommand(this, function () {
			if (this.message())
			{
				RL.deleteMessagesFromFolder(Enums.FolderType.Archive,
					this.message().folderFullNameRaw,
					[this.message().uid], true);
			}
		}, this.messageVisibility);

		this.spamCommand = Utils.createCommand(this, function () {
			if (this.message())
			{
				RL.deleteMessagesFromFolder(Enums.FolderType.Spam,
					this.message().folderFullNameRaw,
					[this.message().uid], true);
			}
		}, this.messageVisibility);

		this.notSpamCommand = Utils.createCommand(this, function () {
			if (this.message())
			{
				RL.deleteMessagesFromFolder(Enums.FolderType.NotSpam,
					this.message().folderFullNameRaw,
					[this.message().uid], true);
			}
		}, this.messageVisibility);

		// viewer
		this.viewHash = '';
		this.viewSubject = ko.observable('');
		this.viewFromShort = ko.observable('');
		this.viewToShort = ko.observable('');
		this.viewFrom = ko.observable('');
		this.viewTo = ko.observable('');
		this.viewCc = ko.observable('');
		this.viewBcc = ko.observable('');
		this.viewDate = ko.observable('');
		this.viewMoment = ko.observable('');
		this.viewLineAsCcc = ko.observable('');
		this.viewViewLink = ko.observable('');
		this.viewDownloadLink = ko.observable('');
		this.viewUserPic = ko.observable(Consts.DataImages.UserDotPic);
		this.viewUserPicVisible = ko.observable(false);

		this.viewPgpPassword = ko.observable('');
		this.viewPgpSignedVerifyStatus = ko.computed(function () {
			return this.message() ? this.message().pgpSignedVerifyStatus() : Enums.SignedVerifyStatus.None;
		}, this);

		this.viewPgpSignedVerifyUser = ko.computed(function () {
			return this.message() ? this.message().pgpSignedVerifyUser() : '';
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
				this.viewToShort(oMessage.toToLine(true, true));
				this.viewFrom(oMessage.fromToLine(false));
				this.viewTo(oMessage.toToLine(false));
				this.viewCc(oMessage.ccToLine(false));
				this.viewBcc(oMessage.bccToLine(false));
				this.viewDate(oMessage.fullFormatDateValue());
				this.viewMoment(oMessage.momentDate());
				this.viewLineAsCcc(oMessage.lineAsCcc());
				this.viewViewLink(oMessage.viewLink());
				this.viewDownloadLink(oMessage.downloadLink());

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
				$html.addClass('rl-message-fullscreen');
			}
			else
			{
				$html.removeClass('rl-message-fullscreen');
			}

			Utils.windowResize();
		});

		this.messageLoadingThrottle.subscribe(function (bV) {
			if (bV)
			{
				Utils.windowResize();
			}
		});

		this.goUpCommand = Utils.createCommand(this, function () {
			Events.pub('mailbox.message-list.selector.go-up');
		});

		this.goDownCommand = Utils.createCommand(this, function () {
			Events.pub('mailbox.message-list.selector.go-down');
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('MailBoxMessageViewViewModel', MailBoxMessageViewViewModel);

	MailBoxMessageViewViewModel.prototype.isPgpActionVisible = function ()
	{
		return Enums.SignedVerifyStatus.Success !== this.viewPgpSignedVerifyStatus();
	};

	MailBoxMessageViewViewModel.prototype.isPgpStatusVerifyVisible = function ()
	{
		return Enums.SignedVerifyStatus.None !== this.viewPgpSignedVerifyStatus();
	};

	MailBoxMessageViewViewModel.prototype.isPgpStatusVerifySuccess = function ()
	{
		return Enums.SignedVerifyStatus.Success === this.viewPgpSignedVerifyStatus();
	};

	MailBoxMessageViewViewModel.prototype.pgpStatusVerifyMessage = function ()
	{
		var sResult = '';
		switch (this.viewPgpSignedVerifyStatus())
		{
			case Enums.SignedVerifyStatus.UnknownPublicKeys:
				sResult = Utils.i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND');
				break;
			case Enums.SignedVerifyStatus.UnknownPrivateKey:
				sResult = Utils.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND');
				break;
			case Enums.SignedVerifyStatus.Unverified:
				sResult = Utils.i18n('PGP_NOTIFICATIONS/UNVERIFIRED_SIGNATURE');
				break;
			case Enums.SignedVerifyStatus.Error:
				sResult = Utils.i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR');
				break;
			case Enums.SignedVerifyStatus.Success:
				sResult = Utils.i18n('PGP_NOTIFICATIONS/GOOD_SIGNATURE', {
					'USER': this.viewPgpSignedVerifyUser()
				});
				break;
		}

		return sResult;
	};

	MailBoxMessageViewViewModel.prototype.scrollToTop = function ()
	{
		var oCont = $('.messageItem.nano .content', this.viewModelDom);
		if (oCont && oCont[0])
		{
	//		oCont.animate({'scrollTop': 0}, 300);
			oCont.scrollTop(0);
		}
		else
		{
	//		$('.messageItem', this.viewModelDom).animate({'scrollTop': 0}, 300);
			$('.messageItem', this.viewModelDom).scrollTop(0);
		}

		Utils.windowResize();
	};

	MailBoxMessageViewViewModel.prototype.fullScreen = function ()
	{
		this.fullScreenMode(true);
		Utils.windowResize();
	};

	MailBoxMessageViewViewModel.prototype.unFullScreen = function ()
	{
		this.fullScreenMode(false);
		Utils.windowResize();
	};

	MailBoxMessageViewViewModel.prototype.toggleFullScreen = function ()
	{
		Utils.removeSelection();

		this.fullScreenMode(!this.fullScreenMode());
		Utils.windowResize();
	};

	/**
	 * @param {string} sType
	 */
	MailBoxMessageViewViewModel.prototype.replyOrforward = function (sType)
	{
		kn.showScreenPopup(PopupsComposeViewModel, [sType, Data.message()]);
	};

	MailBoxMessageViewViewModel.prototype.onBuild = function (oDom)
	{
		var
			self = this,
			RL = require('../Boots/RainLoopApp.js')
		;

		this.fullScreenMode.subscribe(function (bValue) {
			if (bValue)
			{
				self.message.focused(true);
			}
		}, this);

		$('.attachmentsPlace', oDom).magnificPopup({
			'delegate': '.magnificPopupImage:visible',
			'type': 'image',
			'gallery': {
				'enabled': true,
				'preload': [1, 1],
				'navigateByImgClick': true
			},
			'callbacks': {
				'open': function() {
					Globals.useKeyboardShortcuts(false);
				},
				'close': function() {
					Globals.useKeyboardShortcuts(true);
				}
			},
			'mainClass': 'mfp-fade',
			'removalDelay': 400
		});

		oDom
			.on('click', '.messageView .messageItem .messageItemHeader', function () {
				if (Globals.useKeyboardShortcuts() && self.message())
				{
					self.message.focused(true);
				}
			})
			.on('click', 'a', function (oEvent) {
				// setup maito protocol
				return !(!!oEvent && 3 !== oEvent['which'] && RL.mailToHelper($(this).attr('href')));
			})
			.on('click', '.attachmentsPlace .attachmentPreview', function (oEvent) {
				if (oEvent && oEvent.stopPropagation)
				{
					oEvent.stopPropagation();
				}
			})
			.on('click', '.attachmentsPlace .attachmentItem', function () {

				var
					oAttachment = ko.dataFor(this)
				;

				if (oAttachment && oAttachment.download)
				{
					RL.download(oAttachment.linkDownload());
				}
			})
		;

		this.message.focused.subscribe(function (bValue) {
			if (bValue && !Utils.inFocus()) {
				this.messageDomFocused(true);
			} else {
				this.messageDomFocused(false);
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
	MailBoxMessageViewViewModel.prototype.escShortcuts = function ()
	{
		if (this.viewModelVisibility() && this.message())
		{
			if (this.fullScreenMode())
			{
				this.fullScreenMode(false);
			}
			else if (Enums.Layout.NoPreview === Data.layout())
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

	MailBoxMessageViewViewModel.prototype.initShortcuts = function ()
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
			if (Enums.Layout.NoPreview !== Data.layout() && self.message())
			{
				self.toggleFullScreen();
				return false;
			}
		});

		// TODO // more toggle
	//	key('', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
	//		self.moreDropdownTrigger(true);
	//		return false;
	//	});

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
				Utils.toggleMessageBlockquote(Data.message().body);
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
		key('tab, shift+tab, left', Enums.KeyState.MessageView, function () {
			if (!self.fullScreenMode() && self.message() && Enums.Layout.NoPreview !== Data.layout())
			{
				self.message.focused(false);
			}

			return false;
		});
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isDraftFolder = function ()
	{
		return Data.message() && Data.draftFolder() === Data.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isSentFolder = function ()
	{
		return Data.message() && Data.sentFolder() === Data.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isSpamFolder = function ()
	{
		return Data.message() && Data.spamFolder() === Data.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isSpamDisabled = function ()
	{
		return Data.message() && Data.spamFolder() === Consts.Values.UnuseOptionValue;
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isArchiveFolder = function ()
	{
		return Data.message() && Data.archiveFolder() === Data.message().folderFullNameRaw;
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isArchiveDisabled = function ()
	{
		return Data.message() && Data.archiveFolder() === Consts.Values.UnuseOptionValue;
	};

	/**
	 * @return {boolean}
	 */
	MailBoxMessageViewViewModel.prototype.isDraftOrSentFolder = function ()
	{
		return this.isDraftFolder() || this.isSentFolder();
	};

	MailBoxMessageViewViewModel.prototype.composeClick = function ()
	{
		kn.showScreenPopup(PopupsComposeViewModel);
	};

	MailBoxMessageViewViewModel.prototype.editMessage = function ()
	{
		if (Data.message())
		{
			kn.showScreenPopup(PopupsComposeViewModel, [Enums.ComposeType.Draft, Data.message()]);
		}
	};

	MailBoxMessageViewViewModel.prototype.scrollMessageToTop = function ()
	{
		if (this.oMessageScrollerDom)
		{
			this.oMessageScrollerDom.scrollTop(0);
		}
	};

	/**
	 * @param {MessageModel} oMessage
	 */
	MailBoxMessageViewViewModel.prototype.showImages = function (oMessage)
	{
		if (oMessage && oMessage.showExternalImages)
		{
			oMessage.showExternalImages(true);
		}
	};

	/**
	 * @returns {string}
	 */
	MailBoxMessageViewViewModel.prototype.printableCheckedMessageCount = function ()
	{
		var iCnt = this.messageListCheckedOrSelectedUidsWithSubMails().length;
		return 0 < iCnt ? (100 > iCnt ? iCnt : '99+') : '';
	};


	/**
	 * @param {MessageModel} oMessage
	 */
	MailBoxMessageViewViewModel.prototype.verifyPgpSignedClearMessage = function (oMessage)
	{
		if (oMessage)
		{
			oMessage.verifyPgpSignedClearMessage();
		}
	};

	/**
	 * @param {MessageModel} oMessage
	 */
	MailBoxMessageViewViewModel.prototype.decryptPgpEncryptedMessage = function (oMessage)
	{
		if (oMessage)
		{
			oMessage.decryptPgpEncryptedMessage(this.viewPgpPassword());
		}
	};

	/**
	 * @param {MessageModel} oMessage
	 */
	MailBoxMessageViewViewModel.prototype.readReceipt = function (oMessage)
	{
		if (oMessage && '' !== oMessage.readReceipt())
		{
			Remote.sendReadReceiptMessage(Utils.emptyFunction, oMessage.folderFullNameRaw, oMessage.uid,
				oMessage.readReceipt(),
				Utils.i18n('READ_RECEIPT/SUBJECT', {'SUBJECT': oMessage.subject()}),
				Utils.i18n('READ_RECEIPT/BODY', {'READ-RECEIPT': Data.accountEmail()}));

			oMessage.isReadReceipt(true);

			Cache.storeMessageFlagsToCache(oMessage);

			var RL = require('../Boots/RainLoopApp.js');
			RL.reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	};

	module.exports = MailBoxMessageViewViewModel;

}(module, require));