import window from 'window';
import _ from '_';
import $ from '$';
import ko from 'ko';
import key from 'key';

import { DATA_IMAGE_USER_DOT_PIC, UNUSED_OPTION_VALUE } from 'Common/Consts';

import {
	Capa,
	ComposeType,
	ClientSideKeyName,
	KeyState,
	FolderType,
	Focused,
	Layout,
	Magics,
	MessageSetAction
} from 'Common/Enums';

import { $html, leftPanelDisabled, keyScopeReal, useKeyboardShortcuts, moveAction } from 'Common/Globals';

import {
	inArray,
	isArray,
	isNonEmptyArray,
	trim,
	noop,
	windowResize,
	windowResizeCallback,
	inFocus,
	removeSelection,
	removeInFocus,
	mailToHelper,
	isTransparent
} from 'Common/Utils';

import Audio from 'Common/Audio';
import * as Events from 'Common/Events';

import { i18n } from 'Common/Translator';
import { attachmentDownload } from 'Common/Links';

import { getUserPic, storeMessageFlagsToCache } from 'Common/Cache';

import SocialStore from 'Stores/Social';
import AppStore from 'Stores/User/App';
import SettingsStore from 'Stores/User/Settings';
import AccountStore from 'Stores/User/Account';
import FolderStore from 'Stores/User/Folder';
import MessageStore from 'Stores/User/Message';

import * as Local from 'Storage/Client';
import * as Settings from 'Storage/Settings';

import Remote from 'Remote/User/Ajax';
import Promises from 'Promises/User/Ajax';

import { getApp } from 'Helper/Apps/User';

