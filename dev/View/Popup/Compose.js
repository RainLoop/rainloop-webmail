import ko from 'ko';

import {
	Notification,
	UploadErrorCode
} from 'Common/Enums';

import {
	ComposeType,
	EditorDefaultType,
	FolderType
} from 'Common/EnumsUser';

import { pInt, isArray, arrayLength } from 'Common/Utils';
import { encodeHtml, HtmlEditor, htmlToPlain } from 'Common/Html';
import { koArrayWithDestroy, addObservablesTo, addComputablesTo, addSubscribablesTo } from 'External/ko';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';
import { folderInformation, messagesDeleteHelper } from 'Common/Folders';
import { serverRequest } from 'Common/Links';
import { i18n, getNotification, getUploadErrorDescByCode, timestampToString } from 'Common/Translator';
import { MessageFlagsCache, setFolderHash } from 'Common/Cache';
import { Settings, SettingsCapa, SettingsGet, elementById, addShortcut, createElement } from 'Common/Globals';
//import { exitFullscreen, isFullscreen, toggleFullscreen } from 'Common/Fullscreen';

import { AppUserStore } from 'Stores/User/App';
import { SettingsUserStore } from 'Stores/User/Settings';
import { IdentityUserStore } from 'Stores/User/Identity';
import { AccountUserStore } from 'Stores/User/Account';
import { FolderUserStore } from 'Stores/User/Folder';
import { PgpUserStore } from 'Stores/User/Pgp';
import { OpenPGPUserStore } from 'Stores/User/OpenPGP';
import { GnuPGUserStore } from 'Stores/User/GnuPG';
import { MessageUserStore } from 'Stores/User/Message';
import { MessagelistUserStore } from 'Stores/User/Messagelist';

import Remote from 'Remote/User/Fetch';

import { ComposeAttachmentModel } from 'Model/ComposeAttachment';
import { EmailModel } from 'Model/Email';

import { decorateKoCommands, showScreenPopup } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { FolderSystemPopupView } from 'View/Popup/FolderSystem';
import { AskPopupView } from 'View/Popup/Ask';
import { ContactsPopupView } from 'View/Popup/Contacts';
/*
import { ThemeStore } from 'Stores/Theme';

let alreadyFullscreen;
*/
let oLastMessage;

