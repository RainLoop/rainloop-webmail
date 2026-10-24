/**
 * https://tools.ietf.org/html/rfc5435
 */

import {
	ActionCommand,
	GrammarNumber,
	GrammarQuotedString,
	GrammarStringList,
	TestCommand
} from 'Sieve/Grammar';

/**
 * https://datatracker.ietf.org/doc/html/rfc5435#section-3
 */
export class NotifyCommand extends ActionCommand
{
	constructor()
	{
		super();
		this._method = new GrammarQuotedString;
		this._from = new GrammarQuotedString;
		this._importance = new GrammarNumber;
		this.options = new GrammarStringList;
		this._message = new GrammarQuotedString;
	}

	get method()     { return this._method.value; }
	set method(str)  { this._method.value = str; }

	get from()       { return this._from.value; }
	set from(str)    { this._from.value = str; }

	get importance() { return this._importance.value; }
	set importance(int) { this._importance.value = int; }

	get message()    { return this._message.value; }
	set message(str) { this._message.value = str; }

	get require() { return 'enotify'; }

	toString()
	{
		let result = 'notify';
		if (this._from.value) {
			result += ' :from ' + this._from;
		}
		if (0 < this._importance.value) {
			result += ' :importance ' + this._importance;
		}
		if (this.options.length) {
			result += ' :options ' + this.options;
		}
		if (this._message.value) {
			result += ' :message ' + this._message;
		}
		return result + ' ' + this._method;
	}

	pushArguments(args)
	{
		this._method.value = args.pop().value; // GrammarQuotedString
		args.forEach((arg, i) => {
			if (i && ':options' === args[i-1]) {
				this.options = arg; // GrammarStringList
			} else if (i && ':' === args[i-1][0]) {
				// :from, :importance, :message
				let p = args[i-1].replace(':','_');
				this[p] ? (this[p].value = arg.value) : console.log('Unknown VacationCommand :' + p);
			}
		});
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5435#section-4
 */
export class ValidNotifyMethodTest extends TestCommand
{
	constructor()
	{
		super();
		this.notification_uris = new GrammarStringList;
	}

	toString()
	{
		return 'valid_notify_method ' + this.notification_uris;
	}

	pushArguments(args)
	{
		this.notification_uris = args.pop();
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5435#section-5
 */
export class NotifyMethodCapabilityTest extends TestCommand
{
	constructor()
	{
		super();
		this._notification_uri = new GrammarQuotedString;
		this._notification_capability = new GrammarQuotedString;
		this.key_list = new GrammarStringList;
	}

	get notification_uri() { return this._notification_uri.value; }
	set notification_uri(v) { this._notification_uri.value = v; }

	get notification_capability() { return this._notification_capability.value; }
	set notification_capability(v) { this._notification_capability.value = v; }

	toString()
	{
		return 'valid_notify_method '
			+ (this._comparator ? ' :comparator ' + this._comparator : '')
			+ (this._match_type ? ' ' + this._match_type : '')
			+ (this.relational_match ? ' ' + this.relational_match : '')
			+ this._notification_uri
			+ this._notification_capability
			+ this.key_list;
	}

	pushArguments(args)
	{
		this.key_list = args.pop();
		this._notification_capability = args.pop();
		this._notification_uri = args.pop();
	}
}
