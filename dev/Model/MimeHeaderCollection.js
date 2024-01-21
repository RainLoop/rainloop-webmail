import { AbstractCollectionModel } from 'Model/AbstractCollection';
import { MimeHeaderModel } from 'Model/MimeHeader';

'use strict';

export class MimeHeaderCollectionModel extends AbstractCollectionModel
{
	/**
	 * @param {?Array} json
	 * @returns {MimeHeaderCollectionModel}
	 */
	static reviveFromJson(items) {
		return super.reviveFromJson(items, header => MimeHeaderModel.reviveFromJson(header));
	}

	/**
	 * @param {string} name
	 * @returns {?MimeHeader}
	 */
	getByName(name)
	{
		name = name.toLowerCase();
		return this.find(header => header.name.toLowerCase() === name);
	}

	valueByName(name)
	{
		const header = this.getByName(name);
		return header ? header.value : '';
	}

}
