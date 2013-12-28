/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsComposeViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsCompose');

	this.oEditor = null;
	this.aDraftInfo = null;
	this.sInReplyTo = '';
	this.bFromDraft = false;
	this.sReferences = '';
	
	this.bReloadFolder = false;
	this.bAllowIdentities = RL.settingsGet('AllowIdentities');

	var
		self = this,
		oRainLoopData = RL.data(),
		fCcAndBccCheckHelper = function (aValue) {
			if (false === this.showCcAndBcc() && 0 < aValue.length)
			{
				this.showCcAndBcc(true);
			}
		}
	;

	this.resizer = ko.observable(false).extend({'throttle': 50});

	this.to = ko.observable('');
	this.to.focusTrigger = ko.observable(false);
	this.cc = ko.observable('');
	this.bcc = ko.observable('');

	this.replyTo = ko.observable('');
	this.subject = ko.observable('');

	this.sendError = ko.observable(false);
	this.sendSuccessButSaveError = ko.observable(false);
	this.savedError = ko.observable(false);

	this.savedTime = ko.observable(0);
	this.savedOrSendingText = ko.observable('');

	this.emptyToError = ko.observable(false);
	this.showCcAndBcc = ko.observable(false);

	this.cc.subscribe(fCcAndBccCheckHelper, this);
	this.bcc.subscribe(fCcAndBccCheckHelper, this);

	this.draftFolder = ko.observable('');
	this.draftUid = ko.observable('');
	this.sending = ko.observable(false);
	this.saving = ko.observable(false);
	this.attachments = ko.observableArray([]);

