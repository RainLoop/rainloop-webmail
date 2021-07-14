/* eslint max-len: 0 */

(doc => {

const
	removeElements = 'HEAD,LINK,META,NOSCRIPT,SCRIPT,TEMPLATE,TITLE',
	allowedElements = 'A,B,BLOCKQUOTE,BR,DIV,FONT,H1,H2,H3,H4,H5,H6,HR,IMG,LI,OL,P,SPAN,STRONG,TABLE,TD,TH,TR,U,UL',
	allowedAttributes = 'abbr,align,background,bgcolor,border,cellpadding,cellspacing,class,color,colspan,dir,face,frame,height,href,hspace,id,lang,rowspan,rules,scope,size,src,style,target,type,usemap,valign,vspace,width'.split(','),

	i18n = (str, def) => rl.i18n(str) || def,

	ctrlKey = shortcuts.getMetaKey().replace('meta','⌘') + ' + ',

	tpl = doc.createElement('template'),
	clr = doc.createElement('input'),

	trimLines = html => html.trim().replace(/^(<div>\s*<br\s*\/?>\s*<\/div>)+/, '').trim(),
	clearHtmlLine = html => rl.Utils.htmlToPlain(html).trim(),

	getFragmentOfChildren = parent => {
		let frag = doc.createDocumentFragment();
		frag.append(...parent.childNodes);
		return frag;
	},

	SquireDefaultConfig = {
/*
		blockTag: 'P',
		undo: {
			documentSizeThreshold: -1, // -1 means no threshold
			undoLimit: -1 // -1 means no limit
		},
		addLinks: true // allow_smart_html_links
*/
		sanitizeToDOMFragment: (html, isPaste/*, squire*/) => {
			tpl.innerHTML = html
				.replace(/<\/?(BODY|HTML)[^>]*>/gi,'')
				.replace(/<!--[^>]+-->/g,'')
				.replace(/<span[^>]*>\s*<\/span>/gi,'')
				.trim();
			tpl.querySelectorAll('a:empty,span:empty').forEach(el => el.remove());
			tpl.querySelectorAll('[data-x-div-type]').forEach(el => el.replaceWith(getFragmentOfChildren(el)));
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
	},

	rl_signature_replacer = (editor, text, signature, isHtml, insertBefore) => {
		let
			prevSignature = editor.__previous_signature,
			skipInsert = false,
			isEmptyText = false;

		isEmptyText = !text.trim();
		if (!isEmptyText && isHtml) {
			isEmptyText = !clearHtmlLine(text);
		}

		if (prevSignature && !isEmptyText) {
			if (isHtml && !prevSignature.isHtml) {
				prevSignature = {
					body: rl.Utils.plainToHtml(prevSignature.body),
					isHtml: true
				};
			} else if (!isHtml && prevSignature.isHtml) {
				prevSignature = {
					body: rl.Utils.htmlToPlain(prevSignature.body),
					isHtml: true
				};
			}

			if (isHtml) {
				var clearSig = clearHtmlLine(prevSignature.body);
				text = text.replace(/<signature>([\s\S]*)<\/signature>/igm, all => {
					var c = clearSig === clearHtmlLine(all);
					if (!c) {
						skipInsert = true;
					}
					return c ? '' : all;
				});
			} else {
				var textLen = text.length;
				text = text
					.replace(prevSignature.body, '')
					.replace(prevSignature.body, '');
				skipInsert = textLen === text.length;
			}
		}

		if (!skipInsert) {
			signature = (isHtml ? '<br/><br/><signature>' : "\n\n") + signature + (isHtml ? '</signature>' : '');

			text = insertBefore ? signature + text : text + signature;

			if (10 < signature.length) {
				prevSignature = {
					body: signature,
					isHtml: isHtml
				};
			}
		}

		editor.__previous_signature = prevSignature;

		return text;
	};

clr.type = "color";
clr.style.display = 'none';
doc.body.append(clr);

class SquireUI
{
	constructor(container) {
		const
			doClr = fn => () => {
				clr.value = '';
				clr.onchange = () => squire[fn](clr.value);
				clr.click();
			},

			actions = {
				mode: {
					plain: {
						html: '〈〉',
						cmd: () => this.setMode('plain' == this.mode ? 'wysiwyg' : 'plain'),
						hint: i18n('EDITOR/TEXT_SWITCHER_PLAINT_TEXT', 'Plain')
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
						cmd: s => squire.setStyle({ fontSize: s.value })
					}
				},
				colors: {
					textColor: {
						html: 'A<sub>▾</sub>',
						cmd: doClr('setTextColor'),
						hint: 'Text color'
					},
					backgroundColor: {
						html: '🎨', /* ▧ */
						cmd: doClr('setBackgroundColor'),
						hint: 'Background color'
					},
				},
/*
				bidi: {
					bdoLtr: {
						html: '&lrm;𝐁',
						cmd: () => this.doAction('bold','B'),
						hint: 'Bold'
					},
					bdoRtl: {
						html: '&rlm;𝐁',
						cmd: () => this.doAction('bold','B'),
						hint: 'Bold'
					}
				},
*/
				inline: {
					bold: {
						html: 'B',
						cmd: () => this.doAction('bold'),
						key: 'B',
						hint: 'Bold'
					},
					italic: {
						html: 'I',
						cmd: () => this.doAction('italic'),
						key: 'I',
						hint: 'Italic'
					},
					underline: {
						html: '<u>U</u>',
						cmd: () => this.doAction('underline'),
						key: 'U',
						hint: 'Underline'
					},
					strike: {
						html: '<s>S</s>',
						cmd: () => this.doAction('strikethrough'),
						key: 'Shift + 7',
						hint: 'Strikethrough'
					},
					sub: {
						html: 'Xₙ',
						cmd: () => this.doAction('subscript'),
						key: 'Shift + 5',
						hint: 'Subscript'
					},
					sup: {
						html: 'Xⁿ',
						cmd: () => this.doAction('superscript'),
						key: 'Shift + 6',
						hint: 'Superscript'
					}
				},
				block: {
					ol: {
						html: '#',
						cmd: () => this.doList('OL'),
						key: 'Shift + 8',
						hint: 'Ordered list'
					},
					ul: {
						html: '⋮',
						cmd: () => this.doList('UL'),
						key: 'Shift + 9',
						hint: 'Unordered list'
					},
					quote: {
						html: '"',
						cmd: () => {
							let parent = this.getParentNodeName('UL,OL');
							(parent && 'BLOCKQUOTE' == parent) ? squire.decreaseQuoteLevel() : squire.increaseQuoteLevel();
						},
						hint: 'Blockquote'
					},
					indentDecrease: {
						html: '⇤',
						cmd: () => squire.changeIndentationLevel('decrease'),
						key: ']',
						hint: 'Decrease indent'
					},
					indentIncrease: {
						html: '⇥',
						cmd: () => squire.changeIndentationLevel('increase'),
						key: '[',
						hint: 'Increase indent'
					}
				},
				targets: {
					link: {
						html: '🔗',
						cmd: () => {
							if ('A' === this.getParentNodeName()) {
								squire.removeLink();
							} else {
								let url = prompt("Link","https://");
								url != null && url.length && squire.makeLink(url);
							}
						},
						hint: 'Link'
					},
					imageUrl: {
						html: '🖼️',
						cmd: () => {
							if ('IMG' === this.getParentNodeName()) {
//								squire.removeLink();
							} else {
								let src = prompt("Image","https://");
								src != null && src.length && squire.insertImage(src);
							}
						},
						hint: 'Image URL'
					},
					imageUpload: {
						html: '📂️',
						cmd: () => browseImage.click(),
						hint: 'Image select',
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
						key: 'Z',
						hint: 'Undo'
					},
					redo: {
						html: '↷',
						cmd: () => squire.redo(),
						key: 'Y',
						hint: 'Redo'
					}
				}
			},

			plain = doc.createElement('textarea'),
			wysiwyg = doc.createElement('div'),
			toolbar = doc.createElement('div'),
			browseImage = doc.createElement('input'),
			squire = new Squire(wysiwyg, SquireDefaultConfig);

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
		wysiwyg.className = 'squire-wysiwyg cke_editable';
		this.mode = ''; // 'plain' | 'wysiwyg'
		this.__plain = {
			getRawData: () => this.plain.value,
			setRawData: plain => this.plain.value = plain
		};

		this.container = container;
		this.squire = squire;
		this.plain = plain;
		this.wysiwyg = wysiwyg;

		toolbar.className = 'squire-toolbar btn-toolbar';
		let touchTap;
		for (let group in actions) {
			if ('bidi' == group && !rl.settings.app('allowHtmlEditorBitiButtons')) {
				continue;
			}
			let toolgroup = doc.createElement('div');
			toolgroup.className = 'btn-group';
			toolgroup.id = 'squire-toolgroup-'+group;
			for (let action in actions[group]) {
				if ('source' == action && !rl.settings.app('allowHtmlEditorSourceButton')) {
					continue;
				}
				let cfg = actions[group][action], input, ev = 'click';
				if (cfg.input) {
					input = doc.createElement('input');
					input.type = cfg.input;
					ev = 'change';
				} else if (cfg.select) {
					input = doc.createElement('select');
					input.className = 'btn';
					if (Array.isArray(cfg.select)) {
						cfg.select.forEach(value => {
							var option = new Option(value, value);
							option.style[action] = value;
							input.append(option);
						});
					} else {
						Object.entries(cfg.select).forEach(([label, options]) => {
							let group = doc.createElement('optgroup');
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
					input = doc.createElement('button');
					input.type = 'button';
					input.className = 'btn';
					input.innerHTML = cfg.html;
					input.action_cmd = cfg.cmd;
					input.addEventListener('touchstart', () => touchTap = input, {passive:true});
					input.addEventListener('touchmove', () => touchTap = null, {passive:true});
					input.addEventListener('touchcancel', () => touchTap = null);
					input.addEventListener('touchend', e => {
						if (touchTap === input) {
							e.preventDefault();
							cfg.cmd(input);
						}
						touchTap = null;
					});
				}
				input.addEventListener(ev, () => cfg.cmd(input));
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

		let changes = actions.changes;
		changes.undo.input.disabled = changes.redo.input.disabled = true;
		squire.addEventListener('undoStateChange', state => {
			changes.undo.input.disabled = !state.canUndo;
			changes.redo.input.disabled = !state.canRedo;
		});

		squire.addEventListener('focus', () => shortcuts.off());
		squire.addEventListener('blur', () => shortcuts.on());

		container.append(toolbar, wysiwyg, plain);

/*
		squire.addEventListener('dragover', );
		squire.addEventListener('drop', );
		squire.addEventListener('pathChange', );
		squire.addEventListener('cursor', );
		squire.addEventListener('select', );
		squire.addEventListener('input', );
		squire.addEventListener('willPaste', );
		squire.addEventListener( 'keydown keyup', monitorShiftKey )
		squire.addEventListener( 'keydown', onKey )
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

	getParentNodeName(selector) {
		let parent = this.squire.getSelectionClosest(selector);
		return parent ? parent.nodeName : null;
	}

	doList(type) {
		let parent = this.getParentNodeName('UL,OL'),
			fn = {UL:'makeUnorderedList',OL:'makeOrderedList'};
		(parent && parent == type) ? this.squire.removeList() : this.squire[fn[type]]();
	}

	testPresenceinSelection(format, validation) {
		return validation.test(this.squire.getPath()) || this.squire.hasFormat(format);
	}

	setMode(mode) {
		if (this.mode != mode) {
			let cl = this.container.classList;
			cl.remove('squire-mode-'+this.mode);
			if ('plain' == mode) {
				this.plain.value = rl.Utils.htmlToPlain(this.squire.getHTML(), true).trim();
			} else {
				this.setData(rl.Utils.plainToHtml(this.plain.value, true));
				mode = 'wysiwyg';
			}
			this.mode = mode; // 'wysiwyg' or 'plain'
			cl.add('squire-mode-'+mode);
			this.onModeChange && this.onModeChange();
			setTimeout(()=>this.focus(),1);
		}
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
				this.__previous_signature = null;
			} else try {
				if ('plain' === this.mode) {
					if (cfg.isHtml) {
						cfg.signature = rl.Utils.htmlToPlain(cfg.signature);
					}
					this.plain.value = rl_signature_replacer(this, this.plain.value, cfg.signature, false, cfg.insertBefore);
				} else {
					if (!cfg.isHtml) {
						cfg.signature = rl.Utils.plainToHtml(cfg.signature);
					}
					this.setData(rl_signature_replacer(this, this.getData(), cfg.signature, true, cfg.insertBefore));
				}
			} catch (e) {
				console.error(e);
			}
		}
	}

	getData() {
		return trimLines(this.squire.getHTML());
	}

	setData(html) {
//		this.plain.value = html;
		this.squire.setHTML(trimLines(html));
	}

	focus() {
		('plain' == this.mode ? this.plain : this.squire).focus();
	}

	resize(width, height) {
		height = Math.max(200, (height - this.wysiwyg.offsetTop)) + 'px';
		this.wysiwyg.style.height = height;
		this.plain.style.height = height;
	}
}

this.SquireUI = SquireUI;

})(document);
