<?php

namespace RainLoop\Providers\AddressBook\Enumerations;

abstract class PropertyType
{
	const UNKNOWN = 0;

	const UID = 9;
	const FULLNAME = 10;

	const FIRST_NAME = 15;
	const LAST_NAME = 16;
	const MIDDLE_NAME = 17;
	const NICK_NAME = 18;

	const NAME_PREFIX = 20;
	const NAME_SUFFIX = 21;

	const EMAIl = 30;
	const PHONE = 31;
//	const MOBILE = 32;
//	const FAX = 33;
	const WEB_PAGE = 32;

	const BIRTHDAY = 40;

	const FACEBOOK = 90;
	const SKYPE = 91;
	const GITHUB = 92;

	const NOTE = 110;

	const CUSTOM = 250;

	const JCARD = 251;
}
