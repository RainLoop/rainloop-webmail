import ko from 'ko';
import { isUnd, pInt, friendlySize, mimeContentType, getFileExtension } from 'Common/Utils';

import { staticIconClass, staticFileType } from 'Model/Attachment';
import { AbstractModel } from 'Knoin/AbstractModel';

class ComposeAttachmentModel extends AbstractModel {
	/**
	 * @param {string} id
	 * @param {string} fileName
	 * @param {?number=} size = null
	 * @param {boolean=} isInline = false
	 * @param {boolean=} isLinked = false
	 * @param {string=} CID = ''
	 * @param {string=} contentLocation = ''
	 */
	constructor(id, fileName, size = null, isInline = false, isLinked = false, CID = '', contentLocation = '') {
		super('ComposeAttachmentModel');

		this.id = id;
		this.isInline = !!isInline;
		this.isLinked = !!isLinked;
		this.CID = CID;
		this.contentLocation = contentLocation;
		this.fromMessage = false;

		this.fileName = ko.observable(fileName);
		this.size = ko.observable(size);
		this.tempName = ko.observable('');

		this.progress = ko.observable(0);
		this.error = ko.observable('');
		this.waiting = ko.observable(true);
		this.uploading = ko.observable(false);
		this.enabled = ko.observable(true);
		this.complete = ko.observable(false);

		this.progressText = ko.computed(() => {
			const p = this.progress();
			return 0 === p ? '' : '' + (98 < p ? 100 : p) + '%';
		});

		this.progressStyle = ko.computed(() => {
			const p = this.progress();
			return 0 === p ? '' : 'width:' + (98 < p ? 100 : p) + '%';
		});

		this.title = ko.computed(() => {
			const error = this.error();
			return '' !== error ? error : this.fileName();
		});

		this.friendlySize = ko.computed(() => {
			const localSize = this.size();
			return null === localSize ? '' : friendlySize(localSize);
		});

		this.mimeType = ko.computed(() => mimeContentType(this.fileName()));
		this.fileExt = ko.computed(() => getFileExtension(this.fileName()));

		this.regDisposables([
			this.progressText,
			this.progressStyle,
			this.title,
			this.friendlySize,
			this.mimeType,
			this.fileExt
		]);
	}

	/**
	 * @param {AjaxJsonComposeAttachment} json
	 * @returns {boolean}
	 */
	initByUploadJson(json) {
		let bResult = false;
		if (json) {
			this.fileName(json.Name);
			this.size(isUnd(json.Size) ? 0 : pInt(json.Size));
			this.tempName(isUnd(json.TempName) ? '' : json.TempName);
			this.isInline = false;

			bResult = true;
		}

		return bResult;
	}

	/**
	 * @returns {string}
	 */
	iconClass() {
		return staticIconClass(staticFileType(this.fileExt(), this.mimeType()))[0];
	}

	/**
	 * @returns {string}
	 */
	iconText() {
		return staticIconClass(staticFileType(this.fileExt(), this.mimeType()))[1];
	}
}

export { ComposeAttachmentModel, ComposeAttachmentModel as default };