//	this.attachmentsInProcess = ko.computed(function () {
//		return _.filter(this.attachments(), function (oItem) {
//			return oItem && '' === oItem.tempName();
//		});
//	}, this);
//
//	this.attachmentsInReady = ko.computed(function () {
//		return _.filter(this.attachments(), function (oItem) {
//			return oItem && '' !== oItem.tempName();
//		});
//	}, this);


	this.attachmentsInProcess = this.attachments.filter(function (oItem) {
		return oItem && '' === oItem.tempName();
	});

	this.attachmentsInReady = this.attachments.filter(function (oItem) {
		return oItem && '' !== oItem.tempName();
	});

	this.attachments.subscribe(function () {
		this.triggerForResize();
	}, this);

	this.isDraftFolderMessage = ko.computed(function () {
		return '' !== this.draftFolder() && '' !== this.draftUid();
	}, this);

	this.composeUploaderButton = ko.observable(null);
	this.composeUploaderDropPlace = ko.observable(null);
	this.dragAndDropEnabled = ko.observable(false);
	this.dragAndDropOver = ko.observable(false).extend({'throttle': 1});
	this.dragAndDropVisible = ko.observable(false).extend({'throttle': 1});
	this.attacheMultipleAllowed = ko.observable(false);
	this.addAttachmentEnabled = ko.observable(false);

	this.composeEditorTextArea = ko.observable(null);
	this.composeEditorHtmlArea = ko.observable(null);
	this.composeEditorToolbar = ko.observable(null);

	this.identities = RL.data().identities;

	this.currentIdentityID = ko.observable('');
	
	this.currentIdentityString = ko.observable('');
	this.currentIdentityResultEmail = ko.observable('');

	this.identitiesOptions = ko.computed(function () {
		
		var aList = [{
			'optValue': oRainLoopData.accountEmail(),
			'optText': this.formattedFrom(false)
		}];

		_.each(oRainLoopData.identities(), function (oItem) {
			aList.push({
				'optValue': oItem.id,
				'optText': oItem.formattedNameForCompose()
			});
		});

		return aList;
		
	}, this);
	
	ko.computed(function () {
		
		var
			sResult = '',
			sResultEmail = '',
			oItem = null,
			aList = this.identities(),
			sID = this.currentIdentityID()
		;

		if (this.bAllowIdentities && sID && sID !== RL.data().accountEmail())
		{
			oItem = _.find(aList, function (oItem) {
				return oItem && sID === oItem['id'];
			});

			sResult = oItem ? oItem.formattedNameForCompose() : '';
			sResultEmail = oItem ? oItem.formattedNameForEmail() : '';

			if ('' === sResult && aList[0])
			{
				this.currentIdentityID(aList[0]['id']);
				return '';
			}
		}

		if ('' === sResult)
		{
			sResult = this.formattedFrom(false);
			sResultEmail = this.formattedFrom(true);
		}

		this.currentIdentityString(sResult);
		this.currentIdentityResultEmail(sResultEmail);
		
		return sResult;

	}, this);

	this.to.subscribe(function (sValue) {
		if (this.emptyToError() && 0 < sValue.length)
		{
			this.emptyToError(false);
		}
	}, this);

	this.canBeSended = ko.computed(function () {
		return !this.sending() &&
			!this.saving() &&
			0 === this.attachmentsInProcess().length &&
			0 < this.to().length
		;
	}, this);

	this.canBeSendedOrSaved = ko.computed(function () {
		return !this.sending() && !this.saving();
	}, this);

	this.deleteCommand = Utils.createCommand(this, function () {
		
		var
			oMessage = null,
			sDraftFolder = this.draftFolder(),
			sDraftUid = this.draftUid()
		;
		
		if (this.bFromDraft)
		{
			oMessage = RL.data().message();
			if (oMessage && sDraftFolder === oMessage.folderFullNameRaw && sDraftUid === oMessage.uid)
			{
				RL.data().message(null);
			}
		}
		
		if (RL.data().currentFolderFullNameRaw() === this.draftFolder())
		{
			_.each(RL.data().messageList(), function (oMessage) {
				if (oMessage && sDraftFolder === oMessage.folderFullNameRaw && sDraftUid === oMessage.uid)
				{
					oMessage.deleted(true);
				}
			});
		}
		
		RL.data().messageListIsNotCompleted(true);
		RL.remote().messagesDelete(function () {
			RL.cache().setFolderHash(sDraftFolder, '');
			RL.reloadMessageList();
		}, this.draftFolder(), [this.draftUid()]);

		this.bReloadFolder = false;
		kn.hideScreenPopup(PopupsComposeViewModel);
		
	}, function () {
		return this.isDraftFolderMessage();
	});

	this.sendMessageResponse = _.bind(this.sendMessageResponse, this);
	this.saveMessageResponse = _.bind(this.saveMessageResponse, this);

	this.sendCommand = Utils.createCommand(this, function () {
		var
			sTo = Utils.trim(this.to()),
			sSentFolder = RL.data().sentFolder(),
			aFlagsCache = []
		;

		if (0 === sTo.length)
		{
			this.emptyToError(true);
		}
		else
		{
			if (RL.data().replySameFolder())
			{
				if (Utils.isArray(this.aDraftInfo) && 3 === this.aDraftInfo.length && Utils.isNormal(this.aDraftInfo[2]) && 0 < this.aDraftInfo[2].length)
				{
					sSentFolder = this.aDraftInfo[2];
				}
			}

			if ('' === sSentFolder)
			{
				kn.showScreenPopup(PopupsFolderSystemViewModel, [Enums.SetSystemFoldersNotification.Sent]);
			}
			else
			{
				this.sendError(false);
				this.sending(true);
				this.bReloadFolder = true;

				if (Utils.isArray(this.aDraftInfo) && 3 === this.aDraftInfo.length)
				{
					aFlagsCache = RL.cache().getMessageFlagsFromCache(this.aDraftInfo[2], this.aDraftInfo[1]);
					if (aFlagsCache)
					{
						if ('forward' === this.aDraftInfo[0])
						{
							aFlagsCache[3] = true;
						}
						else
						{
							aFlagsCache[2] = true;
						}

						RL.cache().setMessageFlagsToCache(this.aDraftInfo[2], this.aDraftInfo[1], aFlagsCache);
						RL.reloadFlagsCurrentMessageListAndMessageFromCache();
					}
				}

				sSentFolder = Consts.Values.UnuseOptionValue === sSentFolder ? '' : sSentFolder;

				RL.cache().setFolderHash(this.draftFolder(), '');
				RL.cache().setFolderHash(sSentFolder, '');

				RL.remote().sendMessage(
					this.sendMessageResponse,
					this.draftFolder(),
					this.draftUid(),
					sSentFolder,
					this.currentIdentityResultEmail(),
					sTo,
					this.cc(),
					this.bcc(),
					this.subject(),
					this.oEditor.isHtml(),
					this.oEditor.getTextForRequest(),
					this.prepearAttachmentsForSendOrSave(),
					this.aDraftInfo,
					this.sInReplyTo,
					this.sReferences
				);
			}
		}
	}, this.canBeSendedOrSaved);

	this.saveCommand = Utils.createCommand(this, function () {

		if (RL.data().draftFolderNotEnabled())
		{
			kn.showScreenPopup(PopupsFolderSystemViewModel, [Enums.SetSystemFoldersNotification.Draft]);
		}
		else
		{
			this.savedError(false);
			this.saving(true);
			this.bReloadFolder = true;

			RL.cache().setFolderHash(RL.data().draftFolder(), '');

			RL.remote().saveMessage(
				this.saveMessageResponse,
				this.draftFolder(),
				this.draftUid(),
				RL.data().draftFolder(),
				this.currentIdentityResultEmail(),
				this.to(),
				this.cc(),
				this.bcc(),
				this.subject(),
				this.oEditor.isHtml(),
				this.oEditor.getTextForRequest(),
				this.prepearAttachmentsForSendOrSave(),
				this.aDraftInfo,
				this.sInReplyTo,
				this.sReferences
			);
		}

	}, this.canBeSendedOrSaved);

	RL.sub('interval.1m', function () {
		if (this.modalVisibility() && !RL.data().draftFolderNotEnabled() && !this.isEmptyForm(false) &&
			!this.saving() && !this.sending() && !this.savedError())
		{
			this.saveCommand();
		}
	}, this);

	Utils.initOnStartOrLangChange(null, this, function () {
		if (this.oEditor)
		{
			this.oEditor.initLanguage(
				Utils.i18n('EDITOR/TEXT_SWITCHER_CONFIRM'),
				Utils.i18n('EDITOR/TEXT_SWITCHER_PLAINT_TEXT'),
				Utils.i18n('EDITOR/TEXT_SWITCHER_RICH_FORMATTING')
			);
		}
	});

	this.showCcAndBcc.subscribe(function () {
		this.triggerForResize();
	}, this);

	this.dropboxEnabled = ko.observable(RL.settingsGet('DropboxApiKey') ? true : false);

	this.dropboxCommand = Utils.createCommand(this, function () {

		if (window.Dropbox)
		{
			window.Dropbox.choose({
				//'iframe': true,
				'success': function(aFiles) {

					if (aFiles && aFiles[0] && aFiles[0]['link'])
					{
						self.addDropboxAttachment(aFiles[0]);
					}
				},
				'linkType': "direct",
				'multiselect': false
			});
		}
		
		return true;

	}, function () {
		return this.dropboxEnabled();
	});
	
	this.modalVisibility.subscribe(function (bValue) {
		if (!bValue && this.bReloadFolder)
		{
			this.bReloadFolder = false;
			RL.reloadMessageList();
		}
	}, this);

	this.driveEnabled = ko.observable(false);

	this.driveCommand = Utils.createCommand(this, function () {

//		this.driveOpenPopup();
		return true;

	}, function () {
		return this.driveEnabled();
	});

