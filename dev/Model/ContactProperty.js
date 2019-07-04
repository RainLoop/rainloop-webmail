import ko from 'ko';

import { ContactPropertyType } from 'Common/Enums';
import { pInt, pString } from 'Common/Utils';
import { i18n } from 'Common/Translator';

import { AbstractModel } from 'Knoin/AbstractModel';

class ContactPropertyModel extends AbstractModel {
	/**
	 * @param {number=} type = Enums.ContactPropertyType.Unknown
	 * @param {string=} typeStr = ''
	 * @param {string=} value = ''
	 * @param {boolean=} focused = false
	 * @param {string=} placeholder = ''
	 */
	constructor(type = ContactPropertyType.Unknown, typeStr = '', value = '', focused = false, placeholder = '') {
		super('ContactPropertyModel');

		this.type = ko.observable(pInt(type));
		this.typeStr = ko.observable(pString(typeStr));
		this.focused = ko.observable(!!focused);
		this.value = ko.observable(pString(value));

		this.placeholder = ko.observable(placeholder);

		this.placeholderValue = ko.computed(() => {
			const v = this.placeholder();
			return v ? i18n(v) : '';
		});

		this.largeValue = ko.computed(() => ContactPropertyType.Note === this.type());

		this.regDisposables([this.placeholderValue, this.largeValue]);
	}
}

export { ContactPropertyModel, ContactPropertyModel as default };
