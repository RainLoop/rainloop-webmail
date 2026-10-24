/**
 * https://tools.ietf.org/html/rfc5490
 */

import {
	TestCommand,
	GrammarQuotedString,
	GrammarStringList
} from 'Sieve/Grammar';

/**
 * https://datatracker.ietf.org/doc/html/rfc5490#section-3.1
 */
export class MailboxExistsTest extends TestCommand
{
	constructor()
	{
		super();
		this.mailbox_names = new GrammarStringList;
	}

	get require() { return 'mailbox'; }

	toString()
	{
		return 'mailboxexists ' + this.mailbox_names + ';';
	}

	pushArguments(args)
	{
		if (args[0] instanceof GrammarStringList) {
			this.mailbox_names = args[0];
		}
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5490#section-3.3
 */
export class MetadataTest extends TestCommand
{
	constructor()
	{
		super();
		this._mailbox = new GrammarQuotedString;
		this._annotation_name = new GrammarQuotedString;
		this.key_list = new GrammarStringList;
	}

	get require() { return 'mboxmetadata'; }

	get mailbox() { return this._mailbox.value; }
	set mailbox(v) { this._mailbox.value = v; }

	get annotation_name() { return this._annotation_name.value; }
	set annotation_name(v) { this._annotation_name.value = v; }

	toString()
	{
		return 'metadata '
			+ ' ' + this._match_type
			+ (this.relational_match ? ' ' + this.relational_match : '')
			+ (this._comparator ? ' :comparator ' + this._comparator : '')
			+ ' ' + this._mailbox
			+ ' ' + this._annotation_name
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		this.key_list = args.pop();
		this._annotation_name = args.pop();
		this._mailbox = args.pop();
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5490#section-3.4
 */
export class MetadataExistsTest extends TestCommand
{
	constructor()
	{
		super();
		this._mailbox = new GrammarQuotedString;
		this.annotation_names = new GrammarStringList;
	}

	get require() { return 'mboxmetadata'; }

	get mailbox() { return this._mailbox.value; }
	set mailbox(v) { this._mailbox.value = v; }

	toString()
	{
		return 'metadataexists '
			+ ' ' + this._mailbox
			+ ' ' + this.annotation_names;
	}

	pushArguments(args)
	{
		this.annotation_names = args.pop();
		this._mailbox = args.pop();
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5490#section-3.3
 */
export class ServerMetadataTest extends TestCommand
{
	constructor()
	{
		super();
		this._annotation_name = new GrammarQuotedString;
		this.key_list = new GrammarStringList;
	}

	get require() { return 'servermetadata'; }

	get annotation_name() { return this._annotation_name.value; }
	set annotation_name(v) { this._annotation_name.value = v; }

	toString()
	{
		return 'servermetadata '
			+ ' ' + this._match_type
			+ (this.relational_match ? ' ' + this.relational_match : '')
			+ (this._comparator ? ' :comparator ' + this._comparator : '')
			+ ' ' + this._annotation_name
			+ ' ' + this.key_list;
	}

	pushArguments(args)
	{
		this.key_list = args.pop();
		this._annotation_name = args.pop();
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5490#section-3.4
 */
export class ServerMetadataExistsTest extends TestCommand
{
	constructor()
	{
		super();
		this.annotation_names = new GrammarStringList;
	}

	get require() { return 'servermetadata'; }

	toString()
	{
		return 'servermetadataexists '
			+ ' ' + this.annotation_names;
	}

	pushArguments(args)
	{
		this.annotation_names = args.pop();
	}
}
