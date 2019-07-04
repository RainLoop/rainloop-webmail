import ko from 'ko';

import { StorageResultType } from 'Common/Enums';
import { bMobileDevice } from 'Common/Globals';

import Remote from 'Remote/User/Ajax';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/TwoFactorTest',
	templateID: 'PopupsTwoFactorTest'
})
class TwoFactorTestPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.code = ko.observable('');
		this.code.focused = ko.observable(false);
		this.code.status = ko.observable(null);

		this.koTestedTrigger = null;

		this.testing = ko.observable(false);
	}

	@command((self) => '' !== self.code() && !self.testing())
	testCodeCommand() {
		this.testing(true);
		Remote.testTwoFactor((result, data) => {
			this.testing(false);
			this.code.status(StorageResultType.Success === result && data && !!data.Result);

			if (this.koTestedTrigger && this.code.status()) {
				this.koTestedTrigger(true);
			}
		}, this.code());
	}

	clearPopup() {
		this.code('');
		this.code.focused(false);
		this.code.status(null);
		this.testing(false);

		this.koTestedTrigger = null;
	}

	onShow(koTestedTrigger) {
		this.clearPopup();

		this.koTestedTrigger = koTestedTrigger;
	}

	onShowWithDelay() {
		if (!bMobileDevice) {
			this.code.focused(true);
		}
	}
}

export { TwoFactorTestPopupView, TwoFactorTestPopupView as default };