//	this.driveCallback = _.bind(this.driveCallback, this);

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsComposeViewModel', PopupsComposeViewModel);

PopupsComposeViewModel.prototype.findIdentityIdByMessage = function (sComposeType, oMessage)
{
	var
		oIDs = {},
		sResult = '',
		fFindHelper = function (oItem) {
			if (oItem && oItem.email && oIDs[oItem.email])
			{
				sResult = oIDs[oItem.email];
				return true;
			}

			return false;
		}
	;

	if (this.bAllowIdentities)
	{
		_.each(this.identities(), function (oItem) {
			oIDs[oItem.email()] = oItem['id'];
		});
	}
	
	oIDs[RL.data().accountEmail()] = RL.data().accountEmail();

	switch (sComposeType)
	{
		case Enums.ComposeType.Empty:
			sResult = RL.data().accountEmail();
			break;
		case Enums.ComposeType.Reply:
		case Enums.ComposeType.ReplyAll:
		case Enums.ComposeType.Forward:
		case Enums.ComposeType.ForwardAsAttachment:
			_.find(_.union(oMessage.to, oMessage.cc, oMessage.bcc), fFindHelper);
			break;
		case Enums.ComposeType.Draft:
			_.find(_.union(oMessage.from, oMessage.replyTo), fFindHelper);
			break;
	}

	return sResult;
};

PopupsComposeViewModel.prototype.selectIdentity = function (oIdentity)
{
	if (oIdentity)
	{
		this.currentIdentityID(oIdentity.optValue);
	}
};

/**
 *
 * @param {boolean=} bHeaderResult = false
 * @returns {string}
 */
PopupsComposeViewModel.prototype.formattedFrom = function (bHeaderResult)
{
	var
		sDisplayName = RL.data().displayName(),
		sEmail = RL.data().accountEmail()
	;

	return '' === sDisplayName ? sEmail :
		((Utils.isUnd(bHeaderResult) ? false : !!bHeaderResult) ?
			'"' + Utils.quoteName(sDisplayName) + '" <' + sEmail + '>' :
			sDisplayName + ' (' + sEmail + ')')
	;
};

PopupsComposeViewModel.prototype.sendMessageResponse = function (sResult, oData)
{
	var bResult = false;

	this.sending(false);

	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		bResult = true;
		if (this.modalVisibility())
		{
			Utils.delegateRun(this, 'closeCommand');
		}
	}
	
	if (this.modalVisibility() && !bResult)
	{
		if (oData && Enums.Notification.CantSaveMessage === oData.ErrorCode)
		{
			this.sendSuccessButSaveError(true);
			window.alert(Utils.trim(Utils.i18n('COMPOSE/SAVED_ERROR_ON_SEND')));
		}
		else
		{
			this.sendError(true);
			window.alert(Utils.getNotification(oData && oData.ErrorCode ? oData.ErrorCode : Enums.Notification.CantSendMessage));
		}
	}
};

