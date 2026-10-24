import { doc, createElement, addEventsListeners } from 'Common/Globals';
import { EmailModel } from 'Model/Email';
import { addressparser } from 'Mime/Address';

const contentType = 'snappymail/emailaddress',
	getAddressKey = li => li?.emailaddress?.key,

	parseEmailLine = line => addressparser(line).map(item =>
			(item.name || item.email)
				? new EmailModel(item.email, item.name) : null
		).filter(v => v),
	splitEmailLine = line => {
		const result = [];
		let exists = false;
		addressparser(line).forEach(item => {
			const address = (item.name || item.email)
				? new EmailModel(item.email, item.name)
				: null;

			if (address?.email) {
				exists = true;
			}

			result.push(address ? address.toLine() : item.name);
		});
		return exists ? result : null;
	};

let dragAddress, datalist;

// mailbox-list
export class EmailAddressesComponent {

	constructor(element, options) {

		if (!datalist) {
			datalist = createElement('datalist',{id:"emailaddresses-datalist"});
			doc.body.append(datalist);
		}

		const self = this,
			input = createElement('input',{type:"text", list:datalist.id,
				autocomplete:"off", autocorrect:"off", autocapitalize:"off"}),
			// In Chrome we have no access to dataTransfer.getData unless it's the 'drop' event
			// In Chrome Mobile dataTransfer.types.includes(contentType) fails, only text/plain is set
			validDropzone = () => dragAddress?.li.parentNode !== self.ul,
			fnDrag = e => validDropzone() && e.preventDefault();

		self.element = element;

		self.options = Object.assign({

			focusCallback : null,

			// simply passing an autoComplete source (array, string or function) will instantiate autocomplete functionality
			autoCompleteSource : '',

			onChange : null
		}, options);

		self._chosenValues = [];

		self._lastEdit = '';

		// Create the elements
		self.ul = createElement('ul',{class:"emailaddresses"});

		addEventsListeners(self.ul, {
			click: e => self._focus(e),
			dblclick: e => self._editTag(e),
			dragenter: fnDrag,
			dragover: fnDrag,
			drop: e => {
				if (validDropzone() && dragAddress.value) {
					e.preventDefault();
					dragAddress.source._removeDraggedTag(dragAddress.li);
					self._parseValue(dragAddress.value);
				}
			}
		});

		self.input = input;

		addEventsListeners(input, {
			focus: () => {
				self._focusTrigger(true);
				input.value || self._resetDatalist();
			},
			blur: () => {
				// prevent autoComplete menu click from causing a false 'blur'
				self._parseInput(true);
				self._focusTrigger(false);
			},
			keydown: e => {
				if ('Backspace' === e.key || 'ArrowLeft' === e.key) {
					// if our input contains no value and backspace has been pressed, select the last tag
					var lastTag = self.inputCont.previousElementSibling;
					if (lastTag && (!input.value
						|| (('selectionStart' in input) && input.selectionStart === 0 && input.selectionEnd === 0))
					) {
						e.preventDefault();
						lastTag.querySelector('a').focus();
					}
					self._updateDatalist();
				} else if (e.key == 'Enter') {
					e.preventDefault();
					self._parseInput(true);
				}
			},
			input: () => {
				self._parseInput();
				self._updateDatalist();
			}
		});

		// define starting placeholder
		if (element.placeholder) {
			input.placeholder = element.placeholder;
		}

		self.inputCont = createElement('li',{class:"emailaddresses-input"});
		self.inputCont.append(input);
		self.ul.append(self.inputCont);

		element.replaceWith(self.ul);

		// if instantiated input already contains a value, parse that junk
		if (element.value.trim()) {
			self._parseValue(element.value);
		}

		self._updateDatalist = self.options.autoCompleteSource
			? (() => {
				let value = input.value.trim();
				if (datalist.inputValue !== value) {
					datalist.inputValue = value;
					value.length && self.options.autoCompleteSource(
						value,
						items => {
							self._resetDatalist();
							let chars = value.length;
							items?.forEach(item => {
								datalist.append(new Option(item));
								chars = Math.max(chars, item.length);
							});
							// https://github.com/the-djmaze/snappymail/issues/368 and #513
							chars *= 8;
							if (input.clientWidth < chars) {
								input.style.width = chars + 'px';
							}
						}
					)
				}
			}).throttle(500)
			: () => 0;
	}

	_focusTrigger(bValue) {
		this.ul.classList.toggle('emailaddresses-focused', bValue);
		this.options.focusCallback(bValue);
	}

	_resetDatalist() {
		datalist.textContent = '';
	}

	_parseInput(force) {
		let val = this.input.value;
		if ((force || val.includes(',') || val.includes(';')
				|| (val.charAt(val.length-1)===' ' && this._simpleEmailMatch(val)))
			&& this._parseValue(val)) {
			this.input.value = '';
		}
		this._resizeInput();
	}

