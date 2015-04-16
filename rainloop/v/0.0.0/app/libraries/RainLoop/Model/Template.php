<?php

namespace RainLoop\Model;

class Template
{
	/**
	 * @var string
	 */
	private $sId;

	/**
	 * @var string
	 */
	private $sName;

	/**
	 * @var string
	 */
	private $sBody;

	/**
	 * @var bool
	 */
	private $bPopulateAlways;

	/**
	 * @param string $sId = ''
	 * @param string $sName = ''
	 * @param string $sBody = ''
	 *
	 * @return void
	 */
	protected function __construct($sId = '', $sName = '', $sBody = '')
	{
		$this->sId = $sId;
		$this->sName = $sName;
		$this->sBody = $sBody;
		$this->bPopulateAlways = false;
	}

	/**
	 * @param string $sId = ''
	 * @param string $sName = ''
	 * @param string $sBody = ''
	 *
	 * @return \RainLoop\Model\Template
	 */
	public static function NewInstance($sId = '', $sName = '', $sBody = '')
	{
		return new self($sId, $sBody);
	}

	/**
	 * @return string
	 */
	public function Id()
	{
		return $this->sId;
	}

	/**
	 * @return string
	 */
	public function Name()
	{
		return $this->sName;
	}

	/**
	 * @return string
	 */
	public function Body()
	{
		return $this->sBody;
	}

	/**
	 * @param bool $bPopulateAlways
	 */
	public function SetPopulateAlways($bPopulateAlways)
	{
		$this->bPopulateAlways = !!$bPopulateAlways;
	}

	/**
	 * @param array $aData
	 * @param bool $bAjax = false
	 *
	 * @return bool
	 */
	public function FromJSON($aData, $bAjax = false)
	{
		if (isset($aData['ID'], $aData['Name'], $aData['Body']))
		{
			$this->sId = $aData['ID'];
			$this->sName = $aData['Name'];
			$this->sBody = $aData['Body'];

			return true;
		}

		return false;
	}

	/**
	 * @param bool $bAjax = false
	 *
	 * @return array
	 */
	public function ToSimpleJSON($bAjax = false)
	{
		$sBody = $this->Body();
		$bPopulated = true;

		if ($bAjax && $bPopulated && !$this->bPopulateAlways)
		{
			if (1024 * 5 < \strlen($sBody) || true)
			{
				$bPopulated = false;
				$sBody = '';
			}
		}

		$aResult = array(
			'ID' => $this->Id(),
			'Name' => $this->Name(),
			'Body' => $sBody
		);

		if ($bAjax)
		{
			$aResult['Populated'] = $bPopulated;
		}

		return $aResult;
	}

	/**
	 * @return bool
	 */
	public function GenerateID()
	{
		return $this->sId = \MailSo\Base\Utils::Md5Rand();
	}

	/**
	 * @return bool
	 */
	public function Validate()
	{
		return 0 < \strlen($this->sBody);
	}
}
