import ko from 'ko';

import {
	Capa,
	KeyState,
	ComposeType,
	StorageResultType,
	EditorDefaultType,
	Notification,
	SetSystemFoldersNotification,
	UploadErrorCode
} from 'Common/Enums';

import {
	isNonEmptyArray,
	replySubjectAdd,
	encodeHtml,
	inFocus,
	delegateRunOnDestroy,
	pInt
} from 'Common/Utils';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { upload } from 'Common/Links';
import { i18n, getNotification, getUploadErrorDescByCode } from 'Common/Translator';
import { format as momentorFormat } from 'Common/Momentor';
import { getMessageFlagsFromCache, setMessageFlagsToCache, setFolderHash } from 'Common/Cache';

import { HtmlEditor } from 'Common/HtmlEditor';
import { bMobileDevice } from 'Common/Globals';

import AppStore from 'Stores/User/App';
import SettingsStore from 'Stores/User/Settings';
import IdentityStore from 'Stores/User/Identity';
import AccountStore from 'Stores/User/Account';
import FolderStore from 'Stores/User/Folder';
import PgpStore from 'Stores/User/Pgp';
import MessageStore from 'Stores/User/Message';

import Remote from 'Remote/User/Ajax';

import * as Settings from 'Storage/Settings';

import { ComposeAttachmentModel } from 'Model/ComposeAttachment';

import { getApp } from 'Helper/Apps/User';

import { popup, command, isPopupVisible, showScreenPopup, hideScreenPopup, routeOn, routeOff } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/Compose',
	templateID: 'PopupsCompose'
})
class ComposePopupView extends AbstractViewNext {
	constructor() {
		super();

		const fEmailOutInHelper = (context, identity, name, isIn) => {
			if (identity && context && identity[name]() && (isIn ? true : context[name]())) {
				const identityEmail = identity[name]();
				let list = context[name]().trim().split(/[,]/);

				list = list.filter(email => {
					email = email.trim();
					return email && identityEmail.trim() !== email;
				});

				if (isIn) {
					list.push(identityEmail);
				}

				context[name](list.join(','));
			}
		};

		this.oLastMessage = null;
		this.oEditor = null;
		this.aDraftInfo = null;
		this.sInReplyTo = '';
		this.bFromDraft = false;
		this.sReferences = '';

		this.sLastFocusedField = 'to';

		this.allowContacts = !!AppStore.contactsIsAllowed();
		this.allowFolders = !!Settings.capa(Capa.Folders);

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

		// this.to.subscribe((v) => console.log(v));

		ko.computed(() => {
			switch (true) {
				case this.to.focused():
					this.sLastFocusedField = 'to';
					break;
				case this.cc.focused():
					this.sLastFocusedField = 'cc';
					break;
				case this.bcc.focused():
					this.sLastFocusedField = 'bcc';
					break;
				// no default
			}
		}).extend({ notify: 'always' });

		this.subject = ko.observable('');
		this.subject.focused = ko.observable(false);

		this.isHtml = ko.observable(false);

		this.requestDsn = ko.observable(false);
		this.requestReadReceipt = ko.observable(false);
		this.markAsImportant = ko.observable(false);

		this.sendError = ko.observable(false);
		this.sendSuccessButSaveError = ko.observable(false);
		this.savedError = ko.observable(false);

		this.sendButtonSuccess = ko.computed(() => !this.sendError() && !this.sendSuccessButSaveError());

		this.sendErrorDesc = ko.observable('');
		this.savedErrorDesc = ko.observable('');

		this.sendError.subscribe(value => !value && this.sendErrorDesc(''));

		this.savedError.subscribe(value => !value && this.savedErrorDesc(''));

		this.sendSuccessButSaveError.subscribe(value => !value && this.savedErrorDesc(''));

		this.savedTime = ko.observable(0);
		this.savedTimeText = ko.computed(() =>
			this.savedTime()
				? i18n('COMPOSE/SAVED_TIME', { 'TIME': this.savedTime().format('LT') })
				: ''
		);

		this.emptyToError = ko.observable(false);
		this.emptyToErrorTooltip = ko.computed(() => (this.emptyToError() ? i18n('COMPOSE/EMPTY_TO_ERROR_DESC') : ''));

		this.attachmentsInProcessError = ko.observable(false);
		this.attachmentsInErrorError = ko.observable(false);

		this.attachmentsErrorTooltip = ko.computed(() => {
			let result = '';
			switch (true) {
				case this.attachmentsInProcessError():
					result = i18n('COMPOSE/ATTACHMENTS_UPLOAD_ERROR_DESC');
					break;
				case this.attachmentsInErrorError():
					result = i18n('COMPOSE/ATTACHMENTS_ERROR_DESC');
					break;
				// no default
			}
			return result;
		});

		this.showCc = ko.observable(false);
		this.showBcc = ko.observable(false);
		this.showReplyTo = ko.observable(false);

		this.cc.subscribe((value) => {
			if (false === this.showCc() && value.length) {
				this.showCc(true);
			}
		});

		this.bcc.subscribe((value) => {
			if (false === this.showBcc() && value.length) {
				this.showBcc(true);
			}
		});

		this.replyTo.subscribe((value) => {
			if (false === this.showReplyTo() && value.length) {
				this.showReplyTo(true);
			}
		});

		this.draftFolder = ko.observable('');
		this.draftUid = ko.observable('');
		this.sending = ko.observable(false);
		this.saving = ko.observable(false);
		this.attachments = ko.observableArray([]);

		this.attachmentsInProcess = ko.computed(() => this.attachments().filter(item => item && !item.complete()));
		this.attachmentsInReady = ko.computed(() => this.attachments().filter(item => item && item.complete()));
		this.attachmentsInError = ko.computed(() => this.attachments().filter(item => item && item.error()));

		this.attachmentsCount = ko.computed(() => this.attachments().length);
		this.attachmentsInErrorCount = ko.computed(() => this.attachmentsInError().length);
		this.attachmentsInProcessCount = ko.computed(() => this.attachmentsInProcess().length);
		this.isDraftFolderMessage = ko.computed(() => this.draftFolder() && this.draftUid());

		this.attachmentsPlace = ko.observable(false);

		this.attachmentsInErrorCount.subscribe((value) => {
			if (0 === value) {
				this.attachmentsInErrorError(false);
			}
		});

		this.composeUploaderButton = ko.observable(null);
		this.composeUploaderDropPlace = ko.observable(null);
		this.dragAndDropEnabled = ko.observable(false);
		this.dragAndDropOver = ko.observable(false).extend({ throttle: 1 });
		this.dragAndDropVisible = ko.observable(false).extend({ throttle: 1 });
		this.attacheMultipleAllowed = ko.observable(false);
		this.addAttachmentEnabled = ko.observable(false);

		this.composeEditorArea = ko.observable(null);

		this.identities = IdentityStore.identities;
		this.identitiesOptions = ko.computed(() =>
			IdentityStore.identities().map(item => ({
				'item': item,
				'optValue': item.id(),
				'optText': item.formattedName()
			}))
		);

		this.currentIdentity = ko.observable(this.identities()[0] ? this.identities()[0] : null);

		this.currentIdentity.extend({
			toggleSubscribe: [
				this,
				(identity) => {
					fEmailOutInHelper(this, identity, 'bcc');
					fEmailOutInHelper(this, identity, 'replyTo');
				},
				(identity) => {
					fEmailOutInHelper(this, identity, 'bcc', true);
					fEmailOutInHelper(this, identity, 'replyTo', true);
				}
			]
		});

		this.currentIdentityView = ko.computed(() => {
			const item = this.currentIdentity();
			return item ? item.formattedName() : 'unknown';
		});

		this.to.subscribe((value) => {
			if (this.emptyToError() && value.length) {
				this.emptyToError(false);
			}
		});

		this.attachmentsInProcess.subscribe(value => {
			if (this.attachmentsInProcessError() && isNonEmptyArray(value)) {
				this.attachmentsInProcessError(false);
			}
		});

		this.canBeSentOrSaved = ko.computed(() => !this.sending() && !this.saving());

		setInterval(() => {
			if (
				this.modalVisibility() &&
				!FolderStore.draftFolderNotEnabled() &&
				SettingsStore.allowDraftAutosave() &&
				!this.isEmptyForm(false) &&
				!this.saving() &&
				!this.sending() &&
				!this.savedError()
			) {
				this.saveCommand();
			}
		}, 120000);

		this.bDisabeCloseOnEsc = true;
		this.sDefaultKeyScope = KeyState.Compose;

		this.tryToClosePopup = this.tryToClosePopup.debounce(200);

		this.iTimer = 0;

		this.resizeObserver = new ResizeObserver(this.resizerTrigger.throttle(50).bind(this));
	}

