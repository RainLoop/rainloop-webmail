<?php

namespace RainLoop\Plugins;

//class PropertyCollection extends \MailSo\Base\Collection
class PropertyCollection extends \ArrayObject implements \JsonSerializable
{
	/**
	 * @var string
	 */
	private $sLabel;

	function __construct(string $sLabel)
	{
		$this->sLabel = $sLabel;
	}

	public function jsonSerialize()
	{
		return array(
			'@Object' => 'Object/PluginProperty',
			'Type' => \RainLoop\Enumerations\PluginPropertyType::GROUP,
			'Label' => $this->sLabel,
			'config' => $this->getArrayCopy()
/*
			'config' => [
				'@Object' => 'Collection/PropertyCollection',
				'@Collection' => $this->getArrayCopy(),
			]
*/
		);
	}
}
