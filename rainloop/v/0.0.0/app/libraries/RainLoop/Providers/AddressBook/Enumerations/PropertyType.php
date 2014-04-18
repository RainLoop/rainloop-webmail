<?php

namespace RainLoop\Providers\AddressBook\Enumerations;

class PropertyType
{
	const UNKNOWN = 0;

	const FULLNAME = 10;
	
	const FIRST_NAME = 15;
	const LAST_NAME = 16;
	const MIDDLE_NAME = 17;
	const NICK_NAME = 18;

	const NAME_PREFIX = 20;
	const NAME_SUFFIX = 21;

	const EMAIl_PERSONAL = 30;
	const EMAIl_BUSSINES = 31;
	const EMAIl_OTHER = 32;

	const PHONE_PERSONAL = 50;
	const PHONE_BUSSINES = 51;
	const PHONE_OTHER = 52;

	const MOBILE_PERSONAL = 60;
	const MOBILE_BUSSINES = 61;
	const MOBILE_OTHER = 62;

	const FAX_PERSONAL = 70;
	const FAX_BUSSINES = 71;
	const FAX_OTHER = 72;

	const FACEBOOK = 90;
	const SKYPE = 91;
	const GITHUB = 92;

	const NOTE = 110;

	const WEB_PAGE_PERSONAL = 220;
	const WEB_PAGE_BUSSINES = 221;
	const WEB_PAGE_OTHER = 222;

	const CUSTOM = 250;
}
