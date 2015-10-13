
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		key = require('key'),

//		PhotoSwipe = require('PhotoSwipe'),
//		PhotoSwipeUI_Default = require('PhotoSwipeUI_Default'),

		Consts = require('Common/Consts'),
		Enums = require('Common/Enums'),
		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Events = require('Common/Events'),
		Translator = require('Common/Translator'),
		Audio = require('Common/Audio'),
		Links = require('Common/Links'),

		Cache = require('Common/Cache'),

		SocialStore = require('Stores/Social'),
		AppStore = require('Stores/User/App'),
		SettingsStore = require('Stores/User/Settings'),
		AccountStore = require('Stores/User/Account'),
		FolderStore = require('Stores/User/Folder'),
		MessageStore = require('Stores/User/Message'),

		Local = require('Storage/Client'),
		Settings = require('Storage/Settings'),
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

		this.oDom = null;
		this.oHeaderDom = null;
		this.oMessageScrollerDom = null;

		this.bodyBackgroundColor = ko.observable('');

		this.pswp = null;

		this.allowComposer = !!Settings.capa(Enums.Capa.Composer);
		this.allowMessageActions = !!Settings.capa(Enums.Capa.MessageActions);
		this.allowMessageListActions = !!Settings.capa(Enums.Capa.MessageListActions);

		this.logoImg = Utils.trim(Settings.settingsGet('UserLogoMessage'));
		this.logoIframe = Utils.trim(Settings.settingsGet('UserIframeMessage'));

		this.attachmentsActions = AppStore.attachmentsActions;

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

		this.highlightUnselectedAttachments = ko.observable(false).extend({'falseTimeout': 2000});

		this.showAttachmnetControls = ko.observable(false);

		this.allowAttachmnetControls = ko.computed(function () {
			return 0 < this.attachmentsActions().length &&
				Settings.capa(Enums.Capa.AttachmentsActions);
		}, this);

		this.downloadAsZipAllowed = ko.computed(function () {
			return -1 < Utils.inArray('zip', this.attachmentsActions()) &&
				this.allowAttachmnetControls();
		}, this);

		this.downloadAsZipLoading = ko.observable(false);
		this.downloadAsZipError = ko.observable(false).extend({'falseTimeout': 7000});

		this.saveToOwnCloudAllowed = ko.computed(function () {
			return -1 < Utils.inArray('owncloud', this.attachmentsActions()) &&
				this.allowAttachmnetControls();
		}, this);

		this.saveToOwnCloudLoading = ko.observable(false);
		this.saveToOwnCloudSuccess = ko.observable(false).extend({'falseTimeout': 2000});
		this.saveToOwnCloudError = ko.observable(false).extend({'falseTimeout': 7000});

		this.saveToOwnCloudSuccess.subscribe(function (bV) {
			if (bV)
			{
				this.saveToOwnCloudError(false);
			}
		}, this);

		this.saveToOwnCloudError.subscribe(function (bV) {
			if (bV)
			{
				this.saveToOwnCloudSuccess(false);
			}
		}, this);

		this.saveToDropboxAllowed = ko.computed(function () {
			return -1 < Utils.inArray('dropbox', this.attachmentsActions()) &&
				this.allowAttachmnetControls();
		}, this);

		this.saveToDropboxLoading = ko.observable(false);
		this.saveToDropboxSuccess = ko.observable(false).extend({'falseTimeout': 2000});
		this.saveToDropboxError = ko.observable(false).extend({'falseTimeout': 7000});

		this.saveToDropboxSuccess.subscribe(function (bV) {
			if (bV)
			{
				this.saveToDropboxError(false);
			}
		}, this);

		this.saveToDropboxError.subscribe(function (bV) {
			if (bV)
			{
				this.saveToDropboxSuccess(false);
			}
		}, this);

		this.showAttachmnetControls.subscribe(function (bV) {
			if (this.message())
			{
				_.each(this.message().attachments(), function (oItem) {
					if (oItem)
					{
						oItem.checked(!!bV);
					}
				});
			}
		}, this);

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
			if (oMessage && this.allowMessageListActions)
			{
				this.message(null);
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.Trash,
					oMessage.folderFullNameRaw, [oMessage.uid], true);
			}
		}, this.messageVisibility);

		this.deleteWithoutMoveCommand = Utils.createCommand(this, function () {
			var oMessage = this.message();
			if (oMessage && this.allowMessageListActions)
			{
				this.message(null);
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.Trash,
					oMessage.folderFullNameRaw, [oMessage.uid], false);
			}
		}, this.messageVisibility);

		this.archiveCommand = Utils.createCommand(this, function () {
			var oMessage = this.message();
			if (oMessage && this.allowMessageListActions)
			{
				this.message(null);
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.Archive,
					oMessage.folderFullNameRaw, [oMessage.uid], true);
			}
		}, this.messageVisibility);

		this.spamCommand = Utils.createCommand(this, function () {
			var oMessage = this.message();
			if (oMessage && this.allowMessageListActions)
			{
				this.message(null);
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.Spam,
					oMessage.folderFullNameRaw, [oMessage.uid], true);
			}
		}, this.messageVisibility);

		this.notSpamCommand = Utils.createCommand(this, function () {
			var oMessage = this.message();
			if (oMessage && this.allowMessageListActions)
			{
				this.message(null);
				require('App/User').deleteMessagesFromFolder(Enums.FolderType.NotSpam,
					oMessage.folderFullNameRaw, [oMessage.uid], true);
			}
		}, this.messageVisibility);

		this.dropboxEnabled = SocialStore.dropbox.enabled;
		this.dropboxApiKey = SocialStore.dropbox.apiKey;

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

		this.messageActiveDom.subscribe(function (oDom) {
			this.bodyBackgroundColor(oDom ? this.detectDomBackgroundColor(oDom): '');
		}, this);

		this.message.subscribe(function (oMessage) {

			this.messageActiveDom(null);

			if (oMessage)
			{
				this.showAttachmnetControls(false);

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
			Globals.$html.toggleClass('rl-message-fullscreen', bValue);
			Utils.windowResize();
		});

		this.messageLoadingThrottle.subscribe(Utils.windowResizeCallback);

		this.messageFocused = ko.computed(function () {
			return Enums.Focused.MessageView === AppStore.focusedState();
		});

		this.messageListAndMessageViewLoading = ko.computed(function () {
			return MessageStore.messageListCompleteLoadingThrottle() || MessageStore.messageLoadingThrottle();
		});

		this.goUpCommand = Utils.createCommand(this, function () {
			Events.pub('mailbox.message-list.selector.go-up', [
				Enums.Layout.NoPreview === this.layout() ? !!this.message() : true
			]);
		}, function () {
			return !this.messageListAndMessageViewLoading();
		});

		this.goDownCommand = Utils.createCommand(this, function () {
			Events.pub('mailbox.message-list.selector.go-down', [
				Enums.Layout.NoPreview === this.layout() ? !!this.message() : true
			]);
		}, function () {
			return !this.messageListAndMessageViewLoading();
		});

		Events.sub('mailbox.message-view.toggle-full-screen', function () {
			this.toggleFullScreen();
		}, this);

		this.attachmentPreview = _.bind(this.attachmentPreview, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/User/MailBox/MessageView', 'View/App/MailBox/MessageView', 'MailBoxMessageViewViewModel'], MessageViewMailBoxUserView);
	_.extend(MessageViewMailBoxUserView.prototype, AbstractView.prototype);

	MessageViewMailBoxUserView.prototype.detectDomBackgroundColor = function (oDom)
	{
		var
			iLimit = 5,
			sResult = '',
			aC = null,
			fFindDom = function (oDom) {
				var aC = oDom ? oDom.children() : null;
				return (aC && 1 === aC.length && aC.is('table,div,center')) ? aC : null;
			},
			fFindColor = function (oDom) {
				var sResult = '';
				if (oDom)
				{
					sResult = oDom.css('background-color') || '';
					if (!oDom.is('table'))
					{
						sResult = 'rgba(0, 0, 0, 0)' === sResult || 'transparent' === sResult ? '' : sResult;
					}
				}

				return sResult;
			}
		;

		if (oDom && 1 === oDom.length)
		{
			aC = oDom;
			while ('' === sResult)
			{
				iLimit--;
				if (0 >= iLimit)
				{
					break;
				}

				aC = fFindDom(aC);
				if (aC)
				{
					sResult = fFindColor(aC);
				}
				else
				{
					break;
				}
			}

			sResult = 'rgba(0, 0, 0, 0)' === sResult || 'transparent' === sResult ? '' : sResult;
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
		if (Settings.capa(Enums.Capa.Composer))
		{
			kn.showScreenPopup(require('View/Popup/Compose'), [sType, MessageStore.message()]);
		}
	};

	MessageViewMailBoxUserView.prototype.checkHeaderHeight = function ()
	{
		if (this.oHeaderDom)
		{
			this.viewBodyTopValue(this.message() ? this.oHeaderDom.height() +
				20 /* padding-(top/bottom): 20px */ + 1 /* borded-bottom: 1px */ : 0);
		}
	};

	/**
	 * @todo
	 * @param {string} sEmail
	 */
//	MessageViewMailBoxUserView.prototype.displayMailToPopup = function (sMailToUrl)
//	{
//		sMailToUrl = sMailToUrl.replace(/\?.+$/, '');
//
//		var
//			sResult = '',
//			aTo = [],
//			EmailModel = require('Model/Email'),
//			fParseEmailLine = function (sLine) {
//				return sLine ? _.compact(_.map([window.decodeURIComponent(sLine)], function (sItem) {
//						var oEmailModel = new EmailModel();
//						oEmailModel.mailsoParse(sItem);
//						return '' !== oEmailModel.email ? oEmailModel : null;
//					})) : null;
//			}
//		;
//
//		aTo = fParseEmailLine(sMailToUrl);
//		sResult = aTo && aTo[0] ? aTo[0].email : '';
//
//		return sResult;
//	};

	/**
	 * @param {Object} oAttachment
	 * @returns {boolean}
	 */
	MessageViewMailBoxUserView.prototype.attachmentPreview = function (oAttachment)
	{
		if (oAttachment && oAttachment.isImage() && !oAttachment.isLinked && this.message() && this.message().attachments())
		{
			var
				oDiv = $('<div>'),
				iIndex = 0,
				iListIndex = 0,
				aDynamicEl = _.compact(_.map(this.message().attachments(), function (oItem) {
					if (oItem && !oItem.isLinked && oItem.isImage())
					{
						if (oItem === oAttachment)
						{
							iIndex = iListIndex;
						}

						iListIndex++;

						return {
							'src':  oItem.linkPreview(),
							'thumb':  oItem.linkThumbnail(),
							'subHtml': oItem.fileName,
							'downloadUrl':  oItem.linkPreview()
						};
					}

					return null;
				}))
			;

			if (0 < aDynamicEl.length)
			{
				oDiv.on('onBeforeOpen.lg', function () {
					Globals.useKeyboardShortcuts(false);
					Utils.removeInFocus(true);
				});

				oDiv.on('onCloseAfter.lg', function () {
					Globals.useKeyboardShortcuts(true);
				});

				oDiv.lightGallery({
					dynamic: true,
					loadYoutubeThumbnail: false,
					loadVimeoThumbnail: false,
					thumbWidth: 80,
					thumbContHeight: 95,
					showThumbByDefault: false,
					mode: 'lg-lollipop', // 'lg-slide',
					index: iIndex,
					dynamicEl: aDynamicEl
				});
			}

			return false;
		}

		return true;
	};

	MessageViewMailBoxUserView.prototype.onBuild = function (oDom)
	{
		var
			self = this,
			oScript = null,
//			sErrorMessage = Translator.i18n('PREVIEW_POPUP/IMAGE_ERROR'),
			fCheckHeaderHeight = _.bind(this.checkHeaderHeight, this)
		;

		this.oDom = oDom;

		this.fullScreenMode.subscribe(function (bValue) {
			if (bValue && self.message())
			{
				AppStore.focusedState(Enums.Focused.MessageView);
			}
		}, this);

		this.showAttachmnetControls.subscribe(fCheckHeaderHeight);
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

		if (this.dropboxEnabled() && this.dropboxApiKey() && !window.Dropbox)
		{
			oScript = window.document.createElement('script');
			oScript.type = 'text/javascript';
			oScript.src = 'https://www.dropbox.com/static/api/2/dropins.js';
			$(oScript).attr('id', 'dropboxjs').attr('data-app-key', self.dropboxApiKey());

			window.document.body.appendChild(oScript);
		}

		this.oHeaderDom = $('.messageItemHeader', oDom);
		this.oHeaderDom = this.oHeaderDom[0] ? this.oHeaderDom : null;

/*
		this.pswpDom = $('.pswp', oDom)[0];

		if (this.pswpDom)
		{
			oDom
				.on('click', '.attachmentImagePreview.visible', function (oEvent) {

					var
						iIndex = 0,
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

					oDom.find('.attachmentImagePreview.visible').each(function (index, oSubElement) {

						var
							$oItem = $(oSubElement)
						;

						if (oEl === oSubElement)
						{
							iIndex = index;
						}

						aItems.push({
							'w': 600, 'h': 400,
							'src': $oItem.attr('href'),
							'title': $oItem.attr('title') || ''
						});
					});

					if (aItems && 0 < aItems.length)
					{
						Globals.useKeyboardShortcuts(false);

						oPs = new PhotoSwipe(self.pswpDom, PhotoSwipeUI_Default, aItems, {
							'index': iIndex,
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
*/

		oDom
			.on('click', 'a', function (oEvent) {
				// setup maito protocol
				return !(!!oEvent && 3 !== oEvent['which'] && Utils.mailToHelper($(this).attr('href'),
					Settings.capa(Enums.Capa.Composer) ? require('View/Popup/Compose') : null));
			})
//			.on('mouseover', 'a', _.debounce(function (oEvent) {
//
//				if (oEvent)
//				{
//					var sMailToUrl = $(this).attr('href');
//					if (sMailToUrl && 'mailto:' === sMailToUrl.toString().substr(0, 7).toLowerCase())
//					{
//						sMailToUrl = sMailToUrl.toString().substr(7);
//						self.displayMailToPopup(sMailToUrl);
//					}
//				}
//
//				return true;
//
//			}, 1000))
			.on('click', '.attachmentsPlace .attachmentIconParent', function (oEvent) {
				if (oEvent && oEvent.stopPropagation)
				{
					oEvent.stopPropagation();
				}
			})
			.on('click', '.attachmentsPlace .showPreplay', function (oEvent) {
				if (oEvent && oEvent.stopPropagation)
				{
					oEvent.stopPropagation();
				}

				var oAttachment = ko.dataFor(this);
				if (oAttachment && Audio.supported)
				{
					switch (true)
					{
						case Audio.supportedMp3 && oAttachment.isMp3():
							Audio.playMp3(oAttachment.linkDownload(), oAttachment.fileName);
							break;
						case Audio.supportedOgg && oAttachment.isOgg():
							Audio.playOgg(oAttachment.linkDownload(), oAttachment.fileName);
							break;
						case Audio.supportedWav && oAttachment.isWav():
							Audio.playWav(oAttachment.linkDownload(), oAttachment.fileName);
							break;
					}
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
			.on('click', '.messageItemHeader .subjectParent .flagParent', function () {
				var oMessage = self.message();
				if (oMessage)
				{
					require('App/User').messageListAction(oMessage.folderFullNameRaw, oMessage.uid,
						oMessage.flagged() ? Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, [oMessage]);
				}
			})
			.on('click', '.thread-list .flagParent', function () {
				var oMessage = ko.dataFor(this);
				if (oMessage && oMessage.folder && oMessage.uid)
				{
					require('App/User').messageListAction(
						oMessage.folder, oMessage.uid,
						oMessage.flagged() ? Enums.MessageSetAction.UnsetFlag : Enums.MessageSetAction.SetFlag, [oMessage]);
				}

				self.threadsDropdownTrigger(true);

				return false;
			})
		;

		AppStore.focusedState.subscribe(function (sValue) {
			if (Enums.Focused.MessageView !== sValue)
			{
				this.scrollMessageToTop();
				this.scrollMessageToLeft();
			}
		}, this);

		Globals.keyScopeReal.subscribe(function (sValue) {
			this.messageDomFocused(Enums.KeyState.MessageView === sValue && !Utils.inFocus());
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

				if (Enums.Layout.NoPreview !== this.layout())
				{
					AppStore.focusedState(Enums.Focused.MessageList);
				}
			}
			else if (Enums.Layout.NoPreview === this.layout())
			{
				this.message(null);
			}
			else
			{
				AppStore.focusedState(Enums.Focused.MessageList);
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
		key('esc, backspace', Enums.KeyState.MessageView, _.bind(this.escShortcuts, this));

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

		key('ctrl+up, command+up, ctrl+left, command+left', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
			self.goUpCommand();
			return false;
		});

		key('ctrl+down, command+down, ctrl+right, command+right', [Enums.KeyState.MessageList, Enums.KeyState.MessageView], function () {
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

					AppStore.focusedState(Enums.Focused.MessageList);
				}
				else
				{
					AppStore.focusedState(Enums.Focused.MessageList);
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
		if (Settings.capa(Enums.Capa.Composer))
		{
			kn.showScreenPopup(require('View/Popup/Compose'));
		}
	};

	MessageViewMailBoxUserView.prototype.editMessage = function ()
	{
		if (Settings.capa(Enums.Capa.Composer) && MessageStore.message())
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

	MessageViewMailBoxUserView.prototype.getAttachmentsHashes = function ()
	{
		return _.compact(_.map(this.message() ? this.message().attachments() : [], function (oItem) {
			return oItem && !oItem.isLinked && oItem.checked() ? oItem.download : '';
		}));
	};

	MessageViewMailBoxUserView.prototype.downloadAsZip = function ()
	{
		var self = this, aHashes = this.getAttachmentsHashes();
		if (0 < aHashes.length)
		{
			Promises.attachmentsActions('Zip', aHashes, this.downloadAsZipLoading).then(function (oResult) {
				if (oResult && oResult.Result && oResult.Result.Files &&
					oResult.Result.Files[0] && oResult.Result.Files[0].Hash)
				{
					require('App/User').download(
						Links.attachmentDownload(oResult.Result.Files[0].Hash));
				}
				else
				{
					self.downloadAsZipError(true);
				}
			}).fail(function () {
				self.downloadAsZipError(true);
			});
		}
		else
		{
			this.highlightUnselectedAttachments(true);
		}
	};

	MessageViewMailBoxUserView.prototype.saveToOwnCloud = function ()
	{
		var self = this, aHashes = this.getAttachmentsHashes();
		if (0 < aHashes.length)
		{
			Promises.attachmentsActions('OwnCloud', aHashes, this.saveToOwnCloudLoading).then(function (oResult) {
				if (oResult && oResult.Result)
				{
					self.saveToOwnCloudSuccess(true);
				}
				else
				{
					self.saveToOwnCloudError(true);
				}
			}).fail(function () {
				self.saveToOwnCloudError(true);
			});
		}
		else
		{
			this.highlightUnselectedAttachments(true);
		}
	};

	MessageViewMailBoxUserView.prototype.saveToDropbox = function ()
	{
		var self = this, aFiles = [], aHashes = this.getAttachmentsHashes();
		if (0 < aHashes.length)
		{
			if (window.Dropbox)
			{
				Promises.attachmentsActions('Dropbox', aHashes, this.saveToDropboxLoading).then(function (oResult) {
					if (oResult && oResult.Result && oResult.Result.Url && oResult.Result.ShortLife && oResult.Result.Files)
					{
						if (window.Dropbox && Utils.isArray(oResult.Result.Files))
						{
							_.each(oResult.Result.Files, function (oItem) {
								aFiles.push({
									'url': oResult.Result.Url +
										Links.attachmentDownload(oItem.Hash, oResult.Result.ShortLife),
									'filename': oItem.FileName
								});
							});

							window.Dropbox.save({
								'files': aFiles,
								'progress': function () {
									self.saveToDropboxLoading(true);
									self.saveToDropboxError(false);
									self.saveToDropboxSuccess(false);
								},
								'cancel': function () {
									self.saveToDropboxSuccess(false);
									self.saveToDropboxError(false);
									self.saveToDropboxLoading(false);
								},
								'success': function () {
									self.saveToDropboxSuccess(true);
									self.saveToDropboxLoading(false);
								},
								'error': function () {
									self.saveToDropboxError(true);
									self.saveToDropboxLoading(false);
								}
							});
						}
						else
						{
							self.saveToDropboxError(true);
						}
					}
				}).fail(function () {
					self.saveToDropboxError(true);
				});
			}
		}
		else
		{
			this.highlightUnselectedAttachments(true);
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

		this.checkHeaderHeight();
	};

	/**
	 * @return {string}
	 */
	MessageViewMailBoxUserView.prototype.printableCheckedMessageCount = function ()
	{
		var iCnt = this.messageListCheckedOrSelectedUidsWithSubMails().length;
		return 0 < iCnt ? (100 > iCnt ? iCnt : '99+') : '';
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

		this.checkHeaderHeight();
	};

	module.exports = MessageViewMailBoxUserView;

}());