
export class AbstractCollectionModel extends Array
{
	constructor() {
/*
		if (new.target === AbstractCollectionModel) {
			throw new Error("Can't instantiate AbstractCollectionModel!");
		}
*/
		super();
	}

	/**
	 * @static
	 * @param {FetchJson} json
	 * @returns {*CollectionModel}
	 */
	static reviveFromJson(json, itemCallback) {
		if (json) {
			const result = new this();
			if ('Collection/'+this.name.replace('Model', '') === json['@Object']) {
				Object.entries(json).forEach(([key, value]) => '@' !== key[0] && (result[key] = value));
//				json[@Count]
				json = json['@Collection'];
			}
			if (Array.isArray(json)) {
				json.forEach(item => {
					item && itemCallback && (item = itemCallback(item, result));
					item && result.push(item);
				});
				return result;
			}
		}
		return null;
	}

}
