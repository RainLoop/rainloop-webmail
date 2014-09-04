/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
webpackJsonp([0],Array(21).concat([
/* 21 */
/*!*********************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsComposeViewModel.js ***!
  \*********************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),
			moment = __webpack_require__(/*! moment */ 25),
			JSON = __webpack_require__(/*! JSON */ 33),
			Jua = __webpack_require__(/*! Jua */ 47),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Events = __webpack_require__(/*! Common/Events */ 22),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),
			HtmlEditor = __webpack_require__(/*! Common/HtmlEditor */ 28),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Cache = __webpack_require__(/*! Storage:RainLoop:Cache */ 20),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),

			ComposeAttachmentModel = __webpack_require__(/*! Model:ComposeAttachment */ 53),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

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

				__webpack_require__(/*! App:RainLoop */ 4).deleteMessagesFromFolderWithoutCheck(this.draftFolder(), [this.draftUid()]);
				kn.hideScreenPopup(PopupsComposeViewModel);

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
						kn.showScreenPopup(__webpack_require__(/*! View:Popup:FolderSystem */ 27), [Enums.SetSystemFoldersNotification.Sent]);
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
								__webpack_require__(/*! App:RainLoop */ 4).reloadFlagsCurrentMessageListAndMessageFromCache();
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
					kn.showScreenPopup(__webpack_require__(/*! View:Popup:FolderSystem */ 27), [Enums.SetSystemFoldersNotification.Draft]);
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

		kn.extendAsViewModel(['View:Popup:Compose', 'PopupsComposeViewModel'], PopupsComposeViewModel);
		_.extend(PopupsComposeViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsComposeViewModel.prototype.emailsSource = function (oData, fResponse)
		{
			__webpack_require__(/*! App:RainLoop */ 4).getAutocomplete(oData.term, function (aData) {
				fResponse(_.map(aData, function (oEmailItem) {
					return oEmailItem.toLine(false);
				}));
			});
		};

		PopupsComposeViewModel.prototype.openOpenPgpPopup = function ()
		{
			if (this.capaOpenPGP() && this.oEditor && !this.oEditor.isHtml())
			{
				var self = this;
				kn.showScreenPopup(__webpack_require__(/*! View:Popup:ComposeOpenPgp */ 104), [
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

		PopupsComposeViewModel.prototype.reloadDraftFolder = function ()
		{
			var
				sDraftFolder = Data.draftFolder()
			;

			if ('' !== sDraftFolder)
			{
				Cache.setFolderHash(sDraftFolder, '');
				if (Data.currentFolderFullNameRaw() === sDraftFolder)
				{
					__webpack_require__(/*! App:RainLoop */ 4).reloadMessageList(true);
				}
				else
				{
					__webpack_require__(/*! App:RainLoop */ 4).folderInformation(sDraftFolder);
				}
			}
		};

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
				sDisplayName = Data.displayName(),
				sEmail = Data.accountEmail()
			;

			return '' === sDisplayName ? sEmail :
				((Utils.isUnd(bHeaderResult) ? false : !!bHeaderResult) ?
					'"' + Utils.quoteName(sDisplayName) + '" <' + sEmail + '>' :
					sDisplayName + ' (' + sEmail + ')')
			;
		};

		PopupsComposeViewModel.prototype.sendMessageResponse = function (sResult, oData)
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

		PopupsComposeViewModel.prototype.onHide = function ()
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
		PopupsComposeViewModel.prototype.convertSignature = function (sSignature, sFrom, sData, sComposeType)
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
					sSignature = Utils.convertPlainTextToHtml(sSignature);
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

		PopupsComposeViewModel.prototype.editor = function (fOnInit)
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
		PopupsComposeViewModel.prototype.onShow = function (sType, oMessageOrArray, aToEmails, sCustomSubject, sCustomPlainText)
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
					if (!oMessage.isHtml())
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
						Utils.convertPlainTextToHtml(sText), sComposeType);
				}

				this.editor(function (oEditor) {
					oEditor.setHtml(sText, false);
					if (Enums.EditorDefaultType.Html !== Data.editorDefaultType())
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

		PopupsComposeViewModel.prototype.editorResize = function ()
		{
			if (this.oEditor)
			{
				this.oEditor.resize();
			}
		};

		PopupsComposeViewModel.prototype.tryToClosePopup = function ()
		{
			var
				self = this,
				PopupsAskViewModel = __webpack_require__(/*! View:Popup:Ask */ 31)
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

		PopupsComposeViewModel.prototype.onBuild = function ()
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

		PopupsComposeViewModel.prototype.driveCallback = function (sAccessToken, oData)
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

		PopupsComposeViewModel.prototype.driveCreatePiker = function (oOauthToken)
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

		PopupsComposeViewModel.prototype.driveOpenPopup = function ()
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

		PopupsComposeViewModel.prototype.initUploader = function ()
		{
			if (this.composeUploaderButton())
			{
				var
					oUploadCache = {},
					iAttachmentSizeLimit = Utils.pInt(Settings.settingsGet('AttachmentLimit')),
					oJua = new Jua({
						'action': LinkBuilder.upload(),
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
				oAttachment = null,
				fCancelFunc = function (sId) {
					return function () {
						self.attachments.remove(function (oItem) {
							return oItem && oItem.id === sId;
						});
					};
				},
				iAttachmentSizeLimit = Utils.pInt(Settings.settingsGet('AttachmentLimit')),
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
		PopupsComposeViewModel.prototype.addDriveAttachment = function (oDriveFile, sAccessToken)
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
				iAttachmentSizeLimit = Utils.pInt(Settings.settingsGet('AttachmentLimit')),
				oAttachment = null,
				mSize = oDriveFile['fileSize'] ? Utils.pInt(oDriveFile['fileSize']) : 0
			;

			oAttachment = new ComposeAttachmentModel(
				oDriveFile['downloadUrl'], oDriveFile['title'], mSize
			);

			oAttachment.fromMessage = false;
			oAttachment.cancel = fCancelFunc(oDriveFile['downloadUrl']);
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
				(!this.oEditor || '' === this.oEditor.getData())
			;
		};

		PopupsComposeViewModel.prototype.reset = function ()
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
			this.editorResizeThrottle();
		};

		module.exports = PopupsComposeViewModel;

	}());

/***/ },
/* 22 */,
/* 23 */,
/* 24 */,
/* 25 */,
/* 26 */,
/* 27 */,
/* 28 */
/*!**********************************!*\
  !*** ./dev/Common/HtmlEditor.js ***!
  \**********************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),

			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Settings = __webpack_require__(/*! Storage:Settings */ 10)
		;

		/**
		 * @constructor
		 * @param {Object} oElement
		 * @param {Function=} fOnBlur
		 * @param {Function=} fOnReady
		 * @param {Function=} fOnModeChange
		 */
		function HtmlEditor(oElement, fOnBlur, fOnReady, fOnModeChange)
		{
			this.editor = null;
			this.iBlurTimer = 0;
			this.fOnBlur = fOnBlur || null;
			this.fOnReady = fOnReady || null;
			this.fOnModeChange = fOnModeChange || null;

			this.$element = $(oElement);

			this.resize = _.throttle(_.bind(this.resize, this), 100);

			this.init();
		}

		HtmlEditor.prototype.blurTrigger = function ()
		{
			if (this.fOnBlur)
			{
				var self = this;
				window.clearTimeout(this.iBlurTimer);
				this.iBlurTimer = window.setTimeout(function () {
					self.fOnBlur();
				}, 200);
			}
		};

		HtmlEditor.prototype.focusTrigger = function ()
		{
			if (this.fOnBlur)
			{
				window.clearTimeout(this.iBlurTimer);
			}
		};

		/**
		 * @return {boolean}
		 */
		HtmlEditor.prototype.isHtml = function ()
		{
			return this.editor ? 'wysiwyg' === this.editor.mode : false;
		};

		/**
		 * @return {boolean}
		 */
		HtmlEditor.prototype.checkDirty = function ()
		{
			return this.editor ? this.editor.checkDirty() : false;
		};

		HtmlEditor.prototype.resetDirty = function ()
		{
			if (this.editor)
			{
				this.editor.resetDirty();
			}
		};

		/**
		 * @return {string}
		 */
		HtmlEditor.prototype.getData = function (bWrapIsHtml)
		{
			if (this.editor)
			{
				if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain)
				{
					return this.editor.__plain.getRawData();
				}

				return bWrapIsHtml ?
					'<div data-html-editor-font-wrapper="true" style="font-family: arial, sans-serif; font-size: 13px;">' +
						this.editor.getData() + '</div>' : this.editor.getData();
			}

			return '';
		};

		HtmlEditor.prototype.modeToggle = function (bPlain)
		{
			if (this.editor)
			{
				if (bPlain)
				{
					if ('plain' === this.editor.mode)
					{
						this.editor.setMode('wysiwyg');
					}
				}
				else
				{
					if ('wysiwyg' === this.editor.mode)
					{
						this.editor.setMode('plain');
					}
				}

				this.resize();
			}
		};

		HtmlEditor.prototype.setHtml = function (sHtml, bFocus)
		{
			if (this.editor)
			{
				this.modeToggle(true);
				this.editor.setData(sHtml);

				if (bFocus)
				{
					this.focus();
				}
			}
		};

		HtmlEditor.prototype.setPlain = function (sPlain, bFocus)
		{
			if (this.editor)
			{
				this.modeToggle(false);
				if ('plain' === this.editor.mode && this.editor.plugins.plain && this.editor.__plain)
				{
					return this.editor.__plain.setRawData(sPlain);
				}
				else
				{
					this.editor.setData(sPlain);
				}

				if (bFocus)
				{
					this.focus();
				}
			}
		};

		HtmlEditor.prototype.init = function ()
		{
			if (this.$element && this.$element[0])
			{
				var
					self = this,
					fInit = function () {

						var
							oConfig = Globals.oHtmlEditorDefaultConfig,
							sLanguage = Settings.settingsGet('Language'),
							bSource = !!Settings.settingsGet('AllowHtmlEditorSourceButton')
						;

						if (bSource && oConfig.toolbarGroups && !oConfig.toolbarGroups.__SourceInited)
						{
							oConfig.toolbarGroups.__SourceInited = true;
							oConfig.toolbarGroups.push({name: 'document', groups: ['mode', 'document', 'doctools']});
						}

						oConfig.enterMode = window.CKEDITOR.ENTER_BR;
						oConfig.shiftEnterMode = window.CKEDITOR.ENTER_BR;

						oConfig.language = Globals.oHtmlEditorLangsMap[sLanguage] || 'en';
						if (window.CKEDITOR.env)
						{
							window.CKEDITOR.env.isCompatible = true;
						}

						self.editor = window.CKEDITOR.appendTo(self.$element[0], oConfig);

						self.editor.on('key', function(oEvent) {
							if (oEvent && oEvent.data && 9 /* Tab */ === oEvent.data.keyCode)
							{
								return false;
							}
						});

						self.editor.on('blur', function() {
							self.blurTrigger();
						});

						self.editor.on('mode', function() {

							self.blurTrigger();

							if (self.fOnModeChange)
							{
								self.fOnModeChange('plain' !== self.editor.mode);
							}
						});

						self.editor.on('focus', function() {
							self.focusTrigger();
						});

						if (self.fOnReady)
						{
							self.editor.on('instanceReady', function () {

								self.editor.setKeystroke(window.CKEDITOR.CTRL + 65 /* A */, 'selectAll');

								self.fOnReady();
								self.__resizable = true;
								self.resize();
							});
						}
					}
				;

				if (window.CKEDITOR)
				{
					fInit();
				}
				else
				{
					window.__initEditor = fInit;
				}
			}
		};

		HtmlEditor.prototype.focus = function ()
		{
			if (this.editor)
			{
				this.editor.focus();
			}
		};

		HtmlEditor.prototype.blur = function ()
		{
			if (this.editor)
			{
				this.editor.focusManager.blur(true);
			}
		};

		HtmlEditor.prototype.resize = function ()
		{
			if (this.editor && this.__resizable)
			{
				try
				{
					this.editor.resize(this.$element.width(), this.$element.innerHeight());
				}
				catch (e) {}
			}
		};

		HtmlEditor.prototype.clear = function (bFocus)
		{
			this.setHtml('', bFocus);
		};


		module.exports = HtmlEditor;

	}());

/***/ },
/* 29 */
/*!***********************************************!*\
  !*** ./dev/Screens/AbstractSettingsScreen.js ***!
  \***********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),

			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractScreen = __webpack_require__(/*! Knoin:AbstractScreen */ 24)
		;

		/**
		 * @constructor
		 * @param {Array} aViewModels
		 * @extends KnoinAbstractScreen
		 */
		function AbstractSettingsScreen(aViewModels)
		{
			KnoinAbstractScreen.call(this, 'settings', aViewModels);

			this.menu = ko.observableArray([]);

			this.oCurrentSubScreen = null;
			this.oViewModelPlace = null;

			this.setupSettings();
		}

		_.extend(AbstractSettingsScreen.prototype, KnoinAbstractScreen.prototype);

		/**
		 * @param {Function=} fCallback
		 */
		AbstractSettingsScreen.prototype.setupSettings = function (fCallback)
		{
			if (fCallback)
			{
				fCallback();
			}
		};

		AbstractSettingsScreen.prototype.onRoute = function (sSubName)
		{
			var
				self = this,
				oSettingsScreen = null,
				RoutedSettingsViewModel = null,
				oViewModelPlace = null,
				oViewModelDom = null
			;

			RoutedSettingsViewModel = _.find(Globals.aViewModels['settings'], function (SettingsViewModel) {
				return SettingsViewModel && SettingsViewModel.__rlSettingsData &&
					sSubName === SettingsViewModel.__rlSettingsData.Route;
			});

			if (RoutedSettingsViewModel)
			{
				if (_.find(Globals.aViewModels['settings-removed'], function (DisabledSettingsViewModel) {
					return DisabledSettingsViewModel && DisabledSettingsViewModel === RoutedSettingsViewModel;
				}))
				{
					RoutedSettingsViewModel = null;
				}

				if (RoutedSettingsViewModel && _.find(Globals.aViewModels['settings-disabled'], function (DisabledSettingsViewModel) {
					return DisabledSettingsViewModel && DisabledSettingsViewModel === RoutedSettingsViewModel;
				}))
				{
					RoutedSettingsViewModel = null;
				}
			}

			if (RoutedSettingsViewModel)
			{
				if (RoutedSettingsViewModel.__builded && RoutedSettingsViewModel.__vm)
				{
					oSettingsScreen = RoutedSettingsViewModel.__vm;
				}
				else
				{
					oViewModelPlace = this.oViewModelPlace;
					if (oViewModelPlace && 1 === oViewModelPlace.length)
					{
						oSettingsScreen = new RoutedSettingsViewModel();

						oViewModelDom = $('<div></div>').addClass('rl-settings-view-model').hide();
						oViewModelDom.appendTo(oViewModelPlace);

						oSettingsScreen.viewModelDom = oViewModelDom;

						oSettingsScreen.__rlSettingsData = RoutedSettingsViewModel.__rlSettingsData;

						RoutedSettingsViewModel.__dom = oViewModelDom;
						RoutedSettingsViewModel.__builded = true;
						RoutedSettingsViewModel.__vm = oSettingsScreen;

						ko.applyBindingAccessorsToNode(oViewModelDom[0], {
							'i18nInit': true,
							'template': function () { return {'name': RoutedSettingsViewModel.__rlSettingsData.Template}; }
						}, oSettingsScreen);

						Utils.delegateRun(oSettingsScreen, 'onBuild', [oViewModelDom]);
					}
					else
					{
						Utils.log('Cannot find sub settings view model position: SettingsSubScreen');
					}
				}

				if (oSettingsScreen)
				{
					_.defer(function () {
						// hide
						if (self.oCurrentSubScreen)
						{
							Utils.delegateRun(self.oCurrentSubScreen, 'onHide');
							self.oCurrentSubScreen.viewModelDom.hide();
						}
						// --

						self.oCurrentSubScreen = oSettingsScreen;

						// show
						if (self.oCurrentSubScreen)
						{
							self.oCurrentSubScreen.viewModelDom.show();
							Utils.delegateRun(self.oCurrentSubScreen, 'onShow');
							Utils.delegateRun(self.oCurrentSubScreen, 'onFocus', [], 200);

							_.each(self.menu(), function (oItem) {
								oItem.selected(oSettingsScreen && oSettingsScreen.__rlSettingsData && oItem.route === oSettingsScreen.__rlSettingsData.Route);
							});

							$('#rl-content .b-settings .b-content .content').scrollTop(0);
						}
						// --

						Utils.windowResize();
					});
				}
			}
			else
			{
				kn.setHash(LinkBuilder.settings(), false, true);
			}
		};

		AbstractSettingsScreen.prototype.onHide = function ()
		{
			if (this.oCurrentSubScreen && this.oCurrentSubScreen.viewModelDom)
			{
				Utils.delegateRun(this.oCurrentSubScreen, 'onHide');
				this.oCurrentSubScreen.viewModelDom.hide();
			}
		};

		AbstractSettingsScreen.prototype.onBuild = function ()
		{
			_.each(Globals.aViewModels['settings'], function (SettingsViewModel) {
				if (SettingsViewModel && SettingsViewModel.__rlSettingsData &&
					!_.find(Globals.aViewModels['settings-removed'], function (RemoveSettingsViewModel) {
						return RemoveSettingsViewModel && RemoveSettingsViewModel === SettingsViewModel;
					}))
				{
					this.menu.push({
						'route': SettingsViewModel.__rlSettingsData.Route,
						'label': SettingsViewModel.__rlSettingsData.Label,
						'selected': ko.observable(false),
						'disabled': !!_.find(Globals.aViewModels['settings-disabled'], function (DisabledSettingsViewModel) {
							return DisabledSettingsViewModel && DisabledSettingsViewModel === SettingsViewModel;
						})
					});
				}
			}, this);

			this.oViewModelPlace = $('#rl-content #rl-settings-subscreen');
		};

		AbstractSettingsScreen.prototype.routes = function ()
		{
			var
				DefaultViewModel = _.find(Globals.aViewModels['settings'], function (SettingsViewModel) {
					return SettingsViewModel && SettingsViewModel.__rlSettingsData && SettingsViewModel.__rlSettingsData['IsDefault'];
				}),
				sDefaultRoute = DefaultViewModel ? DefaultViewModel.__rlSettingsData['Route'] : 'general',
				oRules = {
					'subname': /^(.*)$/,
					'normalize_': function (oRequest, oVals) {
						oVals.subname = Utils.isUnd(oVals.subname) ? sDefaultRoute : Utils.pString(oVals.subname);
						return [oVals.subname];
					}
				}
			;

			return [
				['{subname}/', oRules],
				['{subname}', oRules],
				['', oRules]
			];
		};

		module.exports = AbstractSettingsScreen;

	}());

