
import window from 'window';

const
	STORAGE_KEY = '__rlA',
	TIME_KEY = '__rlT'
;

class RainLoopStorage
{
	s = null;
	t = null;

	constructor()
	{
		this.s = window.sessionStorage || null;
		this.t = window.top || window;

		this.init();
	}

	__get(key) {

		let result = null;
		if (this.s)
		{
			result = this.s.getItem(key) || null;
		}
		else if (this.t && JSON)
		{
			const data = this.t.name && '{' === this.t.name.toString().substr(0, 1) ? JSON.parse(this.t.name.toString()) : null;
			result = data ? (data[key] || null) : null;
		}

		return result;
	}

	__set(key, value) {
		if (this.s)
		{
			this.s.setItem(key, value);
		}
		else if (this.t && JSON)
		{
			let data = this.t.name && '{' === this.t.name.toString().substr(0, 1) ? JSON.parse(this.t.name.toString()) : null;
			data = data || {};
			data[key] = value;

			this.t.name = JSON.stringify(data);
		}
	}

	timestamp() {
		return window.Math.round((new Date()).getTime() / 1000);
	}

	init() {

		const
			six = 1000 * 60 * 6, // 6m
			now = this.timestamp()
		;

		if (now > this.getTimestamp() + six * 10)
		{
			this.clearHash();
		}

		window.setInterval(() => {
			this.setTimestamp();
		}, six);
	}

	getHash() {
		return this.__get(STORAGE_KEY);
	}

	setHash() {

		const
			key = 'AuthAccountHash',
			appData = window.__rlah_data()
		;

		this.__set(STORAGE_KEY, appData && appData[key] ? appData[key] : '');
		this.setTimestamp();
	}


	setTimestamp() {
		this.__set(TIME_KEY, this.timestamp());
	}

	getTimestamp() {
		let time = this.__get(TIME_KEY, 0);
		return time ? (window.parseInt(time, 10) | 0) : 0;
	}

	clearHash() {
		this.__set(STORAGE_KEY, '');
		this.setTimestamp();
	}
}

module.exports = new RainLoopStorage();
