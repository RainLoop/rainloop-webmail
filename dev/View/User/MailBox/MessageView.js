import ko from 'ko';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';

import {
	Capa,
	Scope
} from 'Common/Enums';

import {
	ComposeType,
	ClientSideKeyName,
	FolderType,
	MessageSetAction
} from 'Common/EnumsUser';

import { $htmlCL, leftPanelDisabled, keyScopeReal, moveAction, Settings, getFullscreenElement, exitFullscreen } from 'Common/Globals';

import { arrayLength, inFocus } from 'Common/Utils';
import { mailToHelper, showMessageComposer, initFullscreen } from 'Common/UtilsUser';

import { SMAudio } from 'Common/Audio';

import { i18n } from 'Common/Translator';
import { attachmentDownload } from 'Common/Links';

import { MessageFlagsCache } from 'Common/Cache';

import { AppUserStore } from 'Stores/User/App';
import { SettingsUserStore } from 'Stores/User/Settings';
import { AccountUserStore } from 'Stores/User/Account';
import { FolderUserStore } from 'Stores/User/Folder';
import { MessageUserStore } from 'Stores/User/Message';
import { ThemeStore } from 'Stores/Theme';

import * as Local from 'Storage/Client';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands, createCommand } from 'Knoin/Knoin';
import { AbstractViewRight } from 'Knoin/AbstractViews';

import { PgpUserStore } from 'Stores/User/Pgp';
import { OpenPGPUserStore } from 'Stores/User/OpenPGP';

const currentMessage = () => MessageUserStore.message();

