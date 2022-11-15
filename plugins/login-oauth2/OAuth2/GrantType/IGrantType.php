<?php
namespace OAuth2\GrantType;
/**
 * Specific GrantType Interface
 */
interface IGrantType 
{
    /**
     * Adds a specific Handling of the parameters
     * 
     * @return array of Specific parameters to be sent.
     * @param  mixed  $parameters the parameters array (passed by reference)
     */
    public function validateParameters(&$parameters);
}