/***/ },
/* 30 */,
/* 31 */,
/* 32 */,
/* 33 */,
/* 34 */,
/* 35 */,
/* 36 */
/*!********************************!*\
  !*** ./dev/Common/Selector.js ***!
  \********************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),
			key = __webpack_require__(/*! key */ 19),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @constructor
		 * @param {koProperty} oKoList
		 * @param {koProperty} oKoSelectedItem
		 * @param {string} sItemSelector
		 * @param {string} sItemSelectedSelector
		 * @param {string} sItemCheckedSelector
		 * @param {string} sItemFocusedSelector
		 */
		function Selector(oKoList, oKoSelectedItem,
			sItemSelector, sItemSelectedSelector, sItemCheckedSelector, sItemFocusedSelector)
		{
			this.list = oKoList;

			this.listChecked = ko.computed(function () {
				return _.filter(this.list(), function (oItem) {
					return oItem.checked();
				});
			}, this).extend({'rateLimit': 0});

			this.isListChecked = ko.computed(function () {
				return 0 < this.listChecked().length;
			}, this);

			this.focusedItem = ko.observable(null);
			this.selectedItem = oKoSelectedItem;
			this.selectedItemUseCallback = true;

			this.itemSelectedThrottle = _.debounce(_.bind(this.itemSelected, this), 300);

			this.listChecked.subscribe(function (aItems) {
				if (0 < aItems.length)
				{
					if (null === this.selectedItem())
					{
						this.selectedItem.valueHasMutated();
					}
					else
					{
						this.selectedItem(null);
					}
				}
				else if (this.bAutoSelect && this.focusedItem())
				{
					this.selectedItem(this.focusedItem());
				}
			}, this);

			this.selectedItem.subscribe(function (oItem) {

				if (oItem)
				{
					if (this.isListChecked())
					{
						_.each(this.listChecked(), function (oSubItem) {
							oSubItem.checked(false);
						});
					}

					if (this.selectedItemUseCallback)
					{
						this.itemSelectedThrottle(oItem);
					}
				}
				else if (this.selectedItemUseCallback)
				{
					this.itemSelected(null);
				}

			}, this);

			this.selectedItem.extend({'toggleSubscribe': [null,
				function (oPrev) {
					if (oPrev)
					{
						oPrev.selected(false);
					}
				}, function (oNext) {
					if (oNext)
					{
						oNext.selected(true);
					}
				}
			]});

			this.focusedItem.extend({'toggleSubscribe': [null,
				function (oPrev) {
					if (oPrev)
					{
						oPrev.focused(false);
					}
				}, function (oNext) {
					if (oNext)
					{
						oNext.focused(true);
					}
				}
			]});

			this.oContentVisible = null;
			this.oContentScrollable = null;

			this.sItemSelector = sItemSelector;
			this.sItemSelectedSelector = sItemSelectedSelector;
			this.sItemCheckedSelector = sItemCheckedSelector;
			this.sItemFocusedSelector = sItemFocusedSelector;

			this.sLastUid = '';
			this.bAutoSelect = true;
			this.oCallbacks = {};

			this.emptyFunction = function () {};

			this.focusedItem.subscribe(function (oItem) {
				if (oItem)
				{
					this.sLastUid = this.getItemUid(oItem);
				}
			}, this);

			var
				aCache = [],
				aCheckedCache = [],
				mFocused = null,
				mSelected = null
			;

			this.list.subscribe(function (aItems) {

				var self = this;
				if (Utils.isArray(aItems))
				{
					_.each(aItems, function (oItem) {
						if (oItem)
						{
							var sUid = self.getItemUid(oItem);

							aCache.push(sUid);
							if (oItem.checked())
							{
								aCheckedCache.push(sUid);
							}
							if (null === mFocused && oItem.focused())
							{
								mFocused = sUid;
							}
							if (null === mSelected && oItem.selected())
							{
								mSelected = sUid;
							}
						}
					});
				}
			}, this, 'beforeChange');

			this.list.subscribe(function (aItems) {

				var
					self = this,
					oTemp = null,
					bGetNext = false,
					aUids = [],
					mNextFocused = mFocused,
					bChecked = false,
					bSelected = false,
					iLen = 0
				;

				this.selectedItemUseCallback = false;

				this.focusedItem(null);
				this.selectedItem(null);

				if (Utils.isArray(aItems))
				{
					iLen = aCheckedCache.length;

					_.each(aItems, function (oItem) {

						var sUid = self.getItemUid(oItem);
						aUids.push(sUid);

						if (null !== mFocused && mFocused === sUid)
						{
							self.focusedItem(oItem);
							mFocused = null;
						}

						if (0 < iLen && -1 < Utils.inArray(sUid, aCheckedCache))
						{
							bChecked = true;
							oItem.checked(true);
							iLen--;
						}

						if (!bChecked && null !== mSelected && mSelected === sUid)
						{
							bSelected = true;
							self.selectedItem(oItem);
							mSelected = null;
						}
					});

					this.selectedItemUseCallback = true;

					if (!bChecked && !bSelected && this.bAutoSelect)
					{
						if (self.focusedItem())
						{
							self.selectedItem(self.focusedItem());
						}
						else if (0 < aItems.length)
						{
							if (null !== mNextFocused)
							{
								bGetNext = false;
								mNextFocused = _.find(aCache, function (sUid) {
									if (bGetNext && -1 < Utils.inArray(sUid, aUids))
									{
										return sUid;
									}
									else if (mNextFocused === sUid)
									{
										bGetNext = true;
									}
									return false;
								});

								if (mNextFocused)
								{
									oTemp = _.find(aItems, function (oItem) {
										return mNextFocused === self.getItemUid(oItem);
									});
								}
							}

							self.selectedItem(oTemp || null);
							self.focusedItem(self.selectedItem());
						}
					}
				}

				aCache = [];
				aCheckedCache = [];
				mFocused = null;
				mSelected = null;

			}, this);
		}

		Selector.prototype.itemSelected = function (oItem)
		{
			if (this.isListChecked())
			{
				if (!oItem)
				{
					(this.oCallbacks['onItemSelect'] || this.emptyFunction)(oItem || null);
				}
			}
			else
			{
				if (oItem)
				{
					(this.oCallbacks['onItemSelect'] || this.emptyFunction)(oItem);
				}
			}
		};

		Selector.prototype.goDown = function (bForceSelect)
		{
			this.newSelectPosition(Enums.EventKeyCode.Down, false, bForceSelect);
		};

		Selector.prototype.goUp = function (bForceSelect)
		{
			this.newSelectPosition(Enums.EventKeyCode.Up, false, bForceSelect);
		};

		Selector.prototype.init = function (oContentVisible, oContentScrollable, sKeyScope)
		{
			this.oContentVisible = oContentVisible;
			this.oContentScrollable = oContentScrollable;

			sKeyScope = sKeyScope || 'all';

			if (this.oContentVisible && this.oContentScrollable)
			{
				var
					self = this
				;

				$(this.oContentVisible)
					.on('selectstart', function (oEvent) {
						if (oEvent && oEvent.preventDefault)
						{
							oEvent.preventDefault();
						}
					})
					.on('click', this.sItemSelector, function (oEvent) {
						self.actionClick(ko.dataFor(this), oEvent);
					})
					.on('click', this.sItemCheckedSelector, function (oEvent) {
						var oItem = ko.dataFor(this);
						if (oItem)
						{
							if (oEvent && oEvent.shiftKey)
							{
								self.actionClick(oItem, oEvent);
							}
							else
							{
								self.focusedItem(oItem);
								oItem.checked(!oItem.checked());
							}
						}
					})
				;

				key('enter', sKeyScope, function () {
					if (self.focusedItem() && !self.focusedItem().selected())
					{
						self.actionClick(self.focusedItem());
						return false;
					}

					return true;
				});

				key('ctrl+up, command+up, ctrl+down, command+down', sKeyScope, function () {
					return false;
				});

				key('up, shift+up, down, shift+down, home, end, pageup, pagedown, insert, space', sKeyScope, function (event, handler) {
					if (event && handler && handler.shortcut)
					{
						// TODO
						var iKey = 0;
						switch (handler.shortcut)
						{
							case 'up':
							case 'shift+up':
								iKey = Enums.EventKeyCode.Up;
								break;
							case 'down':
							case 'shift+down':
								iKey = Enums.EventKeyCode.Down;
								break;
							case 'insert':
								iKey = Enums.EventKeyCode.Insert;
								break;
							case 'space':
								iKey = Enums.EventKeyCode.Space;
								break;
							case 'home':
								iKey = Enums.EventKeyCode.Home;
								break;
							case 'end':
								iKey = Enums.EventKeyCode.End;
								break;
							case 'pageup':
								iKey = Enums.EventKeyCode.PageUp;
								break;
							case 'pagedown':
								iKey = Enums.EventKeyCode.PageDown;
								break;
						}

						if (0 < iKey)
						{
							self.newSelectPosition(iKey, key.shift);
							return false;
						}
					}
				});
			}
		};

		Selector.prototype.autoSelect = function (bValue)
		{
			this.bAutoSelect = !!bValue;
		};

		/**
		 * @param {Object} oItem
		 * @returns {string}
		 */
		Selector.prototype.getItemUid = function (oItem)
		{
			var
				sUid = '',
				fGetItemUidCallback = this.oCallbacks['onItemGetUid'] || null
			;

			if (fGetItemUidCallback && oItem)
			{
				sUid = fGetItemUidCallback(oItem);
			}

			return sUid.toString();
		};

		/**
		 * @param {number} iEventKeyCode
		 * @param {boolean} bShiftKey
		 * @param {boolean=} bForceSelect = false
		 */
		Selector.prototype.newSelectPosition = function (iEventKeyCode, bShiftKey, bForceSelect)
		{
			var
				iIndex = 0,
				iPageStep = 10,
				bNext = false,
				bStop = false,
				oResult = null,
				aList = this.list(),
				iListLen = aList ? aList.length : 0,
				oFocused = this.focusedItem()
			;

			if (0 < iListLen)
			{
				if (!oFocused)
				{
					if (Enums.EventKeyCode.Down === iEventKeyCode || Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode || Enums.EventKeyCode.Home === iEventKeyCode || Enums.EventKeyCode.PageUp === iEventKeyCode)
					{
						oResult = aList[0];
					}
					else if (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.End === iEventKeyCode || Enums.EventKeyCode.PageDown === iEventKeyCode)
					{
						oResult = aList[aList.length - 1];
					}
				}
				else if (oFocused)
				{
					if (Enums.EventKeyCode.Down === iEventKeyCode || Enums.EventKeyCode.Up === iEventKeyCode ||  Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
					{
						_.each(aList, function (oItem) {
							if (!bStop)
							{
								switch (iEventKeyCode) {
								case Enums.EventKeyCode.Up:
									if (oFocused === oItem)
									{
										bStop = true;
									}
									else
									{
										oResult = oItem;
									}
									break;
								case Enums.EventKeyCode.Down:
								case Enums.EventKeyCode.Insert:
									if (bNext)
									{
										oResult = oItem;
										bStop = true;
									}
									else if (oFocused === oItem)
									{
										bNext = true;
									}
									break;
								}
							}
						});
					}
					else if (Enums.EventKeyCode.Home === iEventKeyCode || Enums.EventKeyCode.End === iEventKeyCode)
					{
						if (Enums.EventKeyCode.Home === iEventKeyCode)
						{
							oResult = aList[0];
						}
						else if (Enums.EventKeyCode.End === iEventKeyCode)
						{
							oResult = aList[aList.length - 1];
						}
					}
					else if (Enums.EventKeyCode.PageDown === iEventKeyCode)
					{
						for (; iIndex < iListLen; iIndex++)
						{
							if (oFocused === aList[iIndex])
							{
								iIndex += iPageStep;
								iIndex = iListLen - 1 < iIndex ? iListLen - 1 : iIndex;
								oResult = aList[iIndex];
								break;
							}
						}
					}
					else if (Enums.EventKeyCode.PageUp === iEventKeyCode)
					{
						for (iIndex = iListLen; iIndex >= 0; iIndex--)
						{
							if (oFocused === aList[iIndex])
							{
								iIndex -= iPageStep;
								iIndex = 0 > iIndex ? 0 : iIndex;
								oResult = aList[iIndex];
								break;
							}
						}
					}
				}
			}

			if (oResult)
			{
				this.focusedItem(oResult);

				if (oFocused)
				{
					if (bShiftKey)
					{
						if (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.Down === iEventKeyCode)
						{
							oFocused.checked(!oFocused.checked());
						}
					}
					else if (Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
					{
						oFocused.checked(!oFocused.checked());
					}
				}

				if ((this.bAutoSelect || !!bForceSelect) &&
					!this.isListChecked() && Enums.EventKeyCode.Space !== iEventKeyCode)
				{
					this.selectedItem(oResult);
				}

				this.scrollToFocused();
			}
			else if (oFocused)
			{
				if (bShiftKey && (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.Down === iEventKeyCode))
				{
					oFocused.checked(!oFocused.checked());
				}
				else if (Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
				{
					oFocused.checked(!oFocused.checked());
				}

				this.focusedItem(oFocused);
			}
		};

		/**
		 * @return {boolean}
		 */
		Selector.prototype.scrollToFocused = function ()
		{
			if (!this.oContentVisible || !this.oContentScrollable)
			{
				return false;
			}

			var
				iOffset = 20,
				oFocused = $(this.sItemFocusedSelector, this.oContentScrollable),
				oPos = oFocused.position(),
				iVisibleHeight = this.oContentVisible.height(),
				iFocusedHeight = oFocused.outerHeight()
			;

			if (oPos && (oPos.top < 0 || oPos.top + iFocusedHeight > iVisibleHeight))
			{
				if (oPos.top < 0)
				{
					this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iOffset);
				}
				else
				{
					this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iVisibleHeight + iFocusedHeight + iOffset);
				}

				return true;
			}

			return false;
		};

		/**
		 * @param {boolean=} bFast = false
		 * @return {boolean}
		 */
		Selector.prototype.scrollToTop = function (bFast)
		{
			if (!this.oContentVisible || !this.oContentScrollable)
			{
				return false;
			}

			if (bFast)
			{
				this.oContentScrollable.scrollTop(0);
			}
			else
			{
				this.oContentScrollable.stop().animate({'scrollTop': 0}, 200);
			}

			return true;
		};

		Selector.prototype.eventClickFunction = function (oItem, oEvent)
		{
			var
				sUid = this.getItemUid(oItem),
				iIndex = 0,
				iLength = 0,
				oListItem = null,
				sLineUid = '',
				bChangeRange = false,
				bIsInRange = false,
				aList = [],
				bChecked = false
			;

			if (oEvent && oEvent.shiftKey)
			{
				if ('' !== sUid && '' !== this.sLastUid && sUid !== this.sLastUid)
				{
					aList = this.list();
					bChecked = oItem.checked();

					for (iIndex = 0, iLength = aList.length; iIndex < iLength; iIndex++)
					{
						oListItem = aList[iIndex];
						sLineUid = this.getItemUid(oListItem);

						bChangeRange = false;
						if (sLineUid === this.sLastUid || sLineUid === sUid)
						{
							bChangeRange = true;
						}

						if (bChangeRange)
						{
							bIsInRange = !bIsInRange;
						}

						if (bIsInRange || bChangeRange)
						{
							oListItem.checked(bChecked);
						}
					}
				}
			}

			this.sLastUid = '' === sUid ? '' : sUid;
		};

		/**
		 * @param {Object} oItem
		 * @param {Object=} oEvent
		 */
		Selector.prototype.actionClick = function (oItem, oEvent)
		{
			if (oItem)
			{
				var
					bClick = true,
					sUid = this.getItemUid(oItem)
				;

				if (oEvent)
				{
					if (oEvent.shiftKey && !oEvent.ctrlKey && !oEvent.altKey)
					{
						bClick = false;
						if ('' === this.sLastUid)
						{
							this.sLastUid = sUid;
						}

						oItem.checked(!oItem.checked());
						this.eventClickFunction(oItem, oEvent);

						this.focusedItem(oItem);
					}
					else if (oEvent.ctrlKey && !oEvent.shiftKey && !oEvent.altKey)
					{
						bClick = false;
						this.focusedItem(oItem);

						if (this.selectedItem() && oItem !== this.selectedItem())
						{
							this.selectedItem().checked(true);
						}

						oItem.checked(!oItem.checked());
					}
				}

				if (bClick)
				{
					this.focusedItem(oItem);
					this.selectedItem(oItem);

					this.scrollToFocused();
				}
			}
		};

		Selector.prototype.on = function (sEventName, fCallback)
		{
			this.oCallbacks[sEventName] = fCallback;
		};

		module.exports = Selector;

	}());

/***/ },
/* 37 */,
/* 38 */,
/* 39 */,
/* 40 */,
/* 41 */
/*!***********************************************************!*\
  !*** ./dev/ViewModels/AbstractSystemDropDownViewModel.js ***!
  \***********************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),
			key = __webpack_require__(/*! key */ 19),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),

			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function AbstractSystemDropDownViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Right', 'SystemDropDown');

			this.accounts = Data.accounts;
			this.accountEmail = Data.accountEmail;
			this.accountsLoading = Data.accountsLoading;

			this.accountMenuDropdownTrigger = ko.observable(false);

			this.capaAdditionalAccounts = Settings.capa(Enums.Capa.AdditionalAccounts);

			this.loading = ko.computed(function () {
				return this.accountsLoading();
			}, this);

			this.accountClick = _.bind(this.accountClick, this);
		}

		_.extend(AbstractSystemDropDownViewModel.prototype, KnoinAbstractViewModel.prototype);

		AbstractSystemDropDownViewModel.prototype.accountClick = function (oAccount, oEvent)
		{
			if (oAccount && oEvent && !Utils.isUnd(oEvent.which) && 1 === oEvent.which)
			{
				var self = this;
				this.accountsLoading(true);
				_.delay(function () {
					self.accountsLoading(false);
				}, 1000);
			}

			return true;
		};

		AbstractSystemDropDownViewModel.prototype.emailTitle = function ()
		{
			return Data.accountEmail();
		};

		AbstractSystemDropDownViewModel.prototype.settingsClick = function ()
		{
			__webpack_require__(/*! App:Knoin */ 5).setHash(LinkBuilder.settings());
		};

		AbstractSystemDropDownViewModel.prototype.settingsHelp = function ()
		{
			__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(__webpack_require__(/*! View:Popup:KeyboardShortcutsHelp */ 46));
		};

		AbstractSystemDropDownViewModel.prototype.addAccountClick = function ()
		{
			if (this.capaAdditionalAccounts)
			{
				__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(__webpack_require__(/*! View:Popup:AddAccount */ 42));
			}
		};

		AbstractSystemDropDownViewModel.prototype.logoutClick = function ()
		{
			Remote.logout(function () {
				if (window.__rlah_clear)
				{
					window.__rlah_clear();
				}

				__webpack_require__(/*! App:RainLoop */ 4).loginAndLogoutReload(true,
					Settings.settingsGet('ParentEmail') && 0 < Settings.settingsGet('ParentEmail').length);
			});
		};

		AbstractSystemDropDownViewModel.prototype.onBuild = function ()
		{
			var self = this;
			key('`', [Enums.KeyState.MessageList, Enums.KeyState.MessageView, Enums.KeyState.Settings], function () {
				if (self.viewModelVisibility())
				{
					self.accountMenuDropdownTrigger(true);
				}
			});

			// shortcuts help
			key('shift+/', [Enums.KeyState.MessageList, Enums.KeyState.MessageView, Enums.KeyState.Settings], function () {
				if (self.viewModelVisibility())
				{
					__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(__webpack_require__(/*! View:Popup:KeyboardShortcutsHelp */ 46));
					return false;
				}
			});
		};

		module.exports = AbstractSystemDropDownViewModel;

	}());

/***/ },
/* 42 */
/*!************************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsAddAccountViewModel.js ***!
  \************************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsAddAccountViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAddAccount');

			this.email = ko.observable('');
			this.password = ko.observable('');

			this.emailError = ko.observable(false);
			this.passwordError = ko.observable(false);

			this.email.subscribe(function () {
				this.emailError(false);
			}, this);

			this.password.subscribe(function () {
				this.passwordError(false);
			}, this);

			this.submitRequest = ko.observable(false);
			this.submitError = ko.observable('');

			this.emailFocus = ko.observable(false);

			this.addAccountCommand = Utils.createCommand(this, function () {

				this.emailError('' === Utils.trim(this.email()));
				this.passwordError('' === Utils.trim(this.password()));

				if (this.emailError() || this.passwordError())
				{
					return false;
				}

				this.submitRequest(true);

				Remote.accountAdd(_.bind(function (sResult, oData) {

					this.submitRequest(false);
					if (Enums.StorageResultType.Success === sResult && oData && 'AccountAdd' === oData.Action)
					{
						if (oData.Result)
						{
							__webpack_require__(/*! App:RainLoop */ 4).accountsAndIdentities();
							this.cancelCommand();
						}
						else if (oData.ErrorCode)
						{
							this.submitError(Utils.getNotification(oData.ErrorCode));
						}
					}
					else
					{
						this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
					}

				}, this), this.email(), '', this.password());

				return true;

			}, function () {
				return !this.submitRequest();
			});

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:AddAccount', 'PopupsAddAccountViewModel'], PopupsAddAccountViewModel);
		_.extend(PopupsAddAccountViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsAddAccountViewModel.prototype.clearPopup = function ()
		{
			this.email('');
			this.password('');

			this.emailError(false);
			this.passwordError(false);

			this.submitRequest(false);
			this.submitError('');
		};

		PopupsAddAccountViewModel.prototype.onShow = function ()
		{
			this.clearPopup();
		};

		PopupsAddAccountViewModel.prototype.onFocus = function ()
		{
			this.emailFocus(true);
		};

		module.exports = PopupsAddAccountViewModel;

	}());

