// https://www.rfc-editor.org/rfc/rfc5545

(rl => {

	const
		paramRegEx = /;([a-zA-Z0-9-]+)=([^";:,]*|"[^"]*")/g,
		// eslint-disable-next-line max-len
		dateRegEx = /(?<year>[0-9]{4})(?<month>[0-9]{2})(?<day>[0-9]{2})T(?<hour>[0-9]{2})(?<minute>[0-9]{2})(?<second>[0-9]{2})(?<utc>Z?)/,
		parseDate = (str, tz) => {
			let parts = dateRegEx.exec(str)?.groups,
				options = {dateStyle: 'long', timeStyle: 'short'},
				date = (parts ? new Date(
					parseInt(parts.year, 10),
					parseInt(parts.month, 10) - 1,
					parseInt(parts.day, 10),
					parseInt(parts.hour, 10),
					parseInt(parts.minute, 10),
					parseInt(parts.second, 10)
				) : new Date(str));
			tz && (options.timeZone = windowsVTIMEZONEs[tz] || tz);
			try {
				return date.format(options);
			} catch (e) {
				console.error(e);
				if (options.timeZone) {
					options.timeZone = undefined;
					return date.format(options);
				}
			}
		};

	class Property extends String
	{
		constructor(name, value, params) {
			super(value);
			this.name = name;
//			this.value = value;
			this.params = {};
			if (params) {
				for (const param of params.matchAll(paramRegEx)) {
					if (param[2]) {
						this.params[param[1]] = param[2].replace(/^"|"$/);
					}
				}
			}
		}
/*
		includes(...params) {
			return this.value.includes(...params);
		}
		replace(...params) {
			return this.value.replace(...params);
		}
		toString() {
			return this.value;
		}
*/
		static fromString(data) {
			// Parse component property 'name *(";" param ) ":" value'
			const match = data.match(/^([a-zA-Z0-9-]+)((?:;[a-zA-Z0-9-]+=(?:[^";:,]*|"[^"]*"))*):(.+)$/);
			return match && new Property(match[1], match[3], match[2]);
		}
	}

	rl.ICS = {

		parseDate: parseDate,

		parseEvent(text) {
			let VEVENT,
				VALARM,
				multiple = ['ATTACH','ATTENDEE','CATEGORIES','COMMENT','CONTACT','EXDATE',
					'EXRULE','RSTATUS','RELATED','RESOURCES','RDATE','RRULE'],
				lines = text.split(/\r?\n/),
				i = lines.length;
			while (i--) {
				let line = lines[i], prop;
				if (VEVENT) {
					while (line.startsWith(' ') && i--) {
						line = lines[i] + line.slice(1);
					}
					if (line.startsWith('END:VALARM')) {
						// Start parsing Alarm Component
						VALARM = {};
						continue;
					} else if (line.startsWith('BEGIN:VALARM')) {
						// End parsing Alarm Component
						VEVENT.VALARM || (VEVENT.VALARM = []);
						VEVENT.VALARM.push(VALARM);
						VALARM = null;
						continue;
					} else if (line.startsWith('BEGIN:VEVENT')) {
						// End parsing
						break;
					}
					prop = Property.fromString(line);
					if (prop) {
						if (VALARM) {
							VALARM[prop.name] = prop;
						} else if (multiple.includes(prop.name) || 'X-' == prop.name.slice(0,2)) {
							VEVENT[prop.name] || (VEVENT[prop.name] = []);
							VEVENT[prop.name].push(prop);
						} else {
							if ('DTSTART' === prop.name || 'DTEND' === prop.name) {
								prop = parseDate(prop, prop.params.TZID);
							}
							VEVENT[prop.name] = prop;
						}
					}
				} else if (line.startsWith('END:VEVENT')) {
					// Start parsing Event Component
					VEVENT = {};
				}
			}
//			METHOD:REPLY || METHOD:REQUEST
			if (VEVENT) {
				VEVENT.rawText = text;
				VEVENT.isCancelled = () => VEVENT.STATUS?.includes('CANCELLED');
				VEVENT.isConfirmed = () => VEVENT.STATUS?.includes('CONFIRMED');
				VEVENT.shouldReply = () => VEVENT.METHOD?.includes('REPLY');
				console.dir({
					VEVENT,
					isCancelled: VEVENT.isCancelled(),
					shouldReply: VEVENT.shouldReply()
				});
			}

			return VEVENT;
		}
	};

	// Microsoft Windows timezones
	// Subset from https://github.com/unicode-cldr/cldr-core/blob/master/supplemental/windowsZones.json
	const windowsVTIMEZONEs = {
		// Windows : [IANA...]
		"Afghanistan Standard Time": [
			"Asia/Kabul"
		],
		"Alaskan Standard Time": [
			"America/Anchorage"/*,
			"America/Juneau",
			"America/Metlakatla",
			"America/Nome",
			"America/Sitka",
			"America/Yakutat"*/
		],
		"Aleutian Standard Time": [
			"America/Adak"
		],
		"Altai Standard Time": [
			"Asia/Barnaul"
		],
		"Arab Standard Time": [
			"Asia/Aden"/*,
			"Asia/Bahrain",
			"Asia/Kuwait",
			"Asia/Qatar",
			"Asia/Riyadh"
		*/],
		"Arabian Standard Time": [
			"Asia/Dubai"/*,
			"Asia/Muscat",
			"Etc/GMT-4"
		*/],
		"Arabic Standard Time": [
			"Asia/Baghdad"
		],
		"Argentina Standard Time": [
			"America/Argentina/La_Rioja"/*,
			"America/Argentina/Rio_Gallegos",
			"America/Argentina/Salta",
			"America/Argentina/San_Juan",
			"America/Argentina/San_Luis",
			"America/Argentina/Tucuman",
			"America/Argentina/Ushuaia",
			"America/Buenos_Aires",
			"America/Catamarca",
			"America/Cordoba",
			"America/Jujuy",
			"America/Mendoza"
		*/],
		"Astrakhan Standard Time": [
			"Europe/Astrakhan"/*,
			"Europe/Ulyanovsk"
		*/],
		"Atlantic Standard Time": [
			"America/Glace_Bay"/*,
			"America/Goose_Bay",
			"America/Halifax",
			"America/Moncton",
			"America/Thule",
			"Atlantic/Bermuda"
		*/],
		"AUS Central Standard Time": [
			"Australia/Darwin"
		],
		"Aus Central W. Standard Time": [
			"Australia/Eucla"
		],
		"AUS Eastern Standard Time": [
			"Australia/Melbourne"/*,
			"Australia/Sydney"
		*/],
		"Azerbaijan Standard Time": [
			"Asia/Baku"
		],
		"Azores Standard Time": [
			"America/Scoresbysund"/*,
			"Atlantic/Azores"
		*/],
		"Bahia Standard Time": [
			"America/Bahia"
		],
		"Bangladesh Standard Time": [
			"Asia/Dhaka"/*,
			"Asia/Thimphu"
		*/],
		"Belarus Standard Time": [
			"Europe/Minsk"
		],
		"Bougainville Standard Time": [
			"Pacific/Bougainville"
		],
		"Canada Central Standard Time": [
			"America/Regina"/*,
			"America/Swift_Current"
		*/],
		"Cape Verde Standard Time": [
			"Atlantic/Cape_Verde"/*,
			"Etc/GMT+1"
		*/],
		"Caucasus Standard Time": [
			"Asia/Yerevan"
		],
		"Cen. Australia Standard Time": [
			"Australia/Adelaide"/*,
			"Australia/Broken_Hill"
		*/],
		"Central America Standard Time": [
			"America/Belize"/*,
			"America/Costa_Rica",
			"America/El_Salvador",
			"America/Guatemala",
			"America/Managua",
			"America/Tegucigalpa",
			"Pacific/Galapagos",
			"Etc/GMT+6"
		*/],
		"Central Asia Standard Time": [
			"Asia/Almaty"/*,
			"Asia/Bishkek",
			"Asia/Qostanay",
			"Asia/Urumqi",
			"Indian/Chagos",
			"Antarctica/Vostok",
			"Etc/GMT-6"
		*/],
		"Central Brazilian Standard Time": [
			"America/Campo_Grande"/*,
			"America/Cuiaba"
		*/],
		"Central Europe Standard Time": [
			"Europe/Belgrade"/*,
			"Europe/Bratislava",
			"Europe/Budapest",
			"Europe/Ljubljana",
			"Europe/Podgorica",
			"Europe/Prague",
			"Europe/Tirane"
		*/],
		"Central European Standard Time": [
			"Europe/Sarajevo"/*,
			"Europe/Skopje",
			"Europe/Warsaw",
			"Europe/Zagreb"
		*/],
		"Central Pacific Standard Time": [
			"Pacific/Efate"/*,
			"Pacific/Guadalcanal",
			"Pacific/Noumea",
			"Pacific/Ponape Pacific/Kosrae",
			"Antarctica/Macquarie",
			"Etc/GMT-11"
		*/],
		"Central Standard Time": [
			"America/Chicago"/*,
			"America/Indiana/Knox",
			"America/Indiana/Tell_City",
			"America/Matamoros",
			"America/Menominee",
			"America/North_Dakota/Beulah",
			"America/North_Dakota/Center",
			"America/North_Dakota/New_Salem",
			"America/Rainy_River",
			"America/Rankin_Inlet",
			"America/Resolute",
			"America/Winnipeg",
			"CST6CDT"
		*/],
		"Central Standard Time (Mexico)": [
			"America/Bahia_Banderas"/*,
			"America/Merida",
			"America/Mexico_City",
			"America/Monterrey"
		*/],
		"Chatham Islands Standard Time": [
			"Pacific/Chatham"
		],
		"China Standard Time": [
			"Asia/Hong_Kong"/*,
			"Asia/Macau",
			"Asia/Shanghai"
		*/],
		"Cuba Standard Time": [
			"America/Havana"
		],
		"Dateline Standard Time": [
			"Etc/GMT+12"
		],
		"E. Africa Standard Time": [
			"Africa/Addis_Ababa"/*,
			"Africa/Asmera",
			"Africa/Dar_es_Salaam",
			"Africa/Djibouti",
			"Africa/Juba",
			"Africa/Kampala",
			"Africa/Mogadishu",
			"Africa/Nairobi",
			"Indian/Antananarivo",
			"Indian/Comoro",
			"Indian/Mayotte",
			"Antarctica/Syowa",
			"Etc/GMT-3"
		*/],
		"E. Australia Standard Time": [
			"Australia/Brisbane"/*,
			"Australia/Lindeman"
		*/],
		"E. Europe Standard Time": [
			"Europe/Chisinau"
		],
		"E. South America Standard Time": [
			"America/Sao_Paulo"
		],
		"Easter Island Standard Time": [
			"Pacific/Easter"
		],
		"Eastern Standard Time": [
			"America/Detroit"/*,
			"America/Indiana/Petersburg",
			"America/Indiana/Vincennes",
			"America/Indiana/Winamac",
			"America/Iqaluit",
			"America/Kentucky/Monticello",
			"America/Louisville",
			"America/Montreal",
			"America/Nassau",
			"America/New_York",
			"America/Nipigon",
			"America/Pangnirtung",
			"America/Thunder_Bay",
			"America/Toronto",
			"EST5EDT"
		*/],
		"Eastern Standard Time (Mexico)": [
			"America/Cancun"
		],
		"Egypt Standard Time": [
			"Africa/Cairo"
		],
		"Ekaterinburg Standard Time": [
			"Asia/Yekaterinburg"
		],
		"Fiji Standard Time": [
			"Pacific/Fiji"
		],
		"FLE Standard Time": [
			"Europe/Helsinki"/*,
			"Europe/Kiev",
			"Europe/Mariehamn",
			"Europe/Riga",
			"Europe/Sofia",
			"Europe/Tallinn",
			"Europe/Uzhgorod",
			"Europe/Vilnius",
			"Europe/Zaporozhye"
		*/],
		"Georgian Standard Time": [
			"Asia/Tbilisi"
		],
		"GMT Standard Time": [
			"Atlantic/Canary"/*,
			"Atlantic/Faeroe",
			"Atlantic/Madeira",
			"Europe/Dublin",
			"Europe/Guernsey",
			"Europe/Isle_of_Man",
			"Europe/Jersey",
			"Europe/Lisbon",
			"Europe/London"
		*/],
		"Greenland Standard Time": [
			"America/Godthab"
		],
		"Greenwich Standard Time": [
			"Africa/Abidjan"/*,
			"Africa/Accra",
			"Africa/Bamako",
			"Africa/Banjul",
			"Africa/Bissau",
			"Africa/Conakry",
			"Africa/Dakar",
			"Africa/Freetown",
			"Africa/Lome",
			"Africa/Monrovia",
			"Africa/Nouakchott",
			"Africa/Ouagadougou",
			"Atlantic/Reykjavik",
			"Atlantic/St_Helena"
		*/],
		"GTB Standard Time": [
			"Asia/Nicosia"/*,
			"Asia/Famagusta",
			"Europe/Athens",
			"Europe/Bucharest"
		*/],
		"Haiti Standard Time": [
			"America/Port-au-Prince"
		],
		"Hawaiian Standard Time": [
			"Pacific/Honolulu"/*,
			"Pacific/Johnston",
			"Pacific/Rarotonga",
			"Pacific/Tahiti",
			"Etc/GMT+10"
		*/],
		"India Standard Time": [
			"Asia/Calcutta"
		],
		"Iran Standard Time": [
			"Asia/Tehran"
		],
		"Israel Standard Time": [
			"Asia/Jerusalem"
		],
		"Jordan Standard Time": [
			"Asia/Amman"
		],
		"Kaliningrad Standard Time": [
			"Europe/Kaliningrad"
		],
		"Korea Standard Time": [
			"Asia/Seoul"
		],
		"Libya Standard Time": [
			"Africa/Tripoli"
		],
		"Line Islands Standard Time": [
			"Pacific/Kiritimati"/*,
			"Etc/GMT-14"
		*/],
		"Lord Howe Standard Time": [
			"Australia/Lord_Howe"
		],
		"Magadan Standard Time": [
			"Asia/Magadan"
		],
		"Magallanes Standard Time": [
			"America/Punta_Arenas"
		],
		"Marquesas Standard Time": [
			"Pacific/Marquesas"
		],
		"Mauritius Standard Time": [
			"Indian/Mauritius"/*,
			"Indian/Mahe",
			"Indian/Reunion"
		*/],
		"Middle East Standard Time": [
			"Asia/Beirut"
		],
		"Montevideo Standard Time": [
			"America/Montevideo"
		],
		"Morocco Standard Time": [
			"Africa/Casablanca"/*,
			"Africa/El_Aaiun"
		*/],
		"Mountain Standard Time": [
			"America/Boise"/*,
			"America/Cambridge_Bay",
			"America/Denver",
			"America/Edmonton",
			"America/Inuvik",
			"America/Ojinaga",
			"America/Yellowknife",
			"MST7MDT"
		*/],
		"Mountain Standard Time (Mexico)": [
			"America/Chihuahua"/*,
			"America/Mazatlan"
		*/],
		"Myanmar Standard Time": [
			"Asia/Rangoon"/*,
			"Indian/Cocos"
		*/],
		"N. Central Asia Standard Time": [
			"Asia/Novosibirsk"
		],
		"Namibia Standard Time": [
			"Africa/Windhoek"
		],
		"Nepal Standard Time": [
			"Asia/Katmandu"
		],
		"New Zealand Standard Time": [
			"Pacific/Auckland"/*,
			"Antarctica/McMurdo"
		*/],
		"Newfoundland Standard Time": [
			"America/St_Johns"
		],
		"Norfolk Standard Time": [
			"Pacific/Norfolk"
		],
		"North Asia East Standard Time": [
			"Asia/Irkutsk"
		],
		"North Asia Standard Time": [
			"Asia/Krasnoyarsk"/*,
			"Asia/Novokuznetsk"
		*/],
		"North Korea Standard Time": [
			"Asia/Pyongyang"
		],
		"Omsk Standard Time": [
			"Asia/Omsk"
		],
		"Pacific SA Standard Time": [
			"America/Santiago"
		],
		"Pacific Standard Time": [
			"America/Los_Angeles"/*,
			"America/Dawson",
			"America/Vancouver",
			"America/Whitehorse",
			"PST8PDT"
		*/],
		"Pacific Standard Time (Mexico)": [
			"America/Tijuana"/*,
			"America/Santa_Isabel"
		*/],
		"Pakistan Standard Time": [
			"Asia/Karachi"
		],
		"Paraguay Standard Time": [
			"America/Asuncion"
		],
		"Qyzylorda Standard Time": [
			"Asia/Qyzylorda"
		],
		"Romance Standard Time": [
			"Europe/Paris"/*,
			"Europe/Brussels",
			"Europe/Copenhagen",
			"Europe/Madrid",
			"Africa/Ceuta"
		*/],
		"Russia Time Zone 3": [
			"Europe/Samara"
		],
		"Russia Time Zone 10": [
			"Asia/Srednekolymsk"
		],
		"Russia Time Zone 11": [
			"Asia/Kamchatka"/*,
			"Asia/Anadyr"
		*/],
		"Russian Standard Time": [
			"Europe/Moscow"/*,
			"Europe/Kirov",
			"Europe/Simferopol"
		*/],
		"SA Eastern Standard Time": [
			"America/Belem"/*,
			"America/Cayenne",
			"America/Fortaleza",
			"America/Maceio",
			"America/Paramaribo",
			"America/Recife",
			"America/Santarem",
			"Atlantic/Stanley",
			"Antarctica/Palmer",
			"Antarctica/Rothera",
			"Etc/GMT+3"
		*/],
		"SA Pacific Standard Time": [
			"America/Bogota"/*,
			"America/Cayman",
			"America/Coral_Harbour",
			"America/Eirunepe",
			"America/Guayaquil",
			"America/Jamaica",
			"America/Lima",
			"America/Panama",
			"America/Rio_Branco",
			"Etc/GMT+5"
		*/],
		"SA Western Standard Time": [
			"America/Anguilla"/*,
			"America/Antigua",
			"America/Aruba",
			"America/Barbados",
			"America/Blanc-Sablon",
			"America/Boa_Vista",
			"America/Curacao",
			"America/Dominica",
			"America/Grenada",
			"America/Guadeloupe",
			"America/Guyana",
			"America/Kralendijk",
			"America/La_Paz",
			"America/Lower_Princes",
			"America/Manaus",
			"America/Marigot",
			"America/Martinique",
			"America/Montserrat",
			"America/Port_of_Spain",
			"America/Porto_Velho",
			"America/Puerto_Rico",
			"America/Santo_Domingo",
			"America/St_Barthelemy",
			"America/St_Kitts",
			"America/St_Lucia",
			"America/St_Thomas",
			"America/St_Vincent",
			"America/Tortola",
			"Etc/GMT+4"
		*/],
		"Saint Pierre Standard Time": [
			"America/Miquelon"
		],
		"Sakhalin Standard Time": [
			"Asia/Sakhalin"
		],
		"Samoa Standard Time": [
			"Pacific/Apia"
		],
		"Sao Tome Standard Time": [
			"Africa/Sao_Tome"
		],
		"Saratov Standard Time": [
			"Europe/Saratov"
		],
		"SE Asia Standard Time": [
			"Asia/Bangkok"/*,
			"Asia/Jakarta",
			"Asia/Phnom_Penh",
			"Asia/Pontianak",
			"Asia/Saigon",
			"Asia/Vientiane",
			"Indian/Christmas",
			"Antarctica/Davis",
			"Etc/GMT-7"
		*/],
		"Singapore Standard Time": [
			"Asia/Singapore"/*,
			"Asia/Brunei",
			"Asia/Kuala_Lumpur",
			"Asia/Kuching",
			"Asia/Makassar",
			"Asia/Manila",
			"Antarctica/Casey",
			"Etc/GMT-8"
		*/],
		"South Africa Standard Time": [
			"Africa/Johannesburg"/*,
			"Africa/Blantyre",
			"Africa/Bujumbura",
			"Africa/Gaborone",
			"Africa/Harare",
			"Africa/Kigali",
			"Africa/Lubumbashi",
			"Africa/Lusaka",
			"Africa/Maputo",
			"Africa/Maseru",
			"Africa/Mbabane",
			"Etc/GMT-2"
		*/],
		"Sri Lanka Standard Time": [
			"Asia/Colombo"
		],
		"Sudan Standard Time": [
			"Africa/Khartoum"
		],
		"Syria Standard Time": [
			"Asia/Damascus"
		],
		"Taipei Standard Time": [
			"Asia/Taipei"
		],
		"Tasmania Standard Time": [
			"Australia/Currie"/*,
			"Australia/Hobart"
		*/],
		"Tocantins Standard Time": [
			"America/Araguaina"
		],
		"Tokyo Standard Time": [
			"Asia/Tokyo"/*,
			"Asia/Dili",
			"Asia/Jayapura",
			"Pacific/Palau",
			"Etc/GMT-9"
		*/],
		"Tomsk Standard Time": [
			"Asia/Tomsk"
		],
		"Tonga Standard Time": [
			"Pacific/Tongatapu"
		],
		"Transbaikal Standard Time": [
			"Asia/Chita"
		],
		"Turkey Standard Time": [
			"Europe/Istanbul"
		],
		"Turks And Caicos Standard Time": [
			"America/Grand_Turk"
		],
		"Ulaanbaatar Standard Time": [
			"Asia/Ulaanbaatar"/*,
			"Asia/Choibalsan"
		*/],
		"US Eastern Standard Time": [
			"America/Indianapolis"/*,
			"America/Indiana/Marengo",
			"America/Indiana/Vevay"
		*/],
		"US Mountain Standard Time": [
			"America/Phoenix"/*,
			"America/Creston",
			"America/Dawson_Creek",
			"America/Fort_Nelson",
			"America/Hermosillo",
			"Etc/GMT+7"
		*/],
		"UTC": [
			"Etc/GMT"/*,
			"America/Danmarkshavn",
			"Etc/UTC"
		*/],
		"UTC-02": [
			"Etc/GMT+2"/*,
			"America/Noronha",
			"Atlantic/South_Georgia"
		*/],
		"UTC-08": [
			"Etc/GMT+8"/*,
			"Pacific/Pitcairn"
		*/],
		"UTC-09": [
			"Etc/GMT+9"/*,
			"Pacific/Gambier"
		*/],
		"UTC-11": [
			"Etc/GMT+11"/*,
			"Pacific/Midway",
			"Pacific/Niue",
			"Pacific/Pago_Pago"
		*/],
		"UTC+12": [
			"Etc/GMT-12"/*,
			"Pacific/Funafuti",
			"Pacific/Kwajalein",
			"Pacific/Majuro",
			"Pacific/Nauru",
			"Pacific/Tarawa",
			"Pacific/Wake",
			"Pacific/Wallis"
		*/],
		"UTC+13": [
			"Etc/GMT-13"/*,
			"Pacific/Enderbury",
			"Pacific/Fakaofo"
		*/],
		"Venezuela Standard Time": [
			"America/Caracas"
		],
		"Vladivostok Standard Time": [
			"Asia/Vladivostok"/*,
			"Asia/Ust-Nera"
		*/],
		"Volgograd Standard Time": [
			"Europe/Volgograd"
		],
		"W. Australia Standard Time": [
			"Australia/Perth"
		],
		"W. Central Africa Standard Time": [
			"Africa/Algiers"/*,
			"Africa/Bangui",
			"Africa/Brazzaville",
			"Africa/Douala",
			"Africa/Kinshasa",
			"Africa/Lagos",
			"Africa/Libreville",
			"Africa/Luanda",
			"Africa/Malabo",
			"Africa/Ndjamena",
			"Africa/Niamey",
			"Africa/Porto-Novo",
			"Africa/Tunis",
			"Etc/GMT-1"
		*/],
		"W. Europe Standard Time": [
			"Europe/Amsterdam"/*,
			"Europe/Andorra",
			"Europe/Berlin",
			"Europe/Busingen",
			"Europe/Gibraltar",
			"Europe/Luxembourg",
			"Europe/Malta",
			"Europe/Monaco",
			"Europe/Oslo",
			"Europe/Rome",
			"Europe/San_Marino",
			"Europe/Stockholm",
			"Europe/Vaduz",
			"Europe/Vatican",
			"Europe/Vienna",
			"Europe/Zurich",
			"Arctic/Longyearbyen"
		*/],
		"W. Mongolia Standard Time": [
			"Asia/Hovd"
		],
		"West Asia Standard Time": [
			"Asia/Aqtau"/*,
			"Asia/Aqtobe",
			"Asia/Ashgabat",
			"Asia/Atyrau",
			"Asia/Dushanbe",
			"Asia/Oral",
			"Asia/Samarkand",
			"Asia/Tashkent",
			"Indian/Kerguelen",
			"Indian/Maldives",
			"Antarctica/Mawson",
			"Etc/GMT-5"
		*/],
		"West Bank Standard Time": [
			"Asia/Gaza"/*,
			"Asia/Hebron"
		*/],
		"West Pacific Standard Time": [
			"Pacific/Guam"/*,
			"Pacific/Port_Moresby",
			"Pacific/Saipan",
			"Pacific/Truk",
			"Antarctica/DumontDUrville",
			"Etc/GMT-10"
		*/],
		"Yakutsk Standard Time": [
			"Asia/Khandyga"/*,
			"Asia/Yakutsk"
		*/],
	};
})(window.rl);
