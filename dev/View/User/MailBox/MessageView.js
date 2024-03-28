import ko from 'ko';
import { addObservablesTo, addComputablesTo, addSubscribablesTo } from 'External/ko';

import { ScopeFolderList, ScopeMessageList, ScopeMessageView } from 'Common/Enums';

import {
	ComposeType,
	ClientSideKeyNameMessageHeaderFullInfo,
	ClientSideKeyNameMessageAttachmentControls,
	FolderType,
	MessageSetAction
} from 'Common/EnumsUser';
import { RFC822 } from 'Common/File';
import {
	elementById,
	keyScopeReal,
	Settings,
	SettingsCapa,
	fireEvent,
	stopEvent,
	addShortcut,
	registerShortcut
} from 'Common/Globals';

import { arrayLength } from 'Common/Utils';
import { download, downloadZip, mailToHelper, showMessageComposer, moveAction } from 'Common/UtilsUser';
import { isFullscreen, exitFullscreen, toggleFullscreen } from 'Common/Fullscreen';

import { SMAudio } from 'Common/Audio';

import { i18n } from 'Common/Translator';

import { AppUserStore } from 'Stores/User/App';
import { SettingsUserStore } from 'Stores/User/Settings';
import { AccountUserStore } from 'Stores/User/Account';
import { FolderUserStore, isAllowedKeyword } from 'Stores/User/Folder';
import { MessageUserStore } from 'Stores/User/Message';
import { MessagelistUserStore } from 'Stores/User/Messagelist';

import * as Local from 'Storage/Client';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewRight } from 'Knoin/AbstractViews';

import { PgpUserStore } from 'Stores/User/Pgp';

import { MimeToMessage } from 'Mime/Utils';

import { MessageModel } from 'Model/Message';

import { showScreenPopup } from 'Knoin/Knoin';
import { OpenPgpImportPopupView } from 'View/Popup/OpenPgpImport';
import { GnuPGUserStore } from 'Stores/User/GnuPG';
import { OpenPGPUserStore } from 'Stores/User/OpenPGP';
import { IdentityUserStore } from 'Stores/User/Identity';

import { Passphrases } from 'Storage/Passphrases';

const
	oMessageScrollerDom = () => elementById('messageItem') || {},

	currentMessage = MessageUserStore.message,

	setAction = action => {
		const message = currentMessage();
		message && MessagelistUserStore.setAction(message.folder, action, [message]);
	},

	fetchRaw = url => rl.fetch(url).then(response => response.ok && response.text());

