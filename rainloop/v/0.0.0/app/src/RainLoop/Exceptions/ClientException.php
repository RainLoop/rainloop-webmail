<?php

namespace RainLoop\Exceptions;

/**
 * @category RainLoop
 * @package Exceptions
 */
class ClientException extends Exception
{
	public function __construct($iCode, $oPrevious = null)
	{
		parent::__construct(\RainLoop\Notifications::GetNotificationsMessage($iCode, $oPrevious), $iCode, $oPrevious);
	}
}
