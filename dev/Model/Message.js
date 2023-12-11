import ko from 'ko';

import { i18n } from 'Common/Translator';

import { doc, elementById, SettingsGet } from 'Common/Globals';
import { encodeHtml, plainToHtml, htmlToPlain, cleanHtml } from 'Common/Html';
import { forEachObjectEntry, b64EncodeJSONSafe } from 'Common/Utils';
import { serverRequestRaw, proxy } from 'Common/Links';
import { addObservablesTo, addComputablesTo } from 'External/ko';

import { FolderUserStore, isAllowedKeyword } from 'Stores/User/Folder';
import { SettingsUserStore } from 'Stores/User/Settings';

import { FileInfo, RFC822 } from 'Common/File';
import { AttachmentCollectionModel } from 'Model/AttachmentCollection';
import { EmailCollectionModel } from 'Model/EmailCollection';
import { AbstractModel } from 'Knoin/AbstractModel';

import PreviewHTML from 'Html/PreviewMessage.html';

import { LanguageStore } from 'Stores/Language';

import Remote from 'Remote/User/Fetch';

const
	msgHtml = msg => cleanHtml(msg.html(), msg.attachments(), '#rl-msg-' + msg.hash),

	toggleTag = (message, keyword) => {
		const lower = keyword.toLowerCase(),
			flags = message.flags,
			isSet = flags.includes(lower);
		Remote.request('MessageSetKeyword', iError => {
			if (!iError) {
				isSet ? flags.remove(lower) : flags.push(lower);
			}
		}, {
			folder: message.folder,
			uids: message.uid,
			keyword: keyword,
			setAction: isSet ? 0 : 1
		})
	},

	/**
	 * @param {EmailCollectionModel} emails
	 * @param {Object} unic
	 * @param {Map} localEmails
	 */
	replyHelper = (emails, unic, localEmails) =>
		emails.forEach(email =>
			unic[email.email] || localEmails.has(email.email) || localEmails.set(email.email, email)
		);

export class MessageModel extends AbstractModel {
	constructor() {
		super();

		this.folder = '';
		this.uid = 0;
		this.hash = '';
		this.from = new EmailCollectionModel;
		this.to = new EmailCollectionModel;
		this.cc = new EmailCollectionModel;
		this.bcc = new EmailCollectionModel;
		this.sender = new EmailCollectionModel;
		this.replyTo = new EmailCollectionModel;
		this.deliveredTo = new EmailCollectionModel;
		this.body = null;
		this.draftInfo = [];
		this.dkim = [];
		this.spf = [];
		this.dmarc = [];
		this.messageId = '';
		this.inReplyTo = '';
		this.references = '';
		this.autocrypt = {};

		addObservablesTo(this, {
			subject: '',
			plain: '',
			html: '',
			preview: null,
			size: 0,
			spamScore: 0,
			spamResult: '',
			isSpam: false,
			hasVirus: null, // or boolean when scanned
			dateTimestamp: 0,
			internalTimestamp: 0,
			priority: 3, // Normal

			senderEmailsString: '',
			senderClearEmailsString: '',

			deleted: false,

			// Also used by Selector
			focused: false,
			selected: false,
			checked: false,

			isHtml: false,
			hasImages: false,
			hasExternals: false,

			pgpSigned: null,
			pgpVerified: null,

			encrypted: false,
			pgpEncrypted: null,
			pgpDecrypted: false,

			readReceipt: '',

			// rfc8621
			id: '',
//			threadId: ''
		});

		this.attachments = ko.observableArray(new AttachmentCollectionModel);
		this.threads = ko.observableArray();
		this.threadUnseen = ko.observableArray();
		this.unsubsribeLinks = ko.observableArray();
		this.flags = ko.observableArray();

		addComputablesTo(this, {
			attachmentIconClass: () =>
				this.encrypted() ? 'icon-lock' : FileInfo.getAttachmentsIconClass(this.attachments()),
			threadsLen: () => rl.app.messageList.threadUid() ? 0 : this.threads().length,
			threadUnseenLen: () => rl.app.messageList.threadUid() ? 0 : this.threadUnseen().length,

			threadsLenText: () => {
				const unseenLen = this.threadUnseenLen();
				return this.threadsLen() + (unseenLen > 0 ? '/' + unseenLen : '');
			},

			isUnseen: () => !this.flags().includes('\\seen'),
			isFlagged: () => this.flags().includes('\\flagged'),
//			isJunk: () => this.flags().includes('$junk') && !this.flags().includes('$nonjunk'),
//			isPhishing: () => this.flags().includes('$phishing'),

			tagOptions: () => {
				const tagOptions = [];
				FolderUserStore.currentFolder().permanentFlags.forEach(value => {
					if (isAllowedKeyword(value)) {
						let lower = value.toLowerCase();
						tagOptions.push({
							css: 'msgflag-' + lower,
							value: value,
							checked: this.flags().includes(lower),
							label: i18n('MESSAGE_TAGS/'+lower, 0, value),
							toggle: (/*obj*/) => toggleTag(this, value)
						});
					}
				});
				return tagOptions
			},

			whitelistOptions: () => {
				let options = [];
				if ('match' === SettingsUserStore.viewImages()) {
					let from = this.from[0],
						list = SettingsUserStore.viewImagesWhitelist(),
						counts = {};
					this.html().match(/src=["'][^"']+/g)?.forEach(m => {
						m = m.replace(/^.+(:\/\/[^/]+).+$/, '$1');
						if (counts[m]) {
							++counts[m];
						} else {
							counts[m] = 1;
							options.push(m);
						}
					});
					options = options.filter(txt => !list.includes(txt)).sort((a,b) => (counts[a] < counts[b])
						? 1
						: (counts[a] > counts[b] ? -1 : a.localeCompare(b))
					);
					from && options.unshift(from.email);
				}
				return options;
			}
		});
	}

