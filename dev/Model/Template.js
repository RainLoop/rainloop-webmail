import ko from 'ko';

import { AbstractModel } from 'Knoin/AbstractModel';

class TemplateModel extends AbstractModel {
	/**
	 * @param {string} id
	 * @param {string} name
	 * @param {string} body
	 */
	constructor(id = '', name = '', body = '') {
		super();

		this.id = id;
		this.name = name;
		this.body = body;
		this.populated = true;

		this.deleteAccess = ko.observable(false);
	}

//	static reviveFromJson(json) {}
}

export { TemplateModel, TemplateModel as default };
