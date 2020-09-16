const
	$ = jQuery,
	doc = document,
	ko = window.ko,
	Translator = () => require('Common/Translator'),
	Globals = () => require('Common/Globals'),
	isFunction = v => typeof v === 'function';

ko.bindingHandlers.tooltip = {
	init: (element, fValueAccessor) => {
		const fValue = fValueAccessor(),
			Global = Globals();

		if (!Global.bMobileDevice || 'on' === element.dataset.tooltipMobile) {
			const sValue = !ko.isObservable(fValue) && isFunction(fValue) ? fValue() : ko.unwrap(fValue);

			if ('off' === element.dataset.tooltipI18n) {
				element.title = sValue;
			} else {
				element.title = Translator().i18n(sValue);
				Translator().trigger.subscribe(() =>
					element.title = Translator().i18n(sValue)
				);
				Global.dropdownVisibility.subscribe(() =>
					element.title = Translator().i18n(sValue)
				);
			}
		}
	},
	update: (element, fValueAccessor) => {
		const fValue = fValueAccessor();

		if (!Globals().bMobileDevice || 'on' === element.dataset.tooltipMobile) {
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
		const conf = ko.unwrap(fValueAccessor());
		element.title = conf.content; // conf.title
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

ko.bindingHandlers.modal = {
	init: (element, fValueAccessor) => {
		element.classList.toggle('fade', !Globals().bMobileDevice);

		const close = element.querySelector('.close'), click = () => fValueAccessor()(false);
		close && close.addEventListener('click.koModal', click);

		ko.utils.domNodeDisposal.addDisposeCallback(element, () =>
			close.removeEventListener('click.koModal', click)
		);
	}
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

ko.bindingHandlers.title = {
	update: (element, fValueAccessor) => element.title = ko.unwrap(fValueAccessor())
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
		ko.bindingHandlers['FORM'==element.nodeName ? 'submit' : 'click'].init(
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

		if (element.nodeName.match(/INPUT|TEXTAREA|BUTTON/)) {
			element.disabled = !result;
		}
	}
};

// extenders

ko.extenders.limitedList = (target, limitedList) => {
	const result = ko
			.computed({
				read: target,
				write: (newValue) => {
					const currentValue = ko.unwrap(target),
						list = ko.unwrap(limitedList);

					if (Array.isNotEmpty(list)) {
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

// functions

ko.observable.fn.deleteAccessHelper = function() {
	this.extend({ falseTimeout: 3000 }).extend({ toggleSubscribeProperty: [this, 'deleteAccess'] });
	return this;
};

export default ko;
