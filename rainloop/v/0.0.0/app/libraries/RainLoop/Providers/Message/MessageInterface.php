<?php

namespace RainLoop\Providers\Message;

interface MessageInterface
{
	/**
	 * @return bool
	 */
	public function IsSupported();
}