import { view, command, ViewType, showScreenPopup, createCommand } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@view({
	name: 'View/User/MailBox/MessageView',
	type: ViewType.Right,
	templateID: 'MailMessageView'
})
class MessageViewMailBoxUserView extends AbstractViewNext {
	constructor() {
		super();

		let lastEmail = '';

		const createCommandReplyHelper = (type) =>
			createCommand(() => {
				this.lastReplyAction(type);
				this.replyOrforward(type);
			}, this.canBeRepliedOrForwarded);

		const createCommandActionHelper = (folderType, useFolder) =>
			createCommand(() => {
				const message = this.message();
				if (message && this.allowMessageListActions) {
					this.message(null);
					getApp().deleteMessagesFromFolder(folderType, message.folderFullNameRaw, [message.uid], useFolder);
				}
			}, this.messageVisibility);

		this.oDom = null;
		this.oHeaderDom = null;
		this.oMessageScrollerDom = null;

		this.bodyBackgroundColor = ko.observable('');

		this.pswp = null;

		this.moveAction = moveAction;

		this.allowComposer = !!Settings.capa(Capa.Composer);
		this.allowMessageActions = !!Settings.capa(Capa.MessageActions);
		this.allowMessageListActions = !!Settings.capa(Capa.MessageListActions);

		this.logoImg = trim(Settings.settingsGet('UserLogoMessage'));
		this.logoIframe = trim(Settings.settingsGet('UserIframeMessage'));

		this.mobile = !!Settings.appSettingsGet('mobile');

		this.attachmentsActions = AppStore.attachmentsActions;

		this.message = MessageStore.message;
		this.messageListChecked = MessageStore.messageListChecked;
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

		this.showAttachmnetControls = ko.observable(false);

		this.showAttachmnetControlsState = (v) => {
			Local.set(ClientSideKeyName.MessageAttachmnetControls, !!v);
		};

		this.allowAttachmnetControls = ko.computed(
			() => 0 < this.attachmentsActions().length && Settings.capa(Capa.AttachmentsActions)
		);

		this.downloadAsZipAllowed = ko.computed(
			() => -1 < inArray('zip', this.attachmentsActions()) && this.allowAttachmnetControls()
		);

		this.downloadAsZipLoading = ko.observable(false);
		this.downloadAsZipError = ko.observable(false).extend({ falseTimeout: 7000 });

		this.saveToOwnCloudAllowed = ko.computed(
			() => -1 < inArray('owncloud', this.attachmentsActions()) && this.allowAttachmnetControls()
		);

		this.saveToOwnCloudLoading = ko.observable(false);
		this.saveToOwnCloudSuccess = ko.observable(false).extend({ falseTimeout: 2000 });
		this.saveToOwnCloudError = ko.observable(false).extend({ falseTimeout: 7000 });

		this.saveToOwnCloudSuccess.subscribe((v) => {
			if (v) {
				this.saveToOwnCloudError(false);
			}
		});

		this.saveToOwnCloudError.subscribe((v) => {
			if (v) {
				this.saveToOwnCloudSuccess(false);
			}
		});

		this.saveToDropboxAllowed = ko.computed(
			() => -1 < inArray('dropbox', this.attachmentsActions()) && this.allowAttachmnetControls()
		);

		this.saveToDropboxLoading = ko.observable(false);
		this.saveToDropboxSuccess = ko.observable(false).extend({ falseTimeout: 2000 });
		this.saveToDropboxError = ko.observable(false).extend({ falseTimeout: 7000 });

		this.saveToDropboxSuccess.subscribe((v) => {
			if (v) {
				this.saveToDropboxError(false);
			}
		});

		this.saveToDropboxError.subscribe((v) => {
			if (v) {
				this.saveToDropboxSuccess(false);
			}
		});

		this.showAttachmnetControls.subscribe((v) => {
			if (this.message()) {
				_.each(this.message().attachments(), (item) => {
					if (item) {
						item.checked(!!v);
					}
				});
			}
		});

		this.lastReplyAction_ = ko.observable('');
		this.lastReplyAction = ko.computed({
			read: this.lastReplyAction_,
			write: (value) => {
				this.lastReplyAction_(
					-1 === inArray(value, [ComposeType.Reply, ComposeType.ReplyAll, ComposeType.Forward])
						? ComposeType.Reply
						: value
				);
			}
		});

		this.lastReplyAction(Local.get(ClientSideKeyName.LastReplyAction) || ComposeType.Reply);

		this.lastReplyAction_.subscribe((value) => {
			Local.set(ClientSideKeyName.LastReplyAction, value);
		});

		this.showFullInfo = ko.observable('1' === Local.get(ClientSideKeyName.MessageHeaderFullInfo));

		this.moreDropdownTrigger = ko.observable(false);
		this.messageDomFocused = ko.observable(false).extend({ rateLimit: 0 });

		this.messageVisibility = ko.computed(() => !this.messageLoadingThrottle() && !!this.message());

		this.message.subscribe((message) => {
			if (!message) {
				MessageStore.selectorMessageSelected(null);
			}
		});

		this.canBeRepliedOrForwarded = ko.computed(() => {
			const v = this.messageVisibility();
			return !this.isDraftFolder() && v;
		});

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

		this.dropboxEnabled = SocialStore.dropbox.enabled;
		this.dropboxApiKey = SocialStore.dropbox.apiKey;

		// viewer

		this.viewBodyTopValue = ko.observable(0);

		this.viewFolder = '';
		this.viewUid = '';
		this.viewHash = '';
		this.viewSubject = ko.observable('');
		this.viewFromShort = ko.observable('');
		this.viewFromDkimData = ko.observable(['none', '']);
		this.viewToShort = ko.observable('');
		this.viewFrom = ko.observable('');
		this.viewTo = ko.observable('');
		this.viewCc = ko.observable('');
		this.viewBcc = ko.observable('');
		this.viewReplyTo = ko.observable('');
		this.viewTimeStamp = ko.observable(0);
		this.viewSize = ko.observable('');
		this.viewLineAsCss = ko.observable('');
		this.viewViewLink = ko.observable('');
		this.viewUnsubscribeLink = ko.observable('');
		this.viewDownloadLink = ko.observable('');
		this.viewUserPic = ko.observable(DATA_IMAGE_USER_DOT_PIC);
		this.viewUserPicVisible = ko.observable(false);
		this.viewIsImportant = ko.observable(false);
		this.viewIsFlagged = ko.observable(false);

		this.viewFromDkimVisibility = ko.computed(() => 'none' !== this.viewFromDkimData()[0]);

		this.viewFromDkimStatusIconClass = ko.computed(() => {
			switch (this.viewFromDkimData()[0]) {
				case 'none':
					return 'icon-none iconcolor-display-none';
				case 'pass':
					return 'icon-ok iconcolor-green';
				default:
					return 'icon-warning-alt iconcolor-red';
			}
		});

		this.viewFromDkimStatusTitle = ko.computed(() => {
			const status = this.viewFromDkimData();
			if (isNonEmptyArray(status)) {
				if (status[0] && status[1]) {
					return status[1];
				} else if (status[0]) {
					return 'DKIM: ' + status[0];
				}
			}

			return '';
		});

		this.messageActiveDom.subscribe((dom) => {
			this.bodyBackgroundColor(dom ? this.detectDomBackgroundColor(dom) : '');
		}, this);

		this.message.subscribe((message) => {
			this.messageActiveDom(null);

			if (message) {
				this.showAttachmnetControls(false);
				if (Local.get(ClientSideKeyName.MessageAttachmnetControls)) {
					_.delay(() => {
						this.showAttachmnetControls(true);
					}, Magics.Time50ms);
				}

				if (this.viewHash !== message.hash) {
					this.scrollMessageToTop();
				}

				this.viewFolder = message.folderFullNameRaw;
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
				this.viewIsFlagged(message.flagged());

				lastEmail = message.fromAsSingleEmail();
				getUserPic(lastEmail, (pic, email) => {
					if (pic !== this.viewUserPic() && lastEmail === email) {
						this.viewUserPicVisible(false);
						this.viewUserPic(DATA_IMAGE_USER_DOT_PIC);
						if ('' !== pic) {
							this.viewUserPicVisible(true);
							this.viewUserPic(pic);
						}
					}
				});
			} else {
				this.viewFolder = '';
				this.viewUid = '';
				this.viewHash = '';

				this.scrollMessageToTop();
			}
		});

		this.message.viewTrigger.subscribe(() => {
			const message = this.message();
			if (message) {
				this.viewIsFlagged(message.flagged());
			} else {
				this.viewIsFlagged(false);
			}
		});

		this.fullScreenMode.subscribe((value) => {
			$html.toggleClass('rl-message-fullscreen', value);
			windowResize();
		});

		this.messageLoadingThrottle.subscribe(windowResizeCallback);

		this.messageFocused = ko.computed(() => Focused.MessageView === AppStore.focusedState());

		this.messageListAndMessageViewLoading = ko.computed(
			() => MessageStore.messageListCompleteLoadingThrottle() || MessageStore.messageLoadingThrottle()
		);

		Events.sub('mailbox.message-view.toggle-full-screen', () => {
			this.toggleFullScreen();
		});

		this.attachmentPreview = _.bind(this.attachmentPreview, this);
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
		Events.pub('mailbox.message-list.selector.go-up', [Layout.NoPreview === this.layout() ? !!this.message() : true]);
	}

