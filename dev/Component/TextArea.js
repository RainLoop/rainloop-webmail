import { isUnd } from 'Common/Utils';
import { componentExportHelper } from 'Component/Abstract';
import { AbstractInput } from 'Component/AbstractInput';

const DEFAULT_ROWS = 5;

class TextAreaComponent extends AbstractInput {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		super(params);

		this.rows = params.rows || DEFAULT_ROWS;
		this.spellcheck = isUnd(params.spellcheck) ? false : !!params.spellcheck;
	}
}

export default componentExportHelper(TextAreaComponent, 'TextAreaComponent');
