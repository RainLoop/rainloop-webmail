import window from 'window';

export class AbstractBasicPromises {
	oPromisesStack = {};

	func(fFunc) {
		fFunc();
		return this;
	}

	fastResolve(mData) {
		return window.Promise.resolve(mData);
	}

	fastReject(mData) {
		return window.Promise.reject(mData);
	}

	setTrigger(trigger, value) {
		if (trigger) {
			value = !!value;
			(Array.isArray(trigger) ? trigger : [trigger]).forEach((fTrigger) => {
				if (fTrigger) {
					fTrigger(value);
				}
			});
		}
	}
}
