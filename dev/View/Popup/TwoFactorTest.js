
import ko from 'ko';

import {StorageResultType} from 'Common/Enums';
import {bMobileDevice} from 'Common/Globals';
import {createCommand} from 'Common/Utils';

import Remote from 'Remote/User/Ajax';

import {view, ViewType} from 'Knoin/Knoin';
import {AbstractViewNext} from 'Knoin/AbstractViewNext';

@view({
	name: 'View/Popup/TwoFactorTest',
	type: ViewType.Popup,
	templateID: 'PopupsTwoFactorTest'
})
class TwoFactorTestPopupView extends AbstractViewNext
{
	constructor() {
		super();

		this.code = ko.observable('');
		this.code.focused = ko.observable(false);
		this.code.status = ko.observable(null);

		this.koTestedTrigger = null;

		this.testing = ko.observable(false);

		// commands
		this.testCode = createCommand(() => {

			this.testing(true);
			Remote.testTwoFactor((result, data) => {

				this.testing(false);
				this.code.status(StorageResultType.Success === result && data && !!data.Result);

				if (this.koTestedTrigger && this.code.status())
				{
					this.koTestedTrigger(true);
				}

			}, this.code());

		}, () => '' !== this.code() && !this.testing());
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
		if (!bMobileDevice)
		{
			this.code.focused(true);
		}
	}
}

module.exports = TwoFactorTestPopupView;
