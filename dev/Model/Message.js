import ko from 'ko';

import { MessagePriority, SignedVerifyStatus } from 'Common/Enums';
import { i18n } from 'Common/Translator';

import {
	pInt,
	deModule,
	encodeHtml,
	friendlySize
} from 'Common/Utils';

import { messageViewLink, messageDownloadLink } from 'Common/Links';

import FolderStore from 'Stores/User/Folder';
import PgpStore from 'Stores/User/Pgp';

import { AttachmentModel, staticCombinedIconClass } from 'Model/Attachment';
import { EmailCollectionModel } from 'Model/EmailCollection';
import { AbstractModel } from 'Knoin/AbstractModel';

const isArray = Array.isArray,

	replyHelper = (emails, unic, localEmails) => {
		emails.forEach(email => {
			if (undefined === unic[email.email]) {
				unic[email.email] = true;
				localEmails.push(email);
			}
		});
	};

class MessageModel extends AbstractModel {
	constructor() {
		super('MessageModel');

		this._reset();

		this.subject = ko.observable('');
		this.subjectPrefix = ko.observable('');
		this.subjectSuffix = ko.observable('');
		this.size = ko.observable(0);
		this.dateTimeStampInUTC = ko.observable(0);
		this.priority = ko.observable(MessagePriority.Normal);

		this.fromEmailString = ko.observable('');
		this.fromClearEmailString = ko.observable('');
		this.toEmailsString = ko.observable('');
		this.toClearEmailsString = ko.observable('');

		this.senderEmailsString = ko.observable('');
		this.senderClearEmailsString = ko.observable('');

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

		this.isHtml = ko.observable(false);
		this.hasImages = ko.observable(false);
		this.attachments = ko.observableArray([]);

		this.isPgpSigned = ko.observable(false);
		this.isPgpEncrypted = ko.observable(false);
		this.pgpSignedVerifyStatus = ko.observable(SignedVerifyStatus.None);
		this.pgpSignedVerifyUser = ko.observable('');

		this.priority = ko.observable(MessagePriority.Normal);
		this.readReceipt = ko.observable('');

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

	_reset() {
		this.folderFullNameRaw = '';
		this.uid = '';
		this.hash = '';
		this.requestHash = '';
		this.proxy = false;
		this.emails = [];
		this.from = new EmailCollectionModel;
		this.to = new EmailCollectionModel;
		this.cc = new EmailCollectionModel;
		this.bcc = new EmailCollectionModel;
		this.replyTo = new EmailCollectionModel;
		this.deliveredTo = new EmailCollectionModel;
		this.unsubsribeLinks = [];
		this.body = null;
		this.aDraftInfo = [];
		this.sMessageId = '';
		this.sInReplyTo = '';
		this.sReferences = '';
	}

	clear() {
		this._reset();
		this.subject('');
		this.subjectPrefix('');
		this.subjectSuffix('');
		this.size(0);
		this.dateTimeStampInUTC(0);
		this.priority(MessagePriority.Normal);

		this.fromEmailString('');
		this.fromClearEmailString('');
		this.toEmailsString('');
		this.toClearEmailsString('');
		this.senderEmailsString('');
		this.senderClearEmailsString('');

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

		this.isHtml(false);
		this.hasImages(false);
		this.attachments([]);

		this.isPgpSigned(false);
		this.isPgpEncrypted(false);
		this.pgpSignedVerifyStatus(SignedVerifyStatus.None);
		this.pgpSignedVerifyUser('');

		this.priority(MessagePriority.Normal);
		this.readReceipt('');

		this.threads([]);

		this.hasUnseenSubMessage(false);
		this.hasFlaggedSubMessage(false);
	}

	/**
	 * @param {Array} properties
	 * @returns {Array}
	 */
	getEmails(properties) {
		return properties.reduce((carry, property) => carry.concat(this[property]), []).map(
			oItem => oItem ? oItem.email : ''
		).filter((value, index, self) => !!value && self.indexOf(value) == index);
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
				[MessagePriority.High, MessagePriority.Low].includes(priority) ? priority : MessagePriority.Normal
			);

			this.folderFullNameRaw = json.Folder;
			this.uid = json.Uid;
			this.hash = json.Hash;
			this.requestHash = json.RequestHash;

			this.proxy = !!json.ExternalProxy;

			this.size(pInt(json.Size));

			this.from = EmailCollectionModel.reviveFromJson(json.From);
			this.to = EmailCollectionModel.reviveFromJson(json.To);
			this.cc = EmailCollectionModel.reviveFromJson(json.Cc);
			this.bcc = EmailCollectionModel.reviveFromJson(json.Bcc);
			this.replyTo = EmailCollectionModel.reviveFromJson(json.ReplyTo);
			this.deliveredTo = EmailCollectionModel.reviveFromJson(json.DeliveredTo);
			this.unsubsribeLinks = Array.isNotEmpty(json.UnsubsribeLinks) ? json.UnsubsribeLinks : [];

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

			this.fromEmailString(this.from.toString(true));
			this.fromClearEmailString(this.from.toStringClear());
			this.toEmailsString(this.to.toString(true));
			this.toClearEmailsString(this.to.toStringClear());

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
				[MessagePriority.High, MessagePriority.Low].includes(priority) ? priority : MessagePriority.Normal
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

		if (json && 'Collection/AttachmentCollection' === json['@Object'] && Array.isNotEmpty(json['@Collection'])) {
			for (index = 0, len = json['@Collection'].length; index < len; index++) {
				attachment = AttachmentModel.newInstanceFromJson(json['@Collection'][index]);
				if (attachment) {
					if (
						attachment.cidWithOutTags &&
						this.foundedCIDs.includes(attachment.cidWithOutTags)
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
		return this.unsubsribeLinks && this.unsubsribeLinks.length;
	}

	/**
	 * @returns {string}
	 */
	getFirstUnsubsribeLink() {
		return this.unsubsribeLinks && this.unsubsribeLinks.length ? this.unsubsribeLinks[0] || '' : '';
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
		return this.from.toString(friendlyView, wrapWithLink);
	}

	/**
	 * @returns {string}
	 */
	fromDkimData() {
		let result = ['none', ''];
		if (Array.isNotEmpty(this.from) && 1 === this.from.length && this.from[0] && this.from[0].dkimStatus) {
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
		return this.to.toString(friendlyView, wrapWithLink);
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink = false
	 * @returns {string}
	 */
	ccToLine(friendlyView, wrapWithLink = false) {
		return this.cc.toString(friendlyView, wrapWithLink);
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink = false
	 * @returns {string}
	 */
	bccToLine(friendlyView, wrapWithLink = false) {
		return this.bcc.toString(friendlyView, wrapWithLink);
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink = false
	 * @returns {string}
	 */
	replyToToLine(friendlyView, wrapWithLink = false) {
		return this.replyTo.toString(friendlyView, wrapWithLink);
	}

	/**
	 * @return string
	 */
	lineAsCss() {
		let classes = [];
		Object.entries({
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
			'emptySubject': !this.subject(),
			// 'hasChildrenMessage': 1 < this.threadsLen(),
			'hasUnseenSubMessage': this.hasUnseenSubMessage(),
			'hasFlaggedSubMessage': this.hasFlaggedSubMessage()
		}).forEach(([key, value]) => value && classes.push(key));
		return classes.join(' ');
	}

	/**
	 * @returns {boolean}
	 */
	hasVisibleAttachments() {
		return !!this.attachments().find(item => !item.isLinked);
	}

	/**
	 * @param {string} cid
	 * @returns {*}
	 */
	findAttachmentByCid(cid) {
		let result = null;
		const attachments = this.attachments();

		if (Array.isNotEmpty(attachments)) {
			cid = cid.replace(/^<+/, '').replace(/>+$/, '');
			result = attachments.find(item => cid === item.cidWithOutTags);
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

		if (Array.isNotEmpty(attachments)) {
			result = attachments.find(item => contentLocation === item.contentLocation);
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
			unic = undefined === excludeEmails ? {} : excludeEmails;

		replyHelper(this.replyTo, unic, result);
		if (!result.length) {
			replyHelper(this.from, unic, result);
		}

		if (!result.length && !last) {
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
			unic = undefined === excludeEmails ? {} : excludeEmails;

		replyHelper(this.replyTo, unic, toResult);
		if (!toResult.length) {
			replyHelper(this.from, unic, toResult);
		}

		replyHelper(this.to, unic, toResult);
		replyHelper(this.cc, unic, ccResult);

		if (!toResult.length && !last) {
			data = this.replyAllEmails({}, true);
			return [data[0], ccResult];
		}

		return [toResult, ccResult];
	}

	/**
	 * @returns {string}
	 */
	attachmentsToStringLine() {
		const attachLines = this.attachments().map(item => item.fileName + ' (' + item.friendlySize + ')');
		return attachLines && attachLines.length ? attachLines.join(', ') : '';
	}

	/**
	 * @param {boolean=} print = false
	 */
	viewPopupMessage(print = false) {
		const timeStampInUTC = this.dateTimeStampInUTC() || 0,
			ccLine = this.ccToLine(false),
			m = 0 < timeStampInUTC ? new Date(timeStampInUTC * 1000) : null,
			win = open(''),
			doc = win.document;

		doc.write(
			deModule(require('Html/PreviewMessage.html'))
				.replace('{{title}}', encodeHtml(this.subject()))
				.replace('{{subject}}', encodeHtml(this.subject()))
				.replace('{{date}}', encodeHtml(m ? m.format('LLL') : ''))
				.replace('{{fromCreds}}', encodeHtml(this.fromToLine(false)))
				.replace('{{toCreds}}', encodeHtml(this.toToLine(false)))
				.replace('{{toLabel}}', encodeHtml(i18n('MESSAGE/LABEL_TO')))
				.replace('{{ccClass}}', encodeHtml(ccLine ? '' : 'rl-preview-hide'))
				.replace('{{ccCreds}}', encodeHtml(ccLine))
				.replace('{{ccLabel}}', encodeHtml(i18n('MESSAGE/LABEL_CC')))
				.replace('{{bodyClass}}', this.isHtml() ? 'html' : 'plain')
				.replace('{{html}}', this.bodyAsHTML())
		);

		doc.close();

		if (print) {
			setTimeout(() => win.print(), 100);
		}
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

	showExternalImages() {
		if (this.body && this.body.rlHasImages) {
			this.hasImages(false);
			this.body.rlHasImages = false;

			let body = this.body, attr = this.proxy ? 'data-x-additional-src' : 'data-x-src';
			body.querySelectorAll('[' + attr + ']').forEach(node => {
				if (node.matches('img')) {
					node.loading = 'lazy';
				}
				node.src = node.getAttribute(attr);
				node.removeAttribute('data-loaded');
			});

			attr = this.proxy ? 'data-x-additional-style-url' : 'data-x-style-url';
			body.querySelectorAll('[' + attr + ']').forEach(node => {
				node.setAttribute('style', ((node.getAttribute('style')||'')
					+ ';' + node.getAttribute(attr))
					.replace(/^[;\s]+/,''));
			});
		}
	}

	showInternalImages() {
		if (this.body && !this.body.rlInitInternalImages) {
			this.body.rlInitInternalImages = true;

			const body = this.body;

			body.querySelectorAll('[data-x-src-cid]').forEach(node => {
				const attachment = this.findAttachmentByCid(node.dataset.xSrcCid);
				if (attachment && attachment.download) {
					node.src = attachment.linkPreview();
				}
			});

			body.querySelectorAll('[data-x-src-location]').forEach(node => {
				const attachment = this.findAttachmentByContentLocation(node.dataset.xSrcLocation)
					|| this.findAttachmentByCid(node.dataset.xSrcLocation);
				if (attachment && attachment.download) {
					if (node.matches('img')) {
						node.loading = 'lazy';
					}
					node.src = attachment.linkPreview();
				}
			});

			body.querySelectorAll('[style-cid]').forEach(node => {
				const name = node.dataset.xStyleCidName,
					attachment = this.findAttachmentByCid(node.dataset.xStyleCid);
				if (attachment && attachment.linkPreview && name) {
					node.setAttribute('style', ((node.getAttribute('style')||'')
						+ ';' + name + ": url('" + attachment.linkPreview() + "')")
						.replace(/^[;\s]+/,''));
				}
			});
		}
	}

	storeDataInDom() {
		if (this.body) {
			this.body.rlIsHtml = !!this.isHtml();
			this.body.rlHasImages = !!this.hasImages();
		}
	}

	fetchDataFromDom() {
		if (this.body) {
			this.isHtml(!!this.body.rlIsHtml);
			this.hasImages(!!this.body.rlHasImages);
		}
	}

	/**
	 * @returns {string}
	 */
	bodyAsHTML() {
		if (this.body) {
			let clone = this.body.cloneNode(true),
				attr = 'data-html-editor-font-wrapper';
			clone.querySelectorAll('blockquote.rl-bq-switcher').forEach(
				node => node.classList.remove('rl-bq-switcher','hidden-bq')
			);
			clone.querySelectorAll('.rlBlockquoteSwitcher').forEach(
				node => node.remove()
			);
			clone.querySelectorAll('['+attr+']').forEach(
				node => node.removeAttribute(attr)
			);
			return clone.innerHTML;
		}
		return '';
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