/***/ },
/* 43 */
/*!**********************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsContactsViewModel.js ***!
  \**********************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),
			key = __webpack_require__(/*! key */ 19),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Selector = __webpack_require__(/*! Common/Selector */ 36),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),

			EmailModel = __webpack_require__(/*! Model:Email */ 23),
			ContactModel = __webpack_require__(/*! Model:Contact */ 54),
			ContactTagModel = __webpack_require__(/*! Model:ContactTag */ 37),
			ContactPropertyModel = __webpack_require__(/*! Model:ContactProperty */ 55),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsContactsViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsContacts');

			var
				self = this,
				fFastClearEmptyListHelper = function (aList) {
					if (aList && 0 < aList.length) {
						self.viewProperties.removeAll(aList);
					}
				}
			;

			this.allowContactsSync = Data.allowContactsSync;
			this.enableContactsSync = Data.enableContactsSync;
			this.allowExport = !Globals.bMobileDevice;

			this.search = ko.observable('');
			this.contactsCount = ko.observable(0);
			this.contacts = Data.contacts;
			this.contactTags = Data.contactTags;

			this.currentContact = ko.observable(null);

			this.importUploaderButton = ko.observable(null);

			this.contactsPage = ko.observable(1);
			this.contactsPageCount = ko.computed(function () {
				var iPage = window.Math.ceil(this.contactsCount() / Consts.Defaults.ContactsPerPage);
				return 0 >= iPage ? 1 : iPage;
			}, this);

			this.contactsPagenator = ko.computed(Utils.computedPagenatorHelper(this.contactsPage, this.contactsPageCount));

			this.emptySelection = ko.observable(true);
			this.viewClearSearch = ko.observable(false);

			this.viewID = ko.observable('');
			this.viewReadOnly = ko.observable(false);
			this.viewProperties = ko.observableArray([]);

			this.viewTags = ko.observable('');
			this.viewTags.visibility = ko.observable(false);
			this.viewTags.focusTrigger = ko.observable(false);

			this.viewTags.focusTrigger.subscribe(function (bValue) {
				if (!bValue && '' === this.viewTags())
				{
					this.viewTags.visibility(false);
				}
				else if (bValue)
				{
					this.viewTags.visibility(true);
				}
			}, this);

			this.viewSaveTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

			this.viewPropertiesNames = this.viewProperties.filter(function(oProperty) {
				return -1 < Utils.inArray(oProperty.type(), [
					Enums.ContactPropertyType.FirstName, Enums.ContactPropertyType.LastName
				]);
			});

			this.viewPropertiesOther = this.viewProperties.filter(function(oProperty) {
				return -1 < Utils.inArray(oProperty.type(), [
					Enums.ContactPropertyType.Note
				]);
			});

			this.viewPropertiesOther = ko.computed(function () {

				var aList = _.filter(this.viewProperties(), function (oProperty) {
					return -1 < Utils.inArray(oProperty.type(), [
						Enums.ContactPropertyType.Nick
					]);
				});

				return _.sortBy(aList, function (oProperty) {
					return oProperty.type();
				});

			}, this);

			this.viewPropertiesEmails = this.viewProperties.filter(function(oProperty) {
				return Enums.ContactPropertyType.Email === oProperty.type();
			});

			this.viewPropertiesWeb = this.viewProperties.filter(function(oProperty) {
				return Enums.ContactPropertyType.Web === oProperty.type();
			});

			this.viewHasNonEmptyRequaredProperties = ko.computed(function() {

				var
					aNames = this.viewPropertiesNames(),
					aEmail = this.viewPropertiesEmails(),
					fHelper = function (oProperty) {
						return '' !== Utils.trim(oProperty.value());
					}
				;

				return !!(_.find(aNames, fHelper) || _.find(aEmail, fHelper));
			}, this);

			this.viewPropertiesPhones = this.viewProperties.filter(function(oProperty) {
				return Enums.ContactPropertyType.Phone === oProperty.type();
			});

			this.viewPropertiesEmailsNonEmpty = this.viewPropertiesNames.filter(function(oProperty) {
				return '' !== Utils.trim(oProperty.value());
			});

			this.viewPropertiesEmailsEmptyAndOnFocused = this.viewPropertiesEmails.filter(function(oProperty) {
				var bF = oProperty.focused();
				return '' === Utils.trim(oProperty.value()) && !bF;
			});

			this.viewPropertiesPhonesEmptyAndOnFocused = this.viewPropertiesPhones.filter(function(oProperty) {
				var bF = oProperty.focused();
				return '' === Utils.trim(oProperty.value()) && !bF;
			});

			this.viewPropertiesWebEmptyAndOnFocused = this.viewPropertiesWeb.filter(function(oProperty) {
				var bF = oProperty.focused();
				return '' === Utils.trim(oProperty.value()) && !bF;
			});

			this.viewPropertiesOtherEmptyAndOnFocused = ko.computed(function () {
				return _.filter(this.viewPropertiesOther(), function (oProperty) {
					var bF = oProperty.focused();
					return '' === Utils.trim(oProperty.value()) && !bF;
				});
			}, this);

			this.viewPropertiesEmailsEmptyAndOnFocused.subscribe(function(aList) {
				fFastClearEmptyListHelper(aList);
			});

			this.viewPropertiesPhonesEmptyAndOnFocused.subscribe(function(aList) {
				fFastClearEmptyListHelper(aList);
			});

			this.viewPropertiesWebEmptyAndOnFocused.subscribe(function(aList) {
				fFastClearEmptyListHelper(aList);
			});

			this.viewPropertiesOtherEmptyAndOnFocused.subscribe(function(aList) {
				fFastClearEmptyListHelper(aList);
			});

			this.viewSaving = ko.observable(false);

			this.useCheckboxesInList = Data.useCheckboxesInList;

			this.search.subscribe(function () {
				this.reloadContactList();
			}, this);

			this.contacts.subscribe(function () {
				Utils.windowResize();
			}, this);

			this.viewProperties.subscribe(function () {
				Utils.windowResize();
			}, this);

			this.contactsChecked = ko.computed(function () {
				return _.filter(this.contacts(), function (oItem) {
					return oItem.checked();
				});
			}, this);

			this.contactsCheckedOrSelected = ko.computed(function () {

				var
					aChecked = this.contactsChecked(),
					oSelected = this.currentContact()
				;

				return _.union(aChecked, oSelected ? [oSelected] : []);

			}, this);

			this.contactsCheckedOrSelectedUids = ko.computed(function () {
				return _.map(this.contactsCheckedOrSelected(), function (oContact) {
					return oContact.idContact;
				});
			}, this);

			this.selector = new Selector(this.contacts, this.currentContact,
				'.e-contact-item .actionHandle', '.e-contact-item.selected', '.e-contact-item .checkboxItem',
					'.e-contact-item.focused');

			this.selector.on('onItemSelect', _.bind(function (oContact) {
				this.populateViewContact(oContact ? oContact : null);
				if (!oContact)
				{
					this.emptySelection(true);
				}
			}, this));

			this.selector.on('onItemGetUid', function (oContact) {
				return oContact ? oContact.generateUid() : '';
			});

			this.newCommand = Utils.createCommand(this, function () {
				this.populateViewContact(null);
				this.currentContact(null);
			});

			this.deleteCommand = Utils.createCommand(this, function () {
				this.deleteSelectedContacts();
				this.emptySelection(true);
			}, function () {
				return 0 < this.contactsCheckedOrSelected().length;
			});

			this.newMessageCommand = Utils.createCommand(this, function () {
				var aC = this.contactsCheckedOrSelected(), aE = [];
				if (Utils.isNonEmptyArray(aC))
				{
					aE = _.map(aC, function (oItem) {
						if (oItem)
						{
							var
								aData = oItem.getNameAndEmailHelper(),
								oEmail = aData ? new EmailModel(aData[0], aData[1]) : null
							;

							if (oEmail && oEmail.validate())
							{
								return oEmail;
							}
						}

						return null;
					});

					aE = _.compact(aE);
				}

				if (Utils.isNonEmptyArray(aE))
				{
					kn.hideScreenPopup(__webpack_require__(/*! View:Popup:Contacts */ 43));
					kn.showScreenPopup(__webpack_require__(/*! View:Popup:Compose */ 21), [Enums.ComposeType.Empty, null, aE]);
				}

			}, function () {
				return 0 < this.contactsCheckedOrSelected().length;
			});

			this.clearCommand = Utils.createCommand(this, function () {
				this.search('');
			});

			this.saveCommand = Utils.createCommand(this, function () {

				this.viewSaving(true);
				this.viewSaveTrigger(Enums.SaveSettingsStep.Animate);

				var
					sRequestUid = Utils.fakeMd5(),
					aProperties = []
				;

				_.each(this.viewProperties(), function (oItem) {
					if (oItem.type() && '' !== Utils.trim(oItem.value()))
					{
						aProperties.push([oItem.type(), oItem.value(), oItem.typeStr()]);
					}
				});

				Remote.contactSave(function (sResult, oData) {

					var bRes = false;
					self.viewSaving(false);

					if (Enums.StorageResultType.Success === sResult && oData && oData.Result &&
						oData.Result.RequestUid === sRequestUid && 0 < Utils.pInt(oData.Result.ResultID))
					{
						if ('' === self.viewID())
						{
							self.viewID(Utils.pInt(oData.Result.ResultID));
						}

						self.reloadContactList();
						bRes = true;
					}

					_.delay(function () {
						self.viewSaveTrigger(bRes ? Enums.SaveSettingsStep.TrueResult : Enums.SaveSettingsStep.FalseResult);
					}, 300);

					if (bRes)
					{
						self.watchDirty(false);

						_.delay(function () {
							self.viewSaveTrigger(Enums.SaveSettingsStep.Idle);
						}, 1000);
					}

				}, sRequestUid, this.viewID(), this.viewTags(), aProperties);

			}, function () {
				var
					bV = this.viewHasNonEmptyRequaredProperties(),
					bReadOnly = this.viewReadOnly()
				;
				return !this.viewSaving() && bV && !bReadOnly;
			});

			this.syncCommand = Utils.createCommand(this, function () {

				var self = this;
				__webpack_require__(/*! App:RainLoop */ 4).contactsSync(function (sResult, oData) {
					if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
					{
						window.alert(Utils.getNotification(
							oData && oData.ErrorCode ? oData.ErrorCode : Enums.Notification.ContactsSyncError));
					}

					self.reloadContactList(true);
				});

			}, function () {
				return !this.contacts.syncing() && !this.contacts.importing();
			});

			this.bDropPageAfterDelete = false;

			this.watchDirty = ko.observable(false);
			this.watchHash = ko.observable(false);

			this.viewHash = ko.computed(function () {
				return '' + self.viewTags() + '|' + _.map(self.viewProperties(), function (oItem) {
					return oItem.value();
				}).join('');
			});

		//	this.saveCommandDebounce = _.debounce(_.bind(this.saveCommand, this), 1000);

			this.viewHash.subscribe(function () {
				if (this.watchHash() && !this.viewReadOnly() && !this.watchDirty())
				{
					this.watchDirty(true);
				}
			}, this);

			this.sDefaultKeyScope = Enums.KeyState.ContactList;

			this.contactTagsSource = _.bind(this.contactTagsSource, this);

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:Contacts', 'PopupsContactsViewModel'], PopupsContactsViewModel);
		_.extend(PopupsContactsViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsContactsViewModel.prototype.contactTagsSource = function (oData, fResponse)
		{
			__webpack_require__(/*! App:RainLoop */ 4).getContactTagsAutocomplete(oData.term, function (aData) {
				fResponse(_.map(aData, function (oTagItem) {
					return oTagItem.toLine(false);
				}));
			});
		};

		PopupsContactsViewModel.prototype.getPropertyPlceholder = function (sType)
		{
			var sResult = '';
			switch (sType)
			{
				case Enums.ContactPropertyType.LastName:
					sResult = 'CONTACTS/PLACEHOLDER_ENTER_LAST_NAME';
					break;
				case Enums.ContactPropertyType.FirstName:
					sResult = 'CONTACTS/PLACEHOLDER_ENTER_FIRST_NAME';
					break;
				case Enums.ContactPropertyType.Nick:
					sResult = 'CONTACTS/PLACEHOLDER_ENTER_NICK_NAME';
					break;
			}

			return sResult;
		};

		PopupsContactsViewModel.prototype.addNewProperty = function (sType, sTypeStr)
		{
			this.viewProperties.push(new ContactPropertyModel(sType, sTypeStr || '', '', true, this.getPropertyPlceholder(sType)));
		};

		PopupsContactsViewModel.prototype.addNewOrFocusProperty = function (sType, sTypeStr)
		{
			var oItem = _.find(this.viewProperties(), function (oItem) {
				return sType === oItem.type();
			});

			if (oItem)
			{
				oItem.focused(true);
			}
			else
			{
				this.addNewProperty(sType, sTypeStr);
			}
		};

		PopupsContactsViewModel.prototype.addNewTag = function ()
		{
			this.viewTags.visibility(true);
			this.viewTags.focusTrigger(true);
		};

		PopupsContactsViewModel.prototype.addNewEmail = function ()
		{
			this.addNewProperty(Enums.ContactPropertyType.Email, 'Home');
		};

		PopupsContactsViewModel.prototype.addNewPhone = function ()
		{
			this.addNewProperty(Enums.ContactPropertyType.Phone, 'Mobile');
		};

		PopupsContactsViewModel.prototype.addNewWeb = function ()
		{
			this.addNewProperty(Enums.ContactPropertyType.Web);
		};

		PopupsContactsViewModel.prototype.addNewNickname = function ()
		{
			this.addNewOrFocusProperty(Enums.ContactPropertyType.Nick);
		};

		PopupsContactsViewModel.prototype.addNewNotes = function ()
		{
			this.addNewOrFocusProperty(Enums.ContactPropertyType.Note);
		};

		PopupsContactsViewModel.prototype.addNewBirthday = function ()
		{
			this.addNewOrFocusProperty(Enums.ContactPropertyType.Birthday);
		};

		PopupsContactsViewModel.prototype.exportVcf = function ()
		{
			__webpack_require__(/*! App:RainLoop */ 4).download(LinkBuilder.exportContactsVcf());
		};

		PopupsContactsViewModel.prototype.exportCsv = function ()
		{
			__webpack_require__(/*! App:RainLoop */ 4).download(LinkBuilder.exportContactsCsv());
		};

		PopupsContactsViewModel.prototype.initUploader = function ()
		{
			if (this.importUploaderButton())
			{
				var
					oJua = new Jua({
						'action': LinkBuilder.uploadContacts(),
						'name': 'uploader',
						'queueSize': 1,
						'multipleSizeLimit': 1,
						'disableFolderDragAndDrop': true,
						'disableDragAndDrop': true,
						'disableMultiple': true,
						'disableDocumentDropPrevent': true,
						'clickElement': this.importUploaderButton()
					})
				;

				if (oJua)
				{
					oJua
						.on('onStart', _.bind(function () {
							this.contacts.importing(true);
						}, this))
						.on('onComplete', _.bind(function (sId, bResult, oData) {

							this.contacts.importing(false);
							this.reloadContactList();

							if (!sId || !bResult || !oData || !oData.Result)
							{
								window.alert(Utils.i18n('CONTACTS/ERROR_IMPORT_FILE'));
							}

						}, this))
					;
				}
			}
		};

		PopupsContactsViewModel.prototype.removeCheckedOrSelectedContactsFromList = function ()
		{
			var
				self = this,
				oKoContacts = this.contacts,
				oCurrentContact = this.currentContact(),
				iCount = this.contacts().length,
				aContacts = this.contactsCheckedOrSelected()
			;

			if (0 < aContacts.length)
			{
				_.each(aContacts, function (oContact) {

					if (oCurrentContact && oCurrentContact.idContact === oContact.idContact)
					{
						oCurrentContact = null;
						self.currentContact(null);
					}

					oContact.deleted(true);
					iCount--;
				});

				if (iCount <= 0)
				{
					this.bDropPageAfterDelete = true;
				}

				_.delay(function () {

					_.each(aContacts, function (oContact) {
						oKoContacts.remove(oContact);
					});

				}, 500);
			}
		};

		PopupsContactsViewModel.prototype.deleteSelectedContacts = function ()
		{
			if (0 < this.contactsCheckedOrSelected().length)
			{
				Remote.contactsDelete(
					_.bind(this.deleteResponse, this),
					this.contactsCheckedOrSelectedUids()
				);

				this.removeCheckedOrSelectedContactsFromList();
			}
		};

		/**
		 * @param {string} sResult
		 * @param {AjaxJsonDefaultResponse} oData
		 */
		PopupsContactsViewModel.prototype.deleteResponse = function (sResult, oData)
		{
			if (500 < (Enums.StorageResultType.Success === sResult && oData && oData.Time ? Utils.pInt(oData.Time) : 0))
			{
				this.reloadContactList(this.bDropPageAfterDelete);
			}
			else
			{
				_.delay((function (self) {
					return function () {
						self.reloadContactList(self.bDropPageAfterDelete);
					};
				}(this)), 500);
			}
		};

		PopupsContactsViewModel.prototype.removeProperty = function (oProp)
		{
			this.viewProperties.remove(oProp);
		};

		/**
		 * @param {?ContactModel} oContact
		 */
		PopupsContactsViewModel.prototype.populateViewContact = function (oContact)
		{
			var
				sId = '',
				sLastName = '',
				sFirstName = '',
				aList = []
			;

			this.watchHash(false);

			this.emptySelection(false);
			this.viewReadOnly(false);
			this.viewTags('');

			if (oContact)
			{
				sId = oContact.idContact;
				if (Utils.isNonEmptyArray(oContact.properties))
				{
					_.each(oContact.properties, function (aProperty) {
						if (aProperty && aProperty[0])
						{
							if (Enums.ContactPropertyType.LastName === aProperty[0])
							{
								sLastName = aProperty[1];
							}
							else if (Enums.ContactPropertyType.FirstName === aProperty[0])
							{
								sFirstName = aProperty[1];
							}
							else
							{
								aList.push(new ContactPropertyModel(aProperty[0], aProperty[2] || '', aProperty[1]));
							}
						}
					});
				}

				this.viewTags(oContact.tags);

				this.viewReadOnly(!!oContact.readOnly);
			}

			this.viewTags.focusTrigger.valueHasMutated();
			this.viewTags.visibility('' !== this.viewTags());

			aList.unshift(new ContactPropertyModel(Enums.ContactPropertyType.LastName, '', sLastName, false,
				this.getPropertyPlceholder(Enums.ContactPropertyType.LastName)));

			aList.unshift(new ContactPropertyModel(Enums.ContactPropertyType.FirstName, '', sFirstName, !oContact,
				this.getPropertyPlceholder(Enums.ContactPropertyType.FirstName)));

			this.viewID(sId);
			this.viewProperties([]);
			this.viewProperties(aList);

			this.watchDirty(false);
			this.watchHash(true);
		};

		/**
		 * @param {boolean=} bDropPagePosition = false
		 */
		PopupsContactsViewModel.prototype.reloadContactList = function (bDropPagePosition)
		{
			var
				self = this,
				iOffset = (this.contactsPage() - 1) * Consts.Defaults.ContactsPerPage
			;

			this.bDropPageAfterDelete = false;

			if (Utils.isUnd(bDropPagePosition) ? false : !!bDropPagePosition)
			{
				this.contactsPage(1);
				iOffset = 0;
			}

			this.contacts.loading(true);
			Remote.contacts(function (sResult, oData) {
				var
					iCount = 0,
					aList = [],
					aTagsList = []
				;

				if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result.List)
				{
					if (Utils.isNonEmptyArray(oData.Result.List))
					{
						aList = _.map(oData.Result.List, function (oItem) {
							var oContact = new ContactModel();
							return oContact.parse(oItem) ? oContact : null;
						});

						aList = _.compact(aList);

						iCount = Utils.pInt(oData.Result.Count);
						iCount = 0 < iCount ? iCount : 0;
					}

					if (Utils.isNonEmptyArray(oData.Result.Tags))
					{
						aTagsList = _.map(oData.Result.Tags, function (oItem) {
							var oContactTag = new ContactTagModel();
							return oContactTag.parse(oItem) ? oContactTag : null;
						});

						aTagsList = _.compact(aTagsList);
					}
				}

				self.contactsCount(iCount);

				self.contacts(aList);
				self.contacts.loading(false);
				self.contactTags(aTagsList);

				self.viewClearSearch('' !== self.search());

			}, iOffset, Consts.Defaults.ContactsPerPage, this.search());
		};

		PopupsContactsViewModel.prototype.onBuild = function (oDom)
		{
			this.oContentVisible = $('.b-list-content', oDom);
			this.oContentScrollable = $('.content', this.oContentVisible);

			this.selector.init(this.oContentVisible, this.oContentScrollable, Enums.KeyState.ContactList);

			var self = this;

			key('delete', Enums.KeyState.ContactList, function () {
				self.deleteCommand();
				return false;
			});

			oDom
				.on('click', '.e-pagenator .e-page', function () {
					var oPage = ko.dataFor(this);
					if (oPage)
					{
						self.contactsPage(Utils.pInt(oPage.value));
						self.reloadContactList();
					}
				})
			;

			this.initUploader();
		};

		PopupsContactsViewModel.prototype.onShow = function ()
		{
			kn.routeOff();
			this.reloadContactList(true);
		};

		PopupsContactsViewModel.prototype.onHide = function ()
		{
			kn.routeOn();
			this.currentContact(null);
			this.emptySelection(true);
			this.search('');
			this.contactsCount(0);
			this.contacts([]);
		};

		module.exports = PopupsContactsViewModel;

	}());

/***/ },
/* 44 */
/*!**************************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsFolderCreateViewModel.js ***!
  \**************************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsFolderCreateViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderCreate');

			Utils.initOnStartOrLangChange(function () {
				this.sNoParentText = Utils.i18n('POPUPS_CREATE_FOLDER/SELECT_NO_PARENT');
			}, this);

			this.folderName = ko.observable('');
			this.folderName.focused = ko.observable(false);

			this.selectedParentValue = ko.observable(Consts.Values.UnuseOptionValue);

			this.parentFolderSelectList = ko.computed(function () {

				var
					aTop = [],
					fDisableCallback = null,
					fVisibleCallback = null,
					aList = Data.folderList(),
					fRenameCallback = function (oItem) {
						return oItem ? (oItem.isSystemFolder() ? oItem.name() + ' ' + oItem.manageFolderSystemName() : oItem.name()) : '';
					}
				;

				aTop.push(['', this.sNoParentText]);

				if ('' !== Data.namespace)
				{
					fDisableCallback = function (oItem)
					{
						return Data.namespace !== oItem.fullNameRaw.substr(0, Data.namespace.length);
					};
				}

				return Utils.folderListOptionsBuilder([], aList, [], aTop, null, fDisableCallback, fVisibleCallback, fRenameCallback);

			}, this);

			// commands
			this.createFolder = Utils.createCommand(this, function () {

				var
					sParentFolderName = this.selectedParentValue()
				;

				if ('' === sParentFolderName && 1 < Data.namespace.length)
				{
					sParentFolderName = Data.namespace.substr(0, Data.namespace.length - 1);
				}

				Data.foldersCreating(true);
				Remote.folderCreate(function (sResult, oData) {

					Data.foldersCreating(false);
					if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
					{
						__webpack_require__(/*! App:RainLoop */ 4).folders();
					}
					else
					{
						Data.foldersListError(
							oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_CREATE_FOLDER'));
					}

				},	this.folderName(), sParentFolderName);

				this.cancelCommand();

			}, function () {
				return this.simpleFolderNameValidation(this.folderName());
			});

			this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:FolderCreate', 'PopupsFolderCreateViewModel'], PopupsFolderCreateViewModel);
		_.extend(PopupsFolderCreateViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsFolderCreateViewModel.prototype.sNoParentText = '';

		PopupsFolderCreateViewModel.prototype.simpleFolderNameValidation = function (sName)
		{
			return (/^[^\\\/]+$/g).test(Utils.trim(sName));
		};

		PopupsFolderCreateViewModel.prototype.clearPopup = function ()
		{
			this.folderName('');
			this.selectedParentValue('');
			this.folderName.focused(false);
		};

		PopupsFolderCreateViewModel.prototype.onShow = function ()
		{
			this.clearPopup();
		};

		PopupsFolderCreateViewModel.prototype.onFocus = function ()
		{
			this.folderName.focused(true);
		};

		module.exports = PopupsFolderCreateViewModel;

	}());

