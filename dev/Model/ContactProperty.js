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
		super();

		this.addObservables({
			type: pInt(type),
			typeStr: pString(typeStr),
			focused: !!focused,
			value: pString(value),

			placeholder: placeholder
		});

		this.placeholderValue = ko.computed(() => {
			const v = this.placeholder();
			return v ? i18n(v) : '';
		});

		this.largeValue = ko.computed(() => ContactPropertyType.Note === this.type());
	}

	toJSON() {
		return {
			type: this.type(),
			typeStr: this.typeStr(),
			value: this.value()
		};
	}

//	static reviveFromJson(json) {}
}

export { ContactPropertyModel, ContactPropertyModel as default };
