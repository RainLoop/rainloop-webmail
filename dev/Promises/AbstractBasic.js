
import _ from '_';
import Promise from 'Promise';
import {isArray} from 'Common/Utils';

class AbstractBasicPromises
{
	oPromisesStack = {};

	func(fFunc) {
		fFunc();
		return this;
	}

	fastResolve(mData) {
		return Promise.resolve(mData);
	}

	fastReject(mData) {
		return Promise.reject(mData);
	}

	setTrigger(trigger, value) {
		if (trigger)
		{
			value = !!value;
			_.each(isArray(trigger) ? trigger : [trigger], (fTrigger) => {
				if (fTrigger)
				{
					fTrigger(value);
				}
			});
		}
	}
}

export {AbstractBasicPromises, AbstractBasicPromises as default};