export class MailMessageView extends AbstractViewRight {
	constructor() {
		super();

		const
			/**
			 * @param {Function} fExecute
			 * @param {Function} fCanExecute = true
			 * @returns {Function}
			 */
			createCommand = (fExecute, fCanExecute) => {
				let fResult = () => {
						fCanExecute() && fExecute.call(null);
						return false;
					};
				fResult.canExecute = fCanExecute;
				return fResult;
			},

			createCommandReplyHelper = type =>
				createCommand(() => this.replyOrforward(type), this.canBeRepliedOrForwarded),

			createCommandActionHelper = (folderType, bDelete) =>
				createCommand(() => {
					const message = currentMessage();
					if (message) {
						currentMessage(null);
						rl.app.moveMessagesToFolderType(folderType, message.folder, new Set([message.uid]), bDelete);
					}
				}, this.messageVisible);

		this.msgDefaultAction = SettingsUserStore.msgDefaultAction;
		this.simpleAttachmentsList = SettingsUserStore.simpleAttachmentsList;

		addObservablesTo(this, {
			showAttachmentControls: !!Local.get(ClientSideKeyNameMessageAttachmentControls),
			downloadAsZipLoading: false,
			showFullInfo: '1' === Local.get(ClientSideKeyNameMessageHeaderFullInfo),
			// bootstrap dropdown
			actionsMenu: null,
			// viewer
			viewFromShort: '',
			dkimData: ['none', '', ''],
			nowTracking: false
		});

		this.moveAction = moveAction;

		const attachmentsActions = Settings.app('attachmentsActions');
		this.attachmentsActions = ko.observableArray(arrayLength(attachmentsActions) ? attachmentsActions : []);

		this.hasCheckedMessages = MessagelistUserStore.hasChecked;
		this.archiveAllowed = MessagelistUserStore.archiveAllowed;
		this.canMarkAsSpam = MessagelistUserStore.canMarkAsSpam;
		this.isDraftFolder = MessagelistUserStore.isDraftFolder;
		this.isSpamFolder = MessagelistUserStore.isSpamFolder;

		this.message = currentMessage;
		this.messageLoadingThrottle = MessageUserStore.loading;
		this.messageError = MessageUserStore.error;

		this.fullScreenMode = isFullscreen;
		this.toggleFullScreen = toggleFullscreen;

		this.downloadAsZipError = ko.observable(false).extend({ falseTimeout: 7000 });

		this.messageDomFocused = ko.observable(false).extend({ rateLimit: 0 });

		// viewer
		this.viewHash = '';

		addComputablesTo(this, {
			allowAttachmentControls: () => arrayLength(attachmentsActions) && SettingsCapa('AttachmentsActions'),

			downloadAsZipAllowed: () => this.attachmentsActions.includes('zip')
				&& (currentMessage()?.attachments || [])
					.filter(item => item?.checked() && item?.download /*&& !item?.isLinked()*/)
					.length,

			tagsAllowed: () => FolderUserStore.currentFolder()?.tagsAllowed(),

			messageVisible: () => !MessageUserStore.loading() && !!currentMessage(),

			tagsToHTML: () => currentMessage()?.flags().map(value =>
					isAllowedKeyword(value)
					? '<span class="focused msgflag-'+value+'">' + i18n('MESSAGE_TAGS/'+value,0,value) + '</span>'
					: ''
				).join(' '),

			askReadReceipt: () => currentMessage()?.readReceipt
				&& !(MessagelistUserStore.isDraftFolder() || MessagelistUserStore.isSentFolder())
				&& !currentMessage()?.flags().includes('$mdnsent')
				&& !currentMessage()?.flags().includes('\\answered'),

			listAttachments: () => currentMessage()?.attachments()
				.filter(item => SettingsUserStore.listInlineAttachments() || !item.isLinked()),
//			hasAttachments: () => currentMessage()?.attachments()?.length,
			hasAttachments: () => currentMessage()?.attachments()
				.some(item => SettingsUserStore.listInlineAttachments() || !item.isLinked()),
//			listInline: () => currentMessage()?.attachments().filter(item => item.isLinked()),
//			hasInline: () => currentMessage()?.attachments().some(item => item.isLinked()),

			canBeRepliedOrForwarded: () => !MessagelistUserStore.isDraftFolder() && this.messageVisible(),

			dkimIcon: () => {
				switch (this.dkimData()[0]) {
					case 'none':
						return '';
					case 'pass':
						return '✔';
					default:
						return '✖';
				}
			},
			dkimIconClass: () => 'pass' === this.dkimData()[0] ? 'iconcolor-green' : 'iconcolor-red',

			dkimTitle:() => {
				const dkim = this.dkimData();
				return dkim[0] ? dkim[2] || 'DKIM: ' + dkim[0] : '';
			},

			showWhitelistOptions: () => 'match' === SettingsUserStore.viewImages(),

			firstUnsubsribeLink: () => currentMessage()?.unsubsribeLinks()[0] || '',

			pgpSupported: () => currentMessage() && PgpUserStore.isSupported(),

			messageListOrViewLoading:
				() => MessagelistUserStore.isLoading() | MessageUserStore.loading()
		});

		addSubscribablesTo(this, {
			message: message => {
				if (message) {
					if (this.viewHash !== message.hash) {
						this.scrollMessageToTop();
					}
					this.viewHash = message.hash;
					// TODO: make first param a user setting #683
					this.viewFromShort(message.from.toString(false, true));
					this.dkimData(message.dkim[0] || ['none', '', '']);
					this.nowTracking(false);
				} else {
					MessagelistUserStore.selectedMessage(null);

					this.viewHash = '';

					this.scrollMessageToTop();
				}
			},

			showFullInfo: value => Local.set(ClientSideKeyNameMessageHeaderFullInfo, value ? '1' : '0')
		});

		// commands
		this.replyCommand = createCommandReplyHelper(ComposeType.Reply);
		this.replyAllCommand = createCommandReplyHelper(ComposeType.ReplyAll);
		this.forwardCommand = createCommandReplyHelper(ComposeType.Forward);
		this.forwardAsAttachmentCommand = createCommandReplyHelper(ComposeType.ForwardAsAttachment);
		this.editAsNewCommand = createCommandReplyHelper(ComposeType.EditAsNew);

		this.deleteCommand = createCommandActionHelper(FolderType.Trash);
		this.deleteWithoutMoveCommand = createCommandActionHelper(FolderType.Trash, true);
		this.archiveCommand = createCommandActionHelper(FolderType.Archive);
		this.spamCommand = createCommandActionHelper(FolderType.Junk);
		this.notSpamCommand = createCommandActionHelper(FolderType.Inbox);

		decorateKoCommands(this, {
			editCommand: self => self.messageVisible(),
			moveCommand: self => self.messageVisible(),
			goUpCommand: self => !self.messageListOrViewLoading(),
			goDownCommand: self => !self.messageListOrViewLoading()
		});
	}