	getMessageRequestParams(sSaveFolder)
	{
		return {
			IdentityID: this.currentIdentity() ? this.currentIdentity().id() : '',
			MessageFolder: this.draftFolder(),
			MessageUid: this.draftUid(),
			SaveFolder: sSaveFolder,
			To: this.to(),
			Cc: this.cc(),
			Bcc: this.bcc(),
			ReplyTo: this.replyTo(),
			Subject: this.subject(),
			TextIsHtml: this.oEditor && this.oEditor.isHtml() ? 1 : 0,
			Text: this.oEditor ? this.oEditor.getData(true) : '',
			DraftInfo: this.aDraftInfo,
			InReplyTo: this.sInReplyTo,
			References: this.sReferences,
			MarkAsImportant: this.markAsImportant() ? 1 : 0,
			Attachments: this.prepearAttachmentsForSendOrSave(),
			// Only used at send, not at save:
			Dsn: this.requestDsn() ? 1 : 0,
			ReadReceiptRequest: this.requestReadReceipt() ? 1 : 0
		};
	}

	@command((self) => self.canBeSentOrSaved())
	sendCommand() {
		let sSentFolder = FolderStore.sentFolder();

		this.attachmentsInProcessError(false);
		this.attachmentsInErrorError(false);
		this.emptyToError(false);

		if (this.attachmentsInProcess().length) {
			this.attachmentsInProcessError(true);
			this.attachmentsPlace(true);
		} else if (this.attachmentsInError().length) {
			this.attachmentsInErrorError(true);
			this.attachmentsPlace(true);
		}

		if (!this.to().trim() && !this.cc().trim() && !this.bcc().trim()) {
			this.emptyToError(true);
		}

		if (!this.emptyToError() && !this.attachmentsInErrorError() && !this.attachmentsInProcessError()) {
			if (SettingsStore.replySameFolder()) {
				if (
					Array.isArray(this.aDraftInfo) &&
					3 === this.aDraftInfo.length &&
					null != this.aDraftInfo[2] &&
					this.aDraftInfo[2].length
				) {
					sSentFolder = this.aDraftInfo[2];
				}
			}

			if (!this.allowFolders) {
				sSentFolder = UNUSED_OPTION_VALUE;
			}

			if (!sSentFolder) {
				showScreenPopup(require('View/Popup/FolderSystem'), [SetSystemFoldersNotification.Sent]);
			} else {
				this.sendError(false);
				this.sending(true);

				if (Array.isArray(this.aDraftInfo) && 3 === this.aDraftInfo.length) {
					const flagsCache = getMessageFlagsFromCache(this.aDraftInfo[2], this.aDraftInfo[1]);
					if (flagsCache) {
						if ('forward' === this.aDraftInfo[0]) {
							flagsCache[3] = true;
						} else {
							flagsCache[2] = true;
						}

						setMessageFlagsToCache(this.aDraftInfo[2], this.aDraftInfo[1], flagsCache);
						getApp().reloadFlagsCurrentMessageListAndMessageFromCache();
						setFolderHash(this.aDraftInfo[2], '');
					}
				}

				sSentFolder = UNUSED_OPTION_VALUE === sSentFolder ? '' : sSentFolder;

				setFolderHash(this.draftFolder(), '');
				setFolderHash(sSentFolder, '');

				Remote.sendMessage(
					this.sendMessageResponse.bind(this),
					this.getMessageRequestParams(sSentFolder)
				);
			}
		}
	}

