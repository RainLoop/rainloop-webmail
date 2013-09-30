<?php

namespace Buzz\Client;

use Buzz\Message\MessageInterface;
use Buzz\Message\RequestInterface;
use Buzz\Exception\ClientException;

class MultiCurl extends AbstractCurl implements BatchClientInterface
{
    private $queue = array();

    public function send(RequestInterface $request, MessageInterface $response, array $options = array())
    {
        $this->queue[] = array($request, $response, $options);
    }

    public function flush()
    {
        if (false === $curlm = curl_multi_init()) {
            throw new ClientException('Unable to create a new cURL multi handle');
        }

        // prepare a cURL handle for each entry in the queue
        foreach ($this->queue as $i => &$queue) {
            list($request, $response, $options) = $queue;
            $curl = $queue[] = static::createCurlHandle();
            $this->prepare($curl, $request, $options);
            curl_multi_add_handle($curlm, $curl);
        }

        $active = null;
        do {
            $mrc = curl_multi_exec($curlm, $active);
        } while (CURLM_CALL_MULTI_PERFORM == $mrc);

        while ($active && CURLM_OK == $mrc) {
            if (-1 != curl_multi_select($curlm)) {
                do {
                    $mrc = curl_multi_exec($curlm, $active);
                } while (CURLM_CALL_MULTI_PERFORM == $mrc);
            }
        }

        // populate the responses
        while (list($request, $response, $options, $curl) = array_shift($this->queue)) {
            static::populateResponse($curl, curl_multi_getcontent($curl), $response);
            curl_multi_remove_handle($curlm, $curl);
        }

        curl_multi_close($curlm);
    }
}
