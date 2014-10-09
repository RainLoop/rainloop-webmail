<?php

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

	/**
	 * @param string $sName
	 * @param array $aArg
	 */
	static public function Run($sName, $aArg = array())
	{
		if (isset(\MailSo\Hooks::$aCallbacks[$sName]))
		{
			foreach (\MailSo\Hooks::$aCallbacks[$sName] as $mCallback)
			{
				\call_user_func_array($mCallback, $aArg);
			}
		}
	}

	/**
	 * @param string $sName
	 * @param mixed $mCallback
	 */
	static public function Add($sName, $mCallback)
	{
		if (\is_callable($mCallback))
		{
			if (!isset(\MailSo\Hooks::$aCallbacks[$sName]))
			{
				\MailSo\Hooks::$aCallbacks[$sName] = array();
			}

			\MailSo\Hooks::$aCallbacks[$sName][] = $mCallback;
		}
	}
}
