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

const Storage = type => {
	let name = type+'Storage';
	try {
		w[name].setItem('storage', '');
		w[name].getItem('storage');
		w[name].removeItem('storage');
	} catch (e) {
		console.error(e);
		const cookieName = encodeURIComponent(name+('session' === type ? w.name || (w.name = Date.now()) : ''));

		// initialise if there's already data
		let data = document.cookie.match('(^|;) ?'+cookieName+'=([^;]*)(;|$)');
		data = data ? decodeURIComponent(data[2]) : null;
		data = data ? JSON.parse(data) : {};

		w[name] = {
			getItem: key => data[key] === undefined ? null : data[key],
			setItem: function (key, value) {
				data[key] = ''+value; // forces the value to a string
				document.cookie = cookieName+'='+encodeURIComponent(JSON.stringify(data))
					+"; expires="+('local' === type ? (new Date(Date.now()+(365*24*60*60*1000))).toGMTString() : '')
					+"; path=/; samesite=strict";
			}
		};
	}
};
Storage('local');
Storage('session');

})(window);
