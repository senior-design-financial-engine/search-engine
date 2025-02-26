#!/bin/bash
echo "After install script running..."

# Set proper permissions
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

# Configure web server if needed
if command -v nginx &> /dev/null; then
  echo "Configuring nginx..."
  # Install a basic nginx configuration if needed
  if [ ! -f "/etc/nginx/sites-available/default.backup" ]; then
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
  fi
  
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
}
EOL
  
  # Restart nginx
  systemctl restart nginx
fi

echo "After install completed" 