/***/ },
/* 45 */
/*!**********************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsIdentityViewModel.js ***!
  \**********************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),
			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsIdentityViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsIdentity');

			this.id = '';
			this.edit = ko.observable(false);
			this.owner = ko.observable(false);

			this.email = ko.observable('').validateEmail();
			this.email.focused = ko.observable(false);
			this.name = ko.observable('');
			this.name.focused = ko.observable(false);
			this.replyTo = ko.observable('').validateSimpleEmail();
			this.replyTo.focused = ko.observable(false);
			this.bcc = ko.observable('').validateSimpleEmail();
			this.bcc.focused = ko.observable(false);

		//	this.email.subscribe(function () {
		//		this.email.hasError(false);
		//	}, this);

			this.submitRequest = ko.observable(false);
			this.submitError = ko.observable('');

			this.addOrEditIdentityCommand = Utils.createCommand(this, function () {

				if (!this.email.hasError())
				{
					this.email.hasError('' === Utils.trim(this.email()));
				}

				if (this.email.hasError())
				{
					if (!this.owner())
					{
						this.email.focused(true);
					}

					return false;
				}

				if (this.replyTo.hasError())
				{
					this.replyTo.focused(true);
					return false;
				}

				if (this.bcc.hasError())
				{
					this.bcc.focused(true);
					return false;
				}

				this.submitRequest(true);

				Remote.identityUpdate(_.bind(function (sResult, oData) {

					this.submitRequest(false);
					if (Enums.StorageResultType.Success === sResult && oData)
					{
						if (oData.Result)
						{
							__webpack_require__(/*! App:RainLoop */ 4).accountsAndIdentities();
							this.cancelCommand();
						}
						else if (oData.ErrorCode)
						{
							this.submitError(Utils.getNotification(oData.ErrorCode));
						}
					}
					else
					{
						this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
					}

				}, this), this.id, this.email(), this.name(), this.replyTo(), this.bcc());

				return true;

			}, function () {
				return !this.submitRequest();
			});

			this.label = ko.computed(function () {
				return Utils.i18n('POPUPS_IDENTITIES/' + (this.edit() ? 'TITLE_UPDATE_IDENTITY': 'TITLE_ADD_IDENTITY'));
			}, this);

			this.button = ko.computed(function () {
				return Utils.i18n('POPUPS_IDENTITIES/' + (this.edit() ? 'BUTTON_UPDATE_IDENTITY': 'BUTTON_ADD_IDENTITY'));
			}, this);

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:Identity', 'PopupsIdentityViewModel'], PopupsIdentityViewModel);
		_.extend(PopupsIdentityViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsIdentityViewModel.prototype.clearPopup = function ()
		{
			this.id = '';
			this.edit(false);
			this.owner(false);

			this.name('');
			this.email('');
			this.replyTo('');
			this.bcc('');

			this.email.hasError(false);
			this.replyTo.hasError(false);
			this.bcc.hasError(false);

			this.submitRequest(false);
			this.submitError('');
		};

		/**
		 * @param {?IdentityModel} oIdentity
		 */
		PopupsIdentityViewModel.prototype.onShow = function (oIdentity)
		{
			this.clearPopup();

			if (oIdentity)
			{
				this.edit(true);

				this.id = oIdentity.id;
				this.name(oIdentity.name());
				this.email(oIdentity.email());
				this.replyTo(oIdentity.replyTo());
				this.bcc(oIdentity.bcc());

				this.owner(this.id === Data.accountEmail());
			}
		};

		PopupsIdentityViewModel.prototype.onFocus = function ()
		{
			if (!this.owner())
			{
				this.email.focused(true);
			}
		};

		module.exports = PopupsIdentityViewModel;

	}());

/***/ },
/* 46 */
/*!***********************************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsKeyboardShortcutsHelpViewModel.js ***!
  \***********************************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			key = __webpack_require__(/*! key */ 19),

			Enums = __webpack_require__(/*! Common/Enums */ 6),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsKeyboardShortcutsHelpViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsKeyboardShortcutsHelp');

			this.sDefaultKeyScope = Enums.KeyState.PopupKeyboardShortcutsHelp;

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:KeyboardShortcutsHelp', 'PopupsKeyboardShortcutsHelpViewModel'], PopupsKeyboardShortcutsHelpViewModel);
		_.extend(PopupsKeyboardShortcutsHelpViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsKeyboardShortcutsHelpViewModel.prototype.onBuild = function (oDom)
		{
			key('tab, shift+tab, left, right', Enums.KeyState.PopupKeyboardShortcutsHelp, _.bind(function (event, handler) {
				if (event && handler)
				{
					var
						$tabs = oDom.find('.nav.nav-tabs > li'),
						bNext = handler && ('tab' === handler.shortcut || 'right' === handler.shortcut),
						iIndex = $tabs.index($tabs.filter('.active'))
					;

					if (!bNext && iIndex > 0)
					{
						iIndex--;
					}
					else if (bNext && iIndex < $tabs.length - 1)
					{
						iIndex++;
					}
					else
					{
						iIndex = bNext ? 0 : $tabs.length - 1;
					}

					$tabs.eq(iIndex).find('a[data-toggle="tab"]').tab('show');
					return false;
				}
			}, this));
		};

		module.exports = PopupsKeyboardShortcutsHelpViewModel;

	}());

/***/ },
/* 47 */
/*!**********************!*\
  !*** external "Jua" ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = Jua;

/***/ },
/* 48 */,
/* 49 */,
/* 50 */,
/* 51 */,
/* 52 */,
/* 53 */
/*!**********************************************!*\
  !*** ./dev/Models/ComposeAttachmentModel.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),

			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @constructor
		 * @param {string} sId
		 * @param {string} sFileName
		 * @param {?number=} nSize
		 * @param {boolean=} bInline
		 * @param {boolean=} bLinked
		 * @param {string=} sCID
		 * @param {string=} sContentLocation
		 */
		function ComposeAttachmentModel(sId, sFileName, nSize, bInline, bLinked, sCID, sContentLocation)
		{
			this.id = sId;
			this.isInline = Utils.isUnd(bInline) ? false : !!bInline;
			this.isLinked = Utils.isUnd(bLinked) ? false : !!bLinked;
			this.CID = Utils.isUnd(sCID) ? '' : sCID;
			this.contentLocation = Utils.isUnd(sContentLocation) ? '' : sContentLocation;
			this.fromMessage = false;

			this.fileName = ko.observable(sFileName);
			this.size = ko.observable(Utils.isUnd(nSize) ? null : nSize);
			this.tempName = ko.observable('');

			this.progress = ko.observable('');
			this.error = ko.observable('');
			this.waiting = ko.observable(true);
			this.uploading = ko.observable(false);
			this.enabled = ko.observable(true);

			this.friendlySize = ko.computed(function () {
				var mSize = this.size();
				return null === mSize ? '' : Utils.friendlySize(this.size());
			}, this);
		}

		ComposeAttachmentModel.prototype.id = '';
		ComposeAttachmentModel.prototype.isInline = false;
		ComposeAttachmentModel.prototype.isLinked = false;
		ComposeAttachmentModel.prototype.CID = '';
		ComposeAttachmentModel.prototype.contentLocation = '';
		ComposeAttachmentModel.prototype.fromMessage = false;
		ComposeAttachmentModel.prototype.cancel = Utils.emptyFunction;

		/**
		 * @param {AjaxJsonComposeAttachment} oJsonAttachment
		 */
		ComposeAttachmentModel.prototype.initByUploadJson = function (oJsonAttachment)
		{
			var bResult = false;
			if (oJsonAttachment)
			{
				this.fileName(oJsonAttachment.Name);
				this.size(Utils.isUnd(oJsonAttachment.Size) ? 0 : Utils.pInt(oJsonAttachment.Size));
				this.tempName(Utils.isUnd(oJsonAttachment.TempName) ? '' : oJsonAttachment.TempName);
				this.isInline = false;

				bResult = true;
			}

			return bResult;
		};

		module.exports = ComposeAttachmentModel;

	}());

/***/ },
/* 54 */
/*!************************************!*\
  !*** ./dev/Models/ContactModel.js ***!
  \************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11)
		;

		/**
		 * @constructor
		 */
		function ContactModel()
		{
			this.idContact = 0;
			this.display = '';
			this.properties = [];
			this.tags = '';
			this.readOnly = false;

			this.focused = ko.observable(false);
			this.selected = ko.observable(false);
			this.checked = ko.observable(false);
			this.deleted = ko.observable(false);
		}

		/**
		 * @return {Array|null}
		 */
		ContactModel.prototype.getNameAndEmailHelper = function ()
		{
			var
				sName = '',
				sEmail = ''
			;

			if (Utils.isNonEmptyArray(this.properties))
			{
				_.each(this.properties, function (aProperty) {
					if (aProperty)
					{
						if (Enums.ContactPropertyType.FirstName === aProperty[0])
						{
							sName = Utils.trim(aProperty[1] + ' ' + sName);
						}
						else if (Enums.ContactPropertyType.LastName === aProperty[0])
						{
							sName = Utils.trim(sName + ' ' + aProperty[1]);
						}
						else if ('' === sEmail && Enums.ContactPropertyType.Email === aProperty[0])
						{
							sEmail = aProperty[1];
						}
					}
				}, this);
			}

			return '' === sEmail ? null : [sEmail, sName];
		};

		ContactModel.prototype.parse = function (oItem)
		{
			var bResult = false;
			if (oItem && 'Object/Contact' === oItem['@Object'])
			{
				this.idContact = Utils.pInt(oItem['IdContact']);
				this.display = Utils.pString(oItem['Display']);
				this.readOnly = !!oItem['ReadOnly'];
				this.tags = '';

				if (Utils.isNonEmptyArray(oItem['Properties']))
				{
					_.each(oItem['Properties'], function (oProperty) {
						if (oProperty && oProperty['Type'] && Utils.isNormal(oProperty['Value']) && Utils.isNormal(oProperty['TypeStr']))
						{
							this.properties.push([Utils.pInt(oProperty['Type']), Utils.pString(oProperty['Value']), Utils.pString(oProperty['TypeStr'])]);
						}
					}, this);
				}

				if (Utils.isNonEmptyArray(oItem['Tags']))
				{
					this.tags = oItem['Tags'].join(',');
				}

				bResult = true;
			}

			return bResult;
		};

		/**
		 * @return {string}
		 */
		ContactModel.prototype.srcAttr = function ()
		{
			return LinkBuilder.emptyContactPic();
		};

		/**
		 * @return {string}
		 */
		ContactModel.prototype.generateUid = function ()
		{
			return '' + this.idContact;
		};

		/**
		 * @return string
		 */
		ContactModel.prototype.lineAsCcc = function ()
		{
			var aResult = [];
			if (this.deleted())
			{
				aResult.push('deleted');
			}
			if (this.selected())
			{
				aResult.push('selected');
			}
			if (this.checked())
			{
				aResult.push('checked');
			}
			if (this.focused())
			{
				aResult.push('focused');
			}

			return aResult.join(' ');
		};

		module.exports = ContactModel;

	}());

/***/ },
/* 55 */
/*!********************************************!*\
  !*** ./dev/Models/ContactPropertyModel.js ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @constructor
		 * @param {number=} iType = Enums.ContactPropertyType.Unknown
		 * @param {string=} sTypeStr = ''
		 * @param {string=} sValue = ''
		 * @param {boolean=} bFocused = false
		 * @param {string=} sPlaceholder = ''
		 */
		function ContactPropertyModel(iType, sTypeStr, sValue, bFocused, sPlaceholder)
		{
			this.type = ko.observable(Utils.isUnd(iType) ? Enums.ContactPropertyType.Unknown : iType);
			this.typeStr = ko.observable(Utils.isUnd(sTypeStr) ? '' : sTypeStr);
			this.focused = ko.observable(Utils.isUnd(bFocused) ? false : !!bFocused);
			this.value = ko.observable(Utils.pString(sValue));

			this.placeholder = ko.observable(sPlaceholder || '');

			this.placeholderValue = ko.computed(function () {
				var sPlaceholder = this.placeholder();
				return sPlaceholder ? Utils.i18n(sPlaceholder) : '';
			}, this);

			this.largeValue = ko.computed(function () {
				return Enums.ContactPropertyType.Note === this.type();
			}, this);
		}

		module.exports = ContactPropertyModel;

	}());

/***/ },
/* 56 */
/*!********************************************!*\
  !*** ./dev/Models/FilterConditionModel.js ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6)
		;

		/**
		 * @param {*} oKoList
		 * @constructor
		 */
		function FilterConditionModel(oKoList)
		{
			this.parentList = oKoList;

			this.field = ko.observable(Enums.FilterConditionField.From);

			this.fieldOptions = [ // TODO i18n
				{'id': Enums.FilterConditionField.From, 'name': 'From'},
				{'id': Enums.FilterConditionField.Recipient, 'name': 'Recipient (To or CC)'},
				{'id': Enums.FilterConditionField.To, 'name': 'To'},
				{'id': Enums.FilterConditionField.Subject, 'name': 'Subject'}
			];

			this.type = ko.observable(Enums.FilterConditionType.EqualTo);

			this.typeOptions = [ // TODO i18n
				{'id': Enums.FilterConditionType.EqualTo, 'name': 'Equal To'},
				{'id': Enums.FilterConditionType.NotEqualTo, 'name': 'Not Equal To'},
				{'id': Enums.FilterConditionType.Contains, 'name': 'Contains'},
				{'id': Enums.FilterConditionType.NotContains, 'name': 'Not Contains'}
			];

			this.value = ko.observable('');

			this.template = ko.computed(function () {

				var sTemplate = '';
				switch (this.type())
				{
					default:
						sTemplate = 'SettingsFiltersConditionDefault';
						break;
				}

				return sTemplate;

			}, this);
		}

		FilterConditionModel.prototype.removeSelf = function ()
		{
			this.parentList.remove(this);
		};

		module.exports = FilterConditionModel;

	}());

/***/ },
/* 57 */
/*!***********************************!*\
  !*** ./dev/Models/FilterModel.js ***!
  \***********************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			FilterConditionModel = __webpack_require__(/*! Model:FilterCondition */ 56)
		;

		/**
		 * @constructor
		 */
		function FilterModel()
		{
			this.isNew = ko.observable(true);
			this.enabled = ko.observable(true);

			this.name = ko.observable('');

			this.conditionsType = ko.observable(Enums.FilterRulesType.And);

			this.conditions = ko.observableArray([]);

			this.conditions.subscribe(function () {
				Utils.windowResize();
			});

			// Actions
			this.actionMarkAsRead = ko.observable(false);
			this.actionSkipOtherFilters = ko.observable(true);
			this.actionValue = ko.observable('');

			this.actionType = ko.observable(Enums.FiltersAction.Move);
			this.actionTypeOptions = [ // TODO i18n
				{'id': Enums.FiltersAction.None, 'name': 'Action - None'},
				{'id': Enums.FiltersAction.Move, 'name': 'Action - Move to'},
		//		{'id': Enums.FiltersAction.Forward, 'name': 'Action - Forward to'},
				{'id': Enums.FiltersAction.Discard, 'name': 'Action - Discard'}
			];

			this.actionMarkAsReadVisiblity = ko.computed(function () {
				return -1 < Utils.inArray(this.actionType(), [
					Enums.FiltersAction.None, Enums.FiltersAction.Forward, Enums.FiltersAction.Move
				]);
			}, this);

			this.actionTemplate = ko.computed(function () {

				var sTemplate = '';
				switch (this.actionType())
				{
					default:
					case Enums.FiltersAction.Move:
						sTemplate = 'SettingsFiltersActionValueAsFolders';
						break;
					case Enums.FiltersAction.Forward:
						sTemplate = 'SettingsFiltersActionWithValue';
						break;
					case Enums.FiltersAction.None:
					case Enums.FiltersAction.Discard:
						sTemplate = 'SettingsFiltersActionNoValue';
						break;
				}

				return sTemplate;

			}, this);
		}

		FilterModel.prototype.addCondition = function ()
		{
			this.conditions.push(new FilterConditionModel(this.conditions));
		};

		FilterModel.prototype.parse = function (oItem)
		{
			var bResult = false;
			if (oItem && 'Object/Filter' === oItem['@Object'])
			{
				this.name(Utils.pString(oItem['Name']));

				bResult = true;
			}

			return bResult;
		};

		module.exports = FilterModel;

	}());

/***/ },
/* 58 */,
/* 59 */,
/* 60 */,
/* 61 */
/*!************************************!*\
  !*** ./dev/Screens/AboutScreen.js ***!
  \************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),

			KnoinAbstractScreen = __webpack_require__(/*! Knoin:AbstractScreen */ 24)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractScreen
		 */
		function AboutScreen()
		{
			KnoinAbstractScreen.call(this, 'about', [
				__webpack_require__(/*! View:RainLoop:About */ 92)
			]);
		}

		_.extend(AboutScreen.prototype, KnoinAbstractScreen.prototype);

		AboutScreen.prototype.onShow = function ()
		{
			__webpack_require__(/*! App:RainLoop */ 4).setTitle('RainLoop');
		};

		module.exports = AboutScreen;

	}());

/***/ },
/* 62 */,
/* 63 */,
/* 64 */,
/* 65 */
/*!**************************************!*\
  !*** ./dev/Screens/MailBoxScreen.js ***!
  \**************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Events = __webpack_require__(/*! Common/Events */ 22),

			KnoinAbstractScreen = __webpack_require__(/*! Knoin:AbstractScreen */ 24),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Cache = __webpack_require__(/*! Storage:RainLoop:Cache */ 20),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractScreen
		 */
		function MailBoxScreen()
		{
			KnoinAbstractScreen.call(this, 'mailbox', [
				__webpack_require__(/*! View:RainLoop:MailBoxSystemDropDown */ 100),
				__webpack_require__(/*! View:RainLoop:MailBoxFolderList */ 97),
				__webpack_require__(/*! View:RainLoop:MailBoxMessageList */ 98),
				__webpack_require__(/*! View:RainLoop:MailBoxMessageView */ 99)
			]);

			this.oLastRoute = {};
		}

		_.extend(MailBoxScreen.prototype, KnoinAbstractScreen.prototype);

		/**
		 * @type {Object}
		 */
		MailBoxScreen.prototype.oLastRoute = {};

		MailBoxScreen.prototype.setNewTitle  = function ()
		{
			var
				sEmail = Data.accountEmail(),
				nFoldersInboxUnreadCount = Data.foldersInboxUnreadCount()
			;

			__webpack_require__(/*! App:RainLoop */ 4).setTitle(('' === sEmail ? '' :
				(0 < nFoldersInboxUnreadCount ? '(' + nFoldersInboxUnreadCount + ') ' : ' ') + sEmail + ' - ') + Utils.i18n('TITLES/MAILBOX'));
		};

		MailBoxScreen.prototype.onShow = function ()
		{
			this.setNewTitle();
			Globals.keyScope(Enums.KeyState.MessageList);
		};

		/**
		 * @param {string} sFolderHash
		 * @param {number} iPage
		 * @param {string} sSearch
		 * @param {boolean=} bPreview = false
		 */
		MailBoxScreen.prototype.onRoute = function (sFolderHash, iPage, sSearch, bPreview)
		{
			if (Utils.isUnd(bPreview) ? false : !!bPreview)
			{
				if (Enums.Layout.NoPreview === Data.layout() && !Data.message())
				{
					__webpack_require__(/*! App:RainLoop */ 4).historyBack();
				}
			}
			else
			{
				var
					sFolderFullNameRaw = Cache.getFolderFullNameRaw(sFolderHash),
					oFolder = Cache.getFolderFromCacheList(sFolderFullNameRaw)
				;

				if (oFolder)
				{
					Data
						.currentFolder(oFolder)
						.messageListPage(iPage)
						.messageListSearch(sSearch)
					;

					if (Enums.Layout.NoPreview === Data.layout() && Data.message())
					{
						Data.message(null);
					}

					__webpack_require__(/*! App:RainLoop */ 4).reloadMessageList();
				}
			}
		};

		MailBoxScreen.prototype.onStart = function ()
		{
			var
				fResizeFunction = function () {
					Utils.windowResize();
				}
			;

			if (Settings.capa(Enums.Capa.AdditionalAccounts) || Settings.capa(Enums.Capa.AdditionalIdentities))
			{
				__webpack_require__(/*! App:RainLoop */ 4).accountsAndIdentities();
			}

			_.delay(function () {
				if ('INBOX' !== Data.currentFolderFullNameRaw())
				{
					__webpack_require__(/*! App:RainLoop */ 4).folderInformation('INBOX');
				}
			}, 1000);

			_.delay(function () {
				__webpack_require__(/*! App:RainLoop */ 4).quota();
			}, 5000);

			_.delay(function () {
				Remote.appDelayStart(Utils.emptyFunction);
			}, 35000);

			Globals.$html.toggleClass('rl-no-preview-pane', Enums.Layout.NoPreview === Data.layout());

			Data.folderList.subscribe(fResizeFunction);
			Data.messageList.subscribe(fResizeFunction);
			Data.message.subscribe(fResizeFunction);

			Data.layout.subscribe(function (nValue) {
				Globals.$html.toggleClass('rl-no-preview-pane', Enums.Layout.NoPreview === nValue);
			});

			Events.sub('mailbox.inbox-unread-count', function (nCount) {
				Data.foldersInboxUnreadCount(nCount);
			});

			Data.foldersInboxUnreadCount.subscribe(function () {
				this.setNewTitle();
			}, this);
		};

		/**
		 * @return {Array}
		 */
		MailBoxScreen.prototype.routes = function ()
		{
			var
				fNormP = function () {
					return ['Inbox', 1, '', true];
				},
				fNormS = function (oRequest, oVals) {
					oVals[0] = Utils.pString(oVals[0]);
					oVals[1] = Utils.pInt(oVals[1]);
					oVals[1] = 0 >= oVals[1] ? 1 : oVals[1];
					oVals[2] = Utils.pString(oVals[2]);

					if ('' === oRequest)
					{
						oVals[0] = 'Inbox';
						oVals[1] = 1;
					}

					return [decodeURI(oVals[0]), oVals[1], decodeURI(oVals[2]), false];
				},
				fNormD = function (oRequest, oVals) {
					oVals[0] = Utils.pString(oVals[0]);
					oVals[1] = Utils.pString(oVals[1]);

					if ('' === oRequest)
					{
						oVals[0] = 'Inbox';
					}

					return [decodeURI(oVals[0]), 1, decodeURI(oVals[1]), false];
				}
			;

			return [
				[/^([a-zA-Z0-9]+)\/p([1-9][0-9]*)\/(.+)\/?$/, {'normalize_': fNormS}],
				[/^([a-zA-Z0-9]+)\/p([1-9][0-9]*)$/, {'normalize_': fNormS}],
				[/^([a-zA-Z0-9]+)\/(.+)\/?$/, {'normalize_': fNormD}],
				[/^message-preview$/,  {'normalize_': fNormP}],
				[/^([^\/]*)$/,  {'normalize_': fNormS}]
			];
		};

		module.exports = MailBoxScreen;

	}());

