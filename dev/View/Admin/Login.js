import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { Settings } from 'Common/Globals';
import { getNotification } from 'Common/Translator';

import Remote from 'Remote/Admin/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewCenter } from 'Knoin/AbstractViews';

class LoginAdminView extends AbstractViewCenter {
	constructor() {
		super('Admin/Login', 'AdminLogin');

		this.hideSubmitButton = Settings.app('hideSubmitButton');

		this.addObservables({
			login: '',
			password: '',

			loginError: false,
			passwordError: false,

			formHidden: false,

			submitRequest: false,
			submitError: ''
		});

		this.formError = ko.observable(false).extend({ 'falseTimeout': 500 });

		this.addSubscribables({
			login: () => this.loginError(false),

			password: () => this.passwordError(false),

			loginError: v => this.formError(!!v),

			passwordError: v => this.formError(!!v)
		});

		decorateKoCommands(this, {
			submitCommand: self => !self.submitRequest()
		});
	}

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

export { LoginAdminView };
