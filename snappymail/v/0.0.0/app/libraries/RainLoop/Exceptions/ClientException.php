<?php

namespace RainLoop\Exceptions;

/**
 * @category RainLoop
 * @package Exceptions
 */
class ClientException extends Exception
{
	/**
	 * @var bool
	 */
	private $bLogoutOnException;

	/**
	 * @var string
	 */
	private $sAdditionalMessage;

	public function __construct(int $iCode, ?\Throwable $oPrevious = null, string $sAdditionalMessage = '', bool $bLogoutOnException = false)
	{
		parent::__construct(\RainLoop\Notifications::GetNotificationsMessage($iCode, $oPrevious),
			$iCode, $oPrevious);

		$this->sAdditionalMessage = $sAdditionalMessage ?: ($oPrevious ? $oPrevious->getMessage() : '');

		$this->bLogoutOnException = $bLogoutOnException;
	}

	public function getAdditionalMessage() : string
	{
		return $this->sAdditionalMessage;
	}

	public function getLogoutOnException() : bool
	{
		return $this->bLogoutOnException;
	}

	public function setLogoutOnException(bool $bLogoutOnException, string $sAdditionalLogoutMessage = '') : self
	{
		$this->bLogoutOnException = $bLogoutOnException;

		$this->sAdditionalMessage = $sAdditionalLogoutMessage;

		return $this;
	}
}
