import ko from 'ko';

import { StorageResultType, Notification } from 'Common/Enums';
import { trim, isNormal } from 'Common/Utils';
import { getNotification } from 'Common/Translator';
import { HtmlEditor } from 'Common/HtmlEditor';

import Remote from 'Remote/User/Ajax';

import { getApp } from 'Helper/Apps/User';

import { popup, command } from 'Knoin/Knoin';
import { AbstractViewNext } from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/Template',
	templateID: 'PopupsTemplate'
})
class TemplatePopupView extends AbstractViewNext {
	constructor() {
		super();

		this.editor = null;
		this.signatureDom = ko.observable(null);

		this.id = ko.observable('');

		this.name = ko.observable('');
		this.name.error = ko.observable(false);
		this.name.focus = ko.observable(false);

		this.body = ko.observable('');
		this.body.loading = ko.observable(false);
		this.body.error = ko.observable(false);

		this.name.subscribe(() => {
			this.name.error(false);
		});

		this.body.subscribe(() => {
			this.body.error(false);
		});

		this.submitRequest = ko.observable(false);
		this.submitError = ko.observable('');
	}

	@command((self) => !self.submitRequest())
	addTemplateCommand() {
		this.populateBodyFromEditor();

		this.name.error('' === trim(this.name()));
		this.body.error('' === trim(this.body()) || ':HTML:' === trim(this.body()));

		if (this.name.error() || this.body.error()) {
			return false;
		}

		this.submitRequest(true);

		Remote.templateSetup(
			(result, data) => {
				this.submitRequest(false);
				if (StorageResultType.Success === result && data) {
					if (data.Result) {
						getApp().templates();
						this.cancelCommand();
					} else if (data.ErrorCode) {
						this.submitError(getNotification(data.ErrorCode));
					}
				} else {
					this.submitError(getNotification(Notification.UnknownError));
				}
			},
			this.id(),
			this.name(),
			this.body()
		);

		return true;
	}

	clearPopup() {
		this.id('');

		this.name('');
		this.name.error(false);

		this.body('');
		this.body.loading(false);
		this.body.error(false);

		this.submitRequest(false);
		this.submitError('');

		if (this.editor) {
			this.editor.setPlain('', false);
		}
	}

	populateBodyFromEditor() {
		if (this.editor) {
			this.body(this.editor.getDataWithHtmlMark());
		}
	}

	editorSetBody(sBody) {
		if (!this.editor && this.signatureDom()) {
			this.editor = new HtmlEditor(
				this.signatureDom(),
				() => {
					this.populateBodyFromEditor();
				},
				() => {
					this.editor.setHtmlOrPlain(sBody);
				}
			);
		} else {
			this.editor.setHtmlOrPlain(sBody);
		}
	}

	onShow(template) {
		this.clearPopup();

		if (template && template.id) {
			this.id(template.id);
			this.name(template.name);
			this.body(template.body);

			if (template.populated) {
				this.editorSetBody(this.body());
			} else {
				this.body.loading(true);
				this.body.error(false);

				Remote.templateGetById((result, data) => {
					this.body.loading(false);

					if (
						StorageResultType.Success === result &&
						data &&
						data.Result &&
						'Object/Template' === data.Result['@Object'] &&
						isNormal(data.Result.Body)
					) {
						template.body = data.Result.Body;
						template.populated = true;

						this.body(template.body);
						this.body.error(false);
					} else {
						this.body('');
						this.body.error(true);
					}

					this.editorSetBody(this.body());
				}, this.id());
			}
		} else {
			this.editorSetBody('');
		}
	}

	onShowWithDelay() {
		this.name.focus(true);
	}
}

export { TemplatePopupView, TemplatePopupView as default };
