const ko = window.ko,
	rlContentType = 'application/x-rainloop-action',
	validTransfer = data => ['move','copy'].includes(data.dropEffect) // effectAllowed
		&& data.getData('application/x-rainloop-messages');

ko.bindingHandlers.editor = {
	init: (element, fValueAccessor) => {
		let editor = null;

		const fValue = fValueAccessor(),
			HtmlEditor = require('Common/HtmlEditor').default,
			fUpdateEditorValue = () => fValue && fValue.__editor && fValue.__editor.setHtmlOrPlain(fValue()),
			fUpdateKoValue = () => fValue && fValue.__editor && fValue(fValue.__editor.getDataWithHtmlMark()),
			fOnReady = () => {
				fValue.__editor = editor;
				fUpdateEditorValue();
			};

		if (ko.isObservable(fValue) && HtmlEditor) {
			editor = new HtmlEditor(element, fUpdateKoValue, fOnReady, fUpdateKoValue);

			fValue.__fetchEditorValue = fUpdateKoValue;

			fValue.subscribe(fUpdateEditorValue);

			// ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			// });
		}
	}
};

let ttn = (element, fValueAccessor) => require('Common/Momentor').timeToNode(element, ko.unwrap(fValueAccessor()));
ko.bindingHandlers.moment = {
	init: ttn,
	update: ttn
};

ko.bindingHandlers.emailsTags = {
	init: (element, fValueAccessor, fAllBindingsAccessor) => {
		const EmailModel = require('Model/Email').default,
			fValue = fValueAccessor(),
			fAllBindings = fAllBindingsAccessor(),
			inputDelimiters = [',', ';', '\n'];

		element.inputosaurus = new window.Inputosaurus(element, {
			focusCallback: value => fValue && fValue.focused && fValue.focused(!!value),
			autoCompleteSource: fAllBindings.autoCompleteSource || null,
			splitHook: value => {
				const v = value.trim();
				return (v && inputDelimiters.includes(v.substr(-1)))
					 ? EmailModel.splitEmailLine(value)
					 : null;
			},
			parseHook: input =>
				input.map(inputValue => {
					const values = EmailModel.parseEmailLine(inputValue);
					return values.length ? values : inputValue;
				}).flat(Infinity).map(
					item => (item.toLine ? [item.toLine(false), item] : [item, null])
				),
			change: event => {
				element.EmailsTagsValue = event.target.value;
				fValue(event.target.value);
			}
		});

		if (fValue && fValue.focused && fValue.focused.subscribe) {
			fValue.focused.subscribe(value => {
				element.inputosaurus[value ? 'focus' : 'blur']();
			});
		}
	},
	update: (element, fValueAccessor) => {
		const value = ko.unwrap(fValueAccessor());

		if (element.EmailsTagsValue !== value) {
			element.value = value;
			element.EmailsTagsValue = value;
			element.inputosaurus.refresh();
		}
	}
};

// Start dragging selected messages
ko.bindingHandlers.dragmessages = {
	init: (element, fValueAccessor) => {
		if (!rl.settings.app('mobile')) {
			element.addEventListener("dragstart", e => fValueAccessor()(e));
		}
	}
};

// Drop selected messages on folder
const dragTimer = {
	id: 0,
	stop: () => clearTimeout(this.id),
	start: fn => this.id = setTimeout(fn, 500)
};
ko.bindingHandlers.dropmessages = {
	init: (element, fValueAccessor) => {
		if (!rl.settings.app('mobile')) {
			const folder = fValueAccessor(),
//				folder = ko.dataFor(element),
				fnHover = e => {
					if (validTransfer(e.dataTransfer)) {
						dragTimer.stop();
						e.preventDefault();
						element.classList.add('droppableHover');
						if (folder && folder.collapsed()) {
							dragTimer.start(() => {
								folder.collapsed(false);
								rl.app.setExpandedFolder(folder.fullNameHash, true);
							}, 500);
						}
					}
				};
			element.addEventListener("dragenter", fnHover);
			element.addEventListener("dragover", fnHover);
			element.addEventListener("dragleave", e => {
				e.preventDefault();
				element.classList.remove('droppableHover');
				dragTimer.stop();
			});
			element.addEventListener("drop", e => {
				const data = JSON.parse(validTransfer(e.dataTransfer));
				if (data) {
					data.copy = data.copy && event.ctrlKey;
					e.preventDefault();
					if (folder && data && data.folder && Array.isArray(data.uids)) {
						rl.app.moveMessagesToFolder(data.folder, data.uids, folder.fullNameRaw, data.copy);
					}
				}
			});
		}
	}
};