	@command((self) => self.canBeSentOrSaved())
	saveCommand() {
		if (!this.allowFolders) {
			return false;
		}

		if (FolderStore.draftFolderNotEnabled()) {
			showScreenPopup(require('View/Popup/FolderSystem'), [SetSystemFoldersNotification.Draft]);
		} else {
			this.savedError(false);
			this.saving(true);

			this.autosaveStart();

			setFolderHash(FolderStore.draftFolder(), '');

			Remote.saveMessage(
				this.saveMessageResponse.bind(this),
				this.getMessageRequestParams(FolderStore.draftFolder())
			);
		}

		return true;
	}

	@command((self) => self.isDraftFolderMessage())
	deleteCommand() {
		const PopupsAskViewModel = require('View/Popup/Ask');
		if (!isPopupVisible(PopupsAskViewModel) && this.modalVisibility()) {
			showScreenPopup(PopupsAskViewModel, [
				i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'),
				() => {
					if (this.modalVisibility()) {
						getApp().deleteMessagesFromFolderWithoutCheck(this.draftFolder(), [this.draftUid()]);
						hideScreenPopup(ComposePopupView);
					}
				}
			]);
		}
	}

	@command((self) => self.canBeSentOrSaved())
	skipCommand() {
		this.bSkipNextHide = true;

		if (
			this.modalVisibility() &&
			!this.saving() &&
			!this.sending() &&
			!FolderStore.draftFolderNotEnabled() &&
			SettingsStore.allowDraftAutosave()
		) {
			this.saveCommand();
		}

		this.tryToClosePopup();
	}

	@command((self) => self.allowContacts)
	contactsCommand() {
		if (this.allowContacts) {
			this.skipCommand();
			setTimeout(() => {
				showScreenPopup(require('View/Popup/Contacts'), [true, this.sLastFocusedField]);
			}, 200);
		}
	}

	autosaveFunction() {
		if (
			this.modalVisibility() &&
			!FolderStore.draftFolderNotEnabled() &&
			SettingsStore.allowDraftAutosave() &&
			!this.isEmptyForm(false) &&
			!this.saving() &&
			!this.sending() &&
			!this.savedError()
		) {
			this.saveCommand();
		}

		this.autosaveStart();
	}

	autosaveStart() {
		clearTimeout(this.iTimer);
		this.iTimer = setTimeout(()=>this.autosaveFunction(), 60000);
	}

	autosaveStop() {
		clearTimeout(this.iTimer);
	}

	emailsSource(oData, fResponse) {
		getApp().getAutocomplete(oData.term, aData => fResponse(aData.map(oEmailItem => oEmailItem.toLine(false))));
	}

	openOpenPgpPopup() {
		if (PgpStore.capaOpenPGP() && this.oEditor && !this.oEditor.isHtml()) {
			showScreenPopup(require('View/Popup/ComposeOpenPgp'), [
				(result) => {
					this.editor((editor) => {
						editor.setPlain(result);
					});
				},
				this.oEditor.getData(false),
				this.currentIdentity(),
				this.to(),
				this.cc(),
				this.bcc()
			]);
		}
	}

	reloadDraftFolder() {
		const draftFolder = FolderStore.draftFolder();
		if (draftFolder && UNUSED_OPTION_VALUE !== draftFolder) {
			setFolderHash(draftFolder, '');
			if (FolderStore.currentFolderFullNameRaw() === draftFolder) {
				getApp().reloadMessageList(true);
			} else {
				getApp().folderInformation(draftFolder);
			}
		}
	}

	findIdentityByMessage(composeType, message) {
		let resultIndex = 1000,
			resultIdentity = null;
		const identities = IdentityStore.identities(),
			identitiesCache = {},
			fEachHelper = (item) => {
				if (item && item.email && identitiesCache[item.email]) {
					if (!resultIdentity || resultIndex > identitiesCache[item.email][1]) {
						resultIdentity = identitiesCache[item.email][0];
						resultIndex = identitiesCache[item.email][1];
					}
				}
			};

		identities.forEach((item, index) => {
			identitiesCache[item.email()] = [item, index];
		});

		if (message) {
			switch (composeType) {
				case ComposeType.Empty:
					break;
				case ComposeType.Reply:
				case ComposeType.ReplyAll:
				case ComposeType.Forward:
				case ComposeType.ForwardAsAttachment:
					message.to.concat(message.cc, message.bcc).forEach(fEachHelper);
					if (!resultIdentity) {
						message.deliveredTo.forEach(fEachHelper);
					}
					break;
				case ComposeType.Draft:
					message.from.concat(message.replyTo).forEach(fEachHelper);
					break;
				// no default
			}
		}

		return resultIdentity || identities[0] || null;
	}

