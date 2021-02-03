/**
 * Inputosaurus Text
 *
 * Must be instantiated on an <input> element
 * Allows multiple input items. Each item is represented with a removable tag that appears to be inside the input area.
 *
 * @version 0.1.6
 * @author Dan Kielp <dan@sproutsocial.com>
 * @created October 3,2012
 *
 * @modified by RainLoop Team
 * @modified by DJMaze
 */

(doc => {

const createEl = (name, attr) => {
		let el = doc.createElement(name);
		attr && Object.entries(attr).forEach(([k,v]) => el.setAttribute(k,v));
		return el;
	},
	datalist = createEl('datalist',{id:"inputosaurus-datalist"}),

	contentType = 'inputosaurus/item';

doc.body.append(datalist);

let dragData;

this.Inputosaurus = class {

	constructor(element, options) {

		var self = this,
			// In Chrome we have no access to dataTransfer.getData unless it's the 'drop' event
			// In Chrome Mobile dataTransfer.types.includes(contentType) fails, only text/plain is set
			validDropzone = () => dragData && dragData.li.parentNode !== self.ul,
			fnDrag = e => validDropzone() && e.preventDefault();

		self.element = element;

		self.options = Object.assign({

			focusCallback : null,

			// simply passing an autoComplete source (array, string or function) will instantiate autocomplete functionality
			autoCompleteSource : '',

			// manipulate and return the input value after parseInput() parsing
			// the array of tag names is passed and expected to be returned as an array after manipulation
			parseHook : null,

			splitHook : null,

			onChange : null
		}, options);

		self._chosenValues = [];

		self._lastEdit = '';

		// Create the elements
		self.ul = createEl('ul',{class:"inputosaurus-container"});

		self.ul.addEventListener('click', e => self._focus(e));
		self.ul.addEventListener('dblclick', e => self._editTag(e));
		self.ul.addEventListener("dragenter", fnDrag);
		self.ul.addEventListener("dragover", fnDrag);
		self.ul.addEventListener("drop", e => {
			if (validDropzone() && dragData.value) {
				e.preventDefault();
				dragData.source._removeDraggedTag(dragData.li);
				self._parseValue(dragData.value);
			}
		});

		self.input = createEl('input',{type:"text", list:datalist.id,
			autocomplete:"off", autocorrect:"off", autocapitalize:"off", spellcheck:"false"});

		self.input.addEventListener('focus', () => self._focusTrigger(true));
		self.input.addEventListener('blur', () => {
			// prevent autoComplete menu click from causing a false 'blur'
			self._parseInput(true);
			self._focusTrigger(false);
		});
		self.input.addEventListener('keydown', e => {
			if ('Backspace' === e.key || 'ArrowLeft' === e.key) {
				// if our input contains no value and backspace has been pressed, select the last tag
				var lastTag = self.inputCont.previousElementSibling,
					input = self.input;
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
		});
		self.input.addEventListener('input', () => {
			self._parseInput();
			self._updateDatalist();
		});
		self.input.addEventListener('focus', () => self.input.value || self._resetDatalist());

		// define starting placeholder
		if (element.placeholder) {
			self.input.placeholder = element.placeholder;
		}

		self.inputCont = createEl('li',{class:"inputosaurus-input"});
		self.inputCont.append(self.input);
		self.ul.append(self.inputCont);

		element.replaceWith(self.ul);

		// if instantiated input already contains a value, parse that junk
		if (element.value.trim()) {
			self._parseValue(element.value);
		}

		self._updateDatalist = self.options.autoCompleteSource
			? (() => {
				let value = self.input.value.trim();
				if (datalist.inputValue !== value) {
					datalist.inputValue = value;
					value.length && self.options.autoCompleteSource(
						{term:value},
						items => {
							self._resetDatalist();
							items && items.forEach(item => datalist.append(new Option(item)));
						}
					)
				}
			}).throttle(500)
			: () => {};
	}

	_focusTrigger(bValue) {
		this.ul.classList.toggle('inputosaurus-focused', bValue);
		this.options.focusCallback(bValue);
	}

	_resetDatalist() {
		datalist.textContent = '';
	}

	_parseInput(force) {
		let val = this.input.value;
		if (force || val.includes(',') || val.includes(';')) {
			this._parseValue(val) && (this.input.value = '');
		}
		this._resizeInput();
	}

	_parseValue(val) {
		var self = this,
			hook,
			values = [];

		if (val) {
			if ((hook = self.options.splitHook(val))) {
				values = hook;
			} else {
				values.push(val);
			}

			values = self.options.parseHook(values);

			if (values.length) {
				self._setChosen(values);
				return true;
			}
		}
	}

	// the input dynamically resizes based on the length of its value
	_resizeInput() {
		let input = this.input;
		if (input.clientWidth < input.scrollWidth) {
			input.style.width = Math.min(500, Math.max(200, input.scrollWidth)) + 'px';
		}
	}

	_editTag(ev) {
		var li = ev.target.closest('li'),
			tagKey = li && li.inputosaurusKey;

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

	_setChosen(valArr) {
		var self = this;

		if (!Array.isArray(valArr)){
			return false;
		}

		valArr.forEach(a => {
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

				vv.value === v && (exists = true);
			});

			if (v !== '' && a && a[1] && !exists) {

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

		if (valArr.length === 1 && valArr[0] === '' && self._lastEdit !== '') {
			self._lastEdit = '';
			self._renderTags();
		}

		self._setValue(self._buildValue());
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

	_renderTags() {
		let self = this;
		[...self.ul.children].forEach(node => node !== self.inputCont && node.remove());

		self._chosenValues.forEach(v => {
			if (v.obj) {
				let li = createEl('li',{title:v.obj.toLine(false, false, true),draggable:'true'}),
					el = createEl('span');
				el.append(v.obj.toLine(true, false, true));
				li.append(el);

				el = createEl('a',{href:'#', class:'ficon'});
				el.append('✖');
				el.addEventListener('click', e => self._removeTag(e, li));
				el.addEventListener('focus', () => li.className = 'inputosaurus-selected');
				el.addEventListener('blur', () => li.className = null);
				el.addEventListener('keydown', e => {
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
				});
				li.append(el);

				li.inputosaurusKey = v.key;
				li.inputosaurusValue = v.obj.toLine();

				li.addEventListener("dragstart", e => {
					dragData = {
						source: self,
						li: li,
						value: li.inputosaurusValue
					};
//					e.dataTransfer.setData(contentType, li.inputosaurusValue);
					e.dataTransfer.setData('text/plain', contentType);
//					e.dataTransfer.setDragImage(li, 0, 0);
					e.dataTransfer.effectAllowed = 'move';
					li.style.opacity = 0.25;
				});
				li.addEventListener("dragend", () => {
					dragData = null;
					li.style.cssText = '';
				});

				self.inputCont.before(li);
			}
		});
	}

	_removeTag(ev, li) {
		ev.preventDefault();

		var key = li.inputosaurusKey,
			self = this,
			indexFound = self._chosenValues.findIndex(v => key === v.key);

		indexFound > -1 && self._chosenValues.splice(indexFound, 1);

		self._setValue(self._buildValue());

		li.remove();
		setTimeout(() => self.input.focus(), 100);
	}

	_removeDraggedTag(li) {
		var
			key = li.inputosaurusKey,
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
		if (li && li.inputosaurusKey) {
			li.querySelector('a').focus();
		} else {
			this.focus();
		}
	}

	refresh() {
		var self = this,
			val = self.element.value,
			values = [];

		values.push(val);

		if (val) {
			var hook = self.options.splitHook(val);
			if (hook) {
				values = hook;
			}
		}

		if (values.length) {
			self._chosenValues = [];

			values = self.options.parseHook(values);

			self._setChosen(values);
			self._renderTags();
			self.input.value = '';
			self._resizeInput();
		}
	}
};

})(document);
