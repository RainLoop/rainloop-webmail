import { FileInfo } from 'Common/File';

import { AbstractModel } from 'Knoin/AbstractModel';

export class ComposeAttachmentModel extends AbstractModel {
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
		super();

		this.id = id;
		this.isInline = !!isInline;
		this.isLinked = !!isLinked;
		this.CID = CID;
		this.contentLocation = contentLocation;
		this.fromMessage = false;

		this.addObservables({
			fileName: fileName,
			size: size,
			tempName: '',

			progress: 0,
			error: '',
			waiting: true,
			uploading: false,
			enabled: true,
			complete: false
		});

		this.addComputables({
			progressText: () => {
				const p = this.progress();
				return 0 === p ? '' : '' + (98 < p ? 100 : p) + '%';
			},

			progressStyle: () => {
				const p = this.progress();
				return 0 === p ? '' : 'width:' + (98 < p ? 100 : p) + '%';
			},

			title: () => this.error() || this.fileName(),

			friendlySize: () => {
				const localSize = this.size();
				return null === localSize ? '' : FileInfo.friendlySize(localSize);
			},

			mimeType: () => FileInfo.getContentType(this.fileName()),
			fileExt: () => FileInfo.getExtension(this.fileName())
		});
	}

	/**
	 * @returns {string}
	 */
	iconClass() {
		return FileInfo.getIconClass(this.fileExt(), this.mimeType());
	}
}
