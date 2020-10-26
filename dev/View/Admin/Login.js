import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';

import Remote from 'Remote/Admin/Fetch';

import { view, command, ViewType } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@view({
	name: 'View/Admin/Login',
	type: ViewType.Center,
	templateID: 'AdminLogin'
})
class LoginAdminView extends AbstractViewNext {
	constructor() {
		super();

		const appSettingsGet = rl.settings.app;
		this.mobile = !!appSettingsGet('mobile');
		this.mobileDevice = !!appSettingsGet('mobileDevice');

		this.hideSubmitButton = appSettingsGet('hideSubmitButton');

		this.addObservables({
			login: '',
			password: '',

			loginError: false,
			passwordError: false,

			formHidden: false,

			submitRequest: false,
			submitError: ''
		});

		this.loginErrorAnimation = ko.observable(false).extend({ 'falseTimeout': 500 });
		this.passwordErrorAnimation = ko.observable(false).extend({ 'falseTimeout': 500 });

		this.formError = ko.computed(() => this.loginErrorAnimation() || this.passwordErrorAnimation());

		this.addSubscribables({
			login: () => this.loginError(false),

			password: () => this.passwordError(false),

			loginError: v => this.loginErrorAnimation(!!v),

			passwordError: v => this.passwordErrorAnimation(!!v)
		});
	}

	@command((self) => !self.submitRequest())
	submitCommand() {
		this.loginError(false);
		this.passwordError(false);

		this.loginError(!this.login().trim());
		this.passwordError(!this.password().trim());

		if (this.loginError() || this.passwordError()) {
			return false;
		}

		this.submitRequest(true);

		Remote.adminLogin(
			(sResult, oData) => {
				if (StorageResultType.Success === sResult && oData && 'AdminLogin' === oData.Action) {
					if (oData.Result) {
						rl.route.reload();
					} else if (oData.ErrorCode) {
						this.submitRequest(false);
						this.submitError(getNotification(oData.ErrorCode));
					}
				} else {
					this.submitRequest(false);
					this.submitError(getNotification(Notification.UnknownError));
				}
			},
			this.login(),
			this.password()
		);

		return true;
	}

	onShow() {
		rl.route.off();
	}

	submitForm() {
		this.submitCommand();
	}
}

export { LoginAdminView, LoginAdminView as default };