	get requestHash() {
		return b64EncodeJSONSafe({
			folder: this.folder,
			uid: this.uid,
			mimeType: RFC822,
			fileName: (this.subject() || 'message-' + this.hash) + '.eml',
			accountHash: SettingsGet('accountHash')
		});
	}

	toggleTag(keyword) {
		toggleTag(this, keyword);
	}

	spamStatus() {
		let spam = this.spamResult();
		return spam ? i18n(this.isSpam() ? 'GLOBAL/SPAM' : 'GLOBAL/NOT_SPAM') + ': ' + spam : '';
	}

	/**
	 * @returns {string}
	 */
	friendlySize() {
		return FileInfo.friendlySize(this.size());
	}

	computeSenderEmail() {
		const list = this[
			[FolderUserStore.sentFolder(), FolderUserStore.draftsFolder()].includes(this.folder) ? 'to' : 'from'
		];
		this.senderEmailsString(list.toString(true));
		this.senderClearEmailsString(list.map(email => email?.email).filter(email => email).join(', '));
	}

	/**
	 * @param {FetchJsonMessage} json
	 * @returns {boolean}
	 */
	revivePropertiesFromJson(json) {
		if (super.revivePropertiesFromJson(json)) {
//			this.foundCIDs = isArray(json.FoundCIDs) ? json.FoundCIDs : [];
//			this.attachments(AttachmentCollectionModel.reviveFromJson(json.attachments, this.foundCIDs));

			this.computeSenderEmail();
			return true;
		}
	}

	/**
	 * @return string
	 */
	lineAsCss(flags=1) {
		let classes = [];
		forEachObjectEntry({
			deleted: this.deleted(),
			selected: this.selected(),
			checked: this.checked(),
			unseen: this.isUnseen(),
			focused: this.focused(),
			priorityHigh: this.priority() === 1,
			withAttachments: !!this.attachments().length,
			// hasChildrenMessage: 1 < this.threadsLen()
		}, (key, value) => value && classes.push(key));
		flags && this.flags().forEach(value => classes.push('msgflag-'+value));
		return classes.join(' ');
	}

	indent() {
		return this.level ? 'margin-left:'+this.level+'em' : null;
	}

