import { AbstractModel } from 'Knoin/AbstractModel';
import { addObservablesTo, addComputablesTo } from 'External/ko';

import { JCard } from 'DAV/JCard';
//import { VCardProperty } from 'DAV/VCardProperty';

const nProps = [
	'surName',
	'givenName',
	'middleName',
	'namePrefix',
	'nameSuffix'
];

/*
const propertyMap = [
	// vCard 2.1 properties and up
	'N' => 'Text',
	'FN' => 'FlatText',
	'PHOTO' => 'Binary',
	'BDAY' => 'DateAndOrTime',
	'ADR' => 'Text',
	'TEL' => 'FlatText',
	'EMAIL' => 'FlatText',
	'GEO' => 'FlatText',
	'TITLE' => 'FlatText',
	'ROLE' => 'FlatText',
	'LOGO' => 'Binary',
	'ORG' => 'Text',
	'NOTE' => 'FlatText',
	'REV' => 'TimeStamp',
	'SOUND' => 'FlatText',
	'URL' => 'Uri',
	'UID' => 'FlatText',
	'VERSION' => 'FlatText',
	'KEY' => 'FlatText', // <uri>data:application/pgp-keys;base64,AZaz09==</uri>
	'TZ' => 'Text',

	// vCard 3.0 properties
	'CATEGORIES' => 'Text',
	'SORT-STRING' => 'FlatText',
	'PRODID' => 'FlatText',
	'NICKNAME' => 'Text',

	// rfc2739 properties
	'FBURL' => 'Uri',
	'CAPURI' => 'Uri',
	'CALURI' => 'Uri',
	'CALADRURI' => 'Uri',

	// rfc4770 properties
	'IMPP' => 'Uri',

	// vCard 4.0 properties
	'SOURCE' => 'Uri',
	'XML' => 'FlatText',
	'ANNIVERSARY' => 'DateAndOrTime',
	'CLIENTPIDMAP' => 'Text',
	'LANG' => 'LanguageTag',
	'GENDER' => 'Text',
	'KIND' => 'FlatText',
	'MEMBER' => 'Uri',
	'RELATED' => 'Uri',

	// rfc6474 properties
	'BIRTHPLACE' => 'FlatText',
	'DEATHPLACE' => 'FlatText',
	'DEATHDATE' => 'DateAndOrTime',

	// rfc6715 properties
	'EXPERTISE' => 'FlatText',
	'HOBBY' => 'FlatText',
	'INTEREST' => 'FlatText',
	'ORG-DIRECTORY' => 'FlatText
];
*/

export class ContactModel extends AbstractModel {
	constructor() {
		super();

		this.jCard = ['vcard',[]];

		addObservablesTo(this, {
			// Also used by Selector
			focused: false,
			selected: false,
			checked: false,

			deleted: false,
			readOnly: false,

			id: 0,
			givenName:  '', // FirstName
			surName:    '', // LastName
			middleName: '', // MiddleName
			namePrefix: '', // NamePrefix
			nameSuffix: '',  // NameSuffix
			nickname: null,
			note: null,

			// Business
			org: '',
			department: '',
			title: '',

			// Crypto
			encryptpref: '',
			signpref: ''
		});
//		this.email = koArrayWithDestroy();
		this.email = ko.observableArray();
		this.tel   = ko.observableArray();
		this.url   = ko.observableArray();
		this.adr   = ko.observableArray();

		addComputablesTo(this, {
			fullName: () => [this.namePrefix(), this.givenName(), this.middleName(), this.surName()].join(' ').trim(),

			display: () => {
				let a = this.fullName(),
					b = this.email()?.[0]?.value(),
					c = this.nickname();
				return a || b || c;
			}
/*
			fullName: {
				read: () => this.givenName() + " " + this.surName(),
				write: value => {
					this.jCard.set('fn', value/*, params, group* /)
				}
			}
*/
		});
	}

	/**
	 * @returns {Array|null}
	 */
	getNameAndEmailHelper() {
		let name = (this.givenName() + ' ' + this.surName()).trim(),
			email = this.email()[0];
/*
//		this.jCard.getOne('fn')?.notEmpty() ||
		this.jCard.parseFullName({set:true});
//		let name = this.jCard.getOne('nickname'),
		let name = this.jCard.getOne('fn'),
			email = this.jCard.getOne('email');
*/
		return email ? [email, name] : null;
	}

