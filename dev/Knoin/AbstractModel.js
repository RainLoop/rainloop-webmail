
import _ from '_';
import {isArray, disposeObject} from 'Common/Utils';

class AbstractModel
{
	sModelName = '';
	disposables = [];

	/**
	 * @param {string} modelName = ''
	 */
	constructor(modelName = '')
	{
		this.sModelName = modelName || '';
	}

	regDisposables(value) {
		if (isArray(value))
		{
			_.each(value, (item) => {
				this.disposables.push(item);
			});
		}
		else if (value)
		{
			this.disposables.push(value);
		}
	}

	onDestroy()	{
		disposeObject(this);
	}
}

export {AbstractModel, AbstractModel as default};
