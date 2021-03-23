import Remote from 'Remote/User/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

class TwoFactorTestPopupView extends AbstractViewPopup {
	constructor() {
		super('TwoFactorTest');

		this.addObservables({
			code: '',
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
		Remote.testTwoFactor(iError => {
			this.testing(false);
			this.codeStatus(!iError);

			if (this.koTestedTrigger && this.codeStatus()) {
				this.koTestedTrigger(true);
			}
		}, this.code());
	}

	clearPopup() {
		this.code('');
		this.codeStatus(null);
		this.testing(false);

		this.koTestedTrigger = null;
	}

	onShow(koTestedTrigger) {
		this.clearPopup();

		this.koTestedTrigger = koTestedTrigger;
	}
}

export { TwoFactorTestPopupView, TwoFactorTestPopupView as default };
