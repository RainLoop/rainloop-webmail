<?php

namespace MailSo\Imap;

/**
 * @category MailSo
 * @package Imap
 */
class SearchBuilder
{
	/**
	 * @var array
	 */
	private $aList;

	/**
	 * @access private
	 */
	private function __construct()
	{
		$this->Clear();
	}

	/**
	 * @return \MailSo\Imap\SearchBuilder
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @return \MailSo\Imap\SearchBuilder
	 */
	public function Clear()
	{
		$this->aList = array();
		return $this;
	}

	/**
	 * @param string $sName
	 * @param string $sValue = ''
	 *
	 * @return \MailSo\Imap\SearchBuilder
	 */
	public function AddAnd($sName, $sValue = '')
	{
		return $this->addCri('AND', $sName, $sValue);
	}

	/**
	 * @param string $sName
	 * @param string $sValue = ''
	 *
	 * @return \MailSo\Imap\SearchBuilder
	 */
	public function AddOr($sName, $sValue = '')
	{
		return $this->addCri('OR', $sName, $sValue);
	}

	/**
	 * @return string
	 */
	public function Complete()
	{
		$sResult = '';
		foreach ($this->aList as $iIndex => $aItem)
		{
			$sResult = trim((0 < $iIndex && 'OR' === $aItem[0] ? $aItem[0] : '').
				(0 === strlen($sResult) ? '' : ' ('.$sResult.')').' '.$aItem[1].
					(0 < strlen($aItem[2]) ? ' '.$aItem[2] : ''));
		}

		if (0 === strlen($sResult))
		{
			$sResult = 'ALL';
		}

		return $sResult;
	}

	/**
	 * @return string
	 */
	public function __toString()
	{
		return $this->Complete();
	}

	/**
	 * @param string $sType
	 * @param string $sName
	 * @param string $sValue = ''
	 *
	 * @return \MailSo\Imap\SearchBuilder
	 */
	private function addCri($sType, $sName, $sValue = '')
	{
		$this->aList[] = array($sType, $sName, $sValue);
		return $this;
	}
}
