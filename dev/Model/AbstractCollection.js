
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

	/**
	 * @static
	 * @param {FetchJson} json
	 * @returns {*CollectionModel}
	 */
	static reviveFromJson(json, itemCallback) {
		// FolderCollectionModel     => FolderCollection
		// AttachmentCollectionModel => AttachmentCollection
		// MessageCollectionModel    => MessageCollection
		if (json && 'Collection/'+this.name.replace('Model', '') === json['@Object']
		 && Array.isArray(json['@Collection'])) {
			const result = new this(json);
			json['@Collection'].forEach(item => {
				item && itemCallback && (item = itemCallback(item, result));
				item && result.push(item);
			});
			return result;
		}
	}

}