	/**
	 * @returns {string}
	 */
	viewRaw() {
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
	 * @returns {Array}
	 */
	replyEmails(excludeEmails) {
		const
			result = new Map(),
			unic = excludeEmails || {};
		replyHelper(this.replyTo, unic, result);
		result.size || replyHelper(this.from, unic, result);
		return result.size ? [...result.values()] : [this.to[0]];
	}

	/**
	 * @param {Object} excludeEmails
	 * @returns {Array.<Array>}
	 */
	replyAllEmails(excludeEmails) {
		const
			toResult = new Map(),
			ccResult = new Map(),
			unic = excludeEmails || {};

		replyHelper(this.replyTo, unic, toResult);
		toResult.size || replyHelper(this.from, unic, toResult);

		replyHelper(this.to, unic, toResult);

		replyHelper(this.cc, unic, ccResult);

		return [[...toResult.values()], [...ccResult.values()]];
	}

	viewBody(html) {
		const body = this.body;
		if (body) {
			if (html) {
				let result = msgHtml(this);
				this.hasExternals(result.hasExternals);
				this.hasImages(!!result.hasExternals);
				body.innerHTML = result.html;
				if (!this.isSpam() && FolderUserStore.spamFolder() != this.folder) {
					if ('always' === SettingsUserStore.viewImages()) {
						this.showExternalImages();
					}
					if ('match' === SettingsUserStore.viewImages()) {
						this.showExternalImages(1);
					}
				}
			} else {
				body.innerHTML = plainToHtml(
					(this.plain()
						? this.plain()
							.replace(/-----BEGIN PGP (SIGNED MESSAGE-----(\r?\n[^\r\n]+)+|SIGNATURE-----[\s\S]*)/sg, '')
							.trim()
						: htmlToPlain(body.innerHTML || msgHtml(this).html)
					)
				);
				this.hasImages(false);
			}
			body.classList.toggle('html', html);
			body.classList.toggle('plain', !html);
			this.isHtml(html);
			return true;
		}

	}

	viewHtml() {
		return this.html() && this.viewBody(true);
	}

	viewPlain() {
		return this.viewBody(false);
	}

	/**
	 * @param {boolean=} print = false
	 */
	popupMessage(print) {
		const
			timeStampInUTC = this.dateTimestamp() || 0,
			ccLine = this.cc.toString(),
			bccLine = this.bcc.toString(),
			m = 0 < timeStampInUTC ? new Date(timeStampInUTC * 1000) : null,
			win = open('', 'sm-msg-'+this.requestHash
				,SettingsUserStore.messageNewWindow() ? 'innerWidth=' + elementById('V-MailMessageView').clientWidth : ''
			),
			sdoc = win.document,
			subject = encodeHtml(this.subject()),
			mode = this.isHtml() ? 'div' : 'pre',
			to = `<div>${encodeHtml(i18n('GLOBAL/TO'))}: ${encodeHtml(this.to)}</div>`
				+ (ccLine ? `<div>${encodeHtml(i18n('GLOBAL/CC'))}: ${encodeHtml(ccLine)}</div>` : '')
				+ (bccLine ? `<div>${encodeHtml(i18n('GLOBAL/BCC'))}: ${encodeHtml(bccLine)}</div>` : ''),
			style = getComputedStyle(doc.querySelector('.messageView')),
			prop = property => style.getPropertyValue(property);
		let attachments = '';
		this.attachments.forEach(attachment => {
			attachments += `<a href="${attachment.linkDownload()}">${attachment.fileName}</a>`;
		});
		sdoc.write(PreviewHTML
			.replace('<title>', '<title>'+subject)
			// eslint-disable-next-line max-len
			.replace('<body>', `<body style="background-color:${prop('background-color')};color:${prop('color')}"><header><h1>${subject}</h1><time>${encodeHtml(m ? m.format('LLL',0,LanguageStore.hourCycle()) : '')}</time><div>${encodeHtml(this.from)}</div>${to}</header><${mode}>${this.bodyAsHTML()}</${mode}>`)
			.replace('</body>', `<div id="attachments">${attachments}</div></body>`)
		);
		sdoc.close();
		(true === print) && setTimeout(() => win.print(), 100);
	}

	printMessage() {
		this.popupMessage(true);
	}

	/**
	 * @returns {string}
	 */
	generateUid() {
		return this.folder + '/' + this.uid;
	}

	/**
	 * @returns {MessageModel}
	 *//*
	clone() {
		let self = new MessageModel();
		// Clone message values
		forEachObjectEntry(this, (key, value) => {
			if (ko.isObservable(value)) {
				ko.isComputed(value) || self[key](value());
			} else if (!isFunction(value)) {
				self[key] = value;
			}
		});
		self.computeSenderEmail();
		return self;
	}*/

	showExternalImages(regex) {
		const body = this.body;
		if (body && this.hasImages()) {
			if (regex) {
				regex = [];
				SettingsUserStore.viewImagesWhitelist().trim().split(/[\s\r\n,;]+/g).forEach(rule => {
					rule = rule.split('+');
					rule[0] = rule[0].trim();
					if (rule[0]
					 && (!rule.includes('spf') || 'pass' === this.spf[0]?.[0])
					 && (!rule.includes('dkim') || 'pass' === this.dkim[0]?.[0])
					 && (!rule.includes('dmarc') || 'pass' === this.dmarc[0]?.[0])
					) {
						regex.push(rule[0].replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'));
					}
				});
				regex = regex.join('|').replace(/\|+/g, '|');
				if (regex) {
					console.log('whitelist images = '+regex);
					regex = new RegExp(regex);
					if (this.from[0]?.email.match(regex)) {
						regex = null;
					}
				}
			}
			let hasImages = false,
				isValid = src => {
					if (null == regex || (regex && src.match(regex))) {
						return true;
					}
					hasImages = true;
				},
				attr = 'data-x-src',
				src, useProxy = !!SettingsGet('useLocalProxyForExternalImages');
			body.querySelectorAll('img[' + attr + ']').forEach(node => {
				src = node.getAttribute(attr);
				if (isValid(src)) {
					node.src = useProxy ? proxy(src) : src;
				}
			});

			body.querySelectorAll('[data-x-style-url]').forEach(node => {
				JSON.parse(node.dataset.xStyleUrl).forEach(data => {
					if (isValid(data[1])) {
						node.style[data[0]] = "url('" + (useProxy ? proxy(data[1]) : data[1]) + "')"
					}
				});
			});

			this.hasImages(hasImages);
		}
	}

	/**
	 * @returns {string}
	 */
	bodyAsHTML() {
		if (this.body) {
			let clone = this.body.cloneNode(true);
			clone.querySelectorAll('.sm-bq-switcher').forEach(
				node => node.replaceWith(node.lastElementChild)
			);
			return (clone.querySelector('.mail-body') || clone).innerHTML;
		}
		let result = msgHtml(this);
		return result.html || plainToHtml(this.plain());
	}

}