	toggleFullInfo() {
		this.showFullInfo(!this.showFullInfo());
	}

	closeMessage() {
		currentMessage(null);
	}

	editCommand() {
		currentMessage() && showMessageComposer([ComposeType.Draft, currentMessage()]);
	}

	moveCommand(vm, event) {
		if (vm && event?.preventDefault) {
			stopEvent(event);
		}
		this.actionsMenu().ddBtn.hide();
		AppUserStore.focusedState(ScopeFolderList);
		moveAction(true);
	}

	setUnseen() {
		setAction(MessageSetAction.UnsetSeen);
		currentMessage(null);
	}

	goUpCommand() {
		fireEvent('mailbox.message-list.selector.go-up',
			!!currentMessage() // bForceSelect
		);
	}

	goDownCommand() {
		fireEvent('mailbox.message-list.selector.go-down',
			!!currentMessage() // bForceSelect
		);
	}

	/**
	 * @param {string} sType
	 * @returns {void}
	 */
	replyOrforward(sType) {
		showMessageComposer([sType, currentMessage()]);
	}

	onBuild(dom) {
		const eqs = (ev, s) => ev.target.closestWithin(s, dom);
		dom.addEventListener('click', event => {
			let el = eqs(event, 'a');
			if (el && 0 === event.button && mailToHelper(el.href)) {
				stopEvent(event);
				return;
			}

			el = eqs(event, '.attachmentsPlace .showPreview');
			if (el) {
				const attachment = ko.dataFor(el), url = attachment?.linkDownload();
//				if (url && FileType.Eml === attachment.fileType) {
				if (url && RFC822 == attachment.mimeType) {
					stopEvent(event);
					fetchRaw(url).then(text => {
						const oMessage = new MessageModel();
						MimeToMessage(text, oMessage);
						// cleanHTML
						oMessage.popupMessage();
					});
				}
				return;
			}

			el = eqs(event, '.attachmentsPlace .showPreplay');
			if (el) {
				stopEvent(event);
				const attachment = ko.dataFor(el);
				if (attachment && SMAudio.supported) {
					switch (true) {
						case SMAudio.supportedMp3 && attachment.isMp3():
							SMAudio.playMp3(attachment.linkDownload(), attachment.fileName);
							break;
						case SMAudio.supportedOgg && attachment.isOgg():
							SMAudio.playOgg(attachment.linkDownload(), attachment.fileName);
							break;
						case SMAudio.supportedWav && attachment.isWav():
							SMAudio.playWav(attachment.linkDownload(), attachment.fileName);
							break;
						// no default
					}
				}
				return;
			}

			el = eqs(event, '.attachmentItem');
			if (el) {
				const attachment = ko.dataFor(el), url = attachment?.linkDownload();
				if (url) {
					if ('application/pgp-keys' == attachment.mimeType
					 && (OpenPGPUserStore.isSupported() || GnuPGUserStore.isSupported())) {
						fetchRaw(url).then(text =>
							showScreenPopup(OpenPgpImportPopupView, [text])
						);
					} else {
						download(url, attachment.fileName);
					}
				}
			}

			if (eqs(event, '.messageItemHeader .subjectParent .flagParent')) {
				setAction(currentMessage()?.isFlagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag);
			}
		});

		keyScopeReal.subscribe(value => this.messageDomFocused(ScopeMessageView === value));

		// initShortcuts

		// exit fullscreen, back
		addShortcut('escape', '', ScopeMessageView, () => {
			if (!this.viewModelDom.hidden && currentMessage()) {
				const preview = SettingsUserStore.usePreviewPane();
				if (isFullscreen()) {
					exitFullscreen();
					if (preview) {
						AppUserStore.focusedState(ScopeMessageList);
					}
				} else if (!preview) {
					currentMessage(null);
				} else {
					AppUserStore.focusedState(ScopeMessageList);
				}

				return false;
			}
		});

		// fullscreen
		addShortcut('enter,open', '', ScopeMessageView, () => {
			isFullscreen() || toggleFullscreen();
			return false;
		});

		// reply
		registerShortcut('r,mailreply', '', [ScopeMessageList, ScopeMessageView], () => {
			if (currentMessage()) {
				this.replyCommand();
				return false;
			}
			return true;
		});

		// replyAll
		registerShortcut('a', '', [ScopeMessageList, ScopeMessageView], () => {
			if (currentMessage()) {
				this.replyAllCommand();
				return false;
			}
		});
		registerShortcut('mailreply', 'shift', [ScopeMessageList, ScopeMessageView], () => {
			if (currentMessage()) {
				this.replyAllCommand();
				return false;
			}
		});

		// forward
		registerShortcut('f,mailforward', '', [ScopeMessageList, ScopeMessageView], () => {
			if (currentMessage()) {
				this.forwardCommand();
				return false;
			}
		});

		// message information
		registerShortcut('i', 'meta', [ScopeMessageList, ScopeMessageView], () => {
			currentMessage() && this.toggleFullInfo();
			return false;
		});

		// toggle message blockquotes
		registerShortcut('b', '', [ScopeMessageList, ScopeMessageView], () => {
			const message = currentMessage();
			if (message?.body) {
				message.body.querySelectorAll('details').forEach(node => node.open = !node.open);
				return false;
			}
		});

		addShortcut('arrowup,arrowleft', 'meta', [ScopeMessageList, ScopeMessageView], () => {
			this.goUpCommand();
			return false;
		});

		addShortcut('arrowdown,arrowright', 'meta', [ScopeMessageList, ScopeMessageView], () => {
			this.goDownCommand();
			return false;
		});

		// delete
		addShortcut('delete', '', ScopeMessageView, () => {
			this.deleteCommand();
			return false;
		});
		addShortcut('delete', 'shift', ScopeMessageView, () => {
			this.deleteWithoutMoveCommand();
			return false;
		});

		// change focused state
		addShortcut('arrowleft', '', ScopeMessageView, () => {
			if (!isFullscreen() && currentMessage() && SettingsUserStore.usePreviewPane()
			 && !oMessageScrollerDom().scrollLeft) {
				AppUserStore.focusedState(ScopeMessageList);
				return false;
			}
		});
		addShortcut('tab', 'shift', ScopeMessageView, () => {
			if (!isFullscreen() && currentMessage() && SettingsUserStore.usePreviewPane()) {
				AppUserStore.focusedState(ScopeMessageList);
			}
			return false;
		});

		MessageUserStore.bodiesDom(dom.querySelector('.bodyText'));
	}