	selectIdentity(identity) {
		if (identity && identity.item) {
			this.currentIdentity(identity.item);
			this.setSignatureFromIdentity(identity.item);
		}
	}

	sendMessageResponse(statusResult, data) {
		let result = false,
			message = '';

		this.sending(false);

		if (StorageResultType.Success === statusResult && data && data.Result) {
			result = true;
			this.modalVisibility() && this.closeCommand && this.closeCommand();
		}

		if (this.modalVisibility() && !result) {
			if (data && Notification.CantSaveMessage === data.ErrorCode) {
				this.sendSuccessButSaveError(true);
				this.savedErrorDesc(i18n('COMPOSE/SAVED_ERROR_ON_SEND').trim());
			} else {
				message = getNotification(
					data && data.ErrorCode ? data.ErrorCode : Notification.CantSendMessage,
					data && data.ErrorMessage ? data.ErrorMessage : ''
				);

				this.sendError(true);
				this.sendErrorDesc(message || getNotification(Notification.CantSendMessage));
			}
		}

		this.reloadDraftFolder();
	}

	saveMessageResponse(statusResult, oData) {
		let result = false;

		this.saving(false);

		if (StorageResultType.Success === statusResult && oData && oData.Result) {
			if (oData.Result.NewFolder && oData.Result.NewUid) {
				result = true;

				if (this.bFromDraft) {
					const message = MessageStore.message();
					if (message && this.draftFolder() === message.folderFullNameRaw && this.draftUid() === message.uid) {
						MessageStore.message(null);
					}
				}

				this.draftFolder(oData.Result.NewFolder);
				this.draftUid(oData.Result.NewUid);

				this.savedTime(new Date);

				if (this.bFromDraft) {
					setFolderHash(this.draftFolder(), '');
				}
			}
		}

		if (!result) {
			this.savedError(true);
			this.savedErrorDesc(getNotification(Notification.CantSaveMessage));
		}

		this.reloadDraftFolder();
	}

	onHide() {
		this.autosaveStop();

		if (!this.bSkipNextHide) {
			AppStore.composeInEdit(false);
			this.reset();
		}

		this.bSkipNextHide = false;

		this.to.focused(false);

		routeOn();

		this.resizeObserver.disconnect();
	}

	editor(fOnInit) {
		if (fOnInit) {
			if (!this.oEditor && this.composeEditorArea()) {
				// setTimeout(() => {
				this.oEditor = new HtmlEditor(
					this.composeEditorArea(),
					null,
					() => {
						fOnInit(this.oEditor);
					},
					(bHtml) => {
						this.isHtml(!!bHtml);
					}
				);
				// }, 1000);
			} else if (this.oEditor) {
				fOnInit(this.oEditor);
			}
		}
	}

	converSignature(signature) {
		signature = signature.replace(/[\r]/g, '');

		let fromLine = this.oLastMessage ? this.emailArrayToStringLineHelper(this.oLastMessage.from, true) : '';
		if (fromLine) {
			signature = signature.replace(/{{FROM-FULL}}/g, fromLine);

			if (!fromLine.includes(' ') && 0 < fromLine.indexOf('@')) {
				fromLine = fromLine.replace(/@[\S]+/, '');
			}

			signature = signature.replace(/{{FROM}}/g, fromLine);
		}

		signature = signature.replace(/[\s]{1,2}{{FROM}}/g, '{{FROM}}');
		signature = signature.replace(/[\s]{1,2}{{FROM-FULL}}/g, '{{FROM-FULL}}');

		signature = signature.replace(/{{FROM}}/g, '');
		signature = signature.replace(/{{FROM-FULL}}/g, '');

		if (signature.includes('{{DATE}}')) {
			signature = signature.replace(/{{DATE}}/g, new Date().format('LLLL'));
		}

		if (signature.includes('{{TIME}}')) {
			signature = signature.replace(/{{TIME}}/g, new Date().format('LT'));
		}

		signature = signature.replace(/{{MOMENT:[^}]+}}/g, '');

