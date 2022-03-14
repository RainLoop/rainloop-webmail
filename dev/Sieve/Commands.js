/**
 * https://tools.ietf.org/html/rfc5228#section-2.9
 */

import { capa } from 'Sieve/Utils';

import {
	GrammarCommand,
	GrammarString,
	GrammarStringList,
	GrammarQuotedString
} from 'Sieve/Grammar';

/**
 * https://tools.ietf.org/html/rfc5228#section-3.1
 * Usage:
 *    if <test1: test> <block1: block>
 *    elsif <test2: test> <block2: block>
 *    else <block3: block>
 */
export class ConditionalCommand extends GrammarCommand
{
	constructor()
	{
		super();
		this.test = null;
	}

	toString()
	{
		return this.identifier + ' ' + this.test + ' ' + this.commands;
	}
/*
	public function pushArguments(array $args): void
	{
		print_r($args);
		exit;
	}
*/
}

export class IfCommand extends ConditionalCommand
{
}

export class ElsIfCommand extends ConditionalCommand
{
}

export class ElseCommand extends ConditionalCommand
{
	toString()
	{
		return this.identifier + ' ' + this.commands;
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-3.2
 */
export class RequireCommand extends GrammarCommand
{
	constructor()
	{
		super();
		this.capabilities = new GrammarStringList();
	}

	toString()
	{
		return 'require ' + this.capabilities.toString() + ';';
	}

	pushArguments(args)
	{
		if (args[0] instanceof GrammarStringList) {
			this.capabilities = args[0];
		} else if (args[0] instanceof GrammarQuotedString) {
			this.capabilities.push(args[0]);
		}
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-3.3
 */
export class StopCommand extends GrammarCommand
{
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4.1
 */
export class FileIntoCommand extends GrammarCommand
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
		return 'fileinto '
			// https://datatracker.ietf.org/doc/html/rfc3894
			+ ((this.copy && capa.includes('copy')) ? ':copy ' : '')
			// https://datatracker.ietf.org/doc/html/rfc5490#section-3.2
			+ ((this.create && capa.includes('mailbox')) ? ':create ' : '')
			+ this._mailbox
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
export class RedirectCommand extends GrammarCommand
{
	constructor()
	{
		super();
		// QuotedString / MultiLine
		this._address = new GrammarQuotedString();
	}

	toString()
	{
		return 'redirect '
			// https://datatracker.ietf.org/doc/html/rfc3894
			+ ((this.copy && capa.includes('copy')) ? ':copy ' : '')
			+ this._address
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
export class KeepCommand extends GrammarCommand
{
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4.4
 */
export class DiscardCommand extends GrammarCommand
{
}