PopupsComposeViewModel.prototype.saveMessageResponse = function (sResult, oData)
{
	var
		bResult = false,
		oMessage = null
	;

	this.saving(false);

	if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
	{
		if (oData.Result.NewFolder && oData.Result.NewUid)
		{
			if (this.bFromDraft)
			{
				oMessage = RL.data().message();
				if (oMessage && this.draftFolder() === oMessage.folderFullNameRaw && this.draftUid() === oMessage.uid)
				{
					RL.data().message(null);
				}
			}

			this.draftFolder(oData.Result.NewFolder);
			this.draftUid(oData.Result.NewUid);

			if (this.modalVisibility())
			{
				this.savedTime(Math.round((new window.Date()).getTime() / 1000));

				this.savedOrSendingText(
					0 < this.savedTime() ? Utils.i18n('COMPOSE/SAVED_TIME', {
						'TIME': moment.unix(this.savedTime() - 1).format('LT')
					}) : ''
				);

				bResult = true;

				if (this.bFromDraft)
				{
					RL.cache().setFolderHash(this.draftFolder(), '');
				}
			}
		}
	}

	if (!this.modalVisibility() && !bResult)
	{
		this.savedError(true);
		this.savedOrSendingText(Utils.getNotification(Enums.Notification.CantSaveMessage));
	}
};

PopupsComposeViewModel.prototype.onHide = function ()
{
	this.reset();
	kn.routeOn();
};

/**
 * @param {string=} sType = Enums.ComposeType.Empty
 * @param {?MessageModel|Array=} oMessageOrArray = null
 * @param {Array=} aToEmails = null
 */
