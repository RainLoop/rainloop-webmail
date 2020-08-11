export class AbstractBasicPromises {
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
