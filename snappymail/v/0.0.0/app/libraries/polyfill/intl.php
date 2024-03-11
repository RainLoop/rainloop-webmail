<?php

if (!\function_exists('idn_to_ascii')) {
	function idn_to_ascii(string $domain) {
		return \SnappyMail\Intl\Idn::toAscii($domain);
	}
}

if (!\function_exists('idn_to_utf8')) {
	function idn_to_utf8(string $domain) {
		return \SnappyMail\Intl\Idn::toUtf8($domain);
	}
}
