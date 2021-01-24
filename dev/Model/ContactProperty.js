import { pInt, pString } from 'Common/Utils';
import { i18n } from 'Common/Translator';

import { AbstractModel } from 'Knoin/AbstractModel';

const trim = text => null == text ? "" : (text + "").trim();

/**
 * @enum {number}
 */
export const ContactPropertyType = {
	Unknown: 0,

	FullName: 10,

	FirstName: 15,
	LastName: 16,
	MiddleName: 17,
	Nick: 18,

	NamePrefix: 20,
	NameSuffix: 21,

	Email: 30,
	Phone: 31,
	Web: 32,

	Birthday: 40,

	Facebook: 90,
	Skype: 91,
	GitHub: 92,

	Note: 110,

	Custom: 250
};

export class ContactPropertyModel extends AbstractModel {
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

		this.addComputables({
			placeholderValue: () => {
				const v = this.placeholder();
				return v ? i18n(v) : '';
			},

			largeValue: () => ContactPropertyType.Note === this.type()
		});
	}

	isType(type) {
		return this.type && type === this.type();
	}

	isValid() {
		return this.value && !!trim(this.value());
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