export class MailMessageView extends AbstractViewRight {
	constructor() {
		super('MailMessageView');

		const
			createCommandReplyHelper = type =>
				createCommand(() => {
					this.lastReplyAction(type);
					this.replyOrforward(type);
				}, this.canBeRepliedOrForwarded),

			createCommandActionHelper = (folderType, useFolder) =>
				createCommand(() => {
					const message = currentMessage();
					if (message) {
						MessageUserStore.message(null);
						rl.app.deleteMessagesFromFolder(folderType, message.folder, [message.uid], useFolder);
					}
				}, this.messageVisibility);

		this.oMessageScrollerDom = null;

		this.addObservables({
			showAttachmentControls: false,
			downloadAsZipLoading: false,
			lastReplyAction_: '',
			showFullInfo: '1' === Local.get(ClientSideKeyName.MessageHeaderFullInfo),
			moreDropdownTrigger: false
		});

		this.moveAction = moveAction;

		this.allowMessageActions = Settings.capa(Capa.MessageActions);

		const attachmentsActions = Settings.app('attachmentsActions');
		this.attachmentsActions = ko.observableArray(arrayLength(attachmentsActions) ? attachmentsActions : []);

		this.message = MessageUserStore.message;
		this.hasCheckedMessages = MessageUserStore.hasCheckedMessages;
		this.messageLoadingThrottle = MessageUserStore.messageLoading;
		this.messagesBodiesDom = MessageUserStore.messagesBodiesDom;
		this.messageActiveDom = MessageUserStore.messageActiveDom;
		this.messageError = MessageUserStore.messageError;

		this.fullScreenMode = MessageUserStore.messageFullScreenMode;

		this.messageListOfThreadsLoading = ko.observable(false).extend({ rateLimit: 1 });
		this.highlightUnselectedAttachments = ko.observable(false).extend({ falseTimeout: 2000 });

		this.showAttachmentControlsState = v => Local.set(ClientSideKeyName.MessageAttachmentControls, !!v);

		this.downloadAsZipError = ko.observable(false).extend({ falseTimeout: 7000 });

		this.messageDomFocused = ko.observable(false).extend({ rateLimit: 0 });

		// commands
		this.replyCommand = createCommandReplyHelper(ComposeType.Reply);
		this.replyAllCommand = createCommandReplyHelper(ComposeType.ReplyAll);
		this.forwardCommand = createCommandReplyHelper(ComposeType.Forward);
		this.forwardAsAttachmentCommand = createCommandReplyHelper(ComposeType.ForwardAsAttachment);
		this.editAsNewCommand = createCommandReplyHelper(ComposeType.EditAsNew);

		this.deleteCommand = createCommandActionHelper(FolderType.Trash, true);
		this.deleteWithoutMoveCommand = createCommandActionHelper(FolderType.Trash, false);
		this.archiveCommand = createCommandActionHelper(FolderType.Archive, true);
		this.spamCommand = createCommandActionHelper(FolderType.Spam, true);
		this.notSpamCommand = createCommandActionHelper(FolderType.NotSpam, true);

		// viewer

		this.viewFolder = '';
		this.viewUid = '';
		this.viewHash = '';
		this.addObservables({
			viewSubject: '',
			viewFromShort: '',
			viewFromDkimData: ['none', ''],
			viewToShort: '',
			viewFrom: '',
			viewTo: '',
			viewCc: '',
			viewBcc: '',
			viewReplyTo: '',
			viewTimeStamp: 0,
			viewSize: '',
			viewSpamScore: 0,
			viewSpamStatus: '',
			viewLineAsCss: '',
			viewViewLink: '',
			viewUnsubscribeLink: '',
			viewDownloadLink: '',
			viewIsImportant: false,
			viewIsFlagged: false,
			hasVirus: null
		});

		this.addComputables({
			allowAttachmentControls: () => this.attachmentsActions.length && Settings.capa(Capa.AttachmentsActions),

			downloadAsZipAllowed: () => this.attachmentsActions.includes('zip') && this.allowAttachmentControls(),

			lastReplyAction: {
				read: this.lastReplyAction_,
				write: value => this.lastReplyAction_(
					[ComposeType.Reply, ComposeType.ReplyAll, ComposeType.Forward].includes(value)
						? ComposeType.Reply
						: value
				)
			},

			messageVisibility: () => !MessageUserStore.messageLoading() && !!currentMessage(),

			canBeRepliedOrForwarded: () => !this.isDraftFolder() && this.messageVisibility(),

			viewFromDkimVisibility: () => 'none' !== this.viewFromDkimData()[0],

			viewFromDkimStatusIconClass:() => {
				switch (this.viewFromDkimData()[0]) {
					case 'none':
						return '';
					case 'pass':
						return 'icon-ok iconcolor-green';
					default:
						return 'icon-warning-alt iconcolor-red';
				}
			},

			viewFromDkimStatusTitle:() => {
				const status = this.viewFromDkimData();
				if (arrayLength(status) && status[0]) {
					return status[1] || 'DKIM: ' + status[0];
				}

				return '';
			},

			pgpSigned: () => currentMessage() && !!currentMessage().pgpSigned(),
			pgpEncrypted: () => currentMessage()
				&& !!(currentMessage().pgpEncrypted() || currentMessage().isPgpEncrypted()),
			pgpSupported: () => currentMessage() && PgpUserStore.isSupported(),

			messageListOrViewLoading:
				() => MessageUserStore.listIsLoading() | MessageUserStore.messageLoading()
		});

		this.addSubscribables({
			showAttachmentControls: v => currentMessage()
				&& currentMessage().attachments.forEach(item => item && item.checked(!!v)),

			lastReplyAction_: value => Local.set(ClientSideKeyName.LastReplyAction, value),

			message: message => {
				this.messageActiveDom(null);

				if (message) {
					this.showAttachmentControls(false);
					if (Local.get(ClientSideKeyName.MessageAttachmentControls)) {
						setTimeout(() => {
							this.showAttachmentControls(true);
						}, 50);
					}

					if (this.viewHash !== message.hash) {
						this.scrollMessageToTop();
					}

					let spam = message.spamResult();

					this.viewFolder = message.folder;
					this.viewUid = message.uid;
					this.viewHash = message.hash;
					this.viewSubject(message.subject());
					this.viewFromShort(message.fromToLine(true, true));
					this.viewFromDkimData(message.fromDkimData());
					this.viewToShort(message.toToLine(true, true));
					this.viewFrom(message.fromToLine());
					this.viewTo(message.toToLine());
					this.viewCc(message.ccToLine());
					this.viewBcc(message.bccToLine());
					this.viewReplyTo(message.replyToToLine());
					this.viewTimeStamp(message.dateTimeStampInUTC());
					this.viewSize(message.friendlySize());
					this.viewSpamScore(message.spamScore());
					this.viewSpamStatus(spam ? i18n(message.isSpam() ? 'GLOBAL/SPAM' : 'GLOBAL/NOT_SPAM') + ': ' + spam : '');
					this.viewLineAsCss(message.lineAsCss());
					this.viewViewLink(message.viewLink());
					this.viewUnsubscribeLink(message.getFirstUnsubsribeLink());
					this.viewDownloadLink(message.downloadLink());
					this.viewIsImportant(message.isImportant());
					this.viewIsFlagged(message.isFlagged());
					this.hasVirus(message.hasVirus());
				} else {
					MessageUserStore.selectorMessageSelected(null);

					this.viewFolder = '';
					this.viewUid = '';
					this.viewHash = '';

					this.scrollMessageToTop();
				}
			},

			fullScreenMode: value => {
				if (this.oContent) {
					value ? this.oContent.requestFullscreen() : exitFullscreen();
				} else {
					$htmlCL.toggle('rl-message-fullscreen', value);
				}
			}
		});

		MessageUserStore.messageViewTrigger.subscribe(() => {
			const message = currentMessage();
			this.viewIsFlagged(message ? message.isFlagged() : false);
		});

		this.lastReplyAction(Local.get(ClientSideKeyName.LastReplyAction) || ComposeType.Reply);

		addEventListener('mailbox.message-view.toggle-full-screen', () => this.toggleFullScreen());

		decorateKoCommands(this, {
			closeMessageCommand: 1,
			messageEditCommand: self => self.messageVisibility(),
			goUpCommand: self => !self.messageListOrViewLoading(),
			goDownCommand: self => !self.messageListOrViewLoading()
		});
	}

