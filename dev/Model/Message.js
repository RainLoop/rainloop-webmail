import ko from 'ko';

import { MessagePriority, SignedVerifyStatus } from 'Common/Enums';
import { i18n } from 'Common/Translator';

import { encodeHtml } from 'Common/UtilsUser';

import { messageViewLink, messageDownloadLink } from 'Common/Links';

import FolderStore from 'Stores/User/Folder';

import { File } from 'Common/File';
import { AttachmentCollectionModel } from 'Model/AttachmentCollection';
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
		super();

		this._reset();

		this.addObservables({
			subject: '',
			subjectPrefix: '',
			subjectSuffix: '',
			size: 0,
			dateTimeStampInUTC: 0,
			priority: MessagePriority.Normal,

			senderEmailsString: '',
			senderClearEmailsString: '',

			newForAnimation: false,

			deleted: false,
			isDeleted: false,
			isUnseen: false,
			isFlagged: false,
			isAnswered: false,
			isForwarded: false,
			isReadReceipt: false,

			focused: false,
			selected: false,
			checked: false,
			hasAttachments: false,

			isHtml: false,
			hasImages: false,

			isPgpSigned: false,
			isPgpEncrypted: false,
			pgpSignedVerifyStatus: SignedVerifyStatus.None,
			pgpSignedVerifyUser: '',

			readReceipt: '',

			hasUnseenSubMessage: false,
			hasFlaggedSubMessage: false
		});

		this.attachments = ko.observableArray(new AttachmentCollectionModel);
		this.attachmentsSpecData = ko.observableArray([]);
		this.threads = ko.observableArray([]);

		this.addComputables({
			attachmentIconClass: () => File.getCombinedIconClass(this.hasAttachments() ? this.attachmentsSpecData() : []),
			threadsLen: () => this.threads().length,
			isImportant: () => MessagePriority.High === this.priority(),
		});
	}

	_reset() {
		this.folder = '';
		this.uid = '';
		this.hash = '';
		this.requestHash = '';
		this.externalProxy = false;
		this.emails = [];
		this.from = new EmailCollectionModel;
		this.to = new EmailCollectionModel;
		this.cc = new EmailCollectionModel;
		this.bcc = new EmailCollectionModel;
		this.replyTo = new EmailCollectionModel;
		this.deliveredTo = new EmailCollectionModel;
		this.unsubsribeLinks = [];
		this.body = null;
		this.draftInfo = [];
		this.messageId = '';
		this.inReplyTo = '';
		this.references = '';
	}

	clear() {
		this._reset();
		this.subject('');
		this.subjectPrefix('');
		this.subjectSuffix('');
		this.size(0);
		this.dateTimeStampInUTC(0);
		this.priority(MessagePriority.Normal);

		this.senderEmailsString('');
		this.senderClearEmailsString('');

		this.newForAnimation(false);

		this.deleted(false);
		this.isDeleted(false);
		this.isUnseen(false);
		this.isFlagged(false);
		this.isAnswered(false);
		this.isForwarded(false);
		this.isReadReceipt(false);

		this.selected(false);
		this.checked(false);
		this.hasAttachments(false);
		this.attachmentsSpecData([]);

		this.isHtml(false);
		this.hasImages(false);
		this.attachments(new AttachmentCollectionModel);

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
		).validUnique();
	}

	/**
	 * @returns {string}
	 */
	friendlySize() {
		return File.friendlySize(this.size());
	}

	computeSenderEmail() {
		const list = [FolderStore.sentFolder(), FolderStore.draftFolder()].includes(this.folder) ? 'to' : 'from';
		this.senderEmailsString(this[list].toString(true));
		this.senderClearEmailsString(this[list].toStringClear());
	}

	/**
	 * @param {FetchJsonMessage} json
	 * @returns {boolean}
	 */
	revivePropertiesFromJson(json) {
		if ('Priority' in json) {
			let p = parseInt(json.Priority, 10);
			json.Priority = MessagePriority.High == p || MessagePriority.Low == p ? p : MessagePriority.Normal;
		}
		if (super.revivePropertiesFromJson(json)) {
			if (isArray(json.SubjectParts)) {
				this.subjectPrefix(json.SubjectParts[0]);
				this.subjectSuffix(json.SubjectParts[1]);
			} else {
				this.subjectPrefix('');
				this.subjectSuffix(this.subject());
			}

//			this.foundedCIDs = isArray(json.FoundedCIDs) ? json.FoundedCIDs : [];
//			this.attachments(AttachmentCollectionModel.reviveFromJson(json.Attachments, this.foundedCIDs));

			this.computeSenderEmail();
		}
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
			'deleted-mark': this.isDeleted(),
			'selected': this.selected(),
			'checked': this.checked(),
			'flagged': this.isFlagged(),
			'unseen': this.isUnseen(),
			'answered': this.isAnswered(),
			'forwarded': this.isForwarded(),
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
	 * @param {boolean=} print = false
	 */
	viewPopupMessage(print = false) {
		const timeStampInUTC = this.dateTimeStampInUTC() || 0,
			ccLine = this.ccToLine(false),
			m = 0 < timeStampInUTC ? new Date(timeStampInUTC * 1000) : null,
			win = open(''),
			doc = win.document,
			html = require('Html/PreviewMessage.html');
		doc.write((html.default)
			.replace(/{{subject}}/g, encodeHtml(this.subject()))
			.replace('{{date}}', encodeHtml(m ? m.format('LLL') : ''))
			.replace('{{fromCreds}}', encodeHtml(this.fromToLine(false)))
			.replace('{{toCreds}}', encodeHtml(this.toToLine(false)))
			.replace('{{toLabel}}', encodeHtml(i18n('MESSAGE/LABEL_TO')))
			.replace('{{ccHide}}', ccLine ? '' : 'hidden=""')
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
		return this.folder + '/' + this.uid;
	}

	/**
	 * @param {MessageModel} message
	 * @returns {MessageModel}
	 */
	populateByMessageListItem(message) {
		if (message) {
			this.folder = message.folder;
			this.uid = message.uid;
			this.hash = message.hash;
			this.requestHash = message.requestHash;
			this.subject(message.subject());

			this.size(message.size());
			this.dateTimeStampInUTC(message.dateTimeStampInUTC());
			this.priority(message.priority());

			this.externalProxy = message.externalProxy;

			this.emails = message.emails;

			this.from = message.from;
			this.to = message.to;
			this.cc = message.cc;
			this.bcc = message.bcc;
			this.replyTo = message.replyTo;
			this.deliveredTo = message.deliveredTo;
			this.unsubsribeLinks = message.unsubsribeLinks;

			this.isUnseen(message.isUnseen());
			this.isFlagged(message.isFlagged());
			this.isAnswered(message.isAnswered());
			this.isForwarded(message.isForwarded());
			this.isReadReceipt(message.isReadReceipt());
			this.isDeleted(message.isDeleted());

			this.priority(message.priority());

			this.selected(message.selected());
			this.checked(message.checked());
			this.hasAttachments(message.hasAttachments());
			this.attachmentsSpecData(message.attachmentsSpecData());

			this.subjectPrefix(this.subjectPrefix());
			this.subjectSuffix(this.subjectSuffix());
		}

		this.body = null;

		this.draftInfo = [];
		this.messageId = '';
		this.inReplyTo = '';
		this.references = '';

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

			let body = this.body, attr = this.externalProxy ? 'data-x-additional-src' : 'data-x-src';
			body.querySelectorAll('[' + attr + ']').forEach(node => {
				if (node.matches('img')) {
					node.loading = 'lazy';
				}
				node.src = node.getAttribute(attr);
				node.removeAttribute('data-loaded');
			});

			attr = this.externalProxy ? 'data-x-additional-style-url' : 'data-x-style-url';
			body.querySelectorAll('[' + attr + ']').forEach(node => {
				node.setAttribute('style', ((node.getAttribute('style')||'')
					+ ';' + node.getAttribute(attr))
					.replace(/^[;\s]+/,''));
			});
		}
	}

	showInternalImages() {
		const body = this.body;
		if (body && !body.rlInitInternalImages) {
			const findAttachmentByCid = cid => this.attachments().findByCid(cid);

			body.rlInitInternalImages = true;

			body.querySelectorAll('[data-x-src-cid],[data-x-src-location],[data-x-style-cid]').forEach(el => {
				const data = el.dataset;
				if (data.xSrcCid) {
					const attachment = findAttachmentByCid(data.xSrcCid);
					if (attachment && attachment.download) {
						el.src = attachment.linkPreview();
					}
				} else if (data.xSrcLocation) {
					const attachment = this.attachments().find(item => data.xSrcLocation === item.contentLocation)
						|| findAttachmentByCid(data.xSrcLocation);
					if (attachment && attachment.download) {
						el.loading = 'lazy';
						el.src = attachment.linkPreview();
					}
				} else if (data.xStyleCid) {
					const name = data.xStyleCidName,
						attachment = findAttachmentByCid(data.xStyleCid);
					if (attachment && attachment.linkPreview && name) {
						el.setAttribute('style', name + ": url('" + attachment.linkPreview() + "');"
							+ (el.getAttribute('style') || ''));
					}
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
			this.isDeleted(),
			this.isUnseen(),
			this.isFlagged(),
			this.isAnswered(),
			this.isForwarded(),
			this.isReadReceipt()
		].join(',');
	}
}

export { MessageModel, MessageModel as default };
