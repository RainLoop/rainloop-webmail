import { createElement } from 'Common/Globals';
import { forEachObjectEntry, isArray, pInt } from 'Common/Utils';
import { SettingsUserStore } from 'Stores/User/Settings';

const
	tmpl = createElement('template'),
	htmlre = /[&<>"']/g,
	httpre = /^(https?:)?\/\//i,
	htmlmap = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#x27;'
	},

	disallowedTags = [
		'svg','script','title','link','base','meta',
		'input','output','select','button','textarea',
		'bgsound','keygen','source','object','embed','applet','iframe','frame','frameset','video','audio','area','map'
		// not supported by <template> element
//		,'html','head','body'
	].join(','),

	blockquoteSwitcher = () => {
		SettingsUserStore.collapseBlockquotes() &&
//		tmpl.content.querySelectorAll('blockquote').forEach(node => {
		[...tmpl.content.querySelectorAll('blockquote')].reverse().forEach(node => {
			const el = createElement('details', {class:'sm-bq-switcher'});
			el.innerHTML = '<summary>•••</summary>';
			node.replaceWith(el);
			el.append(node);
		});
	},

	replaceWithChildren = node => node.replaceWith(...[...node.childNodes]),

	urlRegExp = /https?:\/\/[^\p{C}\p{Z}]+[^\p{C}\p{Z}.]/gu,
	// eslint-disable-next-line max-len
	email = /(^|\r|\n|\p{C}\p{Z})((?:[^"(),.:;<>@[\]\\\p{C}\p{Z}]+(?:\.[^"(),.:;<>@[\]\\\p{C}\p{Z}]+)*|"(?:\\?[^"\\\p{C}\p{Z}])*")@[^@\p{C}\p{Z}]+[^@\p{C}\p{Z}.])/gui,
	// rfc3966
	tel = /(tel:(\+[0-9().-]+|[0-9*#().-]+(;phone-context=\+[0-9+().-]+)?))/g,

	// Strip tracking
	/** TODO: implement other url strippers like from
	 * https://www.bleepingcomputer.com/news/security/new-firefox-privacy-feature-strips-urls-of-tracking-parameters/
	 * https://github.com/newhouse/url-tracking-stripper
	 * https://github.com/svenjacobs/leon
	 * https://maxchadwick.xyz/tracking-query-params-registry/
	 * https://github.com/M66B/FairEmail/blob/master/app/src/main/java/eu/faircode/email/UriHelper.java
	 */
	// eslint-disable-next-line max-len
	stripParams = /^(utm_|ec_|fbclid|mc_eid|mkt_tok|_hsenc|vero_id|oly_enc_id|oly_anon_id|__s|Referrer|mailing|elq|bch|trc|ref|correlation_id|pd_|pf_|email_hash)$/i,
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
	},

	cleanCSS = source =>
		source.trim().replace(/(^|;)\s*-(ms|webkit)-[^;]+(;|$)/g, '')
			.replace(/white-space[^;]+(;|$)/g, '')
			// Drop Microsoft Office style properties
//			.replace(/mso-[^:;]+:[^;]+/gi, '')
	,

	/*
		Parses given css string, and returns css object
		keys as selectors and values are css rules
		eliminates all css comments before parsing

		@param source css string to be parsed

		@return object css
	*/
	parseCSS = source => {
		const css = [];
		css.toString = () => css.reduce(
			(ret, tmp) =>
				ret + tmp.selector + ' {\n'
					+ (tmp.type === 'media' ? tmp.subStyles.toString() : tmp.rules)
					+ '}\n'
			,
			''
		);
		/**
		 * Given css array, parses it and then for every selector,
		 * prepends namespace to prevent css collision issues
		 */
		css.applyNamespace = namespace => css.forEach(obj => {
			if (obj.type === 'media') {
				obj.subStyles.applyNamespace(namespace);
			} else {
				obj.selector = obj.selector.split(',').map(selector =>
					(namespace + ' .mail-body ' + selector.replace(/\./g, '.msg-'))
					.replace(/\sbody/gi, '')
				).join(',');
			}
		});

		if (source) {
			source = source
				// strip comments
				.replace(/\/\*[\s\S]*?\*\/|<!--|-->/gi, '')
				// strip import statements
				.replace(/@import .*?;/gi , '')
				// strip keyframe statements
				.replace(/((@.*?keyframes [\s\S]*?){([\s\S]*?}\s*?)})/gi, '');

			// unified regex to match css & media queries together
			let unified = /((\s*?(?:\/\*[\s\S]*?\*\/)?\s*?@media[\s\S]*?){([\s\S]*?)}\s*?})|(([\s\S]*?){([\s\S]*?)})/gi,
				arr;

			while (true) {
				arr = unified.exec(source);
				if (arr === null) {
					break;
				}

				let selector = arr[arr[2] === undefined ? 5 : 2].split('\r\n').join('\n').trim()
					// Never have more than a single line break in a row
					.replace(/\n+/, "\n")
					// Remove :root and html
					.split(/\s+/g).map(item => item.replace(/^(:root|html)$/, '')).join(' ').trim();

				// determine the type
				if (selector.includes('@media')) {
					// we have a media query
					css.push({
						selector: selector,
						type: 'media',
						subStyles: parseCSS(arr[3] + '\n}') //recursively parse media query inner css
					});
				} else if (selector && !selector.includes('@')) {
					// we have standard css
					css.push({
						selector: selector,
						rules: cleanCSS(arr[6])
					});
				}
			}
		}

		return css;
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
	cleanHtml = (html, oAttachments, msgId) => {
		let aColor;
		const
			debug = false, // Config()->Get('debug', 'enable', false);
			detectHiddenImages = true, // !!SettingsGet('try_to_detect_hidden_images'),

			bqLevel = parseInt(SettingsUserStore.maxBlockquotesLevel()),

			result = {
				hasExternals: false,
				tracking: false,
				linkedData: []
			},

			findAttachmentByCid = cId => oAttachments.findByCid(cId),
			findLocationByCid = cId => {
				const attachment = findAttachmentByCid(cId);
				return attachment?.contentLocation ? attachment : 0;
			},

			// convert body attributes to CSS
			tasks = {
				link: value => aColor = value,
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
			nonEmptyTags = [
				'A','B','EM','I','SPAN','STRONG'
			];

		if (SettingsUserStore.allowStyles()) {
			allowedAttributes.push('class');
		} else {
			msgId = 0;
		}

		tmpl.innerHTML = html
//			.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, pre => pre.replace(/\n/g, '\n<br>'))
			// Not supported by <template> element
//			.replace(/<!doctype[^>]*>/gi, '')
//			.replace(/<\?xml[^>]*\?>/gi, '')
			.replace(/<(\/?)head(\s[^>]*)?>/gi, '')
			.replace(/<(\/?)body(\s[^>]*)?>/gi, '<$1div class="mail-body"$2>')
//			.replace(/<\/?(html|head)[^>]*>/gi, '')
			// Fix Reddit https://github.com/the-djmaze/snappymail/issues/540
			.replace(/<span class="preview-text"[\s\S]+?<\/span>/, '')
			// https://github.com/the-djmaze/snappymail/issues/900
			.replace(/\u2028/g,' ')
			// https://github.com/the-djmaze/snappymail/issues/1415
			.replace(/<br>\s*<\/p>/gi,'</p>')
			.trim();
		html = '';

		// Strip all comments
		const nodeIterator = document.createNodeIterator(tmpl.content, NodeFilter.SHOW_COMMENT);
		while (nodeIterator.nextNode()) {
			nodeIterator.referenceNode.remove();
		}

		/**
		 * Basic support for Linked Data (Structured Email)
		 * https://json-ld.org/
		 * https://structured.email/
		 **/
		tmpl.content.querySelectorAll('script[type="application/ld+json"]').forEach(oElement => {
			// Could be array of objects or single object
			try {
				const data = JSON.parse(oElement.textContent);
				(isArray(data) ? data : [data]).forEach(entry => result.linkedData.push(entry));
			} catch (e) {
				console.error(e, oElement.textContent);
			}
		});

		tmpl.content.querySelectorAll(
			disallowedTags
			+ (0 < bqLevel ? ',' + (new Array(1 + bqLevel).fill('blockquote').join(' ')) : '')
		).forEach(oElement => oElement.remove());

		// https://github.com/the-djmaze/snappymail/issues/1125
		tmpl.content.querySelectorAll('form,button').forEach(oElement => replaceWithChildren(oElement));

		[...tmpl.content.querySelectorAll('*')].forEach(oElement => {
			const name = oElement.tagName,
				oStyle = oElement.style;

			if ('STYLE' === name) {
				let css = msgId ? parseCSS(oElement.textContent) : [];
				if (css.length) {
					css.applyNamespace(msgId);
					css = css.toString();
					if (SettingsUserStore.removeColors()) {
						css = css.replace(/(background-)?color:[^};]+;?/g, '');
					}
					oElement.textContent = css;
				} else {
					oElement.remove();
				}
				return;
			}

			// \MailSo\Base\HtmlUtils::ClearTags()
			if ('none' == oStyle.display
			 || 'hidden' == oStyle.visibility
//			 || (oStyle.lineHeight && 1 > parseFloat(oStyle.lineHeight)
//			 || (oStyle.maxHeight && 1 > parseFloat(oStyle.maxHeight)
//			 || (oStyle.maxWidth && 1 > parseFloat(oStyle.maxWidth)
//			 || ('0' === oStyle.opacity
			) {
				oElement.remove();
				return;
			}

			const aAttrsForRemove = [],
				className = oElement.className,
				hasAttribute = name => oElement.hasAttribute(name),
				getAttribute = name => hasAttribute(name) ? oElement.getAttribute(name).trim() : '',
				setAttribute = (name, value) => oElement.setAttribute(name, value),
				delAttribute = name => {
					let value = getAttribute(name);
					oElement.removeAttribute(name);
					return value;
				};

			if ('mail-body' === className) {
				forEachObjectEntry(tasks, (name, cb) =>
					hasAttribute(name) && cb(delAttribute(name), oElement)
				);
			} else if (msgId && className) {
				oElement.className = className.replace(/(^|\s+)/g, '$1msg-');
			}

			if (oElement.hasAttributes()) {
				let i = oElement.attributes.length;
				while (i--) {
					let sAttrName = oElement.attributes[i].name.toLowerCase();
					if (!allowedAttributes.includes(sAttrName) && ('class' !== sAttrName || 'mail-body' !== className)) {
						delAttribute(sAttrName);
						aAttrsForRemove.push(sAttrName);
					}
				}
			}

			let value;

//			if ('TABLE' === name || 'TD' === name || 'TH' === name) {
			if (!oStyle.backgroundImage) {
				if ('TD' !== name && 'TH' !== name) {
					['width','height'].forEach(key => {
						if (hasAttribute(key)) {
							value = delAttribute(key);
							oStyle[key] || (oStyle[key] = value.includes('%') ? value : value + 'px');
						}
					});
					// Make width responsive
					value = oStyle.width;
					if (100 < parseInt(value,10) && !oStyle.maxWidth) {
						oStyle.maxWidth = value;
						oStyle.width = '100%';
					}
					// Make height responsive
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
					setAttribute('data-x-href-broken', value);
					delAttribute('href');
				} else {
					oElement.href = stripTracking(value);
					if (oElement.href != value) {
						result.tracking = true;
						setAttribute('data-x-href-tracking', value);
					}
					setAttribute('target', '_blank');
//					setAttribute('rel', 'external nofollow noopener noreferrer');
				}
				setAttribute('tabindex', '-1');
				aColor && !oElement.style.color && (oElement.style.color = aColor);
			}

//			if (['CENTER','FORM'].includes(name)) {
			if ('O:P' === name || (nonEmptyTags.includes(name) && ('' == oElement.textContent.trim()))) {
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
			value = delAttribute('src');
			if (value) {
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
//						result.tracking = true;
					}
					else if (httpre.test(value))
					{
						let src = stripTracking(value);
						if (src != value) {
							result.tracking = true;
							setAttribute('data-x-src-tracking', value);
						}
						setAttribute('data-x-src', src);
						result.hasExternals = true;
						oElement.alt || (oElement.alt = src.replace(/^.+\/([^/?]+).*$/, '$1').slice(-20));
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
				oStyle.backgroundImage = 'url("' + delAttribute('background') + '")';
			}

			if (hasAttribute('bgcolor')) {
				oStyle.backgroundColor = delAttribute('bgcolor');
			}

			if (hasAttribute('color')) {
				oStyle.color = delAttribute('color');
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
/*
				// https://github.com/the-djmaze/snappymail/issues/1082
				if (11 > pInt(oStyle.fontSize)) {
					oStyle.removeProperty('font-size');
				}
*/
				// Removes background and color
				// Many e-mails incorrectly only define one, not both
				// And in dark theme mode this kills the readability
				if (SettingsUserStore.removeColors()) {
					oStyle.removeProperty('background-color');
					oStyle.removeProperty('background-image');
					oStyle.removeProperty('color');
				}

				oStyle.cssText && (oStyle.cssText = cleanCSS(oStyle.cssText));
			}

			if (debug && aAttrsForRemove.length) {
				setAttribute('data-removed-attrs', aAttrsForRemove.join(', '));
			}
		});

		blockquoteSwitcher();

//		return tmpl.content.firstChild;
		result.html = tmpl.innerHTML.trim();
		return result;
	},

	/**
	 * @param {string} html
	 * @returns {string}
	 */
	htmlToPlain = html => {
		const
			hr = '⎯'.repeat(64),
			forEach = (selector, fn) => tmpl.content.querySelectorAll(selector).forEach(fn),
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

		tmpl.innerHTML = html
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
		tmpl.innerHTML = tmpl.innerHTML
			.replace(/\n{3,}/gm, '\n\n')
			.replace(/\n<br[^>]*>/g, '\n')
			.replace(/<br[^>]*>\n/g, '\n');
		forEach('br', br => br.replaceWith('\n'));

		// Blockquotes must be last
		blockquotes(tmpl.content);

		return (tmpl.content.textContent || '').trim();
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

		tmpl.innerHTML = aText.join('\n')
			// .replace(/~~~\/blockquote~~~\n~~~blockquote~~~/g, '\n')
			.replace(/&/g, '&amp;')
			.replace(/>/g, '&gt;')
			.replace(/</g, '&lt;')
			.replace(urlRegExp, (...m) => {
				m[0] = stripTracking(m[0]);
				return `<a href="${m[0]}" target="_blank">${m[0]}</a>`;
			})
			.replace(email, '$1<a href="mailto:$2">$2</a>')
			.replace(tel, '<a href="$1">$1</a>')
			.replace(/~~~blockquote~~~\s*/g, '<blockquote>')
			.replace(/\s*~~~\/blockquote~~~/g, '</blockquote>')
			.replace(/\n/g, '<br>');
		blockquoteSwitcher();
		return tmpl.innerHTML.trim();
	};

rl.Utils = {
	htmlToPlain: htmlToPlain,
	plainToHtml: plainToHtml
};
