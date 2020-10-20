import ko from 'ko';

import { ContactPropertyModel } from 'Model/ContactProperty';
import { ContactPropertyType } from 'Common/Enums';
import { pInt, pString } from 'Common/Utils';

import { AbstractModel } from 'Knoin/AbstractModel';

class ContactModel extends AbstractModel {
	constructor() {
		super();

		this.id = 0;
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

		if (Array.isNotEmpty(this.properties)) {
			this.properties.forEach(property => {
				if (property) {
					if (ContactPropertyType.FirstName === property[0]) {
						name = (property[1] + ' ' + name).trim();
					} else if (ContactPropertyType.LastName === property[0]) {
						name = (name + ' ' + property[1]).trim();
					} else if (!email && ContactPropertyType.Email === property[0]) {
						email = property[1];
					}
				}
			});
		}

		return email ? [email, name] : null;
	}

	/**
	 * @static
	 * @param {FetchJsonContact} json
	 * @returns {?ContactModel}
	 */
	static reviveFromJson(json) {
		const contact = super.reviveFromJson(json);
		if (contact) {
			contact.id = pInt(json.id);
			contact.display = pString(json.display);
			contact.readOnly = !!json.readOnly;

			let list = [];
			if (Array.isNotEmpty(json.properties)) {
				json.Properties.forEach(property => {
					property = ContactPropertyModel.reviveFromJson(property);
					property && list.push(property);
				});
			}
			contact.properties = list;
			contact.initDefaultProperties();
		}
		return contact;
	}

	initDefaultProperties() {
		let list = this.properties;
		list.sort((p1,p2) =>{
			if (p2.type() == ContactPropertyType.FirstName) {
				return 1;
			}
			if (p1.type() == ContactPropertyType.FirstName || p1.type() == ContactPropertyType.LastName) {
				return -1;
			}
			if (p2.type() == ContactPropertyType.LastName) {
				return 1;
			}
			return 0;
		});
		let found = list.find(prop => prop.type() == ContactPropertyType.LastName);
		if (!found) {
			found = new ContactPropertyModel(ContactPropertyType.LastName);
			list.unshift(found);
		}
		found.placeholder('CONTACTS/PLACEHOLDER_ENTER_LAST_NAME');
		found = list.find(prop => prop.type() == ContactPropertyType.FirstName);
		if (!found) {
			found = new ContactPropertyModel(ContactPropertyType.FirstName);
			list.unshift(found);
		}
		found.placeholder('CONTACTS/PLACEHOLDER_ENTER_FIRST_NAME');
		this.properties = list;
	}

	/**
	 * @returns {string}
	 */
	generateUid() {
		return pString(this.id);
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
