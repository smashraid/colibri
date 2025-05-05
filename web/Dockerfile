FROM node:latest AS build
ARG BUILD_CONFIGURATION=staging
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install -g @angular/cli && \
    npm -v && \
    node -v
RUN npm install
COPY . .
RUN ng build --configuration=$BUILD_CONFIGURATION

FROM nginx:latest AS final
ARG NAME=colibri
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/dist/$NAME/browser /usr/share/nginx/html
CMD ["nginx", "-g", "daemon off;"]