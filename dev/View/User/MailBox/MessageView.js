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
	Layout,
	MessageSetAction
} from 'Common/EnumsUser';

import { $htmlCL, leftPanelDisabled, keyScopeReal, moveAction } from 'Common/Globals';

import { inFocus } from 'Common/Utils';
import { mailToHelper } from 'Common/UtilsUser';

import Audio from 'Common/Audio';

import { i18n } from 'Common/Translator';
import { attachmentDownload } from 'Common/Links';

import { MessageFlagsCache } from 'Common/Cache';

import AppStore from 'Stores/User/App';
import SettingsStore from 'Stores/User/Settings';
import AccountStore from 'Stores/User/Account';
import FolderStore from 'Stores/User/Folder';
import MessageStore from 'Stores/User/Message';

import * as Local from 'Storage/Client';

import Remote from 'Remote/User/Fetch';

import { command, showScreenPopup, createCommand } from 'Knoin/Knoin';
import { AbstractViewRight } from 'Knoin/AbstractViews';

import { ComposePopupView } from 'View/Popup/Compose';

const Settings = rl.settings;

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

		this.allowComposer = !!Settings.capa(Capa.Composer);
		this.allowMessageActions = !!Settings.capa(Capa.MessageActions);
		this.allowMessageListActions = !!Settings.capa(Capa.MessageListActions);

		this.mobile = !!Settings.app('mobile');

		this.attachmentsActions = AppStore.attachmentsActions;

		this.message = MessageStore.message;
//		this.messageListChecked = MessageStore.messageListChecked;
		this.hasCheckedMessages = MessageStore.hasCheckedMessages;
		this.messageListCheckedOrSelectedUidsWithSubMails = MessageStore.messageListCheckedOrSelectedUidsWithSubMails;
		this.messageLoadingThrottle = MessageStore.messageLoadingThrottle;
		this.messagesBodiesDom = MessageStore.messagesBodiesDom;
		this.useThreads = SettingsStore.useThreads;
		this.replySameFolder = SettingsStore.replySameFolder;
		this.layout = SettingsStore.layout;
		this.usePreviewPane = SettingsStore.usePreviewPane;
		this.isMessageSelected = MessageStore.isMessageSelected;
		this.messageActiveDom = MessageStore.messageActiveDom;
		this.messageError = MessageStore.messageError;

		this.fullScreenMode = MessageStore.messageFullScreenMode;

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
						return 'icon-none iconcolor-display-none';
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

			messageFocused: () => Focused.MessageView === AppStore.focusedState(),

			messageListAndMessageViewLoading:
				() => MessageStore.messageListCompleteLoadingThrottle() || MessageStore.messageLoadingThrottle()
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
					MessageStore.selectorMessageSelected(null);

					this.viewFolder = '';
					this.viewUid = '';
					this.viewHash = '';

					this.scrollMessageToTop();
				}
			},

			fullScreenMode: value => $htmlCL.toggle('rl-message-fullscreen', value)
		});

		MessageStore.messageViewTrigger.subscribe(() => {
			const message = this.message();
			message ? this.viewIsFlagged(message.isFlagged()) : this.viewIsFlagged(false);
		});

		this.lastReplyAction(Local.get(ClientSideKeyName.LastReplyAction) || ComposeType.Reply);

		addEventListener('mailbox.message-view.toggle-full-screen', () => this.toggleFullScreen());

		this.attachmentPreview = this.attachmentPreview.bind(this);
	}

	@command()
	closeMessageCommand() {
		MessageStore.message(null);
	}

	@command((self) => self.messageVisibility())
	messageVisibilityCommand() {} // eslint-disable-line no-empty-function

	@command((self) => self.messageVisibility())
	messageEditCommand() {
		this.editMessage();
	}

	@command((self) => !self.messageListAndMessageViewLoading())
	goUpCommand() {
		dispatchEvent(new CustomEvent('mailbox.message-list.selector.go-up',
			{detail:Layout.NoPreview === this.layout() ? !!this.message() : true}
		));
	}

	@command((self) => !self.messageListAndMessageViewLoading())
	goDownCommand() {
		dispatchEvent(new CustomEvent('mailbox.message-list.selector.go-down',
			{detail:Layout.NoPreview === this.layout() ? !!this.message() : true}
		));
	}

	detectDomBackgroundColor(dom) {
		let color = '';

		if (dom) {
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

	fullScreen() {
		this.fullScreenMode(true);
	}

	unFullScreen() {
		this.fullScreenMode(false);
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
		Settings.capa(Capa.Composer) && showScreenPopup(ComposePopupView, [sType, MessageStore.message()]);
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
		this.fullScreenMode.subscribe(value => value && this.message() && AppStore.focusedState(Focused.MessageView));

		this.showFullInfo.subscribe(value => Local.set(ClientSideKeyName.MessageHeaderFullInfo, value ? '1' : '0'));

		this.oHeaderDom = dom.querySelector('.messageItemHeader');
		if (this.oHeaderDom) {
			if (!this.resizeObserver) {
				this.resizeObserver = new ResizeObserver(this.checkHeaderHeight.throttle(50).bind(this));
			}
			this.resizeObserver.observe(this.oHeaderDom);
		} else if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}

		const eqs = (ev, s) => ev.target.closestWithin(s, dom);
		dom.addEventListener('click', event => {
			this.mobile && leftPanelDisabled(true);

			let el = eqs(event, 'a');
			if (el) {
				return !(
					!!event &&
					3 !== event.which &&
					mailToHelper(
						el.href,
						Settings.capa(Capa.Composer) ? ComposePopupView : null
					)
				);
			}

			if (eqs(event, '.attachmentsPlace .attachmentIconParent')) {
				event.stopPropagation();
			}

			el = eqs(event, '.attachmentsPlace .showPreplay');
			if (el) {
				event.stopPropagation();
				const attachment = ko.dataFor(el); // eslint-disable-line no-invalid-this
				if (attachment && Audio.supported) {
					switch (true) {
						case Audio.supportedMp3 && attachment.isMp3():
							Audio.playMp3(attachment.linkDownload(), attachment.fileName);
							break;
						case Audio.supportedOgg && attachment.isOgg():
							Audio.playOgg(attachment.linkDownload(), attachment.fileName);
							break;
						case Audio.supportedWav && attachment.isWav():
							Audio.playWav(attachment.linkDownload(), attachment.fileName);
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

		AppStore.focusedState.subscribe((value) => {
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
			const preview = Layout.NoPreview !== this.layout();
			if (this.fullScreenMode()) {
				this.fullScreenMode(false);

				if (preview) {
					AppStore.focusedState(Focused.MessageList);
				}
			} else if (!preview) {
				this.message(null);
			} else {
				AppStore.focusedState(Focused.MessageList);
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
			if (MessageStore.message()) {
				this.replyCommand();
				return false;
			}
			return true;
		});

		// replaAll
		shortcuts.add('a', '', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageStore.message()) {
				this.replyAllCommand();
				return false;
			}
			return true;
		});
		shortcuts.add('mailreply', 'shift', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageStore.message()) {
				this.replyAllCommand();
				return false;
			}
			return true;
		});

		// forward
		shortcuts.add('f,mailforward', '', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageStore.message()) {
				this.forwardCommand();
				return false;
			}

			return true;
		});

		// message information
		shortcuts.add('i', 'meta', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageStore.message()) {
				this.showFullInfo(!this.showFullInfo());
			}
			return false;
		});

		// toggle message blockquotes
		shortcuts.add('b', '', [KeyState.MessageList, KeyState.MessageView], () => {
			const message = MessageStore.message();
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
			if (!this.fullScreenMode() && this.message() && Layout.NoPreview !== this.layout()) {
				if (this.oMessageScrollerDom && 0 < this.oMessageScrollerDom.scrollLeft) {
					return true;
				}
				AppStore.focusedState(Focused.MessageList);
				return false;
			}
		});
