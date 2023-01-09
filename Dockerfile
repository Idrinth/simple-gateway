FROM node:19-alpine

RUN mkdir /project
ADD . /project
RUN cd project && npm install

ENTRYPOINT ['node', '/project/index.js']
