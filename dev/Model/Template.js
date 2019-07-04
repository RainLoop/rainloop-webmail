import ko from 'ko';

import { pString } from 'Common/Utils';

import { AbstractModel } from 'Knoin/AbstractModel';

class TemplateModel extends AbstractModel {
	/**
	 * @param {string} id
	 * @param {string} name
	 * @param {string} body
	 */
	constructor(id, name, body) {
		super('TemplateModel');

		this.id = id;
		this.name = name;
		this.body = body;
		this.populated = true;

		this.deleteAccess = ko.observable(false);
	}

	/**
	 * @returns {boolean}
	 */
	parse(json) {
		let result = false;
		if (json && 'Object/Template' === json['@Object']) {
			this.id = pString(json.ID);
			this.name = pString(json.Name);
			this.body = pString(json.Body);
			this.populated = !!json.Populated;

			result = true;
		}

		return result;
	}
}

export { TemplateModel, TemplateModel as default };
