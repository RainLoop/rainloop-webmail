/* eslint-env browser */

(win => {

const
	doc = win.document,
	setPercentWidth = (percent) => {
		setTimeout(() => progress.style.width = parseInt(Math.min(percent, 100)) + '%', 50);
	};

let container = doc.createElement('div'),
	progress = container.appendChild(doc.createElement("div"));

container.className = 'progressjs-progress progressjs-theme-rainloop';
progress.className = "progressjs-inner";
progress.appendChild(doc.createElement('div')).className = "progressjs-percent";

setPercentWidth(1);
doc.body.appendChild(container);

win.progressJs = new class {
	set(percent) {
		setPercentWidth(percent);
		return this;
	}

	end() {
		if (progress) {
			progress.addEventListener('transitionend', () => {
				if (container) {
					container.hidden = true;
					setTimeout(() => {container.remove();container=null;}, 200);
				}
			}, false);
			setPercentWidth(100);
		}
		return this;
	}
};

require('Common/Booter');

if (win.__runBoot) {
	win.__runBoot();
}

})(window);