/***/ },
/* 66 */
/*!***************************************!*\
  !*** ./dev/Screens/SettingsScreen.js ***!
  \***************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Globals = __webpack_require__(/*! Common/Globals */ 7),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),

			kn = __webpack_require__(/*! App:Knoin */ 5),

			AbstractSettingsScreen = __webpack_require__(/*! Screen:AbstractSettings */ 29)
		;

		/**
		 * @constructor
		 * @extends AbstractSettingsScreen
		 */
		function SettingsScreen()
		{
			AbstractSettingsScreen.call(this, [
				__webpack_require__(/*! View:RainLoop:SettingsSystemDropDown */ 114),
				__webpack_require__(/*! View:RainLoop:SettingsMenu */ 112),
				__webpack_require__(/*! View:RainLoop:SettingsPane */ 113)
			]);

			Utils.initOnStartOrLangChange(function () {
				this.sSettingsTitle = Utils.i18n('TITLES/SETTINGS');
			}, this, function () {
				this.setSettingsTitle();
			});
		}

		_.extend(SettingsScreen.prototype, AbstractSettingsScreen.prototype);

		/**
		 * @param {Function=} fCallback
		 */
		SettingsScreen.prototype.setupSettings = function (fCallback)
		{
			kn.addSettingsViewModel(__webpack_require__(/*! Settings:RainLoop:General */ 83),
				'SettingsGeneral', 'SETTINGS_LABELS/LABEL_GENERAL_NAME', 'general', true);

			if (Settings.settingsGet('ContactsIsAllowed'))
			{
				kn.addSettingsViewModel(__webpack_require__(/*! Settings:RainLoop:Contacts */ 80),
					'SettingsContacts', 'SETTINGS_LABELS/LABEL_CONTACTS_NAME', 'contacts');
			}

			if (Settings.capa(Enums.Capa.AdditionalAccounts))
			{
				kn.addSettingsViewModel(__webpack_require__(/*! Settings:RainLoop:Accounts */ 78),
					'SettingsAccounts', 'SETTINGS_LABELS/LABEL_ACCOUNTS_NAME', 'accounts');
			}

			if (Settings.capa(Enums.Capa.AdditionalIdentities))
			{
				kn.addSettingsViewModel(__webpack_require__(/*! Settings:RainLoop:Identities */ 84),
					'SettingsIdentities', 'SETTINGS_LABELS/LABEL_IDENTITIES_NAME', 'identities');
			}
			else
			{
				kn.addSettingsViewModel(__webpack_require__(/*! Settings:RainLoop:Identity */ 85),
					'SettingsIdentity', 'SETTINGS_LABELS/LABEL_IDENTITY_NAME', 'identity');
			}

			if (Settings.capa(Enums.Capa.Filters))
			{
				kn.addSettingsViewModel(__webpack_require__(/*! Settings:RainLoop:Filters */ 81),
					'SettingsFilters', 'SETTINGS_LABELS/LABEL_FILTERS_NAME', 'filters');
			}

			if (Settings.capa(Enums.Capa.TwoFactor))
			{
				kn.addSettingsViewModel(__webpack_require__(/*! Settings:RainLoop:Security */ 87),
					'SettingsSecurity', 'SETTINGS_LABELS/LABEL_SECURITY_NAME', 'security');
			}

			if (Settings.settingsGet('AllowGoogleSocial') ||
				Settings.settingsGet('AllowFacebookSocial') ||
				Settings.settingsGet('AllowTwitterSocial'))
			{
				kn.addSettingsViewModel(__webpack_require__(/*! Settings:RainLoop:Social */ 88),
					'SettingsSocial', 'SETTINGS_LABELS/LABEL_SOCIAL_NAME', 'social');
			}

			if (Settings.settingsGet('ChangePasswordIsAllowed'))
			{
				kn.addSettingsViewModel(__webpack_require__(/*! Settings:RainLoop:ChangePassword */ 79),
					'SettingsChangePassword', 'SETTINGS_LABELS/LABEL_CHANGE_PASSWORD_NAME', 'change-password');
			}

			kn.addSettingsViewModel(__webpack_require__(/*! Settings:RainLoop:Folders */ 82),
				'SettingsFolders', 'SETTINGS_LABELS/LABEL_FOLDERS_NAME', 'folders');

			if (Settings.capa(Enums.Capa.Themes))
			{
				kn.addSettingsViewModel(__webpack_require__(/*! Settings:RainLoop:Themes */ 89),
					'SettingsThemes', 'SETTINGS_LABELS/LABEL_THEMES_NAME', 'themes');
			}

			if (Settings.capa(Enums.Capa.OpenPGP))
			{
				kn.addSettingsViewModel(__webpack_require__(/*! Settings:RainLoop:OpenPGP */ 86),
					'SettingsOpenPGP', 'SETTINGS_LABELS/LABEL_OPEN_PGP_NAME', 'openpgp');
			}

			if (fCallback)
			{
				fCallback();
			}
		};

		SettingsScreen.prototype.onShow = function ()
		{
			this.setSettingsTitle();
			Globals.keyScope(Enums.KeyState.Settings);
		};

		SettingsScreen.prototype.setSettingsTitle = function ()
		{
			__webpack_require__(/*! App:RainLoop */ 4).setTitle(this.sSettingsTitle);
		};

		module.exports = SettingsScreen;

	}());

/***/ },
/* 67 */,
/* 68 */,
/* 69 */,
/* 70 */,
/* 71 */,
/* 72 */,
/* 73 */,
/* 74 */,
/* 75 */,
/* 76 */,
/* 77 */,
/* 78 */
/*!**********************************************!*\
  !*** ./dev/Settings/App/SettingsAccounts.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13)
		;

		/**
		 * @constructor
		 */
		function SettingsAccounts()
		{
			this.accounts = Data.accounts;

			this.processText = ko.computed(function () {
				return Data.accountsLoading() ? Utils.i18n('SETTINGS_ACCOUNTS/LOADING_PROCESS') : '';
			}, this);

			this.visibility = ko.computed(function () {
				return '' === this.processText() ? 'hidden' : 'visible';
			}, this);

			this.accountForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
				function (oPrev) {
					if (oPrev)
					{
						oPrev.deleteAccess(false);
					}
				}, function (oNext) {
					if (oNext)
					{
						oNext.deleteAccess(true);
					}
				}
			]});
		}

		SettingsAccounts.prototype.addNewAccount = function ()
		{
			__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(__webpack_require__(/*! View:Popup:AddAccount */ 42));
		};

		/**
		 * @param {AccountModel} oAccountToRemove
		 */
		SettingsAccounts.prototype.deleteAccount = function (oAccountToRemove)
		{
			if (oAccountToRemove && oAccountToRemove.deleteAccess())
			{
				this.accountForDeletion(null);

				var
					kn = __webpack_require__(/*! App:Knoin */ 5),
					fRemoveAccount = function (oAccount) {
						return oAccountToRemove === oAccount;
					}
				;

				if (oAccountToRemove)
				{
					this.accounts.remove(fRemoveAccount);

					Remote.accountDelete(function (sResult, oData) {

						if (Enums.StorageResultType.Success === sResult && oData &&
							oData.Result && oData.Reload)
						{
							kn.routeOff();
							kn.setHash(LinkBuilder.root(), true);
							kn.routeOff();

							_.defer(function () {
								window.location.reload();
							});
						}
						else
						{
							__webpack_require__(/*! App:RainLoop */ 4).accountsAndIdentities();
						}

					}, oAccountToRemove.email);
				}
			}
		};

		module.exports = SettingsAccounts;

	}());

/***/ },
/* 79 */
/*!****************************************************!*\
  !*** ./dev/Settings/App/SettingsChangePassword.js ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13)
		;

		/**
		 * @constructor
		 */
		function SettingsChangePassword()
		{
			this.changeProcess = ko.observable(false);

			this.errorDescription = ko.observable('');
			this.passwordMismatch = ko.observable(false);
			this.passwordUpdateError = ko.observable(false);
			this.passwordUpdateSuccess = ko.observable(false);

			this.currentPassword = ko.observable('');
			this.currentPassword.error = ko.observable(false);
			this.newPassword = ko.observable('');
			this.newPassword2 = ko.observable('');

			this.currentPassword.subscribe(function () {
				this.passwordUpdateError(false);
				this.passwordUpdateSuccess(false);
				this.currentPassword.error(false);
			}, this);

			this.newPassword.subscribe(function () {
				this.passwordUpdateError(false);
				this.passwordUpdateSuccess(false);
				this.passwordMismatch(false);
			}, this);

			this.newPassword2.subscribe(function () {
				this.passwordUpdateError(false);
				this.passwordUpdateSuccess(false);
				this.passwordMismatch(false);
			}, this);

			this.saveNewPasswordCommand = Utils.createCommand(this, function () {

				if (this.newPassword() !== this.newPassword2())
				{
					this.passwordMismatch(true);
					this.errorDescription(Utils.i18n('SETTINGS_CHANGE_PASSWORD/ERROR_PASSWORD_MISMATCH'));
				}
				else
				{
					this.changeProcess(true);

					this.passwordUpdateError(false);
					this.passwordUpdateSuccess(false);
					this.currentPassword.error(false);
					this.passwordMismatch(false);
					this.errorDescription('');

					Remote.changePassword(this.onChangePasswordResponse, this.currentPassword(), this.newPassword());
				}

			}, function () {
				return !this.changeProcess() && '' !== this.currentPassword() &&
					'' !== this.newPassword() && '' !== this.newPassword2();
			});

			this.onChangePasswordResponse = _.bind(this.onChangePasswordResponse, this);
		}

		SettingsChangePassword.prototype.onHide = function ()
		{
			this.changeProcess(false);
			this.currentPassword('');
			this.newPassword('');
			this.newPassword2('');
			this.errorDescription('');
			this.passwordMismatch(false);
			this.currentPassword.error(false);
		};

		SettingsChangePassword.prototype.onChangePasswordResponse = function (sResult, oData)
		{
			this.changeProcess(false);
			this.passwordMismatch(false);
			this.errorDescription('');
			this.currentPassword.error(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				this.currentPassword('');
				this.newPassword('');
				this.newPassword2('');

				this.passwordUpdateSuccess(true);
				this.currentPassword.error(false);
			}
			else
			{
				if (oData && Enums.Notification.CurrentPasswordIncorrect === oData.ErrorCode)
				{
					this.currentPassword.error(true);
				}

				this.passwordUpdateError(true);
				this.errorDescription(oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) :
					Utils.getNotification(Enums.Notification.CouldNotSaveNewPassword));
			}
		};

		module.exports = SettingsChangePassword;

	}());

/***/ },
/* 80 */
/*!**********************************************!*\
  !*** ./dev/Settings/App/SettingsContacts.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),

			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),
			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8)
		;

		/**
		 * @constructor
		 */
		function SettingsContacts()
		{
			this.contactsAutosave = Data.contactsAutosave;

			this.allowContactsSync = Data.allowContactsSync;
			this.enableContactsSync = Data.enableContactsSync;
			this.contactsSyncUrl = Data.contactsSyncUrl;
			this.contactsSyncUser = Data.contactsSyncUser;
			this.contactsSyncPass = Data.contactsSyncPass;

			this.saveTrigger = ko.computed(function () {
				return [
					this.enableContactsSync() ? '1' : '0',
					this.contactsSyncUrl(),
					this.contactsSyncUser(),
					this.contactsSyncPass()
				].join('|');
			}, this).extend({'throttle': 500});

			this.saveTrigger.subscribe(function () {
				Remote.saveContactsSyncData(null,
					this.enableContactsSync(),
					this.contactsSyncUrl(),
					this.contactsSyncUser(),
					this.contactsSyncPass()
				);
			}, this);
		}

		SettingsContacts.prototype.onBuild = function ()
		{
			Data.contactsAutosave.subscribe(function (bValue) {
				Remote.saveSettings(Utils.emptyFunction, {
					'ContactsAutosave': bValue ? '1' : '0'
				});
			});
		};

		module.exports = SettingsContacts;

	}());

/***/ },
/* 81 */
/*!*********************************************!*\
  !*** ./dev/Settings/App/SettingsFilters.js ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),

			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @constructor
		 */
		function SettingsFilters()
		{
			this.filters = ko.observableArray([]);
			this.filters.loading = ko.observable(false);

			this.filters.subscribe(function () {
				Utils.windowResize();
			});
		}

		SettingsFilters.prototype.deleteFilter = function (oFilter)
		{
			this.filters.remove(oFilter);
		};

		SettingsFilters.prototype.addFilter = function ()
		{
			var
				FilterModel = __webpack_require__(/*! Model:Filter */ 57)
			;

			__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(
				__webpack_require__(/*! View:Popup:Filter */ 106), [new FilterModel()]);
		};

		module.exports = SettingsFilters;

	}());

/***/ },
/* 82 */
/*!*********************************************!*\
  !*** ./dev/Settings/App/SettingsFolders.js ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Cache = __webpack_require__(/*! Storage:RainLoop:Cache */ 20),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),
			LocalStorage = __webpack_require__(/*! Storage:LocalStorage */ 30)
		;

		/**
		 * @constructor
		 */
		function SettingsFolders()
		{
			this.foldersListError = Data.foldersListError;
			this.folderList = Data.folderList;

			this.processText = ko.computed(function () {

				var
					bLoading = Data.foldersLoading(),
					bCreating = Data.foldersCreating(),
					bDeleting = Data.foldersDeleting(),
					bRenaming = Data.foldersRenaming()
				;

				if (bCreating)
				{
					return Utils.i18n('SETTINGS_FOLDERS/CREATING_PROCESS');
				}
				else if (bDeleting)
				{
					return Utils.i18n('SETTINGS_FOLDERS/DELETING_PROCESS');
				}
				else if (bRenaming)
				{
					return Utils.i18n('SETTINGS_FOLDERS/RENAMING_PROCESS');
				}
				else if (bLoading)
				{
					return Utils.i18n('SETTINGS_FOLDERS/LOADING_PROCESS');
				}

				return '';

			}, this);

			this.visibility = ko.computed(function () {
				return '' === this.processText() ? 'hidden' : 'visible';
			}, this);

			this.folderForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
				function (oPrev) {
					if (oPrev)
					{
						oPrev.deleteAccess(false);
					}
				}, function (oNext) {
					if (oNext)
					{
						oNext.deleteAccess(true);
					}
				}
			]});

			this.folderForEdit = ko.observable(null).extend({'toggleSubscribe': [this,
				function (oPrev) {
					if (oPrev)
					{
						oPrev.edited(false);
					}
				}, function (oNext) {
					if (oNext && oNext.canBeEdited())
					{
						oNext.edited(true);
					}
				}
			]});

			this.useImapSubscribe = !!Settings.settingsGet('UseImapSubscribe');
		}

		SettingsFolders.prototype.folderEditOnEnter = function (oFolder)
		{
			var
				sEditName = oFolder ? Utils.trim(oFolder.nameForEdit()) : ''
			;

			if ('' !== sEditName && oFolder.name() !== sEditName)
			{
				LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, '');

				Data.foldersRenaming(true);
				Remote.folderRename(function (sResult, oData) {

					Data.foldersRenaming(false);
					if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
					{
						Data.foldersListError(
							oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_RENAME_FOLDER'));
					}

					__webpack_require__(/*! App:RainLoop */ 4).folders();

				}, oFolder.fullNameRaw, sEditName);

				Cache.removeFolderFromCacheList(oFolder.fullNameRaw);

				oFolder.name(sEditName);
			}

			oFolder.edited(false);
		};

		SettingsFolders.prototype.folderEditOnEsc = function (oFolder)
		{
			if (oFolder)
			{
				oFolder.edited(false);
			}
		};

		SettingsFolders.prototype.onShow = function ()
		{
			Data.foldersListError('');
		};

		SettingsFolders.prototype.createFolder = function ()
		{
			__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(__webpack_require__(/*! View:Popup:FolderCreate */ 44));
		};

		SettingsFolders.prototype.systemFolder = function ()
		{
			__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(__webpack_require__(/*! View:Popup:FolderSystem */ 27));
		};

		SettingsFolders.prototype.deleteFolder = function (oFolderToRemove)
		{
			if (oFolderToRemove && oFolderToRemove.canBeDeleted() && oFolderToRemove.deleteAccess() &&
				0 === oFolderToRemove.privateMessageCountAll())
			{
				this.folderForDeletion(null);

				var
					fRemoveFolder = function (oFolder) {

						if (oFolderToRemove === oFolder)
						{
							return true;
						}

						oFolder.subFolders.remove(fRemoveFolder);
						return false;
					}
				;

				if (oFolderToRemove)
				{
					LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, '');

					Data.folderList.remove(fRemoveFolder);

					Data.foldersDeleting(true);
					Remote.folderDelete(function (sResult, oData) {

						Data.foldersDeleting(false);
						if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
						{
							Data.foldersListError(
								oData && oData.ErrorCode ? Utils.getNotification(oData.ErrorCode) : Utils.i18n('NOTIFICATIONS/CANT_DELETE_FOLDER'));
						}

						__webpack_require__(/*! App:RainLoop */ 4).folders();

					}, oFolderToRemove.fullNameRaw);

					Cache.removeFolderFromCacheList(oFolderToRemove.fullNameRaw);
				}
			}
			else if (0 < oFolderToRemove.privateMessageCountAll())
			{
				Data.foldersListError(Utils.getNotification(Enums.Notification.CantDeleteNonEmptyFolder));
			}
		};

		SettingsFolders.prototype.subscribeFolder = function (oFolder)
		{
			LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, '');
			Remote.folderSetSubscribe(Utils.emptyFunction, oFolder.fullNameRaw, true);

			oFolder.subScribed(true);
		};

		SettingsFolders.prototype.unSubscribeFolder = function (oFolder)
		{
			LocalStorage.set(Enums.ClientSideKeyName.FoldersLashHash, '');
			Remote.folderSetSubscribe(Utils.emptyFunction, oFolder.fullNameRaw, false);

			oFolder.subScribed(false);
		};

		module.exports = SettingsFolders;

	}());

