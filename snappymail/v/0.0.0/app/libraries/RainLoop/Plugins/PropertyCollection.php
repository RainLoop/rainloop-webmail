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

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return array(
			'@Object' => 'Object/PluginProperty',
			'type' => \RainLoop\Enumerations\PluginPropertyType::GROUP,
			'label' => $this->sLabel,
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