PopupsComposeViewModel.prototype.onShow = function (sType, oMessageOrArray, aToEmails)
{
	kn.routeOff();

	var
		self = this,
		sFrom = '',
		sTo = '',
		sCc = '',
		sDate = '',
		sSubject = '',
		oText = null,
		sText = '',
		sReplyTitle = '',
		aResplyAllParts = [],
		oExcludeEmail = {},
		mEmail = RL.data().accountEmail(),
		aDownloads = [],
		aDraftInfo = null,
		oMessage = null,
		sComposeType = sType || Enums.ComposeType.Empty,
		fEmailArrayToStringLineHelper = function (aList) {

			var
				iIndex = 0,
				iLen = aList.length,
				aResult = []
			;

			for (; iIndex < iLen; iIndex++)
			{
				aResult.push(aList[iIndex].toLine(false));
			}

			return aResult.join(', ');
		}
	;

	oMessageOrArray = oMessageOrArray || null;
	if (oMessageOrArray && Utils.isNormal(oMessageOrArray))
	{
		oMessage = Utils.isArray(oMessageOrArray) && 1 === oMessageOrArray.length ? oMessageOrArray[0] :
			(!Utils.isArray(oMessageOrArray) ? oMessageOrArray : null);
	}

	if (null !== mEmail)
	{
		oExcludeEmail[mEmail] = true;
		this.currentIdentityID(this.findIdentityIdByMessage(sComposeType, oMessage));
	}

	this.reset();

	if (Utils.isNonEmptyArray(aToEmails))
	{
		this.to(fEmailArrayToStringLineHelper(aToEmails));
	}

	if ('' !== sComposeType && oMessage)
	{
		sDate = oMessage.fullFormatDateValue();
		sSubject = oMessage.subject();
		aDraftInfo = oMessage.aDraftInfo;

		oText = $(oMessage.body).clone();
		Utils.removeBlockquoteSwitcher(oText);
		sText = oText.html();

		switch (sComposeType)
		{
			case Enums.ComposeType.Empty:
				break;
				
			case Enums.ComposeType.Reply:
				this.to(fEmailArrayToStringLineHelper(oMessage.replyEmails(oExcludeEmail)));
				this.subject(Utils.replySubjectAdd('Re', sSubject));
				this.prepearMessageAttachments(oMessage, sComposeType);
				this.aDraftInfo = ['reply', oMessage.uid, oMessage.folderFullNameRaw];
				this.sInReplyTo = oMessage.sMessageId;
				this.sReferences = Utils.trim(this.sInReplyTo + ' ' + oMessage.sReferences);
				break;

			case Enums.ComposeType.ReplyAll:
				aResplyAllParts = oMessage.replyAllEmails(oExcludeEmail);
				this.to(fEmailArrayToStringLineHelper(aResplyAllParts[0]));
				this.cc(fEmailArrayToStringLineHelper(aResplyAllParts[1]));
				this.subject(Utils.replySubjectAdd('Re', sSubject));
				this.prepearMessageAttachments(oMessage, sComposeType);
				this.aDraftInfo = ['reply', oMessage.uid, oMessage.folderFullNameRaw];
				this.sInReplyTo = oMessage.sMessageId;
				this.sReferences = Utils.trim(this.sInReplyTo + ' ' + oMessage.references());
				break;

			case Enums.ComposeType.Forward:
				this.subject(Utils.replySubjectAdd('Fwd', sSubject));
				this.prepearMessageAttachments(oMessage, sComposeType);
				this.aDraftInfo = ['forward', oMessage.uid, oMessage.folderFullNameRaw];
				this.sInReplyTo = oMessage.sMessageId;
				this.sReferences = Utils.trim(this.sInReplyTo + ' ' + oMessage.sReferences);
				break;

			case Enums.ComposeType.ForwardAsAttachment:
				this.subject(Utils.replySubjectAdd('Fwd', sSubject));
				this.prepearMessageAttachments(oMessage, sComposeType);
				this.aDraftInfo = ['forward', oMessage.uid, oMessage.folderFullNameRaw];
				this.sInReplyTo = oMessage.sMessageId;
				this.sReferences = Utils.trim(this.sInReplyTo + ' ' + oMessage.sReferences);
				break;

			case Enums.ComposeType.Draft:
				this.to(fEmailArrayToStringLineHelper(oMessage.to));
				this.cc(fEmailArrayToStringLineHelper(oMessage.cc));
				this.bcc(fEmailArrayToStringLineHelper(oMessage.bcc));

				this.bFromDraft = true;

				this.draftFolder(oMessage.folderFullNameRaw);
				this.draftUid(oMessage.uid);

				this.subject(sSubject);
				this.prepearMessageAttachments(oMessage, sComposeType);

				this.aDraftInfo = Utils.isNonEmptyArray(aDraftInfo) && 3 === aDraftInfo.length ? aDraftInfo : null;
				this.sInReplyTo = oMessage.sInReplyTo;
				this.sReferences = oMessage.sReferences;
				break;
		}

		if (this.oEditor)
		{
			switch (sComposeType)
			{
				case Enums.ComposeType.Reply:
				case Enums.ComposeType.ReplyAll:
					sFrom = oMessage.fromToLine(false, true);
					sReplyTitle = Utils.i18n('COMPOSE/REPLY_MESSAGE_TITLE', {
						'DATETIME': sDate,
						'EMAIL': sFrom
					});

					sText = '<br /><br />' + sReplyTitle + ':' +
						'<blockquote><br />' + sText + '</blockquote>';

					break;

				case Enums.ComposeType.Forward:
					sFrom = oMessage.fromToLine(false, true);
					sTo = oMessage.toToLine(false, true);
					sCc = oMessage.ccToLine(false, true);
					sText = '<br /><br /><br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_TITLE') +
							'<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_FROM') + ': ' + sFrom +
							'<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_TO') + ': ' + sTo +
							(0 < sCc.length ? '<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_CC') + ': ' + sCc : '') +
							'<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_SENT') + ': ' + Utils.encodeHtml(sDate) +
							'<br />' + Utils.i18n('COMPOSE/FORWARD_MESSAGE_TOP_SUBJECT') + ': ' + Utils.encodeHtml(sSubject) +
							'<br /><br />' + sText;
					break;
				case Enums.ComposeType.ForwardAsAttachment:
					sText = '';
					break;
			}

			this.oEditor.setRawText(sText, oMessage.isHtml());
		}
	}
	else if (this.oEditor && Enums.ComposeType.Empty === sComposeType)
	{
		this.oEditor.setRawText('<br />' + Utils.convertPlainTextToHtml(RL.data().signature()), Enums.EditorDefaultType.Html === RL.data().editorDefaultType());
	}
	else if (Utils.isNonEmptyArray(oMessageOrArray))
	{
		_.each(oMessageOrArray, function (oMessage) {
			self.addMessageAsAttachment(oMessage);
		});
	}

	aDownloads = this.getAttachmentsDownloadsForUpload();
	if (Utils.isNonEmptyArray(aDownloads))
	{
		RL.remote().messageUploadAttachments(function (sResult, oData) {

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				var
					oAttachment = null,
					sTempName = ''
				;

				if (!self.viewModelVisibility())
				{
					for (sTempName in oData.Result)
					{
						if (oData.Result.hasOwnProperty(sTempName))
						{
							oAttachment = self.getAttachmentById(oData.Result[sTempName]);
							if (oAttachment)
							{
								oAttachment.tempName(sTempName);
							}
						}
					}
				}
			}
			else
			{
				self.setMessageAttachmentFailedDowbloadText();
			}

		}, aDownloads);
	}

	this.triggerForResize();
};

PopupsComposeViewModel.prototype.onFocus = function ()
{
	if ('' === this.to())
	{
		this.to.focusTrigger(!this.to.focusTrigger());
	}
	else if (this.oEditor)
	{
		this.oEditor.focus();
	}
	
	this.triggerForResize();
};

PopupsComposeViewModel.prototype.tryToClosePopup = function ()
{
	var self = this;
	kn.showScreenPopup(PopupsAskViewModel, [Utils.i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'), function () {
		if (self.modalVisibility())
		{
			Utils.delegateRun(self, 'closeCommand');
		}
	}]);
};

