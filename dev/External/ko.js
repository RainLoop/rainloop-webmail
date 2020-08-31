import { SaveSettingsStep } from 'Common/Enums';

const
	$ = jQuery,
	doc = document,
	ko = window.ko,
	Translator = () => require('Common/Translator'),
	isFunction = v => typeof v === 'function';

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

ko.bindingHandlers.visibleAnimated = {
	init: (element, fValueAccessor) => element.hidden = !ko.unwrap(fValueAccessor()),
	update: (element, fValueAccessor) => element.hidden = !ko.unwrap(fValueAccessor())
};

ko.bindingHandlers.tooltip = {
	init: (element, fValueAccessor) => {
		const fValue = fValueAccessor(),
			Globals = require('Common/Globals');

		if (!Globals.bMobileDevice || 'on' === element.dataset.tooltipMobile) {
			const sValue = !ko.isObservable(fValue) && isFunction(fValue) ? fValue() : ko.unwrap(fValue);

			if ('off' === element.dataset.tooltipI18n) {
				element.title = sValue;
			} else {
				element.title = Translator().i18n(sValue);
				Translator().trigger.subscribe(() =>
					element.title = Translator().i18n(sValue)
				);
				Globals.dropdownVisibility.subscribe(() =>
					element.title = Translator().i18n(sValue)
				);
			}
		}
	},
	update: (element, fValueAccessor) => {
		const fValue = fValueAccessor(),
			Globals = require('Common/Globals');

		if (!Globals.bMobileDevice || 'on' === element.dataset.tooltipMobile) {
			const sValue = !ko.isObservable(fValue) && isFunction(fValue) ? fValue() : ko.unwrap(fValue);
			if (sValue) {
				element.title = 'off' === element.dataset.tooltipI18n ? sValue : Translator().i18n(sValue);
			} else {
				element.title = '';
			}
		}
	}
};

ko.bindingHandlers.tooltipErrorTip = {
	init: element => {
		doc.addEventListener('click', () => element.removeAttribute('data-rainloopErrorTip'));
		ko.utils.domNodeDisposal.addDisposeCallback(element, () => element.removeAttribute('data-rainloopErrorTip'));
	},
	update: (element, fValueAccessor) => {
		const fValue = fValueAccessor(),
			value = !ko.isObservable(fValue) && isFunction(fValue) ? fValue() : ko.unwrap(fValue);

		if (value) {
			setTimeout(() => element.setAttribute('data-rainloopErrorTip', value), 100);
		} else {
			element.removeAttribute('data-rainloopErrorTip');
		}
	}
};

ko.bindingHandlers.registrateBootstrapDropdown = {
	init: element => {
		rl.Dropdowns.registrate(element);
		element.ddBtn = new BSN.Dropdown(element.querySelector('[data-toggle="dropdown"]'));
	}
};

ko.bindingHandlers.openDropdownTrigger = {
	update: (element, fValueAccessor) => {
		if (ko.unwrap(fValueAccessor())) {
			const el = element.ddBtn;
			el.open || el.Dropdown.toggle();
//			el.focus();

			rl.Dropdowns.detectVisibility();
			fValueAccessor()(false);
		}
	}
};

ko.bindingHandlers.dropdownCloser = {
	init: element => element.closest('.dropdown').addEventListener('click', event =>
		event.target.closestWithin('.e-item', element) && element.ddBtn.Dropdown.toggle()
	)
};

ko.bindingHandlers.popover = {
	init: (element, fValueAccessor) => {
		console.log('TODO: $(element).popover removed', element, fValueAccessor);
/*
		$(element).popover(ko.unwrap(fValueAccessor()));
		ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			$(element).popover('destroy');
		});
*/
	}
};

ko.bindingHandlers.onEnter = {
	init: (element, fValueAccessor, fAllBindingsAccessor, viewModel) => {
		$(element).on('keypress.koOnEnter', (event) => {
			if (event && 13 === parseInt(event.keyCode, 10)) {
				$(element).trigger('change');
				fValueAccessor().call(viewModel);
			}
		});

		ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			$(element).off('keypress.koOnEnter');
		});
	}
};

ko.bindingHandlers.onSpace = {
	init: (element, fValueAccessor, fAllBindingsAccessor, viewModel) => {
		$(element).on('keyup.koOnSpace', (event) => {
			if (event && 32 === parseInt(event.keyCode, 10)) {
				fValueAccessor().call(viewModel, event);
			}
		});

		ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			$(element).off('keyup.koOnSpace');
		});
	}
};

ko.bindingHandlers.onEsc = {
	init: (element, fValueAccessor, fAllBindingsAccessor, viewModel) => {
		$(element).on('keyup.koOnEsc', (event) => {
			if (event && 27 === parseInt(event.keyCode, 10)) {
				$(element).trigger('change');
				fValueAccessor().call(viewModel);
			}
		});

		ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
			$(element).off('keyup.koOnEsc');
		});
	}
};

