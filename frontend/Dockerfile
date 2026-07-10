FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN echo '<h1>Entorno Seguro Funcionando</h1><p>By krakhen</p>' > /usr/share/nginx/html/index.html
EXPOSE 80
EXPOSE 443
CMD ["nginx", "-g", "daemon off;"]