	closeMessageCommand() {
		MessageUserStore.message(null);
	}

	messageEditCommand() {
		this.editMessage();
	}

	goUpCommand() {
		dispatchEvent(new CustomEvent('mailbox.message-list.selector.go-up',
			{detail:SettingsUserStore.usePreviewPane() || !!currentMessage()} // bForceSelect
		));
	}

	goDownCommand() {
		dispatchEvent(new CustomEvent('mailbox.message-list.selector.go-down',
			{detail:SettingsUserStore.usePreviewPane() || !!currentMessage()} // bForceSelect
		));
	}

	toggleFullScreen() {
		try {
			getSelection().removeAllRanges();
		} catch (e) {} // eslint-disable-line no-empty

		this.fullScreenMode(!this.fullScreenMode());
	}

	/**
	 * @param {string} sType
	 * @returns {void}
	 */
	replyOrforward(sType) {
		showMessageComposer([sType, currentMessage()]);
	}

	onBuild(dom) {
		this.oMessageScrollerDom = dom.querySelector('.messageItem');

		this.fullScreenMode.subscribe(value =>
			value && currentMessage() && AppUserStore.focusedState(Scope.MessageView));

		this.showFullInfo.subscribe(value => Local.set(ClientSideKeyName.MessageHeaderFullInfo, value ? '1' : '0'));

		const el = dom.querySelector('.b-content');
		this.oContent = initFullscreen(el, () => this.fullScreenMode(getFullscreenElement() === el));

		const eqs = (ev, s) => ev.target.closestWithin(s, dom);
		dom.addEventListener('click', event => {
			ThemeStore.isMobile() && leftPanelDisabled(true);

			let el = eqs(event, 'a');
			if (el) {
				return !(
					0 === event.button &&
					mailToHelper(el.href)
				);
			}

			if (eqs(event, '.attachmentsPlace .attachmentIconParent')) {
				event.stopPropagation();
			}

			el = eqs(event, '.attachmentsPlace .showPreplay');
			if (el) {
				event.stopPropagation();
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
			}

			el = eqs(event, '.attachmentsPlace .attachmentItem .attachmentNameParent');
			if (el) {
				const attachment = ko.dataFor(el);
				attachment && attachment.download && rl.app.download(attachment.linkDownload());
			}

			if (eqs(event, '.messageItemHeader .subjectParent .flagParent')) {
				const message = currentMessage();
				message && rl.app.messageListAction(
					message.folder,
					message.isFlagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					[message]
				);
			}
		});

		AppUserStore.focusedState.subscribe((value) => {
			if (Scope.MessageView !== value) {
				this.scrollMessageToTop();
				this.scrollMessageToLeft();
			}
		});

		keyScopeReal.subscribe(value => this.messageDomFocused(Scope.MessageView === value && !inFocus()));

		// initShortcuts

		// exit fullscreen, back
		shortcuts.add('escape,backspace', '', Scope.MessageView, () => {
			if (!this.viewModelDom.hidden && currentMessage()) {
				const preview = SettingsUserStore.usePreviewPane();
				if (this.fullScreenMode()) {
					this.fullScreenMode(false);

					if (preview) {
						AppUserStore.focusedState(Scope.MessageList);
					}
				} else if (!preview) {
					MessageUserStore.message(null);
				} else {
					AppUserStore.focusedState(Scope.MessageList);
				}

				return false;
			}
		});

		// fullscreen
		shortcuts.add('enter,open', '', Scope.MessageView, () => {
			this.toggleFullScreen();
			return false;
		});

		// reply
		shortcuts.add('r,mailreply', '', [Scope.MessageList, Scope.MessageView], () => {
			if (currentMessage()) {
				this.replyCommand();
				return false;
			}
			return true;
		});

		// replyAll
		shortcuts.add('a', '', [Scope.MessageList, Scope.MessageView], () => {
			if (currentMessage()) {
				this.replyAllCommand();
				return false;
			}
		});
		shortcuts.add('mailreply', 'shift', [Scope.MessageList, Scope.MessageView], () => {
			if (currentMessage()) {
				this.replyAllCommand();
				return false;
			}
		});

		// forward
		shortcuts.add('f,mailforward', '', [Scope.MessageList, Scope.MessageView], () => {
			if (currentMessage()) {
				this.forwardCommand();
				return false;
			}
		});

		// message information
		shortcuts.add('i', 'meta', [Scope.MessageList, Scope.MessageView], () => {
			if (currentMessage()) {
				this.showFullInfo(!this.showFullInfo());
			}
			return false;
		});

		// toggle message blockquotes
		shortcuts.add('b', '', [Scope.MessageList, Scope.MessageView], () => {
			const message = currentMessage();
			if (message && message.body) {
				message.body.querySelectorAll('.rlBlockquoteSwitcher').forEach(node => node.click());
				return false;
			}
		});

		shortcuts.add('arrowup,arrowleft', 'meta', [Scope.MessageList, Scope.MessageView], () => {
			this.goUpCommand();
			return false;
		});

		shortcuts.add('arrowdown,arrowright', 'meta', [Scope.MessageList, Scope.MessageView], () => {
			this.goDownCommand();
			return false;
		});

		// print
		shortcuts.add('p,printscreen', 'meta', [Scope.MessageView, Scope.MessageList], () => {
			currentMessage() && currentMessage().printMessage();
			return false;
		});

		// delete
		shortcuts.add('delete', '', Scope.MessageView, () => {
			this.deleteCommand();
			return false;
		});
		shortcuts.add('delete', 'shift', Scope.MessageView, () => {
			this.deleteWithoutMoveCommand();
			return false;
		});

		// change focused state
		shortcuts.add('arrowleft', '', Scope.MessageView, () => {
			if (!this.fullScreenMode() && currentMessage() && SettingsUserStore.usePreviewPane()
			 && !this.oMessageScrollerDom.scrollLeft) {
				AppUserStore.focusedState(Scope.MessageList);
				return false;
			}
		});
		shortcuts.add('tab', 'shift', Scope.MessageView, () => {
			if (!this.fullScreenMode() && currentMessage() && SettingsUserStore.usePreviewPane()) {
				AppUserStore.focusedState(Scope.MessageList);
			}
			return false;
		});
	}