		return signature;
	}

	setSignatureFromIdentity(identity) {
		if (identity) {
			this.editor((editor) => {
				let isHtml = false,
					signature = identity.signature();

				if (signature) {
					if (':HTML:' === signature.substr(0, 6)) {
						isHtml = true;
						signature = signature.substr(6);
					}
				}

				editor.setSignature(this.converSignature(signature), isHtml, !!identity.signatureInsertBefore());
			});
		}
	}

	/**
	 * @param {string=} type = ComposeType.Empty
	 * @param {?MessageModel|Array=} oMessageOrArray = null
	 * @param {Array=} aToEmails = null
	 * @param {Array=} aCcEmails = null
	 * @param {Array=} aBccEmails = null
	 * @param {string=} sCustomSubject = null
	 * @param {string=} sCustomPlainText = null
	 */
	onShow(type, oMessageOrArray, aToEmails, aCcEmails, aBccEmails, sCustomSubject, sCustomPlainText) {
		routeOff();

		this.autosaveStart();

		if (AppStore.composeInEdit()) {
			type = type || ComposeType.Empty;
			if (ComposeType.Empty !== type) {
				showScreenPopup(require('View/Popup/Ask'), [
					i18n('COMPOSE/DISCARD_UNSAVED_DATA'),
					() => {
						this.initOnShow(type, oMessageOrArray, aToEmails, aCcEmails, aBccEmails, sCustomSubject, sCustomPlainText);
					},
					null,
					null,
					null,
					false
				]);
			} else {
				this.addEmailsTo(this.to, aToEmails);
				this.addEmailsTo(this.cc, aCcEmails);
				this.addEmailsTo(this.bcc, aBccEmails);

				if (sCustomSubject && !this.subject()) {
					this.subject(sCustomSubject);
				}
			}
		} else {
			this.initOnShow(type, oMessageOrArray, aToEmails, aCcEmails, aBccEmails, sCustomSubject, sCustomPlainText);
		}
	}

	onWarmUp() {
		if (this.modalVisibility && !this.modalVisibility()) {
			this.editor((editor) => editor.modeToggle(false));
		}
	}

	/**
	 * @param {Function} fKoValue
	 * @param {Array} emails
	 */
	addEmailsTo(fKoValue, emails) {
		if (isNonEmptyArray(emails)) {
			const value = fKoValue().trim(),
				values = emails.map(item => item ? item.toLine(false) : null)
					.filter((value, index, self) => !!value && self.indexOf(value) == index);

			fKoValue(value + (value ? ', ' :  '') + values.join(', ').trim());
		}
	}

	/**
	 *
	 * @param {Array} aList
	 * @param {boolean} bFriendly
	 * @returns {string}
	 */
	emailArrayToStringLineHelper(aList, bFriendly) {
		bFriendly = !!bFriendly;
		return aList.map(item => item.toLine(bFriendly)).join(', ');
	}

	/**
	 * @param {string=} sType = ComposeType.Empty
	 * @param {?MessageModel|Array=} oMessageOrArray = null
	 * @param {Array=} aToEmails = null
	 * @param {Array=} aCcEmails = null
	 * @param {Array=} aBccEmails = null
	 * @param {string=} sCustomSubject = null
	 * @param {string=} sCustomPlainText = null
	 */
	initOnShow(sType, oMessageOrArray, aToEmails, aCcEmails, aBccEmails, sCustomSubject, sCustomPlainText) {
		AppStore.composeInEdit(true);

		let sFrom = '',
			sTo = '',
			sCc = '',
			sDate = '',
			sSubject = '',
			sText = '',
			sReplyTitle = '',
			identity = null,
			aDraftInfo = null,
			message = null;

		const excludeEmail = {},
			mEmail = AccountStore.email(),
			lineComposeType = sType || ComposeType.Empty;

		oMessageOrArray = oMessageOrArray || null;
		if (oMessageOrArray) {
			message =
				Array.isArray(oMessageOrArray) && 1 === oMessageOrArray.length
					? oMessageOrArray[0]
					: !Array.isArray(oMessageOrArray)
					? oMessageOrArray
					: null;
		}

		this.oLastMessage = message;

		if (null !== mEmail) {
			excludeEmail[mEmail] = true;
		}

		this.reset();

		identity = this.findIdentityByMessage(lineComposeType, message);
		if (identity) {
			excludeEmail[identity.email()] = true;
		}

		if (isNonEmptyArray(aToEmails)) {
			this.to(this.emailArrayToStringLineHelper(aToEmails));
		}

		if (isNonEmptyArray(aCcEmails)) {
			this.cc(this.emailArrayToStringLineHelper(aCcEmails));
		}

		if (isNonEmptyArray(aBccEmails)) {
			this.bcc(this.emailArrayToStringLineHelper(aBccEmails));
		}

		if (lineComposeType && message) {
			sDate = momentorFormat(message.dateTimeStampInUTC(), 'FULL');
			sSubject = message.subject();
			aDraftInfo = message.aDraftInfo;
			sText = message.bodyAsHTML();

			let resplyAllParts = null;
			switch (lineComposeType) {
				case ComposeType.Empty:
					break;

				case ComposeType.Reply:
					this.to(this.emailArrayToStringLineHelper(message.replyEmails(excludeEmail)));
					this.subject(replySubjectAdd('Re', sSubject));
					this.prepearMessageAttachments(message, lineComposeType);
					this.aDraftInfo = ['reply', message.uid, message.folderFullNameRaw];
					this.sInReplyTo = message.sMessageId;
					this.sReferences = (this.sInReplyTo + ' ' + message.sReferences).trim();
					break;

				case ComposeType.ReplyAll:
					resplyAllParts = message.replyAllEmails(excludeEmail);
					this.to(this.emailArrayToStringLineHelper(resplyAllParts[0]));
					this.cc(this.emailArrayToStringLineHelper(resplyAllParts[1]));
					this.subject(replySubjectAdd('Re', sSubject));
					this.prepearMessageAttachments(message, lineComposeType);
					this.aDraftInfo = ['reply', message.uid, message.folderFullNameRaw];
					this.sInReplyTo = message.sMessageId;
					this.sReferences = (this.sInReplyTo + ' ' + message.references()).trim();
					break;

				case ComposeType.Forward:
					this.subject(replySubjectAdd('Fwd', sSubject));
					this.prepearMessageAttachments(message, lineComposeType);
					this.aDraftInfo = ['forward', message.uid, message.folderFullNameRaw];
					this.sInReplyTo = message.sMessageId;
					this.sReferences = (this.sInReplyTo + ' ' + message.sReferences).trim();
					break;

				case ComposeType.ForwardAsAttachment:
					this.subject(replySubjectAdd('Fwd', sSubject));
					this.prepearMessageAttachments(message, lineComposeType);
					this.aDraftInfo = ['forward', message.uid, message.folderFullNameRaw];
					this.sInReplyTo = message.sMessageId;
					this.sReferences = (this.sInReplyTo + ' ' + message.sReferences).trim();
					break;

				case ComposeType.Draft:
					this.to(this.emailArrayToStringLineHelper(message.to));
					this.cc(this.emailArrayToStringLineHelper(message.cc));
					this.bcc(this.emailArrayToStringLineHelper(message.bcc));
					this.replyTo(this.emailArrayToStringLineHelper(message.replyTo));

					this.bFromDraft = true;

					this.draftFolder(message.folderFullNameRaw);
					this.draftUid(message.uid);

					this.subject(sSubject);
					this.prepearMessageAttachments(message, lineComposeType);

					this.aDraftInfo = isNonEmptyArray(aDraftInfo) && 3 === aDraftInfo.length ? aDraftInfo : null;
					this.sInReplyTo = message.sInReplyTo;
					this.sReferences = message.sReferences;
					break;

				case ComposeType.EditAsNew:
					this.to(this.emailArrayToStringLineHelper(message.to));
					this.cc(this.emailArrayToStringLineHelper(message.cc));
					this.bcc(this.emailArrayToStringLineHelper(message.bcc));
					this.replyTo(this.emailArrayToStringLineHelper(message.replyTo));

					this.subject(sSubject);
					this.prepearMessageAttachments(message, lineComposeType);

					this.aDraftInfo = isNonEmptyArray(aDraftInfo) && 3 === aDraftInfo.length ? aDraftInfo : null;
					this.sInReplyTo = message.sInReplyTo;
					this.sReferences = message.sReferences;
					break;
				// no default
			}

			switch (lineComposeType) {
				case ComposeType.Reply:
				case ComposeType.ReplyAll:
					sFrom = message.fromToLine(false, true);
					sReplyTitle = i18n('COMPOSE/REPLY_MESSAGE_TITLE', {
						'DATETIME': sDate,
						'EMAIL': sFrom
					});

					sText = '<br /><br />' + sReplyTitle + ':' + '<br /><br />' + '<blockquote>' + sText.trim() + '</blockquote>';

					break;

				case ComposeType.Forward:
					sFrom = message.fromToLine(false, true);
					sTo = message.toToLine(false, true);
					sCc = message.ccToLine(false, true);
					sText =
						'<br /><br />' +
						i18n('COMPOSE/FORWARD_MESSAGE_TOP_TITLE') +
						'<br />' +
						i18n('COMPOSE/FORWARD_MESSAGE_TOP_FROM') +
						': ' +
						sFrom +
						'<br />' +
						i18n('COMPOSE/FORWARD_MESSAGE_TOP_TO') +
						': ' +
						sTo +
						(sCc.length ? '<br />' + i18n('COMPOSE/FORWARD_MESSAGE_TOP_CC') + ': ' + sCc : '') +
						'<br />' +
						i18n('COMPOSE/FORWARD_MESSAGE_TOP_SENT') +
						': ' +
						encodeHtml(sDate) +
						'<br />' +
						i18n('COMPOSE/FORWARD_MESSAGE_TOP_SUBJECT') +
						': ' +
						encodeHtml(sSubject) +
						'<br /><br />' +
						sText.trim() +
						'<br /><br />';
					break;

				case ComposeType.ForwardAsAttachment:
					sText = '';
					break;
				// no default
			}

			this.editor((editor) => {
				editor.setHtml(sText, false);

				if (
					EditorDefaultType.PlainForced === this.editorDefaultType() ||
					(!message.isHtml() && EditorDefaultType.HtmlForced !== this.editorDefaultType())
				) {
					editor.modeToggle(false);
				}

				if (identity && ComposeType.Draft !== lineComposeType && ComposeType.EditAsNew !== lineComposeType) {
					this.setSignatureFromIdentity(identity);
				}

				this.setFocusInPopup();
			});
		} else if (ComposeType.Empty === lineComposeType) {
			this.subject(null != sCustomSubject ? '' + sCustomSubject : '');

			sText = null != sCustomPlainText ? '' + sCustomPlainText : '';

			this.editor((editor) => {
				editor.setHtml(sText, false);

				if (
					EditorDefaultType.Html !== this.editorDefaultType() &&
					EditorDefaultType.HtmlForced !== this.editorDefaultType()
				) {
					editor.modeToggle(false);
				}

				if (identity) {
					this.setSignatureFromIdentity(identity);
				}

				this.setFocusInPopup();
			});
		} else if (isNonEmptyArray(oMessageOrArray)) {
			oMessageOrArray.forEach(item => {
				this.addMessageAsAttachment(item);
			});

			this.editor((editor) => {
				editor.setHtml('', false);

				if (
					EditorDefaultType.Html !== this.editorDefaultType() &&
					EditorDefaultType.HtmlForced !== this.editorDefaultType()
				) {
					editor.modeToggle(false);
				}

				if (identity && ComposeType.Draft !== lineComposeType && ComposeType.EditAsNew !== lineComposeType) {
					this.setSignatureFromIdentity(identity);
				}

				this.setFocusInPopup();
			});
		} else {
			this.setFocusInPopup();
		}

		const downloads = this.getAttachmentsDownloadsForUpload();
		if (isNonEmptyArray(downloads)) {
			Remote.messageUploadAttachments(()=>this.onMessageUploadAttachments(), downloads);
		}

		if (identity) {
			this.currentIdentity(identity);
		}

		let el = document.querySelector('.b-compose');
		this.resizeObserver.compose = el;
		this.resizeObserver.popups = el.parentNode; // el.closest('.popups');
		this.resizeObserver.els = [el.querySelector('.textAreaParent'), el.querySelector('.attachmentAreaParent')];
		this.resizeObserver.observe(el);
		this.resizeObserver.observe(el.querySelector('.b-header'));
	}

	onMessageUploadAttachments(sResult, oData) {
		if (StorageResultType.Success === sResult && oData && oData.Result) {
			if (!this.viewModelVisibility()) {
				oData.Result.forEach((id, tempName) => {
					const attachment = this.getAttachmentById(id);
					if (attachment) {
						attachment.tempName(tempName);
						attachment
							.waiting(false)
							.uploading(false)
							.complete(true);
					}
				});
			}
		} else {
			this.setMessageAttachmentFailedDownloadText();
		}
	}

	setFocusInPopup() {
		if (!bMobileDevice) {
			setTimeout(() => {
				if (!this.to()) {
					this.to.focused(true);
				} else if (this.oEditor) {
					if (!this.to.focused()) {
						this.oEditor.focus();
					}
				}
			}, 100);
		}
	}

	tryToClosePopup() {
		const PopupsAskViewModel = require('View/Popup/Ask');
		if (!isPopupVisible(PopupsAskViewModel) && this.modalVisibility()) {
			if (this.bSkipNextHide || (this.isEmptyForm() && !this.draftUid())) {
				this.closeCommand && this.closeCommand();
			} else {
				showScreenPopup(PopupsAskViewModel, [
					i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'),
					() => {
						if (this.modalVisibility()) {
							this.closeCommand && this.closeCommand();
						}
					}
				]);
			}
		}
	}

	onBuild() {
		this.initUploader();

		key('ctrl+q, command+q, ctrl+w, command+w', KeyState.Compose, ()=>false);

		key('`', KeyState.Compose, () => {
			if (this.oEditor && !this.oEditor.hasFocus() && !inFocus()) {
				this.identitiesDropdownTrigger(true);
				return false;
			}

			return true;
		});

		key('ctrl+`', KeyState.Compose, () => {
			this.identitiesDropdownTrigger(true);
			return false;
		});

		key('esc, ctrl+down, command+down', KeyState.Compose, () => {
			this.skipCommand();
			return false;
		});

		if (this.allowFolders) {
			key('ctrl+s, command+s', KeyState.Compose, () => {
				this.saveCommand();
				return false;
			});
		}

		if (Settings.appSettingsGet('allowCtrlEnterOnCompose')) {
			key('ctrl+enter, command+enter', KeyState.Compose, () => {
				this.sendCommand();
				return false;
			});
		}

		key('shift+esc', KeyState.Compose, () => {
			if (this.modalVisibility()) {
				this.tryToClosePopup();
			}
			return false;
		});
	}

	/**
	 * @param {string} id
	 * @returns {?Object}
	 */
	getAttachmentById(id) {
		return this.attachments().find(item => item && id === item.id);
	}

	cancelAttachmentHelper(id, oJua) {
		return () => {
			const attachment = this.attachments().find(item => item && item.id === id);
			if (attachment) {
				this.attachments.remove(attachment);
				delegateRunOnDestroy(attachment);

				if (oJua) {
					oJua.cancel(id);
				}
			}
		};
	}

	initUploader() {
		if (this.composeUploaderButton()) {
			const uploadCache = {},
				attachmentSizeLimit = pInt(Settings.settingsGet('AttachmentLimit')),
				oJua = new Jua({
					'action': upload(),
					'name': 'uploader',
					'queueSize': 2,
					'multipleSizeLimit': 50,
					'clickElement': this.composeUploaderButton(),
					'dragAndDropElement': this.composeUploaderDropPlace()
				});

			if (oJua) {
				oJua
					// .on('onLimitReached', (limit) => {
					// 	alert(limit);
					// })
					.on('onDragEnter', () => {
						this.dragAndDropOver(true);
					})
					.on('onDragLeave', () => {
						this.dragAndDropOver(false);
					})
					.on('onBodyDragEnter', () => {
						this.attachmentsPlace(true);
						this.dragAndDropVisible(true);
					})
					.on('onBodyDragLeave', () => {
						this.dragAndDropVisible(false);
					})
					.on('onProgress', (id, loaded, total) => {
						let item = uploadCache[id];
						if (!item) {
							item = this.getAttachmentById(id);
							if (item) {
								uploadCache[id] = item;
							}
						}

						if (item) {
							item.progress(Math.floor((loaded / total) * 100));
						}
					})
					.on('onSelect', (sId, oData) => {
						this.dragAndDropOver(false);

						const fileName = undefined === oData.FileName ? '' : oData.FileName.toString(),
							size = pInt(oData.Size, null),
							attachment = new ComposeAttachmentModel(sId, fileName, size);

						attachment.cancel = this.cancelAttachmentHelper(sId, oJua);

						this.attachments.push(attachment);

						this.attachmentsPlace(true);

						if (0 < size && 0 < attachmentSizeLimit && attachmentSizeLimit < size) {
							attachment
								.waiting(false)
								.uploading(true)
								.complete(true)
								.error(i18n('UPLOAD/ERROR_FILE_IS_TOO_BIG'));

							return false;
						}

						return true;
					})
					.on('onStart', (id) => {
						let item = uploadCache[id];
						if (!item) {
							item = this.getAttachmentById(id);
							if (item) {
								uploadCache[id] = item;
							}
						}

						if (item) {
							item
								.waiting(false)
								.uploading(true)
								.complete(false);
						}
					})
					.on('onComplete', (id, result, data) => {
						const attachment = this.getAttachmentById(id),
							errorCode = data && data.Result && data.Result.ErrorCode ? data.Result.ErrorCode : null,
							attachmentJson = result && data && data.Result && data.Result.Attachment ? data.Result.Attachment : null;

						let error = '';
						if (null !== errorCode) {
							error = getUploadErrorDescByCode(errorCode);
						} else if (!attachmentJson) {
							error = i18n('UPLOAD/ERROR_UNKNOWN');
						}

						if (attachment) {
							if (error && error.length) {
								attachment
									.waiting(false)
									.uploading(false)
									.complete(true)
									.error(error);
							} else if (attachmentJson) {
								attachment
									.waiting(false)
									.uploading(false)
									.complete(true);

								attachment.initByUploadJson(attachmentJson);
							}

							if (undefined === uploadCache[id]) {
								delete uploadCache[id];
							}
						}
					});

				this.addAttachmentEnabled(true).dragAndDropEnabled(true);
			} else {
				this.addAttachmentEnabled(false).dragAndDropEnabled(false);
			}
		}
	}

	/**
	 * @returns {Object}
	 */
	prepearAttachmentsForSendOrSave() {
		const result = {};
		this.attachmentsInReady().forEach(item => {
			if (item && item.tempName() && item.enabled()) {
				result[item.tempName()] = [item.fileName(), item.isInline ? '1' : '0', item.CID, item.contentLocation];
			}
		});

		return result;
	}

	/**
	 * @param {MessageModel} message
	 */
	addMessageAsAttachment(message) {
		if (message) {
			let temp = message.subject();
			temp = '.eml' === temp.substr(-4).toLowerCase() ? temp : temp + '.eml';

			const attachment = new ComposeAttachmentModel(message.requestHash, temp, message.size());

			attachment.fromMessage = true;
			attachment.cancel = this.cancelAttachmentHelper(message.requestHash);
			attachment
				.waiting(false)
				.uploading(true)
				.complete(true);

			this.attachments.push(attachment);
		}
	}

	/**
	 * @param {string} url
	 * @param {string} name
	 * @param {number} size
	 * @returns {ComposeAttachmentModel}
	 */
	addAttachmentHelper(url, name, size) {
		const attachment = new ComposeAttachmentModel(url, name, size);

		attachment.fromMessage = false;
		attachment.cancel = this.cancelAttachmentHelper(url);
		attachment
			.waiting(false)
			.uploading(true)
			.complete(false);

		this.attachments.push(attachment);

		this.attachmentsPlace(true);

		return attachment;
	}

	/**
	 * @param {MessageModel} message
	 * @param {string} type
	 */
	prepearMessageAttachments(message, type) {
		if (message) {
			if (ComposeType.ForwardAsAttachment === type) {
				this.addMessageAsAttachment(message);
			} else {
				const attachments = message.attachments();
				(isNonEmptyArray(attachments) ? attachments : []).forEach(item => {
					let add = false;
					switch (type) {
						case ComposeType.Reply:
						case ComposeType.ReplyAll:
							add = item.isLinked;
							break;

						case ComposeType.Forward:
						case ComposeType.Draft:
						case ComposeType.EditAsNew:
							add = true;
							break;
						// no default
					}

					if (add) {
						const attachment = new ComposeAttachmentModel(
							item.download,
							item.fileName,
							item.estimatedSize,
							item.isInline,
							item.isLinked,
							item.cid,
							item.contentLocation
						);

						attachment.fromMessage = true;
						attachment.cancel = this.cancelAttachmentHelper(item.download);
						attachment
							.waiting(false)
							.uploading(true)
							.complete(false);

						this.attachments.push(attachment);
					}
				});
			}
		}
	}

	removeLinkedAttachments() {
		const arrachment = this.attachments().find(item => item && item.isLinked);
		if (arrachment) {
			this.attachments.remove(arrachment);
			delegateRunOnDestroy(arrachment);
		}
	}

	setMessageAttachmentFailedDownloadText() {
		this.attachments().forEach(attachment => {
			if (attachment && attachment.fromMessage) {
				attachment
					.waiting(false)
					.uploading(false)
					.complete(true)
					.error(getUploadErrorDescByCode(UploadErrorCode.FileNoUploaded));
			}
		});
	}

	/**
	 * @param {boolean=} includeAttachmentInProgress = true
	 * @returns {boolean}
	 */
	isEmptyForm(includeAttachmentInProgress = true) {
		const withoutAttachment = includeAttachmentInProgress
			? !this.attachments().length
			: !this.attachmentsInReady().length;

		return (
			!this.to().length &&
			!this.cc().length &&
			!this.bcc().length &&
			!this.replyTo().length &&
			!this.subject().length &&
			withoutAttachment &&
			(!this.oEditor || !this.oEditor.getData())
		);
	}

	reset() {
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

		delegateRunOnDestroy(this.attachments());
		this.attachments([]);

		this.dragAndDropOver(false);
		this.dragAndDropVisible(false);

		this.draftFolder('');
		this.draftUid('');

		this.sending(false);
		this.saving(false);

		if (this.oEditor) {
			this.oEditor.clear(false);
		}
	}

	/**
	 * @returns {Array}
	 */
	getAttachmentsDownloadsForUpload() {
		return this.attachments().filter(item => item && !item.tempName()).map(
			item => item.id
		);
	}

	resizerTrigger() {
		let top = 0;
		this.resizeObserver.els.forEach(element => top = Math.max(top, element.getBoundingClientRect().top));
		if (0 < top) {
			top = this.resizeObserver.popups.clientHeight - this.resizeObserver.compose.offsetTop - 50 - top;
			this.resizeObserver.els.forEach(element =>
				element.style.height = Math.max(top, Math.max(200,parseInt(element.style.minHeight,10))) + 'px'
			);
			if (this.oEditor) {
				this.oEditor.resize();
			}
		}
	}
}

export { ComposePopupView, ComposePopupView as default };
