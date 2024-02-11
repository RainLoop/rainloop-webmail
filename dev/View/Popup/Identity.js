
import { addObservablesTo } from 'External/ko';

import { getNotification } from 'Common/Translator';
import { loadAccountsAndIdentities } from 'Common/UtilsUser';

import Remote from 'Remote/User/Fetch';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { IdentityModel } from 'Model/Identity';

export class IdentityPopupView extends AbstractViewPopup {
	constructor() {
		super('Identity');

		addObservablesTo(this, {
			identity: null,
			edit: false,
			labelFocused: false,
			nameFocused: false,
			submitRequest: false,
			submitError: ''
		});
/*
		this.email.valueHasMutated();
		this.replyTo.valueHasMutated();
		this.bcc.valueHasMutated();
*/
	}

	submitForm(form) {
		if (!this.submitRequest() && form.reportValidity()) {
			let identity = this.identity();
			identity.signature?.__fetchEditorValue?.();
			this.submitRequest(true);
			const data = new FormData(form);
			data.set('Id', identity.id());
			data.set('Signature', identity.signature());
			Remote.request('IdentityUpdate', iError => {
					this.submitRequest(false);
					if (iError) {
						this.submitError(getNotification(iError));
					} else {
						loadAccountsAndIdentities();
						this.close();
					}
				}, data
			);
		}
	}

	/**
	 * @param {?IdentityModel} oIdentity
	 */
	onShow(identity) {
		this.submitRequest(false);
		this.submitError('');
		if (identity) {
			this.edit(true);
		} else {
			this.edit(false);
			identity = new IdentityModel;
			identity.id(Jua.randomId());
		}
		this.identity(identity);
	}

	afterShow() {
		this.identity().id() ? this.labelFocused(true) : this.nameFocused(true);
	}
}
