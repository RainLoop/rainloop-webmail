<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo;

/**
 * @category MailSo
 */
class Hooks
{
	/**
	 * @var array
	 */
	static $aCallbacks = array();

	static public function Run(string $sName, array $aArg = array()) : void
	{
		if (isset(static::$aCallbacks[$sName]))
		{
			foreach (static::$aCallbacks[$sName] as $mCallback)
			{
				$mCallback(...$aArg);
			}
		}
	}

	/**
	 * @param mixed $mCallback
	 */
	static public function Add(string $sName, $mCallback) : void
	{
		if (\is_callable($mCallback))
		{
			if (!isset(static::$aCallbacks[$sName]))
			{
				static::$aCallbacks[$sName] = array();
			}

			static::$aCallbacks[$sName][] = $mCallback;
		}
	}
}
