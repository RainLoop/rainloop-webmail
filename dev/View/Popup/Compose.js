import ko from 'ko';

import {
	Capa,
	KeyState,
	StorageResultType,
	Notification,
	UploadErrorCode
} from 'Common/Enums';

import {
	ComposeType,
	EditorDefaultType,
	SetSystemFoldersNotification
} from 'Common/EnumsUser';

import { inFocus, pInt, isArray, isNonEmptyArray } from 'Common/Utils';
import { delegateRunOnDestroy } from 'Common/UtilsUser';
import { encodeHtml, HtmlEditor } from 'Common/Html';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { upload } from 'Common/Links';
import { i18n, getNotification, getUploadErrorDescByCode } from 'Common/Translator';
import { timestampToString } from 'Common/Momentor';
import { MessageFlagsCache, setFolderHash } from 'Common/Cache';
import { Settings } from 'Common/Globals';

import AppStore from 'Stores/User/App';
import SettingsStore from 'Stores/User/Settings';
import IdentityStore from 'Stores/User/Identity';
import AccountStore from 'Stores/User/Account';
import FolderStore from 'Stores/User/Folder';
import PgpStore from 'Stores/User/Pgp';
import MessageStore from 'Stores/User/Message';

import Remote from 'Remote/User/Fetch';

import { ComposeAttachmentModel } from 'Model/ComposeAttachment';

import { command, isPopupVisible, showScreenPopup, hideScreenPopup } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { FolderSystemPopupView } from 'View/Popup/FolderSystem';
import { AskPopupView } from 'View/Popup/Ask';
import { ContactsPopupView } from 'View/Popup/Contacts';
import { ComposeOpenPgpPopupView } from 'View/Popup/ComposeOpenPgp';

const
	/**
	 * @param {string} prefix
	 * @param {string} subject
	 * @returns {string}
	 */
	replySubjectAdd = (prefix, subject) => {
		prefix = prefix.toUpperCase().trim();
		subject = subject.replace(/[\s]+/g, ' ').trim();

		let drop = false,
			re = 'RE' === prefix,
			fwd = 'FWD' === prefix;

		const parts = [],
			prefixIsRe = !fwd;

		if (subject) {
			subject.split(':').forEach(part => {
				const trimmedPart = part.trim();
				if (!drop && (/^(RE|FWD)$/i.test(trimmedPart) || /^(RE|FWD)[[(][\d]+[\])]$/i.test(trimmedPart))) {
					if (!re) {
						re = !!/^RE/i.test(trimmedPart);
					}

					if (!fwd) {
						fwd = !!/^FWD/i.test(trimmedPart);
					}
				} else {
					parts.push(part);
					drop = true;
				}
			});
		}

		if (prefixIsRe) {
			re = false;
		} else {
			fwd = false;
		}

		return ((prefixIsRe ? 'Re: ' : 'Fwd: ') + (re ? 'Re: ' : '')
			+ (fwd ? 'Fwd: ' : '') + parts.join(':').trim()).trim();
	};

ko.extenders.toggleSubscribe = (target, options) => {
	target.subscribe(options[1], options[0], 'beforeChange');
	target.subscribe(options[2], options[0]);
	return target;
};

