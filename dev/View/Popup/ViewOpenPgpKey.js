import ko from 'ko';

import { KeyState } from 'Common/Enums';

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
			let sel = getSelection(),
				range = document.createRange();
			sel.removeAllRanges();
			range.selectNodeContents(el);
			sel.addRange(range);
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