/***/ },
/* 83 */
/*!*********************************************!*\
  !*** ./dev/Settings/App/SettingsGeneral.js ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13)
		;

		/**
		 * @constructor
		 */
		function SettingsGeneral()
		{
			this.mainLanguage = Data.mainLanguage;
			this.mainMessagesPerPage = Data.mainMessagesPerPage;
			this.mainMessagesPerPageArray = Consts.Defaults.MessagesPerPageArray;
			this.editorDefaultType = Data.editorDefaultType;
			this.showImages = Data.showImages;
			this.interfaceAnimation = Data.interfaceAnimation;
			this.useDesktopNotifications = Data.useDesktopNotifications;
			this.threading = Data.threading;
			this.useThreads = Data.useThreads;
			this.replySameFolder = Data.replySameFolder;
			this.layout = Data.layout;
			this.usePreviewPane = Data.usePreviewPane;
			this.useCheckboxesInList = Data.useCheckboxesInList;
			this.allowLanguagesOnSettings = Data.allowLanguagesOnSettings;

			this.isDesktopNotificationsSupported = ko.computed(function () {
				return Enums.DesktopNotifications.NotSupported !== Data.desktopNotificationsPermisions();
			});

			this.isDesktopNotificationsDenied = ko.computed(function () {
				return Enums.DesktopNotifications.NotSupported === Data.desktopNotificationsPermisions() ||
					Enums.DesktopNotifications.Denied === Data.desktopNotificationsPermisions();
			});

			this.mainLanguageFullName = ko.computed(function () {
				return Utils.convertLangName(this.mainLanguage());
			}, this);

			this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle).extend({'throttle': 100});
			this.mppTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

			this.isAnimationSupported = Globals.bAnimationSupported;
		}

		SettingsGeneral.prototype.toggleLayout = function ()
		{
			this.layout(Enums.Layout.NoPreview === this.layout() ? Enums.Layout.SidePreview : Enums.Layout.NoPreview);
		};

		SettingsGeneral.prototype.onBuild = function ()
		{
			var self = this;

			_.delay(function () {

				var
					f1 = Utils.settingsSaveHelperSimpleFunction(self.mppTrigger, self)
				;

				Data.language.subscribe(function (sValue) {

					self.languageTrigger(Enums.SaveSettingsStep.Animate);

					$.ajax({
						'url': LinkBuilder.langLink(sValue),
						'dataType': 'script',
						'cache': true
					}).done(function() {
						Utils.i18nReload();
						self.languageTrigger(Enums.SaveSettingsStep.TrueResult);
					}).fail(function() {
						self.languageTrigger(Enums.SaveSettingsStep.FalseResult);
					}).always(function() {
						_.delay(function () {
							self.languageTrigger(Enums.SaveSettingsStep.Idle);
						}, 1000);
					});

					Remote.saveSettings(Utils.emptyFunction, {
						'Language': sValue
					});
				});

				Data.editorDefaultType.subscribe(function (sValue) {
					Remote.saveSettings(Utils.emptyFunction, {
						'EditorDefaultType': sValue
					});
				});

				Data.messagesPerPage.subscribe(function (iValue) {
					Remote.saveSettings(f1, {
						'MPP': iValue
					});
				});

				Data.showImages.subscribe(function (bValue) {
					Remote.saveSettings(Utils.emptyFunction, {
						'ShowImages': bValue ? '1' : '0'
					});
				});

				Data.interfaceAnimation.subscribe(function (sValue) {
					Remote.saveSettings(Utils.emptyFunction, {
						'InterfaceAnimation': sValue
					});
				});

				Data.useDesktopNotifications.subscribe(function (bValue) {
					Utils.timeOutAction('SaveDesktopNotifications', function () {
						Remote.saveSettings(Utils.emptyFunction, {
							'DesktopNotifications': bValue ? '1' : '0'
						});
					}, 3000);
				});

				Data.replySameFolder.subscribe(function (bValue) {
					Utils.timeOutAction('SaveReplySameFolder', function () {
						Remote.saveSettings(Utils.emptyFunction, {
							'ReplySameFolder': bValue ? '1' : '0'
						});
					}, 3000);
				});

				Data.useThreads.subscribe(function (bValue) {

					Data.messageList([]);

					Remote.saveSettings(Utils.emptyFunction, {
						'UseThreads': bValue ? '1' : '0'
					});
				});

				Data.layout.subscribe(function (nValue) {

					Data.messageList([]);

					Remote.saveSettings(Utils.emptyFunction, {
						'Layout': nValue
					});
				});

				Data.useCheckboxesInList.subscribe(function (bValue) {
					Remote.saveSettings(Utils.emptyFunction, {
						'UseCheckboxesInList': bValue ? '1' : '0'
					});
				});

			}, 50);
		};

		SettingsGeneral.prototype.onShow = function ()
		{
			Data.desktopNotifications.valueHasMutated();
		};

		SettingsGeneral.prototype.selectLanguage = function ()
		{
			__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(__webpack_require__(/*! View:Popup:Languages */ 32));
		};

		module.exports = SettingsGeneral;

	}());

/***/ },
/* 84 */
/*!************************************************!*\
  !*** ./dev/Settings/App/SettingsIdentities.js ***!
  \************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			HtmlEditor = __webpack_require__(/*! Common/HtmlEditor */ 28),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13)
		;

		/**
		 * @constructor
		 */
		function SettingsIdentities()
		{
			this.editor = null;
			this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

			this.accountEmail = Data.accountEmail;
			this.displayName = Data.displayName;
			this.signature = Data.signature;
			this.signatureToAll = Data.signatureToAll;
			this.replyTo = Data.replyTo;

			this.signatureDom = ko.observable(null);

			this.defaultIdentityIDTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
			this.displayNameTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
			this.replyTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
			this.signatureTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

			this.identities = Data.identities;
			this.defaultIdentityID = Data.defaultIdentityID;

			this.identitiesOptions = ko.computed(function () {

				var
					aList = this.identities(),
					aResult = []
				;

				if (0 < aList.length)
				{
					aResult.push({
						'id': this.accountEmail.peek(),
						'name': this.formattedAccountIdentity(),
						'seporator': false
					});

					aResult.push({
						'id': '---',
						'name': '---',
						'seporator': true,
						'disabled': true
					});

					_.each(aList, function (oItem) {
						aResult.push({
							'id': oItem.id,
							'name': oItem.formattedNameForEmail(),
							'seporator': false
						});
					});
				}

				return aResult;
			}, this);

			this.processText = ko.computed(function () {
				return Data.identitiesLoading() ? Utils.i18n('SETTINGS_IDENTITIES/LOADING_PROCESS') : '';
			}, this);

			this.visibility = ko.computed(function () {
				return '' === this.processText() ? 'hidden' : 'visible';
			}, this);

			this.identityForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
				function (oPrev) {
					if (oPrev)
					{
						oPrev.deleteAccess(false);
					}
				}, function (oNext) {
					if (oNext)
					{
						oNext.deleteAccess(true);
					}
				}
			]});
		}

		/**
		 *
		 * @return {string}
		 */
		SettingsIdentities.prototype.formattedAccountIdentity = function ()
		{
			var
				sDisplayName = this.displayName.peek(),
				sEmail = this.accountEmail.peek()
			;

			return '' === sDisplayName ? sEmail : '"' + Utils.quoteName(sDisplayName) + '" <' + sEmail + '>';
		};

		SettingsIdentities.prototype.addNewIdentity = function ()
		{
			__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(__webpack_require__(/*! View:Popup:Identity */ 45));
		};

		SettingsIdentities.prototype.editIdentity = function (oIdentity)
		{
			__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(__webpack_require__(/*! View:Popup:Identity */ 45), [oIdentity]);
		};

		/**
		 * @param {IdentityModel} oIdentityToRemove
		 */
		SettingsIdentities.prototype.deleteIdentity = function (oIdentityToRemove)
		{
			if (oIdentityToRemove && oIdentityToRemove.deleteAccess())
			{
				this.identityForDeletion(null);

				var
					fRemoveFolder = function (oIdentity) {
						return oIdentityToRemove === oIdentity;
					}
				;

				if (oIdentityToRemove)
				{
					this.identities.remove(fRemoveFolder);

					Remote.identityDelete(function () {
						__webpack_require__(/*! App:RainLoop */ 4).accountsAndIdentities();
					}, oIdentityToRemove.id);
				}
			}
		};

		SettingsIdentities.prototype.onFocus = function ()
		{
			if (!this.editor && this.signatureDom())
			{
				var
					self = this,
					sSignature = Data.signature()
				;

				this.editor = new HtmlEditor(self.signatureDom(), function () {
					Data.signature(
						(self.editor.isHtml() ? ':HTML:' : '') + self.editor.getData()
					);
				}, function () {
					if (':HTML:' === sSignature.substr(0, 6))
					{
						self.editor.setHtml(sSignature.substr(6), false);
					}
					else
					{
						self.editor.setPlain(sSignature, false);
					}
				});
			}
		};

		SettingsIdentities.prototype.onBuild = function (oDom)
		{
			var self = this;

			oDom
				.on('click', '.identity-item .e-action', function () {
					var oIdentityItem = ko.dataFor(this);
					if (oIdentityItem)
					{
						self.editIdentity(oIdentityItem);
					}
				})
			;

			_.delay(function () {

				var
					f1 = Utils.settingsSaveHelperSimpleFunction(self.displayNameTrigger, self),
					f2 = Utils.settingsSaveHelperSimpleFunction(self.replyTrigger, self),
					f3 = Utils.settingsSaveHelperSimpleFunction(self.signatureTrigger, self),
					f4 = Utils.settingsSaveHelperSimpleFunction(self.defaultIdentityIDTrigger, self)
				;

				Data.defaultIdentityID.subscribe(function (sValue) {
					Remote.saveSettings(f4, {
						'DefaultIdentityID': sValue
					});
				});

				Data.displayName.subscribe(function (sValue) {
					Remote.saveSettings(f1, {
						'DisplayName': sValue
					});
				});

				Data.replyTo.subscribe(function (sValue) {
					Remote.saveSettings(f2, {
						'ReplyTo': sValue
					});
				});

				Data.signature.subscribe(function (sValue) {
					Remote.saveSettings(f3, {
						'Signature': sValue
					});
				});

				Data.signatureToAll.subscribe(function (bValue) {
					Remote.saveSettings(null, {
						'SignatureToAll': bValue ? '1' : '0'
					});
				});

			}, 50);
		};

		module.exports = SettingsIdentities;

	}());

/***/ },
/* 85 */
/*!**********************************************!*\
  !*** ./dev/Settings/App/SettingsIdentity.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			HtmlEditor = __webpack_require__(/*! Common/HtmlEditor */ 28),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13)
		;

		/**
		 * @constructor
		 */
		function SettingsIdentity()
		{
			this.editor = null;

			this.displayName = Data.displayName;
			this.signature = Data.signature;
			this.signatureToAll = Data.signatureToAll;
			this.replyTo = Data.replyTo;

			this.signatureDom = ko.observable(null);

			this.displayNameTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
			this.replyTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
			this.signatureTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		}

		SettingsIdentity.prototype.onFocus = function ()
		{
			if (!this.editor && this.signatureDom())
			{
				var
					self = this,
					sSignature = Data.signature()
				;

				this.editor = new HtmlEditor(self.signatureDom(), function () {
					Data.signature(
						(self.editor.isHtml() ? ':HTML:' : '') + self.editor.getData()
					);
				}, function () {
					if (':HTML:' === sSignature.substr(0, 6))
					{
						self.editor.setHtml(sSignature.substr(6), false);
					}
					else
					{
						self.editor.setPlain(sSignature, false);
					}
				});
			}
		};

		SettingsIdentity.prototype.onBuild = function ()
		{
			var self = this;
			_.delay(function () {

				var
					f1 = Utils.settingsSaveHelperSimpleFunction(self.displayNameTrigger, self),
					f2 = Utils.settingsSaveHelperSimpleFunction(self.replyTrigger, self),
					f3 = Utils.settingsSaveHelperSimpleFunction(self.signatureTrigger, self)
				;

				Data.displayName.subscribe(function (sValue) {
					Remote.saveSettings(f1, {
						'DisplayName': sValue
					});
				});

				Data.replyTo.subscribe(function (sValue) {
					Remote.saveSettings(f2, {
						'ReplyTo': sValue
					});
				});

				Data.signature.subscribe(function (sValue) {
					Remote.saveSettings(f3, {
						'Signature': sValue
					});
				});

				Data.signatureToAll.subscribe(function (bValue) {
					Remote.saveSettings(null, {
						'SignatureToAll': bValue ? '1' : '0'
					});
				});

			}, 50);
		};

		module.exports = SettingsIdentity;

	}());

/***/ },
/* 86 */
/*!*********************************************!*\
  !*** ./dev/Settings/App/SettingsOpenPGP.js ***!
  \*********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),

			kn = __webpack_require__(/*! App:Knoin */ 5),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8)
		;

		/**
		 * @constructor
		 */
		function SettingsOpenPGP()
		{
			this.openpgpkeys = Data.openpgpkeys;
			this.openpgpkeysPublic = Data.openpgpkeysPublic;
			this.openpgpkeysPrivate = Data.openpgpkeysPrivate;

			this.openPgpKeyForDeletion = ko.observable(null).extend({'falseTimeout': 3000}).extend({'toggleSubscribe': [this,
				function (oPrev) {
					if (oPrev)
					{
						oPrev.deleteAccess(false);
					}
				}, function (oNext) {
					if (oNext)
					{
						oNext.deleteAccess(true);
					}
				}
			]});
		}

		SettingsOpenPGP.prototype.addOpenPgpKey = function ()
		{
			kn.showScreenPopup(__webpack_require__(/*! View:Popup:AddOpenPgpKey */ 102));
		};

		SettingsOpenPGP.prototype.generateOpenPgpKey = function ()
		{
			kn.showScreenPopup(__webpack_require__(/*! View:Popup:NewOpenPgpKey */ 108));
		};

		SettingsOpenPGP.prototype.viewOpenPgpKey = function (oOpenPgpKey)
		{
			if (oOpenPgpKey)
			{
				kn.showScreenPopup(__webpack_require__(/*! View:Popup:ViewOpenPgpKey */ 111), [oOpenPgpKey]);
			}
		};

		/**
		 * @param {OpenPgpKeyModel} oOpenPgpKeyToRemove
		 */
		SettingsOpenPGP.prototype.deleteOpenPgpKey = function (oOpenPgpKeyToRemove)
		{
			if (oOpenPgpKeyToRemove && oOpenPgpKeyToRemove.deleteAccess())
			{
				this.openPgpKeyForDeletion(null);

				if (oOpenPgpKeyToRemove && Data.openpgpKeyring)
				{
					this.openpgpkeys.remove(function (oOpenPgpKey) {
						return oOpenPgpKeyToRemove === oOpenPgpKey;
					});

					Data.openpgpKeyring[oOpenPgpKeyToRemove.isPrivate ? 'privateKeys' : 'publicKeys']
						.removeForId(oOpenPgpKeyToRemove.guid);

					Data.openpgpKeyring.store();

					__webpack_require__(/*! App:RainLoop */ 4).reloadOpenPgpKeys();
				}
			}
		};

		module.exports = SettingsOpenPGP;

	}());

/***/ },
/* 87 */
/*!**********************************************!*\
  !*** ./dev/Settings/App/SettingsSecurity.js ***!
  \**********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13)
		;

		/**
		 * @constructor
		 */
		function SettingsSecurity()
		{
			this.processing = ko.observable(false);
			this.clearing = ko.observable(false);
			this.secreting = ko.observable(false);

			this.viewUser = ko.observable('');
			this.viewEnable = ko.observable(false);
			this.viewEnable.subs = true;
			this.twoFactorStatus = ko.observable(false);

			this.viewSecret = ko.observable('');
			this.viewBackupCodes = ko.observable('');
			this.viewUrl = ko.observable('');

			this.bFirst = true;

			this.viewTwoFactorStatus = ko.computed(function () {
				Globals.langChangeTrigger();
				return Utils.i18n(
					this.twoFactorStatus() ?
						'SETTINGS_SECURITY/TWO_FACTOR_SECRET_CONFIGURED_DESC' :
						'SETTINGS_SECURITY/TWO_FACTOR_SECRET_NOT_CONFIGURED_DESC'
				);
			}, this);

			this.onResult = _.bind(this.onResult, this);
			this.onSecretResult = _.bind(this.onSecretResult, this);
		}

		SettingsSecurity.prototype.showSecret = function ()
		{
			this.secreting(true);
			Remote.showTwoFactorSecret(this.onSecretResult);
		};

		SettingsSecurity.prototype.hideSecret = function ()
		{
			this.viewSecret('');
			this.viewBackupCodes('');
			this.viewUrl('');
		};

		SettingsSecurity.prototype.createTwoFactor = function ()
		{
			this.processing(true);
			Remote.createTwoFactor(this.onResult);
		};

		SettingsSecurity.prototype.enableTwoFactor = function ()
		{
			this.processing(true);
			Remote.enableTwoFactor(this.onResult, this.viewEnable());
		};

		SettingsSecurity.prototype.testTwoFactor = function ()
		{
			__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(__webpack_require__(/*! View:Popup:TwoFactorTest */ 110));
		};

		SettingsSecurity.prototype.clearTwoFactor = function ()
		{
			this.viewSecret('');
			this.viewBackupCodes('');
			this.viewUrl('');

			this.clearing(true);
			Remote.clearTwoFactor(this.onResult);
		};

		SettingsSecurity.prototype.onShow = function ()
		{
			this.viewSecret('');
			this.viewBackupCodes('');
			this.viewUrl('');
		};

		SettingsSecurity.prototype.onResult = function (sResult, oData)
		{
			this.processing(false);
			this.clearing(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				this.viewUser(Utils.pString(oData.Result.User));
				this.viewEnable(!!oData.Result.Enable);
				this.twoFactorStatus(!!oData.Result.IsSet);

				this.viewSecret(Utils.pString(oData.Result.Secret));
				this.viewBackupCodes(Utils.pString(oData.Result.BackupCodes).replace(/[\s]+/g, '  '));
				this.viewUrl(Utils.pString(oData.Result.Url));
			}
			else
			{
				this.viewUser('');
				this.viewEnable(false);
				this.twoFactorStatus(false);

				this.viewSecret('');
				this.viewBackupCodes('');
				this.viewUrl('');
			}

			if (this.bFirst)
			{
				this.bFirst = false;
				var self = this;
				this.viewEnable.subscribe(function (bValue) {
					if (this.viewEnable.subs)
					{
						Remote.enableTwoFactor(function (sResult, oData) {
							if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
							{
								self.viewEnable.subs = false;
								self.viewEnable(false);
								self.viewEnable.subs = true;
							}
						}, bValue);
					}
				}, this);
			}
		};

		SettingsSecurity.prototype.onSecretResult = function (sResult, oData)
		{
			this.secreting(false);

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				this.viewSecret(Utils.pString(oData.Result.Secret));
				this.viewUrl(Utils.pString(oData.Result.Url));
			}
			else
			{
				this.viewSecret('');
				this.viewUrl('');
			}
		};

		SettingsSecurity.prototype.onBuild = function ()
		{
			this.processing(true);
			Remote.getTwoFactor(this.onResult);
		};

		module.exports = SettingsSecurity;

	}());

/***/ },
/* 88 */
/*!********************************************!*\
  !*** ./dev/Settings/App/SettingsSocial.js ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		/**
		 * @constructor
		 */
		function SettingsSocial()
		{
			var
				Utils = __webpack_require__(/*! Common/Utils */ 1),
				Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8)
			;

			this.googleEnable = Data.googleEnable;

			this.googleActions = Data.googleActions;
			this.googleLoggined = Data.googleLoggined;
			this.googleUserName = Data.googleUserName;

			this.facebookEnable = Data.facebookEnable;

			this.facebookActions = Data.facebookActions;
			this.facebookLoggined = Data.facebookLoggined;
			this.facebookUserName = Data.facebookUserName;

			this.twitterEnable = Data.twitterEnable;

			this.twitterActions = Data.twitterActions;
			this.twitterLoggined = Data.twitterLoggined;
			this.twitterUserName = Data.twitterUserName;

			this.connectGoogle = Utils.createCommand(this, function () {
				if (!this.googleLoggined())
				{
					__webpack_require__(/*! App:RainLoop */ 4).googleConnect();
				}
			}, function () {
				return !this.googleLoggined() && !this.googleActions();
			});

			this.disconnectGoogle = Utils.createCommand(this, function () {
				__webpack_require__(/*! App:RainLoop */ 4).googleDisconnect();
			});

			this.connectFacebook = Utils.createCommand(this, function () {
				if (!this.facebookLoggined())
				{
					__webpack_require__(/*! App:RainLoop */ 4).facebookConnect();
				}
			}, function () {
				return !this.facebookLoggined() && !this.facebookActions();
			});

			this.disconnectFacebook = Utils.createCommand(this, function () {
				__webpack_require__(/*! App:RainLoop */ 4).facebookDisconnect();
			});

			this.connectTwitter = Utils.createCommand(this, function () {
				if (!this.twitterLoggined())
				{
					__webpack_require__(/*! App:RainLoop */ 4).twitterConnect();
				}
			}, function () {
				return !this.twitterLoggined() && !this.twitterActions();
			});

			this.disconnectTwitter = Utils.createCommand(this, function () {
				__webpack_require__(/*! App:RainLoop */ 4).twitterDisconnect();
			});
		}

		module.exports = SettingsSocial;

	}());

/***/ },
/* 89 */
/*!********************************************!*\
  !*** ./dev/Settings/App/SettingsThemes.js ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13)
		;

		/**
		 * @constructor
		 */
		function SettingsThemes()
		{
			var self = this;

			this.mainTheme = Data.mainTheme;
			this.themesObjects = ko.observableArray([]);

			this.themeTrigger = ko.observable(Enums.SaveSettingsStep.Idle).extend({'throttle': 100});

			this.oLastAjax = null;
			this.iTimer = 0;

			Data.theme.subscribe(function (sValue) {

				_.each(this.themesObjects(), function (oTheme) {
					oTheme.selected(sValue === oTheme.name);
				});

				var
					oThemeLink = $('#rlThemeLink'),
					oThemeStyle = $('#rlThemeStyle'),
					sUrl = oThemeLink.attr('href')
				;

				if (!sUrl)
				{
					sUrl = oThemeStyle.attr('data-href');
				}

				if (sUrl)
				{
					sUrl = sUrl.toString().replace(/\/-\/[^\/]+\/\-\//, '/-/' + sValue + '/-/');
					sUrl = sUrl.toString().replace(/\/Css\/[^\/]+\/User\//, '/Css/0/User/');

					if ('Json/' !== sUrl.substring(sUrl.length - 5, sUrl.length))
					{
						sUrl += 'Json/';
					}

					window.clearTimeout(self.iTimer);
					self.themeTrigger(Enums.SaveSettingsStep.Animate);

					if (this.oLastAjax && this.oLastAjax.abort)
					{
						this.oLastAjax.abort();
					}

					this.oLastAjax = $.ajax({
						'url': sUrl,
						'dataType': 'json'
					}).done(function(aData) {

						if (aData && Utils.isArray(aData) && 2 === aData.length)
						{
							if (oThemeLink && oThemeLink[0] && (!oThemeStyle || !oThemeStyle[0]))
							{
								oThemeStyle = $('<style id="rlThemeStyle"></style>');
								oThemeLink.after(oThemeStyle);
								oThemeLink.remove();
							}

							if (oThemeStyle && oThemeStyle[0])
							{
								oThemeStyle.attr('data-href', sUrl).attr('data-theme', aData[0]);
								if (oThemeStyle && oThemeStyle[0] && oThemeStyle[0].styleSheet && !Utils.isUnd(oThemeStyle[0].styleSheet.cssText))
								{
									oThemeStyle[0].styleSheet.cssText = aData[1];
								}
								else
								{
									oThemeStyle.text(aData[1]);
								}
							}

							self.themeTrigger(Enums.SaveSettingsStep.TrueResult);
						}

					}).always(function() {

						self.iTimer = window.setTimeout(function () {
							self.themeTrigger(Enums.SaveSettingsStep.Idle);
						}, 1000);

						self.oLastAjax = null;
					});
				}

				Remote.saveSettings(null, {
					'Theme': sValue
				});

			}, this);
		}

		SettingsThemes.prototype.onBuild = function ()
		{
			var sCurrentTheme = Data.theme();
			this.themesObjects(_.map(Data.themes(), function (sTheme) {
				return {
					'name': sTheme,
					'nameDisplay': Utils.convertThemeName(sTheme),
					'selected': ko.observable(sTheme === sCurrentTheme),
					'themePreviewSrc': LinkBuilder.themePreviewLink(sTheme)
				};
			}));
		};

		module.exports = SettingsThemes;

	}());

