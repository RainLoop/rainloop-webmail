import { StorageResultType, Notification } from 'Common/Enums';
import { getNotification } from 'Common/Translator';
import { HtmlEditor } from 'Common/Html';

import Remote from 'Remote/User/Fetch';

import { decorateKoCommands } from 'Knoin/Knoin';
import { AbstractViewPopup } from 'Knoin/AbstractViews';
import { TemplateModel } from 'Model/Template';

class TemplatePopupView extends AbstractViewPopup {
	constructor() {
		super('Template');

		this.editor = null;

		this.addObservables({
			signatureDom: null,

			id: '',

			name: '',
			nameError: false,
			nameFocus: false,

			body: '',
			bodyLoading: false,
			bodyError: false,

			submitRequest: false,
			submitError: ''
		});

		this.name.subscribe(() =>  this.nameError(false));

		this.body.subscribe(() => this.bodyError(false));

		decorateKoCommands(this, {
			addTemplateCommand: self => !self.submitRequest()
		});
	}

	addTemplateCommand() {
		this.populateBodyFromEditor();

		this.nameError(!this.name().trim());
		this.bodyError(!this.body().trim() || ':HTML:' === this.body().trim());

		if (this.nameError() || this.bodyError()) {
			return false;
		}

		this.submitRequest(true);

		Remote.templateSetup(
			(result, data) => {
				this.submitRequest(false);
				if (StorageResultType.Success === result && data) {
					if (data.Result) {
						rl.app.templates();
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
		this.nameError(false);

		this.body('');
		this.bodyLoading(false);
		this.bodyError(false);

		this.submitRequest(false);
		this.submitError('');

		if (this.editor) {
			this.editor.setPlain('');
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
				() => this.populateBodyFromEditor(),
				() => this.editor.setHtmlOrPlain(sBody)
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
				this.bodyLoading(true);
				this.bodyError(false);

				Remote.templateGetById((result, data) => {
					this.bodyLoading(false);

					if (
						StorageResultType.Success === result &&
						data &&
						TemplateModel.validJson(data.Result) &&
						null != data.Result.Body
					) {
						template.body = data.Result.Body;
						template.populated = true;

						this.body(template.body);
						this.bodyError(false);
					} else {
						this.body('');
						this.bodyError(true);
					}

					this.editorSetBody(this.body());
				}, this.id());
			}
		} else {
			this.editorSetBody('');
		}
	}

	onShowWithDelay() {
		this.nameFocus(true);
	}
}

export { TemplatePopupView, TemplatePopupView as default };