	_parseValue(val) {
		if (val) {
			const self = this,
				v = val.trim(),
				hook = (v && [',', ';', '\n'].includes(v.slice(-1))) ? splitEmailLine(val) : null,
				values = (hook || [val]).map(value => parseEmailLine(value))
						.flat(Infinity)
						.map(item => (item.toLine ? [item.toLine(), item] : [item, null]));

			if (values.length) {
				values.forEach(a => {
					var v = a[0].trim(),
						exists = false,
						lastIndex = -1,
						obj = {
							key : '',
							obj : null,
							value : ''
						};

					self._chosenValues.forEach((vv, kk) => {
						if (vv.value === self._lastEdit) {
							lastIndex = kk;
						}

						exists |= vv.value === v;
					});

					if (v !== '' && a[1] && !exists) {

						obj.key = 'mi_' + Math.random().toString( 16 ).slice( 2, 10 );
						obj.value = v;
						obj.obj = a[1];

						if (-1 < lastIndex) {
							self._chosenValues.splice(lastIndex, 0, obj);
						} else {
							self._chosenValues.push(obj);
						}

						self._lastEdit = '';
						self._renderTags();
					}
				});

				if (1 === values.length && '' === values[0] && '' !== self._lastEdit) {
					self._lastEdit = '';
					self._renderTags();
				}

				self._setValue(self._buildValue());

				return true;
			}
		}
	}

	// the input dynamically resizes based on the length of its value
	_resizeInput() {
		let input = this.input;
		if (input.clientWidth < input.scrollWidth) {
			input.style.width = (input.scrollWidth + 20) + 'px';
		}
	}

	_editTag(ev) {
		var li = ev.target.closest('li'),
			tagKey = getAddressKey(li);

		if (!tagKey) {
			return true;
		}

		var self = this,
			tagName = '',
			oPrev = null,
			next = false
		;

		self._chosenValues.forEach(v => {
			if (v.key === tagKey) {
				tagName = v.value;
				next = true;
			} else if (next && !oPrev) {
				oPrev = v;
			}
		});

		if (oPrev)
		{
			self._lastEdit = oPrev.value;
		}

		li.after(self.inputCont);

		self.input.value = tagName;
		setTimeout(() => self.input.select(), 100);

		self._removeTag(ev, li);
		self._resizeInput(ev);
	}

	_buildValue() {
		return this._chosenValues.map(v => v.value).join(',');
	}

	_setValue(value) {
		if (this.element.value !== value) {
			this.element.value = value;
			this.options.onChange(value);
		}
	}

	_simpleEmailMatch(value) {
		// A very SIMPLE test to check if the value might be an email
		const val = value.trim();
		return /^[^@]*<[^\s@]{1,128}@[^\s@]{1,256}\.[\w]{2,32}>$/g.test(val)
			|| /^[^\s@]{1,128}@[^\s@]{1,256}\.[\w]{2,32}$/g.test(val);
	}

	_renderTags() {
		let self = this;
		[...self.ul.children].forEach(node => node !== self.inputCont && node.remove());

		self._chosenValues.forEach(v => {
			if (v.obj) {
				let li = createElement('li',{title:v.obj.toLine(),draggable:'true'}),
					el = createElement('span');
				el.append(v.obj.toLine(true));
				li.append(el);

				el = createElement('a',{href:'#', class:'ficon'});
				el.append('✖');
				addEventsListeners(el, {
					click: e => self._removeTag(e, li),
					focus: () => li.className = 'emailaddresses-selected',
					blur: () => li.className = null,
					keydown: e => {
						switch (e.key) {
							case 'Delete':
							case 'Backspace':
								self._removeTag(e, li);
								break;

							// 'e' - edit tag (removes tag and places value into visible input
							case 'e':
							case 'Enter':
								self._editTag(e);
								break;

							case 'ArrowLeft':
								// select the previous tag or input if no more tags exist
								var previous = el.closest('li').previousElementSibling;
								if (previous.matches('li')) {
									previous.querySelector('a').focus();
								} else {
									self.focus();
								}
								break;

							case 'ArrowRight':
								// select the next tag or input if no more tags exist
								var next = el.closest('li').nextElementSibling;
								if (next !== this.inputCont) {
									next.querySelector('a').focus();
								} else {
									this.focus();
								}
								break;

							case 'ArrowDown':
								self._focus(e);
								break;
						}
					}
				});
				li.append(el);

				li.emailaddress = v;

				addEventsListeners(li, {
					dragstart: e => {
						dragAddress = {
							source: self,
							li: li,
							value: li.emailaddress.obj.toLine()
						};
//						e.dataTransfer.setData(contentType, li.emailaddress.obj.toLine());
						e.dataTransfer.setData('text/plain', contentType);
//						e.dataTransfer.setDragImage(li, 0, 0);
						e.dataTransfer.effectAllowed = 'move';
						li.style.opacity = 0.25;
					},
					dragend: () => {
						dragAddress = null;
						li.style.cssText = '';
					}
				});

				self.inputCont.before(li);
			}
		});
	}

	_removeTag(ev, li) {
		ev.preventDefault();

		var key = getAddressKey(li),
			self = this,
			indexFound = self._chosenValues.findIndex(v => key === v.key);

		indexFound > -1 && self._chosenValues.splice(indexFound, 1);

		self._setValue(self._buildValue());

		li.remove();
		setTimeout(() => self.input.focus(), 100);
	}

	_removeDraggedTag(li) {
		var
			key = getAddressKey(li),
			self = this,
			indexFound = self._chosenValues.findIndex(v => key === v.key)
		;
		if (-1 < indexFound) {
			self._chosenValues.splice(indexFound, 1);
			self._setValue(self._buildValue());
		}

		li.remove();
	}

	focus () {
		this.input.focus();
	}

	blur() {
		this.input.blur();
	}

	_focus(ev) {
		var li = ev.target.closest('li');
		if (getAddressKey(li)) {
			li.querySelector('a').focus();
		} else {
			this.focus();
		}
	}

	set value(value) {
		var self = this;
		if (self.element.value !== value) {
//			self.input.value = '';
//			self._resizeInput();
			self._chosenValues = [];
			self._renderTags();
			self._parseValue(self.element.value = value);
		}
	}
}
