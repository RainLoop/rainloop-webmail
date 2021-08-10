(doc => {
	let idle = 'idle',
		visible = 'visible',
		status = visible,
		timer = 0,
		wakeUp = () => {
			clearTimeout(timer);
			status = visible;
			timer = setTimeout(() => {
				if (status === visible) {
					status = idle;
					dispatchEvent(new CustomEvent(idle));
				}
			}, 10000);
		},
		init = () => {
			init = () => 0;
			// Safari
			addEventListener('pagehide', () => status = 'hidden');
			// Else
			doc.addEventListener('visibilitychange', () => {
				status = doc.visibilityState;
				doc.hidden || wakeUp();
			});
			wakeUp();
			['mousemove','keyup','touchstart'].forEach(t => doc.addEventListener(t, wakeUp));
			['scroll','pageshow'].forEach(t => addEventListener(t, wakeUp));
		};

	this.ifvisible = {
		idle: callback => {
			init();
			addEventListener(idle, callback);
		},
		now: () => {
			init();
			return status === visible;
		}
	};
})(document);