	@command((self) => !self.messageListAndMessageViewLoading())
	goDownCommand() {
		Events.pub('mailbox.message-list.selector.go-down', [Layout.NoPreview === this.layout() ? !!this.message() : true]);
	}

	detectDomBackgroundColor(dom) {
		let limit = 5,
			result = '';

		const fFindDom = function(inputDom) {
				const children = inputDom ? inputDom.children() : null;
				return children && 1 === children.length && children.is('table,div,center') ? children : null;
			},
			fFindColor = function(inputDom) {
				let color = '';
				if (inputDom) {
					color = inputDom.css('background-color') || '';
					if (!inputDom.is('table')) {
						color = isTransparent(color) ? '' : color;
					}
				}

				return color;
			};

		if (dom && 1 === dom.length) {
			let aC = dom;
			while ('' === result) {
				limit -= 1;
				if (0 >= limit) {
					break;
				}

				aC = fFindDom(aC);
				if (aC) {
					result = fFindColor(aC);
				} else {
					break;
				}
			}

			result = isTransparent(result) ? '' : result;
		}

		return result;
	}

	fullScreen() {
		this.fullScreenMode(true);
		windowResize();
	}

	unFullScreen() {
		this.fullScreenMode(false);
		windowResize();
	}

	toggleFullScreen() {
		removeSelection();

		this.fullScreenMode(!this.fullScreenMode());
		windowResize();
	}

	/**
	 * @param {string} sType
	 * @returns {void}
	 */
	replyOrforward(sType) {
		if (Settings.capa(Capa.Composer)) {
			showScreenPopup(require('View/Popup/Compose'), [sType, MessageStore.message()]);
		}
	}

	checkHeaderHeight() {
		if (this.oHeaderDom) {
			this.viewBodyTopValue(
				this.message()
					? this.oHeaderDom.height() +
					  Magics.Size20px /* padding-(top/bottom): 20px */ +
							Magics.Size1px /* borded-bottom: 1px */
					: 0
			);
		}
	}

