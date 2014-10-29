
(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		moment = require('moment'),
		JSON = require('JSON'),
		Jua = require('Jua'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),
		Utils = require('Common/Utils'),
		Globals = require('Common/Globals'),
		Events = require('Common/Events'),
		Links = require('Common/Links'),
		HtmlEditor = require('Common/HtmlEditor'),

		Settings = require('Storage/Settings'),
		Data = require('Storage/User/Data'),
		Cache = require('Storage/User/Cache'),
		Remote = require('Storage/User/Remote'),

		ComposeAttachmentModel = require('Model/ComposeAttachment'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function ComposePopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsCompose');

		this.oEditor = null;
		this.aDraftInfo = null;
		this.sInReplyTo = '';
		this.bFromDraft = false;
		this.bSkipNext = false;
		this.sReferences = '';

		this.bCapaAdditionalIdentities = Settings.capa(Enums.Capa.AdditionalIdentities);

		var
			self = this,
			fCcAndBccCheckHelper = function (aValue) {
				if (false === self.showCcAndBcc() && 0 < aValue.length)
				{
					self.showCcAndBcc(true);
				}
			}
		;

		this.capaOpenPGP = Data.capaOpenPGP;

		this.resizer = ko.observable(false).extend({'throttle': 50});

		this.identitiesDropdownTrigger = ko.observable(false);

		this.to = ko.observable('');
		this.to.focusTrigger = ko.observable(false);
		this.cc = ko.observable('');
		this.bcc = ko.observable('');

		this.replyTo = ko.observable('');
		this.subject = ko.observable('');
		this.isHtml = ko.observable(false);

		this.requestReadReceipt = ko.observable(false);

		this.sendError = ko.observable(false);
		this.sendSuccessButSaveError = ko.observable(false);
		this.savedError = ko.observable(false);

		this.savedTime = ko.observable(0);
		this.savedOrSendingText = ko.observable('');

		this.emptyToError = ko.observable(false);
		this.attachmentsInProcessError = ko.observable(false);
		this.showCcAndBcc = ko.observable(false);

		this.cc.subscribe(fCcAndBccCheckHelper, this);
		this.bcc.subscribe(fCcAndBccCheckHelper, this);

		this.draftFolder = ko.observable('');
		this.draftUid = ko.observable('');
		this.sending = ko.observable(false);
		this.saving = ko.observable(false);
		this.attachments = ko.observableArray([]);

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

		this.composeEditorArea = ko.observable(null);

		this.identities = Data.identities;
		this.defaultIdentityID = Data.defaultIdentityID;
		this.currentIdentityID = ko.observable('');

		this.currentIdentityString = ko.observable('');
		this.currentIdentityResultEmail = ko.observable('');

		this.identitiesOptions = ko.computed(function () {

			var aList = [{
				'optValue': Data.accountEmail(),
				'optText': this.formattedFrom(false)
			}];

			_.each(Data.identities(), function (oItem) {
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

			if (this.bCapaAdditionalIdentities && sID && sID !== Data.accountEmail())
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

		this.attachmentsInProcess.subscribe(function (aValue) {
			if (this.attachmentsInProcessError() && Utils.isArray(aValue) && 0 === aValue.length)
			{
				this.attachmentsInProcessError(false);
			}
		}, this);

		this.editorResizeThrottle = _.throttle(_.bind(this.editorResize, this), 100);

		this.resizer.subscribe(function () {
			this.editorResizeThrottle();
		}, this);

		this.canBeSendedOrSaved = ko.computed(function () {
			return !this.sending() && !this.saving();
		}, this);

		this.deleteCommand = Utils.createCommand(this, function () {

			require('App/User').deleteMessagesFromFolderWithoutCheck(this.draftFolder(), [this.draftUid()]);
			kn.hideScreenPopup(ComposePopupView);

		}, function () {
			return this.isDraftFolderMessage();
		});

		this.sendMessageResponse = _.bind(this.sendMessageResponse, this);
		this.saveMessageResponse = _.bind(this.saveMessageResponse, this);

		this.sendCommand = Utils.createCommand(this, function () {
			var
				sTo = Utils.trim(this.to()),
				sSentFolder = Data.sentFolder(),
				aFlagsCache = []
			;

			if (0 < this.attachmentsInProcess().length)
			{
				this.attachmentsInProcessError(true);
			}
			else if (0 === sTo.length)
			{
				this.emptyToError(true);
			}
			else
			{
				if (Data.replySameFolder())
				{
					if (Utils.isArray(this.aDraftInfo) && 3 === this.aDraftInfo.length && Utils.isNormal(this.aDraftInfo[2]) && 0 < this.aDraftInfo[2].length)
					{
						sSentFolder = this.aDraftInfo[2];
					}
				}

				if ('' === sSentFolder)
				{
					kn.showScreenPopup(require('View/Popup/FolderSystem'), [Enums.SetSystemFoldersNotification.Sent]);
				}
				else
				{
					this.sendError(false);
					this.sending(true);

					if (Utils.isArray(this.aDraftInfo) && 3 === this.aDraftInfo.length)
					{
						aFlagsCache = Cache.getMessageFlagsFromCache(this.aDraftInfo[2], this.aDraftInfo[1]);
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

							Cache.setMessageFlagsToCache(this.aDraftInfo[2], this.aDraftInfo[1], aFlagsCache);
							require('App/User').reloadFlagsCurrentMessageListAndMessageFromCache();
							Cache.setFolderHash(this.aDraftInfo[2], '');
						}
					}

					sSentFolder = Consts.Values.UnuseOptionValue === sSentFolder ? '' : sSentFolder;

					Cache.setFolderHash(this.draftFolder(), '');
					Cache.setFolderHash(sSentFolder, '');

					Remote.sendMessage(
						this.sendMessageResponse,
						this.draftFolder(),
						this.draftUid(),
						sSentFolder,
						this.currentIdentityResultEmail(),
						sTo,
						this.cc(),
						this.bcc(),
						this.subject(),
						this.oEditor ? this.oEditor.isHtml() : false,
						this.oEditor ? this.oEditor.getData(true) : '',
						this.prepearAttachmentsForSendOrSave(),
						this.aDraftInfo,
						this.sInReplyTo,
						this.sReferences,
						this.requestReadReceipt()
					);
				}
			}
		}, this.canBeSendedOrSaved);

		this.saveCommand = Utils.createCommand(this, function () {

			if (Data.draftFolderNotEnabled())
			{
				kn.showScreenPopup(require('View/Popup/FolderSystem'), [Enums.SetSystemFoldersNotification.Draft]);
			}
			else
			{
				this.savedError(false);
				this.saving(true);

				this.bSkipNext = true;

				Cache.setFolderHash(Data.draftFolder(), '');

				Remote.saveMessage(
					this.saveMessageResponse,
					this.draftFolder(),
					this.draftUid(),
					Data.draftFolder(),
					this.currentIdentityResultEmail(),
					this.to(),
					this.cc(),
					this.bcc(),
					this.subject(),
					this.oEditor ? this.oEditor.isHtml() : false,
					this.oEditor ? this.oEditor.getData(true) : '',
					this.prepearAttachmentsForSendOrSave(),
					this.aDraftInfo,
					this.sInReplyTo,
					this.sReferences
				);
			}

		}, this.canBeSendedOrSaved);

		Events.sub('interval.1m', function () {
			if (this.modalVisibility() && !Data.draftFolderNotEnabled() && !this.isEmptyForm(false) &&
				!this.bSkipNext && !this.saving() && !this.sending() && !this.savedError())
			{
				this.bSkipNext = false;
				this.saveCommand();
			}
		}, this);

		this.showCcAndBcc.subscribe(function () {
			this.triggerForResize();
		}, this);

		this.dropboxEnabled = ko.observable(!!Settings.settingsGet('DropboxApiKey'));

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

		this.driveEnabled = ko.observable(Globals.bXMLHttpRequestSupported &&
			!!Settings.settingsGet('AllowGoogleSocial') && !!Settings.settingsGet('AllowGoogleSocialDrive') &&
			!!Settings.settingsGet('GoogleClientID') && !!Settings.settingsGet('GoogleApiKey'));

		this.driveVisible = ko.observable(false);

		this.driveCommand = Utils.createCommand(this, function () {

			this.driveOpenPopup();
			return true;

		}, function () {
			return this.driveEnabled();
		});

		this.driveCallback = _.bind(this.driveCallback, this);

		this.bDisabeCloseOnEsc = true;
		this.sDefaultKeyScope = Enums.KeyState.Compose;

		this.tryToClosePopup = _.debounce(_.bind(this.tryToClosePopup, this), 200);

		this.emailsSource = _.bind(this.emailsSource, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Compose', 'PopupsComposeViewModel'], ComposePopupView);
	_.extend(ComposePopupView.prototype, AbstractView.prototype);

	ComposePopupView.prototype.emailsSource = function (oData, fResponse)
	{
		require('App/User').getAutocomplete(oData.term, function (aData) {
			fResponse(_.map(aData, function (oEmailItem) {
				return oEmailItem.toLine(false);
			}));
		});
	};

	ComposePopupView.prototype.openOpenPgpPopup = function ()
	{
		if (this.capaOpenPGP() && this.oEditor && !this.oEditor.isHtml())
		{
			var self = this;
			kn.showScreenPopup(require('View/Popup/ComposeOpenPgp'), [
				function (sResult) {
					self.editor(function (oEditor) {
						oEditor.setPlain(sResult);
					});
				},
				this.oEditor.getData(),
				this.currentIdentityResultEmail(),
				this.to(),
				this.cc(),
				this.bcc()
			]);
		}
	};

	ComposePopupView.prototype.reloadDraftFolder = function ()
	{
		var
			sDraftFolder = Data.draftFolder()
		;

		if ('' !== sDraftFolder)
		{
			Cache.setFolderHash(sDraftFolder, '');
			if (Data.currentFolderFullNameRaw() === sDraftFolder)
			{
				require('App/User').reloadMessageList(true);
			}
			else
			{
				require('App/User').folderInformation(sDraftFolder);
			}
		}
	};

	ComposePopupView.prototype.findIdentityIdByMessage = function (sComposeType, oMessage)
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

		if (this.bCapaAdditionalIdentities)
		{
			_.each(this.identities(), function (oItem) {
				oIDs[oItem.email()] = oItem['id'];
			});
		}

		oIDs[Data.accountEmail()] = Data.accountEmail();

		if (oMessage)
		{
			switch (sComposeType)
			{
				case Enums.ComposeType.Empty:
					break;
				case Enums.ComposeType.Reply:
				case Enums.ComposeType.ReplyAll:
				case Enums.ComposeType.Forward:
				case Enums.ComposeType.ForwardAsAttachment:
					_.find(_.union(oMessage.to, oMessage.cc, oMessage.bcc, oMessage.deliveredTo), fFindHelper);
					break;
				case Enums.ComposeType.Draft:
					_.find(_.union(oMessage.from, oMessage.replyTo), fFindHelper);
					break;
			}
		}

		if ('' === sResult)
		{
			sResult = this.defaultIdentityID();
		}

		if ('' === sResult)
		{
			sResult = Data.accountEmail();
		}

		return sResult;
	};

	ComposePopupView.prototype.selectIdentity = function (oIdentity)
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
	ComposePopupView.prototype.formattedFrom = function (bHeaderResult)
	{
		var
			sDisplayName = Data.displayName(),
			sEmail = Data.accountEmail()
		;

		return '' === sDisplayName ? sEmail :
			((Utils.isUnd(bHeaderResult) ? false : !!bHeaderResult) ?
				'"' + Utils.quoteName(sDisplayName) + '" <' + sEmail + '>' :
				sDisplayName + ' (' + sEmail + ')')
		;
	};

	ComposePopupView.prototype.sendMessageResponse = function (sResult, oData)
	{
		var
			bResult = false,
			sMessage = ''
		;

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
				sMessage = Utils.getNotification(oData && oData.ErrorCode ? oData.ErrorCode : Enums.Notification.CantSendMessage,
					oData && oData.ErrorMessage ? oData.ErrorMessage : '');

				this.sendError(true);
				window.alert(sMessage || Utils.getNotification(Enums.Notification.CantSendMessage));
			}
		}

		this.reloadDraftFolder();
	};

	ComposePopupView.prototype.saveMessageResponse = function (sResult, oData)
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
					oMessage = Data.message();
					if (oMessage && this.draftFolder() === oMessage.folderFullNameRaw && this.draftUid() === oMessage.uid)
					{
						Data.message(null);
					}
				}

				this.draftFolder(oData.Result.NewFolder);
				this.draftUid(oData.Result.NewUid);

				if (this.modalVisibility())
				{
					this.savedTime(window.Math.round((new window.Date()).getTime() / 1000));

					this.savedOrSendingText(
						0 < this.savedTime() ? Utils.i18n('COMPOSE/SAVED_TIME', {
							'TIME': moment.unix(this.savedTime() - 1).format('LT')
						}) : ''
					);

					bResult = true;

					if (this.bFromDraft)
					{
						Cache.setFolderHash(this.draftFolder(), '');
					}
				}
			}
		}

		if (!this.modalVisibility() && !bResult)
		{
			this.savedError(true);
			this.savedOrSendingText(Utils.getNotification(Enums.Notification.CantSaveMessage));
		}

		this.reloadDraftFolder();
	};

	ComposePopupView.prototype.onHide = function ()
	{
		this.reset();
		kn.routeOn();
	};

	/**
	 * @param {string} sSignature
	 * @param {string=} sFrom
	 * @param {string=} sData
	 * @param {string=} sComposeType
	 * @return {string}
	 */
	ComposePopupView.prototype.convertSignature = function (sSignature, sFrom, sData, sComposeType)
	{
		var bHtml = false, bData = false;
		if ('' !== sSignature)
		{
			if (':HTML:' === sSignature.substr(0, 6))
			{
				bHtml = true;
				sSignature = sSignature.substr(6);
			}

			sSignature = sSignature.replace(/[\r]/g, '');

			sFrom = Utils.pString(sFrom);
			if ('' !== sFrom)
			{
				sSignature = sSignature.replace(/{{FROM}}/g, sFrom);
			}

			sSignature = sSignature.replace(/[\s]{1,2}{{FROM}}/g, '{{FROM}}');

			sSignature = sSignature.replace(/{{FROM}}/g, '');
			sSignature = sSignature.replace(/{{DATE}}/g, moment().format('llll'));

			if (sData && Enums.ComposeType.Empty === sComposeType &&
				-1 < sSignature.indexOf('{{DATA}}'))
			{
				bData = true;
				sSignature = sSignature.replace('{{DATA}}', sData);
			}

			sSignature = sSignature.replace(/{{DATA}}/g, '');

			if (!bHtml)
			{
				sSignature = Utils.plainToHtml(sSignature, true);
			}
		}

		if (sData && !bData)
		{
			switch (sComposeType)
			{
				case Enums.ComposeType.Empty:
					sSignature = sData + '<br />' + sSignature;
					break;
				default:
					sSignature = sSignature + '<br />' + sData;
					break;
			}
		}

		return sSignature;
	};

	ComposePopupView.prototype.editor = function (fOnInit)
	{
		if (fOnInit)
		{
			var self = this;
			if (!this.oEditor && this.composeEditorArea())
			{
				_.delay(function () {
					self.oEditor = new HtmlEditor(self.composeEditorArea(), null, function () {
						fOnInit(self.oEditor);
					}, function (bHtml) {
						self.isHtml(!!bHtml);
					});
				}, 300);
			}
			else if (this.oEditor)
			{
				fOnInit(this.oEditor);
			}
		}
	};

	/**
	 * @param {string=} sType = Enums.ComposeType.Empty
	 * @param {?MessageModel|Array=} oMessageOrArray = null
	 * @param {Array=} aToEmails = null
	 * @param {string=} sCustomSubject = null
	 * @param {string=} sCustomPlainText = null
	 */
	ComposePopupView.prototype.onShow = function (sType, oMessageOrArray, aToEmails, sCustomSubject, sCustomPlainText)
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
			mEmail = Data.accountEmail(),
			sSignature = Data.signature(),
			bSignatureToAll = Data.signatureToAll(),
			aDownloads = [],
			aDraftInfo = null,
			oMessage = null,
			sComposeType = sType || Enums.ComposeType.Empty,
			fEmailArrayToStringLineHelper = function (aList, bFriendly) {

				var
					iIndex = 0,
					iLen = aList.length,
					aResult = []
				;

				for (; iIndex < iLen; iIndex++)
				{
					aResult.push(aList[iIndex].toLine(!!bFriendly));
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
		}

		this.currentIdentityID(this.findIdentityIdByMessage(sComposeType, oMessage));
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
			if (oText)
			{
				oText.find('blockquote.rl-bq-switcher').each(function () {
					$(this).removeClass('rl-bq-switcher hidden-bq');
				});
				oText.find('.rlBlockquoteSwitcher').each(function () {
					$(this).remove();
				});
			}

			oText.find('[data-html-editor-font-wrapper]').removeAttr('data-html-editor-font-wrapper');
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

				case Enums.ComposeType.EditAsNew:
					this.to(fEmailArrayToStringLineHelper(oMessage.to));
					this.cc(fEmailArrayToStringLineHelper(oMessage.cc));
					this.bcc(fEmailArrayToStringLineHelper(oMessage.bcc));

					this.subject(sSubject);
					this.prepearMessageAttachments(oMessage, sComposeType);

					this.aDraftInfo = Utils.isNonEmptyArray(aDraftInfo) && 3 === aDraftInfo.length ? aDraftInfo : null;
					this.sInReplyTo = oMessage.sInReplyTo;
					this.sReferences = oMessage.sReferences;
					break;
			}

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
						'<blockquote><p>' + sText + '</p></blockquote>';

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

			if (bSignatureToAll && '' !== sSignature &&
				Enums.ComposeType.EditAsNew !== sComposeType && Enums.ComposeType.Draft !== sComposeType)
			{
				sText = this.convertSignature(sSignature, fEmailArrayToStringLineHelper(oMessage.from, true), sText, sComposeType);
			}

			this.editor(function (oEditor) {
				oEditor.setHtml(sText, false);
				if (Enums.EditorDefaultType.PlainForced === Data.editorDefaultType() ||
					(!oMessage.isHtml() && Enums.EditorDefaultType.HtmlForced !== Data.editorDefaultType()))
				{
					oEditor.modeToggle(false);
				}
			});
		}
		else if (Enums.ComposeType.Empty === sComposeType)
		{
			this.subject(Utils.isNormal(sCustomSubject) ? '' + sCustomSubject : '');

			sText = Utils.isNormal(sCustomPlainText) ? '' + sCustomPlainText : '';
			if (bSignatureToAll && '' !== sSignature)
			{
				sText = this.convertSignature(sSignature, '',
					Utils.plainToHtml(sText, true), sComposeType);
			}

			this.editor(function (oEditor) {
				oEditor.setHtml(sText, false);
				if (Enums.EditorDefaultType.Html !== Data.editorDefaultType() &&
					Enums.EditorDefaultType.HtmlForced !== Data.editorDefaultType())
				{
					oEditor.modeToggle(false);
				}
			});
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
			Remote.messageUploadAttachments(function (sResult, oData) {

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

	ComposePopupView.prototype.onFocus = function ()
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

	ComposePopupView.prototype.editorResize = function ()
	{
		if (this.oEditor)
		{
			this.oEditor.resize();
		}
	};

	ComposePopupView.prototype.tryToClosePopup = function ()
	{
		var
			self = this,
			PopupsAskViewModel = require('View/Popup/Ask')
		;

		if (!kn.isPopupVisible(PopupsAskViewModel))
		{
			kn.showScreenPopup(PopupsAskViewModel, [Utils.i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'), function () {
				if (self.modalVisibility())
				{
					Utils.delegateRun(self, 'closeCommand');
				}
			}]);
		}
	};

	ComposePopupView.prototype.onBuild = function ()
	{
		this.initUploader();

		var
			self = this,
			oScript = null
		;

		key('ctrl+q, command+q', Enums.KeyState.Compose, function () {
			self.identitiesDropdownTrigger(true);
			return false;
		});

		key('ctrl+s, command+s', Enums.KeyState.Compose, function () {
			self.saveCommand();
			return false;
		});

		key('ctrl+enter, command+enter', Enums.KeyState.Compose, function () {
			self.sendCommand();
			return false;
		});

		key('esc', Enums.KeyState.Compose, function () {
			if (self.modalVisibility())
			{
				self.tryToClosePopup();
			}
			return false;
		});

		Globals.$win.on('resize', function () {
			self.triggerForResize();
		});

		if (this.dropboxEnabled())
		{
			oScript = window.document.createElement('script');
			oScript.type = 'text/javascript';
			oScript.src = 'https://www.dropbox.com/static/api/1/dropins.js';
			$(oScript).attr('id', 'dropboxjs').attr('data-app-key', Settings.settingsGet('DropboxApiKey'));

			window.document.body.appendChild(oScript);
		}

		if (this.driveEnabled())
		{
			$.getScript('https://apis.google.com/js/api.js', function () {
				if (window.gapi)
				{
					self.driveVisible(true);
				}
			});
		}
	};

	ComposePopupView.prototype.driveCallback = function (sAccessToken, oData)
	{
		if (oData && window.XMLHttpRequest && window.google &&
			oData[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED &&
			oData[window.google.picker.Response.DOCUMENTS] && oData[window.google.picker.Response.DOCUMENTS][0] &&
			oData[window.google.picker.Response.DOCUMENTS][0]['id'])
		{
			var
				self = this,
				oRequest = new window.XMLHttpRequest()
			;

			oRequest.open('GET', 'https://www.googleapis.com/drive/v2/files/' + oData[window.google.picker.Response.DOCUMENTS][0]['id']);
			oRequest.setRequestHeader('Authorization', 'Bearer ' + sAccessToken);
			oRequest.addEventListener('load', function() {
				if (oRequest && oRequest.responseText)
				{
					var oItem = JSON.parse(oRequest.responseText), fExport = function (oItem, sMimeType, sExt) {
						if (oItem && oItem['exportLinks'])
						{
							if (oItem['exportLinks'][sMimeType])
							{
								oItem['downloadUrl'] = oItem['exportLinks'][sMimeType];
								oItem['title'] = oItem['title'] + '.' + sExt;
								oItem['mimeType'] = sMimeType;
							}
							else if (oItem['exportLinks']['application/pdf'])
							{
								oItem['downloadUrl'] = oItem['exportLinks']['application/pdf'];
								oItem['title'] = oItem['title'] + '.pdf';
								oItem['mimeType'] = 'application/pdf';
							}
						}
					};

					if (oItem && !oItem['downloadUrl'] && oItem['mimeType'] && oItem['exportLinks'])
					{
						switch (oItem['mimeType'].toString().toLowerCase())
						{
							case 'application/vnd.google-apps.document':
								fExport(oItem, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx');
								break;
							case 'application/vnd.google-apps.spreadsheet':
								fExport(oItem, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx');
								break;
							case 'application/vnd.google-apps.drawing':
								fExport(oItem, 'image/png', 'png');
								break;
							case 'application/vnd.google-apps.presentation':
								fExport(oItem, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'pptx');
								break;
							default:
								fExport(oItem, 'application/pdf', 'pdf');
								break;
						}
					}

					if (oItem && oItem['downloadUrl'])
					{
						self.addDriveAttachment(oItem, sAccessToken);
					}
				}
			});

			oRequest.send();
		}
	};

	ComposePopupView.prototype.driveCreatePiker = function (oOauthToken)
	{
		if (window.gapi && oOauthToken && oOauthToken.access_token)
		{
			var self = this;

			window.gapi.load('picker', {'callback': function () {

				if (window.google && window.google.picker)
				{
					var drivePicker = new window.google.picker.PickerBuilder()
						.addView(
							new window.google.picker.DocsView()
								.setIncludeFolders(true)
						)
						.setAppId(Settings.settingsGet('GoogleClientID'))
						.setOAuthToken(oOauthToken.access_token)
						.setCallback(_.bind(self.driveCallback, self, oOauthToken.access_token))
						.enableFeature(window.google.picker.Feature.NAV_HIDDEN)
						.build()
					;

					drivePicker.setVisible(true);
				}
			}});
		}
	};

	ComposePopupView.prototype.driveOpenPopup = function ()
	{
		if (window.gapi)
		{
			var self = this;

			window.gapi.load('auth', {'callback': function () {

				var oAuthToken = window.gapi.auth.getToken();
				if (!oAuthToken)
				{
					window.gapi.auth.authorize({
						'client_id': Settings.settingsGet('GoogleClientID'),
						'scope': 'https://www.googleapis.com/auth/drive.readonly',
						'immediate': true
					}, function (oAuthResult) {
						if (oAuthResult && !oAuthResult.error)
						{
							var oAuthToken = window.gapi.auth.getToken();
							if (oAuthToken)
							{
								self.driveCreatePiker(oAuthToken);
							}
						}
						else
						{
							window.gapi.auth.authorize({
								'client_id': Settings.settingsGet('GoogleClientID'),
								'scope': 'https://www.googleapis.com/auth/drive.readonly',
								'immediate': false
							}, function (oAuthResult) {
								if (oAuthResult && !oAuthResult.error)
								{
									var oAuthToken = window.gapi.auth.getToken();
									if (oAuthToken)
									{
										self.driveCreatePiker(oAuthToken);
									}
								}
							});
						}
					});
				}
				else
				{
					self.driveCreatePiker(oAuthToken);
				}
			}});
		}
	};

	/**
	 * @param {string} sId
	 * @return {?Object}
	 */
	ComposePopupView.prototype.getAttachmentById = function (sId)
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

	ComposePopupView.prototype.cancelAttachmentHelper = function (sId, oJua) {

		var self = this;
		return function () {

			var oItem = _.find(self.attachments(), function (oItem) {
				return oItem && oItem.id === sId;
			});

			if (oItem)
			{
				self.attachments.remove(oItem);
				Utils.delegateRunOnDestroy(oItem);

				if (oJua)
				{
					oJua.cancel(sId);
				}
			}
		};

	};

	ComposePopupView.prototype.initUploader = function ()
	{
		if (this.composeUploaderButton())
		{
			var
				oUploadCache = {},
				iAttachmentSizeLimit = Utils.pInt(Settings.settingsGet('AttachmentLimit')),
				oJua = new Jua({
					'action': Links.upload(),
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
							oItem.progress(' - ' + window.Math.floor(iLoaded / iTotal * 100) + '%');
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

						oAttachment.cancel = that.cancelAttachmentHelper(sId, oJua);

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
	ComposePopupView.prototype.prepearAttachmentsForSendOrSave = function ()
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
	ComposePopupView.prototype.addMessageAsAttachment = function (oMessage)
	{
		if (oMessage)
		{
			var
				oAttachment = null,
				sTemp = oMessage.subject()
			;

			sTemp = '.eml' === sTemp.substr(-4).toLowerCase() ? sTemp : sTemp + '.eml';
			oAttachment = new ComposeAttachmentModel(
				oMessage.requestHash, sTemp, oMessage.size()
			);

			oAttachment.fromMessage = true;
			oAttachment.cancel = this.cancelAttachmentHelper(oMessage.requestHash);
			oAttachment.waiting(false).uploading(true);

			this.attachments.push(oAttachment);
		}
	};

	/**
	 * @param {Object} oDropboxFile
	 * @return {boolean}
	 */
	ComposePopupView.prototype.addDropboxAttachment = function (oDropboxFile)
	{
		var
			oAttachment = null,
			iAttachmentSizeLimit = Utils.pInt(Settings.settingsGet('AttachmentLimit')),
			mSize = oDropboxFile['bytes']
		;

		oAttachment = new ComposeAttachmentModel(
			oDropboxFile['link'], oDropboxFile['name'], mSize
		);

		oAttachment.fromMessage = false;
		oAttachment.cancel = this.cancelAttachmentHelper(oDropboxFile['link']);
		oAttachment.waiting(false).uploading(true);

		this.attachments.push(oAttachment);

		if (0 < mSize && 0 < iAttachmentSizeLimit && iAttachmentSizeLimit < mSize)
		{
			oAttachment.uploading(false);
			oAttachment.error(Utils.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG'));
			return false;
		}

		Remote.composeUploadExternals(function (sResult, oData) {

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
	 * @param {Object} oDriveFile
	 * @param {string} sAccessToken
	 * @return {boolean}
	 */
	ComposePopupView.prototype.addDriveAttachment = function (oDriveFile, sAccessToken)
	{
		var
			iAttachmentSizeLimit = Utils.pInt(Settings.settingsGet('AttachmentLimit')),
			oAttachment = null,
			mSize = oDriveFile['fileSize'] ? Utils.pInt(oDriveFile['fileSize']) : 0
		;

		oAttachment = new ComposeAttachmentModel(
			oDriveFile['downloadUrl'], oDriveFile['title'], mSize
		);

		oAttachment.fromMessage = false;
		oAttachment.cancel = this.cancelAttachmentHelper(oDriveFile['downloadUrl']);
		oAttachment.waiting(false).uploading(true);

		this.attachments.push(oAttachment);

		if (0 < mSize && 0 < iAttachmentSizeLimit && iAttachmentSizeLimit < mSize)
		{
			oAttachment.uploading(false);
			oAttachment.error(Utils.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG'));
			return false;
		}

		Remote.composeUploadDrive(function (sResult, oData) {

			var bResult = false;
			oAttachment.uploading(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				if (oData.Result[oAttachment.id])
				{
					bResult = true;
					oAttachment.tempName(oData.Result[oAttachment.id][0]);
					oAttachment.size(Utils.pInt(oData.Result[oAttachment.id][1]));
				}
			}

			if (!bResult)
			{
				oAttachment.error(Utils.getUploadErrorDescByCode(Enums.UploadErrorCode.FileNoUploaded));
			}

		}, oDriveFile['downloadUrl'], sAccessToken);

		return true;
	};

	/**
	 * @param {MessageModel} oMessage
	 * @param {string} sType
	 */
	ComposePopupView.prototype.prepearMessageAttachments = function (oMessage, sType)
	{
		if (oMessage)
		{
			var
				aAttachments = Utils.isNonEmptyArray(oMessage.attachments()) ? oMessage.attachments() : [],
				iIndex = 0,
				iLen = aAttachments.length,
				oAttachment = null,
				oItem = null,
				bAdd = false
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
					case Enums.ComposeType.EditAsNew:
						bAdd = true;
						break;
					}

					if (bAdd)
					{
						oAttachment = new ComposeAttachmentModel(
							oItem.download, oItem.fileName, oItem.estimatedSize,
							oItem.isInline, oItem.isLinked, oItem.cid, oItem.contentLocation
						);

						oAttachment.fromMessage = true;
						oAttachment.cancel = this.cancelAttachmentHelper(oItem.download);
						oAttachment.waiting(false).uploading(true);

						this.attachments.push(oAttachment);
					}
				}
			}
		}
	};

	ComposePopupView.prototype.removeLinkedAttachments = function ()
	{
		var oItem = _.find(this.attachments(), function (oItem) {
			return oItem && oItem.isLinked;
		});

		if (oItem)
		{
			this.attachments.remove(oItem);
			Utils.delegateRunOnDestroy(oItem);
		}
	};

	ComposePopupView.prototype.setMessageAttachmentFailedDowbloadText = function ()
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
	ComposePopupView.prototype.isEmptyForm = function (bIncludeAttachmentInProgress)
	{
		bIncludeAttachmentInProgress = Utils.isUnd(bIncludeAttachmentInProgress) ? true : !!bIncludeAttachmentInProgress;
		var bAttach = bIncludeAttachmentInProgress ?
			0 === this.attachments().length : 0 === this.attachmentsInReady().length;

		return 0 === this.to().length &&
			0 === this.cc().length &&
			0 === this.bcc().length &&
			0 === this.subject().length &&
			bAttach &&
			(!this.oEditor || '' === this.oEditor.getData())
		;
	};

	ComposePopupView.prototype.reset = function ()
	{
		this.to('');
		this.cc('');
		this.bcc('');
		this.replyTo('');
		this.subject('');

		this.requestReadReceipt(false);

		this.aDraftInfo = null;
		this.sInReplyTo = '';
		this.bFromDraft = false;
		this.sReferences = '';

		this.sendError(false);
		this.sendSuccessButSaveError(false);
		this.savedError(false);
		this.savedTime(0);
		this.savedOrSendingText('');
		this.emptyToError(false);
		this.attachmentsInProcessError(false);
		this.showCcAndBcc(false);

		Utils.delegateRunOnDestroy(this.attachments());
		this.attachments([]);

		this.dragAndDropOver(false);
		this.dragAndDropVisible(false);

		this.draftFolder('');
		this.draftUid('');

		this.sending(false);
		this.saving(false);

		if (this.oEditor)
		{
			this.oEditor.clear(false);
		}
	};

	/**
	 * @return {Array}
	 */
	ComposePopupView.prototype.getAttachmentsDownloadsForUpload = function ()
	{
		return _.map(_.filter(this.attachments(), function (oItem) {
			return oItem && '' === oItem.tempName();
		}), function (oItem) {
			return oItem.id;
		});
	};

	ComposePopupView.prototype.triggerForResize = function ()
	{
		this.resizer(!this.resizer());
		this.editorResizeThrottle();
	};

	module.exports = ComposePopupView;

}());