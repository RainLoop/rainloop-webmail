import { i18n } from 'Common/Translator';
import { isFunction } from 'Common/Utils';
import { addObservablesTo } from 'External/ko';
import { AbstractViewPopup } from 'Knoin/AbstractViews';

export class AskPopupView extends AbstractViewPopup {
	constructor() {
		super('Ask');

		addObservablesTo(this, {
			askDesc: '',
			yesButton: '',
			noButton: '',
			username: '',
			askUsername: false,
			passphrase: '',
			askPass: false,
			remember: true,
			askRemeber: false
		});

		this.fYesAction = null;
		this.fNoAction = null;

		this.focusOnShow = true;
	}

	yesClick() {
		this.close();

		isFunction(this.fYesAction) && this.fYesAction(this);
	}

	noClick() {
		this.close();

		isFunction(this.fNoAction) && this.fNoAction(this);
	}

	/**
	 * @param {string} sAskDesc
	 * @param {Function=} fYesFunc
	 * @param {Function=} fNoFunc
	 * @param {boolean=} focusOnShow = true
	 * @returns {void}
	 */
	onShow(sAskDesc, fYesFunc = null, fNoFunc = null, focusOnShow = true, ask = 0, btnText = '') {
		this.askDesc(sAskDesc || '');
		this.askUsername(ask & 2);
		this.askPass(ask & 1);
		this.askRemeber(ask & 4);
		this.username('');
		this.passphrase('');
		this.remember(true);
		this.yesButton(i18n(btnText || 'GLOBAL/YES'));
		this.noButton(i18n(ask ? 'GLOBAL/CANCEL' : 'GLOBAL/NO'));
		this.fYesAction = fYesFunc;
		this.fNoAction = fNoFunc;
		this.focusOnShow = focusOnShow
			? (ask ? 'input[type="'+(ask&2?'text':'password')+'"]' : '.buttonYes')
			: '';
	}

	afterShow() {
		this.focusOnShow && this.querySelector(this.focusOnShow).focus();
	}

	onClose() {
		this.noClick();
		return false;
	}

	onBuild() {
//		shortcuts.add('tab', 'shift', 'Ask', () => {
		shortcuts.add('tab,arrowright,arrowleft', '', 'Ask', () => {
			let yes = this.querySelector('.buttonYes'),
				no = this.querySelector('.buttonNo');
			if (yes.matches(':focus')) {
				no.focus();
				return false;
			} else if (no.matches(':focus')) {
				yes.focus();
				return false;
			}
		});
	}
}
