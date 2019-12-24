import _ from '_';
import $ from '$';
import ko from 'ko';
import moment from 'moment';
import classnames from 'classnames';
import lozad from 'lozad';

import { MessagePriority, SignedVerifyStatus } from 'Common/Enums';
import { i18n } from 'Common/Translator';
import { DATA_IMAGE_LAZY_PLACEHOLDER_PIC } from 'Common/Consts';

import {
	pInt,
	inArray,
	isArray,
	isUnd,
	trim,
	previewMessage,
	windowResize,
	friendlySize,
	isNonEmptyArray
} from 'Common/Utils';

import { $win } from 'Common/Globals';
import { messageViewLink, messageDownloadLink } from 'Common/Links';

import FolderStore from 'Stores/User/Folder';
import PgpStore from 'Stores/User/Pgp';

import { emailArrayFromJson, emailArrayToStringClear, emailArrayToString, replyHelper } from 'Helper/Message';

import { AttachmentModel, staticCombinedIconClass } from 'Model/Attachment';
import { AbstractModel } from 'Knoin/AbstractModel';

class MessageModel extends AbstractModel {
	constructor() {
		super('MessageModel');

		this.folderFullNameRaw = '';
		this.uid = '';
		this.hash = '';
		this.requestHash = '';
		this.subject = ko.observable('');
		this.subjectPrefix = ko.observable('');
		this.subjectSuffix = ko.observable('');
		this.size = ko.observable(0);
		this.dateTimeStampInUTC = ko.observable(0);
		this.priority = ko.observable(MessagePriority.Normal);

		this.proxy = false;

		this.fromEmailString = ko.observable('');
		this.fromClearEmailString = ko.observable('');
		this.toEmailsString = ko.observable('');
		this.toClearEmailsString = ko.observable('');

		this.senderEmailsString = ko.observable('');
		this.senderClearEmailsString = ko.observable('');

		this.emails = [];

		this.from = [];
		this.to = [];
		this.cc = [];
		this.bcc = [];
		this.replyTo = [];
		this.deliveredTo = [];
		this.unsubsribeLinks = [];

		this.newForAnimation = ko.observable(false);

		this.deleted = ko.observable(false);
		this.deletedMark = ko.observable(false);
		this.unseen = ko.observable(false);
		this.flagged = ko.observable(false);
		this.answered = ko.observable(false);
		this.forwarded = ko.observable(false);
		this.isReadReceipt = ko.observable(false);

		this.focused = ko.observable(false);
		this.selected = ko.observable(false);
		this.checked = ko.observable(false);
		this.hasAttachments = ko.observable(false);
		this.attachmentsSpecData = ko.observableArray([]);

		this.attachmentIconClass = ko.computed(() =>
			staticCombinedIconClass(this.hasAttachments() ? this.attachmentsSpecData() : [])
		);

		this.body = null;

		this.isHtml = ko.observable(false);
		this.hasImages = ko.observable(false);
		this.attachments = ko.observableArray([]);

		this.isPgpSigned = ko.observable(false);
		this.isPgpEncrypted = ko.observable(false);
		this.pgpSignedVerifyStatus = ko.observable(SignedVerifyStatus.None);
		this.pgpSignedVerifyUser = ko.observable('');

		this.priority = ko.observable(MessagePriority.Normal);
		this.readReceipt = ko.observable('');

		this.aDraftInfo = [];
		this.sMessageId = '';
		this.sInReplyTo = '';
		this.sReferences = '';

		this.hasUnseenSubMessage = ko.observable(false);
		this.hasFlaggedSubMessage = ko.observable(false);

		this.threads = ko.observableArray([]);

		this.threadsLen = ko.computed(() => this.threads().length);
		this.isImportant = ko.computed(() => MessagePriority.High === this.priority());

		this.regDisposables([this.attachmentIconClass, this.threadsLen, this.isImportant]);
	}

	/**
	 * @static
	 * @param {AjaxJsonMessage} oJsonMessage
	 * @returns {?MessageModel}
	 */
	static newInstanceFromJson(json) {
		const oMessageModel = new MessageModel();
		return oMessageModel.initByJson(json) ? oMessageModel : null;
	}

