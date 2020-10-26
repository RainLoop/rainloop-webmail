import { StorageResultType } from 'Common/Enums';

import Remote from 'Remote/User/Fetch';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/TwoFactorTest',
	templateID: 'PopupsTwoFactorTest'
})
class TwoFactorTestPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.addObservables({
			code: '',
			codeFocused: false,
			codeStatus: null,

			testing: false
		});

		this.koTestedTrigger = null;
	}

	@command((self) => self.code() && !self.testing())
	testCodeCommand() {
		this.testing(true);
		Remote.testTwoFactor((result, data) => {
			this.testing(false);
			this.codeStatus(StorageResultType.Success === result && data && !!data.Result);

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
//		rl.settings.app('mobile') ||
		this.codeFocused(true);
	}
}

export { TwoFactorTestPopupView, TwoFactorTestPopupView as default };
