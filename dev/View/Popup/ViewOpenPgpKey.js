import ko from 'ko';

import { KeyState } from 'Common/Enums';
import { selectElement } from 'Common/Utils';

import { popup } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/ViewOpenPgpKey',
	templateID: 'PopupsViewOpenPgpKey'
})
class ViewOpenPgpKeyPopupView extends AbstractViewNext {
	constructor() {
		super();

		this.key = ko.observable('');
		this.keyDom = ko.observable(null);

		this.sDefaultKeyScope = KeyState.PopupViewOpenPGP;
	}

	clearPopup() {
		this.key('');
	}

	selectKey() {
		const el = this.keyDom();
		if (el) {
			selectElement(el);
		}
	}

	onShow(openPgpKey) {
		this.clearPopup();

		if (openPgpKey) {
			this.key(openPgpKey.armor);
		}
	}

	onBuild() {
		shortcuts.add('a', 'meta', KeyState.PopupViewOpenPGP, () => {
			this.selectKey();
			return false;
		});
	}
}

export { ViewOpenPgpKeyPopupView, ViewOpenPgpKeyPopupView as default };
