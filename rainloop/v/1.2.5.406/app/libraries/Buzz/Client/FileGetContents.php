<?php

namespace Buzz\Client;

use Buzz\Message\MessageInterface;
use Buzz\Message\RequestInterface;
use Buzz\Util\CookieJar;
use Buzz\Exception\ClientException;

class FileGetContents extends AbstractStream
{
    /**
     * @var CookieJar
     */
    protected $cookieJar;

    /**
     * @param CookieJar|null $cookieJar
     */
    public function __construct(CookieJar $cookieJar = null)
    {
        if ($cookieJar) {
            $this->setCookieJar($cookieJar);
        }
    }

    /**
     * @param CookieJar $cookieJar
     */
    public function setCookieJar(CookieJar $cookieJar)
    {
        $this->cookieJar = $cookieJar;
    }

    /**
     * @return CookieJar
     */
    public function getCookieJar()
    {
        return $this->cookieJar;
    }

    /**
     * @see ClientInterface
     *
     * @throws ClientException If file_get_contents() fires an error
     */
    public function send(RequestInterface $request, MessageInterface $response)
    {
        if ($cookieJar = $this->getCookieJar()) {
            $cookieJar->clearExpiredCookies();
            $cookieJar->addCookieHeaders($request);
        }

        $context = stream_context_create($this->getStreamContextArray($request));
        $url = $request->getHost().$request->getResource();

        $level = error_reporting(0);
        $content = file_get_contents($url, 0, $context);
        error_reporting($level);
        if (false === $content) {
            $error = error_get_last();
            throw new ClientException($error['message']);
        }

        $response->setHeaders($this->filterHeaders((array) $http_response_header));
        $response->setContent($content);

        if ($cookieJar) {
            $cookieJar->processSetCookieHeaders($request, $response);
        }
    }

    private function filterHeaders(array $headers)
    {
        $filtered = array();
        foreach ($headers as $header) {
            if (0 === stripos($header, 'http/')) {
                $filtered = array();
            }

            $filtered[] = $header;
        }

        return $filtered;
    }
}
