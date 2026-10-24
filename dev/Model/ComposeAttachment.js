import { FileInfo } from 'Common/File';

import { AbstractModel } from 'Knoin/AbstractModel';
import { addObservablesTo, addComputablesTo } from 'External/ko';

export class ComposeAttachmentModel extends AbstractModel {
	/**
	 * @param {string} id
	 * @param {string} fileName
	 * @param {?number=} size = null
	 * @param {boolean=} isInline = false
	 * @param {boolean=} isLinked = false
	 * @param {string=} cId = ''
	 * @param {string=} contentLocation = ''
	 */
	constructor(id, fileName, size = null, isInline = false, isLinked = false, cId = '', contentLocation = '') {
		super();

		this.id = id;
		this.isInline = !!isInline;
		this.isLinked = !!isLinked;
		this.cId = cId;
		this.contentLocation = contentLocation;
		this.fromMessage = false;

		addObservablesTo(this, {
			fileName: fileName,
			size: size,
			tempName: '',
			type: '', // application/octet-stream

			progress: 0,
			error: '',
			waiting: true,
			uploading: false,
			enabled: true,
			complete: false
		});

		addComputablesTo(this, {
			progressText: () => {
				const p = this.progress();
				return 1 > p ? '' : (100 < p ? 100 : p) + '%';
			},

			progressStyle: () => {
				const p = this.progress();
				return 1 > p ? '' : 'width:' + (100 < p ? 100 : p) + '%';
			},

			title: () => this.error() || this.fileName(),

			friendlySize: () => {
				const localSize = this.size();
				return null === localSize ? '' : FileInfo.friendlySize(localSize);
			},

			mimeType: () => this.type() || FileInfo.getContentType(this.fileName()),
			fileExt: () => FileInfo.getExtension(this.fileName()),

			iconClass: () => FileInfo.getIconClass(this.fileExt(), this.mimeType())
		});
	}
}
