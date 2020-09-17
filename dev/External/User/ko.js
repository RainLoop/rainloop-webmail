const ko = window.ko,
	$ = jQuery;

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
			$el = $(element),
			fValue = fValueAccessor(),
			fAllBindings = fAllBindingsAccessor(),
			inputDelimiters = [',', ';', '\n'];

		$el.inputosaurus({
			parseOnBlur: true,
			allowDragAndDrop: true,
			focusCallback: value => {
				if (fValue && fValue.focused) {
					fValue.focused(!!value);
				}
			},
			inputDelimiters: inputDelimiters,
			autoCompleteSource: fAllBindings.autoCompleteSource || null,
			splitHook: value => {
				const v = value.trim();
				if (v && inputDelimiters.includes(v.substr(-1))) {
					return EmailModel.splitEmailLine(value);
				}
				return null;
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
			fValue.focused.subscribe((value) => {
				$el.inputosaurus(value ? 'focus' : 'blur');
			});
		}
	},
	update: (element, fValueAccessor) => {
		const value = ko.unwrap(fValueAccessor());

		if (element.EmailsTagsValue !== value) {
			element.value = value;
			element.EmailsTagsValue = value;
			$(element).inputosaurus('refresh');
		}
	}
};

ko.bindingHandlers.draggable = {
	init: (element, fValueAccessor, fAllBindingsAccessor) => {
		if (!rl.settings.app('mobile')) {
			const triggerZone = 50,
				scrollSpeed = 3,
				fAllValueFunc = fAllBindingsAccessor(),
				selector = fAllValueFunc ? fAllValueFunc.droppableSelector : '',
				droppable = selector ? document.querySelector(selector) : null,
				conf = {
					distance: 20,
					handle: '.dragHandle',
					cursorAt: { top: 22, left: 3 },
					refreshPositions: true,
					scroll: true,
					drag: null,
					stop: null,
					helper: null
				};
			let bcr;

			if (droppable) {
				conf.drag = event => {
					if (droppable.scrollTopMax) {
						clearInterval(droppable.timerScroll);
						if (droppable.scrollTop
							&& bcr.top < event.clientY
							&& bcr.top + triggerZone > event.clientY)
						{
							droppable.timerScroll = setInterval(() => droppable.scrollTop -= scrollSpeed, 10);
						}
						else if (droppable.scrollTop < droppable.scrollTopMax
							&& bcr.bottom > event.clientY
							&& bcr.bottom - triggerZone < event.clientY)
						{
							droppable.timerScroll = setInterval(() => droppable.scrollTop += scrollSpeed, 10);
						}
						else {
							clearInterval(droppable.timerScroll);
						}
					}
				};

				conf.stop = () => clearInterval(droppable.timerScroll);
			}

			conf.helper = event => fValueAccessor()(event && event.target ? ko.dataFor(event.target) : null);

			$(element)
				.draggable(conf)
				.on('mousedown.koDraggable', () => {
					require('Common/Utils').removeInFocus();
					bcr = droppable ? droppable.getBoundingClientRect() : null;
				});

			ko.utils.domNodeDisposal.addDisposeCallback(element, () =>
				$(element)
					.off('mousedown.koDraggable')
					.draggable('destroy')
			);
		}
	}
};

ko.bindingHandlers.droppable = {
	init: (element, fValueAccessor, fAllBindingsAccessor) => {
		if (!rl.settings.app('mobile')) {
			const fValueFunc = fValueAccessor(),
				fAllValueFunc = fAllBindingsAccessor(),
				fOverCallback = fAllValueFunc && fAllValueFunc.droppableOver ? fAllValueFunc.droppableOver : null,
				fOutCallback = fAllValueFunc && fAllValueFunc.droppableOut ? fAllValueFunc.droppableOut : null,
				conf = {
					tolerance: 'pointer',
					hoverClass: 'droppableHover',
					drop: null,
					over: null,
					out: null
				};

			if (fValueFunc) {
				conf.drop = (event, ui) => {
					fValueFunc(event, ui);
				};

				if (fOverCallback) {
					conf.over = (event, ui) => {
						fOverCallback(event, ui);
					};
				}

				if (fOutCallback) {
					conf.out = (event, ui) => {
						fOutCallback(event, ui);
					};
				}

				$(element).droppable(conf);

				ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
					$(element).droppable('destroy');
				});
			}
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
