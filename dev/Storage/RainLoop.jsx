
import window from 'window';

const STORAGE_KEY = '__rlA';

class RainLoopStorage
{
	s = null;
	t = null;

	constructor()
	{
		this.s = window.sessionStorage || null;
		this.t = window.top || window;
	}

	getHash() {
		let result = null;
		if (this.s)
		{
			result = this.s.getItem(STORAGE_KEY) || null;
		}
		else if (this.t && JSON)
		{
			const data = this.t.name && '{' === this.t.name.toString().substr(0, 1) ? JSON.parse(this.t.name.toString()) : null;
			result = data ? (data[STORAGE_KEY] || null) : null;
		}

		return result;
	}

	setHash() {
		const
			key = 'AuthAccountHash',
			appData = window.__rlah_data()
		;
		if (this.s)
		{
			this.s.setItem(STORAGE_KEY, appData && appData[key] ? appData[key] : '');
		}
		else if (this.t && JSON)
		{
			let data = {};
			data[STORAGE_KEY] = appData && appData[key] ? appData[key] : '';

			this.t.name = JSON.stringify(data);
		}
	}

	clearHash() {
		if (this.s)
		{
			this.s.setItem(STORAGE_KEY, '');
		}
		else if (this.t)
		{
			this.t.name = '';
		}
	}
}

module.exports = new RainLoopStorage();
