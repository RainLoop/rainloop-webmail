<?php

interface TwoFactorAuthInterface
{
	public function Label() : string;
	public function VerifyCode(string $sSecret, string $sCode) : bool;
	public function CreateSecret() : string;
}
