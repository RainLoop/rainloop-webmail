<?php

namespace MailSo\Base\Enumerations;

/**
 * @category MailSo
 * @package Base
 * @subpackage Enumerations
 */
class Encoding
{
	const QUOTED_PRINTABLE = 'Quoted-Printable';
	const QUOTED_PRINTABLE_LOWER = 'quoted-printable';
	const QUOTED_PRINTABLE_SHORT = 'Q';

	const BASE64 = 'Base64';
	const BASE64_LOWER = 'base64';
	const BASE64_SHORT = 'B';

	const SEVEN_BIT = '7bit';
	const _7_BIT = '7bit';
	const EIGHT_BIT = '8bit';
	const _8_BIT = '8bit';
}
