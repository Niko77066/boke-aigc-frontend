# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build-only

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN chmod -R 644 /usr/share/nginx/html/* && find /usr/share/nginx/html -type d -exec chmod 755 {} +
COPY docker-entrypoint.d/40-runtime-env.sh /docker-entrypoint.d/40-runtime-env.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-env.sh
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
