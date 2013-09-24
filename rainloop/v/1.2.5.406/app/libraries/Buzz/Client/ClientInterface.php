<?php

namespace Buzz\Client;

use Buzz\Message\MessageInterface;
use Buzz\Message\RequestInterface;

interface ClientInterface
{
    /**
     * Populates the supplied response with the response for the supplied request.
     *
     * @param RequestInterface $request  A request object
     * @param MessageInterface $response A response object
     */
    public function send(RequestInterface $request, MessageInterface $response);
}