let sortableElement = null,
isSortableData = data => 'move' === data.dropEffect && 'sortable' === data.getData(rlContentType);
ko.bindingHandlers.sortableItem = {
	init: (element, fValueAccessor) => {
		let options = ko.utils.unwrapObservable(fValueAccessor()) || {},
			parent = element.parentNode,
			fnHover = e => {
				if (isSortableData(e.dataTransfer)) {
					e.preventDefault();
					let node = (e.target.closest ? e.target : e.target.parentNode).closest('[draggable]');
					if (node && node !== sortableElement && parent.contains(node)) {
						let rect = node.getBoundingClientRect();
						if (rect.top + (rect.height / 2) <= e.clientY) {
							if (node.nextElementSibling !== sortableElement) {
								node.after(sortableElement);
							}
						} else if (node.previousElementSibling !== sortableElement) {
							node.before(sortableElement);
						}
					}
				}
			};
		element.addEventListener("dragstart", e => {
			sortableElement = element;
			e.dataTransfer.setData(rlContentType, 'sortable');
			e.dataTransfer.setDragImage(element, 0, 0);
			e.dataTransfer.effectAllowed = 'move';
			element.style.opacity = 0.25;
		});
		element.addEventListener("dragend", e => {
			element.style.opacity = null;
			if (isSortableData(e.dataTransfer)) {
				let row = parent.rows[options.list.indexOf(ko.dataFor(element))];
				if (row != sortableElement) {
					row.before(sortableElement);
				}
			}
		});
		if (!parent.sortable) {
			parent.sortable = true;
			parent.addEventListener("dragenter", fnHover);
			parent.addEventListener("dragover", fnHover);
			parent.addEventListener("drop", e => {
				if (isSortableData(e.dataTransfer)) {
					e.dataTransfer.clearData();
					let data = ko.dataFor(sortableElement),
						from = options.list.indexOf(data),
						to = [...parent.children].indexOf(sortableElement);
					if (from != to) {
						let arr = options.list();
						arr.splice(to, 0, ...arr.splice(from, 1));
						options.list(arr);
					}
					e.preventDefault();
					options.afterMove && options.afterMove();
				}
			});
		}
	}
};

ko.bindingHandlers.link = {
	update: (element, fValueAccessor) => element.href = ko.unwrap(fValueAccessor())
};

ko.bindingHandlers.initDom = {
	init: (element, fValueAccessor) => fValueAccessor()(element)
};

ko.bindingHandlers.onEsc = {
	init: (element, fValueAccessor, fAllBindingsAccessor, viewModel) => {
		let fn = event => {
			if ('Escape' == event.key) {
				element.dispatchEvent(new Event('change'));
				fValueAccessor().call(viewModel);
			}
		};
		element.addEventListener('keyup', fn);
		ko.utils.domNodeDisposal.addDisposeCallback(element, () => element.removeEventListener('keyup', fn));
	}
};

// extenders

ko.extenders.specialThrottle = (target, timeout) => {
	timeout = parseInt(timeout, 10);
	if (0 < timeout) {
		let timer = 0,
			valueForRead = ko.observable(!!target()).extend({ throttle: 10 });

		return ko.computed({
			read: valueForRead,
			write: (bValue) => {
				if (bValue) {
					valueForRead(bValue);
				} else if (valueForRead()) {
					clearTimeout(timer);
					timer = setTimeout(() => {
						valueForRead(false);
						timer = 0;
					}, timeout);
				} else {
					valueForRead(bValue);
				}
			}
		});
	}

	return target;
};

// functions

ko.observable.fn.validateEmail = function() {
	this.hasError = ko.observable(false);

	this.subscribe(value => this.hasError(value && !/^[^@\s]+@[^@\s]+$/.test(value)));

	this.valueHasMutated();
	return this;
};

export default ko;