	clear() {
		this.folderFullNameRaw = '';
		this.uid = '';
		this.hash = '';
		this.requestHash = '';
		this.subject('');
		this.subjectPrefix('');
		this.subjectSuffix('');
		this.size(0);
		this.dateTimeStampInUTC(0);
		this.priority(MessagePriority.Normal);

		this.proxy = false;

		this.fromEmailString('');
		this.fromClearEmailString('');
		this.toEmailsString('');
		this.toClearEmailsString('');
		this.senderEmailsString('');
		this.senderClearEmailsString('');

		this.emails = [];

		this.from = [];
		this.to = [];
		this.cc = [];
		this.bcc = [];
		this.replyTo = [];
		this.deliveredTo = [];
		this.unsubsribeLinks = [];

		this.newForAnimation(false);

		this.deleted(false);
		this.deletedMark(false);
		this.unseen(false);
		this.flagged(false);
		this.answered(false);
		this.forwarded(false);
		this.isReadReceipt(false);

		this.selected(false);
		this.checked(false);
		this.hasAttachments(false);
		this.attachmentsSpecData([]);

		this.body = null;
		this.isHtml(false);
		this.hasImages(false);
		this.attachments([]);

		this.isPgpSigned(false);
		this.isPgpEncrypted(false);
		this.pgpSignedVerifyStatus(SignedVerifyStatus.None);
		this.pgpSignedVerifyUser('');

		this.priority(MessagePriority.Normal);
		this.readReceipt('');
		this.aDraftInfo = [];
		this.sMessageId = '';
		this.sInReplyTo = '';
		this.sReferences = '';

		this.threads([]);

		this.hasUnseenSubMessage(false);
		this.hasFlaggedSubMessage(false);
	}

	/**
	 * @param {Array} properties
	 * @returns {Array}
	 */
	getEmails(properties) {
		return _.compact(
			_.uniq(
				_.map(
					_.reduce(properties, (carry, property) => carry.concat(this[property]), []),
					(oItem) => (oItem ? oItem.email : '')
				)
			)
		);
	}

	/**
	 * @returns {Array}
	 */
	getRecipientsEmails() {
		return this.getEmails(['to', 'cc']);
	}

	/**
	 * @returns {string}
	 */
	friendlySize() {
		return friendlySize(this.size());
	}

	computeSenderEmail() {
		const sentFolder = FolderStore.sentFolder(),
			draftFolder = FolderStore.draftFolder();

		this.senderEmailsString(
			this.folderFullNameRaw === sentFolder || this.folderFullNameRaw === draftFolder
				? this.toEmailsString()
				: this.fromEmailString()
		);

		this.senderClearEmailsString(
			this.folderFullNameRaw === sentFolder || this.folderFullNameRaw === draftFolder
				? this.toClearEmailsString()
				: this.fromClearEmailString()
		);
	}

	/**
	 * @param {AjaxJsonMessage} json
	 * @returns {boolean}
	 */
	initByJson(json) {
		let result = false,
			priority = MessagePriority.Normal;

		if (json && 'Object/Message' === json['@Object']) {
			priority = pInt(json.Priority);
			this.priority(
				-1 < inArray(priority, [MessagePriority.High, MessagePriority.Low]) ? priority : MessagePriority.Normal
			);

			this.folderFullNameRaw = json.Folder;
			this.uid = json.Uid;
			this.hash = json.Hash;
			this.requestHash = json.RequestHash;

			this.proxy = !!json.ExternalProxy;

			this.size(pInt(json.Size));

			this.from = emailArrayFromJson(json.From);
			this.to = emailArrayFromJson(json.To);
			this.cc = emailArrayFromJson(json.Cc);
			this.bcc = emailArrayFromJson(json.Bcc);
			this.replyTo = emailArrayFromJson(json.ReplyTo);
			this.deliveredTo = emailArrayFromJson(json.DeliveredTo);
			this.unsubsribeLinks = isNonEmptyArray(json.UnsubsribeLinks) ? json.UnsubsribeLinks : [];

			this.subject(json.Subject);
			if (isArray(json.SubjectParts)) {
				this.subjectPrefix(json.SubjectParts[0]);
				this.subjectSuffix(json.SubjectParts[1]);
			} else {
				this.subjectPrefix('');
				this.subjectSuffix(this.subject());
			}

			this.dateTimeStampInUTC(pInt(json.DateTimeStampInUTC));
			this.hasAttachments(!!json.HasAttachments);
			this.attachmentsSpecData(isArray(json.AttachmentsSpecData) ? json.AttachmentsSpecData : []);

			this.fromEmailString(emailArrayToString(this.from, true));
			this.fromClearEmailString(emailArrayToStringClear(this.from));
			this.toEmailsString(emailArrayToString(this.to, true));
			this.toClearEmailsString(emailArrayToStringClear(this.to));

			this.threads(isArray(json.Threads) ? json.Threads : []);

			this.initFlagsByJson(json);
			this.computeSenderEmail();

			result = true;
		}

		return result;
	}