	scrollMessageToTop() {
		oMessageScrollerDom().scrollTop = 0;
	}

	scrollMessageToLeft() {
		oMessageScrollerDom().scrollLeft = 0;
	}

	toggleAttachmentControls() {
		const b = !this.showAttachmentControls();
		this.showAttachmentControls(b);
		Local.set(ClientSideKeyNameMessageAttachmentControls, b);
	}

	downloadAsZip() {
		const hashes = (currentMessage()?.attachments || [])
			.map(item => item?.checked() /*&& !item?.isLinked()*/ ? item.download : '')
			.filter(v => v);
		downloadZip(
			currentMessage().subject(),
			hashes,
			() => this.downloadAsZipError(true),
			this.downloadAsZipLoading
		);
	}

	/**
	 * @param {MessageModel} oMessage
	 * @returns {void}
	 */
	showImages() {
		currentMessage().showExternalImages();
	}

	showTracking() {
		const msg = currentMessage(), body = msg?.body;
		if (body && msg.hasTracking()) {
			let attr = 'data-x-href-tracking';
			body.querySelectorAll('a['+attr+']').forEach(node => node.href = node.getAttribute(attr));
//			attr = 'data-x-src-tracking';
//			body.querySelectorAll('img['+attr+']').forEach(node => node.src = node.getAttribute(attr));
			this.nowTracking(true);
		}
	}

