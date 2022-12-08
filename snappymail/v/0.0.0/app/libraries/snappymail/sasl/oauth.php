<?php
/**
 * https://datatracker.ietf.org/doc/html/rfc7628
 * https://developers.google.com/gmail/imap/xoauth2-protocol
 */


namespace SnappyMail\SASL;

class OAuth extends \SnappyMail\SASL
{
	public function authenticate(string $username, string $passphrase, ?string $authzid = null) : string
	{
		return $this->encode("n,a={$username},\x01auth=Bearer {$passphrase}\x01\x01");
	}

	public static function isSupported(string $param) : bool
	{
		return true;
	}
}
