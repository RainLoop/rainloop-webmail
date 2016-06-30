<?php

namespace CommonTests;

class NpmTest extends \PHPUnit_Framework_TestCase
{
	public function testJsValidate()
	{
		$out = array();
		exec('gulp js:validate', $out);

		$this->assertTrue(0 < \count($out));

		$noProblem = false === \strpos(\implode('|', $out), 'problem');
		if (!$noProblem)
		{
			var_dump($out);
		}

		$this->assertTrue($noProblem);
	}
}