	/**
	 * @static
	 * @param {jCard} json
	 * @returns {?ContactModel}
	 */
	static reviveFromJson(json) {
		const contact = super.reviveFromJson(json);
		if (contact) {
			let jCard = new JCard(json.jCard),
				props = jCard.getOne('n')?.value;
			props && props.forEach((value, index) =>
				value && contact[nProps[index]](value)
			);

			['nickname', 'note', 'title'].forEach(field => {
				props = jCard.getOne(field);
				props && contact[field](props.value);
			});

			if ((props = jCard.getOne('org')?.value)) {
				contact.org(props[0]);
				contact.department(props[1] || '');
			}

			['email', 'tel', 'url'].forEach(field => {
				props = jCard.get(field);
				props && props.forEach(prop => {
					contact[field].push({
						value: ko.observable(prop.value)
//						type: prop.params.type
					});
				});
			});

			props = jCard.get('adr');
			props && props.forEach(prop => {
				contact.adr.push({
					street: ko.observable(prop.value[2]),
					street_ext: ko.observable(prop.value[1]),
					locality: ko.observable(prop.value[3]),
					region: ko.observable(prop.value[4]),
					postcode: ko.observable(prop.value[5]),
					pobox: ko.observable(prop.value[0]),
					country: ko.observable(prop.value[6]),
					preferred: ko.observable(prop.params.pref),
					type: ko.observable(prop.params.type) // HOME | WORK
				});
			});

			props = jCard.getOne('x-crypto');
			contact.signpref(props?.params.signpref || 'Ask');
			contact.encryptpref(props?.params.encryptpref || 'Ask');
//			contact.encryptpref(props?.params.allowed || 'PGP/INLINE,PGP/MIME,S/MIME,S/MIMEOpaque');

			contact.jCard = json.jCard;
		}
		return contact;
	}

	/**
	 * @returns {string}
	 */
	generateUid() {
		return '' + this.id;
	}

	addEmail() {
		// home, work
		this.email.push({
			value: ko.observable('')
//			type: prop.params.type
		});
	}

	addTel() {
		// home, work, text, voice, fax, cell, video, pager, textphone, iana-token, x-name
		this.tel.push({
			value: ko.observable('')
//			type: prop.params.type
		});
	}

	addUrl() {
		// home, work
		this.url.push({
			value: ko.observable('')
//			type: prop.params.type
		});
	}

	addNickname() {
		// home, work
		this.nickname() || this.nickname('');
	}

	addNote() {
		this.note() || this.note('');
	}

	hasChanges()
	{
		return this.email().filter(v => v.length).length && this.toJSON().jCard != JSON.stringify(this.jCard);
	}

	toJSON()
	{
		let jCard = new JCard(this.jCard);
		jCard.set('n', [
			this.surName(),
			this.givenName(),
			this.middleName(),
			this.namePrefix(),
			this.nameSuffix()
		]/*, params, group*/);
//		jCard.parseFullName({set:true});

		['nickname', 'note', 'title'].forEach(field =>
			this[field]() ? jCard.set(field, this[field]()/*, params, group*/) : jCard.remove(field)
		);

		if (this.org()) {
			let org = [this.org()];
			if (this.department()) {
				org.push(this.department());
			}
			let prop = jCard.getOne('org');
			prop ? prop.value = org : jCard.set('org', org);
		} else {
			jCard.remove('');
		}

		['email', 'tel', 'url'].forEach(field => {
			let values = this[field].map(item => item.value());
			jCard.get(field).forEach(prop => {
				let i = values.indexOf(prop.value);
				if (0 > i || !prop.value) {
					jCard.remove(prop);
				} else {
					values.splice(i, 1);
				}
			});
			values.forEach(value => value && jCard.add(field, value));
		});

		jCard.set('x-crypto', '', {
			allowed: 'PGP/INLINE,PGP/MIME,S/MIME,S/MIMEOpaque',
			signpref: this.signpref(),
			encryptpref: this.encryptpref()
		}, 'x-crypto');

		// Done by server
//		jCard.set('rev', '2022-05-21T10:59:52Z')

		return {
			Uid: this.id,
			jCard: JSON.stringify(jCard)
		};
	}

	/**
	 * @return string
	 */
	lineAsCss() {
		return (this.selected() ? 'selected' : '')
			+ (this.deleted() ? ' deleted' : '')
			+ (this.checked() ? ' checked' : '')
			+ (this.focused() ? ' focused' : '');
	}
}
