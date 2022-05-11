import { createElement, SettingsGet } from 'Common/Globals';
import { forEachObjectEntry, pInt } from 'Common/Utils';
import { proxy } from 'Common/Links';

const
	tpl = createElement('template'),
	htmlre = /[&<>"']/g,
	htmlmap = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;'
	},

	replaceWithChildren = node => node.replaceWith(...[...node.childNodes]),

	// Strip tracking
	stripTracking = text => text
		.replace(/tracking\.(printabout\.nl[^?]+)\?.*/gsi, (...m) => m[1])
		.replace(/^.+awstrack\.me\/.+(https:%2F%2F[^/]+)/gsi, (...m) => decodeURIComponent(m[1]))
		.replace(/([?&])utm_[a-z]+=[^&?#]*/gsi, '$1')
		.replace(/&&+/, '');

export const

	/**
	 * @param {string} text
	 * @returns {string}
	 */
	encodeHtml = text => (text && text.toString ? text.toString() : '' + text).replace(htmlre, m => htmlmap[m]),

	/**
	 * Clears the Message Html for viewing
	 * @param {string} text
	 * @returns {string}
	 */
	cleanHtml = (html, contentLocationUrls, removeColors) => {
		const
			debug = false, // Config()->Get('debug', 'enable', false);
			useProxy = !!SettingsGet('UseLocalProxyForExternalImages'),
			detectHiddenImages = true, // !!SettingsGet('try_to_detect_hidden_images'),

			result = {
				hasExternals: false,
				foundCIDs: [],
				foundContentLocationUrls: []
			},

			// convert body attributes to CSS
			tasks = {
				link: value => {
					if (/^#[a-fA-Z0-9]{3,6}$/.test(value)) {
						tpl.content.querySelectorAll('a').forEach(node => node.style.color = value)
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
				'A','B','EM','I','SPAN','STRONG','O:P','TABLE'
			];

		tpl.innerHTML = html
//			.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, pre => pre.replace(/\n/g, '\n<br>'))
			.replace(/<!doctype[^>]*>/gi, '')
			.replace(/<\?xml[^>]*\?>/gi, '')
			// Not supported by <template> element
			.replace(/<(\/?)body(\s[^>]*)?>/gi, '<$1div class="mail-body"$2>')
			.replace(/<\/?(html|head)[^>]*>/gi, '')
			.trim();
		html = '';

		// \MailSo\Base\HtmlUtils::ClearComments()
		// https://github.com/the-djmaze/snappymail/issues/187
		const nodeIterator = document.createNodeIterator(tpl.content, NodeFilter.SHOW_COMMENT);
		while (nodeIterator.nextNode()) {
			nodeIterator.referenceNode.remove();
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
			 || (nonEmptyTags.includes(name) && ('' == oElement.textContent.trim() && !oElement.querySelector('img')))
			) {
				oElement.remove();
				return;
			}
//			if (['CENTER','FORM'].includes(name)) {
			if ('FORM' === name || 'O:P' === name) {
				replaceWithChildren(oElement);
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
				if (hasAttribute('width')) {
					value = getAttribute('width');
					oStyle.width = value.includes('%') ? value : value + 'px';
					delAttribute('width');
				}
				value = oStyle.width;
				if (value && !value.includes('%')) {
					oStyle.maxWidth = value;
					if ('TD' !== name && 'TH' !== name) {
						oStyle.width = '100%';
					}
				}
				if (hasAttribute('height')) {
					value = getAttribute('height');
					oStyle.height = value.includes('%') ? value : value + 'px';
					delAttribute('height');
				}
				value = oStyle.removeProperty('height');
				if (value && !value.includes('%')) {
					oStyle.maxHeight = value;
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
					setAttribute('rel', 'external nofollow noopener noreferrer');
				}
				setAttribute('tabindex', '-1');
			}

			// SVG xlink:href
			/*
			if (hasAttribute('xlink:href')) {
				delAttribute('xlink:href');
			}
			*/

			let skipStyle = false;
			if (hasAttribute('src')) {
				value = getAttribute('src');
				delAttribute('src');

				if (detectHiddenImages
					&& 'IMG' === name
					&& (('' != getAttribute('height') && 3 > pInt(getAttribute('height')))
						|| ('' != getAttribute('width') && 3 > pInt(getAttribute('width')))
						|| [
							'email.microsoftemail.com/open',
							'github.com/notifications/beacon/',
							'mandrillapp.com/track/open',
							'list-manage.com/track/open'
						].filter(uri => value.toLowerCase().includes(uri)).length
				)) {
					skipStyle = true;
					setAttribute('style', 'display:none');
					setAttribute('data-x-hidden-src', value);
				}
				else if (contentLocationUrls[value])
				{
					setAttribute('data-x-src-location', value);
					result.foundContentLocationUrls.push(value);
				}
				else if ('cid:' === value.slice(0, 4))
				{
					setAttribute('data-x-src-cid', value.slice(4));
					result.foundCIDs.push(value.slice(4));
				}
				else if (/^(https?:)?\/\//i.test(value))
				{
					setAttribute('data-x-src', useProxy ? proxy(value) : value);
					result.hasExternals = true;
				}
				else if ('data:image/' === value.slice(0, 11))
				{
					setAttribute('src', value);
				}
				else
				{
					setAttribute('data-x-broken-src', value);
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

				const urls = {
					cid: [],    // 'data-x-style-cid'
					remote: [], // 'data-x-style-url'
					broken: []  // 'data-x-broken-style-src'
				};
				['backgroundImage', 'listStyleImage', 'content'].forEach(property => {
					if (oStyle[property]) {
						let value = oStyle[property],
							found = value.match(/url\s*\(([^)]+)\)/gi);
						if (found) {
							oStyle[property] = null;
							found = found[0].replace(/^["'\s]+|["'\s]+$/g, '');
							let lowerUrl = found.toLowerCase();
							if ('cid:' === lowerUrl.slice(0, 4)) {
								found = found.slice(4);
								urls.cid[property] = found
								result.foundCIDs.push(found);
							} else if (/http[s]?:\/\//.test(lowerUrl) || '//' === found.slice(0, 2)) {
								result.hasExternals = true;
								urls.remote[property] = useProxy ? proxy(found) : found;
							} else if ('data:image/' === lowerUrl.slice(0, 11)) {
								oStyle[property] = value;
							} else {
								urls.broken[property] = found;
							}
						}
					}
				});
//				oStyle.removeProperty('background-image');
//				oStyle.removeProperty('list-style-image');

				if (urls.cid.length) {
					setAttribute('data-x-style-cid', JSON.stringify(urls.cid));
				}
				if (urls.remote.length) {
					setAttribute('data-x-style-url', JSON.stringify(urls.remote));
				}
				if (urls.broken.length) {
					setAttribute('data-x-style-broken-urls', JSON.stringify(urls.broken));
				}

				if (11 > pInt(oStyle.fontSize)) {
					oStyle.removeProperty('font-size');
				}

				// Removes background and color
				// Many e-mails incorrectly only define one, not both
				// And in dark theme mode this kills the readability
				if (removeColors) {
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

		// Convert line-breaks
		forEach('br', br => br.replaceWith('\n'));

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
			while (parent && parent.parentNode && parent.parentNode.closest) {
				parent = parent.parentNode.closest('ol,ul');
				parent && (prefix = '    ' + prefix);
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
			return a.replaceWith((txt.trim() == href ? txt : txt + ' ' + href + ' '));
		});

		// Bold
		forEach('b,strong', b => b.replaceWith(`**${b.textContent}**`));
		// Italic
		forEach('i,em', i => i.replaceWith(`*${i.textContent}*`));

		// Blockquotes must be last
		blockquotes(tpl.content);

		return (tpl.content.textContent || '').replace(/\n{3,}/gm, '\n\n').trim();
	},

	/**
	 * @param {string} plain
	 * @param {boolean} findEmailAndLinksInText = false
	 * @returns {string}
	 */
	plainToHtml = plain => {
		plain = stripTracking(plain)
			.toString()
			.replace(/\r/g, '')
			.replace(/^>[> ]>+/gm, ([match]) => (match ? match.replace(/[ ]+/g, '') : match));

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

		return aText.join('\n')
			// .replace(/~~~\/blockquote~~~\n~~~blockquote~~~/g, '\n')
			.replace(/&/g, '&amp;')
			.replace(/>/g, '&gt;')
			.replace(/</g, '&lt;')
			.replace(/~~~blockquote~~~\s*/g, '<blockquote>')
			.replace(/\s*~~~\/blockquote~~~/g, '</blockquote>')
			.replace(/\n/g, '<br>');
	};

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
			let editor;

			onReady = onReady ? [onReady] : [];
			this.onReady = fn => onReady.push(fn);
			const readyCallback = () => {
				this.editor = editor;
				this.onReady = fn => fn();
				onReady.forEach(fn => fn());
			};

			if (rl.createWYSIWYG) {
				editor = rl.createWYSIWYG(element, readyCallback);
			}
			if (!editor) {
				editor = new SquireUI(element);
				setTimeout(readyCallback, 1);
			}

			editor.on('blur', () => this.blurTrigger());
			editor.on('focus', () => this.blurTimer && clearTimeout(this.blurTimer));
			editor.on('mode', () => {
				this.blurTrigger();
				this.onModeChange && this.onModeChange(!this.isPlain());
			});
		}
	}

	blurTrigger() {
		if (this.onBlur) {
			clearTimeout(this.blurTimer);
			this.blurTimer = setTimeout(() => this.onBlur && this.onBlur(), 200);
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
		if (':HTML:' === text.slice(0, 6)) {
			this.setHtml(text.slice(6));
		} else {
			this.setPlain(text);
		}
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
			return this.editor && !!this.editor.focusManager.hasFocus;
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
