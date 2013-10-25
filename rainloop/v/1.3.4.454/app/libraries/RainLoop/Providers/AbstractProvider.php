<?php

namespace RainLoop\Providers;

abstract class AbstractProvider
{
	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return false;
	}
}
