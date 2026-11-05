# Lightweight production web server for frontend assets
FROM nginx:alpine

# Copy static frontend files to Nginx web root
COPY . /usr/share/nginx/html

# Expose standard HTTP port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