const
	ScopeCompose = 'Compose',

	tpl = createElement('template'),

	base64_encode = text => btoa(unescape(encodeURIComponent(text))).match(/.{1,76}/g).join('\r\n'),

	email = new EmailModel(),
	getEmail = value => {
		email.clear();
		email.parse(value.trim());
		return email.email || false;
	},

	/**
	 * @param {Array} aList
	 * @param {boolean} bFriendly
	 * @returns {string}
	 */
	emailArrayToStringLineHelper = (aList, bFriendly) =>
		aList.map(item => item.toLine(bFriendly)).join(', '),

	reloadDraftFolder = () => {
		const draftsFolder = FolderUserStore.draftsFolder();
		if (draftsFolder && UNUSED_OPTION_VALUE !== draftsFolder) {
			setFolderHash(draftsFolder, '');
			if (FolderUserStore.currentFolderFullName() === draftsFolder) {
				MessagelistUserStore.reload(true);
			} else {
				folderInformation(draftsFolder);
			}
		}
	},

	findIdentity = addresses => {
		addresses = addresses.map(item => item.email);
		return IdentityUserStore.find(item => addresses.includes(item.email()));
	},

	/**
	 * @param {Function} fKoValue
	 * @param {Array} emails
	 */
	addEmailsTo = (fKoValue, emails) => {
		if (arrayLength(emails)) {
			const value = fKoValue().trim(),
				values = emails.map(item => item ? item.toLine() : null)
					.validUnique();

			fKoValue(value + (value ? ', ' :  '') + values.join(', ').trim());
		}
	},

	isPlainEditor = () => EditorDefaultType.Plain === SettingsUserStore.editorDefaultType(),

	/**
	 * @param {string} prefix
	 * @param {string} subject
	 * @returns {string}
	 */
	replySubjectAdd = (prefix, subject) => {
		prefix = prefix.toUpperCase().trim();
		subject = subject.replace(/\s+/g, ' ').trim();

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

class MimePart {
	constructor() {
		this.headers = {};
		this.body = '';
		this.boundary = '';
		this.children = [];
	}

	toString() {
		const hasSub = this.children.length,
			boundary = this.boundary || (this.boundary = 'part' + Jua.randomId()),
			headers = this.headers;
		if (hasSub && !headers['Content-Type'].includes(boundary)) {
			headers['Content-Type'] += `; boundary="${boundary}"`;
		}
		let result = Object.entries(headers).map(([key, value]) => `${key}: ${value}`).join('\r\n') + '\r\n';
		if (this.body) {
			result += '\r\n' + this.body.replace(/\r?\n/g, '\r\n');
		}
		if (hasSub) {
			this.children.forEach(part => result += '\r\n--' + boundary + '\r\n' + part);
			result += '\r\n--' + boundary + '--\r\n';
		}
		return result;
	}
}

export class ComposePopupView extends AbstractViewPopup {
	constructor() {
		super('Compose');

		const fEmailOutInHelper = (context, identity, name, isIn) => {
			const identityEmail = context && identity?.[name]();
			if (identityEmail && (isIn ? true : context[name]())) {
				let list = context[name]().trim().split(',');

				list = list.filter(email => {
					email = email.trim();
					return email && identityEmail.trim() !== email;
				});

				isIn && list.push(identityEmail);

				context[name](list.join(','));
			}
		};

		this.oEditor = null;
		this.aDraftInfo = null;
		this.sInReplyTo = '';
		this.bFromDraft = false;
		this.sReferences = '';

		this.sLastFocusedField = 'to';

		this.allowContacts = AppUserStore.allowContacts();
		this.allowIdentities = SettingsCapa('Identities');
		this.allowSpellcheck = SettingsUserStore.allowSpellcheck;

		addObservablesTo(this, {
			identitiesDropdownTrigger: false,

			from: '',
			to: '',
			cc: '',
			bcc: '',
			replyTo: '',

			subject: '',

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

			pgpSign: false,
			canPgpSign: false,
			pgpEncrypt: false,
			canPgpEncrypt: false,
			canMailvelope: false,

			draftsFolder: '',
			draftUid: 0,
			sending: false,
			saving: false,

			viewArea: 'body',

			attacheMultipleAllowed: false,
			addAttachmentEnabled: false,

			editorArea: null, // initDom

			currentIdentity: IdentityUserStore()[0]
		});

		// Used by ko.bindingHandlers.emailsTags
		['to','cc','bcc'].forEach(name => {
			this[name].focused = ko.observable(false);
			this[name].focused.subscribe(value => value && (this.sLastFocusedField = name));
		});

		this.attachments = koArrayWithDestroy();

		this.dragAndDropOver = ko.observable(false).extend({ debounce: 1 });
		this.dragAndDropVisible = ko.observable(false).extend({ debounce: 1 });

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

		this.tryToClose = this.tryToClose.debounce(200);

		this.iTimer = 0;

		addComputablesTo(this, {
			sendButtonSuccess: () => !this.sendError() && !this.sendSuccessButSaveError(),

			savedTimeText: () =>
				this.savedTime() ? i18n('COMPOSE/SAVED_TIME', { TIME: this.savedTime().format('LT') }) : '',

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
			attachmentsInError: () => this.attachments.filter(item => item?.error()),

			attachmentsCount: () => this.attachments.length,
			attachmentsInErrorCount: () => this.attachmentsInError.length,
			attachmentsInProcessCount: () => this.attachmentsInProcess.length,
			isDraftFolderMessage: () => this.draftsFolder() && this.draftUid(),

			identitiesOptions: () =>
				IdentityUserStore.map(item => ({
					item: item,
					optValue: item.id(),
					optText: item.formattedName()
				})),

			canBeSentOrSaved: () => !this.sending() && !this.saving()
		});

		addSubscribablesTo(this, {
			sendError: value => !value && this.sendErrorDesc(''),

			savedError: value => !value && this.savedErrorDesc(''),

			sendSuccessButSaveError: value => !value && this.savedErrorDesc(''),

			currentIdentity: value => value && this.from(value.formattedName()),

			from: value => {
				this.canPgpSign(false);
				value = getEmail(value);
				value && PgpUserStore.getKeyForSigning(value).then(result => {
					console.log({
						email: value,
						canPgpSign:result
					});
					this.canPgpSign(result)
				});
			},

			cc: value => {
				if (false === this.showCc() && value.length) {
					this.showCc(true);
				}
				this.initPgpEncrypt();
			},

			bcc: value => {
				if (false === this.showBcc() && value.length) {
					this.showBcc(true);
				}
				this.initPgpEncrypt();
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
				this.initPgpEncrypt();
			},

			attachmentsInProcess: value => {
				if (this.attachmentsInProcessError() && arrayLength(value)) {
					this.attachmentsInProcessError(false);
				}
			}
		});

		decorateKoCommands(this, {
			sendCommand: self => self.canBeSentOrSaved(),
			saveCommand: self => self.canBeSentOrSaved(),
			deleteCommand: self => self.isDraftFolderMessage(),
			skipCommand: self => self.canBeSentOrSaved(),
			contactsCommand: self => self.allowContacts
		});

		this.from(IdentityUserStore()[0].formattedName());
	}

	sendCommand() {
		let sSentFolder = FolderUserStore.sentFolder();

		this.attachmentsInProcessError(false);
		this.attachmentsInErrorError(false);
		this.emptyToError(false);

		if (this.attachmentsInProcess().length) {
			this.attachmentsInProcessError(true);
			this.attachmentsArea();
		} else if (this.attachmentsInError().length) {
			this.attachmentsInErrorError(true);
			this.attachmentsArea();
		}

		if (!this.to().trim() && !this.cc().trim() && !this.bcc().trim()) {
			this.emptyToError(true);
		}

		if (!this.emptyToError() && !this.attachmentsInErrorError() && !this.attachmentsInProcessError()) {
			if (SettingsUserStore.replySameFolder()) {
				if (
					3 === arrayLength(this.aDraftInfo) &&
					null != this.aDraftInfo[2] &&
					this.aDraftInfo[2].length
				) {
					sSentFolder = this.aDraftInfo[2];
				}
			}

			if (!sSentFolder) {
				showScreenPopup(FolderSystemPopupView, [FolderType.Sent]);
			} else try {
				this.sendError(false);
				this.sending(true);

				if (3 === arrayLength(this.aDraftInfo)) {
					const flagsCache = MessageFlagsCache.getFor(this.aDraftInfo[2], this.aDraftInfo[1]);
					if (isArray(flagsCache)) {
						flagsCache.push(('forward' === this.aDraftInfo[0]) ? '$forwarded' : '\\answered');
						MessageFlagsCache.setFor(this.aDraftInfo[2], this.aDraftInfo[1], flagsCache);
						MessagelistUserStore.reloadFlagsAndCachedMessage();
						setFolderHash(this.aDraftInfo[2], '');
					}
				}

				sSentFolder = UNUSED_OPTION_VALUE === sSentFolder ? '' : sSentFolder;

				this.getMessageRequestParams(sSentFolder).then(params => {
					Remote.request('SendMessage',
						(iError, data) => {
							this.sending(false);
							if (iError) {
								if (Notification.CantSaveMessage === iError) {
									this.sendSuccessButSaveError(true);
									this.savedErrorDesc(i18n('COMPOSE/SAVED_ERROR_ON_SEND').trim());
								} else {
									this.sendError(true);
									this.sendErrorDesc(getNotification(iError, data?.ErrorMessage)
										|| getNotification(Notification.CantSendMessage));
								}
							} else {
								this.close();
							}
							setFolderHash(this.draftsFolder(), '');
							setFolderHash(sSentFolder, '');
							reloadDraftFolder();
						},
						params,
						30000
					);
				}).catch(e => {
					console.error(e);
					this.sendError(true);
					this.sendErrorDesc(e);
					this.sending(false);
				});
			} catch (e) {
				console.error(e);
				this.sendError(true);
				this.sendErrorDesc(e);
				this.sending(false);
			}
		}
	}

	saveCommand() {
		if (FolderUserStore.draftsFolderNotEnabled()) {
			showScreenPopup(FolderSystemPopupView, [FolderType.Drafts]);
		} else {
			this.savedError(false);
			this.saving(true);
			this.autosaveStart();
			this.getMessageRequestParams(FolderUserStore.draftsFolder(), 1).then(params => {
				Remote.request('SaveMessage',
					(iError, oData) => {
						let result = false;

						this.saving(false);

						if (!iError) {
							if (oData.Result.NewFolder && oData.Result.NewUid) {
								result = true;

								if (this.bFromDraft) {
									const message = MessageUserStore.message();
									if (message && this.draftsFolder() === message.folder && this.draftUid() == message.uid) {
										MessageUserStore.message(null);
									}
								}

								this.draftsFolder(oData.Result.NewFolder);
								this.draftUid(oData.Result.NewUid);

								this.savedTime(new Date);

								if (this.bFromDraft) {
									setFolderHash(this.draftsFolder(), '');
								}
								setFolderHash(FolderUserStore.draftsFolder(), '');
							}
						}

						if (!result) {
							this.savedError(true);
							this.savedErrorDesc(getNotification(Notification.CantSaveMessage));
						}

						reloadDraftFolder();
					},
					params,
					200000
				);
			}).catch(e => {
				this.saving(false);
				this.savedError(true);
				this.savedErrorDesc(getNotification(Notification.CantSaveMessage) + ': ' + e);
			});
		}
	}

	deleteCommand() {
		AskPopupView.hidden()
		&& showScreenPopup(AskPopupView, [
			i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES'),
			() => {
				const
					sFromFolderFullName = this.draftsFolder(),
					oUids = new Set([this.draftUid()]);
				messagesDeleteHelper(sFromFolderFullName, oUids);
				MessagelistUserStore.removeMessagesFromList(sFromFolderFullName, oUids);
				this.close();
			}
		]);
	}

	onClose() {
		this.skipCommand();
		return false;
	}

	skipCommand() {
		ComposePopupView.inEdit(true);

		if (
			!this.saving() &&
			!this.sending() &&
			!FolderUserStore.draftsFolderNotEnabled() &&
			SettingsUserStore.allowDraftAutosave()
		) {
			this.saveCommand();
		}

		this.tryToClose();
	}

	contactsCommand() {
		if (this.allowContacts) {
			this.skipCommand();
			setTimeout(() => {
				showScreenPopup(ContactsPopupView, [true, this.sLastFocusedField]);
			}, 200);
		}
	}

	autosaveStart() {
		clearTimeout(this.iTimer);
		this.iTimer = setTimeout(()=>{
			if (this.modalVisible()
				&& !FolderUserStore.draftsFolderNotEnabled()
				&& SettingsUserStore.allowDraftAutosave()
				&& !this.isEmptyForm(false)
				&& !this.saving()
				&& !this.sending()
				&& !this.savedError()
			) {
				this.saveCommand();
			}

			this.autosaveStart();
		}, 60000);
	}

	// getAutocomplete
	emailsSource(value, fResponse) {
		Remote.abort('Suggestions').request('Suggestions',
			(iError, data) => {
				if (!iError && isArray(data.Result)) {
					fResponse(
						data.Result.map(item => (item?.[0] ? (new EmailModel(item[0], item[1])).toLine() : null))
						.filter(v => v)
					);
				} else if (Notification.RequestAborted !== iError) {
					fResponse([]);
				}
			},
			{
				Query: value
//				,Page: 1
			}
		);
	}

	selectIdentity(identity) {
		identity = identity?.item;
		if (identity) {
			this.currentIdentity(identity);
			this.setSignature(identity);
		}
	}

	onHide() {
		// Stop autosave
		clearTimeout(this.iTimer);

		ComposePopupView.inEdit() || this.reset();

		this.to.focused(false);

//		alreadyFullscreen || exitFullscreen();
	}

	dropMailvelope() {
		if (this.mailvelope) {
			elementById('mailvelope-editor').textContent = '';
			this.mailvelope = null;
		}
	}

	editor(fOnInit) {
		if (fOnInit && this.editorArea()) {
			if (this.oEditor) {
				fOnInit(this.oEditor);
			} else {
				// setTimeout(() => {
				this.oEditor = new HtmlEditor(
					this.editorArea(),
					null,
					() => fOnInit(this.oEditor),
					bHtml => this.isHtml(!!bHtml)
				);
				// }, 1000);
			}
		}
	}

	setSignature(identity, msgComposeType) {
		if (identity && ComposeType.Draft !== msgComposeType && ComposeType.EditAsNew !== msgComposeType) {
			this.editor(editor => {
				let signature = identity.signature() || '',
					isHtml = signature.startsWith(':HTML:'),
					fromLine = oLastMessage ? emailArrayToStringLineHelper(oLastMessage.from, true) : '';
				if (fromLine) {
					signature = signature.replace(/{{FROM-FULL}}/g, fromLine);
					if (!fromLine.includes(' ') && 0 < fromLine.indexOf('@')) {
						fromLine = fromLine.replace(/@\S+/, '');
					}
					signature = signature.replace(/{{FROM}}/g, fromLine);
				}
				signature = (isHtml ? signature.slice(6) : signature)
					.replace(/\r/g, '')
					.replace(/\s{1,2}?{{FROM}}/g, '')
					.replace(/\s{1,2}?{{FROM-FULL}}/g, '')
					.replace(/{{DATE}}/g, new Date().format('LLLL'))
					.replace(/{{TIME}}/g, new Date().format('LT'))
					.replace(/{{MOMENT:[^}]+}}/g, '');
				signature.length && editor.setSignature(signature, isHtml, !!identity.signatureInsertBefore());
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
		this.autosaveStart();

		this.viewModelDom.dataset.wysiwyg = SettingsUserStore.editorDefaultType();

		if (ComposePopupView.inEdit()) {
			type = type || ComposeType.Empty;
			if (ComposeType.Empty !== type) {
				showScreenPopup(AskPopupView, [
					i18n('COMPOSE/DISCARD_UNSAVED_DATA'),
					() => {
						this.initOnShow(type, oMessageOrArray, aToEmails, aCcEmails, aBccEmails, sCustomSubject, sCustomPlainText);
					},
					null,
					false
				]);
			} else {
				addEmailsTo(this.to, aToEmails);
				addEmailsTo(this.cc, aCcEmails);
				addEmailsTo(this.bcc, aBccEmails);

				if (sCustomSubject && !this.subject()) {
					this.subject(sCustomSubject);
				}
			}
		} else {
			this.initOnShow(type, oMessageOrArray, aToEmails, aCcEmails, aBccEmails, sCustomSubject, sCustomPlainText);
		}

		ComposePopupView.inEdit(false);
		// Chrome bug #298
//		alreadyFullscreen = isFullscreen();
//		alreadyFullscreen || (ThemeStore.isMobile() && toggleFullscreen());
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
		let sFrom = '',
			sTo = '',
			sCc = '',
			sDate = '',
			sSubject = '',
			sText = '',
			identity = null,
			aDraftInfo = null,
			message = 1 === arrayLength(oMessageOrArray)
				? oMessageOrArray[0]
				: (isArray(oMessageOrArray) ? null : oMessageOrArray);

		const
//			excludeEmail = new Set(),
			excludeEmail = {},
			mEmail = AccountUserStore.email(),
			msgComposeType = sType || ComposeType.Empty;

		oLastMessage = message;

		if (mEmail) {
//			excludeEmail.add(mEmail);
			excludeEmail[mEmail] = true;
		}

		this.reset();

		if (message) {
			switch (msgComposeType) {
				case ComposeType.Reply:
				case ComposeType.ReplyAll:
				case ComposeType.Forward:
				case ComposeType.ForwardAsAttachment:
					identity = findIdentity(message.to.concat(message.cc, message.bcc))
						/* || findIdentity(message.deliveredTo)*/;
					break;
				case ComposeType.Draft:
					identity = findIdentity(message.from.concat(message.replyTo));
					break;
				// no default
//				case ComposeType.Empty:
			}
		}
		identity = identity || IdentityUserStore()[0];
		if (identity) {
//			excludeEmail.add(identity.email());
			excludeEmail[identity.email()] = true;
		}

		if (arrayLength(aToEmails)) {
			this.to(emailArrayToStringLineHelper(aToEmails));
		}

		if (arrayLength(aCcEmails)) {
			this.cc(emailArrayToStringLineHelper(aCcEmails));
		}

		if (arrayLength(aBccEmails)) {
			this.bcc(emailArrayToStringLineHelper(aBccEmails));
		}

		if (msgComposeType && message) {
			sDate = timestampToString(message.dateTimeStampInUTC(), 'FULL');
			sSubject = message.subject();
			aDraftInfo = message.draftInfo;

			switch (msgComposeType) {
				case ComposeType.Reply:
				case ComposeType.ReplyAll:
					if (ComposeType.Reply === msgComposeType) {
						this.to(emailArrayToStringLineHelper(message.replyEmails(excludeEmail)));
					} else {
						let parts = message.replyAllEmails(excludeEmail);
						this.to(emailArrayToStringLineHelper(parts[0]));
						this.cc(emailArrayToStringLineHelper(parts[1]));
					}
					this.subject(replySubjectAdd('Re', sSubject));
					this.prepareMessageAttachments(message, msgComposeType);
					this.aDraftInfo = ['reply', message.uid, message.folder];
					this.sInReplyTo = message.messageId;
					this.sReferences = (message.messageId + ' ' + message.references).trim();
					break;

				case ComposeType.Forward:
				case ComposeType.ForwardAsAttachment:
					this.subject(replySubjectAdd('Fwd', sSubject));
					this.prepareMessageAttachments(message, msgComposeType);
					this.aDraftInfo = ['forward', message.uid, message.folder];
					this.sInReplyTo = message.messageId;
					this.sReferences = (message.messageId + ' ' + message.references).trim();
					break;

				case ComposeType.Draft:
					this.to(emailArrayToStringLineHelper(message.to));
					this.cc(emailArrayToStringLineHelper(message.cc));
					this.bcc(emailArrayToStringLineHelper(message.bcc));
					this.replyTo(emailArrayToStringLineHelper(message.replyTo));

					this.bFromDraft = true;

					this.draftsFolder(message.folder);
					this.draftUid(message.uid);

					this.subject(sSubject);
					this.prepareMessageAttachments(message, msgComposeType);

					this.aDraftInfo = 3 === arrayLength(aDraftInfo) ? aDraftInfo : null;
					this.sInReplyTo = message.inReplyTo;
					this.sReferences = message.references;
					break;

				case ComposeType.EditAsNew:
					this.to(emailArrayToStringLineHelper(message.to));
					this.cc(emailArrayToStringLineHelper(message.cc));
					this.bcc(emailArrayToStringLineHelper(message.bcc));
					this.replyTo(emailArrayToStringLineHelper(message.replyTo));

					this.subject(sSubject);
					this.prepareMessageAttachments(message, msgComposeType);

					this.aDraftInfo = 3 === arrayLength(aDraftInfo) ? aDraftInfo : null;
					this.sInReplyTo = message.inReplyTo;
					this.sReferences = message.references;
					break;

//				case ComposeType.Empty:
//					break;
				// no default
			}

			let encrypted;

			// https://github.com/the-djmaze/snappymail/issues/491
			tpl.innerHTML = message.bodyAsHTML();
			tpl.content.querySelectorAll('img').forEach(img =>
				img.dataset.xSrcCid || img.dataset.xSrc || img.replaceWith(img.alt || img.title)
			);
			sText = tpl.innerHTML.trim();

			switch (msgComposeType) {
				case ComposeType.Reply:
				case ComposeType.ReplyAll:
					sFrom = message.fromToLine(false, true);
					sText = '<br><br><p>' + i18n('COMPOSE/REPLY_MESSAGE_TITLE', { DATETIME: sDate, EMAIL: sFrom })
						+ ':</p><blockquote>'
						+ sText.trim()
						+ '</blockquote>';
					break;

				case ComposeType.Forward:
					sFrom = message.fromToLine(false, true);
					sTo = message.toToLine(false, true);
					sCc = message.ccToLine(false, true);
					sText = '<br><br><p>' + i18n('COMPOSE/FORWARD_MESSAGE_TOP_TITLE') + '</p><div>'
						+ i18n('GLOBAL/FROM') + ': ' + sFrom
						+ '<br>'
						+ i18n('GLOBAL/TO') + ': ' + sTo
						+ (sCc.length ? '<br>' + i18n('GLOBAL/CC') + ': ' + sCc : '')
						+ '<br>'
						+ i18n('COMPOSE/FORWARD_MESSAGE_TOP_SENT')
						+ ': '
						+ encodeHtml(sDate)
						+ '<br>'
						+ i18n('GLOBAL/SUBJECT')
						+ ': '
						+ encodeHtml(sSubject)
						+ '<br><br>'
						+ sText.trim()
						+ '</div>';
					break;

				case ComposeType.ForwardAsAttachment:
					sText = '';
					break;

				default:
					encrypted = PgpUserStore.isEncrypted(sText);
					if (encrypted) {
						sText = message.plain();
					}
			}

			this.editor(editor => {
				encrypted || editor.setHtml(sText);
				if (encrypted || isPlainEditor()) {
					editor.modePlain();
				}
				encrypted && editor.setPlain(sText);
				this.setSignature(identity, msgComposeType);
				this.setFocusInPopup();
			});
		} else if (ComposeType.Empty === msgComposeType) {
			this.subject(null != sCustomSubject ? '' + sCustomSubject : '');
			this.editor(editor => {
				editor.setHtml(sCustomPlainText ? '' + sCustomPlainText : '');
				isPlainEditor() && editor.modePlain();
				this.setSignature(identity);
				this.setFocusInPopup();
			});
		} else if (arrayLength(oMessageOrArray)) {
			oMessageOrArray.forEach(item => this.addMessageAsAttachment(item));
			this.editor(editor => {
				isPlainEditor() ? editor.setPlain('') : editor.setHtml('');
				this.setSignature(identity, msgComposeType);
				this.setFocusInPopup();
			});
		} else {
			this.setFocusInPopup();
		}

		// item.CID item.isInline item.isLinked
		const downloads = this.attachments.filter(item => item && !item.tempName()).map(item => item.id);
		if (arrayLength(downloads)) {
			Remote.request('MessageUploadAttachments',
				(iError, oData) => {
					const result = oData?.Result;
					downloads.forEach((id, index) => {
						const attachment = this.getAttachmentById(id);
						if (attachment) {
							attachment
								.waiting(false)
								.uploading(false)
								.complete(true);
							if (iError || !result?.[index]) {
								attachment.error(getUploadErrorDescByCode(UploadErrorCode.NoFileUploaded));
							} else {
								attachment.tempName(result[index].TempName);
								attachment.type(result[index].MimeType);
							}
						}
					});
				},
				{
					Attachments: downloads
				},
				999000
			);
		}

		this.currentIdentity(identity);
	}

	setFocusInPopup() {
		setTimeout(() => {
			if (!this.to()) {
				this.to.focused(true);
			} else if (!this.subject()) {
				this.viewModelDom.querySelector('input[name="subject"]').focus();
			} else {
				this.oEditor?.focus();
			}
		}, 100);
	}

	tryToClose() {
		if (AskPopupView.hidden()) {
			if (ComposePopupView.inEdit() || (this.isEmptyForm() && !this.draftUid())) {
				this.close();
			} else {
				showScreenPopup(AskPopupView, [
					i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'),
					() => this.close()
				]);
			}
		}
	}

	onBuild(dom) {
		// initUploader
		const oJua = new Jua({
				action: serverRequest('Upload'),
				clickElement: dom.querySelector('#composeUploadButton'),
				dragAndDropElement: dom.querySelector('.b-attachment-place')
			}),
			attachmentSizeLimit = pInt(SettingsGet('AttachmentLimit'));

		oJua
			.on('onDragEnter', () => {
				this.dragAndDropOver(true);
			})
			.on('onDragLeave', () => {
				this.dragAndDropOver(false);
			})
			.on('onBodyDragEnter', () => {
				this.attachmentsArea();
				this.dragAndDropVisible(true);
			})
			.on('onBodyDragLeave', () => {
				this.dragAndDropVisible(false);
			})
			.on('onProgress', (id, loaded, total) => {
				let item = this.getAttachmentById(id);
				if (item) {
					item.progress(Math.floor((loaded / total) * 100));
				}
			})
			.on('onSelect', (sId, oData) => {
				this.dragAndDropOver(false);

				const
					size = pInt(oData.Size, null),
					attachment = new ComposeAttachmentModel(
						sId,
						oData.FileName ? oData.FileName.toString() : '',
						size
					);

				this.addAttachment(attachment, 1, oJua);

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
			.on('onStart', id => {
				let item = this.getAttachmentById(id);
				if (item) {
					item
						.waiting(false)
						.uploading(true)
						.complete(false);
				}
			})
			.on('onComplete', (id, result, data) => {
				const attachment = this.getAttachmentById(id),
					response = data?.Result || {},
					errorCode = response.ErrorCode,
					attachmentJson = result && response.Attachment;

				let error = '';
				if (null != errorCode) {
					error = getUploadErrorDescByCode(errorCode);
				} else if (!attachmentJson) {
					error = i18n('UPLOAD/ERROR_UNKNOWN');
				}

				if (attachment) {
					if (error) {
						attachment
							.waiting(false)
							.uploading(false)
							.complete(true)
							.error(error + '\n' + response.ErrorMessage);
					} else if (attachmentJson) {
						attachment
							.waiting(false)
							.uploading(false)
							.complete(true);
						attachment.fileName(attachmentJson.Name);
						attachment.size(attachmentJson.Size ? pInt(attachmentJson.Size) : 0);
						attachment.tempName(attachmentJson.TempName ? attachmentJson.TempName : '');
						attachment.isInline = false;
						attachment.type(attachmentJson.MimeType);
					}
				}
			});

		this.addAttachmentEnabled(true);

		addShortcut('q', 'meta', ScopeCompose, ()=>false);
		addShortcut('w', 'meta', ScopeCompose, ()=>false);

		addShortcut('m', 'meta', ScopeCompose, () => {
			this.identitiesDropdownTrigger(true);
			return false;
		});

		addShortcut('arrowdown', 'meta', ScopeCompose, () => {
			this.skipCommand();
			return false;
		});

		addShortcut('s', 'meta', ScopeCompose, () => {
			this.saveCommand();
			return false;
		});
		addShortcut('save', '', ScopeCompose, () => {
			this.saveCommand();
			return false;
		});

		if (Settings.app('allowCtrlEnterOnCompose')) {
			addShortcut('enter', 'meta', ScopeCompose, () => {
				this.sendCommand();
				return false;
			});
		}
		addShortcut('mailsend', '', ScopeCompose, () => {
			this.sendCommand();
			return false;
		});

		addShortcut('escape,close', 'shift', ScopeCompose, () => {
			this.tryToClose();
			return false;
		});

		this.editor(editor => editor[isPlainEditor()?'modePlain':'modeWysiwyg']());
	}

	/**
	 * @param {string} id
	 * @returns {?Object}
	 */
	getAttachmentById(id) {
		return this.attachments.find(item => item && id === item.id);
	}

	/**
	 * @param {MessageModel} message
	 */
	addMessageAsAttachment(message) {
		if (message) {
			let temp = message.subject();
			temp = '.eml' === temp.slice(-4).toLowerCase() ? temp : temp + '.eml';

			const attachment = new ComposeAttachmentModel(message.requestHash, temp, message.size());
			attachment.fromMessage = true;
			attachment.complete(true);
			this.addAttachment(attachment);
		}
	}

	addAttachment(attachment, view, oJua) {
		oJua || attachment.waiting(false).uploading(true);
		attachment.cancel = () => {
			this.attachments.remove(attachment);
			oJua?.cancel(attachment.id);
		};
		this.attachments.push(attachment);
		view && this.attachmentsArea();
	}

	/**
	 * @param {string} id
	 * @param {string} name
	 * @param {number} size
	 * @returns {ComposeAttachmentModel}
	 */
	addAttachmentHelper(id, name, size) {
		const attachment = new ComposeAttachmentModel(id, name, size);
		this.addAttachment(attachment, 1);
		return attachment;
	}

	/**
	 * @param {MessageModel} message
	 * @param {string} type
	 */
	prepareMessageAttachments(message, type) {
		if (message) {
			let reply = [ComposeType.Reply, ComposeType.ReplyAll].includes(type);
			if (reply || [ComposeType.Forward, ComposeType.Draft, ComposeType.EditAsNew].includes(type)) {
				// item instanceof AttachmentModel
				message.attachments.forEach(item => {
					if (!reply || item.isLinked()) {
						const attachment = new ComposeAttachmentModel(
							item.download,
							item.fileName,
							item.estimatedSize,
							item.isInline(),
							item.isLinked(),
							item.cid,
							item.contentLocation
						);
						attachment.fromMessage = true;
						attachment.type(item.mimeType);
						this.addAttachment(attachment);
					}
				});
			} else if (ComposeType.ForwardAsAttachment === type) {
				this.addMessageAsAttachment(message);
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
			: !this.attachments.some(item => item?.complete());

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

		this.requestDsn(SettingsUserStore.requestDsn());
		this.requestReadReceipt(SettingsUserStore.requestReadReceipt());
		this.markAsImportant(false);

		this.bodyArea();

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

		this.pgpSign(SettingsUserStore.pgpSign());
		this.pgpEncrypt(SettingsUserStore.pgpEncrypt());

		this.attachments([]);

		this.dragAndDropOver(false);
		this.dragAndDropVisible(false);

		this.draftsFolder('');
		this.draftUid(0);

		this.sending(false);
		this.saving(false);

		this.oEditor?.clear();

		this.dropMailvelope();
	}

	mailvelopeArea() {
		if (!this.mailvelope) {
			/**
			 * Creates an iframe with an editor for a new encrypted mail.
			 * The iframe will be injected into the container identified by selector.
			 * https://mailvelope.github.io/mailvelope/Editor.html
			 */
			let text = this.oEditor.getData(),
				encrypted = PgpUserStore.isEncrypted(text),
				size = SettingsGet('PhpUploadSizes')['post_max_size'],
				quota = pInt(size);
			switch (size.slice(-1)) {
				case 'G': quota *= 1024; // fallthrough
				case 'M': quota *= 1024; // fallthrough
				case 'K': quota *= 1024;
			}
			// Issue: can't select signing key
//			this.pgpSign(this.pgpSign() || confirm('Sign this message?'));
			mailvelope.createEditorContainer('#mailvelope-editor', PgpUserStore.mailvelopeKeyring, {
				// https://mailvelope.github.io/mailvelope/global.html#EditorContainerOptions
				quota: Math.max(2048, (quota / 1024)) - 48, // (text + attachments) limit in kilobytes
				armoredDraft: encrypted ? text : '', // Ascii Armored PGP Text Block
				predefinedText: encrypted ? '' : (this.oEditor.isHtml() ? htmlToPlain(text) : text),
/*
				quotedMail: '', // Ascii Armored PGP Text Block mail that should be quoted
				quotedMailIndent: true, // if true the quoted mail will be indented (default: true)
				quotedMailHeader: '', // header to be added before the quoted mail
				keepAttachments: false, // add attachments of quotedMail to editor (default: false)
				// Issue: can't select signing key
				signMsg: this.pgpSign()
*/
			}).then(editor => this.mailvelope = editor);
		}
		this.viewArea('mailvelope');
	}
	attachmentsArea() {
		this.viewArea('attachments');
	}
	bodyArea() {
		this.viewArea('body');
	}

	allRecipients() {
		return [
				// From/sender is also recipient (Sent mailbox)
//				this.currentIdentity().email(),
				this.from(),
				this.to(),
				this.cc(),
				this.bcc()
			].join(',').split(',').map(value => getEmail(value.trim())).validUnique();
	}

	initPgpEncrypt() {
		const recipients = this.allRecipients();
		PgpUserStore.hasPublicKeyForEmails(recipients).then(result => {
			console.log({canPgpEncrypt:result});
			this.canPgpEncrypt(result);
		});
		PgpUserStore.mailvelopeHasPublicKeyForEmails(recipients).then(result => {
			console.log({canMailvelope:result});
			this.canMailvelope(result);
			if (!result) {
				'mailvelope' === this.viewArea() && this.bodyArea();
//				this.dropMailvelope();
			}
		});
	}

	togglePgpSign() {
		this.pgpSign(!this.pgpSign()/* && this.canPgpSign()*/);
	}

	togglePgpEncrypt() {
		this.pgpEncrypt(!this.pgpEncrypt()/* && this.canPgpEncrypt()*/);
	}

	async getMessageRequestParams(sSaveFolder, draft)
	{
		// Prepare ComposeAttachmentModel attachments
		const attachments = {};
		this.attachments.forEach(item => {
			if (item?.complete() && item?.tempName() && item?.enabled()) {
				attachments[item.tempName()] = {
					name: item.fileName(),
					inline: item.isInline,
					cid: item.CID,
					location: item.contentLocation,
					type: item.mimeType()
				};
			}
		});

		const
			identity = this.currentIdentity(),
			params = {
				IdentityID: identity.id(),
				MessageFolder: this.draftsFolder(),
				MessageUid: this.draftUid(),
				SaveFolder: sSaveFolder,
				From: this.from(),
				To: this.to(),
				Cc: this.cc(),
				Bcc: this.bcc(),
				ReplyTo: this.replyTo(),
				subject: this.subject(),
				DraftInfo: this.aDraftInfo,
				InReplyTo: this.sInReplyTo,
				References: this.sReferences,
				MarkAsImportant: this.markAsImportant() ? 1 : 0,
				Attachments: attachments,
				// Only used at send, not at save:
				Dsn: this.requestDsn() ? 1 : 0,
				ReadReceiptRequest: this.requestReadReceipt() ? 1 : 0
			},
			recipients = draft ? [identity.email()] : this.allRecipients(),
			sign = !draft && this.pgpSign() && this.canPgpSign(),
			encrypt = this.pgpEncrypt() && this.canPgpEncrypt(),
			TextIsHtml = this.oEditor.isHtml();

		let Text = this.oEditor.getData();
		if (TextIsHtml) {
			let l;
			do {
				l = Text.length;
				Text = Text
					// Remove Microsoft Office styling
					.replace(/(<[^>]+[;"'])\s*mso-[a-z-]+\s*:[^;"']+/gi, '$1')
					// Remove hubspot data-hs- attributes
					.replace(/(<[^>]+)\s+data-hs-[a-z-]+=("[^"]+"|'[^']+')/gi, '$1');
			} while (l != Text.length)
			params.Html = Text;
			params.Text = htmlToPlain(Text);
		} else {
			params.Text = Text;
		}

		if (this.mailvelope && 'mailvelope' === this.viewArea()) {
			params.Encrypted = draft
				? await this.mailvelope.createDraft()
				: await this.mailvelope.encrypt(recipients);
		} else if (sign || encrypt) {
			let data = new MimePart;
			data.headers['Content-Type'] = 'text/'+(TextIsHtml?'html':'plain')+'; charset="utf-8"';
			data.headers['Content-Transfer-Encoding'] = 'base64';
			data.body = base64_encode(Text);
			if (TextIsHtml) {
				const alternative = new MimePart, plain = new MimePart;
				alternative.headers['Content-Type'] = 'multipart/alternative';
				plain.headers['Content-Type'] = 'text/plain; charset="utf-8"';
				plain.headers['Content-Transfer-Encoding'] = 'base64';
				plain.body = base64_encode(params.Text);
				// First add plain
				alternative.children.push(plain);
				// Now add HTML
				alternative.children.push(data);
				data = alternative;
			}
			if (!draft && sign?.[1]) {
				if ('openpgp' == sign[0]) {
					// Doesn't sign attachments
					params.Html = params.Text = '';
					let signed = new MimePart;
					signed.headers['Content-Type'] =
						'multipart/signed; micalg="pgp-sha256"; protocol="application/pgp-signature"';
					signed.headers['Content-Transfer-Encoding'] = '7Bit';
					signed.children.push(data);
					let signature = new MimePart;
					signature.headers['Content-Type'] = 'application/pgp-signature; name="signature.asc"';
					signature.headers['Content-Transfer-Encoding'] = '7Bit';
					signature.body = await OpenPGPUserStore.sign(data.toString(), sign[1], 1);
					signed.children.push(signature);
					params.Signed = signed.toString();
					params.Boundary = signed.boundary;
					data = signed;
				} else if ('gnupg' == sign[0]) {
					// TODO: sign in PHP fails
//					params.SignData = data.toString();
					params.SignFingerprint = sign[1].fingerprint;
					params.SignPassphrase = await GnuPGUserStore.sign(sign[1]);
				} else {
					throw 'Signing with ' + sign[0] + ' not yet implemented';
				}
			}
			if (encrypt) {
				if ('openpgp' == encrypt) {
					// Doesn't encrypt attachments
					params.Encrypted = await OpenPGPUserStore.encrypt(data.toString(), recipients);
					params.Signed = '';
				} else if ('gnupg' == encrypt) {
					// Does encrypt attachments
					params.EncryptFingerprints = JSON.stringify(GnuPGUserStore.getPublicKeyFingerprints(recipients));
				} else {
					throw 'Encryption with ' + encrypt + ' not yet implemented';
				}
			}
		}
		return params;
	}
}

/**
 * When view is closed and reopened, fill it with previous data.
 * This, for example, happens when opening Contacts view to select recipients
 */
ComposePopupView.inEdit = ko.observable(false);
