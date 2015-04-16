<?php

namespace RainLoop\Exceptions;

/**
 * @category RainLoop
 * @package Exceptions
 */
class ClientException extends Exception
{
	/**
	 *
	 * @var string
	 */
	private $sAdditionalMessage;

	public function __construct($iCode, $oPrevious = null, $sAdditionalMessage = '')
	{
		parent::__construct(\RainLoop\Notifications::GetNotificationsMessage($iCode, $oPrevious),
			$iCode, $oPrevious);

		$this->sAdditionalMessage = $sAdditionalMessage;
	}

	/**
	 * @return string
	 */
	public function getAdditionalMessage()
	{
		return $this->sAdditionalMessage;
	}
}
