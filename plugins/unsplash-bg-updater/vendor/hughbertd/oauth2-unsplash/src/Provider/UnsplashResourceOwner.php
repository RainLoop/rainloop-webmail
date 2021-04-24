<?php

namespace Unsplash\OAuth2\Client\Provider;

use League\OAuth2\Client\Provider\ResourceOwnerInterface;
use League\OAuth2\Client\Tool\ArrayAccessorTrait;

class UnsplashResourceOwner implements ResourceOwnerInterface
{
    use ArrayAccessorTrait;

    /**
     * @var array
     */
    private $response;

    /**
     * @param array $response
     */
    public function __construct(array $response)
    {
        $this->response = $response;
    }

    /**
     * @return mixed
     */
    public function getId()
    {
        return $this->getValueByKey($this->response, 'id');
    }

    /**
     * @return mixed
     */
    public function getUsername()
    {
        return $this->getValueByKey($this->response, 'username');
    }

    /**
     * @return mixed
     */
    public function getName()
    {
        return $this->getValueByKey($this->response, 'name');
    }

    /**
     * @return mixed
     */
    public function getFirstName()
    {
        return $this->getValueByKey($this->response, 'first_name', '');
    }

    /**
     * @return mixed
     */
    public function getLastName()
    {
        return $this->getValueByKey($this->response, 'last_name', '');
    }

    /**
     * @return array
     */
    public function toArray()
    {
        return $this->response;
    }
}