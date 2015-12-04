<?php

namespace RainLoop\Providers;

use \RainLoop\Providers\Message\Enumerations\PropertyType as PropertyType;

class Message extends \RainLoop\Providers\AbstractProvider
{
	/**
	 * @var \RainLoop\Providers\Message\MessageInterface
	 */
	private $oDriver;

	/**
	 * @param \RainLoop\Providers\Message\Interface $oDriver
	 *
	 * @return void
	 */
	public function __construct($oDriver)
	{
		$this->oDriver = null;
		if ($oDriver instanceof \RainLoop\Providers\Message\MessageInterface)
		{
			$this->oDriver = $oDriver;
		}
	}

	/**
	 * @return string
	 */
	public function syncMessageList($oMessageCollection)
	{
		\sleep(1);
		return $this->oDriver instanceof \RainLoop\Providers\Message\MessageInterface ?
			$this->oDriver->syncMessageList($oMessageCollection) : 'Message driver is not allowed';
	}

	/**
	 * @return string
	 */
	public function Test()
	{
		\sleep(1);
		return $this->oDriver instanceof \RainLoop\Providers\Message\MessageInterface ?
			$this->oDriver->Test() : 'Message driver is not allowed';
	}

	/**
	 * @return bool
	 */
	public function IsActive()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Message\MessageInterface &&
			$this->oDriver->IsSupported();
	}

	/**
	 * @return bool
	 */
	public function IsSupported()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Message\MessageInterface &&
			$this->oDriver->IsSupported();
	}

	/**
	 * @return bool
	 */
	public function IsSharingAllowed()
	{
		return $this->oDriver instanceof \RainLoop\Providers\Message\MessageInterface &&
			$this->oDriver->IsSharingAllowed();
	}

	/**
	 * @param string $sEmail
	 * @param string $sUrl
	 * @param string $sUser
	 * @param string $sPassword
	 *
	 * @return bool
	 */
	public function Sync($sEmail, $sUrl, $sUser, $sPassword)
	{
		return $this->IsActive() ? $this->oDriver->Sync($sEmail, $sUrl, $sUser, $sPassword) : false;
	}

	/**
	 * @param \MailSo\Mail\Message $oMessage
	 *
	 * @return bool
	 */
	public function CreateMessage(&$oMessage)
	{
		return $this->IsActive() ? $this->oDriver->CreateMessage($oMessage) : false;
	}

}
