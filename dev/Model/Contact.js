import _ from '_';
import ko from 'ko';

import { ContactPropertyType } from 'Common/Enums';
import { trim, isNonEmptyArray, isNormal, pInt, pString } from 'Common/Utils';
import { emptyContactPic } from 'Common/Links';

import { AbstractModel } from 'Knoin/AbstractModel';

class ContactModel extends AbstractModel {
	constructor() {
		super('ContactModel');

		this.idContact = 0;
		this.display = '';
		this.properties = [];
		this.readOnly = false;

		this.focused = ko.observable(false);
		this.selected = ko.observable(false);
		this.checked = ko.observable(false);
		this.deleted = ko.observable(false);
	}

	/**
	 * @returns {Array|null}
	 */
	getNameAndEmailHelper() {
		let name = '',
			email = '';

		if (isNonEmptyArray(this.properties)) {
			_.each(this.properties, (property) => {
				if (property) {
					if (ContactPropertyType.FirstName === property[0]) {
						name = trim(property[1] + ' ' + name);
					} else if (ContactPropertyType.LastName === property[0]) {
						name = trim(name + ' ' + property[1]);
					} else if ('' === email && ContactPropertyType.Email === property[0]) {
						email = property[1];
					}
				}
			});
		}

		return '' === email ? null : [email, name];
	}

	/**
	 * @param {Object} oItem
	 * @returns {boolean}
	 */
	parse(json) {
		let result = false;
		if (json && 'Object/Contact' === json['@Object']) {
			this.idContact = pInt(json.IdContact);
			this.display = pString(json.Display);
			this.readOnly = !!json.ReadOnly;

			if (isNonEmptyArray(json.Properties)) {
				_.each(json.Properties, (property) => {
					if (property && property.Type && isNormal(property.Value) && isNormal(property.TypeStr)) {
						this.properties.push([pInt(property.Type), pString(property.Value), pString(property.TypeStr)]);
					}
				});
			}

			result = true;
		}

		return result;
	}

	/**
	 * @returns {string}
	 */
	srcAttr() {
		return emptyContactPic();
	}

	/**
	 * @returns {string}
	 */
	generateUid() {
		return pString(this.idContact);
	}

	/**
	 * @return string
	 */
	lineAsCss() {
		const result = [];
		if (this.deleted()) {
			result.push('deleted');
		}
		if (this.selected()) {
			result.push('selected');
		}
		if (this.checked()) {
			result.push('checked');
		}
		if (this.focused()) {
			result.push('focused');
		}

		return result.join(' ');
	}
}

export { ContactModel, ContactModel as default };
