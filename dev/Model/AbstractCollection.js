
export class AbstractCollectionModel extends Array
{
	constructor(props) {
/*
		if (new.target === Parent) {
			throw new Error("Can't instantiate abstract class!");
		}
*/
		super();
		props && Object.entries(props).forEach(([key, value]) => '@' !== key[0] && (this[key] = value));
//		props[@Count]
	}

	static getFromJSON(object, name) {
		return object && 'Collection/'+name === object['@Object'] && Array.isArray(object['@Collection'])
			? object['@Collection']
			: null;
	}

	static reviveFromJson(object, itemCallback) {
		// FolderCollectionModel     => FolderCollection
		// AttachmentCollectionModel => AttachmentCollection
		// MessageCollectionModel    => MessageCollection
		const name = this.name.replace('Model', ''),
			collection = this.getFromJSON(object, name);
		if (collection) {
			const result = new this(object);
			collection.forEach(item => {
				item && itemCallback && (item = itemCallback(item, result));
				item && result.push(item);
			});
			return result;
		}
	}

}
