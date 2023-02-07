import { createElement } from 'Common/Globals';
import { forEachObjectEntry, pInt } from 'Common/Utils';
import { SettingsUserStore } from 'Stores/User/Settings';

const
	tpl = createElement('template'),
	htmlre = /[&<>"']/g,
	httpre = /^(https?:)?\/\//i,
	htmlmap = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;'
	},

	blockquoteSwitcher = () => {
		SettingsUserStore.collapseBlockquotes() &&
//		tpl.content.querySelectorAll('blockquote').forEach(node => {
		[...tpl.content.querySelectorAll('blockquote')].reverse().forEach(node => {
			const el = Element.fromHTML('<details class="sm-bq-switcher"><summary>•••</summary></details>');
			node.replaceWith(el);
			el.append(node);
		});
	},

	replaceWithChildren = node => node.replaceWith(...[...node.childNodes]),

	url = /(^|\s|\n|\/?>)(https?:\/\/[-A-Z0-9+&#/%?=()~_|!:,.;]*[-A-Z0-9+&#/%=~()_|])/gi,
	// eslint-disable-next-line max-len
	email = /(^|\s|\n|\/?>)((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x21\x23-\x5b\x5d-\x7f]|\\[\x21\x23-\x5b\x5d-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x21-\x5a\x53-\x7f]|\\[\x21\x23-\x5b\x5d-\x7f])+)\]))/gi,
	// rfc3966
	tel = /(^|\s|\n|\/?>)(tel:(\+[0-9().-]+|[0-9*#().-]+(;phone-context=\+[0-9+().-]+)?))/g,

	// Strip tracking
	/** TODO: implement other url strippers like from
	 * https://www.bleepingcomputer.com/news/security/new-firefox-privacy-feature-strips-urls-of-tracking-parameters/
	 * https://github.com/newhouse/url-tracking-stripper
	 * https://github.com/svenjacobs/leon
	 * https://maxchadwick.xyz/tracking-query-params-registry/
	 * https://github.com/M66B/FairEmail/blob/master/app/src/main/java/eu/faircode/email/UriHelper.java
	 */
	// eslint-disable-next-line max-len
	stripParams = /^(utm_|ec_|fbclid|mc_eid|mkt_tok|_hsenc|vero_id|oly_enc_id|oly_anon_id|__s|Referrer|mailing|elq|bch|trc|ref|correlation_id|pd_|pf_|email_hash)/i,
	urlGetParam = (url, name) => new URL(url).searchParams.get(name) || url,
	base64Url = data => atob(data.replace(/_/g,'/').replace(/-/g,'+')),
	decode = decodeURIComponent,
	stripTracking = url => {
		try {
			let nurl = url
				// Copernica
				.replace(/^.+\/(https%253A[^/?&]+).*$/i, (...m) => decode(decode(m[1])))
				.replace(/tracking\.(printabout\.nl[^?]+)\?.*/i, (...m) => m[1])
				.replace(/(zalando\.nl[^?]+)\?.*/i, (...m) => m[1])
				.replace(/^.+(awstrack\.me|redditmail\.com)\/.+(https:%2F%2F[^/]+).*/i, (...m) => decode(m[2]))
				.replace(/^.+(www\.google|safelinks\.protection\.outlook\.com|mailchimp\.com).+url=.+$/i,
					() => urlGetParam(url, 'url'))
				.replace(/^.+click\.godaddy\.com.+$/i, () => urlGetParam(url, 'redir'))
				.replace(/^.+delivery-status\.com.+$/i, () => urlGetParam(url, 'fb'))
				.replace(/^.+go\.dhlparcel\.nl.+\/([A-Za-z0-9_-]+)$/i, (...m) => base64Url(m[1]))
				.replace(/^(.+mopinion\.com.+)\?.*$/i, (...m) => m[1])
				.replace(/^.+sellercentral\.amazon\.com\/nms\/redirect.+$/i, () => base64Url(urlGetParam(url, 'u')))
				.replace(/^.+amazon\.com\/gp\/r\.html.+$/i, () => urlGetParam(url, 'U'))
				// Mandrill
				.replace(/^.+\/track\/click\/.+\?p=.+$/i, () => {
					let d = urlGetParam(url, 'p');
					try {
						d = JSON.parse(base64Url(d));
						if (d?.p) {
							d = JSON.parse(d.p);
						}
					} catch (e) {
						console.error(e);
					}
					return d?.url || url;
				})
				// Remove invalid URL characters
				.replace(/[\s<>]+/gi, '');
			nurl = new URL(nurl);
			let s = nurl.searchParams;
			[...s.keys()].forEach(key => stripParams.test(key) && s.delete(key));
			return nurl.toString();
		} catch (e) {
			console.dir({
				error:e,
				url:url
			});
		}
		return url;
	};

export const

	/**
	 * @param {string} text
	 * @returns {string}
	 */
	encodeHtml = text => (text?.toString?.() || '' + text).replace(htmlre, m => htmlmap[m]),

	/**
	 * Clears the Message Html for viewing
	 * @param {string} text
	 * @returns {string}
	 */
	cleanHtml = (html, oAttachments) => {
		const
			debug = false, // Config()->Get('debug', 'enable', false);
			detectHiddenImages = true, // !!SettingsGet('try_to_detect_hidden_images'),

			bqLevel = parseInt(SettingsUserStore.maxBlockquotesLevel()),

			result = {
				hasExternals: false
			},

			findAttachmentByCid = cId => oAttachments.findByCid(cId),
			findLocationByCid = cId => {
				const attachment = findAttachmentByCid(cId);
				return attachment?.contentLocation ? attachment : 0;
			},

			// convert body attributes to CSS
			tasks = {
				link: value => {
					if (/^#[a-fA-Z0-9]{3,6}$/.test(value)) {
						tpl.content.querySelectorAll('a').forEach(node => node.style.color || (node.style.color = value))
					}
				},
				text: (value, node) => node.style.color = value,
				topmargin: (value, node) => node.style.marginTop = pInt(value) + 'px',
				leftmargin: (value, node) => node.style.marginLeft = pInt(value) + 'px',
				bottommargin: (value, node) => node.style.marginBottom = pInt(value) + 'px',
				rightmargin: (value, node) => node.style.marginRight = pInt(value) + 'px'
			},
			allowedAttributes = [
				// defaults
				'name',
				'dir', 'lang', 'style', 'title',
				'background', 'bgcolor', 'alt', 'height', 'width', 'src', 'href',
				'border', 'bordercolor', 'charset', 'direction',
				// a
				'download', 'hreflang',
				// body
				'alink', 'bottommargin', 'leftmargin', 'link', 'rightmargin', 'text', 'topmargin', 'vlink',
				// col
				'align', 'valign',
				// font
				'color', 'face', 'size',
				// hr
				'noshade',
				// img
				'hspace', 'sizes', 'srcset', 'vspace',
				// meter
				'low', 'high', 'optimum', 'value',
				// ol
				'reversed', 'start',
				// table
				'cols', 'rows', 'frame', 'rules', 'summary', 'cellpadding', 'cellspacing',
				// th
				'abbr', 'scope',
				// td
				'colspan', 'rowspan', 'headers'
			],
			disallowedTags = [
				'HEAD','STYLE','SVG','SCRIPT','TITLE','LINK','BASE','META',
				'INPUT','OUTPUT','SELECT','BUTTON','TEXTAREA',
				'BGSOUND','KEYGEN','SOURCE','OBJECT','EMBED','APPLET','IFRAME','FRAME','FRAMESET','VIDEO','AUDIO','AREA','MAP'
			],
			nonEmptyTags = [
				'A','B','EM','I','SPAN','STRONG'
			];

		tpl.innerHTML = html
//			.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, pre => pre.replace(/\n/g, '\n<br>'))
			.replace(/<!doctype[^>]*>/gi, '')
			.replace(/<\?xml[^>]*\?>/gi, '')
			// Not supported by <template> element
			.replace(/<(\/?)body(\s[^>]*)?>/gi, '<$1div class="mail-body"$2>')
			.replace(/<\/?(html|head)[^>]*>/gi, '')
			// Fix Reddit https://github.com/the-djmaze/snappymail/issues/540
			.replace(/<span class="preview-text"[\s\S]+?<\/span>/, '')
			// https://github.com/the-djmaze/snappymail/issues/900
			.replace(/\u2028/g,' ')
			.trim();
		html = '';

		// \MailSo\Base\HtmlUtils::ClearComments()
		// https://github.com/the-djmaze/snappymail/issues/187
		const nodeIterator = document.createNodeIterator(tpl.content, NodeFilter.SHOW_COMMENT);
		while (nodeIterator.nextNode()) {
			nodeIterator.referenceNode.remove();
		}

		if (0 < bqLevel) {
			tpl.content.querySelectorAll(new Array(1 + bqLevel).fill('blockquote').join(' ')).forEach(node => node.remove());
		}

		tpl.content.querySelectorAll('*').forEach(oElement => {
			const name = oElement.tagName,
				oStyle = oElement.style;

			// \MailSo\Base\HtmlUtils::ClearTags()
			if (disallowedTags.includes(name)
			 || 'none' == oStyle.display
			 || 'hidden' == oStyle.visibility
//			 || (oStyle.lineHeight && 1 > parseFloat(oStyle.lineHeight)
//			 || (oStyle.maxHeight && 1 > parseFloat(oStyle.maxHeight)
//			 || (oStyle.maxWidth && 1 > parseFloat(oStyle.maxWidth)
//			 || ('0' === oStyle.opacity
			) {
				oElement.remove();
				return;
			}
/*
			// Idea to allow CSS
			if ('STYLE' === name) {
				msgId = '#rl-msg-061eb4d647771be4185943ce91f0039d';
				oElement.textContent = oElement.textContent
					.replace(/[^{}]+{/g, m => msgId + ' ' + m.replace(',', ', '+msgId+' '))
					.replace(/(background-)color:[^};]+/g, '');
				return;
			}
*/
			const aAttrsForRemove = [],
				hasAttribute = name => oElement.hasAttribute(name),
				getAttribute = name => hasAttribute(name) ? oElement.getAttribute(name).trim() : '',
				setAttribute = (name, value) => oElement.setAttribute(name, value),
				delAttribute = name => oElement.removeAttribute(name);

			if ('mail-body' === oElement.className) {
				forEachObjectEntry(tasks, (name, cb) => {
					if (hasAttribute(name)) {
						cb(getAttribute(name), oElement);
						delAttribute(name);
					}
				});
			}

			if (oElement.hasAttributes()) {
				let i = oElement.attributes.length;
				while (i--) {
					let sAttrName = oElement.attributes[i].name.toLowerCase();
					if (!allowedAttributes.includes(sAttrName)) {
						delAttribute(sAttrName);
						aAttrsForRemove.push(sAttrName);
					}
				}
			}

			let value;

//			if ('TABLE' === name || 'TD' === name || 'TH' === name) {
			if (!oStyle.backgroundImage) {
				if ('TD' !== name && 'TH' !== name) {
					// Make width responsive
					if (hasAttribute('width')) {
						value = getAttribute('width');
						oStyle.width = value.includes('%') ? value : value + 'px';
						delAttribute('width');
					}
					value = oStyle.removeProperty('width');
					if (value && !oStyle.maxWidth) {
						oStyle.maxWidth = value;
						oStyle.width = '100%';
					}
					// Make height responsive
					if (hasAttribute('height')) {
						value = getAttribute('height');
						oStyle.height = value.includes('%') ? value : value + 'px';
						delAttribute('height');
					}
					value = oStyle.removeProperty('height');
					if (value && !oStyle.maxHeight) {
						oStyle.maxHeight = value;
					}
				}
			}
//			} else
			if ('A' === name) {
				value = oElement.href;
				if (!/^([a-z]+):/i.test(value)) {
					setAttribute('data-x-broken-href', value);
					delAttribute('href');
				} else {
					oElement.href = stripTracking(value);
					setAttribute('target', '_blank');
//					setAttribute('rel', 'external nofollow noopener noreferrer');
				}
				setAttribute('tabindex', '-1');
			}

//			if (['CENTER','FORM'].includes(name)) {
			if ('FORM' === name || 'O:P' === name || (nonEmptyTags.includes(name) && ('' == oElement.textContent.trim()))) {
				('A' !== name || !oElement.querySelector('IMG')) && replaceWithChildren(oElement);
				return;
			}

			// SVG xlink:href
			/*
			if (hasAttribute('xlink:href')) {
				delAttribute('xlink:href');
			}
			*/

			let skipStyle = false;
			if (hasAttribute('src')) {
				value = stripTracking(getAttribute('src'));
				delAttribute('src');

				if ('IMG' === name) {
					oElement.loading = 'lazy';
					let attachment;
					if (value.startsWith('cid:'))
					{
						value = value.slice(4);
						setAttribute('data-x-src-cid', value);
						attachment = findAttachmentByCid(value);
						if (attachment?.download) {
							oElement.src = attachment.linkPreview();
							oElement.title += ' ('+attachment.fileName+')';
							attachment.isInline(true);
							attachment.isLinked(true);
						}
					}
					else if ((attachment = findLocationByCid(value)))
					{
						if (attachment.download) {
							oElement.src = attachment.linkPreview();
							attachment.isLinked(true);
						}
					}
					else if (detectHiddenImages
						&& ((oStyle.maxHeight && 3 > pInt(oStyle.maxHeight)) // TODO: issue with 'in'
							|| (oStyle.maxWidth && 3 > pInt(oStyle.maxWidth)) // TODO: issue with 'in'
							|| [
								'email.microsoftemail.com/open',
								'github.com/notifications/beacon/',
								'/track/open', // mandrillapp.com list-manage.com
								'google-analytics.com'
							].filter(uri => value.toLowerCase().includes(uri)).length
					)) {
						skipStyle = true;
						oStyle.display = 'none';
//						setAttribute('style', 'display:none');
						setAttribute('data-x-src-hidden', value);
					}
					else if (httpre.test(value))
					{
						setAttribute('data-x-src', value);
						result.hasExternals = true;
						oElement.alt || (oElement.alt = value.replace(/^.+\/([^/?]+).*$/, '$1').slice(-20));
					}
					else if (value.startsWith('data:image/'))
					{
						oElement.src = value;
					}
					else
					{
						setAttribute('data-x-src-broken', value);
					}
				}
				else
				{
					setAttribute('data-x-src-broken', value);
				}
			}

			if (hasAttribute('background')) {
				oStyle.backgroundImage = 'url("' + getAttribute('background') + '")';
				delAttribute('background');
			}

			if (hasAttribute('bgcolor')) {
				oStyle.backgroundColor = getAttribute('bgcolor');
				delAttribute('bgcolor');
			}

			if (hasAttribute('color')) {
				oStyle.color = getAttribute('color');
				delAttribute('color');
			}

			if (!skipStyle) {
/*
				if ('fixed' === oStyle.position) {
					oStyle.position = 'absolute';
				}
*/
				oStyle.removeProperty('behavior');
				oStyle.removeProperty('cursor');
				oStyle.removeProperty('min-width');

				const
					urls_remote = [], // 'data-x-style-url'
					urls_broken = []; // 'data-x-broken-style-src'
				['backgroundImage', 'listStyleImage', 'content'].forEach(property => {
					if (oStyle[property]) {
						let value = oStyle[property],
							found = value.match(/url\s*\(([^)]+)\)/i);
						if (found) {
							oStyle[property] = null;
							found = found[1].replace(/^["'\s]+|["'\s]+$/g, '');
							let lowerUrl = found.toLowerCase();
							if (lowerUrl.startsWith('cid:')) {
								const attachment = findAttachmentByCid(found);
								if (attachment?.linkPreview && name) {
									oStyle[property] = "url('" + attachment.linkPreview() + "')";
									attachment.isInline(true);
									attachment.isLinked(true);
								}
							} else if (httpre.test(lowerUrl)) {
								result.hasExternals = true;
								urls_remote.push([property, found]);
							} else if (lowerUrl.startsWith('data:image/')) {
								oStyle[property] = value;
							} else {
								urls_broken.push([property, found]);
							}
						}
					}
				});
//				oStyle.removeProperty('background-image');
//				oStyle.removeProperty('list-style-image');

				if (urls_remote.length) {
					setAttribute('data-x-style-url', JSON.stringify(urls_remote));
				}
				if (urls_broken.length) {
					setAttribute('data-x-style-broken-urls', JSON.stringify(urls_broken));
				}

				if (11 > pInt(oStyle.fontSize)) {
					oStyle.removeProperty('font-size');
				}

				// Removes background and color
				// Many e-mails incorrectly only define one, not both
				// And in dark theme mode this kills the readability
				if (SettingsUserStore.removeColors()) {
					oStyle.removeProperty('background-color');
					oStyle.removeProperty('background-image');
					oStyle.removeProperty('color');
				}

				// Drop Microsoft Office style properties
//				oStyle.cssText = oStyle.cssText.replace(/mso-[^:;]+:[^;]+/gi, '');
			}

			if (debug && aAttrsForRemove.length) {
				setAttribute('data-removed-attrs', aAttrsForRemove.join(', '));
			}
		});

		blockquoteSwitcher();

//		return tpl.content.firstChild;
		result.html = tpl.innerHTML.trim();
		return result;
	},

	/**
	 * @param {string} html
	 * @returns {string}
	 */
	htmlToPlain = html => {
		const
			hr = '⎯'.repeat(64),
			forEach = (selector, fn) => tpl.content.querySelectorAll(selector).forEach(fn),
			blockquotes = node => {
				let bq;
				while ((bq = node.querySelector('blockquote'))) {
					// Convert child blockquote first
					blockquotes(bq);
					// Convert blockquote
//					bq.innerHTML = '\n' + ('\n' + bq.innerHTML.replace(/\n{3,}/gm, '\n\n').trim() + '\n').replace(/^/gm, '&gt; ');
//					replaceWithChildren(bq);
					bq.replaceWith(
						'\n' + ('\n' + bq.textContent.replace(/\n{3,}/g, '\n\n').trim() + '\n').replace(/^/gm, '> ')
					);
				}
			};

		html = html
			.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gim, (...args) =>
				1 < args.length ? args[1].toString().replace(/\n/g, '<br>') : '')
			.replace(/\r?\n/g, '')
			.replace(/\s+/gm, ' ');

		while (/<(div|tr)[\s>]/i.test(html)) {
			html = html.replace(/\n*<(div|tr)(\s[\s\S]*?)?>\n*/gi, '\n');
		}
		while (/<\/(div|tr)[\s>]/i.test(html)) {
			html = html.replace(/\n*<\/(div|tr)(\s[\s\S]*?)?>\n*/gi, '\n');
		}

		tpl.innerHTML = html
			.replace(/<t[dh](\s[\s\S]*?)?>/gi, '\t')
			.replace(/<\/tr(\s[\s\S]*?)?>/gi, '\n');

		// lines
		forEach('hr', node => node.replaceWith(`\n\n${hr}\n\n`));

		// headings
		forEach('h1,h2,h3,h4,h5,h6', h => h.replaceWith(`\n\n${'#'.repeat(h.tagName[1])} ${h.textContent}\n\n`));

		// paragraphs
		forEach('p', node => {
			node.prepend('\n\n');
			if ('' == node.textContent.trim()) {
				node.remove();
			} else {
				node.after('\n\n');
			}
		});

		// proper indenting and numbering of (un)ordered lists
		forEach('ol,ul', node => {
			let prefix = '',
				parent = node,
				ordered = 'OL' == node.tagName,
				i = 0;
			while ((parent = parent?.parentNode?.closest?.('ol,ul'))) {
				prefix = '    ' + prefix;
			}
			node.querySelectorAll(':scope > li').forEach(li => {
				li.prepend('\n' + prefix + (ordered ? `${++i}. ` : ' * '));
			});
			node.prepend('\n\n');
			node.after('\n\n');
		});

		// Convert anchors
		forEach('a', a => {
			let txt = a.textContent, href = a.href;
			return a.replaceWith(
				txt.trim() == href || href.includes('mailto:') ? txt : txt + ' ' + href + ' '
			);
		});

		// Bold
		forEach('b,strong', b => b.replaceWith(`**${b.textContent}**`));
		// Italic
		forEach('i,em', i => i.replaceWith(`*${i.textContent}*`));

		// Convert line-breaks
		tpl.innerHTML = tpl.innerHTML
			.replace(/\n{3,}/gm, '\n\n')
			.replace(/\n<br[^>]*>/g, '\n')
			.replace(/<br[^>]*>\n/g, '\n');
		forEach('br', br => br.replaceWith('\n'));

		// Blockquotes must be last
		blockquotes(tpl.content);

		return (tpl.content.textContent || '').trim();
	},

	/**
	 * @param {string} plain
	 * @param {boolean} findEmailAndLinksInText = false
	 * @returns {string}
	 */
	plainToHtml = plain => {
		plain = plain.toString()
			.replace(/\r/g, '')
			.replace(/^>[> ]>+/gm, ([match]) => (match ? match.replace(/[ ]+/g, '') : match))
			// https://github.com/the-djmaze/snappymail/issues/900
			.replace(/\u2028/g,' ');

		let bIn = false,
			bDo = true,
			bStart = true,
			aNextText = [],
			aText = plain.split('\n');

		do {
			bDo = false;
			aNextText = [];
			aText.forEach(sLine => {
				bStart = '>' === sLine.slice(0, 1);
				if (bStart && !bIn) {
					bDo = true;
					bIn = true;
					aNextText.push('~~~blockquote~~~');
					aNextText.push(sLine.slice(1));
				} else if (!bStart && bIn) {
					if (sLine) {
						bIn = false;
						aNextText.push('~~~/blockquote~~~');
						aNextText.push(sLine);
					} else {
						aNextText.push(sLine);
					}
				} else if (bStart && bIn) {
					aNextText.push(sLine.slice(1));
				} else {
					aNextText.push(sLine);
				}
			});

			if (bIn) {
				bIn = false;
				aNextText.push('~~~/blockquote~~~');
			}

			aText = aNextText;
		} while (bDo);

		tpl.innerHTML = aText.join('\n')
			// .replace(/~~~\/blockquote~~~\n~~~blockquote~~~/g, '\n')
			.replace(/&/g, '&amp;')
			.replace(/>/g, '&gt;')
			.replace(/</g, '&lt;')
			.replace(url, (...m) => {
				m[2] = stripTracking(m[2]);
				return `${m[1]}<a href="${m[2]}" target="_blank">${m[2]}</a>`;
			})
			.replace(email, '$1<a href="mailto:$2">$2</a>')
			.replace(tel, '$1<a href="$2">$2</a>')
			.replace(/~~~blockquote~~~\s*/g, '<blockquote>')
			.replace(/\s*~~~\/blockquote~~~/g, '</blockquote>')
			.replace(/\n/g, '<br>');
		blockquoteSwitcher();
		return tpl.innerHTML.trim();
	},

	WYSIWYGS = ko.observableArray();

WYSIWYGS.push(['Squire', (owner, container, onReady)=>{
	let squire = new SquireUI(container);
	setTimeout(()=>onReady(squire), 1);
/*
	squire.on('blur', () => owner.blurTrigger());
	squire.on('focus', () => clearTimeout(owner.blurTimer));
	squire.on('mode', () => {
		owner.blurTrigger();
		owner.onModeChange?.(!owner.isPlain());
	});
*/
}]);

rl.registerWYSIWYG = (name, construct) => WYSIWYGS.push([name, construct]);

export class HtmlEditor {
	/**
	 * @param {Object} element
	 * @param {Function=} onBlur
	 * @param {Function=} onReady
	 * @param {Function=} onModeChange
	 */
	constructor(element, onBlur = null, onReady = null, onModeChange = null) {
		this.blurTimer = 0;

		this.onBlur = onBlur;
		this.onModeChange = onModeChange;

		if (element) {
			onReady = onReady ? [onReady] : [];
			this.onReady = fn => onReady.push(fn);
			// TODO: make 'which' user configurable
//			const which = 'CKEditor4',
//				wysiwyg = WYSIWYGS.find(item => which == item[0]) || WYSIWYGS.find(item => 'Squire' == item[0]);
			const wysiwyg = WYSIWYGS.find(item => 'Squire' == item[0]);
			wysiwyg[1](this, element, editor => {
				this.editor = editor;
				editor.on('blur', () => this.blurTrigger());
				editor.on('focus', () => clearTimeout(this.blurTimer));
				editor.on('mode', () => {
					this.blurTrigger();
					this.onModeChange?.(!this.isPlain());
				});
				this.onReady = fn => fn();
				onReady.forEach(fn => fn());
			});
		}
	}

	blurTrigger() {
		if (this.onBlur) {
			clearTimeout(this.blurTimer);
			this.blurTimer = setTimeout(() => this.onBlur?.(), 200);
		}
	}

	/**
	 * @returns {boolean}
	 */
	isHtml() {
		return this.editor ? !this.isPlain() : false;
	}

	/**
	 * @returns {boolean}
	 */
	isPlain() {
		return this.editor ? 'plain' === this.editor.mode : false;
	}

	/**
	 * @returns {void}
	 */
	clearCachedSignature() {
		this.onReady(() => this.editor.execCommand('insertSignature', {
			clearCache: true
		}));
	}

	/**
	 * @param {string} signature
	 * @param {bool} html
	 * @param {bool} insertBefore
	 * @returns {void}
	 */
	setSignature(signature, html, insertBefore = false) {
		this.onReady(() => this.editor.execCommand('insertSignature', {
			isHtml: html,
			insertBefore: insertBefore,
			signature: signature
		}));
	}

	/**
	 * @param {boolean=} wrapIsHtml = false
	 * @returns {string}
	 */
	getData() {
		let result = '';
		if (this.editor) {
			try {
				if (this.isPlain() && this.editor.plugins.plain && this.editor.__plain) {
					result = this.editor.__plain.getRawData();
				} else {
					result = this.editor.getData();
				}
			} catch (e) {} // eslint-disable-line no-empty
		}
		return result;
	}

	/**
	 * @returns {string}
	 */
	getDataWithHtmlMark() {
		return (this.isHtml() ? ':HTML:' : '') + this.getData();
	}

	modeWysiwyg() {
		this.onReady(() => this.editor.setMode('wysiwyg'));
	}
	modePlain() {
		this.onReady(() => this.editor.setMode('plain'));
	}

	setHtmlOrPlain(text) {
		text.startsWith(':HTML:')
			? this.setHtml(text.slice(6))
			: this.setPlain(text);
	}

	setData(mode, data) {
		this.onReady(() => {
			const editor = this.editor;
			this.clearCachedSignature();
			try {
				editor.setMode(mode);
				if (this.isPlain() && editor.plugins.plain && editor.__plain) {
					editor.__plain.setRawData(data);
				} else {
					editor.setData(data);
				}
			} catch (e) { console.error(e); }
		});
	}

	setHtml(html) {
		this.setData('wysiwyg', html/*.replace(/<p[^>]*><\/p>/gi, '')*/);
	}

	setPlain(txt) {
		this.setData('plain', txt);
	}

	focus() {
		this.onReady(() => this.editor.focus());
	}

	hasFocus() {
		try {
			return !!this.editor?.focusManager.hasFocus;
		} catch (e) {
			return false;
		}
	}

	blur() {
		this.onReady(() => this.editor.focusManager.blur(true));
	}

	clear() {
		this.onReady(() => this.isPlain() ? this.setPlain('') : this.setHtml(''));
	}
}

rl.Utils = {
	htmlToPlain: htmlToPlain,
	plainToHtml: plainToHtml
};
