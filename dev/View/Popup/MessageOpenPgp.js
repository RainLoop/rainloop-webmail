import ko from 'ko';

import { pString } from 'Common/Utils';
import { Scope } from 'Common/Enums';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

class MessageOpenPgpPopupView extends AbstractViewPopup {
	constructor() {
		super('MessageOpenPgp');
		this.viewNoUserSelect = true;

		this.addObservables({
			notification: '',
			selectedKey: null,
			password: '',
			submitRequest: false
		});
		this.privateKeys = ko.observableArray();

		this.resultCallback = null;

		decorateKoCommands(this, {
			doCommand: self => !self.submitRequest()
		});
	}

	doCommand() {
		this.submitRequest(true);

		setTimeout(() => {
			let privateKey = null;

			try {
				if (this.resultCallback && this.selectedKey()) {
					const privateKeys = this.selectedKey().getNativeKeys();
					privateKey = privateKeys && privateKeys[0] ? privateKeys[0] : null;

					if (privateKey) {
						try {
							if (!privateKey.decrypt(pString(this.password()))) {
								console.log('Error: Private key cannot be decrypted');
								privateKey = null;
							}
						} catch (e) {
							console.log(e);
							privateKey = null;
						}
					} else {
						console.log('Error: Private key cannot be found');
					}
				}
			} catch (e) {
				console.log(e);
				privateKey = null;
			}

			this.submitRequest(false);

			this.cancelCommand();
			this.resultCallback(privateKey);
		}, 100);
	}

	clearPopup() {
		this.notification('');

		this.password('');

		this.selectedKey(false);
		this.submitRequest(false);

		this.resultCallback = null;
		this.privateKeys([]);
	}

	onBuild(oDom) {
//		shortcuts.add('tab', 'shift', Scope.MessageOpenPgp, () => {
		shortcuts.add('tab', '', Scope.MessageOpenPgp, () => {
			let btn = this.querySelector('.inputPassword');
			if (btn.matches(':focus')) {
				btn = this.querySelector('.buttonDo');
			}
			btn.focus();
			return false;
		});

		const self = this;

		oDom.addEventListener('click', event => {
			const el = event.target.closestWithin('.key-list__item', oDom);
			if (el) {
				oDom.querySelectorAll('.key-list__item .key-list__item__radio').forEach(node =>
					node.textContent = el === node ? '⦿' : '○'
				);

				self.selectedKey(ko.dataFor(el));

//				this.querySelector('.inputPassword').focus();
			}
		});
	}

	onHideWithDelay() {
		this.clearPopup();
	}

	onShow(fCallback, privateKeys) {
		this.clearPopup();

		this.resultCallback = fCallback;
		this.privateKeys(privateKeys);

		if (this.viewModelDom) {
			const el = this.querySelector('.key-list__item');
			el && el.click();
		}
	}
}

export { MessageOpenPgpPopupView, MessageOpenPgpPopupView as default };