PopupsComposeViewModel.prototype.onBuild = function ()
{
	this.initEditor();
	this.initUploader();

	var 
		self = this,
		oScript = null
	;

	$window.on('keydown', function (oEvent) {
		var bResult = true;

		if (oEvent && self.modalVisibility() && RL.data().useKeyboardShortcuts())
		{
			if (oEvent.ctrlKey && Enums.EventKeyCode.S === oEvent.keyCode)
			{
				self.saveCommand();
				bResult = false;
			}
			else if (oEvent.ctrlKey && Enums.EventKeyCode.Enter === oEvent.keyCode)
			{
				self.sendCommand();
				bResult = false;
			}
			else if (Enums.EventKeyCode.Esc === oEvent.keyCode)
			{
				self.tryToClosePopup();
				bResult = false;
			}
		}

		return bResult;
	});

	$window.on('resize', function () {
		self.triggerForResize();
	});

	if (this.dropboxEnabled())
	{
		oScript = document.createElement('script');
		oScript.type = 'text/javascript';
		oScript.src = 'https://www.dropbox.com/static/api/1/dropins.js';
		$(oScript).attr('id', 'dropboxjs').attr('data-app-key', RL.settingsGet('DropboxApiKey'));
		
		document.body.appendChild(oScript);
	}

// TODO (Google Drive)
//	if (false)
//	{
//		$.getScript('http://www.google.com/jsapi', function () {
//			if (window.google)
//			{
//				window.google.load('picker', '1', {
//					'callback': Utils.emptyFunction
//				});
//			}
//		});
//	}
};

//PopupsComposeViewModel.prototype.driveCallback = function (oData)
//{
//	if (oData && window.google && oData['action'] === window.google.picker.Action.PICKED)
//	{
//	}
//};
//
//PopupsComposeViewModel.prototype.driveOpenPopup = function ()
//{
//	if (window.google)
//	{
//		var
//			oPicker = new window.google.picker.PickerBuilder()
//				.enableFeature(window.google.picker.Feature.NAV_HIDDEN)
//				.addView(new window.google.picker.View(window.google.picker.ViewId.DOCS))
//				.setCallback(this.driveCallback).build()
//		;
//
//		oPicker.setVisible(true);
//	}
//};

/**
 * @param {string} sId
 * @return {?Object}
 */
PopupsComposeViewModel.prototype.getAttachmentById = function (sId)
{
	var
		aAttachments = this.attachments(),
		iIndex = 0,
		iLen = aAttachments.length
	;

	for (; iIndex < iLen; iIndex++)
	{
		if (aAttachments[iIndex] && sId === aAttachments[iIndex].id)
		{
			return aAttachments[iIndex];
		}
	}

	return null;
};

PopupsComposeViewModel.prototype.initEditor = function ()
{
	if (this.composeEditorTextArea() && this.composeEditorHtmlArea() && this.composeEditorToolbar())
	{
		var self = this;
		this.oEditor = new HtmlEditor(this.composeEditorTextArea(), this.composeEditorHtmlArea(), this.composeEditorToolbar(), {
			'onSwitch': function (bHtml) {
				if (!bHtml)
				{
					self.removeLinkedAttachments();
				}
			}
		});

		this.oEditor.initLanguage(
			Utils.i18n('EDITOR/TEXT_SWITCHER_CONFIRM'),
			Utils.i18n('EDITOR/TEXT_SWITCHER_PLAINT_TEXT'),
			Utils.i18n('EDITOR/TEXT_SWITCHER_RICH_FORMATTING')
		);
	}
};

