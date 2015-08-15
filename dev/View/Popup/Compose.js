
/* global require, module */

(function () {

	'use strict';

	var
		window = require('window'),
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		JSON = require('JSON'),
		Jua = require('Jua'),

		Enums = require('Common/Enums'),
		Consts = require('Common/Consts'),
		Utils = require('Common/Utils'),
		Globals = require('Common/Globals'),
		Events = require('Common/Events'),
		Links = require('Common/Links'),
		HtmlEditor = require('Common/HtmlEditor'),

		Translator = require('Common/Translator'),
		Momentor = require('Common/Momentor'),

		Cache = require('Common/Cache'),

		AppStore = require('Stores/User/App'),
		SettingsStore = require('Stores/User/Settings'),
		IdentityStore = require('Stores/User/Identity'),
		AccountStore = require('Stores/User/Account'),
		FolderStore = require('Stores/User/Folder'),
		PgpStore = require('Stores/User/Pgp'),
		MessageStore = require('Stores/User/Message'),
		SocialStore = require('Stores/Social'),

		Settings = require('Storage/Settings'),
		Remote = require('Remote/User/Ajax'),

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

		var
			self = this,
			fEmailOutInHelper = function (self, oIdentity, sName, bIn) {
				if (oIdentity && self && oIdentity[sName]() && (bIn ? true : self[sName]()))
				{
					var
						sIdentityEmail = oIdentity[sName](),
						aList = Utils.trim(self[sName]()).split(/[,]/)
					;

					aList = _.filter(aList, function (sEmail) {
						sEmail = Utils.trim(sEmail);
						return sEmail && Utils.trim(sIdentityEmail) !== sEmail;
					});

					if (bIn)
					{
						aList.push(sIdentityEmail);
					}

					self[sName](aList.join(','));
				}
			}
		;

		this.oLastMessage = null;
		this.oEditor = null;
		this.aDraftInfo = null;
		this.sInReplyTo = '';
		this.bFromDraft = false;
		this.sReferences = '';

		this.sLastFocusedField = 'to';

		this.resizerTrigger = _.bind(this.resizerTrigger, this);

		this.allowContacts = !!AppStore.contactsIsAllowed();
		this.allowFolders = !!Settings.capa(Enums.Capa.Folders);

		this.bSkipNextHide = false;
		this.composeInEdit = AppStore.composeInEdit;
		this.editorDefaultType = SettingsStore.editorDefaultType;

		this.capaOpenPGP = PgpStore.capaOpenPGP;

		this.identitiesDropdownTrigger = ko.observable(false);

		this.to = ko.observable('');
		this.to.focused = ko.observable(false);
		this.cc = ko.observable('');
		this.cc.focused = ko.observable(false);
		this.bcc = ko.observable('');
		this.bcc.focused = ko.observable(false);
		this.replyTo = ko.observable('');
		this.replyTo.focused = ko.observable(false);

		ko.computed(function () {
			switch (true)
			{
				case this.to.focused():
					this.sLastFocusedField = 'to';
					break;
				case this.cc.focused():
					this.sLastFocusedField = 'cc';
					break;
				case this.bcc.focused():
					this.sLastFocusedField = 'bcc';
					break;
			}
		}, this).extend({'notify': 'always'});

		this.subject = ko.observable('');
		this.isHtml = ko.observable(false);

		this.requestDsn = ko.observable(false);
		this.requestReadReceipt = ko.observable(false);
		this.markAsImportant = ko.observable(false);

		this.sendError = ko.observable(false);
		this.sendSuccessButSaveError = ko.observable(false);
		this.savedError = ko.observable(false);

		this.sendErrorDesc = ko.observable('');
		this.savedErrorDesc = ko.observable('');

		this.sendError.subscribe(function (bValue) {
			if (!bValue)
			{
				this.sendErrorDesc('');
			}
		}, this);

		this.savedError.subscribe(function (bValue) {
			if (!bValue)
			{
				this.savedErrorDesc('');
			}
		}, this);

		this.sendSuccessButSaveError.subscribe(function (bValue) {
			if (!bValue)
			{
				this.savedErrorDesc('');
			}
		}, this);

		this.savedTime = ko.observable(0);
		this.savedTimeText = ko.computed(function () {
			return 0 < this.savedTime() ? Translator.i18n('COMPOSE/SAVED_TIME', {
				'TIME': Momentor.format(this.savedTime() - 1, 'LT')
			}) : '';
		}, this);

		this.emptyToError = ko.observable(false);
		this.emptyToErrorTooltip = ko.computed(function () {
			return this.emptyToError() ? Translator.i18n('COMPOSE/EMPTY_TO_ERROR_DESC') : '';
		}, this);

		this.attachmentsInProcessError = ko.observable(false);
		this.attachmentsInErrorError = ko.observable(false);

		this.attachmentsErrorTooltip = ko.computed(function () {

			var sResult = '';
			switch (true)
			{
				case this.attachmentsInProcessError():
					sResult = Translator.i18n('COMPOSE/ATTACHMENTS_UPLOAD_ERROR_DESC');
					break;
				case this.attachmentsInErrorError():
					sResult = Translator.i18n('COMPOSE/ATTACHMENTS_ERROR_DESC');
					break;
			}

			return sResult;

		}, this);

		this.showCc = ko.observable(false);
		this.showBcc = ko.observable(false);
		this.showReplyTo = ko.observable(false);

		this.cc.subscribe(function (aValue) {
			if (false === self.showCc() && 0 < aValue.length)
			{
				self.showCc(true);
			}
		}, this);

		this.bcc.subscribe(function (aValue) {
			if (false === self.showBcc() && 0 < aValue.length)
			{
				self.showBcc(true);
			}
		}, this);

		this.replyTo.subscribe(function (aValue) {
			if (false === self.showReplyTo() && 0 < aValue.length)
			{
				self.showReplyTo(true);
			}
		}, this);

		this.draftFolder = ko.observable('');
		this.draftUid = ko.observable('');
		this.sending = ko.observable(false);
		this.saving = ko.observable(false);
		this.attachments = ko.observableArray([]);

		this.attachmentsInProcess = this.attachments.filter(function (oItem) {
			return oItem && !oItem.complete();
		});

		this.attachmentsInReady = this.attachments.filter(function (oItem) {
			return oItem && oItem.complete();
		});

		this.attachmentsInError = this.attachments.filter(function (oItem) {
			return oItem && '' !== oItem.error();
		});

		this.attachmentsCount = ko.computed(function () {
			return this.attachments().length;
		}, this);

		this.attachmentsInErrorCount = ko.computed(function () {
			return this.attachmentsInError().length;
		}, this);

		this.attachmentsInProcessCount = ko.computed(function () {
			return this.attachmentsInProcess().length;
		}, this);

		this.isDraftFolderMessage = ko.computed(function () {
			return '' !== this.draftFolder() && '' !== this.draftUid();
		}, this);

		this.attachmentsPlace = ko.observable(false);

		this.attachments.subscribe(this.resizerTrigger);
		this.attachmentsPlace.subscribe(this.resizerTrigger);

		this.attachmentsInErrorCount.subscribe(function (iN) {
			if (0 === iN)
			{
				this.attachmentsInErrorError(false);
			}
		}, this);

		this.composeUploaderButton = ko.observable(null);
		this.composeUploaderDropPlace = ko.observable(null);
		this.dragAndDropEnabled = ko.observable(false);
		this.dragAndDropOver = ko.observable(false).extend({'throttle': 1});
		this.dragAndDropVisible = ko.observable(false).extend({'throttle': 1});
		this.attacheMultipleAllowed = ko.observable(false);
		this.addAttachmentEnabled = ko.observable(false);

		this.composeEditorArea = ko.observable(null);

		this.identities = IdentityStore.identities;
		this.identitiesOptions = ko.computed(function () {
			return _.map(IdentityStore.identities(), function (oItem) {
				return {
					'item': oItem,
					'optValue': oItem.id(),
					'optText': oItem.formattedName()
				};
			});
		}, this);

		this.currentIdentity = ko.observable(
			this.identities()[0] ? this.identities()[0] : null);

		this.currentIdentity.extend({'toggleSubscribe': [this,
			function (oIdentity) {
				fEmailOutInHelper(this, oIdentity, 'bcc');
				fEmailOutInHelper(this, oIdentity, 'replyTo');
			}, function (oIdentity) {
				fEmailOutInHelper(this, oIdentity, 'bcc', true);
				fEmailOutInHelper(this, oIdentity, 'replyTo', true);
			}
		]});

		this.currentIdentityView = ko.computed(function () {
			var oItem = this.currentIdentity();
			return oItem ? oItem.formattedName() : 'unknown';
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

		this.resizer = ko.observable(false).extend({'throttle': 50});

		this.resizer.subscribe(_.bind(function () {
			if (this.oEditor){
				this.oEditor.resize();
			}
		}, this));

		this.canBeSentOrSaved = ko.computed(function () {
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
				sSentFolder = FolderStore.sentFolder(),
				aFlagsCache = []
			;

			this.attachmentsInProcessError(false);
			this.attachmentsInErrorError(false);
			this.emptyToError(false);

			if (0 < this.attachmentsInProcess().length)
			{
				this.attachmentsInProcessError(true);
				this.attachmentsPlace(true);
			}
			else if (0 < this.attachmentsInError().length)
			{
				this.attachmentsInErrorError(true);
				this.attachmentsPlace(true);
			}

			if (0 === sTo.length)
			{
				this.emptyToError(true);
			}

			if (!this.emptyToError() && !this.attachmentsInErrorError() && !this.attachmentsInProcessError())
			{
				if (SettingsStore.replySameFolder())
				{
					if (Utils.isArray(this.aDraftInfo) && 3 === this.aDraftInfo.length && Utils.isNormal(this.aDraftInfo[2]) && 0 < this.aDraftInfo[2].length)
					{
						sSentFolder = this.aDraftInfo[2];
					}
				}

				if (!this.allowFolders)
				{
					sSentFolder = Consts.Values.UnuseOptionValue;
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
						this.currentIdentity() ? this.currentIdentity().id() : '',
						this.draftFolder(),
						this.draftUid(),
						sSentFolder,
						sTo,
						this.cc(),
						this.bcc(),
						this.replyTo(),
						this.subject(),
						this.oEditor ? this.oEditor.isHtml() : false,
						this.oEditor ? this.oEditor.getData(true, true) : '',
						this.prepearAttachmentsForSendOrSave(),
						this.aDraftInfo,
						this.sInReplyTo,
						this.sReferences,
						this.requestDsn(),
						this.requestReadReceipt(),
						this.markAsImportant()
					);
				}
			}

		}, this.canBeSentOrSaved);

		this.saveCommand = Utils.createCommand(this, function () {

			if (!this.allowFolders)
			{
				return false;
			}

			if (FolderStore.draftFolderNotEnabled())
			{
				kn.showScreenPopup(require('View/Popup/FolderSystem'), [Enums.SetSystemFoldersNotification.Draft]);
			}
			else
			{
				this.savedError(false);
				this.saving(true);

				this.autosaveStart();

				Cache.setFolderHash(FolderStore.draftFolder(), '');

				Remote.saveMessage(
					this.saveMessageResponse,
					this.currentIdentity() ? this.currentIdentity().id() : '',
					this.draftFolder(),
					this.draftUid(),
					FolderStore.draftFolder(),
					this.to(),
					this.cc(),
					this.bcc(),
					this.replyTo(),
					this.subject(),
					this.oEditor ? this.oEditor.isHtml() : false,
					this.oEditor ? this.oEditor.getData(true) : '',
					this.prepearAttachmentsForSendOrSave(),
					this.aDraftInfo,
					this.sInReplyTo,
					this.sReferences,
					this.markAsImportant()
				);
			}

		}, this.canBeSentOrSaved);

		this.skipCommand = Utils.createCommand(this, function () {

			this.bSkipNextHide = true;

			if (this.modalVisibility() && !this.saving() && !this.sending() &&
				!FolderStore.draftFolderNotEnabled())
			{
				this.saveCommand();
			}

			this.tryToClosePopup();

		}, this.canBeSentOrSaved);

		this.contactsCommand = Utils.createCommand(this, function () {

			if (this.allowContacts)
			{
				this.skipCommand();

				var self = this;

				_.delay(function () {
					kn.showScreenPopup(require('View/Popup/Contacts'),
						[true, self.sLastFocusedField]);
				}, 200);
			}

		}, function () {
			return this.allowContacts;
		});

		Events.sub('interval.2m', function () {

			if (this.modalVisibility() && !FolderStore.draftFolderNotEnabled() && !this.isEmptyForm(false) &&
				!this.saving() && !this.sending() && !this.savedError())
			{
				this.saveCommand();
			}
		}, this);

		this.showCc.subscribe(this.resizerTrigger);
		this.showBcc.subscribe(this.resizerTrigger);
		this.showReplyTo.subscribe(this.resizerTrigger);

		this.dropboxEnabled = SocialStore.dropbox.enabled;
		this.dropboxApiKey = SocialStore.dropbox.apiKey;

		this.dropboxCommand = Utils.createCommand(this, function () {

			if (window.Dropbox)
			{
				window.Dropbox.choose({
					'success': function(aFiles) {

						if (aFiles && aFiles[0] && aFiles[0]['link'])
						{
							self.addDropboxAttachment(aFiles[0]);
						}
					},
					'linkType': 'direct',
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

		this.onMessageUploadAttachments = _.bind(this.onMessageUploadAttachments, this);

		this.bDisabeCloseOnEsc = true;
		this.sDefaultKeyScope = Enums.KeyState.Compose;

		this.tryToClosePopup = _.debounce(_.bind(this.tryToClosePopup, this), 200);

		this.emailsSource = _.bind(this.emailsSource, this);
		this.autosaveFunction = _.bind(this.autosaveFunction, this);

		this.iTimer = 0;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Compose', 'PopupsComposeViewModel'], ComposePopupView);
	_.extend(ComposePopupView.prototype, AbstractView.prototype);

	ComposePopupView.prototype.autosaveFunction = function ()
	{
		if (this.modalVisibility() && !FolderStore.draftFolderNotEnabled() && !this.isEmptyForm(false) &&
			!this.saving() && !this.sending() && !this.savedError())
		{
			this.saveCommand();
		}

		this.autosaveStart();
	};

	ComposePopupView.prototype.autosaveStart = function ()
	{
		window.clearTimeout(this.iTimer);
		this.iTimer = window.setTimeout(this.autosaveFunction, 1000 * 60 * 1);
	};

	ComposePopupView.prototype.autosaveStop = function ()
	{
		window.clearTimeout(this.iTimer);
	};

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
		if (PgpStore.capaOpenPGP() && this.oEditor && !this.oEditor.isHtml())
		{
			var self = this;
			kn.showScreenPopup(require('View/Popup/ComposeOpenPgp'), [
				function (sResult) {
					self.editor(function (oEditor) {
						oEditor.setPlain(sResult);
					});
				},
				this.oEditor.getData(false, true),
				this.currentIdentity(),
				this.to(),
				this.cc(),
				this.bcc()
			]);
		}
	};

	ComposePopupView.prototype.reloadDraftFolder = function ()
	{
		var
			sDraftFolder = FolderStore.draftFolder()
		;

		if ('' !== sDraftFolder && Consts.Values.UnuseOptionValue !== sDraftFolder)
		{
			Cache.setFolderHash(sDraftFolder, '');
			if (FolderStore.currentFolderFullNameRaw() === sDraftFolder)
			{
				require('App/User').reloadMessageList(true);
			}
			else
			{
				require('App/User').folderInformation(sDraftFolder);
			}
		}
	};

	ComposePopupView.prototype.findIdentityByMessage = function (sComposeType, oMessage)
	{
		var
			aIdentities = IdentityStore.identities(),
			iResultIndex = 1000,
			oResultIdentity = null,
			oIdentitiesCache = {},

			fEachHelper = function (oItem) {

				if (oItem && oItem.email && oIdentitiesCache[oItem.email])
				{
					if (!oResultIdentity || iResultIndex > oIdentitiesCache[oItem.email][1])
					{
						oResultIdentity = oIdentitiesCache[oItem.email][0];
						iResultIndex = oIdentitiesCache[oItem.email][1];
					}
				}
			}
		;

		_.each(aIdentities, function (oItem, iIndex) {
			oIdentitiesCache[oItem.email()] = [oItem, iIndex];
		});

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
					_.each(_.union(oMessage.to, oMessage.cc, oMessage.bcc), fEachHelper);
					if (!oResultIdentity) {
						_.each(oMessage.deliveredTo, fEachHelper);
					}
					break;
				case Enums.ComposeType.Draft:
					_.each(_.union(oMessage.from, oMessage.replyTo), fEachHelper);
					break;
			}
		}

		return oResultIdentity || aIdentities[0] || null;
	};

	ComposePopupView.prototype.selectIdentity = function (oIdentity)
	{
		if (oIdentity && oIdentity.item)
		{
			this.currentIdentity(oIdentity.item);
			this.setSignatureFromIdentity(oIdentity.item);
		}
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
				this.savedErrorDesc(Utils.trim(Translator.i18n('COMPOSE/SAVED_ERROR_ON_SEND')));
			}
			else
			{
				sMessage = Translator.getNotification(oData && oData.ErrorCode ? oData.ErrorCode : Enums.Notification.CantSendMessage,
					oData && oData.ErrorMessage ? oData.ErrorMessage : '');

				this.sendError(true);
				this.sendErrorDesc(sMessage || Translator.getNotification(Enums.Notification.CantSendMessage));
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
				bResult = true;

				if (this.bFromDraft)
				{
					oMessage = MessageStore.message();
					if (oMessage && this.draftFolder() === oMessage.folderFullNameRaw && this.draftUid() === oMessage.uid)
					{
						MessageStore.message(null);
					}
				}

				this.draftFolder(oData.Result.NewFolder);
				this.draftUid(oData.Result.NewUid);

				this.savedTime(window.Math.round((new window.Date()).getTime() / 1000));

				if (this.bFromDraft)
				{
					Cache.setFolderHash(this.draftFolder(), '');
				}
			}
		}

		if (!bResult)
		{
			this.savedError(true);
			this.savedErrorDesc(Translator.getNotification(Enums.Notification.CantSaveMessage));
		}

		this.reloadDraftFolder();
	};

	ComposePopupView.prototype.onHide = function ()
	{
		this.autosaveStop();

		if (!this.bSkipNextHide)
		{
			AppStore.composeInEdit(false);
			this.reset();
		}

		this.bSkipNextHide = false;

		this.to.focused(false);

		kn.routeOn();
	};

	ComposePopupView.prototype.editor = function (fOnInit)
	{
		if (fOnInit)
		{
			var self = this;
			if (!this.oEditor && this.composeEditorArea())
			{
//_.delay(function () {
				self.oEditor = new HtmlEditor(self.composeEditorArea(), null, function () {
					fOnInit(self.oEditor);
					self.resizerTrigger();
				}, function (bHtml) {
					self.isHtml(!!bHtml);
				});
//}, 1000);
			}
			else if (this.oEditor)
			{
				fOnInit(this.oEditor);
				this.resizerTrigger();
			}
		}
	};

	ComposePopupView.prototype.converSignature = function (sSignature)
	{
		var
			iLimit = 10,
			oMatch = null,
			aMoments = [],
			oMomentRegx = /{{MOMENT:([^}]+)}}/g,
			sFrom = ''
		;

		sSignature = sSignature.replace(/[\r]/g, '');

		sFrom = this.oLastMessage ? this.emailArrayToStringLineHelper(this.oLastMessage.from, true) : '';
		if ('' !== sFrom)
		{
			sSignature = sSignature.replace(/{{FROM-FULL}}/g, sFrom);

			if (-1 === sFrom.indexOf(' ') && 0 < sFrom.indexOf('@'))
			{
				sFrom = sFrom.replace(/@[\S]+/, '');
			}

			sSignature = sSignature.replace(/{{FROM}}/g, sFrom);
		}

		sSignature = sSignature.replace(/[\s]{1,2}{{FROM}}/g, '{{FROM}}');
		sSignature = sSignature.replace(/[\s]{1,2}{{FROM-FULL}}/g, '{{FROM-FULL}}');

		sSignature = sSignature.replace(/{{FROM}}/g, '');
		sSignature = sSignature.replace(/{{FROM-FULL}}/g, '');

		if (-1 < sSignature.indexOf('{{DATE}}'))
		{
			sSignature = sSignature.replace(/{{DATE}}/g, Momentor.format(0, 'llll'));
		}

		if (-1 < sSignature.indexOf('{{TIME}}'))
		{
			sSignature = sSignature.replace(/{{TIME}}/g, Momentor.format(0, 'LT'));
		}
		if (-1 < sSignature.indexOf('{{MOMENT:'))
		{
			try
			{
				while ((oMatch = oMomentRegx.exec(sSignature)) !== null)
				{
					if (oMatch && oMatch[0] && oMatch[1])
					{
						aMoments.push([oMatch[0], oMatch[1]]);
					}

					iLimit--;
					if (0 === iLimit)
					{
						break;
					}
				}

				if (aMoments && 0 < aMoments.length)
				{
					_.each(aMoments, function (aData) {
						sSignature = sSignature.replace(
							aData[0], Momentor.format(0, aData[1]));
					});
				}

				sSignature = sSignature.replace(/{{MOMENT:[^}]+}}/g, '');
			}
			catch(e) {}
		}

		return sSignature;
	};

	ComposePopupView.prototype.setSignatureFromIdentity = function (oIdentity)
	{
		if (oIdentity)
		{
			var self = this;
			this.editor(function (oEditor) {
				var bHtml = false, sSignature = oIdentity.signature();
				if ('' !== sSignature)
				{
					if (':HTML:' === sSignature.substr(0, 6))
					{
						bHtml = true;
						sSignature = sSignature.substr(6);
					}
				}

				oEditor.setSignature(self.converSignature(sSignature),
					bHtml, !!oIdentity.signatureInsertBefore());
			});
		}
	};

	/**
	 * @param {string=} sType = Enums.ComposeType.Empty
	 * @param {?MessageModel|Array=} oMessageOrArray = null
	 * @param {Array=} aToEmails = null
	 * @param {Array=} aCcEmails = null
	 * @param {Array=} aBccEmails = null
	 * @param {string=} sCustomSubject = null
	 * @param {string=} sCustomPlainText = null
	 */
	ComposePopupView.prototype.onShow = function (sType, oMessageOrArray,
		aToEmails, aCcEmails, aBccEmails, sCustomSubject, sCustomPlainText)
	{
		kn.routeOff();

		this.autosaveStart();

		if (AppStore.composeInEdit())
		{
			sType = sType || Enums.ComposeType.Empty;

			var self = this;

			if (Enums.ComposeType.Empty !== sType)
			{
				kn.showScreenPopup(require('View/Popup/Ask'), [Translator.i18n('COMPOSE/DISCARD_UNSAVED_DATA'), function () {
					self.initOnShow(sType, oMessageOrArray, aToEmails, aCcEmails, aBccEmails, sCustomSubject, sCustomPlainText);
				}, null, null, null, false]);
			}
			else
			{
				this.addEmailsTo(this.to, aToEmails);
				this.addEmailsTo(this.cc, aCcEmails);
				this.addEmailsTo(this.bcc, aBccEmails);

				if (Utils.isNormal(sCustomSubject) && '' !== sCustomSubject &&
					'' === this.subject())
				{
					this.subject(sCustomSubject);
				}
			}
		}
		else
		{
			this.initOnShow(sType, oMessageOrArray, aToEmails, aCcEmails, aBccEmails, sCustomSubject, sCustomPlainText);
		}
	};

	/**
	 * @param {Function} fKoValue
	 * @param {Array} aEmails
	 */
	ComposePopupView.prototype.addEmailsTo = function (fKoValue, aEmails)
	{
		var
			sValue = Utils.trim(fKoValue()),
			aValue = []
		;

		if (Utils.isNonEmptyArray(aEmails))
		{
			aValue = _.uniq(_.compact(_.map(aEmails, function (oItem) {
				return oItem ? oItem.toLine(false) : null;
			})));

			fKoValue(sValue + ('' === sValue ? '' : ', ') + Utils.trim(aValue.join(', ')));
		}
	};

	/**
	 *
	 * @param {Array} aList
	 * @param {boolean} bFriendly
	 * @return {string}
	 */
	ComposePopupView.prototype.emailArrayToStringLineHelper = function (aList, bFriendly)
	{
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
	};

	/**
	 * @param {string=} sType = Enums.ComposeType.Empty
	 * @param {?MessageModel|Array=} oMessageOrArray = null
	 * @param {Array=} aToEmails = null
	 * @param {Array=} aCcEmails = null
	 * @param {Array=} aBccEmails = null
	 * @param {string=} sCustomSubject = null
	 * @param {string=} sCustomPlainText = null
	 */
	ComposePopupView.prototype.initOnShow = function (sType, oMessageOrArray,
		aToEmails, aCcEmails, aBccEmails, sCustomSubject, sCustomPlainText)
	{
		AppStore.composeInEdit(true);

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
			oIdentity = null,
			mEmail = AccountStore.email(),
			aDownloads = [],
			aDraftInfo = null,
			oMessage = null,
			sComposeType = sType || Enums.ComposeType.Empty
		;

		oMessageOrArray = oMessageOrArray || null;
		if (oMessageOrArray && Utils.isNormal(oMessageOrArray))
		{
			oMessage = Utils.isArray(oMessageOrArray) && 1 === oMessageOrArray.length ? oMessageOrArray[0] :
				(!Utils.isArray(oMessageOrArray) ? oMessageOrArray : null);
		}

		this.oLastMessage = oMessage;

		if (null !== mEmail)
		{
			oExcludeEmail[mEmail] = true;
		}

		this.reset();

		oIdentity = this.findIdentityByMessage(sComposeType, oMessage);
		if (oIdentity)
		{
			oExcludeEmail[oIdentity.email()] = true;
		}

		if (Utils.isNonEmptyArray(aToEmails))
		{
			this.to(this.emailArrayToStringLineHelper(aToEmails));
		}

		if (Utils.isNonEmptyArray(aCcEmails))
		{
			this.cc(this.emailArrayToStringLineHelper(aCcEmails));
		}

		if (Utils.isNonEmptyArray(aBccEmails))
		{
			this.bcc(this.emailArrayToStringLineHelper(aBccEmails));
		}

		if ('' !== sComposeType && oMessage)
		{
			sDate = Momentor.format(oMessage.dateTimeStampInUTC(), 'FULL');
			sSubject = oMessage.subject();
			aDraftInfo = oMessage.aDraftInfo;

			oText = $(oMessage.body).clone();
			if (oText)
			{
				oText.find('blockquote.rl-bq-switcher').removeClass('rl-bq-switcher hidden-bq');
				oText.find('.rlBlockquoteSwitcher').off('.rlBlockquoteSwitcher').remove();
				oText.find('[data-html-editor-font-wrapper]').removeAttr('data-html-editor-font-wrapper');

//				(function () {
//
//					var oTmp = null, iLimit = 0;
//
//					while (true)
//					{
//						iLimit++;
//
//						oTmp = oText.children();
//						if (10 > iLimit && oTmp.is('div') && 1 === oTmp.length)
//						{
//							oTmp.children().unwrap();
//							continue;
//						}
//
//						break;
//					}
//
//				}());

				sText = oText.html();
			}

			switch (sComposeType)
			{
				case Enums.ComposeType.Empty:
					break;

				case Enums.ComposeType.Reply:
					this.to(this.emailArrayToStringLineHelper(oMessage.replyEmails(oExcludeEmail)));
					this.subject(Utils.replySubjectAdd('Re', sSubject));
					this.prepearMessageAttachments(oMessage, sComposeType);
					this.aDraftInfo = ['reply', oMessage.uid, oMessage.folderFullNameRaw];
					this.sInReplyTo = oMessage.sMessageId;
					this.sReferences = Utils.trim(this.sInReplyTo + ' ' + oMessage.sReferences);
					break;

				case Enums.ComposeType.ReplyAll:
					aResplyAllParts = oMessage.replyAllEmails(oExcludeEmail);
					this.to(this.emailArrayToStringLineHelper(aResplyAllParts[0]));
					this.cc(this.emailArrayToStringLineHelper(aResplyAllParts[1]));
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
					this.to(this.emailArrayToStringLineHelper(oMessage.to));
					this.cc(this.emailArrayToStringLineHelper(oMessage.cc));
					this.bcc(this.emailArrayToStringLineHelper(oMessage.bcc));
					this.replyTo(this.emailArrayToStringLineHelper(oMessage.replyTo));

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
					this.to(this.emailArrayToStringLineHelper(oMessage.to));
					this.cc(this.emailArrayToStringLineHelper(oMessage.cc));
					this.bcc(this.emailArrayToStringLineHelper(oMessage.bcc));
					this.replyTo(this.emailArrayToStringLineHelper(oMessage.replyTo));

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
					sReplyTitle = Translator.i18n('COMPOSE/REPLY_MESSAGE_TITLE', {
						'DATETIME': sDate,
						'EMAIL': sFrom
					});

					sText = '<br /><br />' + sReplyTitle + ':' +
						'<blockquote>' + Utils.trim(sText) + '</blockquote>';
//						'<blockquote><p>' + Utils.trim(sText) + '</p></blockquote>';

					break;

				case Enums.ComposeType.Forward:
					sFrom = oMessage.fromToLine(false, true);
					sTo = oMessage.toToLine(false, true);
					sCc = oMessage.ccToLine(false, true);
					sText = '<br /><br />' + Translator.i18n('COMPOSE/FORWARD_MESSAGE_TOP_TITLE') +
							'<br />' + Translator.i18n('COMPOSE/FORWARD_MESSAGE_TOP_FROM') + ': ' + sFrom +
							'<br />' + Translator.i18n('COMPOSE/FORWARD_MESSAGE_TOP_TO') + ': ' + sTo +
							(0 < sCc.length ? '<br />' + Translator.i18n('COMPOSE/FORWARD_MESSAGE_TOP_CC') + ': ' + sCc : '') +
							'<br />' + Translator.i18n('COMPOSE/FORWARD_MESSAGE_TOP_SENT') + ': ' + Utils.encodeHtml(sDate) +
							'<br />' + Translator.i18n('COMPOSE/FORWARD_MESSAGE_TOP_SUBJECT') + ': ' + Utils.encodeHtml(sSubject) +
							'<br /><br />' + Utils.trim(sText) + '<br /><br />';
					break;

				case Enums.ComposeType.ForwardAsAttachment:
					sText = '';
					break;
			}

			this.editor(function (oEditor) {

				oEditor.setHtml(sText, false);

				if (Enums.EditorDefaultType.PlainForced === self.editorDefaultType() ||
					(!oMessage.isHtml() && Enums.EditorDefaultType.HtmlForced !== self.editorDefaultType()))
				{
					oEditor.modeToggle(false);
				}

				if (oIdentity && Enums.ComposeType.Draft !== sComposeType && Enums.ComposeType.EditAsNew !== sComposeType)
				{
					self.setSignatureFromIdentity(oIdentity);
				}

				self.setFocusInPopup();
			});
		}
		else if (Enums.ComposeType.Empty === sComposeType)
		{
			this.subject(Utils.isNormal(sCustomSubject) ? '' + sCustomSubject : '');

			sText = Utils.isNormal(sCustomPlainText) ? '' + sCustomPlainText : '';

			this.editor(function (oEditor) {

				oEditor.setHtml(sText, false);

				if (Enums.EditorDefaultType.Html !== self.editorDefaultType() &&
					Enums.EditorDefaultType.HtmlForced !== self.editorDefaultType())
				{
					oEditor.modeToggle(false);
				}

				if (oIdentity)
				{
					self.setSignatureFromIdentity(oIdentity);
				}

				self.setFocusInPopup();
			});
		}
		else if (Utils.isNonEmptyArray(oMessageOrArray))
		{
			_.each(oMessageOrArray, function (oMessage) {
				self.addMessageAsAttachment(oMessage);
			});

			this.editor(function (oEditor) {

				oEditor.setHtml('', false);

				if (Enums.EditorDefaultType.Html !== self.editorDefaultType() &&
					Enums.EditorDefaultType.HtmlForced !== self.editorDefaultType())
				{
					oEditor.modeToggle(false);
				}

				if (oIdentity && Enums.ComposeType.Draft !== sComposeType && Enums.ComposeType.EditAsNew !== sComposeType)
				{
					self.setSignatureFromIdentity(oIdentity);
				}

				self.setFocusInPopup();
			});
		}
		else
		{
			this.setFocusInPopup();
		}

		aDownloads = this.getAttachmentsDownloadsForUpload();
		if (Utils.isNonEmptyArray(aDownloads))
		{
			Remote.messageUploadAttachments(this.onMessageUploadAttachments, aDownloads);
		}

		if (oIdentity)
		{
			this.currentIdentity(oIdentity);
		}

		this.resizerTrigger();
	};

	ComposePopupView.prototype.onMessageUploadAttachments = function (sResult, oData)
	{
		if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
		{
			var
				oAttachment = null,
				sTempName = ''
			;

			if (!this.viewModelVisibility())
			{
				for (sTempName in oData.Result)
				{
					if (oData.Result.hasOwnProperty(sTempName))
					{
						oAttachment = this.getAttachmentById(oData.Result[sTempName]);
						if (oAttachment)
						{
							oAttachment.tempName(sTempName);
							oAttachment.waiting(false).uploading(false).complete(true);
						}
					}
				}
			}
		}
		else
		{
			this.setMessageAttachmentFailedDownloadText();
		}
	};

	ComposePopupView.prototype.setFocusInPopup = function ()
	{
		if (!Globals.bMobileDevice)
		{
			var self = this;
			_.delay(function () {

				if ('' === self.to())
				{
					self.to.focused(true);
				}
				else if (self.oEditor)
				{
					if (!self.to.focused())
					{
						self.oEditor.focus();
					}
				}

			}, 100);
		}
	};

	ComposePopupView.prototype.onShowWithDelay = function ()
	{
		this.resizerTrigger();
	};

	ComposePopupView.prototype.tryToClosePopup = function ()
	{
		var
			self = this,
			PopupsAskViewModel = require('View/Popup/Ask')
		;

		if (!kn.isPopupVisible(PopupsAskViewModel) && this.modalVisibility())
		{
			if (this.bSkipNextHide || (this.isEmptyForm() && !this.draftUid()))
			{
				Utils.delegateRun(self, 'closeCommand');
			}
			else
			{
				kn.showScreenPopup(PopupsAskViewModel, [Translator.i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'), function () {
					if (self.modalVisibility())
					{
						Utils.delegateRun(self, 'closeCommand');
					}
				}]);
			}
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

		if (this.allowFolders)
		{
			key('ctrl+s, command+s', Enums.KeyState.Compose, function () {
				self.saveCommand();
				return false;
			});
		}

		if (!!Settings.settingsGet('AllowCtrlEnterOnCompose'))
		{
			key('ctrl+enter, command+enter', Enums.KeyState.Compose, function () {
				self.sendCommand();
				return false;
			});
		}

		key('esc', Enums.KeyState.Compose, function () {
			if (self.modalVisibility())
			{
				self.tryToClosePopup();
			}
			return false;
		});

		Events.sub('window.resize.real', this.resizerTrigger);
		Events.sub('window.resize.real', _.debounce(this.resizerTrigger, 50));

		if (this.dropboxEnabled() && this.dropboxApiKey() && !window.Dropbox)
		{
			oScript = window.document.createElement('script');
			oScript.type = 'text/javascript';
			oScript.src = 'https://www.dropbox.com/static/api/2/dropins.js';
			$(oScript).attr('id', 'dropboxjs').attr('data-app-key', self.dropboxApiKey());

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

		window.setInterval(function () {
			if (self.modalVisibility() && self.oEditor)
			{
				self.oEditor.resize();
			}
		}, 5000);
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
						// .addView(window.google.picker.ViewId.FOLDERS)
						.addView(window.google.picker.ViewId.DOCS)
						.setAppId(Settings.settingsGet('GoogleClientID'))
						.setOAuthToken(oOauthToken.access_token)
						.setCallback(_.bind(self.driveCallback, self, oOauthToken.access_token))
						.enableFeature(window.google.picker.Feature.NAV_HIDDEN)
						// .setOrigin(window.location.protocol + '//' + window.location.host)
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

				var
					oAuthToken = window.gapi.auth.getToken(),
					fResult = function (oAuthResult) {
						if (oAuthResult && !oAuthResult.error)
						{
							var oAuthToken = window.gapi.auth.getToken();
							if (oAuthToken)
							{
								self.driveCreatePiker(oAuthToken);
							}

							return true;
						}

						return false;
					}
				;

				if (!oAuthToken)
				{
					window.gapi.auth.authorize({
						'client_id': Settings.settingsGet('GoogleClientID'),
						'scope': 'https://www.googleapis.com/auth/drive.readonly',
						'immediate': true
					}, function (oAuthResult) {

						if (!fResult(oAuthResult))
						{
							window.gapi.auth.authorize({
								'client_id': Settings.settingsGet('GoogleClientID'),
								'scope': 'https://www.googleapis.com/auth/drive.readonly',
								'immediate': false
							}, fResult);
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
						this.attachmentsPlace(true);
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
							oItem.progress(window.Math.floor(iLoaded / iTotal * 100));
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

						this.attachmentsPlace(true);

						if (0 < mSize && 0 < iAttachmentSizeLimit && iAttachmentSizeLimit < mSize)
						{
							oAttachment
								.waiting(false).uploading(true).complete(true)
								.error(Translator.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG'));

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
							oItem.waiting(false).uploading(true).complete(false);
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
							sError = Translator.getUploadErrorDescByCode(mErrorCode);
						}
						else if (!oAttachmentJson)
						{
							sError = Translator.i18n('UPLOAD/ERROR_UNKNOWN');
						}

						if (oAttachment)
						{
							if ('' !== sError && 0 < sError.length)
							{
								oAttachment
									.waiting(false)
									.uploading(false)
									.complete(true)
									.error(sError)
								;
							}
							else if (oAttachmentJson)
							{
								oAttachment
									.waiting(false)
									.uploading(false)
									.complete(true)
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
			oAttachment.waiting(false).uploading(true).complete(true);

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
		oAttachment.waiting(false).uploading(true).complete(false);

		this.attachments.push(oAttachment);

		this.attachmentsPlace(true);

		if (0 < mSize && 0 < iAttachmentSizeLimit && iAttachmentSizeLimit < mSize)
		{
			oAttachment.uploading(false).complete(true);
			oAttachment.error(Translator.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG'));
			return false;
		}

		Remote.composeUploadExternals(function (sResult, oData) {

			var bResult = false;
			oAttachment.uploading(false).complete(true);

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
				oAttachment.error(Translator.getUploadErrorDescByCode(Enums.UploadErrorCode.FileNoUploaded));
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
		oAttachment.waiting(false).uploading(true).complete(false);

		this.attachments.push(oAttachment);

		this.attachmentsPlace(true);

		if (0 < mSize && 0 < iAttachmentSizeLimit && iAttachmentSizeLimit < mSize)
		{
			oAttachment.uploading(false).complete(true);
			oAttachment.error(Translator.i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG'));
			return false;
		}

		Remote.composeUploadDrive(function (sResult, oData) {

			var bResult = false;
			oAttachment.uploading(false).complete(true);

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
				oAttachment.error(Translator.getUploadErrorDescByCode(Enums.UploadErrorCode.FileNoUploaded));
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
						oAttachment.waiting(false).uploading(true).complete(false);

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

	ComposePopupView.prototype.setMessageAttachmentFailedDownloadText = function ()
	{
		_.each(this.attachments(), function(oAttachment) {
			if (oAttachment && oAttachment.fromMessage)
			{
				oAttachment
					.waiting(false)
					.uploading(false)
					.complete(true)
					.error(Translator.getUploadErrorDescByCode(Enums.UploadErrorCode.FileNoUploaded))
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
		var bWithoutAttach = bIncludeAttachmentInProgress ?
			0 === this.attachments().length : 0 === this.attachmentsInReady().length;

		return 0 === this.to().length &&
			0 === this.cc().length &&
			0 === this.bcc().length &&
			0 === this.replyTo().length &&
			0 === this.subject().length &&
			bWithoutAttach &&
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

		this.requestDsn(false);
		this.requestReadReceipt(false);
		this.markAsImportant(false);

		this.attachmentsPlace(false);

		this.aDraftInfo = null;
		this.sInReplyTo = '';
		this.bFromDraft = false;
		this.sReferences = '';

		this.sendError(false);
		this.sendSuccessButSaveError(false);
		this.savedError(false);
		this.savedTime(0);
		this.emptyToError(false);
		this.attachmentsInProcessError(false);

		this.showCc(false);
		this.showBcc(false);
		this.showReplyTo(false);

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

	ComposePopupView.prototype.resizerTrigger = function ()
	{
		this.resizer(!this.resizer());
	};

	module.exports = ComposePopupView;

}());
