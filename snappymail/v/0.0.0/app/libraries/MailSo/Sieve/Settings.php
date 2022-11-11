<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2022 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Sieve;

/**
 * @category MailSo
 * @package Net
 */
class Settings extends \MailSo\Net\ConnectSettings
{
	public int $port = 4190;

	public bool $enabled = false;

	public bool $initialAuthPlain = false;

	public function __construct()
	{
		parent::__construct();
		$oConfig = \RainLoop\API::Config();
		$this->initialAuthPlain = !!$oConfig->Get('labs', 'sieve_auth_plain_initial', true);
	}

	public static function fromArray(array $aSettings) : self
	{
		$object = parent::fromArray($aSettings);
		$object->enabled = !empty($aSettings['enabled']);
		return $object;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return \array_merge(
			parent::jsonSerialize(),
			[
//				'@Object' => 'Object/SmtpSettings',
				'enabled' => $this->enabled
			]
		);
	}

}
