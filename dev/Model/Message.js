import ko from 'ko';

import { MessagePriority } from 'Common/EnumsUser';
import { i18n } from 'Common/Translator';

import { doc } from 'Common/Globals';
import { encodeHtml } from 'Common/Html';
import { isArray, arrayLength, forEachObjectEntry } from 'Common/Utils';
import { plainToHtml } from 'Common/UtilsUser';

import { serverRequestRaw } from 'Common/Links';

import { FolderUserStore } from 'Stores/User/Folder';
import { SettingsUserStore } from 'Stores/User/Settings';

import { FileInfo } from 'Common/File';
import { AttachmentCollectionModel } from 'Model/AttachmentCollection';
import { EmailCollectionModel } from 'Model/EmailCollection';
import { AbstractModel } from 'Knoin/AbstractModel';

import PreviewHTML from 'Html/PreviewMessage.html';

import { PgpUserStore } from 'Stores/User/Pgp';

const
	/*eslint-disable max-len*/
	url = /(^|[\s\n]|\/?>)(https:\/\/[-A-Z0-9+\u0026\u2019#/%?=()~_|!:,.;]*[-A-Z0-9+\u0026#/%=~()_|])/gi,
	email = /(^|[\s\n]|\/?>)((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x21\x23-\x5b\x5d-\x7f]|\\[\x21\x23-\x5b\x5d-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x21-\x5a\x53-\x7f]|\\[\x21\x23-\x5b\x5d-\x7f])+)\]))/gi,

	// Removes background and color
	// Many e-mails incorrectly only define one, not both
	// And in dark theme mode this kills the readability
	removeColors = html => {
		let l;
		do {
			l = html.length;
			html = html
				.replace(/(<[^>]+[;"'])\s*background(-[a-z]+)?\s*:[^;"']+/gi, '$1')
				.replace(/(<[^>]+[;"'])\s*color\s*:[^;"']+/gi, '$1')
				.replace(/(<[^>]+)\s(bg)?color=("[^"]+"|'[^']+')/gi, '$1');
		} while (l != html.length)
		return html;
	},

	hcont = Element.fromHTML('<div area="hidden" style="position:absolute;left:-5000px"></div>'),
	getRealHeight = el => {
		hcont.innerHTML = el.outerHTML;
		const result = hcont.clientHeight;
		hcont.innerHTML = '';
		return result;
	},

	SignedVerifyStatus = {
		UnknownPublicKeys: -4,
		UnknownPrivateKey: -3,
		Unverified: -2,
		Error: -1,
		None: 0,
		Success: 1
	},

	replyHelper = (emails, unic, localEmails) => {
		emails.forEach(email => {
			if (undefined === unic[email.email]) {
				unic[email.email] = true;
				localEmails.push(email);
			}
		});
	};

doc.body.append(hcont);

export class MessageModel extends AbstractModel {
	constructor() {
		super();

		this._reset();

		this.addObservables({
			subject: '',
			plain: '',
			html: '',
			size: 0,
			spamScore: 0,
			spamResult: '',
			isSpam: false,
			hasVirus: null, // or boolean when scanned
			dateTimeStampInUTC: 0,
			priority: MessagePriority.Normal,

			senderEmailsString: '',
			senderClearEmailsString: '',

			deleted: false,

			focused: false,
			selected: false,
			checked: false,
			hasAttachments: false,

			isHtml: false,
			hasImages: false,
			hasExternals: false,

			isPgpSigned: false,
			isPgpEncrypted: false,
			pgpSignedVerifyStatus: SignedVerifyStatus.None,
			pgpSignedVerifyUser: '',

			readReceipt: '',

			hasUnseenSubMessage: false,
			hasFlaggedSubMessage: false
		});

		this.attachments = ko.observableArray(new AttachmentCollectionModel);
		this.threads = ko.observableArray();
		this.unsubsribeLinks = ko.observableArray();
		this.flags = ko.observableArray();

		this.addComputables({
			attachmentIconClass: () => FileInfo.getAttachmentsIconClass(this.attachments()),
			threadsLen: () => this.threads().length,
			isImportant: () => MessagePriority.High === this.priority(),

			isDeleted: () => this.flags().includes('\\deleted'),
			isUnseen: () => !this.flags().includes('\\seen') /* || this.flags().includes('\\unseen')*/,
			isFlagged: () => this.flags().includes('\\flagged'),
			isAnswered: () => this.flags().includes('\\answered'),
			isForwarded: () => this.flags().includes('$forwarded'),
			isReadReceipt: () => this.flags().includes('$mdnsent')
//			isJunk: () => this.flags().includes('$junk') && !this.flags().includes('$nonjunk'),
//			isPhishing: () => this.flags().includes('$phishing')
		});
	}

	_reset() {
		this.folder = '';
		this.uid = 0;
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
		this.body = null;
		this.draftInfo = [];
		this.messageId = '';
		this.inReplyTo = '';
		this.references = '';
	}

	clear() {
		this._reset();
		this.subject('');
		this.html('');
		this.plain('');
		this.size(0);
		this.spamScore(0);
		this.spamResult('');
		this.isSpam(false);
		this.hasVirus(null);
		this.dateTimeStampInUTC(0);
		this.priority(MessagePriority.Normal);

		this.senderEmailsString('');
		this.senderClearEmailsString('');

		this.deleted(false);

		this.selected(false);
		this.checked(false);
		this.hasAttachments(false);

		this.isHtml(false);
		this.hasImages(false);
		this.hasExternals(false);
		this.attachments(new AttachmentCollectionModel);

		this.isPgpSigned(false);
		this.isPgpEncrypted(false);
		this.pgpSignedVerifyStatus(SignedVerifyStatus.None);
		this.pgpSignedVerifyUser('');

		this.priority(MessagePriority.Normal);
		this.readReceipt('');

		this.threads([]);
		this.unsubsribeLinks([]);

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
		return FileInfo.friendlySize(this.size());
	}

	computeSenderEmail() {
		const list = [FolderUserStore.sentFolder(), FolderUserStore.draftsFolder()].includes(this.folder) ? 'to' : 'from';
		this.senderEmailsString(this[list].toString(true));
		this.senderClearEmailsString(this[list].toStringClear());
	}

	/**
	 * @param {FetchJsonMessage} json
	 * @returns {boolean}
	 */
	revivePropertiesFromJson(json) {
		if ('Priority' in json && ![MessagePriority.High, MessagePriority.Low].includes(json.Priority)) {
			json.Priority = MessagePriority.Normal;
		}
		if (super.revivePropertiesFromJson(json)) {
			this.hasAttachments(!!this.attachments.length);
//			this.foundCIDs = isArray(json.FoundCIDs) ? json.FoundCIDs : [];
//			this.attachments(AttachmentCollectionModel.reviveFromJson(json.Attachments, this.foundCIDs));

			this.computeSenderEmail();
		}
	}

	/**
	 * @returns {boolean}
	 */
	hasUnsubsribeLinks() {
		return this.unsubsribeLinks().length;
	}

	/**
	 * @returns {string}
	 */
	getFirstUnsubsribeLink() {
		return this.unsubsribeLinks()[0] || '';
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink
	 * @returns {string}
	 */
	fromToLine(friendlyView, wrapWithLink) {
		return this.from.toString(friendlyView, wrapWithLink);
	}

	/**
	 * @returns {string}
	 */
	fromDkimData() {
		let result = ['none', ''];
		if (1 === arrayLength(this.from) && this.from[0] && this.from[0].dkimStatus) {
			result = [this.from[0].dkimStatus, this.from[0].dkimValue || ''];
		}

		return result;
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink
	 * @returns {string}
	 */
	toToLine(friendlyView, wrapWithLink) {
		return this.to.toString(friendlyView, wrapWithLink);
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink
	 * @returns {string}
	 */
	ccToLine(friendlyView, wrapWithLink) {
		return this.cc.toString(friendlyView, wrapWithLink);
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink
	 * @returns {string}
	 */
	bccToLine(friendlyView, wrapWithLink) {
		return this.bcc.toString(friendlyView, wrapWithLink);
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink
	 * @returns {string}
	 */
	replyToToLine(friendlyView, wrapWithLink) {
		return this.replyTo.toString(friendlyView, wrapWithLink);
	}

	/**
	 * @return string
	 */
	lineAsCss() {
		let classes = [];
		forEachObjectEntry({
			deleted: this.deleted(),
			'deleted-mark': this.isDeleted(),
			selected: this.selected(),
			checked: this.checked(),
			flagged: this.isFlagged(),
			unseen: this.isUnseen(),
			answered: this.isAnswered(),
			forwarded: this.isForwarded(),
			focused: this.focused(),
			important: this.isImportant(),
			withAttachments: this.hasAttachments(),
			emptySubject: !this.subject(),
			// hasChildrenMessage: 1 < this.threadsLen(),
			hasUnseenSubMessage: this.hasUnseenSubMessage(),
			hasFlaggedSubMessage: this.hasFlaggedSubMessage()
		}, (key, value) => value && classes.push(key));
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
		return serverRequestRaw('ViewAsPlain', this.requestHash);
	}

	/**
	 * @returns {string}
	 */
	downloadLink() {
		return serverRequestRaw('Download', this.requestHash);
	}

	/**
	 * @param {Object} excludeEmails
	 * @param {boolean=} last = false
	 * @returns {Array}
	 */
	replyEmails(excludeEmails, last) {
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
	replyAllEmails(excludeEmails, last) {
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

	viewHtml() {
		const body = this.body;
		if (body && this.html()) {
			let html = this.html().toString()
				.replace(/font-size:\s*[0-9]px/g, 'font-size:11px')
				// Strip utm_* tracking
				.replace(/(\\?|&amp;|&)utm_[a-z]+=[a-z0-9_-]*/si, '$1');
			if (SettingsUserStore.removeColors()) {
				html = removeColors(html);
			}

			body.innerHTML = html;

			body.classList.toggle('html', 1);
			body.classList.toggle('plain', 0);

			// Drop Microsoft Office style properties
			const rgbRE = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/g,
				hex = n => ('0' + parseInt(n).toString(16)).slice(-2);
			body.querySelectorAll('[style*=mso]').forEach(el =>
				el.setAttribute('style', el.style.cssText.replace(rgbRE, (m,r,g,b) => '#' + hex(r) + hex(g) + hex(b)))
			);

			// showInternalImages
			const findAttachmentByCid = cid => this.attachments().findByCid(cid);
			body.querySelectorAll('[data-x-src-cid],[data-x-src-location],[data-x-style-cid]').forEach(el => {
				const data = el.dataset;
				if (data.xSrcCid) {
					const attachment = findAttachmentByCid(data.xSrcCid);
					if (attachment && attachment.download) {
						el.src = attachment.linkPreview();
					}
				} else if (data.xSrcLocation) {
					const attachment = this.attachments.find(item => data.xSrcLocation === item.contentLocation)
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

			if (SettingsUserStore.showImages()) {
				this.showExternalImages();
			}

			this.isHtml(true);
			this.initView();
			return true;
		}
	}

	viewPlain() {
		const body = this.body;
		if (body && this.plain()) {
			body.classList.toggle('html', 0);
			body.classList.toggle('plain', 1);
			body.innerHTML = plainToHtml(this.plain().toString())
				// Strip utm_* tracking
				.replace(/(\\?|&amp;|&)utm_[a-z]+=[a-z0-9_-]*/si, '$1')
				.replace(url, '$1<a href="$2" target="_blank">$2</a>')
				.replace(email, '$1<a href="mailto:$2">$2</a>');

			this.isHtml(false);
			this.hasImages(this.hasExternals());
			this.initView();
			return true;
		}
	}

	initView() {
		PgpUserStore.initMessageBodyControls(this.body, this);

		// init BlockquoteSwitcher
		this.body.querySelectorAll('blockquote:not(.rl-bq-switcher)').forEach(node => {
			if (node.textContent.trim() && !node.parentNode.closest('blockquote')) {
				let h = node.clientHeight || getRealHeight(node);
				if (0 === h || 100 < h) {
					const el = Element.fromHTML('<span class="rlBlockquoteSwitcher">•••</span>');
					node.classList.add('rl-bq-switcher','hidden-bq');
					node.before(el);
					el.addEventListener('click', () => node.classList.toggle('hidden-bq'));
				}
			}
		});
	}

	/**
	 * @param {boolean=} print = false
	 */
	viewPopupMessage(print) {
		const timeStampInUTC = this.dateTimeStampInUTC() || 0,
			ccLine = this.ccToLine(false),
			m = 0 < timeStampInUTC ? new Date(timeStampInUTC * 1000) : null,
			win = open(''),
			doc = win.document;
		doc.write(PreviewHTML
			.replace(/{{subject}}/g, encodeHtml(this.subject()))
			.replace('{{date}}', encodeHtml(m ? m.format('LLL') : ''))
			.replace('{{fromCreds}}', encodeHtml(this.fromToLine(false)))
			.replace('{{toCreds}}', encodeHtml(this.toToLine(false)))
			.replace('{{toLabel}}', encodeHtml(i18n('GLOBAL/TO')))
			.replace('{{ccHide}}', ccLine ? '' : 'hidden=""')
			.replace('{{ccCreds}}', encodeHtml(ccLine))
			.replace('{{ccLabel}}', encodeHtml(i18n('GLOBAL/CC')))
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
		this.clear();

		if (message) {
			this.folder = message.folder;
			this.uid = message.uid;
			this.hash = message.hash;
			this.requestHash = message.requestHash;
			this.subject(message.subject());
			this.plain(message.plain());
			this.html(message.html());

			this.size(message.size());
			this.spamScore(message.spamScore());
			this.spamResult(message.spamResult());
			this.isSpam(message.isSpam());
			this.hasVirus(message.hasVirus());
			this.dateTimeStampInUTC(message.dateTimeStampInUTC());
			this.priority(message.priority());

			this.hasExternals(message.hasExternals());
			this.externalProxy = message.externalProxy;

			this.emails = message.emails;

			this.from = message.from;
			this.to = message.to;
			this.cc = message.cc;
			this.bcc = message.bcc;
			this.replyTo = message.replyTo;
			this.deliveredTo = message.deliveredTo;
			this.unsubsribeLinks(message.unsubsribeLinks);

			this.flags(message.flags());

			this.priority(message.priority());

			this.selected(message.selected());
			this.checked(message.checked());
			this.hasAttachments(message.hasAttachments());
			this.attachments(message.attachments());

			this.threads(message.threads());
		}

		this.computeSenderEmail();

		return this;
	}

	showExternalImages() {
		const body = this.body;
		if (body && this.hasImages()) {
			this.hasImages(false);
			body.rlHasImages = false;

			let attr = this.externalProxy ? 'data-x-additional-src' : 'data-x-src';
			body.querySelectorAll('[' + attr + ']').forEach(node => {
				if (node.matches('img')) {
					node.loading = 'lazy';
				}
				node.src = node.getAttribute(attr);
			});

			attr = this.externalProxy ? 'data-x-additional-style-url' : 'data-x-style-url';
			body.querySelectorAll('[' + attr + ']').forEach(node => {
				node.setAttribute('style', ((node.getAttribute('style')||'')
					+ ';' + node.getAttribute(attr))
					.replace(/^[;\s]+/,''));
			});
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
