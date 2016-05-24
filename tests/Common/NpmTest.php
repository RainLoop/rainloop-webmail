<?php

namespace CommonTests;

class NpmTest extends \PHPUnit_Framework_TestCase
{
	public function testJsValidate()
	{
		$out = array();
		exec('gulp js:validate', $out);

		$this->assertTrue(0 < \count($out));
		$this->assertTrue(false === \strpos(\implode('|', $out), 'problem'));
	}
}