	/**
	 * @returns {boolean}
	 */
	isDraftFolder() {
		return currentMessage() && FolderUserStore.draftsFolder() === currentMessage().folder;
	}

	/**
	 * @returns {boolean}
	 */
	isSentFolder() {
		return currentMessage() && FolderUserStore.sentFolder() === currentMessage().folder;
	}

	/**
	 * @returns {boolean}
	 */
	isSpamFolder() {
		return currentMessage() && FolderUserStore.spamFolder() === currentMessage().folder;
	}

	/**
	 * @returns {boolean}
	 */
	isSpamDisabled() {
		return currentMessage() && FolderUserStore.spamFolder() === UNUSED_OPTION_VALUE;
	}

	/**
	 * @returns {boolean}
	 */
	isArchiveFolder() {
		return currentMessage() && FolderUserStore.archiveFolder() === currentMessage().folder;
	}

	/**
	 * @returns {boolean}
	 */
	isArchiveDisabled() {
		return currentMessage() && FolderUserStore.archiveFolder() === UNUSED_OPTION_VALUE;
	}

	/**
	 * @returns {boolean}
	 */
	isDraftOrSentFolder() {
		return this.isDraftFolder() || this.isSentFolder();
	}

	composeClick() {
		showMessageComposer();
	}

	editMessage() {
		if (currentMessage()) {
			showMessageComposer([ComposeType.Draft, currentMessage()]);
		}
	}

