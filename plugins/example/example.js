(rl => {
	addEventListener('rl-view-model', e => {
		console.dir({
			'rl-view-model': e.detail
		});
	});

	/**
	 * e.detail value is one of:
	 *     0 = NoPreview
	 *     1 = SidePreview
	 *     2 = BottomPreview
	 */
	addEventListener('rl-layout', e => {
		console.dir({
			'rl-layout': e.detail
		});
	});

	class ExamplePopupView extends rl.pluginPopupView {
		constructor() {
			super('Example');

			this.addObservables({
				title: ''
			});
		}

		// Happens before showModal()
		beforeShow(...params) {
			console.dir({beforeShow_params: params});
		}

		// Happens after showModal()
		onShow(...params) {
			console.dir({beforeShow_params: params});
		}

		// Happens after showModal() animation transitionend
		afterShow() {}

		// Happens when user hits Escape or Close key
		// return false to prevent closing, use close() manually
		onClose() {}

		// Happens before animation transitionend
		onHide() {}

		// Happens after animation transitionend
		afterHide() {}
	}

	ExamplePopupView.showModal(['param1', 'param2']);

})(window.rl);
