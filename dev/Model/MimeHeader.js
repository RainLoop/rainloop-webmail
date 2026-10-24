import ko from 'ko';

import { AbstractModel } from 'Knoin/AbstractModel';

export class MimeHeaderModel extends AbstractModel
{
	constructor() {
		super();
		this.name = '';
		this.value = '';
		this.parameters = ko.observableArray();
	}
}
