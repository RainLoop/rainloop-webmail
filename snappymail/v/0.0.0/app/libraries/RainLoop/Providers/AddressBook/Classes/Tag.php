<?php

namespace RainLoop\Providers\AddressBook\Classes;

class Tag implements \JsonSerializable
{
	/**
	 * @var string
	 */
	public $IdContactTag;

	/**
	 * @var string
	 */
	public $Name;

	/**
	 * @var bool
	 */
	public $ReadOnly;

	public function __construct()
	{
		$this->Clear();
	}

	public function Clear() : void
	{
		$this->IdContactTag = '';
		$this->Name = '';
		$this->ReadOnly = false;
	}

	public function jsonSerialize()
	{
		return array(
			'@Object' => 'Object/Tag',
			'id' => $this->IdContactTag,
			'name' => \MailSo\Base\Utils::Utf8Clear($mResponse->Name),
			'readOnly' => $this->ReadOnly
		);
	}
}