ko.bindingHandlers.modal = {
	init: (element, fValueAccessor) => {
		const Globals = require('Common/Globals');

		element.classList.toggle('fade', !Globals.bMobileDevice);
		new BSN.Modal(element, {
			'keyboard': false,
			'show': ko.unwrap(fValueAccessor())
		});
		const close = element.querySelector('.close'), click = () => fValueAccessor()(false);
		close && close.addEventListener('click.koModal', click);

		ko.utils.domNodeDisposal.addDisposeCallback(element, () =>
			close.removeEventListener('click.koModal', click)
		);
	},
	update: (element, fValueAccessor) => {
		const htmlCL = doc.documentElement.classList;

		element.Modal[ko.unwrap(fValueAccessor()) ? 'show' : 'hide']();

		if (htmlCL.contains('no-mobile')) {
			htmlCL.add('rl-modal-animation');
			setTimeout(() => htmlCL.remove('rl-modal-animation'), 500);
		}
	}
};

let ttn = (element, fValueAccessor) => require('Common/Momentor').timeToNode(element, ko.unwrap(fValueAccessor()));
ko.bindingHandlers.moment = {
	init: ttn,
	update: ttn
};

ko.bindingHandlers.i18nInit = {
	init: element => Translator().i18nToNodes(element)
};

ko.bindingHandlers.i18nUpdate = {
	update: (element, fValueAccessor) => {
		ko.unwrap(fValueAccessor());
		Translator().i18nToNodes(element);
	}
};

ko.bindingHandlers.link = {
	update: (element, fValueAccessor) => element.href = ko.unwrap(fValueAccessor())
};

ko.bindingHandlers.title = {
	update: (element, fValueAccessor) => element.title = ko.unwrap(fValueAccessor())
};

ko.bindingHandlers.initDom = {
	init: (element, fValueAccessor) => fValueAccessor()(element)
};