	whitelistText(txt) {
		let value = (SettingsUserStore.viewImagesWhitelist().trim() + '\n' + txt).trim();
/*
		if ('pass' === currentMessage().spf[0]?.[0]) value += '+spf';
		if ('pass' === currentMessage().dkim[0]?.[0]) value += '+dkim';
		if ('pass' === currentMessage().dmarc[0]?.[0]) value += '+dmarc';
*/
		SettingsUserStore.viewImagesWhitelist(value);
		Remote.saveSetting('ViewImagesWhitelist', value);
		currentMessage().showExternalImages(1);
	}

	/**
	 * @returns {string}
	 */
	printableCheckedMessageCount() {
		const cnt = MessagelistUserStore.listCheckedOrSelectedUidsWithSubMails().size;
		return 0 < cnt ? (100 > cnt ? cnt : '99+') : '';
	}

	/**
	 * @param {MessageModel} oMessage
	 * @returns {void}
	 */
	readReceipt() {
		let oMessage = currentMessage()
		if (oMessage.readReceipt) {
			Remote.request('SendReadReceiptMessage', iError => {
				if (!iError) {
					oMessage.flags.push('$mdnsent');
//					oMessage.flags.valueHasMutated();
				}
			}, {
				messageFolder: oMessage.folder,
				messageUid: oMessage.uid,
				readReceipt: oMessage.readReceipt,
				subject: i18n('READ_RECEIPT/SUBJECT', { SUBJECT: oMessage.subject() }),
				plain: i18n('READ_RECEIPT/BODY', { 'READ-RECEIPT': AccountUserStore.email() })
			});
		}
	}

	newTag() {
		let message = currentMessage();
		if (message) {
			let keyword = prompt(i18n('MESSAGE/NEW_TAG'), '')?.replace(/[\s\\]+/g, '');
			if (keyword.length && isAllowedKeyword(keyword)) {
				message.toggleTag(keyword);
				FolderUserStore.currentFolder().permanentFlags.push(keyword);
			}
		}
	}

