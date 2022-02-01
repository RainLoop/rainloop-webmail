import { createElement } from 'Common/Globals';

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
	 * @param {string} text
	 * @returns {string}
	 */
	clearHtml = html => {
		html = html.replace(/(<pre[^>]*>)([\s\S]*?)(<\/pre>)/gi, aMatches => {
			return (aMatches[1] + aMatches[2].trim() + aMatches[3].trim()).replace(/\r?\n/g, '<br>');
		});
/*
		\MailSo\Base\HtmlUtils::ClearHtml(
			$sHtml, $bHasExternals, $aFoundCIDs, $aContentLocationUrls, $aFoundContentLocationUrls,
			$fAdditionalExternalFilter, !!$this->Config()->Get('labs', 'try_to_detect_hidden_images', false)
		);
*/
		return html;
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
