<?php

namespace RainLoop\Providers;

abstract class AbstractProvider
{
	use \MailSo\Log\Inherit;

	abstract public function IsActive() : bool;
}
