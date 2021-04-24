<?php

namespace Crew\Unsplash;

/**
 * Class Exception
 * @package Crew\Unsplash
 */
class Exception extends \Exception
{
    /**
     * Override the constructor to accept an array instead of a string
     * @param array  $message  Array containing the errors
     * @param integer  $code  Error code
     * @param Exception|null $previous Previous Exception object
     */
    public function __construct(array $message = [], $code = 0, Exception $previous = null)
    {
        parent::__construct(json_encode($message), $code, $previous);
    }

    /**
     * Retrieve the array of errors
     * @return array Errors thrown
     */
    public function getArray()
    {
        return json_decode(parent::getMessage());
    }
}
