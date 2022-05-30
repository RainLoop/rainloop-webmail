import ko from 'ko';

import { MessagePriority } from 'Common/EnumsUser';
import { i18n } from 'Common/Translator';

import { doc } from 'Common/Globals';
import { encodeHtml, plainToHtml, cleanHtml } from 'Common/Html';
import { isArray, arrayLength, forEachObjectEntry } from 'Common/Utils';
import { serverRequestRaw } from 'Common/Links';

import { FolderUserStore } from 'Stores/User/Folder';
import { SettingsUserStore } from 'Stores/User/Settings';

import { FileInfo } from 'Common/File';
import { AttachmentCollectionModel } from 'Model/AttachmentCollection';
import { EmailCollectionModel } from 'Model/EmailCollection';
import { AbstractModel } from 'Knoin/AbstractModel';

import PreviewHTML from 'Html/PreviewMessage.html';

const
	// eslint-disable-next-line max-len
	url = /(^|[\s\n]|\/?>)(https:\/\/[-A-Z0-9+\u0026\u2019#/%?=()~_|!:,.;]*[-A-Z0-9+\u0026#/%=~()_|])/gi,
	// eslint-disable-next-line max-len
	email = /(^|[\s\n]|\/?>)((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x21\x23-\x5b\x5d-\x7f]|\\[\x21\x23-\x5b\x5d-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x21-\x5a\x53-\x7f]|\\[\x21\x23-\x5b\x5d-\x7f])+)\]))/gi,

	hcont = Element.fromHTML('<div area="hidden" style="position:absolute;left:-5000px"></div>'),
	getRealHeight = el => {
		hcont.innerHTML = el.outerHTML;
		const result = hcont.clientHeight;
		hcont.innerHTML = '';
		return result;
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

			isHtml: false,
			hasImages: false,
			hasExternals: false,

			pgpSigned: null,
			pgpVerified: null,

			pgpEncrypted: null,
			pgpDecrypted: false,

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
			hasAttachments: () => this.attachments().hasVisible(),

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

		this.isHtml(false);
		this.hasImages(false);
		this.hasExternals(false);
		this.attachments(new AttachmentCollectionModel);

		this.pgpSigned(null);
		this.pgpVerified(null);

		this.pgpEncrypted(null);
		this.pgpDecrypted(false);

		this.priority(MessagePriority.Normal);
		this.readReceipt('');

		this.threads([]);
		this.unsubsribeLinks([]);

		this.hasUnseenSubMessage(false);
		this.hasFlaggedSubMessage(false);
	}

	spamStatus() {
		let spam = this.spamResult();
		return spam ? i18n(this.isSpam() ? 'GLOBAL/SPAM' : 'GLOBAL/NOT_SPAM') + ': ' + spam : '';
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
			withAttachments: !!this.attachments().length,
			emptySubject: !this.subject(),
			// hasChildrenMessage: 1 < this.threadsLen(),
			hasUnseenSubMessage: this.hasUnseenSubMessage(),
			hasFlaggedSubMessage: this.hasFlaggedSubMessage()
		}, (key, value) => value && classes.push(key));
		this.flags().forEach(value => {
			'\\' !== value[0] && classes.push('flag-'+value);
		});
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
			let result = cleanHtml(this.html(), this.attachments(), SettingsUserStore.removeColors());
			this.hasExternals(result.hasExternals);
			this.hasImages(body.rlHasImages = !!result.hasExternals);

			body.innerHTML = result.html;

			body.classList.toggle('html', 1);
			body.classList.toggle('plain', 0);

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
			body.innerHTML = plainToHtml(
				this.plain()
					.replace(/-----BEGIN PGP (SIGNED MESSAGE-----(\r?\n[a-z][^\r\n]+)+|SIGNATURE-----[\s\S]*)/, '')
					.trim()
			)
				.replace(url, '$1<a href="$2" target="_blank">$2</a>')
				.replace(email, '$1<a href="mailto:$2">$2</a>');
			this.isHtml(false);
			this.hasImages(false);
			this.initView();
			return true;
		}
	}

	initView() {
		// init BlockquoteSwitcher
		this.body.querySelectorAll('blockquote:not(.rl-bq-switcher)').forEach(node => {
			node.removeAttribute('style')
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

	viewPopupMessage(print) {
		const timeStampInUTC = this.dateTimeStampInUTC() || 0,
			ccLine = this.ccToLine(false),
			m = 0 < timeStampInUTC ? new Date(timeStampInUTC * 1000) : null,
			win = open(''),
			sdoc = win.document;
		let subject = encodeHtml(this.subject()),
			mode = this.isHtml() ? 'div' : 'pre',
			cc = ccLine ? `<div>${encodeHtml(i18n('GLOBAL/CC'))}: ${encodeHtml(ccLine)}</div>` : '',
			style = getComputedStyle(doc.querySelector('.messageView')),
			prop = property => style.getPropertyValue(property);
		sdoc.write(PreviewHTML
			.replace('<title>', '<title>'+subject)
			// eslint-disable-next-line max-len
			.replace('<body>', `<body style="background-color:${prop('background-color')};color:${prop('color')}"><header><h1>${subject}</h1><time>${encodeHtml(m ? m.format('LLL') : '')}</time><div>${encodeHtml(this.fromToLine(false))}</div><div>${encodeHtml(i18n('GLOBAL/TO'))}: ${encodeHtml(this.toToLine(false))}</div>${cc}</header><${mode}>${this.bodyAsHTML()}</${mode}>`)
		);
		sdoc.close();

		if (print) {
			setTimeout(() => win.print(), 100);
		}
	}

	/**
	 * @param {boolean=} print = false
	 */
	popupMessage() {
		this.viewPopupMessage(false);
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
	static fromMessageListItem(message) {
		let self = new MessageModel();

		if (message) {
			self.folder = message.folder;
			self.uid = message.uid;
			self.hash = message.hash;
			self.requestHash = message.requestHash;
			self.subject(message.subject());
			self.plain(message.plain());
			self.html(message.html());

			self.size(message.size());
			self.spamScore(message.spamScore());
			self.spamResult(message.spamResult());
			self.isSpam(message.isSpam());
			self.hasVirus(message.hasVirus());
			self.dateTimeStampInUTC(message.dateTimeStampInUTC());
			self.priority(message.priority());

			self.hasExternals(message.hasExternals());

			self.emails = message.emails;

			self.from = message.from;
			self.to = message.to;
			self.cc = message.cc;
			self.bcc = message.bcc;
			self.replyTo = message.replyTo;
			self.deliveredTo = message.deliveredTo;
			self.unsubsribeLinks(message.unsubsribeLinks);

			self.flags(message.flags());

			self.priority(message.priority());

			self.selected(message.selected());
			self.checked(message.checked());
			self.attachments(message.attachments());

			self.threads(message.threads());
		}

		self.computeSenderEmail();

		return self;
	}

	showExternalImages() {
		const body = this.body;
		if (body && this.hasImages()) {
			this.hasImages(false);
			body.rlHasImages = false;

			let attr = 'data-x-src';
			body.querySelectorAll('[' + attr + ']').forEach(node => {
				if (node.matches('img')) {
					node.loading = 'lazy';
				}
				node.src = node.getAttribute(attr);
			});

			body.querySelectorAll('[data-x-style-url]').forEach(node => {
				forEachObjectEntry(JSON.parse(node.dataset.xStyleUrl), (name, url) => node.style[name] = "url('" + url + "')");
			});
		}
	}

	/**
	 * @returns {string}
	 */
	bodyAsHTML() {
//		if (this.body && !this.body.querySelector('iframe[src*=decrypt]')) {
		if (this.body && !this.body.querySelector('iframe')) {
			let clone = this.body.cloneNode(true);
			clone.querySelectorAll('blockquote.rl-bq-switcher').forEach(
				node => node.classList.remove('rl-bq-switcher','hidden-bq')
			);
			clone.querySelectorAll('.rlBlockquoteSwitcher').forEach(
				node => node.remove()
			);
			return clone.innerHTML;
		}
		let result = cleanHtml(this.html(), this.attachments(), SettingsUserStore.removeColors())
		return result.html || plainToHtml(this.plain());
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