class ComposePopupView extends AbstractViewPopup {
	constructor() {
		super('Compose');

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

		this.identities = IdentityStore.identities;

		this.addObservables({
			identitiesDropdownTrigger: false,

			to: '',
			toFocused: false,
			cc: '',
			ccFocused: false,
			bcc: '',
			bccFocused: false,
			replyTo: '',
			replyToFocused: false,

			subject: '',
			subjectFocused: false,

			isHtml: false,

			requestDsn: false,
			requestReadReceipt: false,
			markAsImportant: false,

			sendError: false,
			sendSuccessButSaveError: false,
			savedError: false,

			sendErrorDesc: '',
			savedErrorDesc: '',

			savedTime: 0,

			emptyToError: false,

			attachmentsInProcessError: false,
			attachmentsInErrorError: false,

			showCc: false,
			showBcc: false,
			showReplyTo: false,

			draftFolder: '',
			draftUid: '',
			sending: false,
			saving: false,

			attachmentsPlace: false,

			composeUploaderButton: null,
			composeUploaderDropPlace: null,
			dragAndDropEnabled: false,
			attacheMultipleAllowed: false,
			addAttachmentEnabled: false,

			composeEditorArea: null,

			currentIdentity: this.identities()[0] ? this.identities()[0] : null
		});

		// this.to.subscribe((v) => console.log(v));

		ko.computed(() => {
			switch (true) {
				case this.toFocused():
					this.sLastFocusedField = 'to';
					break;
				case this.ccFocused():
					this.sLastFocusedField = 'cc';
					break;
				case this.bccFocused():
					this.sLastFocusedField = 'bcc';
					break;
				// no default
			}
		}).extend({ notify: 'always' });

		this.attachments = ko.observableArray();

		this.dragAndDropOver = ko.observable(false).extend({ throttle: 1 });
		this.dragAndDropVisible = ko.observable(false).extend({ throttle: 1 });

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

		this.bDisabeCloseOnEsc = true;
		this.sDefaultKeyScope = KeyState.Compose;

		this.tryToClosePopup = this.tryToClosePopup.debounce(200);

		this.iTimer = 0;

		this.addComputables({
			sendButtonSuccess: () => !this.sendError() && !this.sendSuccessButSaveError(),

			savedTimeText: () =>
				this.savedTime() ? i18n('COMPOSE/SAVED_TIME', { 'TIME': this.savedTime().format('LT') }) : '',

			emptyToErrorTooltip: () => (this.emptyToError() ? i18n('COMPOSE/EMPTY_TO_ERROR_DESC') : ''),

			attachmentsErrorTooltip: () => {
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
			},

			attachmentsInProcess: () => this.attachments.filter(item => item && !item.complete()),
			attachmentsInReady: () => this.attachments.filter(item => item && item.complete()),
			attachmentsInError: () => this.attachments.filter(item => item && item.error()),

			attachmentsCount: () => this.attachments.length,
			attachmentsInErrorCount: () => this.attachmentsInError.length,
			attachmentsInProcessCount: () => this.attachmentsInProcess.length,
			isDraftFolderMessage: () => this.draftFolder() && this.draftUid(),

			identitiesOptions: () =>
				IdentityStore.identities.map(item => ({
					'item': item,
					'optValue': item.id(),
					'optText': item.formattedName()
				})),

			currentIdentityView: () => {
				const item = this.currentIdentity();
				return item ? item.formattedName() : 'unknown';
			},

			canBeSentOrSaved: () => !this.sending() && !this.saving()

		});

		this.addSubscribables({
			sendError: value => !value && this.sendErrorDesc(''),

			savedError: value => !value && this.savedErrorDesc(''),

			sendSuccessButSaveError: value => !value && this.savedErrorDesc(''),

			cc: value => {
				if (false === this.showCc() && value.length) {
					this.showCc(true);
				}
			},

			bcc: value => {
				if (false === this.showBcc() && value.length) {
					this.showBcc(true);
				}
			},

			replyTo: value => {
				if (false === this.showReplyTo() && value.length) {
					this.showReplyTo(true);
				}
			},

			attachmentsInErrorCount: value => {
				if (0 === value) {
					this.attachmentsInErrorError(false);
				}
			},

			to: value => {
				if (this.emptyToError() && value.length) {
					this.emptyToError(false);
				}
			},

			attachmentsInProcess: value => {
				if (this.attachmentsInProcessError() && isNonEmptyArray(value)) {
					this.attachmentsInProcessError(false);
				}
			}
		});

		this.resizeObserver = new ResizeObserver(this.resizerTrigger.throttle(50).bind(this));

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
					isArray(this.aDraftInfo) &&
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
				showScreenPopup(FolderSystemPopupView, [SetSystemFoldersNotification.Sent]);
			} else {
				this.sendError(false);
				this.sending(true);

				if (isArray(this.aDraftInfo) && 3 === this.aDraftInfo.length) {
					const flagsCache = MessageFlagsCache.getFor(this.aDraftInfo[2], this.aDraftInfo[1]);
					if (flagsCache) {
						if ('forward' === this.aDraftInfo[0]) {
							flagsCache[3] = true;
						} else {
							flagsCache[2] = true;
						}

						MessageFlagsCache.setFor(this.aDraftInfo[2], this.aDraftInfo[1], flagsCache);
						rl.app.reloadFlagsCurrentMessageListAndMessageFromCache();
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
			showScreenPopup(FolderSystemPopupView, [SetSystemFoldersNotification.Draft]);
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
		if (!isPopupVisible(AskPopupView) && this.modalVisibility()) {
			showScreenPopup(AskPopupView, [
				i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'),
				() => {
					if (this.modalVisibility()) {
						rl.app.deleteMessagesFromFolderWithoutCheck(this.draftFolder(), [this.draftUid()]);
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
				showScreenPopup(ContactsPopupView, [true, this.sLastFocusedField]);
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
		rl.app.getAutocomplete(oData.term, aData => fResponse(aData.map(oEmailItem => oEmailItem.toLine(false))));
	}

	openOpenPgpPopup() {
		if (PgpStore.capaOpenPGP() && this.oEditor && !this.oEditor.isHtml()) {
			showScreenPopup(ComposeOpenPgpPopupView, [
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
				rl.app.reloadMessageList(true);
			} else {
				rl.app.folderInformation(draftFolder);
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
					if (message && this.draftFolder() === message.folder && this.draftUid() === message.uid) {
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

		this.toFocused(false);

		rl.route.on();

		this.resizeObserver.disconnect();
	}

	editor(fOnInit) {
		if (fOnInit) {
			if (!this.oEditor && this.composeEditorArea()) {
				// setTimeout(() => {
				this.oEditor = new HtmlEditor(
					this.composeEditorArea(),
					null,
					() => fOnInit(this.oEditor),
					bHtml => this.isHtml(!!bHtml)
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
		rl.route.off();

		const ro = this.resizeObserver;
		ro.observe(ro.compose);
		ro.observe(ro.header);

		this.autosaveStart();

		if (AppStore.composeInEdit()) {
			type = type || ComposeType.Empty;
			if (ComposeType.Empty !== type) {
				showScreenPopup(AskPopupView, [
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
			this.editor(editor => editor.modeToggle(false));
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
					.validUnique();

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
				isArray(oMessageOrArray) && 1 === oMessageOrArray.length
					? oMessageOrArray[0]
					: !isArray(oMessageOrArray)
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
			sDate = timestampToString(message.dateTimeStampInUTC(), 'FULL');
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
					this.prepareMessageAttachments(message, lineComposeType);
					this.aDraftInfo = ['reply', message.uid, message.folder];
					this.sInReplyTo = message.sMessageId;
					this.sReferences = (this.sInReplyTo + ' ' + message.sReferences).trim();
					break;

				case ComposeType.ReplyAll:
					resplyAllParts = message.replyAllEmails(excludeEmail);
					this.to(this.emailArrayToStringLineHelper(resplyAllParts[0]));
					this.cc(this.emailArrayToStringLineHelper(resplyAllParts[1]));
					this.subject(replySubjectAdd('Re', sSubject));
					this.prepareMessageAttachments(message, lineComposeType);
					this.aDraftInfo = ['reply', message.uid, message.folder];
					this.sInReplyTo = message.sMessageId;
					this.sReferences = (this.sInReplyTo + ' ' + message.references).trim();
					break;

				case ComposeType.Forward:
					this.subject(replySubjectAdd('Fwd', sSubject));
					this.prepareMessageAttachments(message, lineComposeType);
					this.aDraftInfo = ['forward', message.uid, message.folder];
					this.sInReplyTo = message.sMessageId;
					this.sReferences = (this.sInReplyTo + ' ' + message.sReferences).trim();
					break;

				case ComposeType.ForwardAsAttachment:
					this.subject(replySubjectAdd('Fwd', sSubject));
					this.prepareMessageAttachments(message, lineComposeType);
					this.aDraftInfo = ['forward', message.uid, message.folder];
					this.sInReplyTo = message.sMessageId;
					this.sReferences = (this.sInReplyTo + ' ' + message.sReferences).trim();
					break;

				case ComposeType.Draft:
					this.to(this.emailArrayToStringLineHelper(message.to));
					this.cc(this.emailArrayToStringLineHelper(message.cc));
					this.bcc(this.emailArrayToStringLineHelper(message.bcc));
					this.replyTo(this.emailArrayToStringLineHelper(message.replyTo));

					this.bFromDraft = true;

					this.draftFolder(message.folder);
					this.draftUid(message.uid);

					this.subject(sSubject);
					this.prepareMessageAttachments(message, lineComposeType);

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
					this.prepareMessageAttachments(message, lineComposeType);

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

					sText = sText.replace(/<img[^>]+>/g, '').replace(/<a\s[^>]+><\/a>/g, '');
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
						i18n('GLOBAL/FROM') +
						': ' +
						sFrom +
						'<br />' +
						i18n('GLOBAL/TO') +
						': ' +
						sTo +
						(sCc.length ? '<br />' + i18n('GLOBAL/CC') + ': ' + sCc : '') +
						'<br />' +
						i18n('COMPOSE/FORWARD_MESSAGE_TOP_SENT') +
						': ' +
						encodeHtml(sDate) +
						'<br />' +
						i18n('GLOBAL/SUBJECT') +
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
			Remote.messageUploadAttachments((sResult, oData) => {
				if (StorageResultType.Success === sResult && oData && oData.Result) {
					Object.entries(oData.Result).forEach(([tempName, id]) => {
						const attachment = this.getAttachmentById(id);
						if (attachment) {
							attachment.tempName(tempName);
							attachment
								.waiting(false)
								.uploading(false)
								.complete(true);
						}
					});
				} else {
					this.attachments.forEach(attachment => {
						if (attachment && attachment.fromMessage) {
							attachment
								.waiting(false)
								.uploading(false)
								.complete(true)
								.error(getUploadErrorDescByCode(UploadErrorCode.NoFileUploaded));
						}
					});
				}
			}, downloads);
		}

		if (identity) {
			this.currentIdentity(identity);
		}
	}

	setFocusInPopup() {
//		rl.settings.app('mobile') ||
		setTimeout(() => {
			if (!this.to()) {
				this.toFocused(true);
			} else if (this.oEditor) {
				if (!this.toFocused()) {
					this.oEditor.focus();
				}
			}
		}, 100);
	}

	tryToClosePopup() {
		if (!isPopupVisible(AskPopupView) && this.modalVisibility()) {
			if (this.bSkipNextHide || (this.isEmptyForm() && !this.draftUid())) {
				this.closeCommand && this.closeCommand();
			} else {
				showScreenPopup(AskPopupView, [
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

	popupMenu(event) {
		if (event.ctrlKey || event.metaKey || 'ContextMenu' == event.key
		 || (this.oEditor && !this.oEditor.hasFocus() && !inFocus())) {
			this.identitiesDropdownTrigger(true);
			return false;
		}
		return true;
	}

	onBuild(dom) {
		this.initUploader();

		shortcuts.add('q', 'meta', KeyState.Compose, ()=>false);
		shortcuts.add('w', 'meta', KeyState.Compose, ()=>false);

		shortcuts.add('m,contextmenu', '', KeyState.Compose, e => this.popupMenu(e));
		shortcuts.add('m', 'ctrl', KeyState.Compose, e => this.popupMenu(e));

		shortcuts.add('escape,close', '', KeyState.Compose, () => {
			this.skipCommand();
			return false;
		});
		shortcuts.add('arrowdown', 'meta', KeyState.Compose, () => {
			this.skipCommand();
			return false;
		});

		if (this.allowFolders) {
			shortcuts.add('s', 'meta', KeyState.Compose, () => {
				this.saveCommand();
				return false;
			});
			shortcuts.add('save', KeyState.Compose, () => {
				this.saveCommand();
				return false;
			});
		}

		if (Settings.app('allowCtrlEnterOnCompose')) {
			shortcuts.add('enter', 'meta', KeyState.Compose, () => {
				this.sendCommand();
				return false;
			});
		}
		shortcuts.add('mailsend', '', KeyState.Compose, () => {
			this.sendCommand();
			return false;
		});

		shortcuts.add('escape,close', 'shift', KeyState.Compose, () => {
			this.modalVisibility() && this.tryToClosePopup();
			return false;
		});

		const ro = this.resizeObserver;
		ro.compose = dom.querySelector('.b-compose');
		ro.header = dom.querySelector('.b-header');
		ro.toolbar = dom.querySelector('.b-header-toolbar');
		ro.els = [dom.querySelector('.textAreaParent'), dom.querySelector('.attachmentAreaParent')];
	}

	/**
	 * @param {string} id
	 * @returns {?Object}
	 */
	getAttachmentById(id) {
		return this.attachments.find(item => item && id === item.id);
	}

	cancelAttachmentHelper(id, oJua) {
		return () => {
			const attachment = this.getAttachmentById(id);
			if (attachment) {
				this.attachments.remove(attachment);
				delegateRunOnDestroy(attachment);
				oJua && oJua.cancel(id);
			}
		};
	}

	initUploader() {
		if (this.composeUploaderButton()) {
			const uploadCache = {},
				attachmentSizeLimit = pInt(Settings.get('AttachmentLimit')),
				oJua = new Jua({
					action: upload(),
					name: 'uploader',
					queueSize: 2,
					multipleSizeLimit: 50,
					clickElement: this.composeUploaderButton(),
					dragAndDropElement: this.composeUploaderDropPlace()
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
	prepareMessageAttachments(message, type) {
		if (message) {
			if (ComposeType.ForwardAsAttachment === type) {
				this.addMessageAsAttachment(message);
			} else {
				message.attachments.forEach(item => {
					let add = false;
					switch (type) {
						case ComposeType.Reply:
						case ComposeType.ReplyAll:
							break;

						case ComposeType.Forward:
						case ComposeType.Draft:
						case ComposeType.EditAsNew:
							add = true;
							break;
						// no default
					}

					if (add) {
						const attachment = ComposeAttachmentModel.fromAttachment(item);
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

	/**
	 * @param {boolean=} includeAttachmentInProgress = true
	 * @returns {boolean}
	 */
	isEmptyForm(includeAttachmentInProgress = true) {
		const withoutAttachment = includeAttachmentInProgress
			? !this.attachments.length
			: !this.attachmentsInReady().length;

		return (
			!this.to.length &&
			!this.cc.length &&
			!this.bcc.length &&
			!this.replyTo.length &&
			!this.subject.length &&
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
		return this.attachments.filter(item => item && !item.tempName()).map(
			item => item.id
		);
	}

	resizerTrigger() {
		let ro = this.resizeObserver,
			height = Math.max(200, ro.compose.clientHeight - ro.header.offsetHeight - ro.toolbar.offsetHeight) + 'px';
		if (ro.height !== height) {
			ro.height = height;
			ro.els.forEach(element => element.style.height = height);
			this.oEditor && this.oEditor.resize();
		}
	}
}

export { ComposePopupView, ComposePopupView as default };