//		shortcuts.add('tab', 'shift', KeyState.MessageView, (event, handler) => {
		shortcuts.add('tab', '', KeyState.MessageView, () => {
			if (!this.fullScreenMode() && this.message() && Layout.NoPreview !== this.layout()) {
				AppStore.focusedState(Focused.MessageList);
			}
			return false;
		});
	}

	/**
	 * @returns {boolean}
	 */
	isDraftFolder() {
		return MessageStore.message() && FolderStore.draftFolder() === MessageStore.message().folder;
	}

	/**
	 * @returns {boolean}
	 */
	isSentFolder() {
		return MessageStore.message() && FolderStore.sentFolder() === MessageStore.message().folder;
	}

	/**
	 * @returns {boolean}
	 */
	isSpamFolder() {
		return MessageStore.message() && FolderStore.spamFolder() === MessageStore.message().folder;
	}

	/**
	 * @returns {boolean}
	 */
	isSpamDisabled() {
		return MessageStore.message() && FolderStore.spamFolder() === UNUSED_OPTION_VALUE;
	}

	/**
	 * @returns {boolean}
	 */
	isArchiveFolder() {
		return MessageStore.message() && FolderStore.archiveFolder() === MessageStore.message().folder;
	}

	/**
	 * @returns {boolean}
	 */
	isArchiveDisabled() {
		return MessageStore.message() && FolderStore.archiveFolder() === UNUSED_OPTION_VALUE;
	}

	/**
	 * @returns {boolean}
	 */
	isDraftOrSentFolder() {
		return this.isDraftFolder() || this.isSentFolder();
	}

	composeClick() {
		if (Settings.capa(Capa.Composer)) {
			showScreenPopup(ComposePopupView);
		}
	}

	editMessage() {
		if (Settings.capa(Capa.Composer) && MessageStore.message()) {
			showScreenPopup(ComposePopupView, [ComposeType.Draft, MessageStore.message()]);
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
					if (result && result.Result && result.Result.Files && result.Result.Files[0] && result.Result.Files[0].Hash) {
						rl.app.download(attachmentDownload(result.Result.Files[0].Hash));
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
				i18n('READ_RECEIPT/BODY', { 'READ-RECEIPT': AccountStore.email() })
			);

			oMessage.isReadReceipt(true);

			MessageFlagsCache.store(oMessage);

			rl.app.reloadFlagsCurrentMessageListAndMessageFromCache();
		}
	}
}

export { MessageViewMailBoxUserView };
