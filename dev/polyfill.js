'use strict';

(w=>{

// Edge Legacy (pre chromium/webkit), Firefox < 69, Safari < 13.4
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
