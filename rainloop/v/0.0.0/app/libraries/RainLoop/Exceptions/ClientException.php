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
	 * @param int $iCode
	 * @param \Exception $oPrevious = null
	 * @param string $sAdditionalMessage = ''
	 * @param boolean $bLogoutOnException = false
	 */
	public function __construct($iCode, $oPrevious = null, $sAdditionalMessage = '', $bLogoutOnException = false)
	{
		parent::__construct(\RainLoop\Notifications::GetNotificationsMessage($iCode, $oPrevious),
			$iCode, $oPrevious);

		$this->sAdditionalMessage = $sAdditionalMessage;

		$this->setLogoutOnException($bLogoutOnException);
	}

	/**
	 * @return string
	 */
	public function getAdditionalMessage()
	{
		return $this->sAdditionalMessage;
	}

	/**
	 * @return boolen
	 */
	public function getLogoutOnException()
	{
		return $this->bLogoutOnException;
	}

	/**
	 * @param boolean $bLogoutOnException
	 * @param string $sAdditionalLogoutMessage = ''
	 *
	 * @return ClientException
	 */
	public function setLogoutOnException($bLogoutOnException, $sAdditionalLogoutMessage = '')
	{
		$this->bLogoutOnException = !!$bLogoutOnException;

		$this->sAdditionalMessage = $sAdditionalLogoutMessage;

		return $this;
	}
}
