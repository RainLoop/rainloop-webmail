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

if (!\defined('MAILSO_LIBRARY_ROOT_PATH'))
{
	\define('MAILSO_LIBRARY_ROOT_PATH', \defined('MAILSO_LIBRARY_USE_PHAR')
		? 'phar://mailso.phar/' : \rtrim(\realpath(__DIR__), '\\/').'/');

	/**
	 * @param string $sClassName
	 *
	 * @return mixed
	 */
	function MailSoSplAutoloadRegisterFunction($sClassName)
	{
		return (0 === \strpos($sClassName, 'MailSo') && false !== \strpos($sClassName, '\\')) ?
			include MAILSO_LIBRARY_ROOT_PATH.\str_replace('\\', '/', \substr($sClassName, 7)).'.php' : false;
	}

	\spl_autoload_register('MailSo\MailSoSplAutoloadRegisterFunction', false);

	if (\class_exists('MailSo\Base\Loader'))
	{
		\MailSo\Base\Loader::Init();
	}
	else
	{
		\spl_autoload_unregister('MailSo\MailSoSplAutoloadRegisterFunction');
	}
}