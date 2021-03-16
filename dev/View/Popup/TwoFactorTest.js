import Remote from 'Remote/User/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

class TwoFactorTestPopupView extends AbstractViewPopup {
	constructor() {
		super('TwoFactorTest');

		this.addObservables({
			code: '',
			codeFocused: false,
			codeStatus: null,

			testing: false
		});

		this.koTestedTrigger = null;

		decorateKoCommands(this, {
			testCodeCommand: self => self.code() && !self.testing()
		});
	}

	testCodeCommand() {
		this.testing(true);
		Remote.testTwoFactor((iError, data) => {
			this.testing(false);
			this.codeStatus(!iError && data && !!data.Result);

			if (this.koTestedTrigger && this.codeStatus()) {
				this.koTestedTrigger(true);
			}
		}, this.code());
	}

	clearPopup() {
		this.code('');
		this.codeFocused(false);
		this.codeStatus(null);
		this.testing(false);

		this.koTestedTrigger = null;
	}

	onShow(koTestedTrigger) {
		this.clearPopup();

		this.koTestedTrigger = koTestedTrigger;
	}

	onShowWithDelay() {
		this.codeFocused(true);
	}
}

export { TwoFactorTestPopupView, TwoFactorTestPopupView as default };