/***/ },
/* 90 */,
/* 91 */,
/* 92 */
/*!******************************************!*\
  !*** ./dev/ViewModels/AboutViewModel.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			Settings = __webpack_require__(/*! Storage:Settings */ 10),

			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function AboutViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Center', 'About');

			this.version = ko.observable(Settings.settingsGet('Version'));

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:RainLoop:About', 'AboutViewModel'], AboutViewModel);
		_.extend(AboutViewModel.prototype, KnoinAbstractViewModel.prototype);

		module.exports = AboutViewModel;

	}());

/***/ },
/* 93 */,
/* 94 */,
/* 95 */,
/* 96 */,
/* 97 */
/*!******************************************************!*\
  !*** ./dev/ViewModels/MailBoxFolderListViewModel.js ***!
  \******************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),
			key = __webpack_require__(/*! key */ 19),

			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Cache = __webpack_require__(/*! Storage:RainLoop:Cache */ 20),
			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function MailBoxFolderListViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Left', 'MailFolderList');

			this.oContentVisible = null;
			this.oContentScrollable = null;

			this.messageList = Data.messageList;
			this.folderList = Data.folderList;
			this.folderListSystem = Data.folderListSystem;
			this.foldersChanging = Data.foldersChanging;

			this.leftPanelDisabled = Globals.leftPanelDisabled;

			this.iDropOverTimer = 0;

			this.allowContacts = !!Settings.settingsGet('ContactsIsAllowed');

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:RainLoop:MailBoxFolderList', 'MailBoxFolderListViewModel'], MailBoxFolderListViewModel);
		_.extend(MailBoxFolderListViewModel.prototype, KnoinAbstractViewModel.prototype);

		MailBoxFolderListViewModel.prototype.onBuild = function (oDom)
		{
			this.oContentVisible = $('.b-content', oDom);
			this.oContentScrollable = $('.content', this.oContentVisible);

			var self = this;

			oDom
				.on('click', '.b-folders .e-item .e-link .e-collapsed-sign', function (oEvent) {

					var
						oFolder = ko.dataFor(this),
						bCollapsed = false
					;

					if (oFolder && oEvent)
					{
						bCollapsed = oFolder.collapsed();
						__webpack_require__(/*! App:RainLoop */ 4).setExpandedFolder(oFolder.fullNameHash, bCollapsed);

						oFolder.collapsed(!bCollapsed);
						oEvent.preventDefault();
						oEvent.stopPropagation();
					}
				})
				.on('click', '.b-folders .e-item .e-link.selectable', function (oEvent) {

					oEvent.preventDefault();

					var
						oFolder = ko.dataFor(this)
					;

					if (oFolder)
					{
						if (Enums.Layout.NoPreview === Data.layout())
						{
							Data.message(null);
						}

						if (oFolder.fullNameRaw === Data.currentFolderFullNameRaw())
						{
							Cache.setFolderHash(oFolder.fullNameRaw, '');
						}

						kn.setHash(LinkBuilder.mailBox(oFolder.fullNameHash));
					}
				})
			;

			key('up, down', Enums.KeyState.FolderList, function (event, handler) {

				var
					iIndex = -1,
					iKeyCode = handler && 'up' === handler.shortcut ? 38 : 40,
					$items = $('.b-folders .e-item .e-link:not(.hidden):visible', oDom)
				;

				if (event && $items.length)
				{
					iIndex = $items.index($items.filter('.focused'));
					if (-1 < iIndex)
					{
						$items.eq(iIndex).removeClass('focused');
					}

					if (iKeyCode === 38 && iIndex > 0)
					{
						iIndex--;
					}
					else if (iKeyCode === 40 && iIndex < $items.length - 1)
					{
						iIndex++;
					}

					$items.eq(iIndex).addClass('focused');
					self.scrollToFocused();
				}

				return false;
			});

			key('enter', Enums.KeyState.FolderList, function () {
				var $items = $('.b-folders .e-item .e-link:not(.hidden).focused', oDom);
				if ($items.length && $items[0])
				{
					self.folderList.focused(false);
					$items.click();
				}

				return false;
			});

			key('space', Enums.KeyState.FolderList, function () {
				var bCollapsed = true, oFolder = null, $items = $('.b-folders .e-item .e-link:not(.hidden).focused', oDom);
				if ($items.length && $items[0])
				{
					oFolder = ko.dataFor($items[0]);
					if (oFolder)
					{
						bCollapsed = oFolder.collapsed();
						__webpack_require__(/*! App:RainLoop */ 4).setExpandedFolder(oFolder.fullNameHash, bCollapsed);
						oFolder.collapsed(!bCollapsed);
					}
				}

				return false;
			});

			key('esc, tab, shift+tab, right', Enums.KeyState.FolderList, function () {
				self.folderList.focused(false);
				return false;
			});

			self.folderList.focused.subscribe(function (bValue) {
				$('.b-folders .e-item .e-link.focused', oDom).removeClass('focused');
				if (bValue)
				{
					$('.b-folders .e-item .e-link.selected', oDom).addClass('focused');
				}
			});
		};

		MailBoxFolderListViewModel.prototype.messagesDropOver = function (oFolder)
		{
			window.clearTimeout(this.iDropOverTimer);
			if (oFolder && oFolder.collapsed())
			{
				this.iDropOverTimer = window.setTimeout(function () {
					oFolder.collapsed(false);
					__webpack_require__(/*! App:RainLoop */ 4).setExpandedFolder(oFolder.fullNameHash, true);
					Utils.windowResize();
				}, 500);
			}
		};

		MailBoxFolderListViewModel.prototype.messagesDropOut = function ()
		{
			window.clearTimeout(this.iDropOverTimer);
		};

		MailBoxFolderListViewModel.prototype.scrollToFocused = function ()
		{
			if (!this.oContentVisible || !this.oContentScrollable)
			{
				return false;
			}

			var
				iOffset = 20,
				oFocused = $('.e-item .e-link.focused', this.oContentScrollable),
				oPos = oFocused.position(),
				iVisibleHeight = this.oContentVisible.height(),
				iFocusedHeight = oFocused.outerHeight()
			;

			if (oPos && (oPos.top < 0 || oPos.top + iFocusedHeight > iVisibleHeight))
			{
				if (oPos.top < 0)
				{
					this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iOffset);
				}
				else
				{
					this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iVisibleHeight + iFocusedHeight + iOffset);
				}

				return true;
			}

			return false;
		};

		/**
		 *
		 * @param {FolderModel} oToFolder
		 * @param {{helper:jQuery}} oUi
		 */
		MailBoxFolderListViewModel.prototype.messagesDrop = function (oToFolder, oUi)
		{
			if (oToFolder && oUi && oUi.helper)
			{
				var
					sFromFolderFullNameRaw = oUi.helper.data('rl-folder'),
					bCopy = Globals.$html.hasClass('rl-ctrl-key-pressed'),
					aUids = oUi.helper.data('rl-uids')
				;

				if (Utils.isNormal(sFromFolderFullNameRaw) && '' !== sFromFolderFullNameRaw && Utils.isArray(aUids))
				{
					__webpack_require__(/*! App:RainLoop */ 4).moveMessagesToFolder(sFromFolderFullNameRaw, aUids, oToFolder.fullNameRaw, bCopy);
				}
			}
		};

		MailBoxFolderListViewModel.prototype.composeClick = function ()
		{
			kn.showScreenPopup(__webpack_require__(/*! View:Popup:Compose */ 21));
		};

		MailBoxFolderListViewModel.prototype.createFolder = function ()
		{
			kn.showScreenPopup(__webpack_require__(/*! View:Popup:FolderCreate */ 44));
		};

		MailBoxFolderListViewModel.prototype.configureFolders = function ()
		{
			kn.setHash(LinkBuilder.settings('folders'));
		};

		MailBoxFolderListViewModel.prototype.contactsClick = function ()
		{
			if (this.allowContacts)
			{
				kn.showScreenPopup(__webpack_require__(/*! View:Popup:Contacts */ 43));
			}
		};

		module.exports = MailBoxFolderListViewModel;

	}());


/***/ },
/* 98 */
/*!*******************************************************!*\
  !*** ./dev/ViewModels/MailBoxMessageListViewModel.js ***!
  \*******************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),
			key = __webpack_require__(/*! key */ 19),
			Jua = __webpack_require__(/*! Jua */ 47),
			ifvisible = __webpack_require__(/*! ifvisible */ 116),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),
			Events = __webpack_require__(/*! Common/Events */ 22),
			Selector = __webpack_require__(/*! Common/Selector */ 36),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Cache = __webpack_require__(/*! Storage:RainLoop:Cache */ 20),
			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

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

			this.hideDangerousActions = !!Settings.settingsGet('HideDangerousActions');

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
				kn.showScreenPopup(__webpack_require__(/*! View:Popup:FolderClear */ 107), [Data.currentFolder()]);
			});

			this.multyForwardCommand = Utils.createCommand(this, function () {
				kn.showScreenPopup(__webpack_require__(/*! View:Popup:Compose */ 21), [
					Enums.ComposeType.ForwardAsAttachment, Data.messageListCheckedOrSelected()]);
			}, this.canBeMoved);

			this.deleteWithoutMoveCommand = Utils.createCommand(this, function () {
				__webpack_require__(/*! App:RainLoop */ 4).deleteMessagesFromFolder(Enums.FolderType.Trash,
					Data.currentFolderFullNameRaw(),
					Data.messageListCheckedOrSelectedUidsWithSubMails(), false);
			}, this.canBeMoved);

			this.deleteCommand = Utils.createCommand(this, function () {
				__webpack_require__(/*! App:RainLoop */ 4).deleteMessagesFromFolder(Enums.FolderType.Trash,
					Data.currentFolderFullNameRaw(),
					Data.messageListCheckedOrSelectedUidsWithSubMails(), true);
			}, this.canBeMoved);

			this.archiveCommand = Utils.createCommand(this, function () {
				__webpack_require__(/*! App:RainLoop */ 4).deleteMessagesFromFolder(Enums.FolderType.Archive,
					Data.currentFolderFullNameRaw(),
					Data.messageListCheckedOrSelectedUidsWithSubMails(), true);
			}, this.canBeMoved);

			this.spamCommand = Utils.createCommand(this, function () {
				__webpack_require__(/*! App:RainLoop */ 4).deleteMessagesFromFolder(Enums.FolderType.Spam,
					Data.currentFolderFullNameRaw(),
					Data.messageListCheckedOrSelectedUidsWithSubMails(), true);
			}, this.canBeMoved);

			this.notSpamCommand = Utils.createCommand(this, function () {
				__webpack_require__(/*! App:RainLoop */ 4).deleteMessagesFromFolder(Enums.FolderType.NotSpam,
					Data.currentFolderFullNameRaw(),
					Data.messageListCheckedOrSelectedUidsWithSubMails(), true);
			}, this.canBeMoved);

			this.moveCommand = Utils.createCommand(this, Utils.emptyFunction, this.canBeMoved);

			this.reloadCommand = Utils.createCommand(this, function () {
				if (!Data.messageListCompleteLoadingThrottle())
				{
					__webpack_require__(/*! App:RainLoop */ 4).reloadMessageList(false, true);
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

		kn.extendAsViewModel(['View:RainLoop:MailBoxMessageList', 'MailBoxMessageListViewModel'], MailBoxMessageListViewModel);
		_.extend(MailBoxMessageListViewModel.prototype, KnoinAbstractViewModel.prototype);

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
		 * @param {boolean} bCopy
		 * @return {boolean}
		 */
		MailBoxMessageListViewModel.prototype.moveSelectedMessagesToFolder = function (sToFolderFullNameRaw, bCopy)
		{
			if (this.canBeMoved())
			{
				__webpack_require__(/*! App:RainLoop */ 4).moveMessagesToFolder(
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
				iAlreadyUnread = 0
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

				__webpack_require__(/*! App:RainLoop */ 4).reloadFlagsCurrentMessageListAndMessageFromCache();
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
				aMessages = Data.messageList()
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

					__webpack_require__(/*! App:RainLoop */ 4).reloadFlagsCurrentMessageListAndMessageFromCache();
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
			var self = this;

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

					__webpack_require__(/*! App:RainLoop */ 4).reloadMessageList();
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

			if (!Globals.bMobileDevice && Settings.capa(Enums.Capa.Prefetch) && ifvisible)
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
				kn.showScreenPopup(__webpack_require__(/*! View:Popup:Compose */ 21));
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
				if (event && handler && ('shift+tab' === handler.shortcut || 'left' === handler.shortcut))
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
			kn.showScreenPopup(__webpack_require__(/*! View:Popup:Compose */ 21));
		};

		MailBoxMessageListViewModel.prototype.advancedSearchClick = function ()
		{
			kn.showScreenPopup(__webpack_require__(/*! View:Popup:AdvancedSearch */ 103));
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
			if (!Settings.settingsGet('AllowAppendMessage') || !this.dragOverArea())
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
					__webpack_require__(/*! App:RainLoop */ 4).reloadMessageList(true, true);
				}, this))
			;

			return !!oJua;
		};

		module.exports = MailBoxMessageListViewModel;

	}());


/***/ },
/* 99 */
/*!*******************************************************!*\
  !*** ./dev/ViewModels/MailBoxMessageViewViewModel.js ***!
  \*******************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),
			key = __webpack_require__(/*! key */ 19),

			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Events = __webpack_require__(/*! Common/Events */ 22),

			Cache = __webpack_require__(/*! Storage:RainLoop:Cache */ 20),
			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
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
					__webpack_require__(/*! App:RainLoop */ 4).deleteMessagesFromFolder(Enums.FolderType.Trash,
						this.message().folderFullNameRaw,
						[this.message().uid], true);
				}
			}, this.messageVisibility);

			this.deleteWithoutMoveCommand = Utils.createCommand(this, function () {
				if (this.message())
				{
					__webpack_require__(/*! App:RainLoop */ 4).deleteMessagesFromFolder(Enums.FolderType.Trash,
						Data.currentFolderFullNameRaw(),
						[this.message().uid], false);
				}
			}, this.messageVisibility);

			this.archiveCommand = Utils.createCommand(this, function () {
				if (this.message())
				{
					__webpack_require__(/*! App:RainLoop */ 4).deleteMessagesFromFolder(Enums.FolderType.Archive,
						this.message().folderFullNameRaw,
						[this.message().uid], true);
				}
			}, this.messageVisibility);

			this.spamCommand = Utils.createCommand(this, function () {
				if (this.message())
				{
					__webpack_require__(/*! App:RainLoop */ 4).deleteMessagesFromFolder(Enums.FolderType.Spam,
						this.message().folderFullNameRaw,
						[this.message().uid], true);
				}
			}, this.messageVisibility);

			this.notSpamCommand = Utils.createCommand(this, function () {
				if (this.message())
				{
					__webpack_require__(/*! App:RainLoop */ 4).deleteMessagesFromFolder(Enums.FolderType.NotSpam,
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
			this.viewSize = ko.observable('');
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
					this.viewSize(oMessage.friendlySize());
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
					Globals.$html.addClass('rl-message-fullscreen');
				}
				else
				{
					Globals.$html.removeClass('rl-message-fullscreen');
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

		kn.extendAsViewModel(['View:RainLoop:MailBoxMessageView', 'MailBoxMessageViewViewModel'], MailBoxMessageViewViewModel);
		_.extend(MailBoxMessageViewViewModel.prototype, KnoinAbstractViewModel.prototype);

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
			kn.showScreenPopup(__webpack_require__(/*! View:Popup:Compose */ 21), [sType, Data.message()]);
		};

		MailBoxMessageViewViewModel.prototype.onBuild = function (oDom)
		{
			var self = this;
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
				.on('click', 'a', function (oEvent) {
					// setup maito protocol
					return !(!!oEvent && 3 !== oEvent['which'] && Utils.mailToHelper($(this).attr('href'), __webpack_require__(/*! View:Popup:Compose */ 21)));
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
						__webpack_require__(/*! App:RainLoop */ 4).download(oAttachment.linkDownload());
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
				if (!self.fullScreenMode() && self.message() && Enums.Layout.NoPreview !== Data.layout())
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
				else if (self.message() && Enums.Layout.NoPreview === Data.layout() && event && handler && 'left' === handler.shortcut)
				{
					return true;
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
			kn.showScreenPopup(__webpack_require__(/*! View:Popup:Compose */ 21));
		};

		MailBoxMessageViewViewModel.prototype.editMessage = function ()
		{
			if (Data.message())
			{
				kn.showScreenPopup(__webpack_require__(/*! View:Popup:Compose */ 21), [Enums.ComposeType.Draft, Data.message()]);
			}
		};

		MailBoxMessageViewViewModel.prototype.scrollMessageToTop = function ()
		{
			if (this.oMessageScrollerDom)
			{
				this.oMessageScrollerDom.scrollTop(0);
				Utils.windowResize();
			}
		};

		MailBoxMessageViewViewModel.prototype.scrollMessageToLeft = function ()
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

				__webpack_require__(/*! App:RainLoop */ 4).reloadFlagsCurrentMessageListAndMessageFromCache();
			}
		};

		module.exports = MailBoxMessageViewViewModel;

	}());

/***/ },
/* 100 */
/*!**********************************************************!*\
  !*** ./dev/ViewModels/MailBoxSystemDropDownViewModel.js ***!
  \**********************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			
			kn = __webpack_require__(/*! App:Knoin */ 5),
			AbstractSystemDropDownViewModel = __webpack_require__(/*! View:RainLoop:AbstractSystemDropDown */ 41)
		;

		/**
		 * @constructor
		 * @extends AbstractSystemDropDownViewModel
		 */
		function MailBoxSystemDropDownViewModel()
		{
			AbstractSystemDropDownViewModel.call(this);
			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:RainLoop:MailBoxSystemDropDown', 'MailBoxSystemDropDownViewModel'], MailBoxSystemDropDownViewModel);
		_.extend(MailBoxSystemDropDownViewModel.prototype, AbstractSystemDropDownViewModel.prototype);

		module.exports = MailBoxSystemDropDownViewModel;

	}());


/***/ },
/* 101 */,
/* 102 */
/*!***************************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsAddOpenPgpKeyViewModel.js ***!
  \***************************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsAddOpenPgpKeyViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAddOpenPgpKey');

			this.key = ko.observable('');
			this.key.error = ko.observable(false);
			this.key.focus = ko.observable(false);

			this.key.subscribe(function () {
				this.key.error(false);
			}, this);

			this.addOpenPgpKeyCommand = Utils.createCommand(this, function () {

				var
					iCount = 30,
					aMatch = null,
					sKey = Utils.trim(this.key()),
					oReg = /[\-]{3,6}BEGIN[\s]PGP[\s](PRIVATE|PUBLIC)[\s]KEY[\s]BLOCK[\-]{3,6}[\s\S]+?[\-]{3,6}END[\s]PGP[\s](PRIVATE|PUBLIC)[\s]KEY[\s]BLOCK[\-]{3,6}/gi,
					oOpenpgpKeyring = Data.openpgpKeyring
				;

				sKey = sKey.replace(/[\r\n]([a-zA-Z0-9]{2,}:[^\r\n]+)[\r\n]+([a-zA-Z0-9\/\\+=]{10,})/g, '\n$1!-!N!-!$2')
					.replace(/[\n\r]+/g, '\n').replace(/!-!N!-!/g, '\n\n');

				this.key.error('' === sKey);

				if (!oOpenpgpKeyring || this.key.error())
				{
					return false;
				}

				do
				{
					aMatch = oReg.exec(sKey);
					if (!aMatch || 0 > iCount)
					{
						break;
					}

					if (aMatch[0] && aMatch[1] && aMatch[2] && aMatch[1] === aMatch[2])
					{
						if ('PRIVATE' === aMatch[1])
						{
							oOpenpgpKeyring.privateKeys.importKey(aMatch[0]);
						}
						else if ('PUBLIC' === aMatch[1])
						{
							oOpenpgpKeyring.publicKeys.importKey(aMatch[0]);
						}
					}

					iCount--;
				}
				while (true);

				oOpenpgpKeyring.store();

				__webpack_require__(/*! App:RainLoop */ 4).reloadOpenPgpKeys();
				Utils.delegateRun(this, 'cancelCommand');

				return true;
			});

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:AddOpenPgpKey', 'PopupsAddOpenPgpKeyViewModel'], PopupsAddOpenPgpKeyViewModel);
		_.extend(PopupsAddOpenPgpKeyViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsAddOpenPgpKeyViewModel.prototype.clearPopup = function ()
		{
			this.key('');
			this.key.error(false);
		};

		PopupsAddOpenPgpKeyViewModel.prototype.onShow = function ()
		{
			this.clearPopup();
		};

		PopupsAddOpenPgpKeyViewModel.prototype.onFocus = function ()
		{
			this.key.focus(true);
		};

		module.exports = PopupsAddOpenPgpKeyViewModel;

	}());

