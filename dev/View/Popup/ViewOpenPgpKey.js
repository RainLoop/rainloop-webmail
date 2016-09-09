
import ko from 'ko';
import key from 'key';

import {KeyState} from 'Common/Enums';
import {selectElement} from 'Common/Utils';

import {popup} from 'Knoin/Knoin';
import {AbstractViewNext} from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/ViewOpenPgpKey',
	templateID: 'PopupsTwoFactorTest'
})
class ViewOpenPgpKeyPopupView extends AbstractViewNext
{
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
		if (el)
		{
			selectElement(el);
		}
	}

	onShow(oOpenPgpKey) {
		this.clearPopup();

		if (oOpenPgpKey)
		{
			this.key(oOpenPgpKey.armor);
		}
	}

	onBuild() {
		key('ctrl+a, command+a', KeyState.PopupViewOpenPGP, () => {
			this.selectKey();
			return false;
		});
	}
}

export {ViewOpenPgpKeyPopupView, ViewOpenPgpKeyPopupView as default};
