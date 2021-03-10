import ko from 'ko';

import { UNUSED_OPTION_VALUE } from 'Common/Consts';

import {
	Capa,
	KeyState
} from 'Common/Enums';

import {
	ComposeType,
	ClientSideKeyName,
	FolderType,
	Focused,
	MessageSetAction
} from 'Common/EnumsUser';

import { doc, $htmlCL, leftPanelDisabled, keyScopeReal, moveAction, Settings } from 'Common/Globals';

import { inFocus } from 'Common/Utils';
import { mailToHelper, showMessageComposer } from 'Common/UtilsUser';

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

function isTransparent(color) {
	return 'rgba(0, 0, 0, 0)' === color || 'transparent' === color;
}

class MessageViewMailBoxUserView extends AbstractViewRight {
	constructor() {
		super('User/MailBox/MessageView', 'MailMessageView');

		const createCommandReplyHelper = type =>
			createCommand(() => {
				this.lastReplyAction(type);
				this.replyOrforward(type);
			}, this.canBeRepliedOrForwarded),

		createCommandActionHelper = (folderType, useFolder) =>
			createCommand(() => {
				const message = this.message();
				if (message && this.allowMessageListActions) {
					this.message(null);
					rl.app.deleteMessagesFromFolder(folderType, message.folder, [message.uid], useFolder);
				}
			}, this.messageVisibility);

		this.oHeaderDom = null;
		this.oMessageScrollerDom = null;

		this.addObservables({
			bodyBackgroundColor: '',
			showAttachmnetControls: false,
			downloadAsZipLoading: false,
			lastReplyAction_: '',
			showFullInfo: '1' === Local.get(ClientSideKeyName.MessageHeaderFullInfo),
			moreDropdownTrigger: false
		});

		this.pswp = null;

		this.moveAction = moveAction;

		this.allowComposer = Settings.capa(Capa.Composer);
		this.allowMessageActions = Settings.capa(Capa.MessageActions);
		this.allowMessageListActions = Settings.capa(Capa.MessageListActions);

		this.attachmentsActions = AppUserStore.attachmentsActions;

		this.message = MessageUserStore.message;
//		this.messageListChecked = MessageUserStore.messageListChecked;
		this.hasCheckedMessages = MessageUserStore.hasCheckedMessages;
		this.messageListCheckedOrSelectedUidsWithSubMails = MessageUserStore.messageListCheckedOrSelectedUidsWithSubMails;
		this.messageLoadingThrottle = MessageUserStore.messageLoadingThrottle;
		this.messagesBodiesDom = MessageUserStore.messagesBodiesDom;
		this.useThreads = SettingsUserStore.useThreads;
		this.replySameFolder = SettingsUserStore.replySameFolder;
		this.layout = SettingsUserStore.layout;
		this.isMessageSelected = MessageUserStore.isMessageSelected;
		this.messageActiveDom = MessageUserStore.messageActiveDom;
		this.messageError = MessageUserStore.messageError;

		this.fullScreenMode = MessageUserStore.messageFullScreenMode;

		this.messageListOfThreadsLoading = ko.observable(false).extend({ rateLimit: 1 });
		this.highlightUnselectedAttachments = ko.observable(false).extend({ falseTimeout: 2000 });

		this.showAttachmnetControlsState = v => Local.set(ClientSideKeyName.MessageAttachmentControls, !!v);

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
			viewBodyTopValue: 0,
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
			viewLineAsCss: '',
			viewViewLink: '',
			viewUnsubscribeLink: '',
			viewDownloadLink: '',
			viewIsImportant: false,
			viewIsFlagged: false
		});

		this.addComputables({
			allowAttachmnetControls: () => this.attachmentsActions.length && Settings.capa(Capa.AttachmentsActions),

			downloadAsZipAllowed: () => this.attachmentsActions.includes('zip') && this.allowAttachmnetControls(),

			lastReplyAction: {
				read: this.lastReplyAction_,
				write: value => this.lastReplyAction_(
					[ComposeType.Reply, ComposeType.ReplyAll, ComposeType.Forward].includes(value)
						? ComposeType.Reply
						: value
				)
			},

			messageVisibility: () => !this.messageLoadingThrottle() && !!this.message(),

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
				if (Array.isNotEmpty(status)) {
					if (status[0]) {
						return status[1] || 'DKIM: ' + status[0];
					}
				}

				return '';
			},

			messageFocused: () => Focused.MessageView === AppUserStore.focusedState(),

			messageListAndMessageViewLoading:
				() => MessageUserStore.messageListCompleteLoadingThrottle() || MessageUserStore.messageLoadingThrottle()
		});

		this.addSubscribables({
			showAttachmnetControls: v => this.message()
				&& this.message().attachments.forEach(item => item && item.checked(!!v)),

			lastReplyAction_: value => Local.set(ClientSideKeyName.LastReplyAction, value),

			messageActiveDom: dom => this.bodyBackgroundColor(this.detectDomBackgroundColor(dom)),

			message: message => {
				this.messageActiveDom(null);

				if (message) {
					this.showAttachmnetControls(false);
					if (Local.get(ClientSideKeyName.MessageAttachmentControls)) {
						setTimeout(() => {
							this.showAttachmnetControls(true);
						}, 50);
					}

					if (this.viewHash !== message.hash) {
						this.scrollMessageToTop();
					}

					this.viewFolder = message.folder;
					this.viewUid = message.uid;
					this.viewHash = message.hash;
					this.viewSubject(message.subject());
					this.viewFromShort(message.fromToLine(true, true));
					this.viewFromDkimData(message.fromDkimData());
					this.viewToShort(message.toToLine(true, true));
					this.viewFrom(message.fromToLine(false));
					this.viewTo(message.toToLine(false));
					this.viewCc(message.ccToLine(false));
					this.viewBcc(message.bccToLine(false));
					this.viewReplyTo(message.replyToToLine(false));
					this.viewTimeStamp(message.dateTimeStampInUTC());
					this.viewSize(message.friendlySize());
					this.viewLineAsCss(message.lineAsCss());
					this.viewViewLink(message.viewLink());
					this.viewUnsubscribeLink(message.getFirstUnsubsribeLink());
					this.viewDownloadLink(message.downloadLink());
					this.viewIsImportant(message.isImportant());
					this.viewIsFlagged(message.isFlagged());
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
					value ? this.oContent.requestFullscreen() : doc.exitFullscreen();
				} else {
					$htmlCL.toggle('rl-message-fullscreen', value);
				}
			}
		});

		MessageUserStore.messageViewTrigger.subscribe(() => {
			const message = this.message();
			message ? this.viewIsFlagged(message.isFlagged()) : this.viewIsFlagged(false);
		});

		this.lastReplyAction(Local.get(ClientSideKeyName.LastReplyAction) || ComposeType.Reply);

		addEventListener('mailbox.message-view.toggle-full-screen', () => this.toggleFullScreen());

		this.attachmentPreview = this.attachmentPreview.bind(this);

		decorateKoCommands(this, {
			closeMessageCommand: 1,
			messageVisibilityCommand: self => self.messageVisibility(),
			messageEditCommand: self => self.messageVisibility(),
			goUpCommand: self => !self.messageListAndMessageViewLoading(),
			goDownCommand: self => !self.messageListAndMessageViewLoading()
		});
	}

	closeMessageCommand() {
		MessageUserStore.message(null);
	}

	messageVisibilityCommand() {}

	messageEditCommand() {
		this.editMessage();
	}

	goUpCommand() {
		dispatchEvent(new CustomEvent('mailbox.message-list.selector.go-up',
			{detail:SettingsUserStore.usePreviewPane() || !!this.message()} // bForceSelect
		));
	}

	goDownCommand() {
		dispatchEvent(new CustomEvent('mailbox.message-list.selector.go-down',
			{detail:SettingsUserStore.usePreviewPane() || !!this.message()} // bForceSelect
		));
	}

	detectDomBackgroundColor(dom) {
		let color = '';
		if (dom && !SettingsUserStore.removeColors()) {
			let limit = 5,
				aC = dom;
			while (!color && aC && limit--) {
				let children = aC.children;
				if (!children || 1 !== children.length || !children[0].matches('table,div,center')) break;

				aC = children[0];
				color = aC.style.backgroundColor || '';
				if (!aC.matches('table')) {
					color = isTransparent(color) ? '' : color;
				}
			}

			color = isTransparent(color) ? '' : color;
		}
		return color;
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
		showMessageComposer([sType, MessageUserStore.message()]);
	}

	checkHeaderHeight() {
		this.oHeaderDom && this.viewBodyTopValue(this.message() ? this.oHeaderDom.offsetHeight : 0);
	}

	//  displayMailToPopup(sMailToUrl) {
	//		sMailToUrl = sMailToUrl.replace(/\?.+$/, '');
	//
	//		var
	//			sResult = '',
	//			aTo = [],
	//			EmailModel = require('Model/Email').default,
	//			fParseEmailLine = function(sLine) {
	//				return sLine ? [decodeURIComponent(sLine)].map(sItem => {
	//						var oEmailModel = new EmailModel();
	//						oEmailModel.parse(sItem);
	//						return oEmailModel.email ? oEmailModel : null;
	//					}).filter(v => v) : null;
	//			}
	//		;
	//
	//		aTo = fParseEmailLine(sMailToUrl);
	//		sResult = aTo && aTo[0] ? aTo[0].email : '';
	//
	//		return sResult;
	//	}

	/**
	 * @param {Object} oAttachment
	 * @returns {boolean}
	 */
	attachmentPreview(/*attachment*/) {
/*
		if (attachment && attachment.isImage() && !attachment.isLinked && this.message() && this.message().attachments()) {
			const items = this.message().attachments.map(item => {
					if (item && !item.isLinked && item.isImage()) {
						if (item === attachment) {
							index = listIndex;
						}
						++listIndex;
						return {
							src: item.linkPreview(),
							msrc: item.linkThumbnail(),
							title: item.fileName
						};
					}
					return null;
				}).filter(v => v);

			if (items.length) {
			}
		}
*/
		return true;
	}

	onBuild(dom) {
		this.fullScreenMode.subscribe(value => value && this.message() && AppUserStore.focusedState(Focused.MessageView));

		this.showFullInfo.subscribe(value => Local.set(ClientSideKeyName.MessageHeaderFullInfo, value ? '1' : '0'));

		let el = dom.querySelector('.messageItemHeader');
		this.oHeaderDom = el;
		if (el) {
			if (!this.resizeObserver) {
				this.resizeObserver = new ResizeObserver(this.checkHeaderHeight.debounce(50).bind(this));
			}
			this.resizeObserver.observe(el);
		} else if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}

		let event = 'fullscreenchange';
		el = dom.querySelector('.b-message-view-wrapper');
		if (!el.requestFullscreen && el.webkitRequestFullscreen) {
			el.requestFullscreen = el.webkitRequestFullscreen;
			event = 'webkit'+event;
		}
		if (el.requestFullscreen) {
			if (!doc.exitFullscreen && doc.webkitExitFullscreen) {
				doc.exitFullscreen = doc.webkitExitFullscreen;
			}
			this.oContent = el;
			el.addEventListener(event, () =>
				this.fullScreenMode((doc.fullscreenElement || doc.webkitFullscreenElement) === el)
			);
		}

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
				const attachment = ko.dataFor(el); // eslint-disable-line no-invalid-this
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
				// eslint-disable-line prefer-arrow-callback
				const message = this.message();
				message && rl.app.messageListAction(
					message.folder,
					message.isFlagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					[message]
				);
			}

			el = eqs(event, '.thread-list .flagParent');
			if (el) {
				// eslint-disable-line prefer-arrow-callback
				const message = ko.dataFor(el); // eslint-disable-line no-invalid-this
				message && message.folder && message.uid &&  rl.app.messageListAction(
					message.folder,
					message.isFlagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
					[message]
				);

				this.threadsDropdownTrigger(true);

				return false;
			}
		});

		AppUserStore.focusedState.subscribe((value) => {
			if (Focused.MessageView !== value) {
				this.scrollMessageToTop();
				this.scrollMessageToLeft();
			}
		});

		keyScopeReal.subscribe(value => this.messageDomFocused(KeyState.MessageView === value && !inFocus()));

		this.oMessageScrollerDom = dom.querySelector('.messageItem');

		this.initShortcuts();
	}

	/**
	 * @returns {boolean}
	 */
	escShortcuts() {
		if (this.viewModelVisible && this.message()) {
			const preview = SettingsUserStore.usePreviewPane();
			if (this.fullScreenMode()) {
				this.fullScreenMode(false);

				if (preview) {
					AppUserStore.focusedState(Focused.MessageList);
				}
			} else if (!preview) {
				this.message(null);
			} else {
				AppUserStore.focusedState(Focused.MessageList);
			}

			return false;
		}

		return true;
	}

	initShortcuts() {
		// exit fullscreen, back
		shortcuts.add('escape,backspace', '', KeyState.MessageView, this.escShortcuts.bind(this));

		// fullscreen
		shortcuts.add('enter,open', '', KeyState.MessageView, () => {
			this.toggleFullScreen();
			return false;
		});

		// reply
		shortcuts.add('r,mailreply', '', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageUserStore.message()) {
				this.replyCommand();
				return false;
			}
			return true;
		});

		// replaAll
		shortcuts.add('a', '', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageUserStore.message()) {
				this.replyAllCommand();
				return false;
			}
			return true;
		});
		shortcuts.add('mailreply', 'shift', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageUserStore.message()) {
				this.replyAllCommand();
				return false;
			}
			return true;
		});

		// forward
		shortcuts.add('f,mailforward', '', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageUserStore.message()) {
				this.forwardCommand();
				return false;
			}

			return true;
		});

		// message information
		shortcuts.add('i', 'meta', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageUserStore.message()) {
				this.showFullInfo(!this.showFullInfo());
			}
			return false;
		});

		// toggle message blockquotes
		shortcuts.add('b', '', [KeyState.MessageList, KeyState.MessageView], () => {
			const message = MessageUserStore.message();
			if (message && message.body) {
				message.body.querySelectorAll('.rlBlockquoteSwitcher').forEach(node => node.click());
				return false;
			}
			return true;
		});

		shortcuts.add('arrowup,arrowleft', 'meta', [KeyState.MessageList, KeyState.MessageView], () => {
			this.goUpCommand();
			return false;
		});

		shortcuts.add('arrowdown,arrowright', 'meta', [KeyState.MessageList, KeyState.MessageView], () => {
			this.goDownCommand();
			return false;
		});

		// print
		shortcuts.add('p,printscreen', 'meta', [KeyState.MessageView, KeyState.MessageList], () => {
			this.message() && this.message().printMessage();
			return false;
		});

		// delete
		shortcuts.add('delete', '', KeyState.MessageView, () => {
			this.deleteCommand();
			return false;
		});
		shortcuts.add('delete', 'shift', KeyState.MessageView, () => {
			this.deleteWithoutMoveCommand();
			return false;
		});

		// change focused state
		shortcuts.add('arrowleft', '', KeyState.MessageView, () => {
			if (!this.fullScreenMode() && this.message() && SettingsUserStore.usePreviewPane()) {
				if (this.oMessageScrollerDom && 0 < this.oMessageScrollerDom.scrollLeft) {
					return true;
				}
				AppUserStore.focusedState(Focused.MessageList);
				return false;
			}
		});
