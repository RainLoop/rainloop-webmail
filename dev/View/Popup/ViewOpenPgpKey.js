import { Scope } from 'Common/Enums';
import { doc } from 'Common/Globals';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

class ViewOpenPgpKeyPopupView extends AbstractViewPopup {
	constructor() {
		super('ViewOpenPgpKey');

		this.addObservables({
			key: '',
			keyDom: null
		});
	}

	selectKey() {
		const el = this.keyDom();
		if (el) {
			let sel = getSelection(),
				range = doc.createRange();
			sel.removeAllRanges();
			range.selectNodeContents(el);
			sel.addRange(range);
		}
	}

	onShow(openPgpKey) {
		this.key(openPgpKey ? openPgpKey.armor : '');
	}

	onBuild() {
		shortcuts.add('a', 'meta', Scope.ViewOpenPgpKey, () => {
			this.selectKey();
			return false;
		});
	}
}

export { ViewOpenPgpKeyPopupView, ViewOpenPgpKeyPopupView as default };
