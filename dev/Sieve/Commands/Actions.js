/**
 * https://datatracker.ietf.org/doc/html/rfc5228#section-4
 * Action commands do not take tests or blocks as arguments.
 */

import { capa } from 'Sieve/Utils';

import {
	ActionCommand,
	GrammarString,
	GrammarQuotedString
} from 'Sieve/Grammar';

/**
 * https://tools.ietf.org/html/rfc5228#section-4.1
 */
export class FileIntoCommand extends ActionCommand
{
	constructor()
	{
		super();
		// QuotedString / MultiLine
		this._mailbox = new GrammarQuotedString();
	}

	get require() { return 'fileinto'; }

	toString()
	{
		return 'fileinto'
			// https://datatracker.ietf.org/doc/html/rfc3894
			+ ((this.copy && capa.includes('copy')) ? ' :copy' : '')
			// https://datatracker.ietf.org/doc/html/rfc5490#section-3.2
			+ ((this.create && capa.includes('mailbox')) ? ' :create' : '')
			+ ' ' + this._mailbox
			+ ';';
	}

	get mailbox()
	{
		return this._mailbox.value;
	}

	set mailbox(value)
	{
		this._mailbox.value = value;
	}

	pushArguments(args)
	{
		if (args[0] instanceof GrammarString) {
			this._mailbox = args[0];
		}
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4.2
 */
export class RedirectCommand extends ActionCommand
{
	constructor()
	{
		super();
		// QuotedString / MultiLine
		this._address = new GrammarQuotedString();
	}

	toString()
	{

		return 'redirect'
			// https://datatracker.ietf.org/doc/html/rfc6134#section-2.3
//			+ ((this.list && capa.includes('extlists')) ? ' :list ' + this.list : '')
			// https://datatracker.ietf.org/doc/html/rfc3894
			+ ((this.copy && capa.includes('copy')) ? ' :copy' : '')
			+ ' ' + this._address
			+ ';';
	}

	get address()
	{
		return this._address.value;
	}

	set address(value)
	{
		this._address.value = value;
	}

	pushArguments(args)
	{
		if (args[0] instanceof GrammarString) {
			this._address = args[0];
		}
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4.3
 */
export class KeepCommand extends ActionCommand
{
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4.4
 */
export class DiscardCommand extends ActionCommand
{
}
