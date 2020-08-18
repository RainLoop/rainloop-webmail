/**
 * Every time the function is executed,
 * it will delay the execution with the given amount of milliseconds.
 */
if (!Function.prototype.debounce) {
	Function.prototype.debounce = function(ms) {
		let func = this, timer;
		return function(...args) {
			timer && clearTimeout(timer);
			timer = setTimeout(()=>{
				func.apply(this, args)
				timer = 0;
			}, ms);
		};
	};
}

/**
 * No matter how many times the event is executed,
 * the function will be executed only once, after the given amount of milliseconds.
 */
if (!Function.prototype.throttle) {
	Function.prototype.throttle = function(ms) {
		let func = this, timer;
		return function(...args) {
			if (!timer) {
				timer = setTimeout(()=>{
					func.apply(this, args)
					timer = 0;
				}, ms);
			}
		};
	};
}
