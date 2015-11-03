/*! RainLoop Index Helper v1.5 (c) 2015 RainLoop Team; Licensed under MIT */
(function (window, document, JSON, undefined) {

	/**
	 * @constructor
	 */
	function CRLTopDriver() {}

	CRLTopDriver.prototype.s = window['sessionStorage'] || null;

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

	// index function
	window['__includeScr'] = function (sSrc) {
		document.write(unescape('%3Csc' + 'ript data-cfasync="false" type="text/jav' + 'ascr' + 'ipt" sr' + 'c="' + sSrc + '"%3E%3C/' + 'scr' + 'ipt%3E'));
	};

	window['__includeStyle'] = function (sStyles) {
		document.write(unescape('%3Csty' + 'le%3E' + sStyles + '"%3E%3C/' + 'sty' + 'le%3E'));
	};

	window['__showError'] = function (sAdditionalError) {
		var oR = document.getElementById('rl-loading'),
			oL = document.getElementById('rl-loading-error'),
			oLA = document.getElementById('rl-loading-error-additional');

		if (oR) {oR.style.display = 'none';}
		if (oL) {oL.style.display = 'block';}
		if (oLA && sAdditionalError) { oLA.style.display = 'block'; oLA.innerHTML = sAdditionalError; }
		if (window.SimplePace) {window.SimplePace.set(100);}
	};

	window['__simplePace'] = function (nVal) {
		if (window.SimplePace) {
			window.SimplePace.add(nVal);
		}
	};

	window['__runBoot'] = function (bWithError, sAdditionalError) {
		if (window.__APP_BOOT && !bWithError) {
			window.__APP_BOOT(function (bV) {
				if (!bV) {
					__showError(sAdditionalError);
				}
			});
		} else {
			__showError(sAdditionalError);
		}
	};

}(window, window.document, window.JSON));
