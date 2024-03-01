/* eslint max-len: 0 */
(win => {

	addEventListener('rl-view-model.create', e => {
		if (e.detail.viewModelTemplateID === 'PopupsCompose') {
			// There is a better way to do this probably,
			// but we need this for drag and drop to work
			e.detail.attachmentsArea = e.detail.bodyArea;
		}
	});

	const doc = win.document;
	const rl = win.rl;

	const
		removeElements = 'HEAD,LINK,META,NOSCRIPT,SCRIPT,TEMPLATE,TITLE',
		allowedElements = 'A,B,BLOCKQUOTE,BR,DIV,EM,FONT,H1,H2,H3,H4,H5,H6,HR,I,IMG,LI,OL,P,SPAN,STRONG,TABLE,TD,TH,TR,U,UL',
		allowedAttributes = 'abbr,align,background,bgcolor,border,cellpadding,cellspacing,class,color,colspan,dir,face,frame,height,href,hspace,id,lang,rowspan,rules,scope,size,src,style,target,type,usemap,valign,vspace,width'.split(','),

		// TODO: labels translations
		i18n = (str, def) => rl.i18n(str) || def,

		ctrlKey = shortcuts.getMetaKey() + ' + ',

		createElement = name => doc.createElement(name),

		tpl = createElement('template'),

		trimLines = html => html.trim().replace(/^(<div>\s*<br\s*\/?>\s*<\/div>)+/, '').trim(),
		htmlToPlain = html => rl.Utils.htmlToPlain(html).trim(),
		plainToHtml = text => rl.Utils.plainToHtml(text),

		getFragmentOfChildren = parent => {
			let frag = doc.createDocumentFragment();
			frag.append(...parent.childNodes);
			return frag;
		},

		/**
		 * @param {Array} data
		 * @param {String} prop
		 */
		getByProp = (data, prop) => {
			for (let i = 0; i < data.length; i++) {
				const outer = data[i];
				if (outer.hasOwnProperty(prop)) {
					return outer;
				}
				if (outer.items && Array.isArray(outer.items)) {
					const item = outer.items.find(item => item.prop === prop);
					if (item) {
						return item;
					}
				}
			}
			throw new Error('item with prop ' + prop + ' not found');
		},

		SquireDefaultConfig = {
			/*
					addLinks: true // allow_smart_html_links
			*/
			sanitizeToDOMFragment: (html) => {
				tpl.innerHTML = (html || '')
					.replace(/<\/?(BODY|HTML)[^>]*>/gi, '')
					.replace(/<!--[^>]+-->/g, '')
					.replace(/<span[^>]*>\s*<\/span>/gi, '')
					.trim();
				tpl.querySelectorAll('a:empty,span:empty').forEach(el => el.remove());
				return tpl.content;
			}
		},

		pasteSanitizer = (event) => {
			const frag = event.detail.fragment;
			frag.querySelectorAll('a:empty,span:empty').forEach(el => el.remove());
			frag.querySelectorAll(removeElements).forEach(el => el.remove());
			frag.querySelectorAll('*').forEach(el => {
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
		},

		pasteImageHandler = (e, squire) => {

			const items = [...e.detail.clipboardData.items];
			const imageItems = items.filter((item) => /image/.test(item.type));
			if (!imageItems.length) {
				return false;
			}
			let reader = new FileReader();
			reader.onload = (loadEvent) => {
				squire.insertImage(loadEvent.target.result);
			};
			reader.readAsDataURL(imageItems[0].getAsFile());
		};


	class CompactComposer {
		constructor(container) {
			const
				plain = createElement('textarea'),
				wysiwyg = createElement('div'),
				toolbar = createElement('div'),
				squire = new win.Squire2(wysiwyg, SquireDefaultConfig);

			this.container = container;

			plain.className = 'squire-plain';
			wysiwyg.className = 'squire-wysiwyg';
			wysiwyg.dir = 'auto';
			this.mode = ''; // 'plain' | 'wysiwyg'
			this.squire = squire;
			this.plain = plain;
			this.wysiwyg = wysiwyg;
			this.toolbar = toolbar;

			toolbar.className = 'squire-toolbar btn-toolbar';
			const actions = this.#makeActions(squire, toolbar);

			this.squire.addEventListener('willPaste', pasteSanitizer);
			this.squire.addEventListener('pasteImage', (e) => {
				pasteImageHandler(e, squire);
			});

//		squire.addEventListener('focus', () => shortcuts.off());
//		squire.addEventListener('blur', () => shortcuts.on());

			container.append(toolbar, wysiwyg, plain);

			const fontFamilySelect = getByProp(actions, 'fontFamily').element;

			const fontSizeAction = getByProp(actions, 'fontSize');

			/**
			 * @param {string} fontName
			 * @return {string}
			 */
			const normalizeFontName = (fontName) => fontName.trim().replace(/(^["']*|["']*$)/g, '').trim().toLowerCase();

			/** @type {string[]} - lower cased array of available font families*/
			const fontFamiliesLowerCase = Object.values(fontFamilySelect.options).map(option => option.value.toLowerCase());

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

			let ignoreNextSelectEvent = false;

			squire.addEventListener('pathChange', e => {

				const tokensMap = this.buildTokensMap(e.detail);

				if (tokensMap.has('__selection__')) {
					ignoreNextSelectEvent = false;
					return;
				}
				this.indicators.forEach((indicator) => {
					indicator.element.classList.toggle('active', indicator.selectors.some(selector => tokensMap.has(selector)));
				});

				let familySelectedIndex = defaultFontFamilyIndex;
				const fontFamily = tokensMap.get('__font_family__');
				if (fontFamily) {
					familySelectedIndex = -1; // show empty select if we don't know the font
					const fontNames = fontFamily.split(',');
					for (let i = 0; i < fontNames.length; i++) {
						const index = fontNamesMap[normalizeFontName(fontNames[i])];
						if (index !== undefined) {
							familySelectedIndex = index;
							break;
						}
					}
				}
				fontFamilySelect.selectedIndex = familySelectedIndex;

				let sizeSelectedIndex = fontSizeAction.defaultValueIndex;
				const fontSize = tokensMap.get('__font_size__');
				if (fontSize) {
					// -1 is ok because it will just show a blank <select>
					sizeSelectedIndex = fontSizeAction.items.indexOf(fontSize);
				}
				fontSizeAction.element.selectedIndex = sizeSelectedIndex;

				ignoreNextSelectEvent = true;
			});

			squire.addEventListener('select', e => {
				if (ignoreNextSelectEvent) {
					ignoreNextSelectEvent = false;
					return;
				}

				if (e.detail.range.collapsed) {
					return;
				}

				this.indicators.forEach((indicator) => {
					indicator.element.classList.toggle('active', indicator.selectors.some(selector => squire.hasFormat(selector)));
				});
			});

			/*
					squire.addEventListener('cursor', e => {
						console.dir({cursor:e.range});
					});
					squire.addEventListener('select', e => {
						console.dir({select:e.range});
					});
			*/
		}

		/**
		 * @param {Squire} squire
		 * @param {HTMLDivElement} toolbar
		 * @returns {Array}
		 */
		#makeActions(squire, toolbar) {

			const clr = this.#makeClr();
			const doClr = name => input => {
				// https://github.com/the-djmaze/snappymail/issues/826
				clr.style.left = (input.offsetLeft + input.parentNode.offsetLeft) + 'px';
				clr.style.width = input.offsetWidth + 'px';

				clr.value = '';
				clr.onchange = () => {
					switch (name) {
						case 'color':
							squire.setTextColor(clr.value);
							break;
						case 'backgroundColor':
							squire.setHighlightColor(clr.value);
							break;
						default:
							console.error('invalid name:', name);
					}
				};
				// Chrome 110+ https://github.com/the-djmaze/snappymail/issues/1199
//				clr.oninput = () => squire.setStyle({[name]:clr.value});
				setTimeout(() => clr.click(), 1);
			};
			toolbar.append(clr);

			const browseImage = createElement('input');
			browseImage.type = 'file';
			browseImage.accept = 'image/*';
			browseImage.style.display = 'none';
			browseImage.onchange = () => {
				if (browseImage.files.length) {
					let reader = new FileReader();
					reader.readAsDataURL(browseImage.files[0]);
					reader.onloadend = () => reader.result && squire.insertImage(reader.result);
				}
			};

			const actions = [
				{
					type: 'group',
					items: [
						{
							type: 'select',
							label: 'Font',
							cmd: s => squire.setFontFace(s.value),
							prop: 'fontFamily',
							items: {
								'sans-serif': {
									Arial: '\'Nimbus Sans L\', \'Liberation sans\', \'Arial Unicode MS\', Arial, Helvetica, Garuda, Utkal, FreeSans, sans-serif',
									Tahoma: '\'Luxi Sans\', Tahoma, Loma, Geneva, Meera, sans-serif',
									Trebuchet: '\'DejaVu Sans Condensed\', Trebuchet, \'Trebuchet MS\', sans-serif',
									Lucida: '\'Lucida Sans Unicode\', \'Lucida Sans\', \'DejaVu Sans\', \'Bitstream Vera Sans\', \'DejaVu LGC Sans\', sans-serif',
									Verdana: '\'DejaVu Sans\', Verdana, Geneva, \'Bitstream Vera Sans\', \'DejaVu LGC Sans\', sans-serif'
								},
								monospace: {
									Courier: '\'Liberation Mono\', \'Courier New\', FreeMono, Courier, monospace',
									Lucida: '\'DejaVu Sans Mono\', \'DejaVu LGC Sans Mono\', \'Bitstream Vera Sans Mono\', \'Lucida Console\', Monaco, monospace'
								},
								sans: {
									Times: '\'Nimbus Roman No9 L\', \'Times New Roman\', Times, FreeSerif, serif',
									Palatino: '\'Bitstream Charter\', \'Palatino Linotype\', Palatino, Palladio, \'URW Palladio L\', \'Book Antiqua\', Times, serif',
									Georgia: '\'URW Palladio L\', Georgia, Times, serif'
								}
							}
						},
						{
							type: 'select',
							label: 'Font size',
							cmd: s => squire.setFontSize(s.value),
							prop: 'fontSize',
							items: ['11px', '13px', '16px', '20px', '24px', '30px'],
							defaultValueIndex: 2
						}
					]
				},
				{
					type: 'menu',
					label: 'Colors',
					icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m8 7.75c0.713 0 1.25-0.559 1.25-1.25 0-0.691-0.54-1.25-1.25-1.25-0.71 0-1.25 0.556-1.25 1.25 0 0.694 0.537 1.25 1.25 1.25zm6.5 3c0.713 0 1.25-0.559 1.25-1.25 0-0.691-0.54-1.25-1.25-1.25s-1.25 0.556-1.25 1.25c0 0.694 0.537 1.25 1.25 1.25zm-9 0c0.713 0 1.25-0.559 1.25-1.25 0-0.691-0.54-1.25-1.25-1.25s-1.25 0.556-1.25 1.25c0 0.694 0.537 1.25 1.25 1.25zm4.5 7.25c-4.47 0-8-3.63-8-8 0-4.81 3.97-8 8.17-8 4.12 0 7.83 3.02 7.83 7.21 0 2.83-2.2 4.79-4.79 4.79h-1.42c-0.277 0-0.417 0.2-0.417 0.375 0 0.208 0.104 0.382 0.312 0.521 0.208 0.139 0.312 0.507 0.312 1.1 0 1.09-0.858 2-2 2zm2-10.2c0.713 0 1.25-0.559 1.25-1.25s-0.54-1.25-1.25-1.25-1.25 0.556-1.25 1.25 0.537 1.25 1.25 1.25zm-2 8.75c0.477 0 0.737-0.739 0.188-1.08-0.226-0.142-0.312-0.514-0.312-1.04 0-1.18 0.934-1.88 1.9-1.88h1.44c2.09-0.032 3.27-1.65 3.29-3.29 0-3.19-2.79-5.71-6.33-5.71-3.74 0-6.67 2.89-6.67 6.5 0 3.49 2.68 6.45 6.5 6.5z"/></svg>',
					items: [
						{
							type: 'menu_item',
							label: 'Text Color',
							cmd: doClr('color'),
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m3 18v-3h14v3zm2.35-5 3.75-10h1.79l3.75 10h-1.73l-0.896-2.56h-4.02l-0.917 2.56zm3.15-4h3l-1.46-4.04h-0.0833z"/></svg>'
						},
						{
							type: 'menu_item',
							label: 'Background Color',
							cmd: doClr('backgroundColor'),
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m7.22 16.6-4.87-4.85q-0.166-0.166-0.26-0.364-0.0936-0.198-0.0936-0.427t0.0936-0.447q0.0936-0.218 0.26-0.385l4.6-4.6-2.52-2.52 1.06-1.06 8.18 8.18q0.166 0.166 0.25 0.375 0.0832 0.208 0.0832 0.437 0 0.229-0.0832 0.437-0.0832 0.208-0.25 0.375l-4.85 4.85q-0.166 0.166-0.375 0.26-0.208 0.0936-0.437 0.0936-0.229-0.0208-0.427-0.104-0.198-0.0832-0.364-0.25zm0.791-10-4.35 4.35v-0.0208 0.0208h8.7v-0.0208 0.0208zm8.18 10.3q-0.77 0-1.3-0.52-0.531-0.52-0.531-1.29 0-0.499 0.229-0.967 0.229-0.468 0.541-0.884l1.06-1.33 1.04 1.33q0.291 0.416 0.531 0.884 0.239 0.468 0.239 0.967 0 0.77-0.531 1.29-0.531 0.52-1.28 0.52z"/></svg>'
						}
					]
				},
				{
					type: 'group',
					items: [
						{
							type: 'button',
							label: 'Bold',
							cmd: () => this.doAction('bold', 'B'),
							key: 'B',
							matches: 'B,STRONT',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m5.53 16v-12h4.75q1.4 0 2.57 0.861 1.18 0.861 1.18 2.39 0 1.06-0.469 1.66t-0.885 0.865q0.542 0.249 1.17 0.895 0.625 0.646 0.625 1.9 0 1.9-1.4 2.67-1.4 0.771-2.62 0.771zm2.65-2.46h2.18q1.01 0 1.21-0.51t0.208-0.74q0-0.229-0.219-0.74-0.219-0.51-1.28-0.51h-2.1zm0-4.83h1.94q0.688 0 1.01-0.365 0.323-0.365 0.323-0.781 0-0.5-0.356-0.812-0.356-0.312-0.923-0.312h-1.99z"/></svg>'
						},
						{
							type: 'button',
							label: 'Italic',
							cmd: () => this.doAction('italic', 'I'),
							key: 'I',
							matches: 'I,EM',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m4.5 16v-2h3.33l2.58-8h-3.42v-2h8.5v2h-3.08l-2.58 8h3.17v2z"/></svg>'
						},
						{
							type: 'button',
							label: 'Underline',
							cmd: () => this.doAction('underline', 'U'),
							key: 'U',
							matches: 'U',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m5 17v-1.5h10v1.5zm5-3q-2 0-3.09-1.24t-1.09-3.28v-6.48h2.03v6.61q0 1.1 0.551 1.79 0.551 0.688 1.61 0.688 1.06 0 1.61-0.688 0.55-0.688 0.55-1.79v-6.61h2.02v6.48q0 2.04-1.09 3.28t-3.09 1.24z"/></svg>'
						}
					]
				},
				{
					type: 'group',
					items: [
						{
							type: 'button',
							label: 'Ordered List',
							cmd: () => this.doList('OL'),
							key: 'Shift + 8',
							matches: 'OL',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m3 17v-1h2v-0.5h-1v-1h1v-0.5h-2v-1h2.5q0.212 0 0.356 0.144t0.144 0.356v1q0 0.212-0.144 0.356t-0.356 0.144q0.212 0 0.356 0.144t0.144 0.356v1q0 0.212-0.144 0.356t-0.356 0.144zm0-5v-2q0-0.212 0.144-0.356t0.356-0.144h1.5v-0.5h-2v-1h2.5q0.212 0 0.356 0.144t0.144 0.356v1.5q0 0.212-0.144 0.356t-0.356 0.144h-1.5v0.5h2v1zm1-5v-3h-1v-1h2v4zm3.5 8v-1.5h9.5v1.5zm0-4.25v-1.5h9.5v1.5zm0-4.25v-1.5h9.5v1.5z"/></svg>'
						},
						{
							type: 'button',
							label: 'List',
							cmd: () => this.doList('UL'),
							key: 'Shift + 9',
							matches: 'UL',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m7.5 15v-1.5h9.5v1.5zm0-4.25v-1.5h9.5v1.5zm0-4.25v-1.5h9.5v1.5zm-3 9.25q-0.621 0-1.06-0.442-0.438-0.442-0.438-1.06 0-0.621 0.442-1.06 0.442-0.438 1.06-0.438 0.621 0 1.06 0.442 0.438 0.442 0.438 1.06 0 0.621-0.442 1.06-0.442 0.438-1.06 0.438zm0-4.25q-0.621 0-1.06-0.442-0.438-0.442-0.438-1.06 0-0.621 0.442-1.06 0.442-0.438 1.06-0.438 0.621 0 1.06 0.442 0.438 0.442 0.438 1.06 0 0.621-0.442 1.06-0.442 0.438-1.06 0.438zm0-4.25q-0.621 0-1.06-0.442-0.438-0.442-0.438-1.06 0-0.621 0.442-1.06 0.442-0.438 1.06-0.438 0.621 0 1.06 0.442 0.438 0.442 0.438 1.06 0 0.621-0.442 1.06-0.442 0.438-1.06 0.438z"/></svg>'
						},
						{
							type: 'button',
							label: 'Decrease Indent',
							cmd: () => this.changeLevel('decrease'),
							key: ']',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m3 17v-1.5h14v1.5zm6-3.12v-1.5h8v1.5zm0-3.12v-1.5h8v1.5zm0-3.12v-1.5h8v1.5zm-6-3.12v-1.5h14v1.5zm4 8.5v-6l-4 3z"/></svg>'
						},
						{
							type: 'button',
							label: 'Increase Indent',
							cmd: () => this.changeLevel('increase'),
							key: '[',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m3 17v-1.5h14v1.5zm6-3.12v-1.5h8v1.5zm0-3.12v-1.5h8v1.5zm0-3.12v-1.5h8v1.5zm-6-3.12v-1.5h14v1.5zm0 8.5v-6l4 3z"/></svg>'
						}
					]
				},
				{
					type: 'menu',
					rightEdge: true,
					label: 'Insert Image',
					icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m15 1v2h-2v2h2v2h2v-2h2v-2h-2v-2zm-12 2c-1.09 0-2 0.909-2 2v10c0 1.09 0.909 2 2 2h14c1.09 0 2-0.909 2-2v-5h-1.75v5.25h-14.5v-10.5h7.25v-1.75zm9 6-3 4-2-3-3 4h12z"/></svg>',
					items: [
						{
							type: 'menu_item',
							label: 'Image File',
							cmd: () => browseImage.click(),
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m7 11h8l-2.62-3.5-1.88 2.5-1.37-1.83zm-4.5 6q-0.604 0-1.05-0.448t-0.448-1.05v-10h1.5v10h13.5v1.5zm3-3q-0.604 0-1.05-0.448-0.448-0.448-0.448-1.05v-9q0-0.619 0.448-1.06t1.05-0.441h3.52l2 2h5.48q0.619 0 1.06 0.441 0.441 0.441 0.441 1.06v7q0 0.604-0.441 1.05-0.441 0.448-1.06 0.448zm0-1.5h11v-7h-6.08l-2-2h-2.92zm0 0v-9z"/></svg>'
						},
						{
							type: 'menu_item',
							label: 'From URL',
							cmd: () => {
								//TODO: check is if an IMG node is in range already
								const src = prompt('Image', 'https://');
								if (src) {
									this.squire.insertImage(src);
								}
							},
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m11.9 8h-1.88c-0.692 0-1.28-0.244-1.77-0.732-0.488-0.488-0.731-1.08-0.731-1.77s0.244-1.28 0.731-1.77 1.08-0.729 1.77-0.729h1.88v0.938h-1.88c-0.434 0-0.803 0.152-1.11 0.456s-0.456 0.673-0.456 1.11 0.152 0.803 0.456 1.11 0.607 0.456 1.11 0.456h1.88zm-1.25-2.03v-0.938h3.75v0.938zm2.5 2.03v-0.938h1.88c0.434 0 0.803-0.152 1.11-0.456s0.456-0.673 0.456-1.11-0.152-0.803-0.456-1.11-0.673-0.456-1.11-0.456h-1.88v-0.938h1.88c0.692 0 1.28 0.244 1.77 0.732 0.488 0.488 0.731 1.08 0.731 1.77 0 0.692-0.244 1.28-0.731 1.77-0.488 0.486-1.08 0.729-1.77 0.729zm3.38 2v5.5c0 0.403-0.147 0.753-0.441 1.05s-0.647 0.448-1.06 0.448h-11c-0.412 0-0.766-0.149-1.06-0.448s-0.441-0.649-0.441-1.05v-9.25c0-0.403 0.147-0.753 0.441-1.05s0.649-0.407 1.06-0.448h1.5v1.5h-1.5v9.25h11v-5.5zm-11.5 4h9l-3-4-2.25 3-1.5-2z"/></svg>'
						}
					]
				},
				{
					// this is a special case: we move the "attach" button group to the toolbar
					// TODO: there is probably a better way of doing this in the template
					// TODO: move Encrypt/Sign button group ?
					type: 'move_parent',
					label: 'Attach File',
					id: 'composeUploadButton',
					icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m12.5 9.5v-4.5h1.5v4.5zm-3.5 5.44c-1.02-0.272-1.5-1.15-1.5-2.02v-7.92h1.5zm0.5 3.06c-2.59 0-4.5-2.11-4.5-4.65v-8.1c0-1.95 1.55-3.25 3.25-3.25 1.85 0 3.25 1.51 3.25 3.4v6.35h-1.5v-6.5c0-1.09-0.883-1.75-1.75-1.75-1.06 0-1.75 0.906-1.75 1.79v8.21c0 2.63 3.33 4.15 5.25 1.96v1.94c-0.706 0.428-1.56 0.604-2.25 0.604zm3.75-1v-2.25h-2.25v-1.5h2.25v-2.25h1.5v2.25h2.25v1.5h-2.25v2.25z"/></svg>'
				},
				{
					type: 'menu_more',
					label: 'More',
					rightEdge: true,
					showInPlainMode: true,
					icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m2 4v2h16v-2zm0 5v2h16v-2zm0 5v2h16v-2z"/></svg>',
					items: [
						{
							type: 'menu_item',
							label: 'Undo',
							cmd: () => squire.undo(),
							key: 'Z',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m4.82 9.3c1.45-1.26 3.32-2.03 5.4-2.03 3.64 0 6.71 2.37 7.79 5.65l-1.85 0.61c-0.821-2.49-3.17-4.3-5.94-4.3-1.52 0-2.92 0.563-4 1.47l2.83 2.83h-7.04v-7.04z"/></svg>'
						},
						{
							type: 'menu_item',
							label: 'Redo',
							cmd: () => squire.redo(),
							key: 'Y',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m15.2 9.3c-1.45-1.26-3.32-2.03-5.4-2.03-3.64 0-6.71 2.37-7.79 5.65l1.85 0.61c0.821-2.49 3.17-4.3 5.94-4.3 1.52 0 2.92 0.563 4 1.47l-2.83 2.83h7.04v-7.04z"/></svg>'
						},
						{
							type: 'menu_item',
							label: 'Blockquote',
							cmd: () => {
								if (!['UL', 'OL', 'BLOCKQUOTE'].some(listTag => this.squire.hasFormat(listTag))) {
									this.changeLevel('increase');
								}
							},
							matches: 'BLOCKQUOTE',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m4 3c-0.554 0-1 0.446-1 1s0.446 1 1 1h12c0.554 0 1-0.446 1-1s-0.446-1-1-1h-12zm0 6c-0.554 0-1 0.446-1 1v6c0 0.554 0.446 1 1 1s1-0.446 1-1v-6c0-0.554-0.446-1-1-1zm5 0c-0.554 0-1 0.446-1 1s0.446 1 1 1h7c0.554 0 1-0.446 1-1s-0.446-1-1-1h-7zm0 6c-0.554 0-1 0.446-1 1s0.446 1 1 1h7c0.554 0 1-0.446 1-1s-0.446-1-1-1h-7z"/></svg>'
						},
						{
							type: 'menu_item',
							label: 'Link',
							cmd: () => {
								/** @type {Range} range */
								const range = this.squire.getSelection();
								let linkNode;
								if (range.collapsed || range.startContainer.parentNode === range.endContainer.parentNode) {
									const root = this.squire.getRoot();
									for (let node = range.startContainer; node !== root; node = node.parentNode) {
										if (node.tagName === 'A') {
											range.selectNode(node);
											linkNode = node;
											break;
										}
									}
								}
								const url = prompt('Link', linkNode?.href || 'https://');
								if (url != null) {
									if (url.length) {
										if (range.collapsed === false) {
											// squire breaks the wrapping node, so if we have a <b>
											// inside the selection it will create something like this:
											// <a>t</a><b><a>ex</a></b><a>t</a> and we don't want that
											// TODO: this could be more elegant
											this.squire.removeAllFormatting(range);
										}
										this.squire.makeLink(url);
									} else if (linkNode) {
										this.squire.removeLink();
									}
								}
							},
							matches: 'A',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m15.4 16.7c-0.509 0.521-1.13 0.781-1.87 0.781-0.735 0-1.36-0.256-1.87-0.771l-1.91-1.91c-0.515-0.515-0.771-1.14-0.771-1.87 0-0.743 0.267-1.38 0.801-1.9l-0.809-0.809c-0.525 0.533-1.16 0.801-1.91 0.801-0.735 0-1.36-0.255-1.87-0.763l-1.9-1.89c-0.521-0.509-0.781-1.13-0.781-1.87-6e-7 -0.735 0.255-1.36 0.763-1.87l1.34-1.35c0.509-0.521 1.13-0.781 1.87-0.781 0.735 1.6e-4 1.36 0.256 1.87 0.771l1.91 1.91c0.515 0.515 0.772 1.14 0.772 1.87 0 0.739-0.265 1.37-0.792 1.9l0.809 0.809c0.524-0.527 1.16-0.792 1.9-0.792 0.735 0 1.36 0.255 1.87 0.763l1.9 1.89c0.521 0.509 0.781 1.13 0.781 1.87 0 0.735-0.255 1.36-0.763 1.87zm-1.25-1.24 1.34-1.35c0.165-0.178 0.248-0.385 0.248-0.624 0-0.245-0.0862-0.455-0.258-0.626l-1.9-1.89c-0.172-0.172-0.38-0.257-0.625-0.257-0.249-3.1e-5 -0.466 0.0966-0.653 0.286l0.577 0.577c0.353 0.353 0.353 0.922 0 1.28-0.353 0.353-0.922 0.353-1.28 0l-0.577-0.577c-0.184 0.182-0.278 0.401-0.278 0.654 0 0.251 0.0824 0.459 0.248 0.624l1.91 1.91c0.172 0.171 0.38 0.257 0.625 0.257 0.239 0 0.444-0.0849 0.615-0.257zm-6.43-6.5-0.577-0.577c-0.353-0.353-0.353-0.922 0-1.28 0.353-0.353 0.922-0.353 1.28 0l0.575 0.575c0.184-0.18 0.279-0.394 0.279-0.643-6e-7 -0.245-0.0849-0.454-0.257-0.625l-1.91-1.91c-0.172-0.172-0.38-0.257-0.625-0.257-0.239 0-0.444 0.0852-0.615 0.257l-1.34 1.35c-0.159 0.172-0.238 0.379-0.238 0.624 2e-7 0.251 0.0811 0.46 0.247 0.625l1.9 1.89c0.172 0.172 0.38 0.257 0.625 0.257 0.253-9e-7 0.473-0.0991 0.661-0.295z"/></svg>'
						},
						{
							type: 'menu_item',
							label: 'Strikethrough',
							cmd: () => this.doAction('strikethrough', 'S'),
							key: 'Shift + 7',
							matches: 'S',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m10.1 15.9q-1.5 0-2.62-0.875t-1.5-2.31l1.69-0.688q0.333 1.06 0.969 1.6 0.635 0.542 1.51 0.542 0.937 0 1.49-0.448 0.552-0.448 0.552-1.2 0-0.333-0.125-0.615t-0.375-0.51h2.15q0.104 0.229 0.135 0.49t0.0312 0.615q0 1.5-1.08 2.45-1.08 0.948-2.81 0.948zm-8.12-6v-1.5h16v1.5zm8-6q1.33 0 2.21 0.562t1.42 1.79l-1.62 0.708q-0.229-0.625-0.76-1.01-0.531-0.385-1.2-0.385-0.771 0-1.28 0.375-0.51 0.375-0.552 0.958h-1.81q0.0417-1.31 1.06-2.16 1.02-0.844 2.54-0.844z"/></svg>'
						},
						{
							type: 'menu_item',
							label: 'Superscript',
							cmd: () => this.doAction('superscript', 'SUP'),
							key: 'Shift + 6',
							matches: 'SUP',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m13.4 8v-1.99q0-0.424 0.288-0.715 0.288-0.291 0.712-0.292h1v-1h-2v-1h2q0.425 0 0.712 0.287 0.288 0.286 0.288 0.71v0.997q0 0.424-0.288 0.715-0.288 0.292-0.712 0.292h-1v1h2v1zm-9.38 8 3.31-5.21-3.08-4.79h1.89l2.21 3.56h0.0833l2.21-3.56h1.9l-3.1 4.79 3.33 5.21h-1.9l-2.44-3.88h-0.0833l-2.44 3.88z"/></svg>'
						},
						{
							type: 'menu_item',
							label: 'Subscript',
							cmd: () => this.doAction('subscript', 'SUB'),
							key: 'Shift + 5',
							matches: 'SUB',
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m13.4 18v-1.99q0-0.424 0.288-0.715 0.288-0.292 0.712-0.292h1v-1h-2v-1h2q0.425 0 0.712 0.287 0.288 0.286 0.288 0.71v0.997q0 0.424-0.288 0.715-0.288 0.292-0.712 0.292h-1v1h2v1zm-9.38-3 3.31-5.21-3.08-4.79h1.89l2.21 3.56h0.0833l2.21-3.56h1.9l-3.1 4.79 3.33 5.21h-1.9l-2.44-3.88h-0.0833l-2.44 3.88z"/></svg>'
						},
						{
							type: 'menu_item',
							label: 'Left to Right',
							cmd: () => squire.setTextDirection('ltr'),
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m8 12v-4q-1.25 0-2.12-0.875-0.875-0.875-0.875-2.12t0.875-2.12q0.875-0.875 2.11-0.875h6.01v1.5h-1.5v8.5h-1.5v-8.5h-1.5v8.5zm6 6-1.06-1.06 1.19-1.19h-11.1v-1.5h11.1l-1.19-1.19 1.06-1.06 3 3zm-6-11.5v-3q-0.625 0-1.06 0.442-0.438 0.442-0.438 1.06 0 0.621 0.441 1.06 0.441 0.437 1.06 0.437z"/></svg>'
						},
						{
							type: 'menu_item',
							label: 'Right to Left',
							cmd: () => squire.setTextDirection('rtl'),
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m6 18-3-3 3-3 1.06 1.06-1.19 1.19h11.1v1.5h-11.1l1.19 1.19zm2-6v-4q-1.25 0-2.12-0.875-0.875-0.875-0.875-2.12t0.875-2.12q0.875-0.875 2.11-0.875h6.01v1.5h-1.5v8.5h-1.5v-8.5h-1.5v8.5zm0-5.5v-3q-0.625 0-1.06 0.442-0.438 0.442-0.438 1.06 0 0.621 0.441 1.06 0.441 0.437 1.06 0.437z"/></svg>'
						},
						{
							type: 'menu_item',
							label: 'HTML Mode',
							id: 'menu-item-mode-wysiwyg',
							cmd: () => this.setMode('wysiwyg'),
							showInPlainMode: true,
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m2 2v3h1v-2h2v-1zm13 0v1h2v2h1v-3zm-9 3v10h2v-4h4v4h2v-10h-2v4h-4v-4zm-4 10v3h3v-1h-2v-2zm15 0v2h-2v1h3v-3z"/></svg>'
						},
						{
							type: 'menu_item',
							label: 'Edit Source',
							id: 'menu-item-mode-source',
							cmd: () => this.setMode('source'),
							showInPlainMode: true,
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m12 2.83c-0.478-0.138-0.976 0.141-1.11 0.619l-3.6 12.6c-0.138 0.478 0.141 0.976 0.619 1.11 0.478 0.138 0.976-0.141 1.11-0.619l3.6-12.6c0.138-0.478-0.141-0.976-0.619-1.11zm2.27 4.65 2.51 2.51-2.51 2.51c-0.352 0.352-0.352 0.923 0 1.27 0.352 0.352 0.923 0.352 1.27 0l3.15-3.15c0.352-0.352 0.352-0.923 0-1.27l-3.15-3.15c-0.352-0.352-0.923-0.352-1.27-0.00141-0.35 0.35-0.35 0.921 0.00141 1.27zm-8.63-1.27c-0.352-0.352-0.923-0.352-1.27 0l-3.15 3.15c-0.352 0.352-0.352 0.923 0 1.27l3.15 3.15c0.352 0.352 0.923 0.352 1.27 0 0.352-0.352 0.352-0.923 0-1.27l-2.51-2.51 2.51-2.51c0.352-0.352 0.352-0.923 0-1.27z"/></svg>'
						},
						{
							type: 'menu_item',
							label: 'Plain Text Mode',
							id: 'menu-item-mode-plain',
							cmd: () => this.setMode('plain'),
							showInPlainMode: true,
							icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m2 2v3h1v-2h2v-1zm13 0v1h2v2h1v-3zm-9 3v2h3v8h2v-8h3v-2zm-4 10v3h3v-1h-2v-2zm15 0v2h-2v1h3v-3z"/></svg>'
						}
					]
				}
			];
// 				// clear: {
// 				// 	removeStyle: {
// 				// 		html: '⎚',
// 				// 		cmd: () => squire.setStyle()
// 				// 	}
// 				// }

			dispatchEvent(new CustomEvent('squire2-toolbar', {
				detail: {
					squire: this,
					actions: actions
				}
			}));
			this.indicators = this.#addActionsToParent(actions, toolbar);
			return actions;
		}

		#makeClr() {
			/**@type {HTMLInputElement} clr*/
			const clr = createElement('input');
			clr.type = 'color';
			// Chrome https://github.com/the-djmaze/snappymail/issues/1199
			let clrid = 'squire-colors',
				colorlist = doc.getElementById(clrid),
				add = hex => colorlist.append(new Option(hex));
			if (!colorlist) {
				colorlist = createElement('datalist');
				colorlist.id = clrid;
				// Color blind safe Tableau 10 by Maureen Stone
				add('#4E79A7');
				add('#F28E2B');
				add('#E15759');
				add('#76B7B2');
				add('#59A14F');
				add('#EDC948');
				add('#B07AA1');
				add('#FF9DA7');
				add('#9C755F');
				add('#BAB0AC');
				doc.body.append(colorlist);
			}
			clr.setAttribute('list', clrid);
			return clr;
		}

		/**
		 * @param {Array} items
		 * @param {HTMLElement} parent
		 */
		#addActionsToParent(items, parent) {
			const indicators = [];
			items.forEach(item => {
				let element, event;
				switch (item.type) {
					case 'group':
						const group = createElement('div');
						group.className = 'btn-group';
						if (!item.showInPlainMode) {
							group.className += ' squire-html-mode-item';
						}
						if (item.items) {
							indicators.push(...this.#addActionsToParent(item.items, group));
						}
						parent.append(group);
						return indicators;
					case 'menu':
					case 'menu_more':
						const menuWrap = document.createElement('div');
						menuWrap.className = 'btn-group dropdown squire-toolbar-menu-wrap';
						menuWrap.title = item.label;
						if (!item.showInPlainMode) {
							menuWrap.className += ' squire-html-mode-item';
						}
						const menuBtn = document.createElement('a');
						menuBtn.className = 'btn dropdown-toggle';
						if (item.icon !== '') {
							menuBtn.innerHTML = item.icon;
							menuBtn.firstElementChild.setAttribute('class', 'squire-toolbar-svg-icon');
						} else {
							menuBtn.className += ' fontastic';
							menuBtn.textContent = '☰';
						}
						menuWrap.appendChild(menuBtn);

						const menu = document.createElement('ul');
						menu.className = 'dropdown-menu squire-toolbar-menu';
						if (item.rightEdge) {
							menu.className += ' right-edge';
						}
						menu.setAttribute('role', 'menu');

						if (item.items) {
							indicators.push(...this.#addActionsToParent(item.items, menu));
						}
						menuWrap.appendChild(menu);
						parent.append(menuWrap);
						ko.applyBindingAccessorsToNode(menuWrap, { registerBootstrapDropdown: true });
						item.element = menuWrap;
						return indicators;
					case 'move_parent':
						// we only move into main composer not the signature composer
						if (this.container.className.indexOf('e-signature-place') === -1) {
							element = doc.getElementById(item.id);
							if (element) {
								element.className = 'btn';
								if (item.icon) {
									element.innerHTML = item.icon;
									element.firstElementChild.setAttribute('class', 'squire-toolbar-svg-icon');
								}
								if (item.label) {
									element.title = item.label;
								}
								element.parentElement.className += ' ' + item.id + '-parent';
								parent.append(element.parentElement);
							}
						}
						return [];
					case 'button':
						element = createElement('button');
						element.type = 'button';
						element.className = 'btn';
						element.innerHTML = item.icon;
						element.firstElementChild.setAttribute('class', 'squire-toolbar-svg-icon');
						event = 'click';
						break;
					case 'select':
						element = createElement('select');
						element.className = 'btn';
						element.innerHTML = item.icon;
						event = 'input';
						if (Array.isArray(item.items)) {
							item.items.forEach(value => {
								value = Array.isArray(value) ? value : [value, value];
								const option = new Option(value[0], value[1]);
								option.style[item.prop] = value[1];
								element.append(option);
							});
						} else {
							Object.entries(item.items).forEach(([label, options]) => {
								const optgroup = createElement('optgroup');
								optgroup.label = label;
								Object.entries(options).forEach(([text, value]) => {
									const option = new Option(text, value);
									option.style[item.prop] = value;
									optgroup.append(option);
								});
								element.append(optgroup);
							});
						}
						if (item.defaultValueIndex) {
							element.selectedIndex = item.defaultValueIndex;
						}
						item.element = element;
						break;
					case 'menu_item':
						element = createElement('li');
						element.className = 'squire-toolbar-menu-item';
						if (!item.showInPlainMode) {
							element.className += ' squire-html-mode-item';
						}
						element.innerHTML = item.icon + '<span>' + item.label + '</span>';
						element.firstElementChild.setAttribute('class', 'squire-toolbar-svg-icon squire-toolbar-menu-item-icon');
						event = 'click';
						break;
				}

				element.title = item.label + (item.key ? ' (' + ctrlKey + item.key + ')' : '');
				element.tabIndex = -1;
				element.addEventListener(event, () => item.cmd(element));
				if (item.id) {
					element.id = item.id;
				}
				if (item.matches) {
					indicators.push({
						element: element,
						selectors: item.matches.split(',')
					});
				}
				parent.append(element);
			});
			return indicators;
		}

		/**
		 * Plugins might add their own pathChange listeners therefore they should
		 * use this utility function. @see example below
		 * @param {Object} eventDetail detail of pathChange event
		 * @returns {Map<any, any>}
		 */
		buildTokensMap(eventDetail) {
			if (!eventDetail.tokensMap) {
				const tokensMap = new Map();
				if (eventDetail.path !== '(selection)') {
					window.parsel.tokenize(eventDetail.path).forEach(token => {
						if (token.type === 'type') {
							// token.name is a tag like B, I, UL, etc...
							tokensMap.set(token.name, '1');
						} else if (token.name === 'fontFamily') {
							// token.value can be a string like '"LucidaSansUnicode","DejaVuSans","BitstreamVeraSans",sans-serif'
							tokensMap.set('__font_family__', token.value);
						} else if (token.name === 'fontSize') {
							// token.value can be a string like '24px' or 'Large'
							tokensMap.set('__font_size__', token.value);
						}
					});
				} else {
					tokensMap.set('__selection__', '1');
				}
				eventDetail.tokensMap = tokensMap;
			}
			return eventDetail.tokensMap;
		}

		doAction(name, tag) {
			if (tag && this.squire.hasFormat(tag)) {
				// ex: bold -> removeBold
				name = 'remove' + name.charAt(0).toUpperCase() + name.slice(1);
			}
			this.squire[name]();
		}

		doList(type) {
			if (this.squire.hasFormat(type)) {
				this.squire.removeList();
				return;
			}
			if (type === 'UL') {
				this.squire.makeUnorderedList();
			} else if (type === 'OL') {
				this.squire.makeOrderedList();
			}
		}

		changeLevel(incDec) {
			const type = ['UL', 'OL'].some(listTag => this.squire.hasFormat(listTag))
				? 'List'
				: 'Quote';
			this.squire[incDec + type + 'Level']();
		}

		/*
			testPresenceinSelection(format, validation) {
				return validation.test(this.squire.getPath()) || this.squire.hasFormat(format);
			}
		*/
		setMode(mode) {
			if (this.mode !== mode) {
				let cl = this.container.classList,
					source = 'source' === this.mode;
				cl.remove('squire2-mode-' + this.mode);
				if ('plain' === mode) {
					this.plain.value = htmlToPlain(source ? this.plain.value : this.squire.getHTML(), true);
					this.toolbar.classList.add('mode-plain');
				} else if ('source' === mode) {
					this.plain.value = this.squire.getHTML();
					this.toolbar.classList.add('mode-plain');
				} else {
					this.setData(source ? this.plain.value : plainToHtml(this.plain.value, true));
					mode = 'wysiwyg';
					this.toolbar.classList.remove('mode-plain');
				}

				doc.getElementById('menu-item-mode-' + this.mode)?.classList.remove('active');
				doc.getElementById('menu-item-mode-' + mode).classList.add('active');

				this.mode = mode;
				cl.add('squire2-mode-' + mode);
				this.onModeChange?.();
				setTimeout(() => this.focus(), 1);
			}
		}

		on(type, fn) {
			if ('mode' === type) {
				this.onModeChange = fn;
			} else {
				this.squire.addEventListener(type, fn);
				this.plain.addEventListener(type, fn);
			}
		}

		execCommand(cmd, cfg) {
			if ('insertSignature' === cmd) {
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
						this.plain.value = cfg.insertBefore ? '\n\n' + signature + '\n\n' + text : text + '\n\n' + signature;
					} else {
						const squire = this.squire,
							root = squire.getRoot(),
							div = createElement('div');
						div.className = 'rl-signature';
						div.innerHTML = cfg.isHtml ? cfg.signature : plainToHtml(cfg.signature);
						root.querySelectorAll('div.rl-signature').forEach(node => node.remove());
						cfg.insertBefore ? root.prepend(div) : root.append(div);
						// Move cursor above signature
						for (let i = 0; i < 2; i++) {
							const divbr = createElement('div');
							divbr.append(createElement('br'));
							div.before(divbr);
						}
					}
					this._prev_txt_sig = signature;
				} catch (e) {
					console.error(e);
				}
			}
		}

		getData() {
			return 'source' === this.mode ? this.plain.value : trimLines(this.squire.getHTML());
		}

		setData(html) {
//		this.plain.value = html;
			const squire = this.squire;
			squire.setHTML(trimLines(html));
			const node = squire.getRoot(),
				range = squire.getSelection();
			range.setStart(node, 0);
			range.setEnd(node, 0);
			squire.setSelection(range);
		}

		getPlainData() {
			return this.plain.value;
		}

		setPlainData(text) {
			this.plain.value = text;
		}

		blur() {
			this.squire.blur();
		}

		focus() {
			if ('wysiwyg' === this.mode) {
				this.squire.focus();
			} else {
				this.plain.focus();
				this.plain.setSelectionRange(0, 0);
			}
		}
	}

	if (rl) {
		rl.registerWYSIWYG('CompactComposer', (owner, container, onReady) => {
			const editor = new CompactComposer(container);
			onReady(editor);
		});
	}

})(window);
