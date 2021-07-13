import { AbstractInput } from 'Component/AbstractInput';

export class TextAreaComponent extends AbstractInput {
	/**
	 * @param {Object} params
	 */
	constructor(params) {
		super(params);

		this.rows = params.rows || 5;
		this.spellcheck = !!params.spellcheck;
	}
}
