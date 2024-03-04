import { isArray, forEachObjectEntry } from 'Common/Utils';

export class AbstractCollectionModel extends Array
{
	constructor() {
/*
		if (new.target === AbstractCollectionModel) {
			throw Error("Can't instantiate AbstractCollectionModel!");
		}
*/
		super();
	}

	onDestroy() {
		this.forEach(item => item.onDestroy?.());
	}

	/**
	 * @static
	 * @param {FetchJson} json
	 * @returns {*CollectionModel}
	 */
	static reviveFromJson(json, itemCallback) {
		const result = new this();
		if (json) {
			if ('Collection/'+this.name.replace('Model', '') === json['@Object']) {
				forEachObjectEntry(json, (key, value) => '@' !== key[0] && (result[key] = value));
				json = json['@Collection'];
			}
			isArray(json) && json.forEach(item => {
				item && itemCallback && (item = itemCallback(item, result));
				item && result.push(item);
			});
		}
		return result;
	}

}
