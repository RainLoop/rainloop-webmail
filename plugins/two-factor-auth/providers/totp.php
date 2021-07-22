<?php

class TwoFactorAuthTotp implements TwoFactorAuthInterface
{
	public function Label() : string
	{
		return 'Two Factor Authenticator Code';
	}

	public function VerifyCode(string $sSecret, string $sCode) : bool
	{
		return \SnappyMail\TOTP::Verify($sSecret, $sCode);
	}

	public function CreateSecret() : string
	{
		return \SnappyMail\TOTP::CreateSecret();
	}

}