PopupsComposeViewModel.prototype.initUploader = function ()
{
	if (this.composeUploaderButton())
	{
		var
			oUploadCache = {},
			iAttachmentSizeLimit = Utils.pInt(RL.settingsGet('AttachmentLimit')),
			oJua = new Jua({
				'action': RL.link().upload(),
				'name': 'uploader',
				'queueSize': 2,
				'multipleSizeLimit': 50,
				'disableFolderDragAndDrop': false,
				'clickElement': this.composeUploaderButton(),
				'dragAndDropElement': this.composeUploaderDropPlace()
			})
		;

		if (oJua)
		{
			oJua
//				.on('onLimitReached', function (iLimit) {
//					alert(iLimit);
//				})
				.on('onDragEnter', _.bind(function () {
					this.dragAndDropOver(true);
				}, this))
				.on('onDragLeave', _.bind(function () {
					this.dragAndDropOver(false);
				}, this))
				.on('onBodyDragEnter', _.bind(function () {
					this.dragAndDropVisible(true);
				}, this))
				.on('onBodyDragLeave', _.bind(function () {
					this.dragAndDropVisible(false);
				}, this))
				.on('onProgress', _.bind(function (sId, iLoaded, iTotal) {
					var oItem = null;
					if (Utils.isUnd(oUploadCache[sId]))
					{
						oItem = this.getAttachmentById(sId);
						if (oItem)
						{
							oUploadCache[sId] = oItem;
						}
					}
					else
					{
						oItem = oUploadCache[sId];
					}

					if (oItem)
					{
						oItem.progress(' - ' + Math.floor(iLoaded / iTotal * 100) + '%');
					}

				}, this))
				.on('onSelect', _.bind(function (sId, oData) {

					this.dragAndDropOver(false);

					var
						that = this,
						sFileName = Utils.isUnd(oData.FileName) ? '' : oData.FileName.toString(),
						mSize = Utils.isNormal(oData.Size) ? Utils.pInt(oData.Size) : null,
						oAttachment = new ComposeAttachmentModel(sId, sFileName, mSize)
					;

					oAttachment.cancel = (function (sId) {

						return function () {
							that.attachments.remove(function (oItem) {
								return oItem && oItem.id === sId;
							});

							if (oJua)
							{
								oJua.cancel(sId);
							}
						};

					}(sId));

					this.attachments.push(oAttachment);

					if (0 < mSize && 0 < iAttachmentSizeLimit && iAttachmentSizeLimit < mSize)
					{
						oAttachment.error(Utils.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG'));
						return false;
					}

					return true;

				}, this))
				.on('onStart', _.bind(function (sId) {

					var
						oItem = null
					;

					if (Utils.isUnd(oUploadCache[sId]))
					{
						oItem = this.getAttachmentById(sId);
						if (oItem)
						{
							oUploadCache[sId] = oItem;
						}
					}
					else
					{
						oItem = oUploadCache[sId];
					}

					if (oItem)
					{
						oItem.waiting(false);
						oItem.uploading(true);
					}

				}, this))
				.on('onComplete', _.bind(function (sId, bResult, oData) {

					var
						sError = '',
						mErrorCode = null,
						oAttachmentJson = null,
						oAttachment = this.getAttachmentById(sId)
					;

					oAttachmentJson = bResult && oData && oData.Result && oData.Result.Attachment ? oData.Result.Attachment : null;
					mErrorCode = oData && oData.Result && oData.Result.ErrorCode ? oData.Result.ErrorCode : null;

					if (null !== mErrorCode)
					{
						sError = Utils.getUploadErrorDescByCode(mErrorCode);
					}
					else if (!oAttachmentJson)
					{
						sError = Utils.i18n('UPLOAD/ERROR_UNKNOWN');
					}

					if (oAttachment)
					{
						if ('' !== sError && 0 < sError.length)
						{
							oAttachment
								.waiting(false)
								.uploading(false)
								.error(sError)
							;
						}
						else if (oAttachmentJson)
						{
							oAttachment
								.waiting(false)
								.uploading(false)
							;

							oAttachment.initByUploadJson(oAttachmentJson);
						}

						if (Utils.isUnd(oUploadCache[sId]))
						{
							delete (oUploadCache[sId]);
						}
					}

				}, this))
			;

			this
				.addAttachmentEnabled(true)
				.dragAndDropEnabled(oJua.isDragAndDropSupported())
			;
		}
		else
		{
			this
				.addAttachmentEnabled(false)
				.dragAndDropEnabled(false)
			;
		}
	}
};

/**
 * @return {Object}
 */
PopupsComposeViewModel.prototype.prepearAttachmentsForSendOrSave = function ()
{
	var oResult = {};
	_.each(this.attachmentsInReady(), function (oItem) {
		if (oItem && '' !== oItem.tempName() && oItem.enabled())
		{
			oResult[oItem.tempName()] = [
				oItem.fileName(),
				oItem.isInline ? '1' : '0',
				oItem.CID,
				oItem.contentLocation
			];
		}
	});

	return oResult;
};

/**
 * @param {MessageModel} oMessage
 */
PopupsComposeViewModel.prototype.addMessageAsAttachment = function (oMessage)
{
	if (oMessage)
	{
		var
			self = this,
			oAttachment = null,
			sTemp = oMessage.subject(),
			fCancelFunc = function (sId) {
				return function () {
					self.attachments.remove(function (oItem) {
						return oItem && oItem.id === sId;
					});
				};
			}
		;

		sTemp = '.eml' === sTemp.substr(-4).toLowerCase() ? sTemp : sTemp + '.eml';
		oAttachment = new ComposeAttachmentModel(
			oMessage.requestHash, sTemp, oMessage.size()
		);

		oAttachment.fromMessage = true;
		oAttachment.cancel = fCancelFunc(oMessage.requestHash);
		oAttachment.waiting(false).uploading(true);

		this.attachments.push(oAttachment);
	}
};

/**
 * @param {Object} oDropboxFile
 * @return {boolean}
 */
PopupsComposeViewModel.prototype.addDropboxAttachment = function (oDropboxFile)
{
	var
		self = this,
		fCancelFunc = function (sId) {
			return function () {
				self.attachments.remove(function (oItem) {
					return oItem && oItem.id === sId;
				});
			};
		},
		iAttachmentSizeLimit = Utils.pInt(RL.settingsGet('AttachmentLimit')),
		oAttachment = null,
		mSize = oDropboxFile['bytes']
	;

	oAttachment = new ComposeAttachmentModel(
		oDropboxFile['link'], oDropboxFile['name'], mSize
	);

	oAttachment.fromMessage = false;
	oAttachment.cancel = fCancelFunc(oDropboxFile['link']);
	oAttachment.waiting(false).uploading(true);

	this.attachments.push(oAttachment);

	if (0 < mSize && 0 < iAttachmentSizeLimit && iAttachmentSizeLimit < mSize)
	{
		oAttachment.uploading(false);
		oAttachment.error(Utils.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG'));
		return false;
	}

	RL.remote().composeUploadExternals(function (sResult, oData) {

		var bResult = false;
		oAttachment.uploading(false);
		
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			if (oData.Result[oAttachment.id])
			{
				bResult = true;
				oAttachment.tempName(oData.Result[oAttachment.id]);
			}
		}

		if (!bResult)
		{
			oAttachment.error(Utils.getUploadErrorDescByCode(Enums.UploadErrorCode.FileNoUploaded));
		}

	}, [oDropboxFile['link']]);

	return true;
};

/**
 * @param {MessageModel} oMessage
 * @param {string} sType
 */
PopupsComposeViewModel.prototype.prepearMessageAttachments = function (oMessage, sType)
{
	if (oMessage)
	{
		var
			self = this,
			aAttachments = Utils.isNonEmptyArray(oMessage.attachments()) ? oMessage.attachments() : [],
			iIndex = 0,
			iLen = aAttachments.length,
			oAttachment = null,
			oItem = null,
			bAdd = false,
			fCancelFunc = function (sId) {
				return function () {
					self.attachments.remove(function (oItem) {
						return oItem && oItem.id === sId;
					});
				};
			}
		;

		if (Enums.ComposeType.ForwardAsAttachment === sType)
		{
			this.addMessageAsAttachment(oMessage);
		}
		else
		{
			for (; iIndex < iLen; iIndex++)
			{
				oItem = aAttachments[iIndex];

				bAdd = false;
				switch (sType) {
				case Enums.ComposeType.Reply:
				case Enums.ComposeType.ReplyAll:
					bAdd = oItem.isLinked;
					break;

				case Enums.ComposeType.Forward:
				case Enums.ComposeType.Draft:
					bAdd = true;
					break;
				}

				bAdd = true;
				if (bAdd)
				{
					oAttachment = new ComposeAttachmentModel(
						oItem.download, oItem.fileName, oItem.estimatedSize,
						oItem.isInline, oItem.isLinked, oItem.cid, oItem.contentLocation
					);

					oAttachment.fromMessage = true;
					oAttachment.cancel = fCancelFunc(oItem.download);
					oAttachment.waiting(false).uploading(true);

					this.attachments.push(oAttachment);
				}
			}
		}
	}
};

PopupsComposeViewModel.prototype.removeLinkedAttachments = function ()
{
	this.attachments.remove(function (oItem) {
		return oItem && oItem.isLinked;
	});
};

PopupsComposeViewModel.prototype.setMessageAttachmentFailedDowbloadText = function ()
{
	_.each(this.attachments(), function(oAttachment) {
		if (oAttachment && oAttachment.fromMessage)
		{
			oAttachment
				.waiting(false)
				.uploading(false)
				.error(Utils.getUploadErrorDescByCode(Enums.UploadErrorCode.FileNoUploaded))
			;
		}
	}, this);
};

/**
 * @param {boolean=} bIncludeAttachmentInProgress = true
 * @return {boolean}
 */
PopupsComposeViewModel.prototype.isEmptyForm = function (bIncludeAttachmentInProgress)
{
	bIncludeAttachmentInProgress = Utils.isUnd(bIncludeAttachmentInProgress) ? true : !!bIncludeAttachmentInProgress;
	var bAttach = bIncludeAttachmentInProgress ?
		0 === this.attachments().length : 0 === this.attachmentsInReady().length;

	return 0 === this.to().length &&
		0 === this.cc().length &&
		0 === this.bcc().length &&
		0 === this.subject().length &&
		bAttach &&
		'' === this.oEditor.getTextForRequest()
	;
};

PopupsComposeViewModel.prototype.reset = function ()
{
	this.to('');
	this.cc('');
	this.bcc('');
	this.replyTo('');
	this.subject('');

	this.aDraftInfo = null;
	this.sInReplyTo = '';
	this.bFromDraft = false;
	this.sReferences = '';
	this.bReloadFolder = false;

	this.sendError(false);
	this.sendSuccessButSaveError(false);
	this.savedError(false);
	this.savedTime(0);
	this.savedOrSendingText('');
	this.emptyToError(false);
	this.showCcAndBcc(false);

	this.attachments([]);
	this.dragAndDropOver(false);
	this.dragAndDropVisible(false);

	this.draftFolder('');
	this.draftUid('');

	this.sending(false);
	this.saving(false);

	if (this.oEditor)
	{
		this.oEditor.clear();
	}
};

/**
 * @return {Array}
 */
PopupsComposeViewModel.prototype.getAttachmentsDownloadsForUpload = function ()
{
	return _.map(_.filter(this.attachments(), function (oItem) {
		return oItem && '' === oItem.tempName();
	}), function (oItem) {
		return oItem.id;
	});
};

PopupsComposeViewModel.prototype.triggerForResize = function ()
{
	this.resizer(!this.resizer());
};