	//  displayMailToPopup(sMailToUrl) {
	//		sMailToUrl = sMailToUrl.replace(/\?.+$/, '');
	//
	//		var
	//			sResult = '',
	//			aTo = [],
	//			EmailModel = require('Model/Email').default,
	//			fParseEmailLine = function(sLine) {
	//				return sLine ? _.compact(_.map([window.decodeURIComponent(sLine)], function(sItem) {
	//						var oEmailModel = new EmailModel();
	//						oEmailModel.parse(sItem);
	//						return '' !== oEmailModel.email ? oEmailModel : null;
	//					})) : null;
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
	attachmentPreview(attachment) {
		if (attachment && attachment.isImage() && !attachment.isLinked && this.message() && this.message().attachments()) {
			let index = 0,
				listIndex = 0;

			const div = $('<div>'),
				dynamicEls = _.compact(
					_.map(this.message().attachments(), (item) => {
						if (item && !item.isLinked && item.isImage()) {
							if (item === attachment) {
								index = listIndex;
							}

							listIndex += 1;

							return {
								src: item.linkPreview(),
								thumb: item.linkThumbnail(),
								subHtml: item.fileName,
								downloadUrl: item.linkPreview()
							};
						}

						return null;
					})
				);

			if (0 < dynamicEls.length) {
				div.on('onBeforeOpen.lg', () => {
					useKeyboardShortcuts(false);
					removeInFocus(true);
				});

				div.on('onCloseAfter.lg', () => {
					useKeyboardShortcuts(true);
				});

				div.lightGallery({
					dynamic: true,
					loadYoutubeThumbnail: false,
					loadVimeoThumbnail: false,
					thumbWidth: 80,
					thumbContHeight: 95,
					showThumbByDefault: false,
					mode: 'lg-lollipop', // 'lg-slide',
					index: index,
					dynamicEl: dynamicEls
				});
			}

			return false;
		}

		return true;
	}

	onBuild(dom) {
		const self = this,
			fCheckHeaderHeight = _.bind(this.checkHeaderHeight, this);

		this.oDom = dom;

		this.fullScreenMode.subscribe((value) => {
			if (value && this.message()) {
				AppStore.focusedState(Focused.MessageView);
			}
		});

		this.showAttachmnetControls.subscribe(fCheckHeaderHeight);
		this.fullScreenMode.subscribe(fCheckHeaderHeight);
		this.showFullInfo.subscribe(fCheckHeaderHeight);
		this.message.subscribe(fCheckHeaderHeight);

		Events.sub(
			'window.resize',
			_.throttle(() => {
				_.delay(fCheckHeaderHeight, 1);
				_.delay(fCheckHeaderHeight, Magics.Time200ms);
				_.delay(fCheckHeaderHeight, Magics.Time500ms);
			}, Magics.Time50ms)
		);

		this.showFullInfo.subscribe((value) => {
			windowResize();
			windowResize(Magics.Time200ms);
			Local.set(ClientSideKeyName.MessageHeaderFullInfo, value ? '1' : '0');
		});

		SocialStore.appendDropbox();

		this.oHeaderDom = $('.messageItemHeader', dom);
		this.oHeaderDom = this.oHeaderDom[0] ? this.oHeaderDom : null;

		if (this.mobile) {
			dom.on('click', () => {
				leftPanelDisabled(true);
			});
		}

		dom
			.on('click', 'a', function(event) {
				// eslint-disable-line prefer-arrow-callback
				// setup maito protocol
				return !(
					!!event &&
					Magics.EventWhichMouseMiddle !== event.which &&
					mailToHelper(
						$(this).attr('href'),
						Settings.capa(Capa.Composer) ? require('View/Popup/Compose') : null // eslint-disable-line no-invalid-this
					)
				);
			})
			.on('click', '.attachmentsPlace .attachmentIconParent', (event) => {
				if (event && event.stopPropagation) {
					event.stopPropagation();
				}
			})
			.on('click', '.attachmentsPlace .showPreplay', function(event) {
				// eslint-disable-line prefer-arrow-callback
				if (event && event.stopPropagation) {
					event.stopPropagation();
				}

				const attachment = ko.dataFor(this); // eslint-disable-line no-invalid-this
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
			})
			.on('click', '.attachmentsPlace .attachmentItem .attachmentNameParent', function() {
				// eslint-disable-line prefer-arrow-callback
				const attachment = ko.dataFor(this); // eslint-disable-line no-invalid-this
				if (attachment && attachment.download) {
					getApp().download(attachment.linkDownload());
				}
			})
			.on('click', '.messageItemHeader .subjectParent .flagParent', function() {
				// eslint-disable-line prefer-arrow-callback
				const message = self.message();
				if (message) {
					getApp().messageListAction(
						message.folderFullNameRaw,
						message.flagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
						[message]
					);
				}
			})
			.on('click', '.thread-list .flagParent', function() {
				// eslint-disable-line prefer-arrow-callback
				const message = ko.dataFor(this); // eslint-disable-line no-invalid-this
				if (message && message.folder && message.uid) {
					getApp().messageListAction(
						message.folder,
						message.flagged() ? MessageSetAction.UnsetFlag : MessageSetAction.SetFlag,
						[message]
					);
				}

				self.threadsDropdownTrigger(true);

				return false;
			});

		AppStore.focusedState.subscribe((value) => {
			if (Focused.MessageView !== value) {
				this.scrollMessageToTop();
				this.scrollMessageToLeft();
			}
		});

		keyScopeReal.subscribe((value) => {
			this.messageDomFocused(KeyState.MessageView === value && !inFocus());
		});

		this.oMessageScrollerDom = dom.find('.messageItem .content');
		this.oMessageScrollerDom =
			this.oMessageScrollerDom && this.oMessageScrollerDom[0] ? this.oMessageScrollerDom : null;

		this.initShortcuts();
	}

