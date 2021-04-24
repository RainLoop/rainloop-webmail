<?php

namespace Crew\Unsplash\Tests;

use Crew\Unsplash;

/**
 * Class ExceptionTest
 * @package Crew\Unsplash\Tests
 */
class ExceptionTest extends BaseTest
{
    public function testConstructionWithArray()
    {
        $errors = ['The error 1', 'The error 2'];
        $exception = new Unsplash\Exception($errors);

        // The constructor is override, we validate that an
        // exception object is return
        $this->assertInstanceOf('Exception', $exception);
    }

    public function testGetArrayReturnArray()
    {
        $errors = ['The error 1', 'The error 2'];
        $exception = new Unsplash\Exception($errors);

        $this->assertEquals($errors, $exception->getArray());
    }
}