	scrollMessageToTop() {
		this.oMessageScrollerDom.scrollTop = (50 < this.oMessageScrollerDom.scrollTop) ? 50 : 0;
	}

	scrollMessageToLeft() {
		this.oMessageScrollerDom.scrollLeft = 0;
	}

	downloadAsZip() {
		const hashes = (currentMessage() ? currentMessage().attachments : [])
			.map(item => (item && !item.isLinked && item.checked() ? item.download : ''))
			.filter(v => v);
		if (hashes.length) {
			Remote.attachmentsActions('Zip', hashes, this.downloadAsZipLoading)
				.then(result => {
					if (result && result.Result && result.Result.FileHash) {
						rl.app.download(attachmentDownload(result.Result.FileHash));
					} else {
						this.downloadAsZipError(true);
					}
				})
				.catch(() => this.downloadAsZipError(true));
		} else {
			this.highlightUnselectedAttachments(true);
		}
	}

	/**
	 * @param {MessageModel} oMessage
	 * @returns {void}
	 */
	showImages() {
		currentMessage() && currentMessage().showExternalImages();
	}

	/**
	 * @returns {string}
	 */
	printableCheckedMessageCount() {
		const cnt = MessageUserStore.listCheckedOrSelectedUidsWithSubMails().length;
		return 0 < cnt ? (100 > cnt ? cnt : '99+') : '';
	}