/***/ },
/* 103 */
/*!****************************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsAdvancedSearchViewModel.js ***!
  \****************************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),
			moment = __webpack_require__(/*! moment */ 25),

			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsAdvancedSearchViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsAdvancedSearch');

			this.fromFocus = ko.observable(false);

			this.from = ko.observable('');
			this.to = ko.observable('');
			this.subject = ko.observable('');
			this.text = ko.observable('');
			this.selectedDateValue = ko.observable(-1);

			this.hasAttachment = ko.observable(false);
			this.starred = ko.observable(false);
			this.unseen = ko.observable(false);

			this.searchCommand = Utils.createCommand(this, function () {

				var sSearch = this.buildSearchString();
				if ('' !== sSearch)
				{
					Data.mainMessageListSearch(sSearch);
				}

				this.cancelCommand();
			});

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:AdvancedSearch', 'PopupsAdvancedSearchViewModel'], PopupsAdvancedSearchViewModel);
		_.extend(PopupsAdvancedSearchViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsAdvancedSearchViewModel.prototype.buildSearchStringValue = function (sValue)
		{
			if (-1 < sValue.indexOf(' '))
			{
				sValue = '"' + sValue + '"';
			}

			return sValue;
		};

		PopupsAdvancedSearchViewModel.prototype.buildSearchString = function ()
		{
			var
				aResult = [],
				sFrom = Utils.trim(this.from()),
				sTo = Utils.trim(this.to()),
				sSubject = Utils.trim(this.subject()),
				sText = Utils.trim(this.text()),
				aIs = [],
				aHas = []
			;

			if (sFrom && '' !== sFrom)
			{
				aResult.push('from:' + this.buildSearchStringValue(sFrom));
			}

			if (sTo && '' !== sTo)
			{
				aResult.push('to:' + this.buildSearchStringValue(sTo));
			}

			if (sSubject && '' !== sSubject)
			{
				aResult.push('subject:' + this.buildSearchStringValue(sSubject));
			}

			if (this.hasAttachment())
			{
				aHas.push('attachment');
			}

			if (this.unseen())
			{
				aIs.push('unseen');
			}

			if (this.starred())
			{
				aIs.push('flagged');
			}

			if (0 < aHas.length)
			{
				aResult.push('has:' + aHas.join(','));
			}

			if (0 < aIs.length)
			{
				aResult.push('is:' + aIs.join(','));
			}

			if (-1 < this.selectedDateValue())
			{
				aResult.push('date:' + moment().subtract('days', this.selectedDateValue()).format('YYYY.MM.DD') + '/');
			}

			if (sText && '' !== sText)
			{
				aResult.push('text:' + this.buildSearchStringValue(sText));
			}

			return Utils.trim(aResult.join(' '));
		};

		PopupsAdvancedSearchViewModel.prototype.clearPopup = function ()
		{
			this.from('');
			this.to('');
			this.subject('');
			this.text('');

			this.selectedDateValue(-1);
			this.hasAttachment(false);
			this.starred(false);
			this.unseen(false);

			this.fromFocus(true);
		};

		PopupsAdvancedSearchViewModel.prototype.onShow = function ()
		{
			this.clearPopup();
		};

		PopupsAdvancedSearchViewModel.prototype.onFocus = function ()
		{
			this.fromFocus(true);
		};

		module.exports = PopupsAdvancedSearchViewModel;

	}());

/***/ },
/* 104 */
/*!****************************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsComposeOpenPgpViewModel.js ***!
  \****************************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),
			key = __webpack_require__(/*! key */ 19),

			Utils = __webpack_require__(/*! Common/Utils */ 1),
			Enums = __webpack_require__(/*! Common/Enums */ 6),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),

			EmailModel = __webpack_require__(/*! Model:Email */ 23),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsComposeOpenPgpViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsComposeOpenPgp');

			this.notification = ko.observable('');

			this.sign = ko.observable(true);
			this.encrypt = ko.observable(true);

			this.password = ko.observable('');
			this.password.focus = ko.observable(false);
			this.buttonFocus = ko.observable(false);

			this.from = ko.observable('');
			this.to = ko.observableArray([]);
			this.text = ko.observable('');

			this.resultCallback = null;

			this.submitRequest = ko.observable(false);

			// commands
			this.doCommand = Utils.createCommand(this, function () {

				var
					self = this,
					bResult = true,
					oPrivateKey = null,
					aPublicKeys = []
				;

				this.submitRequest(true);

				if (bResult && this.sign() && '' === this.from())
				{
					this.notification(Utils.i18n('PGP_NOTIFICATIONS/SPECIFY_FROM_EMAIL'));
					bResult = false;
				}

				if (bResult && this.sign())
				{
					oPrivateKey = Data.findPrivateKeyByEmail(this.from(), this.password());
					if (!oPrivateKey)
					{
						this.notification(Utils.i18n('PGP_NOTIFICATIONS/NO_PRIVATE_KEY_FOUND_FOR', {
							'EMAIL': this.from()
						}));

						bResult = false;
					}
				}

				if (bResult && this.encrypt() && 0 === this.to().length)
				{
					this.notification(Utils.i18n('PGP_NOTIFICATIONS/SPECIFY_AT_LEAST_ONE_RECIPIENT'));
					bResult = false;
				}

				if (bResult && this.encrypt())
				{
					aPublicKeys = [];
					_.each(this.to(), function (sEmail) {
						var aKeys = Data.findPublicKeysByEmail(sEmail);
						if (0 === aKeys.length && bResult)
						{
							self.notification(Utils.i18n('PGP_NOTIFICATIONS/NO_PUBLIC_KEYS_FOUND_FOR', {
								'EMAIL': sEmail
							}));

							bResult = false;
						}

						aPublicKeys = aPublicKeys.concat(aKeys);
					});

					if (bResult && (0 === aPublicKeys.length || this.to().length !== aPublicKeys.length))
					{
						bResult = false;
					}
				}

				_.delay(function () {

					if (self.resultCallback && bResult)
					{
						try {

							if (oPrivateKey && 0 === aPublicKeys.length)
							{
								self.resultCallback(
									window.openpgp.signClearMessage([oPrivateKey], self.text())
								);
							}
							else if (oPrivateKey && 0 < aPublicKeys.length)
							{
								self.resultCallback(
									window.openpgp.signAndEncryptMessage(aPublicKeys, oPrivateKey, self.text())
								);
							}
							else if (!oPrivateKey && 0 < aPublicKeys.length)
							{
								self.resultCallback(
									window.openpgp.encryptMessage(aPublicKeys, self.text())
								);
							}
						}
						catch (e)
						{
							self.notification(Utils.i18n('PGP_NOTIFICATIONS/PGP_ERROR', {
								'ERROR': '' + e
							}));

							bResult = false;
						}
					}

					if (bResult)
					{
						self.cancelCommand();
					}

					self.submitRequest(false);

				}, 10);

			}, function () {
				return !this.submitRequest() &&	(this.sign() || this.encrypt());
			});

			this.sDefaultKeyScope = Enums.KeyState.PopupComposeOpenPGP;

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:ComposeOpenPgp', 'PopupsComposeOpenPgpViewModel'], PopupsComposeOpenPgpViewModel);
		_.extend(PopupsComposeOpenPgpViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsComposeOpenPgpViewModel.prototype.clearPopup = function ()
		{
			this.notification('');

			this.password('');
			this.password.focus(false);
			this.buttonFocus(false);

			this.from('');
			this.to([]);
			this.text('');

			this.submitRequest(false);

			this.resultCallback = null;
		};

		PopupsComposeOpenPgpViewModel.prototype.onBuild = function ()
		{
			key('tab,shift+tab', Enums.KeyState.PopupComposeOpenPGP, _.bind(function () {

				switch (true)
				{
					case this.password.focus():
						this.buttonFocus(true);
						break;
					case this.buttonFocus():
						this.password.focus(true);
						break;
				}

				return false;

			}, this));
		};

		PopupsComposeOpenPgpViewModel.prototype.onHide = function ()
		{
			this.clearPopup();
		};

		PopupsComposeOpenPgpViewModel.prototype.onFocus = function ()
		{
			if (this.sign())
			{
				this.password.focus(true);
			}
			else
			{
				this.buttonFocus(true);
			}
		};

		PopupsComposeOpenPgpViewModel.prototype.onShow = function (fCallback, sText, sFromEmail, sTo, sCc, sBcc)
		{
			this.clearPopup();

			var
				oEmail = new EmailModel(),
				sResultFromEmail = '',
				aRec = []
			;

			this.resultCallback = fCallback;

			oEmail.clear();
			oEmail.mailsoParse(sFromEmail);
			if ('' !== oEmail.email)
			{
				sResultFromEmail = oEmail.email;
			}

			if ('' !== sTo)
			{
				aRec.push(sTo);
			}

			if ('' !== sCc)
			{
				aRec.push(sCc);
			}

			if ('' !== sBcc)
			{
				aRec.push(sBcc);
			}

			aRec = aRec.join(', ').split(',');
			aRec = _.compact(_.map(aRec, function (sValue) {
				oEmail.clear();
				oEmail.mailsoParse(Utils.trim(sValue));
				return '' === oEmail.email ? false : oEmail.email;
			}));

			this.from(sResultFromEmail);
			this.to(aRec);
			this.text(sText);
		};

		module.exports = PopupsComposeOpenPgpViewModel;

	}());

/***/ },
/* 105 */,
/* 106 */
/*!********************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsFilterViewModel.js ***!
  \********************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsFilterViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFilter');

			this.filter = ko.observable(null);

			this.selectedFolderValue = ko.observable(Consts.Values.UnuseOptionValue);
			this.folderSelectList = Data.folderMenuForMove;
			this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:Filter', 'PopupsFilterViewModel'], PopupsFilterViewModel);
		_.extend(PopupsFilterViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsFilterViewModel.prototype.clearPopup = function ()
		{
			// TODO
		};

		PopupsFilterViewModel.prototype.onShow = function (oFilter)
		{
			this.clearPopup();

			this.filter(oFilter);
		};

		module.exports = PopupsFilterViewModel;

	}());

/***/ },
/* 107 */
/*!*************************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsFolderClearViewModel.js ***!
  \*************************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),
			Cache = __webpack_require__(/*! Storage:RainLoop:Cache */ 20),
			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsFolderClearViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsFolderClear');

			this.selectedFolder = ko.observable(null);
			this.clearingProcess = ko.observable(false);
			this.clearingError = ko.observable('');

			this.folderFullNameForClear = ko.computed(function () {
				var oFolder = this.selectedFolder();
				return oFolder ? oFolder.printableFullName() : '';
			}, this);

			this.folderNameForClear = ko.computed(function () {
				var oFolder = this.selectedFolder();
				return oFolder ? oFolder.localName() : '';
			}, this);

			this.dangerDescHtml = ko.computed(function () {
				return Utils.i18n('POPUPS_CLEAR_FOLDER/DANGER_DESC_HTML_1', {
					'FOLDER': this.folderNameForClear()
				});
			}, this);

			this.clearCommand = Utils.createCommand(this, function () {

				var
					self = this,
					oFolderToClear = this.selectedFolder()
				;

				if (oFolderToClear)
				{
					Data.message(null);
					Data.messageList([]);

					this.clearingProcess(true);

					oFolderToClear.messageCountAll(0);
					oFolderToClear.messageCountUnread(0);

					Cache.setFolderHash(oFolderToClear.fullNameRaw, '');

					Remote.folderClear(function (sResult, oData) {

						self.clearingProcess(false);
						if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
						{
							__webpack_require__(/*! App:RainLoop */ 4).reloadMessageList(true);
							self.cancelCommand();
						}
						else
						{
							if (oData && oData.ErrorCode)
							{
								self.clearingError(Utils.getNotification(oData.ErrorCode));
							}
							else
							{
								self.clearingError(Utils.getNotification(Enums.Notification.MailServerError));
							}
						}
					}, oFolderToClear.fullNameRaw);
				}

			}, function () {

				var
					oFolder = this.selectedFolder(),
					bIsClearing = this.clearingProcess()
				;

				return !bIsClearing && null !== oFolder;

			});

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:FolderClear', 'PopupsFolderClearViewModel'], PopupsFolderClearViewModel);
		_.extend(PopupsFolderClearViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsFolderClearViewModel.prototype.clearPopup = function ()
		{
			this.clearingProcess(false);
			this.selectedFolder(null);
		};

		PopupsFolderClearViewModel.prototype.onShow = function (oFolder)
		{
			this.clearPopup();
			if (oFolder)
			{
				this.selectedFolder(oFolder);
			}
		};

		module.exports = PopupsFolderClearViewModel;

	}());


/***/ },
/* 108 */
/*!***************************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsNewOpenPgpKeyViewModel.js ***!
  \***************************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsNewOpenPgpKeyViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsNewOpenPgpKey');

			this.email = ko.observable('');
			this.email.focus = ko.observable('');
			this.email.error = ko.observable(false);

			this.name = ko.observable('');
			this.password = ko.observable('');
			this.keyBitLength = ko.observable(2048);

			this.submitRequest = ko.observable(false);

			this.email.subscribe(function () {
				this.email.error(false);
			}, this);

			this.generateOpenPgpKeyCommand = Utils.createCommand(this, function () {

				var
					self = this,
					sUserID = '',
					mKeyPair = null,
					oOpenpgpKeyring = Data.openpgpKeyring
				;

				this.email.error('' === Utils.trim(this.email()));
				if (!oOpenpgpKeyring || this.email.error())
				{
					return false;
				}

				sUserID = this.email();
				if ('' !== this.name())
				{
					sUserID = this.name() + ' <' + sUserID + '>';
				}

				this.submitRequest(true);

				_.delay(function () {
		//			mKeyPair = window.openpgp.generateKeyPair(1, Utils.pInt(self.keyBitLength()), sUserID, Utils.trim(self.password()));
					mKeyPair = window.openpgp.generateKeyPair({
						'userId': sUserID,
						'numBits': Utils.pInt(self.keyBitLength()),
						'passphrase': Utils.trim(self.password())
					});

					if (mKeyPair && mKeyPair.privateKeyArmored)
					{
						oOpenpgpKeyring.privateKeys.importKey(mKeyPair.privateKeyArmored);
						oOpenpgpKeyring.publicKeys.importKey(mKeyPair.publicKeyArmored);
						oOpenpgpKeyring.store();

						__webpack_require__(/*! App:RainLoop */ 4).reloadOpenPgpKeys();
						Utils.delegateRun(self, 'cancelCommand');
					}

					self.submitRequest(false);
				}, 100);

				return true;
			});

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:NewOpenPgpKey', 'PopupsNewOpenPgpKeyViewModel'], PopupsNewOpenPgpKeyViewModel);
		_.extend(PopupsNewOpenPgpKeyViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsNewOpenPgpKeyViewModel.prototype.clearPopup = function ()
		{
			this.name('');
			this.password('');

			this.email('');
			this.email.error(false);
			this.keyBitLength(2048);
		};

		PopupsNewOpenPgpKeyViewModel.prototype.onShow = function ()
		{
			this.clearPopup();
		};

		PopupsNewOpenPgpKeyViewModel.prototype.onFocus = function ()
		{
			this.email.focus(true);
		};

		module.exports = PopupsNewOpenPgpKeyViewModel;

	}());

/***/ },
/* 109 */,
/* 110 */
/*!***************************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsTwoFactorTestViewModel.js ***!
  \***************************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Remote = __webpack_require__(/*! Storage:RainLoop:Remote */ 13),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsTwoFactorTestViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsTwoFactorTest');

			var self = this;

			this.code = ko.observable('');
			this.code.focused = ko.observable(false);
			this.code.status = ko.observable(null);

			this.testing = ko.observable(false);

			// commands
			this.testCode = Utils.createCommand(this, function () {

				this.testing(true);
				Remote.testTwoFactor(function (sResult, oData) {

					self.testing(false);
					self.code.status(Enums.StorageResultType.Success === sResult && oData && oData.Result ? true : false);

				}, this.code());

			}, function () {
				return '' !== this.code() && !this.testing();
			});

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:TwoFactorTest', 'PopupsTwoFactorTestViewModel'], PopupsTwoFactorTestViewModel);
		_.extend(PopupsTwoFactorTestViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsTwoFactorTestViewModel.prototype.clearPopup = function ()
		{
			this.code('');
			this.code.focused(false);
			this.code.status(null);
			this.testing(false);
		};

		PopupsTwoFactorTestViewModel.prototype.onShow = function ()
		{
			this.clearPopup();
		};

		PopupsTwoFactorTestViewModel.prototype.onFocus = function ()
		{
			this.code.focused(true);
		};

		module.exports = PopupsTwoFactorTestViewModel;

	}());

/***/ },
/* 111 */
/*!****************************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsViewOpenPgpKeyViewModel.js ***!
  \****************************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Utils = __webpack_require__(/*! Common/Utils */ 1),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsViewOpenPgpKeyViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsViewOpenPgpKey');

			this.key = ko.observable('');
			this.keyDom = ko.observable(null);

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:ViewOpenPgpKey', 'PopupsViewOpenPgpKeyViewModel'], PopupsViewOpenPgpKeyViewModel);
		_.extend(PopupsViewOpenPgpKeyViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsViewOpenPgpKeyViewModel.prototype.clearPopup = function ()
		{
			this.key('');
		};

		PopupsViewOpenPgpKeyViewModel.prototype.selectKey = function ()
		{
			var oEl = this.keyDom();
			if (oEl)
			{
				Utils.selectElement(oEl);
			}
		};

		PopupsViewOpenPgpKeyViewModel.prototype.onShow = function (oOpenPgpKey)
		{
			this.clearPopup();

			if (oOpenPgpKey)
			{
				this.key(oOpenPgpKey.armor);
			}
		};

		module.exports = PopupsViewOpenPgpKeyViewModel;

	}());

/***/ },
/* 112 */
/*!*************************************************!*\
  !*** ./dev/ViewModels/SettingsMenuViewModel.js ***!
  \*************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			
			Globals = __webpack_require__(/*! Common/Globals */ 7),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @param {?} oScreen
		 *
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function SettingsMenuViewModel(oScreen)
		{
			KnoinAbstractViewModel.call(this, 'Left', 'SettingsMenu');

			this.leftPanelDisabled = Globals.leftPanelDisabled;

			this.menu = oScreen.menu;

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:RainLoop:SettingsMenu', 'SettingsMenuViewModel'], SettingsMenuViewModel);
		_.extend(SettingsMenuViewModel.prototype, KnoinAbstractViewModel.prototype);

		SettingsMenuViewModel.prototype.link = function (sRoute)
		{
			return LinkBuilder.settings(sRoute);
		};

		SettingsMenuViewModel.prototype.backToMailBoxClick = function ()
		{
			kn.setHash(LinkBuilder.inbox());
		};

		module.exports = SettingsMenuViewModel;

	}());

/***/ },
/* 113 */
/*!*************************************************!*\
  !*** ./dev/ViewModels/SettingsPaneViewModel.js ***!
  \*************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			key = __webpack_require__(/*! key */ 19),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Data = __webpack_require__(/*! Storage:RainLoop:Data */ 8),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function SettingsPaneViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Right', 'SettingsPane');

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:RainLoop:SettingsPane', 'SettingsPaneViewModel'], SettingsPaneViewModel);
		_.extend(SettingsPaneViewModel.prototype, KnoinAbstractViewModel.prototype);

		SettingsPaneViewModel.prototype.onBuild = function ()
		{
			var self = this;
			key('esc', Enums.KeyState.Settings, function () {
				self.backToMailBoxClick();
			});
		};

		SettingsPaneViewModel.prototype.onShow = function ()
		{
			Data.message(null);
		};

		SettingsPaneViewModel.prototype.backToMailBoxClick = function ()
		{
			kn.setHash(LinkBuilder.inbox());
		};

		module.exports = SettingsPaneViewModel;

	}());

/***/ },
/* 114 */
/*!***********************************************************!*\
  !*** ./dev/ViewModels/SettingsSystemDropDownViewModel.js ***!
  \***********************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			
			kn = __webpack_require__(/*! App:Knoin */ 5),
			AbstractSystemDropDownViewModel = __webpack_require__(/*! View:RainLoop:AbstractSystemDropDown */ 41)
		;

		/**
		 * @constructor
		 * @extends AbstractSystemDropDownViewModel
		 */
		function SettingsSystemDropDownViewModel()
		{
			AbstractSystemDropDownViewModel.call(this);
			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:RainLoop:SettingsSystemDropDown', 'SettingsSystemDropDownViewModel'], SettingsSystemDropDownViewModel);
		_.extend(SettingsSystemDropDownViewModel.prototype, AbstractSystemDropDownViewModel.prototype);

		module.exports = SettingsSystemDropDownViewModel;

	}());

/***/ },
/* 115 */,
/* 116 */
/*!****************************!*\
  !*** external "ifvisible" ***!
  \****************************/
/***/ function(module, exports, __webpack_require__) {

	module.exports = ifvisible;

/***/ }
]));