	/**
	 * @param {AjaxJsonMessage} json
	 * @returns {boolean}
	 */
	initUpdateByMessageJson(json) {
		let result = false,
			priority = MessagePriority.Normal;

		if (json && 'Object/Message' === json['@Object']) {
			priority = pInt(json.Priority);
			this.priority(
				-1 < inArray(priority, [MessagePriority.High, MessagePriority.Low]) ? priority : MessagePriority.Normal
			);

			this.aDraftInfo = json.DraftInfo;

			this.sMessageId = json.MessageId;
			this.sInReplyTo = json.InReplyTo;
			this.sReferences = json.References;

			this.proxy = !!json.ExternalProxy;

			if (PgpStore.capaOpenPGP()) {
				this.isPgpSigned(!!json.PgpSigned);
				this.isPgpEncrypted(!!json.PgpEncrypted);
			}

			this.hasAttachments(!!json.HasAttachments);
			this.attachmentsSpecData(isArray(json.AttachmentsSpecData) ? json.AttachmentsSpecData : []);

			this.foundedCIDs = isArray(json.FoundedCIDs) ? json.FoundedCIDs : [];
			this.attachments(this.initAttachmentsFromJson(json.Attachments));

			this.readReceipt(json.ReadReceipt || '');

			this.computeSenderEmail();

			result = true;
		}

		return result;
	}

	/**
	 * @param {(AjaxJsonAttachment|null)} oJsonAttachments
	 * @returns {Array}
	 */
	initAttachmentsFromJson(json) {
		let index = 0,
			len = 0,
			attachment = null;
		const result = [];

		if (json && 'Collection/AttachmentCollection' === json['@Object'] && isNonEmptyArray(json['@Collection'])) {
			for (index = 0, len = json['@Collection'].length; index < len; index++) {
				attachment = AttachmentModel.newInstanceFromJson(json['@Collection'][index]);
				if (attachment) {
					if (
						'' !== attachment.cidWithOutTags &&
						0 < this.foundedCIDs.length &&
						0 <= inArray(attachment.cidWithOutTags, this.foundedCIDs)
					) {
						attachment.isLinked = true;
					}

					result.push(attachment);
				}
			}
		}

		return result;
	}

	/**
	 * @returns {boolean}
	 */
	hasUnsubsribeLinks() {
		return this.unsubsribeLinks && 0 < this.unsubsribeLinks.length;
	}

	/**
	 * @returns {string}
	 */
	getFirstUnsubsribeLink() {
		return this.unsubsribeLinks && 0 < this.unsubsribeLinks.length ? this.unsubsribeLinks[0] || '' : '';
	}

