
import { addObservablesTo, koComputable } from 'External/ko';

import { getNotification } from 'Common/Translator';
import { loadAccountsAndIdentities } from 'Common/UtilsUser';

import Remote from 'Remote/User/Fetch';

import { AbstractViewPopup } from 'Knoin/AbstractViews';

import { IdentityModel } from 'Model/Identity';

import { folderListOptionsBuilder } from 'Common/Folders';
import { i18n } from 'Common/Translator';
import { defaultOptionsAfterRender } from 'Common/Utils';

import { AskPopupView } from 'View/Popup/Ask';

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
		this.folderSelectList = koComputable(() =>
			folderListOptionsBuilder(
				[],
				[['', '('+i18n('GLOBAL/DEFAULT')+')']]
			)
		);
		this.defaultOptionsAfterRender = defaultOptionsAfterRender;

		this.createSelfSigned = this.createSelfSigned.bind(this);
		this.setSMimeKeyPass = this.setSMimeKeyPass.bind(this);
	}

	createSelfSigned() {
		AskPopupView.password('', 'CRYPTO/CREATE_SELF_SIGNED').then(pass => {
			if (pass) {
				const identity = this.identity();
				Remote.request('SMimeCreateCertificate', (iError, oData) => {
					if (oData.Result.x509) {
						identity.smimeKey(oData.Result.pkey);
						identity.smimeCertificate(oData.Result.x509);
					} else {
						this.submitError(oData.ErrorMessage);
					}
				}, {
					name: identity.name(),
					email: identity.email(),
					privateKey: identity.smimeKey(),
					passphrase: pass.password
				});
			}
		});
	}

	async setSMimeKeyPass() {
		const identity = this.identity();
		let old = null
		if (identity.smimeKeyEncrypted()) {
			old = await AskPopupView.password(i18n('CRYPTO/CURRENT_PASS'), 'CRYPTO/DECRYPT', 1);
			if (!old) {
				return;
			}
		}
		AskPopupView.password(i18n('CRYPTO/NEW_PASS'), 'GLOBAL/SAVE', 1).then(pass => {
			if (pass) {
				Remote.request('SMimeExportPrivateKey', (iError, oData) => {
					if (oData.Result) {
						identity.smimeKey(oData.Result);
					} else {
						this.submitError(oData.ErrorMessage);
					}
				}, {
					privateKey: identity.smimeKey(),
					oldPassphrase: old?.password,
					newPassphrase: pass.password
				});
			}
		});
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
