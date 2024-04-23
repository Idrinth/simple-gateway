FROM node:19-alpine

WORKDIR /project
COPY . /project
RUN npm install --production

ENTRYPOINT ['node', '/project/index.js']
