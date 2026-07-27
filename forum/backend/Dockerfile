FROM node:20-alpine

WORKDIR /app

RUN printf '%s\n' \
  'https://mirrors.aliyun.com/alpine/v3.20/main' \
  'https://mirrors.aliyun.com/alpine/v3.20/community' \
  > /etc/apk/repositories

RUN apk add --no-cache ffmpeg font-noto-cjk espeak-ng

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["npm", "start"]
