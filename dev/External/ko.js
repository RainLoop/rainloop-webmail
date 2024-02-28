import ko from 'ko';
import { i18nToNodes } from 'Common/Translator';
import { doc, createElement } from 'Common/Globals';
import { SaveSettingStatus } from 'Common/Enums';
import { isFunction, forEachObjectEntry } from 'Common/Utils';

export const
	errorTip = (element, value) => value
			? setTimeout(() => element.setAttribute('data-rainloopErrorTip', value), 100)
			: element.removeAttribute('data-rainloopErrorTip'),

	/**
	 * The value of the pureComputed observable shouldn’t vary based on the
	 * number of evaluations or other “hidden” information. Its value should be
	 * based solely on the values of other observables in the application
	 */
	koComputable = fn => ko.computed(fn, {'pure':true}),

	addObservablesTo = (target, observables) =>
		forEachObjectEntry(observables, (key, value) =>
			target[key] || (target[key] = /*isArray(value) ? ko.observableArray(value) :*/ ko.observable(value)) ),

	addComputablesTo = (target, computables) =>
		forEachObjectEntry(computables, (key, fn) => target[key] = koComputable(fn)),

	addSubscribablesTo = (target, subscribables) =>
		forEachObjectEntry(subscribables, (key, fn) => target[key].subscribe(fn)),

	dispose = disposable => isFunction(disposable?.dispose) && disposable.dispose(),

	onEvent = (element, event, fn) => {
		element.addEventListener(event, fn);
		ko.utils.domNodeDisposal.addDisposeCallback(element, () => element.removeEventListener(event, fn));
	},

	onKey = (key, element, fValueAccessor, fAllBindings, model) => {
		let fn = event => {
			if (key == event.key) {
//				stopEvent(event);
//				element.dispatchEvent(new Event('change'));
				fValueAccessor().call(model);
			}
		};
		onEvent(element, 'keydown', fn);
	},

	// With this we don't need delegateRunOnDestroy
	koArrayWithDestroy = data => {
		data = ko.observableArray(data);
		data.subscribe(changes =>
			changes.forEach(item =>
				'deleted' === item.status && null == item.moved && item.value.onDestroy?.()
			)
		, data, 'arrayChange');
		return data;
	};

Object.assign(ko.bindingHandlers, {
	tooltipErrorTip: {
		init: (element, fValueAccessor) => {
			doc.addEventListener('click', () => {
				let value = fValueAccessor();
				ko.isObservable(value) && !ko.isComputed(value) && value('');
				errorTip(element);
			});
		},
		update: (element, fValueAccessor) => {
			let value = ko.unwrap(fValueAccessor());
			value = isFunction(value) ? value() : value;
			errorTip(element, value);
		}
	},

	onEnter: {
		init: (element, fValueAccessor, fAllBindings, model) =>
			onKey('Enter', element, fValueAccessor, fAllBindings, model)
	},

	onEsc: {
		init: (element, fValueAccessor, fAllBindings, model) =>
			onKey('Escape', element, fValueAccessor, fAllBindings, model)
	},

	onSpace: {
		init: (element, fValueAccessor, fAllBindings, model) =>
			onKey(' ', element, fValueAccessor, fAllBindings, model)
	},

	toggle: {
		init: (element, fValueAccessor) => {
			let observable = fValueAccessor(),
				fn = () => observable(!observable());
			onEvent(element, 'click', fn);
			onEvent(element, 'keydown', event => ' ' == event.key && fn());
		}
	},

	i18nUpdate: {
		update: (element, fValueAccessor) => {
			ko.unwrap(fValueAccessor());
			i18nToNodes(element);
		}
	},

	command: {
		init: (element, fValueAccessor, fAllBindings, viewModel, bindingContext) => {
			const command = fValueAccessor();

			if (!command || !command.canExecute) {
				throw Error('Value should be a command');
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
			let disabled = !fValueAccessor().canExecute();
			element.classList.toggle('disabled', disabled);

			if (element.matches('INPUT,TEXTAREA,BUTTON')) {
				element.disabled = disabled;
			}
		}
	},

	saveTrigger: {
		init: (element) => {
			let icon = element;
			if (element.matches('input,select,textarea')) {
				element.classList.add('settings-save-trigger-input');
				element.after(element.saveTriggerIcon = icon = createElement('span'));
			}
			icon.classList.add('settings-save-trigger');
		},
		update: (element, fValueAccessor) => {
			const value = parseInt(ko.unwrap(fValueAccessor()),10);
			let cl = (element.saveTriggerIcon || element).classList;
			if (element.saveTriggerIcon) {
				cl.toggle('saving', value === SaveSettingStatus.Saving);
				cl.toggle('success', value === SaveSettingStatus.Success);
				cl.toggle('error', value === SaveSettingStatus.Failed);
			}
			cl = element.classList;
			cl.toggle('success', value === SaveSettingStatus.Success);
			cl.toggle('error', value === SaveSettingStatus.Failed);
		}
	}
});

// extenders

ko.extenders.toggleSubscribeProperty = (target, options) => {
	const prop = options[1];
	if (prop) {
		target.subscribe(
			prev => prev?.[prop]?.(false),
			options[0],
			'beforeChange'
		);

		target.subscribe(next => next?.[prop]?.(true), options[0]);
	}

	return target;
};

ko.extenders.falseTimeout = (target, option) => {
	target.subscribe((() => target(false)).debounce(parseInt(option, 10) || 0));
	return target;
};

// functions

ko.observable.fn.askDeleteHelper = function() {
	return this.extend({ falseTimeout: 3000, toggleSubscribeProperty: [this, 'askDelete'] });
};
