import 'External/ko';
import ko from 'ko';
import { SaveSettingsStep } from 'Common/Enums';
import { pInt } from 'Common/Utils';

ko.bindingHandlers.saveTrigger = {
	init: (element) => {
		element.saveTriggerType = element.matches('input[type=text],input[type=email],input[type=password],select,textarea')
			 ? 'input' : 'custom';

		if ('custom' === element.saveTriggerType) {
			element.append(
				'  ',
				Element.fromHTML('<i class="icon-spinner"></i>'),
				Element.fromHTML('<i class="fontastic error">✖</i>'),
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
			element.querySelector('.icon-spinner').hidden = value !== SaveSettingsStep.Animate;
			element.querySelector('.success').hidden = value !== SaveSettingsStep.TrueResult;
			element.querySelector('.error').hidden = value !== SaveSettingsStep.FalseResult;
		} else if (value !== SaveSettingsStep.Animate) {
			element.classList.toggle('success', value === SaveSettingsStep.TrueResult);
			element.classList.toggle('error', value === SaveSettingsStep.FalseResult);
		}
	}
};

ko.extenders.idleTrigger = (target) => {
	target.trigger = ko.observable(SaveSettingsStep.Idle);
	return target;
};

ko.extenders.posInterer = (target, defaultVal) => {
	const result = ko.computed({
			read: target,
			write: newValue => {
				let val = pInt(newValue.toString(), defaultVal);
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

// functions

ko.observable.fn.idleTrigger = function() {
	return this.extend({ 'idleTrigger': true });
};
