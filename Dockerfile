FROM node:20.16.0 as node

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# stage 2

FROM nginx:latest

COPY --from=node /usr/src/app/dist/portsApp /usr/share/nginx/html

COPY ./nginx.conf /etc/nginx/conf.d/default.conf