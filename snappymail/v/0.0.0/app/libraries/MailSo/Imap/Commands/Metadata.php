<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2021 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * https://datatracker.ietf.org/doc/html/rfc5464
 */

namespace MailSo\Imap\Commands;

/**
 * @category MailSo
 * @package Imap
 */
trait Metadata
{

	public function getMetadata(string $sFolderName, array $aEntries, array $aOptions = []) : array
	{
		$arguments = [];

		if ($aOptions) {
			$options = [];
			$aOptions = \array_intersect_key(
				\array_change_key_case($aOptions, CASE_UPPER),
				['MAXSIZE' => 0, 'DEPTH' => 0]
			);
			if (isset($aOptions['MAXSIZE']) && 0 < \intval($aOptions['MAXSIZE'])) {
				$options[] = 'MAXSIZE ' . \intval($aOptions['MAXSIZE']);
			}
			if (isset($aOptions['DEPTH']) && (1 == $aOptions['DEPTH'] || 'infinity' === $aOptions['DEPTH'])) {
				$options[] = "DEPTH {$aOptions['DEPTH']}";
			}
			if ($options) {
				$arguments[] = '(' . \implode(' ', $options) . ')';
			}
		}

		$arguments[] = $this->EscapeString($sFolderName);

		$arguments[] = '(' . \implode(' ', \array_map([$this, 'EscapeString'], $aEntries)) . ')';
		return $this->SendRequestGetResponse('GETMETADATA', $arguments)->getFolderMetadataResult();
	}

	public function ServerGetMetadata(array $aEntries, array $aOptions = []) : array
	{
		return $this->IsSupported('METADATA-SERVER')
			? $this->getMetadata('', $aEntries, $aOptions)
			: [];
	}

	public function FolderGetMetadata(string $sFolderName, array $aEntries, array $aOptions = []) : array
	{
		return $this->IsSupported('METADATA')
			? $this->getMetadata($sFolderName, $aEntries, $aOptions)
			: [];
	}

	public function FolderSetMetadata(string $sFolderName, array $aEntries) : void
	{
		if ($this->IsSupported('METADATA')) {
			if (!$aEntries) {
				throw new \MailSo\Base\Exceptions\InvalidArgumentException("Wrong argument for SETMETADATA command");
			}

			$arguments = [$this->EscapeString($sFolderName)];

			\array_walk($aEntries, function(&$v, $k){
				$v = $this->EscapeString($k) . ' ' . $this->EscapeString($v);
			});
			$arguments[] = '(' . \implode(' ', $aEntries) . ')';

			$this->SendRequestGetResponse('SETMETADATA', $arguments);
		}
	}

}
