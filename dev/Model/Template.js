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
		super();

		this.id = id;
		this.name = name;
		this.body = body;
		this.populated = true;

		this.deleteAccess = ko.observable(false);
	}

	/**
	 * @static
	 * @param {FetchJsonTemplate} json
	 * @returns {?TemplateModel}
	 */
	static reviveFromJson(json) {
		const template = super.reviveFromJson(json);
		if (template) {
			template.id = pString(json.ID);
			template.name = pString(json.Name);
			template.body = pString(json.Body);
			template.populated = !!json.Populated;
		}
		return template;
	}
}

export { TemplateModel, TemplateModel as default };