//		shortcuts.add('tab', 'shift', KeyState.MessageView, (event, handler) => {
		shortcuts.add('tab', '', KeyState.MessageView, () => {
			if (!this.fullScreenMode() && this.message() && SettingsUserStore.usePreviewPane()) {
				AppUserStore.focusedState(Focused.MessageList);
			}
			return false;
		});
	}

	/**
	 * @returns {boolean}
	 */
	isDraftFolder() {
		return MessageUserStore.message() && FolderUserStore.draftFolder() === MessageUserStore.message().folder;
	}

	/**
	 * @returns {boolean}
	 */
	isSentFolder() {
		return MessageUserStore.message() && FolderUserStore.sentFolder() === MessageUserStore.message().folder;
	}

	/**
	 * @returns {boolean}
	 */
	isSpamFolder() {
		return MessageUserStore.message() && FolderUserStore.spamFolder() === MessageUserStore.message().folder;
	}

	/**
	 * @returns {boolean}
	 */
	isSpamDisabled() {
		return MessageUserStore.message() && FolderUserStore.spamFolder() === UNUSED_OPTION_VALUE;
	}

	/**
	 * @returns {boolean}
	 */
	isArchiveFolder() {
		return MessageUserStore.message() && FolderUserStore.archiveFolder() === MessageUserStore.message().folder;
	}

	/**
	 * @returns {boolean}
	 */
	isArchiveDisabled() {
		return MessageUserStore.message() && FolderUserStore.archiveFolder() === UNUSED_OPTION_VALUE;
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
		if (MessageUserStore.message()) {
			showMessageComposer([ComposeType.Draft, MessageUserStore.message()]);
		}
	}

	scrollMessageToTop() {
		if (this.oMessageScrollerDom) {
			if (50 < this.oMessageScrollerDom.scrollTop) {
				this.oMessageScrollerDom.scrollTop = 50;
			} else {
				this.oMessageScrollerDom.scrollTop = 0;
			}
		}
	}

	scrollMessageToLeft() {
		if (this.oMessageScrollerDom) {
			this.oMessageScrollerDom.scrollLeft = 0;
		}
	}

	downloadAsZip() {
		const hashes = (this.message() ? this.message().attachments : [])
			.map(item => (item && !item.isLinked && item.checked() ? item.download : ''))
			.filter(v => v);
		if (hashes.length) {
			Remote.attachmentsActions('Zip', hashes, this.downloadAsZipLoading)
				.then((result) => {
					if (result && result.Result && result.Result.FileHash) {
						rl.app.download(attachmentDownload(result.Result.FileHash));
					} else {
						this.downloadAsZipError(true);
					}
				})
				.catch(() => {
					this.downloadAsZipError(true);
				});
		} else {
			this.highlightUnselectedAttachments(true);
		}
	}

	/**
	 * @param {MessageModel} oMessage
	 * @returns {void}
	 */
	showImages(message) {
		if (message && message.showExternalImages) {
			message.showExternalImages();
		}
	}

	/**
	 * @returns {string}
	 */
	printableCheckedMessageCount() {
		const cnt = this.messageListCheckedOrSelectedUidsWithSubMails().length;
		return 0 < cnt ? (100 > cnt ? cnt : '99+') : ''; // eslint-disable-line no-magic-numbers
	}

	/**
	 * @param {MessageModel} oMessage
	 * @returns {void}
	 */
	readReceipt(oMessage) {
		if (oMessage && oMessage.readReceipt()) {
			Remote.sendReadReceiptMessage(
				()=>{},
				oMessage.folder,
				oMessage.uid,
				oMessage.readReceipt(),
				i18n('READ_RECEIPT/SUBJECT', { 'SUBJECT': oMessage.subject() }),
				i18n('READ_RECEIPT/BODY', { 'READ-RECEIPT': AccountUserStore.email() })
			);

			oMessage.isReadReceipt(true);

			MessageFlagsCache.store(oMessage);

			rl.app.reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	}
}

export { MessageViewMailBoxUserView };
