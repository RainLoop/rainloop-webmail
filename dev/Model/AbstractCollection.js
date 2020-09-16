
export class AbstractCollectionModel extends Array
{
	constructor(props) {
		super();
		props && Object.entries(props).forEach(([key, value]) => '@' !== key[0] && (this[key] = value));
//		props[@Count]
	}

	static getFromJSON(object, name) {
		return object && 'Collection/'+name === object['@Object'] && Array.isArray(object['@Collection'])
			? object['@Collection']
			: null;
	}
}