	pgpDecrypt() {
		const oMessage = currentMessage(),
			data = oMessage.pgpEncrypted();
		delete data.error;
		PgpUserStore.decrypt(oMessage).then(result => {
			if (!result) {
				// TODO: translate
				throw Error('Decryption failed, canceled or not possible');
			}
			oMessage.pgpDecrypted(true);
			if (result.data) {
				MimeToMessage(result.data, oMessage);
				oMessage.html() ? oMessage.viewHtml() : oMessage.viewPlain();
				if (result.signatures?.length) {
					oMessage.pgpSigned({
						signatures: result.signatures,
						success: !!result.signatures.length
					});
				}
			}
		})
		.catch(e => {
			data.error = e.message;
		})
		.finally(() => {
			oMessage.pgpEncrypted(data);
		});
	}

	pgpVerify(/*self, event*/) {
		const oMessage = currentMessage()/*, ctrl = event.target.closest('.openpgp-control')*/;
		PgpUserStore.verify(oMessage).then(result => {
			if (result) {
				oMessage.pgpSigned(result);
			} else {
				alert('Verification failed or no valid public key found');
			}
/*
			if (result?.success) {
				i18n('CRYPTO/GOOD_SIGNATURE', {
					USER: validKey.user + ' (' + validKey.id + ')'
				});
				message.getText()
			} else {
				const keyIds = arrayLength(signingKeyIds) ? signingKeyIds : null,
					additional = keyIds
						? keyIds.map(item => item?.toHex?.()).filter(v => v).join(', ')
						: '';

				i18n('CRYPTO/ERROR', {
					TYPE: 'OpenPGP',
					ERROR: 'message'
				}) + (additional ? ' (' + additional + ')' : '');
			}
*/
		});
	}

	async smimeDecrypt() {
		const message = currentMessage();
		const addresses = message.from.concat(message.to, message.cc, message.bcc).map(item => item.email),
			identity = IdentityUserStore.find(item => addresses.includes(item.email())),
			data = message.smimeEncrypted(); // { partId: "1" }
		if (data && identity) {
			delete data.error;
			let pass, params = { ...data }; // clone
			params.folder = message.folder;
			params.uid = message.uid;
//			params.bodyPart = params.bodyPart?.raw;
			params.certificate = identity.smimeCertificate();
			params.privateKey = identity.smimeKey();
			if (identity.smimeKeyEncrypted()) {
				pass = await Passphrases.ask(identity,
					i18n('SMIME/PRIVATE_KEY_OF', {EMAIL: identity.email()}),
					'CRYPTO/DECRYPT'
				);
				if (!pass) {
					return;
				}
				params.passphrase = pass?.password;
			}
			Remote.post('SMimeDecryptMessage', null, params).then(response => {
				if (response?.Result?.data) {
					message.smimeDecrypted(true);
					MimeToMessage(response.Result.data, message);
					message.html() ? message.viewHtml() : message.viewPlain();
					pass && pass.remember && Passphrases.handle(identity, pass.password);
					if ('signed' in response.Result) {
						message.smimeSigned(response.Result.signed);
					}
				}
			}).catch(e => {
				data.error = e.message
			})
			.finally(() => {
				message.smimeEncrypted(data);
			});
		}
	}

	smimeVerify(/*self, event*/) {
		const message = currentMessage(),
			data = message.smimeSigned(); // { partId: "1", micAlg: "pgp-sha256" }
		if (data) {
			const params = { ...data }; // clone
			params.folder = message.folder;
			params.uid = message.uid;
			params.bodyPart = data.bodyPart?.raw;
			params.sigPart = data.sigPart?.bodyRaw;
			Remote.post('SMimeVerifyMessage', null, params).then(response => {
				if (response?.Result) {
					if (response.Result.body) {
						MimeToMessage(response.Result.body, message);
						message.html() ? message.viewHtml() : message.viewPlain();
					}
					data.success = response.Result.success;
					message.smimeSigned(data);
				}
			});
		}
	}

}
