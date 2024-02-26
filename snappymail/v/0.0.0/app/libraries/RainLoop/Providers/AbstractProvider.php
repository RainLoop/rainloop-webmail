<?php

namespace RainLoop\Providers;

abstract class AbstractProvider
{
	use \MailSo\Log\Inherit;

	public function IsActive() : bool
	{
		return false;
	}
}
