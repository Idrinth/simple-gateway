FROM node:19-alpine

RUN mkdir /project
ADD . /project
RUN cd project && npm install

Entrypoint ['node', '/project/index.js']
