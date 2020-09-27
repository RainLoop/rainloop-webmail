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

(() => {

const doc = document,
	createEl = (name, attr) => {
		let el = doc.createElement(name);
		attr && Object.entries(attr).forEach(([k,v]) => el.setAttribute(k,v));
		return el;
	},
	datalist = createEl('datalist',{id:"inputosaurus-datalist"}),
	fakeSpan = createEl('span',{class:"inputosaurus-fake-span"}),

	contentType = 'inputosaurus/item';

doc.body.append(fakeSpan, datalist);

let dragData;

window.Inputosaurus = class {

	constructor(element, options) {

		var self = this,
			els = {},
			// In Chrome we have no access to dataTransfer.getData unless it's the 'drop' event
			// In Chrome Mobile dataTransfer.types.includes(contentType) fails, only text/plain is set
			validDropzone = () => dragData && dragData.li.parentNode !== els.ul,
			fnDrag = e => validDropzone(e) && e.preventDefault();

		self.element = element;

		self._focusTimer = 0;

		self.options = Object.assign({

			// while typing, the user can separate values using these delimiters
			// the value tags are created on the fly when an inputDelimiter is detected
			inputDelimiters : [',', ';', '\n'],

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

		// Create the elements
		els.ul = createEl('ul',{class:"inputosaurus-container"});

		els.ul.addEventListener("dragenter", fnDrag);
		els.ul.addEventListener("dragover", fnDrag);
		els.ul.addEventListener("drop", e => {
			if (validDropzone(e) && dragData.value) {
				e.preventDefault();
				dragData.source._removeDraggedTag(dragData.li);
				els.input.value = dragData.value;
				self.parseInput();
			}
		});

		els.input = createEl('input',{type:"text", list:datalist.id,
			autocomplete:"off", autocorrect:"off", autocapitalize:"off", spellcheck:"false"});

		els.lastEdit = '';

		els.input.addEventListener('focus', () => self._focusTrigger(true));
		els.input.addEventListener('blur', () => self._focusTrigger(false));

		// define starting placeholder
		if (element.placeholder) {
			els.input.placeholder = element.placeholder;
		}

		element.replaceWith(els.ul);

		els.inputCont = createEl('li',{class:"inputosaurus-input"});
		els.inputCont.append(els.input);
		els.ul.append(els.inputCont);

		self.elements = els;

		els.input.addEventListener('keyup', e => self._inputKeypress(e));
		els.input.addEventListener('keydown', e => self._inputKeypress(e));
		els.input.addEventListener('change', e => self._inputKeypress(e));
		els.input.addEventListener('input', e => self._inputKeypress(e));
		els.input.addEventListener('focus', () => els.input.value || self._resetAutocomplete());
		els.input.addEventListener('blur', e => self.parseInput(e));

		els.ul.addEventListener('click', e => self._focus(e));
		els.ul.addEventListener('dblclick', e => e.currentTarget.closest('li') && self._editTag(e));

		// if instantiated input already contains a value, parse that junk
		if (element.value.trim()) {
			els.input.value = element.value;
			self.parseInput();
		}

		self._updateAutocomplete = self.options.autoCompleteSource
			? (() => {
				let value = self.elements.input.value.trim();
				if (datalist.inputValue !== value) {
					datalist.inputValue = value;
					value.length && self.options.autoCompleteSource(
						{term:value},
						items => {
							self._resetAutocomplete();
							items && items.forEach(item => datalist.append(new Option(item)));
						}
					)
				}
			}).throttle(500)
			: () => {};
	}

	_focusTrigger(bValue) {
		var self = this;
		clearTimeout(self._focusTimer);
		self._focusTimer = setTimeout(() => {
			self.elements.ul.classList.toggle('inputosaurus-focused', bValue);
			self.options.focusCallback(bValue);
		}, 10);
	}

	_resetAutocomplete() {
		datalist.textContent = '';
	}

	parseInput(ev) {
		var self = this,
			val,
			hook,
			delimiterFound = false,
			values = [];

		val = self.elements.input.value;

		if (val) {
			hook = self.options.splitHook(val);
		}

		if (hook) {
			values = hook;
		} else if (delimiterFound !== false) {
			values = val.split(delimiterFound);
		} else if (!ev || ev.key == 'Enter') {
			values.push(val);
			ev && ev.preventDefault();

		// prevent autoComplete menu click from causing a false 'blur'
		} else if(ev.type === 'blur'){
			values.push(val);
		}

		values = self.options.parseHook(values);

		if (values.length) {
			self._setChosen(values);
			self.elements.input.value = '';
			self.resizeInput();
		}
	}

	_inputKeypress(ev) {
		let self = this;

		switch (ev.key) {
			case 'Backspace':
			case 'ArrowLeft':
				// if our input contains no value and backspace has been pressed, select the last tag
				if (ev.type === 'keydown') {
					var lastTag = self.elements.inputCont.previousElementSibling,
						target = ev.currentTarget;

					// IE goes back in history if the event isn't stopped
					ev.stopPropagation();

					if (lastTag && (!target.value
						|| (('selectionStart' in target) && target.selectionStart === 0 && target.selectionEnd === 0))
					) {
						ev.preventDefault();
						lastTag.querySelector('a').focus();
					}

				}
				break;

			default :
				self.parseInput(ev);
				self.resizeInput();
		}

		self._updateAutocomplete();
	}

	// the input dynamically resizes based on the length of its value
	resizeInput() {
		let input = this.elements.input;
		fakeSpan.textContent = input.value;
//		setTimeout(function  () {
			input.style.width = Math.min(500, Math.max(200, 25 + fakeSpan.clientWidth)) + 'px';
//		}, 1);
	}

	_editTag(ev) {
		var self = this,
			tagName = '',
			li = ev.currentTarget.closest('li'),
			tagKey = li.inputosaurusKey;

		if (!tagKey) {
			return true;
		}

		ev.preventDefault();

		var
			oPrev = null,
			next = false
		;

		self._chosenValues.forEach(v => {
			if (v.key === tagKey)
			{
				tagName = v.value;
				next = true;
			}
			else if (next && !oPrev)
			{
				oPrev = v;
			}
		});

		if (oPrev)
		{
			self.elements.lastEdit = oPrev.value;
		}

		li.after(self.elements.inputCont);

		self.elements.input.value = tagName;
		setTimeout(() => self.elements.input.select(), 100);

		self._removeTag(ev);
		self.resizeInput(ev);
	}

	// select the next tag or input if no more tags exist
	_nextTag(ev) {
		var tag = ev.currentTarget.closest('li'),
			next = tag.next();

		if (next !== this.elements.inputCont) {
			next.querySelector('a').focus();
		} else {
			this._focus();
		}
	}

	// return the inputDelimiter that was detected or false if none were found
	_containsDelimiter(tagStr) {
		return -1 < this.options.inputDelimiters.findIndex(v => tagStr.indexOf(v) !== -1);
	}

	_setChosen(valArr) {
		var self = this;

		if (!Array.isArray(valArr)){
			return false;
		}

		valArr.forEach(a => {
			var v = '', exists = false,
				lastIndex = -1,
				obj = {
					key : '',
					obj : null,
					value : ''
				};

			v = a[0].trim();

			self._chosenValues.forEach((vv, kk) => {
				if (vv.value === self.elements.lastEdit)
				{
					lastIndex = kk;
				}

				vv.value === v && (exists = true);
			});

			if (v !== '' && a && a[1] && !exists) {

				obj.key = 'mi_' + Math.random().toString( 16 ).slice( 2, 10 );
				obj.value = v;
				obj.obj = a[1];

				if (-1 < lastIndex)
				{
					self._chosenValues.splice(lastIndex, 0, obj);
				}
				else
				{
					self._chosenValues.push(obj);
				}

				self.elements.lastEdit = '';
				self._renderTags();
			}
		});

		if (valArr.length === 1 && valArr[0] === '' && self.elements.lastEdit !== '')
		{
			self.elements.lastEdit = '';
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
		let self = this, els = self.elements;
		[...els.ul.children].forEach(node => node !== els.inputCont && node.remove());

		self._chosenValues.forEach(v => {
			if (v.obj) {
				let li = createEl('li',{title:v.obj.toLine(false, false, true),draggable:'true'}),
					el = createEl('span');
				el.append(v.obj.toLine(true, false, true));
				li.append(el);

				el = createEl('a',{href:'#', class:'ficon'});
				el.append('✖');
				el.addEventListener('click', e => self._removeTag(e));
				el.addEventListener('focus', () => li.className = 'inputosaurus-selected');
				el.addEventListener('blur', () => li.className = null);
				el.addEventListener('keydown', e => {
					switch (e.key) {
						case 'Delete':
						case 'Backspace':
							self._removeTag(e);
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
								self._focus();
							}
							break;

						case 'ArrowRight':
							self._nextTag(e);
							break;

						case 'ArrowDown':
							self._focus(e);
							break;
					}
				});
				li.append(el);

				li.inputosaurusKey = v.key;
				li.inputosaurusValue = v.obj.toLine(false, false, false);

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

				els.inputCont.before(li);
			}
		});
	}

	_removeTag(ev) {
		ev.preventDefault();

		var target = ev.currentTarget,
			key = target.closest('li').inputosaurusKey,
			self = this,
			indexFound = self._chosenValues.findIndex(v => key === v.key);

		indexFound > -1 && self._chosenValues.splice(indexFound, 1);

		self._setValue(self._buildValue());

		target.closest('li').remove();
		setTimeout(() => self.elements.input.focus(), 100);
	}

	_removeDraggedTag(li) {
		var
			key = li.inputosaurusKey,
			self = this,
			indexFound = self._chosenValues.findIndex(v => key === v.key)
		;
		if (-1 < indexFound)
		{
			self._chosenValues.splice(indexFound, 1);
			self._setValue(self._buildValue());
		}

		li.remove();
	}

	focus () {
		this.elements.input.focus();
	}

	blur() {
		this.elements.input.blur();
	}

	_focus(ev) {
		var li = ev && ev.target && ev.target.closest('li');
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
			self.elements.input.value = '';
			self.resizeInput();
		}
	}
};

})();