	/**
	 * @param {MessageModel} oMessage
	 * @returns {void}
	 */
	readReceipt() {
		let oMessage = currentMessage()
		if (oMessage && oMessage.readReceipt()) {
			Remote.request('SendReadReceiptMessage', null, {
				MessageFolder: oMessage.folder,
				MessageUid: oMessage.uid,
				ReadReceipt: oMessage.readReceipt(),
				Subject: i18n('READ_RECEIPT/SUBJECT', { SUBJECT: oMessage.subject() }),
				Text: i18n('READ_RECEIPT/BODY', { 'READ-RECEIPT': AccountUserStore.email() })
			});

			oMessage.flags.push('$mdnsent');
//			oMessage.flags.valueHasMutated();

			MessageFlagsCache.store(oMessage);

			rl.app.reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	}

	pgpDecrypt(self) {
		const message = self.message(),
			sender = message && message.from[0].email,
			pgpInfo = message && message.pgpEncrypted();
		if (pgpInfo) {
			// Also check message.from[0].email
			PgpUserStore.getKeyForDecryption(pgpInfo.KeyIds, message.to[0].email).then(result => {
				if (!result) {
					// TODO: show error
					alert('No decrypt key found for ids:\n\n' + pgpInfo.KeyIds.join('\n'));
					return;
				}
				if ('mailvelope' === result[0]) {
					/**
					* https://mailvelope.github.io/mailvelope/Mailvelope.html#createEncryptedFormContainer
					* Creates an iframe to display an encrypted form
					*/
//					mailvelope.createEncryptedFormContainer('#mailvelope-form');
					/**
					* https://mailvelope.github.io/mailvelope/Mailvelope.html#createDisplayContainer
					* Creates an iframe to display the decrypted content of the encrypted mail.
					*/
					let body = message.body;
					body.textContent = '';
					mailvelope.createDisplayContainer(
						'#'+body.id,
						message.plain(),
						PgpUserStore.mailvelopeKeyring,
						{
							senderAddress: sender
						}
					).then(status => {
						if (status.error && status.error.message) {
							alert(status.error.code + ': ' + status.error.message);
						} else {
							body.classList.add('mailvelope');
						}
					}, error => {
						console.error(error);
					});
				}
				else if ('openpgp' === result[0]) {
					const publicKey = OpenPGPUserStore.getPublicKeyFor(sender);
//					OpenPGPUserStore.decrypt(message.plain(), result[1].armor
					OpenPGPUserStore.decrypt(message.plain(), result[1].key, publicKey ? publicKey.key : null).then(result => {
						if (result) {
							// TODO: if result.data is not cleartext then
							// parse mime to find and verify signature
							message.plain(result.data);
							message.viewPlain();
						} else {
//							controlsHelper(dom, this, false, i18n('PGP_NOTIFICATIONS/DECRYPTION_ERROR'));
						}
					});
				}
				else if ('gnupg' === result[0]) {
					let params = {
						Folder: message.folder,
						Uid: message.uid,
						PartId: pgpInfo.PartId,
						KeyId: result[1].id,
						Passphrase: prompt('Passphrase for ' + result[1].id + ' ' + result[1].uids[0].uid),
						Data: '' // optional
					}
					if (params.Passphrase) {
						rl.app.Remote.post('GnupgDecrypt', null, params)
							.then(data => {
								// TODO
								console.dir(data);
							})
							.catch(error => {
								// TODO
								console.dir(error);
							});
					}
				}
			});
		}
	}

	pgpVerify(self) {
		if (self.pgpSigned()) {
			const message = self.message(),
				sender = message && message.from[0].email;
			PgpUserStore.hasPublicKeyForEmails([message.from[0].email]).then(mode => {
				if ('gnupg' === mode) {
					let params = message.pgpSigned(); // { BodyPartId: "1", SigPartId: "2", MicAlg: "pgp-sha256" }
					if (params) {
						params.Folder = message.folder;
						params.Uid = message.uid;
						rl.app.Remote.post('MessagePgpVerify', null, params)
							.then(data => {
								// TODO
								console.dir(data);
							})
							.catch(error => {
								// TODO
								console.dir(error);
							});
					}
				} else if ('openpgp' === mode) {
					const publicKey = OpenPGPUserStore.getPublicKeyFor(sender);
					OpenPGPUserStore.verify(message.plain(), null/*detachedSignature*/, publicKey).then(result => {
						if (result) {
							message.plain(result.data);
							message.viewPlain();
							console.dir({signatures:result.signatures});
						}
/*
							if (validKey) {
								i18n('PGP_NOTIFICATIONS/GOOD_SIGNATURE', {
									USER: validKey.user + ' (' + validKey.id + ')'
								});
								message.getText()
							} else {
								const keyIds = arrayLength(signingKeyIds) ? signingKeyIds : null,
									additional = keyIds
										? keyIds.map(item => (item && item.toHex ? item.toHex() : null)).filter(v => v).join(', ')
										: '';

								i18n('PGP_NOTIFICATIONS/UNVERIFIRED_SIGNATURE') + (additional ? ' (' + additional + ')' : '');
							}
*/
					});
				}
			});
		}
	}

}
