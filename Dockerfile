FROM node:22-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# stage 2

FROM nginx:alpine

COPY --from=build /usr/src/app/dist/ports-app/browser /usr/share/nginx/html

COPY ./nginx.conf /etc/nginx/conf.d/default.conf