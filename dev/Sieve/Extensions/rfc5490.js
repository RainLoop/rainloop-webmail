/**
 * https://tools.ietf.org/html/rfc5490
 */

import {
	GrammarTest,
	GrammarString,
	GrammarStringList
} from 'Sieve/Grammar';

/**
 * https://datatracker.ietf.org/doc/html/rfc5490#section-3.1
 */
export class MailboxExistsTest extends GrammarTest
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
export class MetadataTest extends GrammarTest
{
	constructor()
	{
		super();
		this.mailbox = new GrammarString;
		this.annotation_name = new GrammarString;
		this.key_list = new GrammarStringList;
	}

	get require() { return 'mboxmetadata'; }

	toString()
	{
		return 'metadata '
			+ ' ' + this.match_type
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.mailbox
			+ ' ' + this.annotation_name
			+ ' ' + this.key_list.toString();
	}

	pushArguments(args)
	{
		this.mailbox = args[args.length-3];
		this.annotation_name = args[args.length-2];
		this.key_list = args[args.length-1];
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5490#section-3.4
 */
export class MetadataExistsTest extends GrammarTest
{
	constructor()
	{
		super();
		this.mailbox = new GrammarString;
		this.annotation_names = new GrammarStringList;
	}

	get require() { return 'mboxmetadata'; }

	toString()
	{
		return 'metadataexists '
			+ ' ' + this.mailbox
			+ ' ' + this.annotation_names;
	}

	pushArguments(args)
	{
		this.mailbox = args[args.length-2];
		this.annotation_names = args[args.length-1];
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5490#section-3.3
 */
export class ServerMetadataTest extends GrammarTest
{
	constructor()
	{
		super();
		this.annotation_name = new GrammarString;
		this.key_list = new GrammarStringList;
	}

	get require() { return 'servermetadata'; }

	toString()
	{
		return 'servermetadata '
			+ ' ' + this.match_type
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ ' ' + this.annotation_name
			+ ' ' + this.key_list.toString();
	}

	pushArguments(args)
	{
		this.annotation_name = args[args.length-2];
		this.key_list = args[args.length-1];
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5490#section-3.4
 */
export class ServerMetadataExistsTest extends GrammarTest
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
		this.annotation_names = args[args.length-1];
	}
}
