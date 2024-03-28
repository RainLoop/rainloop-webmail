(rl => {

	/**
	 * Happens immediately after the ViewModel constructor
	 * event.detail contains the ViewModel class
	 */
	addEventListener('rl-view-model.create', event => {
		console.dir({
			'rl-view-model.create': event.detail
		});
	});

	/**
	 * Happens after the full build (vm.onBuild()) and contains viewModelDom
	 * event.detail contains the ViewModel class
	 */
	addEventListener('rl-view-model', event => {
		console.dir({
			'rl-view-model': event.detail
		});
	});

	/**
	 * event.detail value is one of:
	 *     0 = NoPreview
	 *     1 = SidePreview
	 *     2 = BottomPreview
	 */
	addEventListener('rl-layout', event => {
		console.dir({
			'rl-layout': event.detail
		});
	});

	/**
	 * event.detail contains the FormData
	 * cancelable using event.preventDefault()
	 */
	addEventListener('sm-admin-login', event => {
		console.dir({
			'sm-admin-login': event.detail
		});
	});

	/**
	 * event.detail contains { error: int, data: {JSON response} }
	 */
	addEventListener('sm-admin-login-response', event => {
		console.dir({
			'sm-admin-login-response': event.detail
		});
	});

	/**
	 * event.detail contains the FormData
	 * cancelable using event.preventDefault()
	 */
	addEventListener('sm-user-login', event => {
		console.dir({
			'sm-user-login': event.detail
		});
	});

	/**
	 * event.detail contains { error: int, data: {JSON response} }
	 */
	addEventListener('sm-user-login-response', event => {
		console.dir({
			'sm-user-login-response': event.detail
		});
	});

	/**
	 * event.detail contains the screenname
	 * cancelable using event.preventDefault()
	 * Options are:
	 * - login (user or admin login screen)
	 * - mailbox (user folders and messages, also like: mailbox/INBOX/test, mailbox/Sent)
	 * - settings (user settings like: settings/accounts, settings/general, settings/filters)
	 * - one of the admin sections (like: settings, domains, branding)
	 */
	addEventListener('sm-show-screen', event => {
		console.dir({
			'sm-show-screen': event.detail
		});
	});

	/**
	 * Use to show a specific message.
	 */
/*
	dispatchEvent(
		new CustomEvent(
			'mailbox.message.show',
			{
				detail: {
					folder: 'INBOX',
					uid: 1
				},
				cancelable: false
			}
		)
	);
*/

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

	/** Show the modal popup */
//	ExamplePopupView.showModal(['param1', 'param2']);

})(window.rl);