	/**
	 * @param {AjaxJsonMessage} json
	 * @returns {boolean}
	 */
	initFlagsByJson(json) {
		let result = false;
		if (json && 'Object/Message' === json['@Object']) {
			this.unseen(!json.IsSeen);
			this.flagged(!!json.IsFlagged);
			this.answered(!!json.IsAnswered);
			this.forwarded(!!json.IsForwarded);
			this.isReadReceipt(!!json.IsReadReceipt);
			this.deletedMark(!!json.IsDeleted);

			result = true;
		}

		return result;
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink = false
	 * @returns {string}
	 */
	fromToLine(friendlyView, wrapWithLink = false) {
		return emailArrayToString(this.from, friendlyView, wrapWithLink);
	}

	/**
	 * @returns {string}
	 */
	fromDkimData() {
		let result = ['none', ''];
		if (isNonEmptyArray(this.from) && 1 === this.from.length && this.from[0] && this.from[0].dkimStatus) {
			result = [this.from[0].dkimStatus, this.from[0].dkimValue || ''];
		}

		return result;
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink = false
	 * @returns {string}
	 */
	toToLine(friendlyView, wrapWithLink = false) {
		return emailArrayToString(this.to, friendlyView, wrapWithLink);
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink = false
	 * @returns {string}
	 */
	ccToLine(friendlyView, wrapWithLink = false) {
		return emailArrayToString(this.cc, friendlyView, wrapWithLink);
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink = false
	 * @returns {string}
	 */
	bccToLine(friendlyView, wrapWithLink = false) {
		return emailArrayToString(this.bcc, friendlyView, wrapWithLink);
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink = false
	 * @returns {string}
	 */
	replyToToLine(friendlyView, wrapWithLink = false) {
		return emailArrayToString(this.replyTo, friendlyView, wrapWithLink);
	}

	/**
	 * @return string
	 */
	lineAsCss() {
		return classnames({
			'deleted': this.deleted(),
			'deleted-mark': this.deletedMark(),
			'selected': this.selected(),
			'checked': this.checked(),
			'flagged': this.flagged(),
			'unseen': this.unseen(),
			'answered': this.answered(),
			'forwarded': this.forwarded(),
			'focused': this.focused(),
			'important': this.isImportant(),
			'withAttachments': this.hasAttachments(),
			'new': this.newForAnimation(),
			'emptySubject': '' === this.subject(),
			// 'hasChildrenMessage': 1 < this.threadsLen(),
			'hasUnseenSubMessage': this.hasUnseenSubMessage(),
			'hasFlaggedSubMessage': this.hasFlaggedSubMessage()
		});
	}

	/**
	 * @returns {boolean}
	 */
	hasVisibleAttachments() {
		return !!_.find(this.attachments(), (item) => !item.isLinked);
	}

	/**
	 * @param {string} cid
	 * @returns {*}
	 */
	findAttachmentByCid(cid) {
		let result = null;
		const attachments = this.attachments();

		if (isNonEmptyArray(attachments)) {
			cid = cid.replace(/^<+/, '').replace(/>+$/, '');
			result = _.find(attachments, (item) => cid === item.cidWithOutTags);
		}

		return result || null;
	}

	/**
	 * @param {string} contentLocation
	 * @returns {*}
	 */
	findAttachmentByContentLocation(contentLocation) {
		let result = null;
		const attachments = this.attachments();

		if (isNonEmptyArray(attachments)) {
			result = _.find(attachments, (item) => contentLocation === item.contentLocation);
		}

		return result || null;
	}

	/**
	 * @returns {string}
	 */
	messageId() {
		return this.sMessageId;
	}

	/**
	 * @returns {string}
	 */
	inReplyTo() {
		return this.sInReplyTo;
	}

	/**
	 * @returns {string}
	 */
	references() {
		return this.sReferences;
	}

	/**
	 * @returns {string}
	 */
	fromAsSingleEmail() {
		return isArray(this.from) && this.from[0] ? this.from[0].email : '';
	}

	/**
	 * @returns {string}
	 */
	viewLink() {
		return messageViewLink(this.requestHash);
	}

	/**
	 * @returns {string}
	 */
	downloadLink() {
		return messageDownloadLink(this.requestHash);
	}

	/**
	 * @param {Object} excludeEmails
	 * @param {boolean=} last = false
	 * @returns {Array}
	 */
	replyEmails(excludeEmails, last = false) {
		const result = [],
			unic = isUnd(excludeEmails) ? {} : excludeEmails;

		replyHelper(this.replyTo, unic, result);
		if (0 === result.length) {
			replyHelper(this.from, unic, result);
		}

		if (0 === result.length && !last) {
			return this.replyEmails({}, true);
		}

		return result;
	}

	/**
	 * @param {Object} excludeEmails
	 * @param {boolean=} last = false
	 * @returns {Array.<Array>}
	 */
	replyAllEmails(excludeEmails, last = false) {
		let data = [];
		const toResult = [],
			ccResult = [],
			unic = isUnd(excludeEmails) ? {} : excludeEmails;

		replyHelper(this.replyTo, unic, toResult);
		if (0 === toResult.length) {
			replyHelper(this.from, unic, toResult);
		}

		replyHelper(this.to, unic, toResult);
		replyHelper(this.cc, unic, ccResult);

		if (0 === toResult.length && !last) {
			data = this.replyAllEmails({}, true);
			return [data[0], ccResult];
		}

		return [toResult, ccResult];
	}

	/**
	 * @returns {string}
	 */
	textBodyToString() {
		return this.body ? this.body.html() : '';
	}

	/**
	 * @returns {string}
	 */
	attachmentsToStringLine() {
		const attachLines = _.map(this.attachments(), (item) => item.fileName + ' (' + item.friendlySize + ')');
		return attachLines && 0 < attachLines.length ? attachLines.join(', ') : '';
	}

	/**
	 * @param {boolean=} print = false
	 */
	viewPopupMessage(print = false) {
		this.showLazyExternalImagesInBody();

		const timeStampInUTC = this.dateTimeStampInUTC() || 0,
			ccLine = this.ccToLine(false),
			m = 0 < timeStampInUTC ? moment.unix(timeStampInUTC) : null;

		previewMessage(
			{
				title: this.subject(),
				subject: this.subject(),
				date: m ? m.format('LLL') : '',
				fromCreds: this.fromToLine(false),
				toLabel: i18n('MESSAGE/LABEL_TO'),
				toCreds: this.toToLine(false),
				ccClass: ccLine ? '' : 'rl-preview-hide',
				ccLabel: i18n('MESSAGE/LABEL_CC'),
				ccCreds: ccLine
			},
			this.body,
			this.isHtml(),
			print
		);
	}

	printMessage() {
		this.viewPopupMessage(true);
	}

	/**
	 * @returns {string}
	 */
	generateUid() {
		return this.folderFullNameRaw + '/' + this.uid;
	}

	/**
	 * @param {MessageModel} message
	 * @returns {MessageModel}
	 */
	populateByMessageListItem(message) {
		if (message) {
			this.folderFullNameRaw = message.folderFullNameRaw;
			this.uid = message.uid;
			this.hash = message.hash;
			this.requestHash = message.requestHash;
			this.subject(message.subject());
		}

		this.subjectPrefix(this.subjectPrefix());
		this.subjectSuffix(this.subjectSuffix());

		if (message) {
			this.size(message.size());
			this.dateTimeStampInUTC(message.dateTimeStampInUTC());
			this.priority(message.priority());

			this.proxy = message.proxy;

			this.fromEmailString(message.fromEmailString());
			this.fromClearEmailString(message.fromClearEmailString());
			this.toEmailsString(message.toEmailsString());
			this.toClearEmailsString(message.toClearEmailsString());

			this.emails = message.emails;

			this.from = message.from;
			this.to = message.to;
			this.cc = message.cc;
			this.bcc = message.bcc;
			this.replyTo = message.replyTo;
			this.deliveredTo = message.deliveredTo;
			this.unsubsribeLinks = message.unsubsribeLinks;

			this.unseen(message.unseen());
			this.flagged(message.flagged());
			this.answered(message.answered());
			this.forwarded(message.forwarded());
			this.isReadReceipt(message.isReadReceipt());
			this.deletedMark(message.deletedMark());

			this.priority(message.priority());

			this.selected(message.selected());
			this.checked(message.checked());
			this.hasAttachments(message.hasAttachments());
			this.attachmentsSpecData(message.attachmentsSpecData());
		}

		this.body = null;

		this.aDraftInfo = [];
		this.sMessageId = '';
		this.sInReplyTo = '';
		this.sReferences = '';

		if (message) {
			this.threads(message.threads());
		}

		this.computeSenderEmail();

		return this;
	}

	showLazyExternalImagesInBody() {
		if (this.body) {
			$('.lazy.lazy-inited[data-original]', this.body).each(function() {
				$(this)
					.attr('src', $(this).attr('data-original')) // eslint-disable-line no-invalid-this
					.removeAttr('data-original')
					.removeAttr('data-loaded');
			});
		}
	}

	lozad() {
		lozad('img.lazy:not(.lazy-inited)', {
			threshold: 0.4,
			load: (element) => {
				// console.log('lazy', element.dataset.original);
				element.src = DATA_IMAGE_LAZY_PLACEHOLDER_PIC;
				$(element)
					.addClass('lazy-inited')
					.attr('src', element.dataset.original)
					.removeAttr('data-loaded')
					.removeAttr('data-original')
					.css({ opacity: 0.3 })
					.animate({ opacity: 1 }, 500);
			}
		}).observe();
	}

	showExternalImages(lazy = false) {
		if (this.body && this.body.data('rl-has-images')) {
			this.hasImages(false);
			this.body.data('rl-has-images', false);

			let attr = this.proxy ? 'data-x-additional-src' : 'data-x-src';
			$('[' + attr + ']', this.body).each(function() {
				const $this = $(this); // eslint-disable-line no-invalid-this
				if (lazy && $this.is('img')) {
					$this
						.addClass('lazy')
						.attr('data-original', $this.attr(attr))
						.removeAttr('data-loaded');
				} else {
					$this.attr('src', $this.attr(attr)).removeAttr('data-loaded');
				}
			});

			attr = this.proxy ? 'data-x-additional-style-url' : 'data-x-style-url';
			$('[' + attr + ']', this.body).each(function() {
				const $this = $(this); // eslint-disable-line no-invalid-this
				let style = trim($this.attr('style'));
				style = '' === style ? '' : ';' === style.substr(-1) ? style + ' ' : style + '; ';
				$this.attr('style', style + $this.attr(attr));
			});

			if (lazy) {
				this.lozad();
				$win.resize();
			}

			windowResize(500);
		}
	}

	showInternalImages(lazy = false) {
		if (this.body && !this.body.data('rl-init-internal-images')) {
			this.body.data('rl-init-internal-images', true);

			const self = this;

			$('[data-x-src-cid]', this.body).each(function() {
				const $this = $(this), // eslint-disable-line no-invalid-this
					attachment = self.findAttachmentByCid($this.attr('data-x-src-cid'));

				if (attachment && attachment.download) {
					if (lazy && $this.is('img')) {
						$this.addClass('lazy').attr('data-original', attachment.linkPreview());
					} else {
						$this.attr('src', attachment.linkPreview());
					}
				}
			});

			$('[data-x-src-location]', this.body).each(function() {
				const $this = $(this); // eslint-disable-line no-invalid-this
				let attachment = self.findAttachmentByContentLocation($this.attr('data-x-src-location'));
				if (!attachment) {
					attachment = self.findAttachmentByCid($this.attr('data-x-src-location'));
				}

				if (attachment && attachment.download) {
					if (lazy && $this.is('img')) {
						$this.addClass('lazy').attr('data-original', attachment.linkPreview());
					} else {
						$this.attr('src', attachment.linkPreview());
					}
				}
			});

			$('[data-x-style-cid]', this.body).each(function() {
				let style = '',
					name = '';

				const $this = $(this), // eslint-disable-line no-invalid-this
					attachment = self.findAttachmentByCid($this.attr('data-x-style-cid'));

				if (attachment && attachment.linkPreview) {
					name = $this.attr('data-x-style-cid-name');
					if ('' !== name) {
						style = trim($this.attr('style'));
						style = '' === style ? '' : ';' === style.substr(-1) ? style + ' ' : style + '; ';
						$this.attr('style', style + name + ": url('" + attachment.linkPreview() + "')");
					}
				}
			});

			if (lazy) {
				// $('.RL-MailMessageView .messageView .messageItem .content')[0]
				_.delay(() => this.lozad(), 300);
			}

			windowResize(500);
		}
	}

	storeDataInDom() {
		if (this.body) {
			this.body.data('rl-is-html', !!this.isHtml());
			this.body.data('rl-has-images', !!this.hasImages());
		}
	}

	fetchDataFromDom() {
		if (this.body) {
			this.isHtml(!!this.body.data('rl-is-html'));
			this.hasImages(!!this.body.data('rl-has-images'));
		}
	}

	replacePlaneTextBody(plain) {
		if (this.body) {
			this.body.html(plain).addClass('b-text-part plain');
		}
	}

	/**
	 * @returns {string}
	 */
	flagHash() {
		return [
			this.deleted(),
			this.deletedMark(),
			this.unseen(),
			this.flagged(),
			this.answered(),
			this.forwarded(),
			this.isReadReceipt()
		].join(',');
	}
}

export { MessageModel, MessageModel as default };
