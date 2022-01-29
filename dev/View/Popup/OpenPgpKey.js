import { Scope } from 'Common/Enums';
import { doc } from 'Common/Globals';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

class OpenPgpKeyPopupView extends AbstractViewPopup {
	constructor() {
		super('OpenPgpKey');

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
		if (navigator.clipboard) {
			navigator.clipboard.writeText(this.key()).then(
				() => console.log('Copied to clipboard'),
				err => console.error(err)
			);
		}
	}

	onShow(openPgpKey) {
		// TODO: show more info
		this.key(openPgpKey ? openPgpKey.armor : '');
	}

	onBuild() {
		shortcuts.add('a', 'meta', Scope.OpenPgpKey, () => {
			this.selectKey();
			return false;
		});
	}
}

export { OpenPgpKeyPopupView, OpenPgpKeyPopupView as default };
