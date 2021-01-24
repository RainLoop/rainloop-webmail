import { KeyState } from 'Common/Enums';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

class ViewOpenPgpKeyPopupView extends AbstractViewPopup {
	constructor() {
		super('ViewOpenPgpKey');

		this.addObservables({
			key: '',
			keyDom: null
		});

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