ko.bindingHandlers.draggable = {
	init: (element, fValueAccessor, fAllBindingsAccessor) => {
		const Globals = require('Common/Globals'),
			Utils = require('Common/Utils');

		if (!Globals.bMobileDevice) {
			const triggerZone = 50,
				scrollSpeed = 3,
				fAllValueFunc = fAllBindingsAccessor(),
				selector = fAllValueFunc ? fAllValueFunc.droppableSelector : '',
				droppable = selector ? doc.querySelector(selector) : null,
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
					Utils.removeInFocus();
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
		const Globals = require('Common/Globals');
		if (!Globals.bMobileDevice) {
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

ko.bindingHandlers.saveTrigger = {
	init: (element) => {
		element.saveTriggerType = element.matches('input[type=text],input[type=email],input[type=password],select,textarea')
			 ? 'input' : 'custom';

		if ('custom' === element.saveTriggerType) {
			element.append(
				'&nbsp;&nbsp;',
				Element.fromHTML('<i class="icon-spinner animated"></i>'),
				Element.fromHTML('<i class="icon-remove error"></i>'),
				Element.fromHTML('<i class="icon-ok success"></i>')
			);
			element.classList.add('settings-saved-trigger');
		} else {
			element.classList.add('settings-saved-trigger-input');
		}
	},
	update: (element, fValueAccessor) => {
		const value = parseInt(ko.unwrap(fValueAccessor()),10);
		if ('custom' === element.saveTriggerType) {
			element.querySelector('.animated').hidden = value !== SaveSettingsStep.Animate;
			element.querySelector('.success').hidden = value !== SaveSettingsStep.TrueResult;
			element.querySelector('.error').hidden = value !== SaveSettingsStep.FalseResult;
		} else if (value !== SaveSettingsStep.Animate) {
			element.classList.toggle('success', value === SaveSettingsStep.TrueResult);
			element.classList.toggle('error', value === SaveSettingsStep.FalseResult);
		}
	}
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

ko.bindingHandlers.command = {
	init: (element, fValueAccessor, fAllBindingsAccessor, viewModel, bindingContext) => {
		const command = fValueAccessor();

		if (!command || !command.isCommand) {
			throw new Error('Value should be a command');
		}

		if (!command.enabled) {
			command.enabled = ko.observable(true);
		}

		if (!command.canExecute) {
			const __realCanExecute = command.__realCanExecute;
			if (isFunction(__realCanExecute)) {
				command.canExecute = ko.computed(() => command.enabled() && __realCanExecute.call(viewModel, viewModel));
			} else {
				command.canExecute = ko.computed(() => command.enabled() && !!__realCanExecute);
			}
		}

		element.classList.add('command');
		ko.bindingHandlers[element.tagName.match(/FORM/i) ? 'submit' : 'click'].init(
			element,
			fValueAccessor,
			fAllBindingsAccessor,
			viewModel,
			bindingContext
		);
	},
	update: (element, fValueAccessor) => {
		const cl = element.classList,
			command = fValueAccessor();

		let result = command.enabled();

		cl.toggle('command-not-enabled', !result);

		if (result) {
			result = command.canExecute();
			cl.toggle('command-can-not-be-execute', !result);
		}

		['command-disabled','disable','disabled'].forEach(s=>cl.toggle(s, !result));
		cl.toggle('no-disabled', !!result);

		if (element.tagName.match(/INPUT|TEXTAREA|BUTTON/i)) {
			element.disabled = !result;
		}
	}
};

// extenders

ko.extenders.posInterer = (target, defaultVal) => {
	const Utils = require('Common/Utils'),
		result = ko.computed({
			read: target,
			write: (newValue) => {
				let val = Utils.pInt(newValue.toString(), defaultVal);
				if (0 >= val) {
					val = defaultVal;
				}

				if (val === target() && '' + val !== '' + newValue) {
					target(val + 1);
				}

				target(val);
			}
		});

	result(target());
	return result;
};

ko.extenders.limitedList = (target, limitedList) => {
	const result = ko
			.computed({
				read: target,
				write: (newValue) => {
					const currentValue = ko.unwrap(target),
						list = ko.unwrap(limitedList);

					if (Array.isArray(list) && list.length) {
						if (list.includes(newValue)) {
							target(newValue);
						} else if (list.includes(currentValue, list)) {
							target(currentValue + ' ');
							target(currentValue);
						} else {
							target(list[0] + ' ');
							target(list[0]);
						}
					} else {
						target('');
					}
				}
			})
			.extend({ notify: 'always' });

	result(target());

	if (!result.valueHasMutated) {
		result.valueHasMutated = () => target.valueHasMutated();
	}

	return result;
};

ko.extenders.reversible = (target) => {
	let value = target();

	target.commit = () => value = target();

	target.reverse = () => target(value);

	target.commitedValue = () => value;
	return target;
};

ko.extenders.toggleSubscribe = (target, options) => {
	target.subscribe(options[1], options[0], 'beforeChange');
	target.subscribe(options[2], options[0]);
	return target;
};

ko.extenders.toggleSubscribeProperty = (target, options) => {
	const prop = options[1];
	if (prop) {
		target.subscribe(
			prev => prev && prev[prop] && prev[prop](false),
			options[0],
			'beforeChange'
		);

		target.subscribe(next => next && next[prop] && next[prop](true), options[0]);
	}

	return target;
};

ko.extenders.falseTimeout = (target, option) => {
	target.iFalseTimeoutTimeout = 0;
	target.subscribe(value => {
		if (value) {
			clearTimeout(target.iFalseTimeoutTimeout);
			target.iFalseTimeoutTimeout = setTimeout(() => {
				target(false);
				target.iFalseTimeoutTimeout = 0;
			}, parseInt(option, 10) || 0);
		}
	});

	return target;
};

ko.extenders.specialThrottle = (target, option) => {
	target.iSpecialThrottleTimeoutValue = require('Common/Utils').pInt(option);
	if (0 < target.iSpecialThrottleTimeoutValue) {
		target.iSpecialThrottleTimeout = 0;
		target.valueForRead = ko.observable(!!target()).extend({ throttle: 10 });

		return ko.computed({
			read: target.valueForRead,
			write: (bValue) => {
				if (bValue) {
					target.valueForRead(bValue);
				} else if (target.valueForRead()) {
					clearTimeout(target.iSpecialThrottleTimeout);
					target.iSpecialThrottleTimeout = setTimeout(() => {
						target.valueForRead(false);
						target.iSpecialThrottleTimeout = 0;
					}, target.iSpecialThrottleTimeoutValue);
				} else {
					target.valueForRead(bValue);
				}
			}
		});
	}

	return target;
};

ko.extenders.idleTrigger = (target) => {
	target.trigger = ko.observable(SaveSettingsStep.Idle);
	return target;
};

// functions

ko.observable.fn.idleTrigger = function() {
	return this.extend({ 'idleTrigger': true });
};

ko.observable.fn.validateEmail = function() {
	this.hasError = ko.observable(false);

	this.subscribe(value => this.hasError(value && !/^[^@\s]+@[^@\s]+$/.test(value)));

	this.valueHasMutated();
	return this;
};

ko.observable.fn.deleteAccessHelper = function() {
	this.extend({ falseTimeout: 3000 }).extend({ toggleSubscribeProperty: [this, 'deleteAccess'] });
	return this;
};

export default ko;
