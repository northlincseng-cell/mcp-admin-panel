#!/bin/bash
# SSL setup script for bmcewan.co.uk

# Create nginx config
cat > /etc/nginx/sites-available/mcp-admin << 'NGINX'
server {
    listen 80;
    server_name bmcewan.co.uk;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINX

echo "Nginx config written."

# Symlink
ln -sf /etc/nginx/sites-available/mcp-admin /etc/nginx/sites-enabled/mcp-admin
rm -f /etc/nginx/sites-enabled/default

# Test nginx
nginx -t
if [ $? -ne 0 ]; then
    echo "ERROR: nginx config test failed!"
    exit 1
fi

# Reload nginx
systemctl reload nginx
echo "Nginx reloaded."

# Run certbot non-interactively
certbot --nginx -d bmcewan.co.uk --non-interactive --agree-tos -m northlincseng@gmail.com --redirect --no-eff-email
if [ $? -eq 0 ]; then
    echo "SSL certificate installed successfully!"
    systemctl reload nginx
    echo "Testing HTTPS..."
    curl -sI https://bmcewan.co.uk | head -5
else
    echo "ERROR: certbot failed!"
    exit 1
fi
