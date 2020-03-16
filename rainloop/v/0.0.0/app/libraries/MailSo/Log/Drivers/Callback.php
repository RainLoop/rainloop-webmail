<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Log\Drivers;

/**
 * @category MailSo
 * @package Log
 * @subpackage Drivers
 */
class Callback extends \MailSo\Log\Driver
{
	/**
	 * @var mixed
	 */
	private $fWriteCallback;

	/**
	 * @var mixed
	 */
	private $fClearCallback;

	/**
	 * @param mixed $fWriteCallback
	 * @param mixed $fClearCallback
	 */
	protected function __construct($fWriteCallback, $fClearCallback)
	{
		parent::__construct();

		$this->fWriteCallback = \is_callable($fWriteCallback) ? $fWriteCallback : null;
		$this->fClearCallback = \is_callable($fClearCallback) ? $fClearCallback : null;
	}

	/**
	 * @param mixed $fWriteCallback
	 * @param mixed $fClearCallback = null
	 */
	public static function NewInstance($fWriteCallback, $fClearCallback = null) : \MailSo\Log\Drivers\Callback
	{
		return new self($fWriteCallback, $fClearCallback);
	}

	protected function writeImplementation($mDesc) : bool
	{
		if ($this->fWriteCallback)
		{
			\call_user_func_array($this->fWriteCallback, array($mDesc));
		}

		return true;
	}

	protected function clearImplementation() : bool
	{
		if ($this->fClearCallback)
		{
			\call_user_func($this->fClearCallback);
		}

		return true;
	}
}
