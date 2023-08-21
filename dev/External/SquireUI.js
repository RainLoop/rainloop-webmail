/* eslint max-len: 0 */

(doc => {

const
	removeElements = 'HEAD,LINK,META,NOSCRIPT,SCRIPT,TEMPLATE,TITLE',
	allowedElements = 'A,B,BLOCKQUOTE,BR,DIV,FONT,H1,H2,H3,H4,H5,H6,HR,IMG,LI,OL,P,SPAN,STRONG,TABLE,TD,TH,TR,U,UL',
	allowedAttributes = 'abbr,align,background,bgcolor,border,cellpadding,cellspacing,class,color,colspan,dir,face,frame,height,href,hspace,id,lang,rowspan,rules,scope,size,src,style,target,type,usemap,valign,vspace,width'.split(','),

	i18n = (str, def) => rl.i18n(str) || def,

	ctrlKey = shortcuts.getMetaKey() + ' + ',

	createElement = name => doc.createElement(name),

	tpl = createElement('template'),

	trimLines = html => html.trim().replace(/^(<div>\s*<br\s*\/?>\s*<\/div>)+/, '').trim(),
	htmlToPlain = html => rl.Utils.htmlToPlain(html).trim(),
	plainToHtml = text => rl.Utils.plainToHtml(text),

	forEachObjectValue = (obj, fn) => Object.values(obj).forEach(fn),

	getFragmentOfChildren = parent => {
		let frag = doc.createDocumentFragment();
		frag.append(...parent.childNodes);
		return frag;
	},

	SquireDefaultConfig = {
/*
		addLinks: true // allow_smart_html_links
*/
		sanitizeToDOMFragment: (html, isPaste/*, squire*/) => {
			tpl.innerHTML = (html||'')
				.replace(/<\/?(BODY|HTML)[^>]*>/gi,'')
				.replace(/<!--[^>]+-->/g,'')
				.replace(/<span[^>]*>\s*<\/span>/gi,'')
				.trim();
			tpl.querySelectorAll('a:empty,span:empty').forEach(el => el.remove());
			if (isPaste) {
				tpl.querySelectorAll(removeElements).forEach(el => el.remove());
				tpl.querySelectorAll('*').forEach(el => {
					if (!el.matches(allowedElements)) {
						el.replaceWith(getFragmentOfChildren(el));
					} else if (el.hasAttributes()) {
						[...el.attributes].forEach(attr => {
							let name = attr.name.toLowerCase();
							if (!allowedAttributes.includes(name)) {
								el.removeAttribute(name);
							}
						});
					}
				});
			}
			return tpl.content;
		}
	};

class SquireUI
{
	constructor(container) {
		const
			clr = createElement('input'),
			doClr = name => input => {
				// https://github.com/the-djmaze/snappymail/issues/826
				clr.style.left = (input.offsetLeft + input.parentNode.offsetLeft) + 'px';
				clr.style.width = input.offsetWidth + 'px';

				clr.value = '';
				clr.onchange = () => squire.setStyle({[name]:clr.value});
				// Chrome 110+ https://github.com/the-djmaze/snappymail/issues/1199
//				clr.oninput = () => squire.setStyle({[name]:clr.value});
				setTimeout(()=>clr.click(),1);
			},

			actions = {
				mode: {
					plain: {
//						html: '〈〉',
//						cmd: () => this.setMode('plain' == this.mode ? 'wysiwyg' : 'plain'),
						select: [
							[i18n('SETTINGS_GENERAL/EDITOR_HTML'),'wysiwyg'],
							[i18n('SETTINGS_GENERAL/EDITOR_PLAIN'),'plain']
						],
						cmd: s => this.setMode('plain' == s.value ? 'plain' : 'wysiwyg')
					}
				},
				font: {
					fontFamily: {
						select: {
							'sans-serif': {
								Arial: "'Nimbus Sans L', 'Liberation sans', 'Arial Unicode MS', Arial, Helvetica, Garuda, Utkal, FreeSans, sans-serif",
								Tahoma: "'Luxi Sans', Tahoma, Loma, Geneva, Meera, sans-serif",
								Trebuchet: "'DejaVu Sans Condensed', Trebuchet, 'Trebuchet MS', sans-serif",
								Lucida: "'Lucida Sans Unicode', 'Lucida Sans', 'DejaVu Sans', 'Bitstream Vera Sans', 'DejaVu LGC Sans', sans-serif",
								Verdana: "'DejaVu Sans', Verdana, Geneva, 'Bitstream Vera Sans', 'DejaVu LGC Sans', sans-serif"
							},
							monospace: {
								Courier: "'Liberation Mono', 'Courier New', FreeMono, Courier, monospace",
								Lucida: "'DejaVu Sans Mono', 'DejaVu LGC Sans Mono', 'Bitstream Vera Sans Mono', 'Lucida Console', Monaco, monospace"
							},
							sans: {
								Times: "'Nimbus Roman No9 L', 'Times New Roman', Times, FreeSerif, serif",
								Palatino: "'Bitstream Charter', 'Palatino Linotype', Palatino, Palladio, 'URW Palladio L', 'Book Antiqua', Times, serif",
								Georgia: "'URW Palladio L', Georgia, Times, serif"
							}
						},
						cmd: s => squire.setStyle({ fontFamily: s.value })
					},
					fontSize: {
						select: ['11px','13px','16px','20px','24px','30px'],
						defaultValueIndex: 2,
						cmd: s => squire.setStyle({ fontSize: s.value })
						// TODO: maybe consider using https://developer.mozilla.org/en-US/docs/Web/CSS/font-size#values
						// example:
						// select: ['xx-small', 'x-small',' small',' medium', 'large', 'x-large', 'xx-large', 'xxx-large'],
						// defaultValueIndex: 3,
					},
// 					dir: {
// 						select: [
// 							[i18n('EDITOR/DIR_LTR', 'LTR'),'ltr'],
// 							[i18n('EDITOR/DIR_RTL', 'RTL'),'rtl'],
// 							[i18n('EDITOR/DIR_AUTO', 'Auto'),'auto'],
// 							['',''],
// 						],
// 						cmd: s => {
// 							squire.setAttribute('dir', s.value || null);
// //							squire.setStyle({ 'unicode-bidi': 'plaintext' });
// 						}
// 					}
				},
				dir: {
					dir_ltr: {
						html: '⁋',
						cmd: () => squire.bidi('ltr')
					},
					dir_rtl: {
						html: '¶',
						cmd: () => squire.bidi('rtl')
					}
				},
				colors: {
					textColor: {
						html: 'A<sub>▾</sub>',
						cmd: doClr('color')
					},
					backgroundColor: {
						html: '🎨', /* ▧ */
						cmd: doClr('backgroundColor')
					},
				},
				inline: {
					bold: {
						html: 'B',
						cmd: () => this.doAction('bold'),
						key: 'B',
						matches: 'B,STRONT'
					},
					italic: {
						html: 'I',
						cmd: () => this.doAction('italic'),
						key: 'I',
						matches: 'I'
					},
					underline: {
						html: '<u>U</u>',
						cmd: () => this.doAction('underline'),
						key: 'U',
						matches: 'U'
					},
					strike: {
						html: '<s>S</s>',
						cmd: () => this.doAction('strikethrough'),
						key: 'Shift + 7',
						matches: 'S'
					},
					sub: {
						html: 'Xₙ',
						cmd: () => this.doAction('subscript'),
						key: 'Shift + 5',
						matches: 'SUB'
					},
					sup: {
						html: 'Xⁿ',
						cmd: () => this.doAction('superscript'),
						key: 'Shift + 6',
						matches: 'SUP'
					}
				},
				block: {
					ol: {
						html: '#',
						cmd: () => this.doList('OL'),
						key: 'Shift + 8',
						matches: 'OL'
					},
					ul: {
						html: '⋮',
						cmd: () => this.doList('UL'),
						key: 'Shift + 9',
						matches: 'UL'
					},
					quote: {
						html: '"',
						cmd: () => {
							let parent = squire.getSelectionClosest('UL,OL,BLOCKQUOTE')?.nodeName;
							('BLOCKQUOTE' == parent) ? squire.decreaseQuoteLevel() : squire.increaseQuoteLevel();
						},
						matches: 'BLOCKQUOTE'
					},
					indentDecrease: {
						html: '⇤',
						cmd: () => squire.changeIndentationLevel('decrease'),
						key: ']'
					},
					indentIncrease: {
						html: '⇥',
						cmd: () => squire.changeIndentationLevel('increase'),
						key: '['
					}
				},
				targets: {
					link: {
						html: '🔗',
						cmd: () => {
							let node = squire.getSelectionClosest('A'),
								url = prompt("Link", node?.href || "https://");
							if (url != null) {
								url.length ? squire.makeLink(url) : (node && squire.removeLink());
							}
						},
						matches: 'A'
					},
					imageUrl: {
						html: '🖼️',
						cmd: () => {
							let node = squire.getSelectionClosest('IMG'),
								src = prompt("Image", node?.src || "https://");
							src?.length ? squire.insertImage(src) : (node && squire.detach(node));
						},
						matches: 'IMG'
					},
					imageUpload: {
						html: '📂️',
						cmd: () => browseImage.click(),
						matches: 'IMG'
					}
				},
/*
				table: {
					// TODO
				},
*/
				changes: {
					undo: {
						html: '↶',
						cmd: () => squire.undo(),
						key: 'Z'
					},
					redo: {
						html: '↷',
						cmd: () => squire.redo(),
						key: 'Y'
					},
					source: {
						html: '👁',
						cmd: btn => {
							this.setMode('source' == this.mode ? 'wysiwyg' : 'source');
							btn.classList.toggle('active', 'source' == this.mode);
						}
					}
				}
			},

			plain = createElement('textarea'),
			wysiwyg = createElement('div'),
			toolbar = createElement('div'),
			browseImage = createElement('input'),
			squire = new Squire(wysiwyg, SquireDefaultConfig);

		clr.type = 'color';
		toolbar.append(clr);

		browseImage.type = 'file';
		browseImage.accept = 'image/*';
		browseImage.style.display = 'none';
		browseImage.onchange = () => {
			if (browseImage.files.length) {
				let reader = new FileReader();
				reader.readAsDataURL(browseImage.files[0]);
				reader.onloadend = () => reader.result && squire.insertImage(reader.result);
			}
		}

		plain.className = 'squire-plain';
		wysiwyg.className = 'squire-wysiwyg';
		wysiwyg.dir = 'auto';
		this.mode = ''; // 'plain' | 'wysiwyg'
		this.__plain = {
			getRawData: () => this.plain.value,
			setRawData: plain => this.plain.value = plain
		};

		this.container = container;
		this.squire = squire;
		this.plain = plain;
		this.wysiwyg = wysiwyg;

		dispatchEvent(new CustomEvent('squire-toolbar', {detail:{squire:this,actions:actions}}));

		toolbar.className = 'squire-toolbar btn-toolbar';
		let group, action/*, touchTap*/;
		for (group in actions) {
			let toolgroup = createElement('div');
			toolgroup.className = 'btn-group';
			toolgroup.id = 'squire-toolgroup-'+group;
			for (action in actions[group]) {
				let cfg = actions[group][action], input, ev = 'click';
				if (cfg.input) {
					input = createElement('input');
					input.type = cfg.input;
					ev = 'change';
				} else if (cfg.select) {
					input = createElement('select');
					input.className = 'btn';
					if (Array.isArray(cfg.select)) {
						cfg.select.forEach(value => {
							value = Array.isArray(value) ? value : [value, value];
							var option = new Option(value[0], value[1]);
							option.style[action] = value[1];
							input.append(option);
						});
					} else {
						Object.entries(cfg.select).forEach(([label, options]) => {
							let group = createElement('optgroup');
							group.label = label;
							Object.entries(options).forEach(([text, value]) => {
								var option = new Option(text, value);
								option.style[action] = value;
								group.append(option);
							});
							input.append(group);
						});
					}
					ev = 'input';
				} else {
					input = createElement('button');
					input.type = 'button';
					input.className = 'btn';
					input.innerHTML = cfg.html;
					input.action_cmd = cfg.cmd;
/*
					input.addEventListener('pointerdown', () => touchTap = input, {passive:true});
					input.addEventListener('pointermove', () => touchTap = null, {passive:true});
					input.addEventListener('pointercancel', () => touchTap = null);
					input.addEventListener('pointerup', e => {
						if (touchTap === input) {
							e.preventDefault();
							cfg.cmd(input);
						}
						touchTap = null;
					});
*/
				}
				input.addEventListener(ev, () => cfg.cmd(input));
				cfg.hint = i18n('EDITOR/' + action.toUpperCase());
				if (cfg.hint) {
					input.title = cfg.key ? cfg.hint + ' (' + ctrlKey + cfg.key + ')' : cfg.hint;
				} else if (cfg.key) {
					input.title = ctrlKey + cfg.key;
				}
				input.dataset.action = action;
				input.tabIndex = -1;
				cfg.input = input;
				toolgroup.append(input);
			}
			toolgroup.children.length && toolbar.append(toolgroup);
		}

		this.modeSelect = actions.mode.plain.input;

		let changes = actions.changes;
		changes.undo.input.disabled = changes.redo.input.disabled = true;
		squire.addEventListener('undoStateChange', state => {
			changes.undo.input.disabled = !state.canUndo;
			changes.redo.input.disabled = !state.canRedo;
		});

		actions.font.fontSize.input.selectedIndex = actions.font.fontSize.defaultValueIndex;

//		squire.addEventListener('focus', () => shortcuts.off());
//		squire.addEventListener('blur', () => shortcuts.on());

		container.append(toolbar, wysiwyg, plain);

		/**
		 * @param {string} fontName
		 * @return {string}
		 */
		const normalizeFontName = (fontName) => fontName.trim().replace(/(^["']*|["']*$)/g, '').trim().toLowerCase();

		/** @type {string[]} - lower cased array of available font families*/
		const fontFamiliesLowerCase = Object.values(actions.font.fontFamily.input.options).map(option => option.value.toLowerCase());

		/**
		 * A theme might have CSS like div.squire-wysiwyg[contenteditable="true"] {
		 * font-family: 'Times New Roman', Times, serif; }
		 * so let's find the best match squire.getRoot()'s font
		 * it will also help to properly handle generic font names like 'sans-serif'
		 * @type {number}
		 */
		let defaultFontFamilyIndex = 0;
		const squireRootFonts = getComputedStyle(squire.getRoot()).fontFamily.split(',').map(normalizeFontName);
		fontFamiliesLowerCase.some((family, index) => {
			const matchFound = family.split(',').some(availableFontName => {
				const normalizedFontName = normalizeFontName(availableFontName);
				return squireRootFonts.some(squireFontName => squireFontName === normalizedFontName);
			});
			if (matchFound) {
				defaultFontFamilyIndex = index;
			}
			return matchFound;
		});

		/**
		 * Instead of comparing whole 'font-family' strings,
		 * we are going to look for individual font names, because we might be
		 * editing a Draft started in another email client for example
		 *
		 * @type {Object.<string,number>}
		 */
		const fontNamesMap = {};
		/**
		 * @param {string} fontFamily
		 * @param {number} index
		 */
		const processFontFamilyString = (fontFamily, index) => {
			fontFamily.split(',').forEach(fontName => {
				const key = normalizeFontName(fontName);
				if (fontNamesMap[key] === undefined) {
					fontNamesMap[key] = index;
				}
			});
		};
		// first deal with the default font family
		processFontFamilyString(fontFamiliesLowerCase[defaultFontFamilyIndex], defaultFontFamilyIndex);
		// and now with the rest of the font families
		fontFamiliesLowerCase.forEach((fontFamily, index) => {
			if (index !== defaultFontFamilyIndex) {
				processFontFamilyString(fontFamily, index);
			}
		});

		// -----

		squire.addEventListener('pathChange', e => {

			const squireRoot = squire.getRoot();

			forEachObjectValue(actions, entries => {
				forEachObjectValue(entries, cfg => {
//					cfg.matches && cfg.input.classList.toggle('active', e.element && e.element.matches(cfg.matches));
					cfg.matches && cfg.input.classList.toggle('active', e.element && e.element.closestWithin(cfg.matches, squireRoot));
				});
			});

			if (e.element) {
				// try to find font-family and/or font-size and set "select" elements' values

				let sizeSelectedIndex = actions.font.fontSize.defaultValueIndex;
				let familySelectedIndex = defaultFontFamilyIndex;

				let elm = e.element;
				let familyFound = false;
				let sizeFound = false;
				do {
					if (!familyFound && elm.style.fontFamily) {
						familyFound = true;
						familySelectedIndex = -1; // show empty select if we don't know the font
						const fontNames = elm.style.fontFamily.split(',');
						for (let i = 0; i < fontNames.length; i++) {
							const index = fontNamesMap[normalizeFontName(fontNames[i])];
							if (index !== undefined) {
								familySelectedIndex = index;
								break;
							}
						}
					}

					if (!sizeFound && elm.style.fontSize) {
						sizeFound = true;
						// -1 is ok because it will just show a black <select>
						sizeSelectedIndex = actions.font.fontSize.select.indexOf(elm.style.fontSize);
					}

					elm = elm.parentElement;
				} while ((!familyFound || !sizeFound) && elm && elm !== squireRoot);

				actions.font.fontFamily.input.selectedIndex = familySelectedIndex;
				actions.font.fontSize.input.selectedIndex = sizeSelectedIndex;
			}
		});
/*
		squire.addEventListener('cursor', e => {
			console.dir({cursor:e.range});
		});
		squire.addEventListener('select', e => {
			console.dir({select:e.range});
		});
*/

		// CKEditor gimmicks used by HtmlEditor
		this.plugins = {
			plain: true
		};
		this.focusManager = {
			hasFocus: () => squire._isFocused,
			blur: () => squire.blur()
		};
	}

	doAction(name) {
		this.squire[name]();
		this.squire.focus();
	}

	doList(type) {
		let parent = this.squire.getSelectionClosest('UL,OL')?.nodeName,
			fn = {UL:'makeUnorderedList',OL:'makeOrderedList'};
		(parent == type) ? this.squire.removeList() : this.squire[fn[type]]();
	}
/*
	testPresenceinSelection(format, validation) {
		return validation.test(this.squire.getPath()) || this.squire.hasFormat(format);
	}
*/
	setMode(mode) {
		if (this.mode != mode) {
			let cl = this.container.classList, source = 'source' == this.mode;
			cl.remove('squire-mode-'+this.mode);
			if ('plain' == mode) {
				this.plain.value = htmlToPlain(source ? this.plain.value : this.squire.getHTML(), true);
			} else if ('source' == mode) {
				this.plain.value = this.squire.getHTML();
			} else {
				this.setData(source ? this.plain.value : plainToHtml(this.plain.value, true));
				mode = 'wysiwyg';
			}
			this.mode = mode; // 'wysiwyg' or 'plain'
			cl.add('squire-mode-'+mode);
			this.onModeChange?.();
			setTimeout(()=>this.focus(),1);
		}
		this.modeSelect.selectedIndex = 'plain' == this.mode ? 1 : 0;
	}

	// CKeditor gimmicks used by HtmlEditor
	on(type, fn) {
		if ('mode' == type) {
			this.onModeChange = fn;
		} else {
			this.squire.addEventListener(type, fn);
			this.plain.addEventListener(type, fn);
		}
	}

	execCommand(cmd, cfg) {
		if ('insertSignature' == cmd) {
			cfg = Object.assign({
				clearCache: false,
				isHtml: false,
				insertBefore: false,
				signature: ''
			}, cfg);

			if (cfg.clearCache) {
				this._prev_txt_sig = null;
			} else try {
				const signature = cfg.isHtml ? htmlToPlain(cfg.signature) : cfg.signature;
				if ('plain' === this.mode) {
					let
						text = this.plain.value,
						prevSignature = this._prev_txt_sig;
					if (prevSignature) {
						text = text.replace(prevSignature, '').trim();
					}
					this.plain.value = cfg.insertBefore ? '\n\n' + signature + '\n\n' + text : text + '\n\n' +  signature;
				} else {
					const squire = this.squire,
						root = squire.getRoot(),
						br = createElement('br'),
						div = createElement('div');
					div.className = 'rl-signature';
					div.innerHTML = cfg.isHtml ? cfg.signature : plainToHtml(cfg.signature);
					root.querySelectorAll('div.rl-signature').forEach(node => node.remove());
					cfg.insertBefore ? root.prepend(div) : root.append(div);
					// Move cursor above signature
					div.before(br);
					div.before(br.cloneNode());
				}
				this._prev_txt_sig = signature;
			} catch (e) {
				console.error(e);
			}
		}
	}

	getData() {
		return 'source' == this.mode ? this.plain.value : trimLines(this.squire.getHTML());
	}

	setData(html) {
//		this.plain.value = html;
		const squire = this.squire;
		squire.setHTML(trimLines(html));
		const node = squire.getRoot(),
			range = squire.getSelection();
		range.setStart(node, 0);
		range.setEnd(node, 0);
		squire.setSelection( range );
	}

	focus() {
		if ('plain' == this.mode) {
			this.plain.focus();
			this.plain.setSelectionRange(0, 0);
		} else {
			this.squire.focus();
		}
	}
}

this.SquireUI = SquireUI;

})(document);
