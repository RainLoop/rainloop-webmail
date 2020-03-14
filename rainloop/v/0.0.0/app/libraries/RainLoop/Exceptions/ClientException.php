<?php

namespace RainLoop\Exceptions;

/**
 * @category RainLoop
 * @package Exceptions
 */
class ClientException extends Exception
{
	/**
	 * @var boolen
	 */
	private $bLogoutOnException;

	/**
	 * @var string
	 */
	private $sAdditionalMessage;

	/**
	 * @param \Exception $oPrevious = null
	 */
	public function __construct($iCode, $oPrevious = null, $sAdditionalMessage = '', $bLogoutOnException = false)
	{
		parent::__construct(\RainLoop\Notifications::GetNotificationsMessage($iCode, $oPrevious),
			$iCode, $oPrevious);

		$this->sAdditionalMessage = $sAdditionalMessage;

		$this->setLogoutOnException($bLogoutOnException);
	}

	public function getAdditionalMessage() : string
	{
		return $this->sAdditionalMessage;
	}

	public function getLogoutOnException() : bool
	{
		return $this->bLogoutOnException;
	}

	/**
	 *
	 * @return ClientException
	 */
	public function setLogoutOnException(bool $bLogoutOnException, string $sAdditionalLogoutMessage = '')
	{
		$this->bLogoutOnException = !!$bLogoutOnException;

		$this->sAdditionalMessage = $sAdditionalLogoutMessage;

		return $this;
	}
}
