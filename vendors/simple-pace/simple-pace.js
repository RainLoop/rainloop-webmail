/*! RainLoop Simple Pace v1.0 (c) 2013 RainLoop Team; Licensed under MIT */
(function (window) {

	/**
	 * @constructor
	 */
	function Bar() {
		var self = this;

		self.el = null;
		self.done = false;
		self.progress = 0;
		self.addInterval = 0;
		self.addSpeed = 3;
		self.stopProgress = 100;
		self.interval = window.setInterval(function () {
			var oEl = self.build();
			if (oEl)
			{
				window.clearInterval(self.interval);
			}
		}, 100);
	}

	Bar.prototype.startAddInterval = function () {
		var self = this;
		self.stopAddInterval();
		self.addInterval = window.setInterval(function () {
			if (0 < self.progress && self.stopProgress > self.progress)
			{
				self.add(self.addSpeed);
			}
		}, 500);
	};

	Bar.prototype.stopAddInterval = function () {
		window.clearInterval(this.addInterval);
		this.addInterval = 0;
	};

	Bar.prototype.build = function () {
		if (null === this.el)
		{
			var oTargetElement = document.querySelector('body');
			if (oTargetElement)
			{
				this.el = document.createElement('div');
				this.el.className = 'simple-pace simple-pace-active';
				this.el.innerHTML = '<div class="simple-pace-progress"><div class="simple-pace-progress-inner"></div></div><div class="simple-pace-activity"></div>';

				if (oTargetElement.firstChild)
				{
					oTargetElement.insertBefore(this.el, oTargetElement.firstChild);
				}
				else
				{
					oTargetElement.appendChild(this.el);
				}
			}
		}

		return this.el;
	};

	Bar.prototype.reset = function () {
		this.progress = 0;
		return this.render();
	};

	Bar.prototype.update = function (iProg) {
		var iP = window.parseInt(iProg, 10);
		if (iP > this.progress)
		{
			this.progress = iP;
			this.progress = 100 < this.progress ? 100 : this.progress;
			this.progress = 0 > this.progress ? 0 : this.progress;
		}

		return this.render();
	};

	Bar.prototype.add = function (iProg) {
		this.progress += window.parseInt(iProg, 10);
		this.progress = 100 < this.progress ? 100 : this.progress;
		this.progress = 0 > this.progress ? 0 : this.progress;

		return this.render();
	};

	Bar.prototype.setSpeed = function (iSpeed, iStopProgress) {
		this.addSpeed = iSpeed;
		this.stopProgress = iStopProgress || 100;
	};

	Bar.prototype.render = function () {
		var oEl = this.build();
		if (oEl && oEl.children && oEl.children[0])
		{
			oEl.children[0].setAttribute('style', 'width:' + this.progress + '%');
		}

		if (100 === this.progress && !this.done)
		{
			this.done = true;
			this.stopAddInterval();

			window.setTimeout(function () {
				oEl.className = oEl.className.replace('simple-pace-active', '');
				oEl.className += ' simple-pace-inactive';
			}, 500);
		}
		else if (100 > this.progress && this.done)
		{
			this.done = false;
			this.startAddInterval();

			oEl.className = oEl.className.replace('simple-pace-inactive', '');
			oEl.className += ' simple-pace-inactive';
		}
		else if (100 > this.progress && !this.done && 0 === this.addInterval)
		{
			this.startAddInterval();
		}
	};

	if (!window['SimplePace'])
	{
		var oBar = new Bar();
		window['SimplePace'] = {
			'sleep': function () {
				oBar.setSpeed(2, 95);
			},
			'set': function (iValue) {
				oBar.update(iValue);
			},
			'add': function (iValue) {
				oBar.add(iValue);
			}
		};
	}
}(window));

