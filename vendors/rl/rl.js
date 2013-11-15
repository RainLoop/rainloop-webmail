/*! RainLoop Top Driver v1.0 (c) 2013 RainLoop Team; Licensed under MIT */
(function (window, JSON) {

	/**
	 * @constructor
	 */
	function CRLTopDriver() {}

	CRLTopDriver.prototype.s = window['sessionStorage'];
	
	CRLTopDriver.prototype.t = window['top'] || window;

	/**
	 * @return {(string|null)}
	 */
	CRLTopDriver.prototype['getHash'] = function() {
		var mR = null;
		if (this.s) {
			mR = this.s['getItem']('__rlA') || null;
		} else if (this.t) {
			var mData = this.t['name'] && JSON && '{' === this.t['name']['toString']()['substr'](0, 1) ? JSON['parse'](this.t['name']['toString']()) : null;
			mR = mData ? (mData['__rlA'] || null) : null;
		}
		return mR;
	};

	CRLTopDriver.prototype['setHash'] = function() {
		var mData = window['rainloopAppData'], mRes = null;
		if (this.s) {
			this.s['setItem']('__rlA', mData && mData['AuthAccountHash'] ? mData['AuthAccountHash'] : '');
		} else if (this.t && JSON) {
			mRes = {};
			mRes['__rlA'] = mData && mData['AuthAccountHash'] ? mData['AuthAccountHash'] : '';
			this.t['name'] = JSON['stringify'](mRes);
		}
	};

	CRLTopDriver.prototype['clearHash'] = function() {
		if (this.s) {
			this.s['setItem']('__rlA', '');
		} else if (this.t) {
			this.t['name'] = '';
		}
	};

	window['_rlhh'] = new CRLTopDriver();

	/**
	 * @returns {(string|null)}
	 */
	window['__rlah'] = function () {
		return window['_rlhh'] ? window['_rlhh']['getHash']() : null;
	};
	window['__rlah_set'] = function () {
		if (window['_rlhh']) {
			window['_rlhh']['setHash']();
		}
	};
	window['__rlah_clear'] = function () {
		if (window['_rlhh']) {
			window['_rlhh']['clearHash']();
		}
	};
}(window, window.JSON));
