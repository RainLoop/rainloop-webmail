<VirtualHost *:80>
   AcceptPathInfo On
   ServerName mydomain.com
   DocumentRoot /var/www/mydomain.com

   RewriteEngine On
   RewriteRule /.well-known/carddav /index.php/dav [R,L]

   <Directory "/var/www/mydomain.com">
      Options None
      Options +FollowSymlinks
      AllowOverride All
   </Directory>
</VirtualHost>