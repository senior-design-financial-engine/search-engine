#!/bin/bash
# CodeDeploy AfterInstall script for frontend deployment
set -e  # Exit immediately if a command exits with a non-zero status

echo "After install script running at $(date)"

# Set proper permissions
echo "Setting permissions on web content..."
if getent group www-data >/dev/null; then
  chown -R www-data:www-data /var/www/html
  echo "Set ownership to www-data user"
else
  echo "www-data group not found, using default permissions"
  chmod -R 755 /var/www/html
fi

# Configure web server
echo "Checking for web server to configure..."
if command -v nginx &> /dev/null; then
  echo "Configuring nginx..."
  # Install a basic nginx configuration if needed
  if [ ! -f "/etc/nginx/sites-available/default.backup" ]; then
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
    echo "Backed up original nginx configuration"
  fi
  
  echo "Writing new nginx configuration..."
  cat > /etc/nginx/sites-available/default << 'EOL'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /var/www/html;
    index index.html;
    
    server_name _;
    
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Add caching headers for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
EOL
  
  # Validate and restart nginx
  echo "Testing nginx configuration..."
  nginx -t && {
    echo "Restarting nginx..."
    systemctl restart nginx
  } || {
    echo "WARNING: nginx configuration test failed, not restarting"
  }
else
  echo "Nginx not found, skipping web server configuration"
  
  # Check for Apache as an alternative
  if command -v apache2 &> /dev/null || command -v httpd &> /dev/null; then
    echo "Apache detected, but not configuring automatically"
  fi
fi

echo "After install completed successfully at $(date)"
exit 0 