'use strict';

(w=>{

Array.prototype.flat || Object.defineProperty(Array.prototype, 'flat', {
	configurable: true,
	value: function flat(depth) {
		depth = isNaN(depth) ? 1 : Number(depth);
		return depth ? Array.prototype.reduce.call(this, (acc, cur) => {
			if (Array.isArray(cur)) {
				acc.push.apply(acc, flat.call(cur, depth - 1));
			} else {
				acc.push(cur);
			}
			return acc;
		}, []) : this.slice();
	},
	writable: true
});

w.ResizeObserver || (w.ResizeObserver = class {
	constructor(callback) {
		this.observer = new MutationObserver(callback.debounce(250));
	}

	disconnect() {
		this.observer.disconnect();
	}

	observe(target) {
		this.observer.observe(target, { attributes: true, subtree: true, attributeFilter: ['style'] });
	}
});

})(this);
