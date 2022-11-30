import ko from 'ko';

import { FileInfo, FileType } from 'Common/File';
import {
	attachmentDownload,
	serverRequestRaw
} from 'Common/Links';

import { AbstractModel } from 'Knoin/AbstractModel';
import { addObservablesTo } from 'External/ko';

import { SMAudio } from 'Common/Audio';

export class AttachmentModel extends AbstractModel {
	constructor() {
		super();

		this.checked = ko.observable(true);

		this.mimeType = '';
		this.fileName = '';
		this.fileNameExt = '';
		this.fileType = FileType.Unknown;
		this.isThumbnail = false;
		this.cid = '';
		this.contentLocation = '';
		this.download = '';
		this.folder = '';
		this.uid = '';
		this.url = '';
		this.mimeIndex = '';
		this.estimatedSize = 0;

		addObservablesTo(this, {
			isInline: false,
			isLinked: false
		});
	}

	/**
	 * @static
	 * @param {FetchJsonAttachment} json
	 * @returns {?AttachmentModel}
	 */
	static reviveFromJson(json) {
		const attachment = super.reviveFromJson(json);
		if (attachment) {
			attachment.fileNameExt = FileInfo.getExtension(attachment.fileName);
			attachment.fileType = FileInfo.getType(attachment.fileNameExt, attachment.mimeType);
		}
		return attachment;
	}

	toggleChecked(self, event) {
		event.stopPropagation();
		self.checked(!self.checked());
	}

	friendlySize() {
		return FileInfo.friendlySize(this.estimatedSize) + (this.isLinked() ? ' 🔗' : '');
	}

	contentId() {
		return this.cid.replace(/^<+|>+$/g, '');
	}

	/**
	 * @returns {boolean}
	 */
	isImage() {
		return FileType.Image === this.fileType;
	}

	/**
	 * @returns {boolean}
	 */
	isMp3() {
		return FileType.Audio === this.fileType && 'mp3' === this.fileNameExt;
	}

	/**
	 * @returns {boolean}
	 */
	isOgg() {
		return FileType.Audio === this.fileType && ('oga' === this.fileNameExt || 'ogg' === this.fileNameExt);
	}

	/**
	 * @returns {boolean}
	 */
	isWav() {
		return FileType.Audio === this.fileType && 'wav' === this.fileNameExt;
	}

	/**
	 * @returns {boolean}
	 */
	isText() {
		return FileType.Text === this.fileType || FileType.Eml === this.fileType;
	}

	/**
	 * @returns {boolean}
	 */
	pdfPreview() {
		return null != navigator.mimeTypes['application/pdf'] && FileType.Pdf === this.fileType;
	}

	/**
	 * @returns {boolean}
	 */
	hasPreview() {
		return this.isImage() || this.pdfPreview() || this.isText();
	}

	/**
	 * @returns {boolean}
	 */
	hasPreplay() {
		return (
			(SMAudio.supportedMp3 && this.isMp3()) ||
			(SMAudio.supportedOgg && this.isOgg()) ||
			(SMAudio.supportedWav && this.isWav())
		);
	}

	/**
	 * @returns {string}
	 */
	linkDownload() {
		return this.url || attachmentDownload(this.download);
	}

	/**
	 * @returns {string}
	 */
	linkPreview() {
		return this.url || serverRequestRaw('View', this.download);
	}

	/**
	 * @returns {boolean}
	 */
	hasThumbnail() {
		return this.isThumbnail && !this.isLinked();
	}

	/**
	 * @returns {string}
	 */
	thumbnailStyle() {
		return this.hasThumbnail()
			? 'background:url(' + serverRequestRaw('ViewThumbnail', this.download) + ')'
			: '';
	}

	/**
	 * @returns {string}
	 */
	linkPreviewMain() {
		let result = '';
		switch (true) {
			case this.isImage():
			case this.pdfPreview():
				result = this.linkPreview();
				break;
			case this.isText():
				result = serverRequestRaw('ViewAsPlain', this.download);
				break;
			// no default
		}

		return result;
	}

	/**
	 * @param {AttachmentModel} attachment
	 * @param {*} event
	 * @returns {boolean}
	 */
	eventDragStart(attachment, event) {
		const localEvent = event.originalEvent || event;
		if (attachment && localEvent && localEvent.dataTransfer && localEvent.dataTransfer.setData) {
			let link = this.linkDownload();
			if (!link.startsWith('http')) {
				link = location.protocol + '//' + location.host + location.pathname + link;
			}
			localEvent.dataTransfer.setData('DownloadURL', this.mimeType + ':' + this.fileName + ':' + link);
		}

		return true;
	}

	/**
	 * @returns {string}
	 */
	iconClass() {
		return FileInfo.getTypeIconClass(this.fileType);
	}
}