	/**
	 * @returns {boolean}
	 */
	escShortcuts() {
		if (this.viewModelVisibility() && this.message()) {
			if (this.fullScreenMode()) {
				this.fullScreenMode(false);

				if (Layout.NoPreview !== this.layout()) {
					AppStore.focusedState(Focused.MessageList);
				}
			} else if (Layout.NoPreview === this.layout()) {
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
		key('esc, backspace', KeyState.MessageView, _.bind(this.escShortcuts, this));

		// fullscreen
		key('enter', KeyState.MessageView, () => {
			this.toggleFullScreen();
			return false;
		});

		// reply
		key('r', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageStore.message()) {
				this.replyCommand();
				return false;
			}

			return true;
		});

		// replaAll
		key('a', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageStore.message()) {
				this.replyAllCommand();
				return false;
			}

			return true;
		});

		// forward
		key('f', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageStore.message()) {
				this.forwardCommand();
				return false;
			}

			return true;
		});

		// message information
		key('ctrl+i, command+i', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageStore.message()) {
				this.showFullInfo(!this.showFullInfo());
			}
			return false;
		});

		// toggle message blockquotes
		key('b', [KeyState.MessageList, KeyState.MessageView], () => {
			if (MessageStore.message() && MessageStore.message().body) {
				MessageStore.message()
					.body.find('.rlBlockquoteSwitcher')
					.click();
				return false;
			}

			return true;
		});

		key('ctrl+up, command+up, ctrl+left, command+left', [KeyState.MessageList, KeyState.MessageView], () => {
			this.goUpCommand();
			return false;
		});

		key('ctrl+down, command+down, ctrl+right, command+right', [KeyState.MessageList, KeyState.MessageView], () => {
			this.goDownCommand();
			return false;
		});

		// print
		key('ctrl+p, command+p', [KeyState.MessageView, KeyState.MessageList], () => {
			if (this.message()) {
				this.message().printMessage();
			}

			return false;
		});

		// delete
		key('delete, shift+delete', KeyState.MessageView, (event, handler) => {
			if (event) {
				if (handler && 'shift+delete' === handler.shortcut) {
					this.deleteWithoutMoveCommand();
				} else {
					this.deleteCommand();
				}

				return false;
			}

			return true;
		});

		// change focused state
		key('tab, shift+tab, left', KeyState.MessageView, (event, handler) => {
			if (!this.fullScreenMode() && this.message() && Layout.NoPreview !== this.layout()) {
				if (event && handler && 'left' === handler.shortcut) {
					if (this.oMessageScrollerDom && 0 < this.oMessageScrollerDom.scrollLeft()) {
						return true;
					}

					AppStore.focusedState(Focused.MessageList);
				} else {
					AppStore.focusedState(Focused.MessageList);
				}
			} else if (
				this.message() &&
				Layout.NoPreview === this.layout() &&
				event &&
				handler &&
				'left' === handler.shortcut
			) {
				return true;
			}

			return false;
		});
	}

	/**
	 * @returns {boolean}
	 */
	isDraftFolder() {
		return MessageStore.message() && FolderStore.draftFolder() === MessageStore.message().folderFullNameRaw;
	}

	/**
	 * @returns {boolean}
	 */
	isSentFolder() {
		return MessageStore.message() && FolderStore.sentFolder() === MessageStore.message().folderFullNameRaw;
	}

	/**
	 * @returns {boolean}
	 */
	isSpamFolder() {
		return MessageStore.message() && FolderStore.spamFolder() === MessageStore.message().folderFullNameRaw;
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
		return MessageStore.message() && FolderStore.archiveFolder() === MessageStore.message().folderFullNameRaw;
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
			showScreenPopup(require('View/Popup/Compose'));
		}
	}

	editMessage() {
		if (Settings.capa(Capa.Composer) && MessageStore.message()) {
			showScreenPopup(require('View/Popup/Compose'), [ComposeType.Draft, MessageStore.message()]);
		}
	}

	scrollMessageToTop() {
		if (this.oMessageScrollerDom) {
			if (Magics.Size50px < this.oMessageScrollerDom.scrollTop()) {
				this.oMessageScrollerDom.scrollTop(Magics.Size50px).animate({ 'scrollTop': 0 }, Magics.Time200ms);
			} else {
				this.oMessageScrollerDom.scrollTop(0);
			}

			windowResize();
		}
	}

	scrollMessageToLeft() {
		if (this.oMessageScrollerDom) {
			this.oMessageScrollerDom.scrollLeft(0);
			windowResize();
		}
	}

	getAttachmentsHashes() {
		const atts = this.message() ? this.message().attachments() : [];
		return _.compact(_.map(atts, (item) => (item && !item.isLinked && item.checked() ? item.download : '')));
	}

	downloadAsZip() {
		const hashes = this.getAttachmentsHashes();
		if (0 < hashes.length) {
			Promises.attachmentsActions('Zip', hashes, this.downloadAsZipLoading)
				.then((result) => {
					if (result && result.Result && result.Result.Files && result.Result.Files[0] && result.Result.Files[0].Hash) {
						getApp().download(attachmentDownload(result.Result.Files[0].Hash));
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

	saveToOwnCloud() {
		const hashes = this.getAttachmentsHashes();
		if (0 < hashes.length) {
			Promises.attachmentsActions('OwnCloud', hashes, this.saveToOwnCloudLoading)
				.then((result) => {
					if (result && result.Result) {
						this.saveToOwnCloudSuccess(true);
					} else {
						this.saveToOwnCloudError(true);
					}
				})
				.catch(() => {
					this.saveToOwnCloudError(true);
				});
		} else {
			this.highlightUnselectedAttachments(true);
		}
	}

	saveToDropbox() {
		const files = [],
			hashes = this.getAttachmentsHashes();

		if (0 < hashes.length) {
			if (window.Dropbox) {
				Promises.attachmentsActions('Dropbox', hashes, this.saveToDropboxLoading)
					.then((result) => {
						if (result && result.Result && result.Result.Url && result.Result.ShortLife && result.Result.Files) {
							if (window.Dropbox && isArray(result.Result.Files)) {
								_.each(result.Result.Files, (item) => {
									files.push({
										url: result.Result.Url + attachmentDownload(item.Hash, result.Result.ShortLife),
										filename: item.FileName
									});
								});

								window.Dropbox.save({
									files: files,
									progress: () => {
										this.saveToDropboxLoading(true);
										this.saveToDropboxError(false);
										this.saveToDropboxSuccess(false);
									},
									cancel: () => {
										this.saveToDropboxSuccess(false);
										this.saveToDropboxError(false);
										this.saveToDropboxLoading(false);
									},
									success: () => {
										this.saveToDropboxSuccess(true);
										this.saveToDropboxLoading(false);
									},
									error: () => {
										this.saveToDropboxError(true);
										this.saveToDropboxLoading(false);
									}
								});
							} else {
								this.saveToDropboxError(true);
							}
						}
					})
					.catch(() => {
						this.saveToDropboxError(true);
					});
			}
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
			message.showExternalImages(true);
		}

		this.checkHeaderHeight();
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
		if (oMessage && '' !== oMessage.readReceipt()) {
			Remote.sendReadReceiptMessage(
				noop,
				oMessage.folderFullNameRaw,
				oMessage.uid,
				oMessage.readReceipt(),
				i18n('READ_RECEIPT/SUBJECT', { 'SUBJECT': oMessage.subject() }),
				i18n('READ_RECEIPT/BODY', { 'READ-RECEIPT': AccountStore.email() })
			);

			oMessage.isReadReceipt(true);

			storeMessageFlagsToCache(oMessage);

			getApp().reloadFlagsCurrentMessageListAndMessageFromCache();
		}

		this.checkHeaderHeight();
	}
}

export { MessageViewMailBoxUserView, MessageViewMailBoxUserView as default };
