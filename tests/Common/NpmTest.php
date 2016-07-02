<?php

namespace CommonTests;

class NpmTest extends \PHPUnit_Framework_TestCase
{
	public function testJsValidate()
	{
		$out = array();

//		exec('gulp js:validate', $out);
//		$this->assertTrue(0 < \count($out));

		exec('eslint -c .eslintrc.js dev/*', $out);
		$this->assertTrue(\is_array($out));

		$noProblem = false === \strpos(\implode('|', $out), 'problem');
		if (!$noProblem)
		{
			var_dump($out);
		}

		$this->assertTrue($noProblem);
	}
}