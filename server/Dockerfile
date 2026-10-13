FROM node:22-alpine
WORKDIR /app
COPY server/recommend.mjs ./server/recommend.mjs
ENV RECOMMEND_HOST=0.0.0.0
ENV RECOMMEND_PORT=8787
EXPOSE 8787
CMD ["node", "server/recommend.mjs"]
