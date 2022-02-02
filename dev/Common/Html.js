import { createElement, SettingsGet } from 'Common/Globals';
import { forEachObjectEntry, pInt } from 'Common/Utils';
import { proxy } from 'Common/Links';

const
/*
	strip_tags = (m => {
		return (str) => str.replace(m, '');
	})(/<\s*\/?\s*(\w+|!)[^>]*>/gi),

	htmlspecialchars = ((de,se,gt,lt,sq,dq) => {
		return (str, quote_style, double_encode) => {
			str = (''+str)
				.replace((!defined(double_encode)||double_encode)?de:se,'&amp;')
				.replace(gt,'&lt;')
				.replace(lt,'&gt;');
			if (!is_number(quote_style)) { quote_style = 2; }
			if (quote_style & 1) { str = str.replace(sq,'&#039;'); }
			return (quote_style & 2) ? str.replace(dq,'&quot;') : str;
		};
	})(/&/g,/&(?![\w#]+;)/gi,/</g,/>/g,/'/g,/"/g),
*/
	htmlre = /[&<>"']/g,
	htmlmap = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;'
	};

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
	clearHtml = (html, contentLocationUrls) => {
		const debug = false, // Config()->Get('debug', 'enable', false);
			useProxy = !!SettingsGet('UseLocalProxyForExternalImages'),
			detectHiddenImages = true, // !!SettingsGet('try_to_detect_hidden_images'),

			result = {
				hasExternals: false,
				foundCIDs: [],
				foundContentLocationUrls: []
			},

			tpl = document.createElement('template');
		tpl.innerHTML = html
			.replace(/(<pre[^>]*>)([\s\S]*?)(<\/pre>)/gi, aMatches => {
				return (aMatches[1] + aMatches[2].trim() + aMatches[3].trim()).replace(/\r?\n/g, '<br>');
			})
			// \MailSo\Base\HtmlUtils::ClearComments()
			.replace(/<!--[\s\S]*?-->/g, '')
			// \MailSo\Base\HtmlUtils::ClearTags()
			// eslint-disable-next-line max-len
			.replace(/<\/?(link|form|center|base|meta|bgsound|keygen|source|object|embed|applet|mocha|i?frame|frameset|video|audio|area|map)(\s[\s\S]*?)?>/gi, '')
			// GetDomFromText
			.replace('<o:p></o:p>', '')
			.replace('<o:p>', '<span>')
			.replace('</o:p>', '</span>')
			// https://github.com/the-djmaze/snappymail/issues/187
			.replace(/<a[^>]*>(((?!<\/a).)+<a\\s)/gi, '$1')
			// \MailSo\Base\HtmlUtils::ClearFastTags
			.replace(/<p[^>]*><\/p>/i, '')
			.replace(/<!doctype[^>]*>/i, '')
			.replace(/<\?xml [^>]*\?>/i, '')
			.trim();
		html = '';

		// convert body attributes to CSS
		const tasks = {
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
		};

//		if (static::Config()->Get('labs', 'strict_html_parser', true))
		let allowedAttributes = [
			// defaults
			'name',
			'dir', 'lang', 'style', 'title',
			'background', 'bgcolor', 'alt', 'height', 'width', 'src', 'href',
			'border', 'bordercolor', 'charset', 'direction', 'language',
			// a
			'coords', 'download', 'hreflang', 'shape',
			// body
			'alink', 'bgproperties', 'bottommargin', 'leftmargin', 'link', 'rightmargin', 'text', 'topmargin', 'vlink',
			'marginwidth', 'marginheight', 'offset',
			// button,
			'disabled', 'type', 'value',
			// col
			'align', 'valign',
			// font
			'color', 'face', 'size',
			// form
			'novalidate',
			// hr
			'noshade',
			// img
			'hspace', 'sizes', 'srcset', 'vspace', 'usemap',
			// input, textarea
			'checked', 'max', 'min', 'maxlength', 'multiple', 'pattern', 'placeholder', 'readonly',
				'required', 'step', 'wrap',
			// label
			'for',
			// meter
			'low', 'high', 'optimum',
			// ol
			'reversed', 'start',
			// option
			'selected', 'label',
			// table
			'cols', 'rows', 'frame', 'rules', 'summary', 'cellpadding', 'cellspacing',
			// th
			'abbr', 'scope',
			// td
			'axis', 'colspan', 'rowspan', 'headers', 'nowrap'
		];

		let disallowedAttributes = [
			'id', 'class', 'contenteditable', 'designmode', 'formaction', 'manifest', 'action',
			'data-bind', 'data-reactid', 'xmlns', 'srcset',
			'fscommand', 'seeksegmenttime'
		];

		tpl.content.querySelectorAll('*').forEach(oElement => {
			const name = oElement.tagName.toUpperCase(),
				oStyle = oElement.style,
				getAttribute = name => oElement.hasAttribute(name) ? oElement.getAttribute(name).trim() : '';

			if (['HEAD','STYLE','SVG','SCRIPT','TITLE','INPUT','BUTTON','TEXTAREA','SELECT'].includes(name)
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

			if ('BODY' === name) {
				forEachObjectEntry(tasks, (name, cb) => {
					if (oElement.hasAttribute(name)) {
						cb(getAttribute(name), oElement);
						oElement.removeAttribute(name);
					}
				});
			}

			if ('TABLE' === name && oElement.hasAttribute('width')) {
				let value = getAttribute('width');
				oElement.removeAttribute('width');
				oStyle.maxWidth = value + (/^[0-9]+$/.test(value) ? 'px' : '');
				oStyle.removeProperty('width');
				oStyle.removeProperty('min-width');
			}

			const aAttrsForRemove = [];

			if (oElement.hasAttributes()) {
				let i = oElement.attributes.length;
				while (i--) {
					let sAttrName = oElement.attributes[i].name.toLowerCase();
					if (!allowedAttributes.includes(sAttrName)
					 || 'on' === sAttrName.slice(0, 2)
					 || 'form' === sAttrName.slice(0, 4)
//					 || 'data-' === sAttrName.slice(0, 5)
//					 || sAttrName.includes(':')
					 || disallowedAttributes.includes(sAttrName))
					{
						oElement.removeAttribute(sAttrName);
						aAttrsForRemove.push(sAttrName);
					}
				}
			}

			if (oElement.hasAttribute('href')) {
				let sHref = getAttribute('href');
				if (!/^([a-z]+):/i.test(sHref) && '//' !== sHref.slice(0, 2)) {
					oElement.setAttribute('data-x-broken-href', sHref);
					oElement.removeAttribute('href');
				}
				if ('A' === name) {
					oElement.setAttribute('rel', 'external nofollow noopener noreferrer');
				}
			}

			// SVG xlink:href
			/*
			if (oElement.hasAttribute('xlink:href')) {
				oElement.removeAttribute('xlink:href');
			}
			*/

			if ('A' === name) {
				oElement.setAttribute('tabindex', '-1');
				oElement.setAttribute('target', '_blank');
			}

			let skipStyle = false;
			if (oElement.hasAttribute('src')) {
				let sSrc = getAttribute('src');
				oElement.removeAttribute('src');

				if (detectHiddenImages
					&& 'IMG' === name
					&& (('' != getAttribute('height') && 2 > pInt(getAttribute('height')))
						|| ('' != getAttribute('width') && 2 > pInt(getAttribute('width')))
						|| [
							'email.microsoftemail.com/open',
							'github.com/notifications/beacon/',
							'mandrillapp.com/track/open',
							'list-manage.com/track/open'
						].filter(uri => sSrc.toLowerCase().includes(uri)).length
				)) {
					skipStyle = true;
					oElement.setAttribute('style', 'display:none');
					oElement.setAttribute('data-x-hidden-src', sSrc);
				}
				else if (contentLocationUrls[sSrc])
				{
					oElement.setAttribute('data-x-src-location', sSrc);
					result.foundContentLocationUrls.push(sSrc);
				}
				else if ('cid:' === sSrc.slice(0, 4))
				{
					oElement.setAttribute('data-x-src-cid', sSrc.slice(4));
					result.foundCIDs.push(sSrc.slice(4));
				}
				else if (/^https?:\/\//i.test(sSrc) || '//' === sSrc.slice(0, 2))
				{
					oElement.setAttribute('data-x-src', useProxy ? proxy(sSrc) : sSrc);
					result.hasExternals = true;
				}
				else if ('data:image/' === sSrc.slice(0, 11))
				{
					oElement.setAttribute('src', sSrc);
				}
				else
				{
					oElement.setAttribute('data-x-broken-src', sSrc);
				}
			}

			if (oElement.hasAttribute('background')) {
				let sBackground = getAttribute('background');
				if (sBackground) {
					oStyle.backgroundImage = 'url("' + sBackground + '")';
				}
				oElement.removeAttribute('background');
			}

			if (oElement.hasAttribute('bgcolor')) {
				let sBackgroundColor = getAttribute('bgcolor');
				if (sBackgroundColor) {
					oStyle.backgroundColor = sBackgroundColor;
				}
				oElement.removeAttribute('bgcolor');
			}

			if (!skipStyle) {
/*
				if ('fixed' === oStyle.position) {
					oStyle.position = 'absolute';
				}
*/
				oStyle.removeProperty('behavior');
				oStyle.removeProperty('cursor');

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
					oElement.setAttribute('data-x-style-cid', JSON.stringify(urls.cid));
				}
				if (urls.remote.length) {
					oElement.setAttribute('data-x-style-url', JSON.stringify(urls.remote));
				}
				if (urls.broken.length) {
					oElement.setAttribute('data-x-style-broken-urls', JSON.stringify(urls.broken));
				}
			}

			if (debug && aAttrsForRemove) {
				oElement.setAttribute('data-removed-attrs', aAttrsForRemove.join(', '));
			}
		});

//		return tpl.content.firstChild;
		result.html = tpl.innerHTML;
		return result;
	},

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

	/**
	 * @param {string} html
	 * @returns {string}
	 */
	htmlToPlain = html => {
		let pos = 0,
			limit = 800,
			iP1 = 0,
			iP2 = 0,
			iP3 = 0,
			text = '';

		const
			tpl = createElement('template'),

			convertBlockquote = (blockquoteText) => {
				blockquoteText = '> ' + blockquoteText.trim().replace(/\n/gm, '\n> ');
				return blockquoteText.replace(/(^|\n)([> ]+)/gm, (...args) =>
					args && 2 < args.length ? args[1] + args[2].replace(/[\s]/g, '').trim() + ' ' : ''
				);
			},

			convertDivs = (...args) => {
				let divText = 1 < args.length ? args[1].trim() : '';
				if (divText.length) {
					divText = '\n' + divText.replace(/<div[^>]*>([\s\S\r\n]*)<\/div>/gim, convertDivs).trim() + '\n';
				}

				return divText;
			},

			convertPre = (...args) =>
				1 < args.length
					? args[1]
							.toString()
							.replace(/[\n]/gm, '<br/>')
							.replace(/[\r]/gm, '')
					: '',
			fixAttibuteValue = (...args) => (1 < args.length ? args[1] + encodeHtml(args[2]) : ''),

			convertLinks = (...args) => (1 < args.length ? args[1].trim() : '');

		tpl.innerHTML = html
			.replace(/<p[^>]*><\/p>/gi, '')
			.replace(/<pre[^>]*>([\s\S\r\n\t]*)<\/pre>/gim, convertPre)
			.replace(/[\s]+/gm, ' ')
			.replace(/((?:href|data)\s?=\s?)("[^"]+?"|'[^']+?')/gim, fixAttibuteValue)
			.replace(/<br[^>]*>/gim, '\n')
			.replace(/<\/h[\d]>/gi, '\n')
			.replace(/<\/p>/gi, '\n\n')
			.replace(/<ul[^>]*>/gim, '\n')
			.replace(/<\/ul>/gi, '\n')
			.replace(/<li[^>]*>/gim, ' * ')
			.replace(/<\/li>/gi, '\n')
			.replace(/<\/td>/gi, '\n')
			.replace(/<\/tr>/gi, '\n')
			.replace(/<hr[^>]*>/gim, '\n_______________________________\n\n')
			.replace(/<div[^>]*>([\s\S\r\n]*)<\/div>/gim, convertDivs)
			.replace(/<blockquote[^>]*>/gim, '\n__bq__start__\n')
			.replace(/<\/blockquote>/gim, '\n__bq__end__\n')
			.replace(/<a [^>]*>([\s\S\r\n]*?)<\/a>/gim, convertLinks)
			.replace(/<\/div>/gi, '\n')
			.replace(/&nbsp;/gi, ' ')
			.replace(/&quot;/gi, '"')
			.replace(/<[^>]*>/gm, '');

		text = tpl.content.textContent;
		if (text) {
			text = text
			.replace(/\n[ \t]+/gm, '\n')
			.replace(/[\n]{3,}/gm, '\n\n')
			.replace(/&gt;/gi, '>')
			.replace(/&lt;/gi, '<')
			.replace(/&amp;/gi, '&')
			// wordwrap max line length 100
			.match(/.{1,100}(\s|$)|\S+?(\s|$)/g).join('\n');
		}

		while (0 < --limit) {
			iP1 = text.indexOf('__bq__start__', pos);
			if (0 > iP1) {
				break;
			}
			iP2 = text.indexOf('__bq__start__', iP1 + 5);
			iP3 = text.indexOf('__bq__end__', iP1 + 5);

			if ((-1 === iP2 || iP3 < iP2) && iP1 < iP3) {
				text = text.slice(0, iP1) + convertBlockquote(text.slice(iP1 + 13, iP3)) + text.slice(iP3 + 11);
				pos = 0;
			} else if (-1 < iP2 && iP2 < iP3) {
				pos = iP2 - 1;
			} else {
				pos = 0;
			}
		}

		return text.replace(/__bq__start__|__bq__end__/gm, '').trim();
	},

	/**
	 * @param {string} plain
	 * @param {boolean} findEmailAndLinksInText = false
	 * @returns {string}
	 */
	plainToHtml = plain => {
		plain = plain.toString().replace(/\r/g, '');
		plain = plain.replace(/^>[> ]>+/gm, ([match]) => (match ? match.replace(/[ ]+/g, '') : match));

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
			.replace(/~~~blockquote~~~[\s]*/g, '<blockquote>')
			.replace(/[\s]*~~~\/blockquote~~~/g, '</blockquote>')
			.replace(/\n/g, '<br/>');
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
	getData(wrapIsHtml = false) {
		let result = '';
		if (this.editor) {
			try {
				if (this.isPlain() && this.editor.plugins.plain && this.editor.__plain) {
					result = this.editor.__plain.getRawData();
				} else {
					result = wrapIsHtml
						? '<div data-html-editor-font-wrapper="true" style="font-family: arial, sans-serif; font-size: 13px;">' +
						  this.editor.getData() +
						  '</div>'
						: this.editor.getData();
				}
			} catch (e) {} // eslint-disable-line no-empty
		}

		return result;
	}

	/**
	 * @param {boolean=} wrapIsHtml = false
	 * @returns {string}
	 */
	getDataWithHtmlMark(wrapIsHtml = false) {
		return (this.isHtml() ? ':HTML:' : '') + this.getData(wrapIsHtml);
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
