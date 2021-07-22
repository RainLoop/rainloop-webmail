import { arrayLength } from 'Common/Utils';
import { ContactPropertyModel, ContactPropertyType } from 'Model/ContactProperty';
import { AbstractModel } from 'Knoin/AbstractModel';

export class ContactModel extends AbstractModel {
	constructor() {
		super();

		this.id = 0;
		this.display = '';
		this.properties = [];
		this.readOnly = false;

		this.addObservables({
			focused: false,
			selected: false,
			checked: false,
			deleted: false
		});
	}

	/**
	 * @returns {Array|null}
	 */
	getNameAndEmailHelper() {
		let name = '',
			email = '';

		if (arrayLength(this.properties)) {
			this.properties.forEach(property => {
				if (property) {
					if (ContactPropertyType.FirstName === property.type()) {
						name = (property.value() + ' ' + name).trim();
					} else if (ContactPropertyType.LastName === property.type()) {
						name = (name + ' ' + property.value()).trim();
					} else if (!email && ContactPropertyType.Email === property.type()) {
						email = property.value();
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
			let list = [];
			if (arrayLength(json.properties)) {
				json.properties.forEach(property => {
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
		return ''+this.id;
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
