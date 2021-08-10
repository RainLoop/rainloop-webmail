import { i18nToNodes } from 'Common/Translator';
import { doc, createElement } from 'Common/Globals';
import { SaveSettingsStep } from 'Common/Enums';
import { arrayLength, isFunction } from 'Common/Utils';

const
	koValue = value => !ko.isObservable(value) && isFunction(value) ? value() : ko.unwrap(value);

ko.bindingHandlers.tooltipErrorTip = {
	init: element => {
		doc.addEventListener('click', () => element.removeAttribute('data-rainloopErrorTip'));
	},
	update: (element, fValueAccessor) => {
		const value = koValue(fValueAccessor());
		if (value) {
			setTimeout(() => element.setAttribute('data-rainloopErrorTip', value), 100);
		} else {
			element.removeAttribute('data-rainloopErrorTip');
		}
	}
};

ko.bindingHandlers.onEnter = {
	init: (element, fValueAccessor, fAllBindings, viewModel) => {
		let fn = event => {
			if ('Enter' == event.key) {
				element.dispatchEvent(new Event('change'));
				fValueAccessor().call(viewModel);
			}
		};
		element.addEventListener('keydown', fn);
		ko.utils.domNodeDisposal.addDisposeCallback(element, () => element.removeEventListener('keydown', fn));
	}
};

ko.bindingHandlers.onSpace = {
	init: (element, fValueAccessor, fAllBindings, viewModel) => {
		let fn = event => {
			if (' ' == event.key) {
				fValueAccessor().call(viewModel, event);
			}
		};
		element.addEventListener('keyup', fn);
		ko.utils.domNodeDisposal.addDisposeCallback(element, () => element.removeEventListener('keyup', fn));
	}
};

ko.bindingHandlers.modal = {
	init: (element, fValueAccessor) => {
		const close = element.querySelector('.close'),
			click = () => fValueAccessor()(false);
		close && close.addEventListener('click.koModal', click);

		ko.utils.domNodeDisposal.addDisposeCallback(element, () =>
			close.removeEventListener('click.koModal', click)
		);
	}
};

ko.bindingHandlers.i18nInit = {
	init: element => i18nToNodes(element)
};

ko.bindingHandlers.i18nUpdate = {
	update: (element, fValueAccessor) => {
		ko.unwrap(fValueAccessor());
		i18nToNodes(element);
	}
};

ko.bindingHandlers.title = {
	update: (element, fValueAccessor) => element.title = ko.unwrap(fValueAccessor())
};

ko.bindingHandlers.command = {
	init: (element, fValueAccessor, fAllBindings, viewModel, bindingContext) => {
		const command = fValueAccessor();

		if (!command || !command.enabled || !command.canExecute) {
			throw new Error('Value should be a command');
		}

		ko.bindingHandlers['FORM'==element.nodeName ? 'submit' : 'click'].init(
			element,
			fValueAccessor,
			fAllBindings,
			viewModel,
			bindingContext
		);
	},
	update: (element, fValueAccessor) => {
		const cl = element.classList,
			command = fValueAccessor();

		let disabled = !command.enabled();

		disabled = disabled || !command.canExecute();
		cl.toggle('disabled', disabled);

		if (element.matches('INPUT,TEXTAREA,BUTTON')) {
			element.disabled = disabled;
		}
	}
};

ko.bindingHandlers.saveTrigger = {
	init: (element) => {
		let icon = element;
		if (element.matches('input,select,textarea')) {
			element.classList.add('settings-saved-trigger-input');
			element.after(element.saveTriggerIcon = icon = createElement('span'));
		}
		icon.classList.add('settings-save-trigger');
	},
	update: (element, fValueAccessor) => {
		const value = parseInt(ko.unwrap(fValueAccessor()),10);
		let cl = (element.saveTriggerIcon || element).classList;
		if (element.saveTriggerIcon) {
			cl.toggle('saving', value === SaveSettingsStep.Animate);
			cl.toggle('success', value === SaveSettingsStep.TrueResult);
			cl.toggle('error', value === SaveSettingsStep.FalseResult);
		}
		cl = element.classList;
		cl.toggle('success', value === SaveSettingsStep.TrueResult);
		cl.toggle('error', value === SaveSettingsStep.FalseResult);
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

					if (arrayLength(list)) {
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
	target.subscribe((() => target(false)).debounce(parseInt(option, 10) || 0));
	return target;
};

// functions

ko.observable.fn.deleteAccessHelper = function() {
	return this.extend({ falseTimeout: 3000, toggleSubscribeProperty: [this, 'deleteAccess'] });
};
